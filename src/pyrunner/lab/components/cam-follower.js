/* 凸轮与从动件：选廓线规律，看升程 s(θ) 的形状差别如何决定「冲击」。
   等速：速度曲线有阶跃 → 理论上加速度无穷大（刚性冲击）；
   等加速等减速：加速度有阶跃（柔性冲击）；简谐：加速度连续，但端点仍有突变。
   右上是位移-速度-加速度图，右下是压力角 α = arctan((ds/dφ)/(rb+s))。 */
import {
  themeColors, setupCanvas, anim, buildSegmented, buildReadout, buildSliders,
  polyline, label, clamp, fmt,
} from '../core.js';

const LAWS = {
  cv: { label: '等速', k: '刚性冲击' },
  ca: { label: '等加速等减速', k: '柔性冲击' },
  sh: { label: '简谐', k: '无刚性冲击' },
};

/* 推程 β 内的无量纲位移 s/h，θn = θ/β ∈ [0,1] */
function rise(law, t) {
  if (law === 'cv') return t;
  if (law === 'ca') return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
  return 0.5 * (1 - Math.cos(Math.PI * t));
}
/* 无量纲速度 ds/dθn */
function vrise(law, t) {
  if (law === 'cv') return 1;
  if (law === 'ca') return t < 0.5 ? 4 * t : 4 * (1 - t);
  return (Math.PI / 2) * Math.sin(Math.PI * t);
}
/* 无量纲加速度 d²s/dθn² */
function arise(law, t) {
  if (law === 'cv') return 0;
  if (law === 'ca') return t < 0.5 ? 4 : -4;
  return (Math.PI * Math.PI / 2) * Math.cos(Math.PI * t);
}

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    law: spec.law || 'sh',
    rb: spec.rb ?? 40,    // 基圆半径 mm
    h: spec.h ?? 25,      // 升程 mm
    beta: spec.beta ?? 180, // 推程角 °
    th: spec.th ?? 0,
    spd: spec.spd ?? 1,
  };

  const cv = setupCanvas(host, 340);
  const ro = buildReadout({ '当前 θ': '—', '位移 s': '—', '无量纲速度': '—', '压力角 α': '—' });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(
    Object.keys(LAWS).map((k) => ({ label: LAWS[k].label, value: k })),
    s.law,
    (v) => { s.law = v; draw(); },
  ));

  const B = () => (s.beta * Math.PI) / 180;

  /* 整周的 s(θ)：推程 β，回程 β，其余为远休/近休 */
  function sOf(th) {
    const t = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const b = B();
    if (t <= b) return s.h * rise(s.law, t / b);
    if (t <= 2 * b) return s.h * (1 - rise(s.law, (t - b) / b));
    return 0;
  }
  function vOf(th) {
    const t = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const b = B();
    if (t <= b) return (s.h / b) * vrise(s.law, t / b);
    if (t <= 2 * b) return -(s.h / b) * vrise(s.law, (t - b) / b);
    return 0;
  }

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    /* ============ 左：凸轮与从动件 ============ */
    const cx = 116;
    const cy = Math.round(H * 0.44);
    const k = Math.min((W * 0.32) / (s.rb + s.h + 14), 3.2); // px per mm
    const th = s.th;

    /* 基圆 */
    ctx.save();
    ctx.strokeStyle = C.axis;
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, s.rb * k, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    label(ctx, '基圆 rb = ' + fmt(s.rb, 0) + ' mm', cx, cy + s.rb * k + 14, C.fg, { align: 'center', size: 10 });

    /* 凸轮廓线：r(φ) = rb + s(φ)。从动件沿竖直方向对心直动，
       凸轮转过 θ 后，廓线上参数角 φ 的点出现在极角 (−90° + φ − θ) 处。 */
    const prof = [];
    for (let i = 0; i <= 360; i += 1) {
      const phi = (i / 360) * Math.PI * 2;
      const r = s.rb + sOf(phi);
      const a = -Math.PI / 2 + phi - th;
      prof.push([cx + r * k * Math.cos(a), cy + r * k * Math.sin(a)]);
    }
    ctx.beginPath();
    prof.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = C.accent;
    ctx.globalAlpha = 0.22;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    /* 凸轮轴与转向 */
    ctx.fillStyle = C.fg;
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    /* 从动件：对心直动，顶端始终在 y = cy − (rb + s(θ)) */
    const lift = sOf(th);
    const topY = cy - (s.rb + lift) * k;
    ctx.strokeStyle = C.named('red');
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, topY - 46);
    ctx.lineTo(cx, topY);
    ctx.stroke();
    ctx.fillStyle = C.named('red');
    ctx.beginPath();
    ctx.arc(cx, topY, 6, 0, Math.PI * 2);
    ctx.fill();
    /* 导路 */
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 12, topY - 52);
    ctx.lineTo(cx - 12, topY - 16);
    ctx.moveTo(cx + 12, topY - 52);
    ctx.lineTo(cx + 12, topY - 16);
    ctx.stroke();

    /* 压力角：从动件速度方向（竖直）与廓线法线（接触点处）的夹角 */
    const dv = vOf(th); // ds/dθ，mm/rad
    const alpha = Math.atan2(dv, s.rb + lift);
    ctx.save();
    ctx.strokeStyle = C.named('amber');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, topY, 26, -Math.PI / 2, -Math.PI / 2 + alpha, alpha < 0);
    ctx.stroke();
    ctx.restore();
    label(ctx, 'α = ' + fmt((alpha * 180) / Math.PI, 1) + '°', cx + 30, topY + 4, C.named('amber'), { size: 11, weight: 600 });
    label(ctx, 'θ = ' + fmt((th * 180) / Math.PI, 0) + '°', cx, cy - 8, C.fg, { align: 'center', size: 10 });
    label(ctx, '升程 h = ' + fmt(s.h, 0) + ' mm', 8, 14, C.fg, { size: 10 });

    /* ============ 右：位移 / 速度 / 加速度 图 ============ */
    const gx = Math.round(W * 0.50);
    const gw = W - gx - 18;
    const rows = [
      { y: 34, h: 74, name: 's(θ)', col: C.series(0) },
      { y: 128, h: 62, name: 'v(θ)', col: C.series(3) },
      { y: 214, h: 62, name: 'a(θ)', col: C.named('purple') },
    ];
    const N = 360;
    const vmax = Math.max(1e-6, (s.h / B()) * 2.2);
    const amax = Math.max(1e-6, (s.h / (B() * B())) * 8);

    rows.forEach((r) => {
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx, r.y + r.h / 2);
      ctx.lineTo(gx + gw, r.y + r.h / 2);
      ctx.stroke();
      label(ctx, r.name, gx - 4, r.y + r.h / 2 + 4, C.fg, { align: 'right', size: 10, weight: 600 });
    });

    const sPts = [];
    const vPts = [];
    const aPts = [];
    for (let i = 0; i <= N; i += 1) {
      const t2 = (i / N) * Math.PI * 2;
      const X = gx + (i / N) * gw;
      sPts.push([X, rows[0].y + rows[0].h / 2 - (sOf(t2) / Math.max(s.h, 1e-6)) * (rows[0].h / 2 - 4)]);
      vPts.push([X, rows[1].y + rows[1].h / 2 - clamp(vOf(t2) / vmax, -1, 1) * (rows[1].h / 2 - 4)]);
      const t = ((t2 % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const b = B();
      let av = 0;
      if (t <= b) av = (s.h / (b * b)) * arise(s.law, t / b);
      else if (t <= 2 * b) av = -(s.h / (b * b)) * arise(s.law, (t - b) / b);
      aPts.push([X, rows[2].y + rows[2].h / 2 - clamp(av / amax, -1, 1) * (rows[2].h / 2 - 4)]);
    }
    polyline(ctx, sPts, rows[0].col, 2.2);
    polyline(ctx, vPts, rows[1].col, 2);
    polyline(ctx, aPts, rows[2].col, 2);

    /* 推程角分界 */
    [B(), 2 * B()].forEach((b) => {
      ctx.save();
      ctx.strokeStyle = C.grid;
      ctx.setLineDash([3, 3]);
      rows.forEach((r) => {
        ctx.beginPath();
        const X = gx + (b / (2 * Math.PI)) * gw;
        ctx.moveTo(X, r.y);
        ctx.lineTo(X, r.y + r.h);
        ctx.stroke();
      });
      ctx.restore();
    });
    label(ctx, '推程 β = ' + fmt(s.beta, 0) + '°', gx + 4, rows[0].y - 4, C.fg, { size: 10 });

    /* 当前 θ 游标 */
    const cur = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const Xc = gx + (cur / (2 * Math.PI)) * gw;
    rows.forEach((r) => {
      ctx.save();
      ctx.strokeStyle = C.named('amber');
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(Xc, r.y);
      ctx.lineTo(Xc, r.y + r.h);
      ctx.stroke();
      ctx.restore();
    });

    label(ctx, LAWS[s.law].k, gx + gw, rows[2].y + rows[2].h + 16, C.named('red'), { align: 'right', size: 11, weight: 600 });

    ro.set('当前 θ', fmt((cur * 180) / Math.PI, 0) + '°');
    ro.set('位移 s', fmt(lift, 2) + ' mm（占升程 ' + fmt((lift / Math.max(s.h, 1e-6)) * 100, 0) + '%）');
    ro.set('无量纲速度', fmt(dv / Math.max(s.h / B(), 1e-9), 3) + '（v·β/h）');
    ro.set('压力角 α', fmt((alpha * 180) / Math.PI, 1) + '°　' + (Math.abs(alpha) > 0.52 ? '⚠ 偏大，易卡滞（许用 ≤ 30°）' : '良好'));
  }

  const controls = anim(host, {
    onTick(dt) {
      s.th += dt * 1.0 * s.spd;
      if (s.th > Math.PI * 2) s.th -= Math.PI * 2;
      draw();
    },
    onReset() { s.th = 0; draw(); },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'rb', label: '基圆半径 rb', min: 20, max: 70, step: 1, value: s.rb, fmt: 0 },
        { name: 'h', label: '升程 h', min: 5, max: 50, step: 1, value: s.h, fmt: 0 },
        { name: 'beta', label: '推程角 β', min: 60, max: 180, step: 5, value: s.beta, fmt: 0 },
        { name: 'th', label: '凸轮转角 θ', min: 0, max: 6.283, step: 0.01, value: s.th, fmt: 2 },
        { name: 'spd', label: '转速', min: 0.2, max: 3, step: 0.1, value: s.spd, fmt: 1 },
      ],
    },
    (st) => { s.rb = st.rb; s.h = st.h; s.beta = st.beta; s.th = st.th; s.spd = st.spd; draw(); },
  );

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() { controls.stop(); } };
}
