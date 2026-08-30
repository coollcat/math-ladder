/* 机械振动与隔振：单自由度质量-弹簧-阻尼受基础激励。
   这张图只有一个结论要记住——隔振只在 r > √2 时才生效；
   r < √2 的「隔振器」不但不隔振，还在放大，r ≈ 1 时更是灾难性共振。
   加大阻尼能压住共振峰，却会让高频隔振效果变差：这是设计上的真实取舍。 */
import {
  themeColors, setupCanvas, anim, buildReadout, buildSliders,
  engine, polyline, label, clamp, fmt,
} from '../core.js';

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    k: spec.k ?? 20000,    // N/m
    m: spec.m ?? 20,       // kg
    zeta: spec.zeta ?? 0.1,
    r: spec.r ?? 2.5,      // 频率比 f/fn
    t: 0,
  };

  const cv = setupCanvas(host, 340);
  const ro = buildReadout({ '固有频率 fn': '—', '激励频率 f': '—', '传递率 T': '—', '判定': '—' });
  host.appendChild(ro.box);

  let mech = null;
  let out = null;

  function compute() {
    if (!mech) return;
    const fn = mech.naturalFreq(s.k, s.m);
    const T = mech.transmissibility(s.r, s.zeta);
    out = {
      fn,
      f: s.r * fn,
      T,
      cc: mech.criticalDamping(s.k, s.m),
      /* 基础激励下绝对位移传递率的相位滞后 */
      phi: Math.atan2(2 * s.zeta * s.r, 1 - s.r * s.r) - Math.atan2(2 * s.zeta * s.r, 1),
    };
  }

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    compute();
    if (!out) {
      label(ctx, '正在载入 mech 引擎…', W / 2, H / 2, C.fg, { align: 'center', size: 12 });
      return;
    }
    const { fn, f, T, phi } = out;

    /* ============ 上：基础激励下的质量-弹簧-阻尼 ============ */
    const mx = 74;
    const topY = 46;
    const baseY = 130;
    const A = 16;                                  // 基础振幅（px）
    const yBase = baseY + A * Math.sin(s.t);
    const yMass = topY + 26 + T * A * Math.sin(s.t - phi);

    /* 基础（振源） */
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mx - 30, yBase);
    ctx.lineTo(mx + 46, yBase);
    ctx.stroke();
    for (let i = -2; i <= 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(mx - 30 + i * 15, yBase);
      ctx.lineTo(mx - 36 + i * 15, yBase + 8);
      ctx.stroke();
    }
    label(ctx, '基础（振源）', mx + 52, yBase + 4, C.fg, { size: 10 });

    /* 阻尼器 + 弹簧：基础到质量之间 */
    const drawSpring = (x, y0, y1, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      const n = 7;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      for (let i = 1; i <= n; i += 1) {
        const yy = y0 + ((y1 - y0) * (i - 0.5)) / n;
        ctx.lineTo(x + (i % 2 ? 9 : -9), yy);
      }
      ctx.lineTo(x, y1);
      ctx.stroke();
    };
    const drawDash = (x, y0, y1, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y0 + (y1 - y0) * 0.42);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 8, y0 + (y1 - y0) * 0.42);
      ctx.lineTo(x + 8, y0 + (y1 - y0) * 0.42);
      ctx.moveTo(x - 8, y0 + (y1 - y0) * 0.42);
      ctx.lineTo(x - 8, y1);
      ctx.lineTo(x + 8, y1);
      ctx.lineTo(x + 8, y0 + (y1 - y0) * 0.42);
      ctx.stroke();
    };
    drawSpring(mx - 12, yBase, yMass + 12, C.accent);
    drawDash(mx + 12, yBase, yMass + 12, C.named('purple'));

    /* 质量块 */
    ctx.fillStyle = C.soft;
    ctx.strokeStyle = T < 1 ? C.ok : C.bad;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.rect(mx - 26, yMass - 12, 52, 24);
    ctx.fill();
    ctx.stroke();
    label(ctx, 'm = ' + fmt(s.m, 1) + ' kg', mx, yMass + 4, C.fg, { align: 'center', size: 10, weight: 600 });
    /* 振幅包络 */
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(mx + 34, topY + 26 - T * A);
    ctx.lineTo(mx + 34, topY + 26 + T * A);
    ctx.moveTo(mx - 42, baseY - A);
    ctx.lineTo(mx - 42, baseY + A);
    ctx.stroke();
    ctx.restore();
    label(ctx, '输出 ' + fmt(T * 100, 0) + '%', mx + 40, topY + 26, T < 1 ? C.ok : C.bad, { size: 10, weight: 600 });
    label(ctx, '输入 100%', mx - 46, baseY + 3, C.fg, { align: 'right', size: 10 });
    label(ctx, 'k = ' + fmt(s.k / 1000, 1) + ' kN/m', mx - 46, yBase - A - 14, C.accent, { align: 'right', size: 10 });
    label(ctx, 'ζ = ' + fmt(s.zeta, 2), mx + 24, yBase - A - 14, C.named('purple'), { size: 10 });

    /* ============ 下：传递率曲线 ============ */
    const gx = Math.min(190, W * 0.46);
    const gw = W - gx - 34;
    const gy = H - 34;
    const gh = H - 190;
    const rMax = 4;
    const tMax = Math.max(3, Math.min(8, 1 / Math.max(s.zeta, 0.02) / 3.4));
    const rx = (v) => gx + (v / rMax) * gw;
    const ty = (v) => gy - (clamp(v, 0, tMax) / tMax) * gh;

    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx, gy - gh);
    ctx.lineTo(gx, gy);
    ctx.lineTo(gx + gw, gy);
    ctx.stroke();
    label(ctx, 'T', gx - 12, gy - gh + 10, C.fg, { size: 11 });
    label(ctx, '频率比 r = f / fn', gx + gw / 2, gy + 16, C.fg, { align: 'center', size: 10 });

    /* 隔振区（T<1，r>√2）底纹 */
    ctx.fillStyle = C.ok;
    ctx.globalAlpha = 0.10;
    ctx.beginPath();
    ctx.rect(rx(Math.SQRT2), gy - gh, gw - (rx(Math.SQRT2) - gx), gh);
    ctx.fill();
    ctx.globalAlpha = 1;
    label(ctx, '隔振区 T<1', rx(Math.SQRT2) + 6, gy - gh + 12, C.ok, { size: 10 });

    /* T = 1 基准线 */
    ctx.save();
    ctx.strokeStyle = C.axis;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(gx, ty(1));
    ctx.lineTo(gx + gw, ty(1));
    ctx.stroke();
    ctx.restore();
    label(ctx, 'T = 1', gx - 4, ty(1) + 4, C.fg, { align: 'right', size: 9 });

    /* r = √2 分界 */
    ctx.save();
    ctx.strokeStyle = C.ok;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(rx(Math.SQRT2), gy - gh);
    ctx.lineTo(rx(Math.SQRT2), gy);
    ctx.stroke();
    ctx.restore();
    label(ctx, 'r = √2 ≈ 1.414', rx(Math.SQRT2) + 4, gy - 6, C.ok, { size: 9 });

    /* 当前 ζ 的曲线 */
    const pts = [];
    for (let i = 0; i <= 300; i += 1) {
      const rr = (i / 300) * rMax;
      pts.push([rx(rr), ty(mech.transmissibility(rr, s.zeta))]);
    }
    polyline(ctx, pts, C.accent, 2.4);
    /* 其它阻尼比的淡影，用于对比 */
    [0.02, 0.2, 0.5].forEach((z, i) => {
      if (Math.abs(z - s.zeta) < 0.02) return;
      const p2 = [];
      for (let j = 0; j <= 160; j += 1) {
        const rr = (j / 160) * rMax;
        p2.push([rx(rr), ty(mech.transmissibility(rr, z))]);
      }
      polyline(ctx, p2, C.series(i + 4), 1.2, [4, 3]);
    });

    /* 当前工作点 */
    const cxp = rx(clamp(s.r, 0, rMax));
    const cyp = ty(T);
    ctx.save();
    ctx.strokeStyle = C.named('amber');
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(cxp, gy);
    ctx.lineTo(cxp, cyp);
    ctx.lineTo(gx, cyp);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = T < 1 ? C.ok : C.bad;
    ctx.beginPath();
    ctx.arc(cxp, cyp, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ro.set('固有频率 fn', fmt(fn, 3) + ' Hz（ωn = ' + fmt(2 * Math.PI * fn, 1) + ' rad/s，临界阻尼 cc = ' + fmt(out.cc, 0) + ' N·s/m）');
    ro.set('激励频率 f', fmt(f, 3) + ' Hz　r = ' + fmt(s.r, 3));
    ro.set('传递率 T', fmt(T, 3) + ' → 振动' + (T < 1 ? '衰减到 ' + fmt(T * 100, 1) + '%，隔掉 ' + fmt((1 - T) * 100, 1) + '%' : '放大到 ' + fmt(T * 100, 0) + '%'));
    ro.set('判定', s.r > Math.SQRT2
      ? '隔振有效（r > √2）。此时加大阻尼反而抬高 T，阻尼要小'
      : Math.abs(s.r - 1) < 0.15 ? '共振区！唯一出路是加大阻尼或错开频率' : '放大区（r < √2）：加大阻尼可压峰');
  }

  const controls = anim(host, {
    onTick(dt) { s.t += dt * 2 * Math.PI * Math.max(0.2, s.r) * 1.1; draw(); },
    onReset() { s.t = 0; draw(); },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'r', label: '频率比 r = f/fn', min: 0, max: 4, step: 0.02, value: s.r, fmt: 2 },
        { name: 'zeta', label: '阻尼比 ζ', min: 0.01, max: 0.8, step: 0.01, value: s.zeta, fmt: 2 },
        { name: 'k', label: '刚度 k', min: 2000, max: 200000, step: 1000, value: s.k, fmt: 0 },
        { name: 'm', label: '质量 m', min: 1, max: 200, step: 1, value: s.m, fmt: 0 },
      ],
    },
    (st) => { s.r = st.r; s.zeta = st.zeta; s.k = st.k; s.m = st.m; draw(); },
  );

  draw();
  cv.redraw = draw;
  engine('mech').then((m2) => { mech = m2; draw(); }).catch(() => { void 0; });
  return { slidersBox: sliders.box, destroy() { controls.stop(); } };
}
