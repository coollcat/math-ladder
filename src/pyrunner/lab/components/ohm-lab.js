/* 欧姆定律：V = I·R。
   一张图同时给出三件事——V-I 特性是一条过原点的直线、斜率是 1/R（电导）、
   工作点与坐标轴围出的矩形面积就是功率 P = V·I = V²/R。
   电流由 circuit.dc 真解（电压源支路电流），不是套公式。 */
import {
  themeColors, setupCanvas, anim, buildSliders, buildReadout, polyline, label, engine, clamp, fmt,
} from '../core.js';

export default function render(host, spec) {
  let C = themeColors();
  const s = { V: spec.V ?? 5, R: spec.R ?? 220 };
  let flow = 0;
  let circ = null;
  let solveFail = '';

  const cv = setupCanvas(host, 300);
  const ro = buildReadout({ '电流 I': '—', '电阻 R': '—', '功率 P': '—', '电导 G': '—' });
  host.appendChild(ro.box);

  /* 电流取电压源支路电流：MNA 额外行的符号是「从 a 流向 b」，故取负 */
  function solve() {
    if (!circ) return null;
    const net = {
      nodes: ['0', 'a'],
      elements: [
        { type: 'V', id: 'V1', a: 'a', b: '0', dc: s.V },
        { type: 'R', id: 'R1', a: 'a', b: '0', value: s.R },
      ],
    };
    const r = circ.dc(net);
    if (!r.ok) { solveFail = r.reason || '求解失败'; return null; }
    solveFail = '';
    return -r.v[r.total - 1];
  }

  function draw() {
    C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const I = solve();
    if (I === null) {
      label(ctx, '求解失败：' + solveFail, W / 2, H / 2, C.bad, { align: 'center', size: 12 });
      return;
    }
    const P = s.V * I;
    const over = P > 0.25; // 1/4 W 碳膜电阻的额定功率

    /* ---------- 左：电路与电流动画 ---------- */
    const midY = 78;
    const xL = 34;
    const xR = 168;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xL, midY - 40); ctx.lineTo(xL, midY + 40);
    ctx.moveTo(xR, midY - 40); ctx.lineTo(xR, midY + 40);
    ctx.moveTo(xL, midY + 40); ctx.lineTo(xR, midY + 40);
    ctx.moveTo(xL, midY - 40); ctx.lineTo(78, midY - 40);
    ctx.moveTo(124, midY - 40); ctx.lineTo(xR, midY - 40);
    ctx.stroke();
    /* 电池 */
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(84, midY - 40); ctx.lineTo(84, midY - 30);
    ctx.moveTo(78, midY - 30); ctx.lineTo(90, midY - 30);
    ctx.moveTo(84, midY - 24); ctx.lineTo(84, midY - 14);
    ctx.moveTo(78, midY - 14); ctx.lineTo(90, midY - 14);
    ctx.stroke();
    /* 电阻 */
    ctx.strokeStyle = C.accent2;
    ctx.strokeRect(96, midY - 40, 32, 80);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(96, midY - 26); ctx.lineTo(128, midY - 26);
    ctx.lineTo(96, midY - 8); ctx.lineTo(128, midY - 8);
    ctx.lineTo(96, midY + 10); ctx.lineTo(128, midY + 10);
    ctx.lineTo(96, midY + 28); ctx.lineTo(128, midY + 28);
    ctx.stroke();
    label(ctx, fmt(s.V, 1) + ' V', xL - 4, midY - 20, C.fg, { align: 'right', size: 11 });
    label(ctx, fmt(s.R, 0) + ' Ω', 112, midY + 52, C.accent2, { align: 'center', size: 11, weight: 600 });
    /* 载流子 */
    ctx.fillStyle = C.accent;
    const dir = I >= 0 ? 1 : -1;
    for (let i = 0; i < 10; i += 1) {
      const p = ((i / 10) + flow * dir) % 1;
      const u = dir > 0 ? p : 1 - p;
      ctx.beginPath();
      ctx.arc(xL + 8 + u * (xR - xL - 16), midY + 40, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
    label(ctx, 'I = ' + fmt(I * 1000, 1) + ' mA', (xL + xR) / 2, midY + 58, C.accent,
      { align: 'center', size: 11, weight: 600 });

    /* ---------- 右：V-I 特性 ---------- */
    const gx = 210;
    const gw = W - gx - 22;
    const gy = H - 34;
    const gh = gy - 44;
    const iMax = Math.max(12 / Math.max(s.R, 1) * 1000, 1) * 1.15;
    const vMax = 12;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx, gy - gh); ctx.lineTo(gx, gy); ctx.lineTo(gx + gw, gy);
    ctx.stroke();
    label(ctx, 'V (V)', gx + gw / 2, gy + 16, C.fg, { align: 'center', size: 10 });
    label(ctx, 'I (mA)', gx - 6, gy - gh + 4, C.fg, { align: 'right', size: 10 });
    label(ctx, '12', gx - 4, gy - gh + 10, C.fg, { align: 'right', size: 9 });
    label(ctx, fmt(iMax, 0), gx - 4, gy + 3, C.fg, { align: 'right', size: 9 });

    const X = (ii) => gx + (clamp(ii, 0, iMax) / iMax) * gw;
    const Y = (vv) => gy - (clamp(vv, 0, vMax) / vMax) * gh;
    /* 特性直线 V = I·R：iMax 已按 12/R 放宽，故直线总是先撞上顶边 */
    polyline(ctx, [[X(0), Y(0)], [X((vMax / s.R) * 1000), Y(vMax)]], C.accent, 2.2);
    /* 功率矩形 */
    const cx = X(I * 1000);
    const cy = Y(s.V);
    ctx.fillStyle = over ? C.bad : C.named('green');
    ctx.globalAlpha = 0.18;
    ctx.fillRect(gx, cy, cx - gx, gy - cy);
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.strokeStyle = C.named('purple');
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(gx, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, gy);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = C.named('amber');
    ctx.beginPath();
    ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, 'P = V·I（面积）', gx + 8, cy - 6, C.named('purple'), { size: 10 });
    label(ctx, '斜率 1/R', X((vMax / s.R) * 1000 * 0.62) + 6, Y(vMax * 0.62) - 6, C.accent, { size: 10 });

    ro.set('电流 I', fmt(I * 1000, 2) + ' mA（' + fmt(s.V, 2) + ' V ÷ ' + fmt(s.R, 0) + ' Ω）');
    ro.set('电阻 R', fmt(s.R, 0) + ' Ω，斜率 1/R = ' + fmt(1 / s.R * 1000, 2) + ' mS');
    ro.set('功率 P', fmt(P * 1000, 1) + ' mW' + (over ? '　⚠ 超过 1/4 W 额定，电阻会烧' : '　（1/4 W 以内）'));
    ro.set('电导 G', fmt(1 / s.R, 5) + ' S　（R 翻倍 → I 减半，直线变平）');
  }

  const controls = anim(host, {
    onTick(dt) {
      const I = s.V / s.R;
      flow = (flow + dt * clamp(Math.abs(I) * 900, 0.05, 3)) % 1;
      draw();
    },
    onReset() { flow = 0; draw(); },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'V', label: '电压 V', min: 0, max: 12, step: 0.1, value: s.V, fmt: 1 },
        { name: 'R', label: '电阻 R', min: 10, max: 1000, step: 10, value: s.R, fmt: 0 },
      ],
    },
    (st) => { s.V = st.V; s.R = st.R; draw(); },
  );

  draw();
  cv.redraw = draw;
  engine('circuit').then((m) => { circ = m; draw(); }).catch((e) => {
    solveFail = '引擎加载失败：' + (e && e.message ? e.message : e);
    draw();
  });
  return { slidersBox: sliders.box, destroy() { controls.stop(); } };
}
