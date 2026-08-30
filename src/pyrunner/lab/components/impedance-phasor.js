/* 相量法与阻抗。
   把 R、L、C 三个元件放到同一张复平面上，交流电路就退化成「矢量加法」：
   Z_R = R（实轴正向）、Z_L = jωL（虚轴正向，超前）、Z_C = 1/(jωC) = −j/(ωC)（虚轴负向，滞后）。
   串联时三者直接相加；XL = XC 时虚部抵消，就是谐振——阻抗取最小值且为纯阻。 */
import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout, polyline, label, clamp, fmt,
} from '../core.js';

export default function render(host, spec) {
  let C = themeColors();
  const s = { R: spec.R ?? 100, L: spec.L ?? 1, Cu: spec.C ?? 1, lf: spec.lf ?? 4 }; // L: mH，Cu: µF，lf = log10(f)
  let hoverF = null;

  const cv = setupCanvas(host, 320);
  const ro = buildReadout({ 'XL = ωL': '—', 'XC = 1/(ωC)': '—', '合成阻抗 Z': '—', 谐振频率: '—' });
  host.appendChild(ro.box);

  const freq = () => 10 ** s.lf;
  const henry = () => s.L * 1e-3;
  const farad = () => s.Cu * 1e-6;

  function values(f) {
    const w = 2 * Math.PI * f;
    const xl = w * henry();
    const xc = 1 / (w * farad());
    return { w, xl, xc, zr: s.R, zi: xl - xc, mag: Math.hypot(s.R, xl - xc) };
  }

  function draw() {
    C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const f = hoverF !== null ? hoverF : freq();
    const v = values(f);

    /* ---------- 左：复平面 ---------- */
    const planeW = Math.min(250, W * 0.46);
    const cx = 40;
    const cy = 150;
    const scale = planeW / Math.max(2, Math.max(v.xl, v.xc, v.mag) * 1.15);
    const PX = (x) => cx + x * scale;
    const PY = (y) => cy - y * scale;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy); ctx.lineTo(cx + planeW, cy);
    ctx.moveTo(cx, cy + 60); ctx.lineTo(cx, cy - 100);
    ctx.stroke();
    label(ctx, 'Re', cx + planeW, cy - 6, C.fg, { align: 'right', size: 10 });
    label(ctx, 'Im', cx + 4, cy - 94, C.fg, { size: 10 });

    const arrow = (x0, y0, x1, y1, col, txt) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
      ctx.stroke();
      const a = Math.atan2(y1 - y0, x1 - x0);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - 8 * Math.cos(a - 0.4), y1 - 8 * Math.sin(a - 0.4));
      ctx.lineTo(x1 - 8 * Math.cos(a + 0.4), y1 - 8 * Math.sin(a + 0.4));
      ctx.closePath();
      ctx.fill();
      if (txt) label(ctx, txt, (x0 + x1) / 2, (y0 + y1) / 2 - 6, col, { align: 'center', size: 10 });
    };
    /* 三段串联矢量首尾相接 */
    arrow(cx, cy, PX(v.zr), PY(0), C.accent, 'R=' + fmt(s.R, 0) + 'Ω');
    arrow(PX(v.zr), PY(0), PX(v.zr), PY(v.xl), C.named('green'), 'jωL');
    arrow(PX(v.zr), PY(v.xl), PX(v.zr), PY(v.xl - v.xc), C.named('red'), '−j/(ωC)');
    /* 合成阻抗 */
    arrow(cx, cy, PX(v.zr), PY(v.xl - v.xc), C.named('amber'), 'Z');
    /* 相角弧 */
    const ang = Math.atan2(v.xl - v.xc, v.zr);
    ctx.strokeStyle = C.named('purple');
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, 30, -Math.max(ang, 0), -Math.min(ang, 0), ang > 0);
    ctx.stroke();
    label(ctx, 'φ = ' + fmt((ang * 180) / Math.PI, 1) + '°', cx + 34, cy - (ang > 0 ? 10 : -14),
      C.named('purple'), { size: 10 });

    /* ---------- 右：|Z| 与分量随频率变化 ---------- */
    const gx = cx + planeW + 46;
    const gw = W - gx - 16;
    const gy = H - 34;
    const gh = gy - 40;
    const fMin = 100;
    const fMax = 1e7;
    const zMax = Math.max(...[1, 2, 3].map((k) => {
      const q = values(fMin * (fMax / fMin) ** (k / 3));
      return Math.max(q.mag, q.xl, q.xc);
    })) * 1.1;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx, gy - gh); ctx.lineTo(gx, gy); ctx.lineTo(gx + gw, gy);
    ctx.stroke();
    label(ctx, '|Z| (Ω)', gx - 6, gy - gh + 4, C.fg, { align: 'right', size: 10 });
    label(ctx, '频率（对数 Hz）', gx + gw / 2, gy + 16, C.fg, { align: 'center', size: 10 });
    const FX = (ff) => gx + (Math.log(clamp(ff, fMin, fMax) / fMin) / Math.log(fMax / fMin)) * gw;
    const ZY = (z) => gy - (clamp(z, 0, zMax) / zMax) * gh;
    [1000, 1e5].forEach((ff) => label(ctx, ff >= 1e5 ? '100k' : '1k', FX(ff), gy + 14, C.fg,
      { align: 'center', size: 9 }));
    const curve = (fn, col, w2) => {
      const pp = [];
      for (let k = 0; k <= 200; k += 1) {
        const ff = fMin * (fMax / fMin) ** (k / 200);
        pp.push([FX(ff), ZY(fn(values(ff)))]);
      }
      polyline(ctx, pp, col, w2);
    };
    curve((q) => q.xl, C.named('green'), 1.6);
    curve((q) => q.xc, C.named('red'), 1.6);
    curve((q) => q.mag, C.named('amber'), 2.4);
    label(ctx, 'jωL', FX(1e5), ZY(values(1e5).xl) - 5, C.named('green'), { size: 9 });
    label(ctx, '1/(ωC)', FX(300), ZY(values(300).xc) + 12, C.named('red'), { size: 9 });
    /* 谐振点 */
    const f0 = 1 / (2 * Math.PI * Math.sqrt(henry() * farad()));
    if (f0 > fMin && f0 < fMax) {
      ctx.save();
      ctx.strokeStyle = C.ok;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(FX(f0), gy - gh); ctx.lineTo(FX(f0), gy);
      ctx.stroke();
      ctx.restore();
      label(ctx, 'f₀ 谐振', FX(f0) + 3, gy - gh + 12, C.ok, { size: 9 });
    }
    /* 当前频率游标 */
    ctx.strokeStyle = C.named('purple');
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(FX(f), gy - gh); ctx.lineTo(FX(f), gy);
    ctx.stroke();
    label(ctx, fmt(f / 1000, 2) + ' kHz', FX(f), gy - gh - 4, C.named('purple'),
      { align: 'center', size: 10 });
    label(ctx, '拖右侧曲线可沿频率扫描', gx, 26, C.fg, { size: 10 });

    const kind = Math.abs(v.xl - v.xc) < 1e-9 ? '纯阻（谐振）' : (v.xl > v.xc ? '感性（电流滞后）' : '容性（电流超前）');
    ro.set('XL = ωL', fmt(v.xl, 1) + ' Ω　（频率翻倍，XL 翻倍）');
    ro.set('XC = 1/(ωC)', fmt(v.xc, 1) + ' Ω　（频率翻倍，XC 减半）');
    ro.set('合成阻抗 Z', fmt(v.mag, 1) + ' Ω ∠ ' + fmt((ang * 180) / Math.PI, 1) + '°　' + kind);
    ro.set('谐振频率', 'f₀ = 1/(2π√(LC)) = ' + fmt(f0, 1) + ' Hz　此频率下 XL=XC，|Z| = R = '
      + fmt(s.R, 0) + ' Ω 最小');
  }

  /* 右侧曲线区可沿对数频率轴拖动扫描（用底座的 bindPointer，自动处理捕获与离开） */
  const scanAt = (x) => {
    const planeW = Math.min(250, cv.W * 0.46);
    const gx = 40 + planeW + 46;
    const gw = cv.W - gx - 16;
    if (gw <= 0 || x < gx) return null;
    const t = clamp((x - gx) / gw, 0, 1);
    return 100 * (1e7 / 100) ** t;
  };
  bindPointer(cv.canvas, {
    pick: (x) => (scanAt(x) === null ? null : 'f'),
    down: (id, x) => { hoverF = scanAt(x); draw(); },
    move: (id, x) => { hoverF = scanAt(x); draw(); },
    leave: () => { hoverF = null; draw(); },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'R', label: '电阻 R', min: 0, max: 1000, step: 10, value: s.R, fmt: 0 },
        { name: 'L', label: '电感 L', min: 0.1, max: 10, step: 0.1, value: s.L, fmt: 1 },
        { name: 'Cu', label: '电容 C', min: 0.01, max: 10, step: 0.01, value: s.Cu, fmt: 2 },
        { name: 'lf', label: '频率 log₁₀f', min: 2, max: 7, step: 0.01, value: s.lf, fmt: 2 },
      ],
    },
    (stt) => { Object.assign(s, stt); hoverF = null; draw(); },
  );

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() {} };
}
