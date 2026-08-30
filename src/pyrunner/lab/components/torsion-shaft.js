/* 扭转与轴设计：圆轴受扭，端部画扭转角 φ = TL/(GJ)，截面剪应力 τ = T·r/J 沿半径线性分布。
   两个设计杠杆：加大直径（J ∝ d⁴，威力最大）或换高 G 材料（只改刚度不改强度）。 */
import {
  themeColors, setupCanvas, buildSegmented, buildReadout, buildSliders,
  engine, polyline, label, clamp, fmt,
} from '../core.js';

const MATS = {
  steel: { label: '钢 G=79 GPa', G: 79e9, tau: 160e6 },
  alu: { label: '铝 G=26 GPa', G: 26e9, tau: 90e6 },
  copper: { label: '铜 G=44 GPa', G: 44e9, tau: 70e6 },
};

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    mat: spec.mat || 'steel',
    T: spec.T ?? 400,   // N·m
    L: spec.L ?? 1.2,   // m
    d: spec.d ?? 40,    // mm
    mag: spec.mag ?? 3, // 扭转角显示放大
  };

  const cv = setupCanvas(host, 320);
  const ro = buildReadout({ '极惯性矩 J': '—', '最大剪应力 τ': '—', '扭转角 φ': '—', '单位长度扭转角': '—' });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(
    Object.keys(MATS).map((k) => ({ label: MATS[k].label, value: k })),
    s.mat,
    (v) => { s.mat = v; draw(); },
  ));

  let mech = null;
  let out = null;

  function compute() {
    if (!mech) return;
    const m = MATS[s.mat];
    const sec = mech.sectionCircle(s.d / 1000);
    const tau = mech.torsionShear(s.T, sec.c, sec.J);
    const phi = (s.T * s.L) / (m.G * sec.J); // rad
    out = { m, sec, tau, phi };
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
    const { m, sec, tau, phi } = out;
    const over = tau > m.tau;

    /* ================= 轴与螺旋线 ================= */
    const ax = 66;
    const bw = Math.min(W - 210, 200);
    const cy = Math.round(H * 0.34);
    const R = clamp(10 + (s.d / 120) * 34, 10, 42);
    const phiVis = clamp(phi * s.mag, -1.5, 1.5);

    ctx.fillStyle = C.soft;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(ax, cy - R, bw, 2 * R);
    ctx.fill();
    ctx.stroke();

    /* 三条纵向纤维线：扭转后变成螺旋 */
    [-0.6, 0, 0.6].forEach((f, k) => {
      const pts = [];
      for (let i = 0; i <= 40; i += 1) {
        const t = i / 40;
        const ang = phiVis * t;
        /* 轴线不动；离轴纤维随扭转角绕轴转，投影成正弦 */
        pts.push([ax + t * bw, cy + f * R * Math.cos(ang) + (f === 0 ? 0 : Math.sin(ang) * R * 0.5)]);
      }
      polyline(ctx, pts, k === 1 ? C.accent : C.named('teal'), k === 1 ? 2.2 : 1.6);
    });

    /* 左端固定、右端加载 */
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ax - 12, cy - R - 8);
    ctx.lineTo(ax - 12, cy + R + 8);
    ctx.stroke();
    for (let k = 0; k < 5; k += 1) {
      ctx.beginPath();
      ctx.moveTo(ax - 12, cy - R - 6 + k * ((2 * R + 12) / 5));
      ctx.lineTo(ax - 24, cy - R - 1 + k * ((2 * R + 12) / 5));
      ctx.stroke();
    }

    /* 端部圆盘 + 半径线：直观显示转了多少 */
    const ecx = ax + bw + 34;
    const ecy = cy;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(ecx, ecy, R, 0, Math.PI * 2);
    ctx.stroke();
    /* 未扭转的参考半径 */
    polyline(ctx, [[ecx, ecy], [ecx, ecy - R]], C.axis, 1.4, [4, 3]);
    /* 扭转后的半径 */
    polyline(ctx, [[ecx, ecy], [ecx + Math.sin(phiVis) * R, ecy - Math.cos(phiVis) * R]], C.named('amber'), 2.6);
    ctx.save();
    ctx.strokeStyle = C.named('amber');
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(ecx, ecy, R * 0.45, -Math.PI / 2, -Math.PI / 2 + phiVis, phiVis < 0);
    ctx.stroke();
    ctx.restore();
    label(ctx, 'φ = ' + fmt((phi * 180) / Math.PI, 3) + '°', ecx, ecy + R + 16, C.named('amber'), { align: 'center', size: 11, weight: 600 });

    /* 扭矩箭头 */
    ctx.strokeStyle = C.named('red');
    ctx.fillStyle = C.named('red');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ax + bw + 8, cy, R + 12, -0.9, 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax + bw + 8 + Math.cos(0.9) * (R + 12), cy + Math.sin(0.9) * (R + 12));
    ctx.lineTo(ax + bw + 2 + Math.cos(0.9) * (R + 12), cy + Math.sin(0.9) * (R + 12) - 6);
    ctx.lineTo(ax + bw + 12 + Math.cos(0.9) * (R + 12), cy + Math.sin(0.9) * (R + 12) + 3);
    ctx.closePath();
    ctx.fill();
    label(ctx, 'T = ' + fmt(s.T, 0) + ' N·m', ax + bw + 20, cy - R - 20, C.named('red'), { size: 10, weight: 600 });
    label(ctx, 'L = ' + fmt(s.L, 2) + ' m', ax + bw / 2, cy + R + 18, C.fg, { align: 'center', size: 10 });

    /* ================= τ 沿半径的分布 ================= */
    const dy = Math.round(H * 0.80);
    const dr = Math.min(52, H * 0.16);
    const gz = 66;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gz - 10, dy);
    ctx.lineTo(gz + dr + 60, dy);
    ctx.stroke();
    label(ctx, 'τ(r) = T·r / J（外表面最大，圆心为零）', gz - 10, dy - dr - 14, C.fg, { size: 10 });
    for (let i = 0; i <= 5; i += 1) {
      const r = (i / 5) * dr;
      ctx.strokeStyle = over ? C.bad : C.named('purple');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(gz + r, dy);
      ctx.lineTo(gz + r, dy - (i / 5) * dr);
      ctx.stroke();
    }
    polyline(ctx, [[gz, dy], [gz + dr, dy - dr]], over ? C.bad : C.named('purple'), 2.2);
    label(ctx, 'τmax = ' + fmt(tau / 1e6, 1) + ' MPa', gz + dr + 8, dy - dr, over ? C.bad : C.named('purple'), { size: 10, weight: 600 });
    label(ctx, '许用 ' + fmt(m.tau / 1e6, 0) + ' MPa → ' + (over ? '超许用！' : '安全'), gz + dr + 8, dy - dr + 14, over ? C.bad : C.ok, { size: 10 });

    ro.set('极惯性矩 J', fmt(sec.J * 1e12, 2) + ' ×10⁻¹² m⁴（∝ d⁴）');
    ro.set('最大剪应力 τ', fmt(tau / 1e6, 2) + ' MPa');
    ro.set('扭转角 φ', fmt((phi * 180) / Math.PI, 3) + '°（显示放大 ' + fmt(s.mag, 0) + '×）');
    ro.set('单位长度扭转角', fmt(((phi * 180) / Math.PI) / s.L, 3) + ' °/m　刚度 GJ/L = ' + fmt((m.G * sec.J) / s.L, 0) + ' N·m/rad');
  }

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'T', label: '扭矩 T', min: 0, max: 3000, step: 10, value: s.T, fmt: 0 },
        { name: 'L', label: '轴长 L', min: 0.2, max: 4, step: 0.05, value: s.L, fmt: 2 },
        { name: 'd', label: '直径 d', min: 10, max: 120, step: 1, value: s.d, fmt: 0 },
        { name: 'mag', label: '扭转角放大', min: 1, max: 40, step: 1, value: s.mag, fmt: 0 },
      ],
    },
    (st) => { s.T = st.T; s.L = st.L; s.d = st.d; s.mag = st.mag; draw(); },
  );

  draw();
  cv.redraw = draw;
  engine('mech').then((m2) => { mech = m2; draw(); }).catch(() => { void 0; });
  return { slidersBox: sliders.box, destroy() {} };
}
