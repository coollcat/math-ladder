/* 晶体管：开关与放大。
   三极管的全部行为可以用一句话概括：Ic = β·Ib——直到撞上外电路的天花板。
   天花板由集电极电阻给出：Ic,max = (Vcc − Vce(sat))/Rc。撞上去之前是放大区，
   撞上去之后是饱和区。做开关要故意过驱动进饱和（Vce 压到 0.2 V 以下，功耗才小）；
   做放大要待在放大区（负载线的中段）。 */
import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout, polyline, label, clamp, fmt,
} from '../core.js';

const VCESAT = 0.2;

export default function render(host, spec) {
  let C = themeColors();
  const s = { Ib: spec.Ib ?? 40, beta: spec.beta ?? 100, Rc: spec.Rc ?? 1000, Vcc: spec.Vcc ?? 12 };
  let hoverIb = null;

  const cv = setupCanvas(host, 320);
  const ro = buildReadout({ '集电极电流 Ic': '—', 'Vce': '—', '工作区': '—', '管耗': '—' });
  host.appendChild(ro.box);

  /* 简化模型：β 放大 + 外电路限流 + 饱和压降 */
  function solve(ib) {
    const icMax = (s.Vcc - VCESAT) / s.Rc;
    const icAmp = s.beta * ib;
    const sat = icAmp >= icMax;
    const ic = sat ? icMax : icAmp;
    const vce = Math.max(VCESAT, s.Vcc - ic * s.Rc);
    return { ic, vce, sat, cut: icAmp < 1e-9 };
  }

  function draw() {
    C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const ibA = (hoverIb !== null ? hoverIb : s.Ib) * 1e-6;
    const op = solve(ibA);

    /* ---------- 左：电路 ---------- */
    const L = 34;
    const T = 40;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(L, T + 150); ctx.lineTo(L, T); ctx.lineTo(150, T);
    ctx.moveTo(150, T + 96); ctx.lineTo(150, T + 150);
    ctx.stroke();
    /* Rc */
    ctx.strokeStyle = C.accent2;
    ctx.strokeRect(136, T + 20, 28, 40);
    label(ctx, 'Rc', 150, T + 44, C.fg, { align: 'center', size: 10 });
    label(ctx, fmt(s.Rc, 0) + ' Ω', 172, T + 44, C.accent2, { size: 10 });
    /* 三极管 */
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(150, T + 82); ctx.lineTo(150, T + 118);
    ctx.moveTo(150, T + 96); ctx.lineTo(122, T + 110);
    ctx.moveTo(150, T + 104); ctx.lineTo(122, T + 118);
    ctx.moveTo(122, T + 114); ctx.lineTo(114, T + 98);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(122, T + 116); ctx.lineTo(114, T + 132);
    ctx.lineTo(136, T + 124); ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(150, T + 118); ctx.lineTo(150, T + 150); ctx.lineTo(L, T + 150);
    ctx.stroke();
    label(ctx, 'Vcc ' + fmt(s.Vcc, 0) + ' V', L + 4, T - 6, C.fg, { size: 10 });
    label(ctx, 'Ib = ' + fmt(ibA * 1e6, 1) + ' µA', 92, T + 152, C.accent, { size: 10 });
    label(ctx, 'β = ' + fmt(s.beta, 0), 100, T + 72, C.fg, { size: 10 });
    label(ctx, 'Ic = ' + fmt(op.ic * 1000, 2) + ' mA', 158, T + 66, C.named('green'), { size: 10 });

    /* ---------- 右：输出特性族 + 负载线 ---------- */
    const gx = 210;
    const gw = W - gx - 22;
    const gy = H - 34;
    const gh = gy - 40;
    const icMax = (s.Vcc / s.Rc) * 1.15;
    const IX = (v) => gx + (clamp(v, 0, s.Vcc) / s.Vcc) * gw;
    const IY = (i) => gy - (clamp(i, 0, icMax) / icMax) * gh;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx, gy - gh); ctx.lineTo(gx, gy); ctx.lineTo(gx + gw, gy);
    ctx.stroke();
    label(ctx, 'Ic (mA)', gx - 6, gy - gh + 4, C.fg, { align: 'right', size: 10 });
    label(ctx, 'Vce (V)', gx + gw, gy + 15, C.fg, { align: 'right', size: 10 });
    label(ctx, fmt((icMax * 1000), 1), gx - 6, gy - gh + 18, C.fg, { align: 'right', size: 9 });
    /* 饱和区底纹 */
    ctx.fillStyle = C.named('red');
    ctx.globalAlpha = 0.10;
    ctx.fillRect(gx, gy - gh, IX(VCESAT) - gx, gh);
    ctx.globalAlpha = 1;
    label(ctx, '饱和区', IX(VCESAT) + 3, gy - 6, C.named('red'), { size: 9 });

    /* 特性曲线族：每条对应一个 Ib */
    const ibs = [10, 20, 30, 40, 50, 60].map((x) => x * 1e-6);
    ibs.forEach((ib, k) => {
      const icSatLvl = s.beta * ib;
      const pts = [];
      for (let i = 0; i <= 60; i += 1) {
        const vce = (i / 60) * s.Vcc;
        /* Vce < Vce(sat) 时电流迅速跌落，此处用二次近似画出膝部 */
        const val = vce < VCESAT ? icSatLvl * (vce / VCESAT) ** 2 : icSatLvl;
        pts.push([IX(vce), IY(Math.min(val, icMax))]);
      }
      const isCur = Math.abs(ib - ibA) < 6e-6;
      polyline(ctx, pts, isCur ? C.named('green') : C.series(k + 2), isCur ? 2.6 : 1.1,
        isCur ? null : [3, 3]);
      if (isCur) label(ctx, 'Ib=' + fmt(ib * 1e6, 0) + 'µA', IX(s.Vcc * 0.55), IY(icSatLvl) - 6,
        C.named('green'), { size: 9 });
    });
    /* 负载线：Ic = (Vcc − Vce)/Rc */
    polyline(ctx, [[IX(0), IY(s.Vcc / s.Rc)], [IX(s.Vcc), IY(0)]], C.named('amber'), 2.4);
    label(ctx, '负载线', IX(s.Vcc * 0.62) + 6, IY((s.Vcc * 0.38) / s.Rc) - 6, C.named('amber'), { size: 10 });
    /* 工作点 */
    ctx.fillStyle = op.sat ? C.named('red') : op.cut ? C.named('gray') : C.named('green');
    ctx.beginPath();
    ctx.arc(IX(op.vce), IY(op.ic), 6, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, 'Q', IX(op.vce) + 9, IY(op.ic) + 4, C.fg, { size: 11, weight: 600 });

    const pd = op.vce * op.ic;
    const region = op.cut ? '截止区（Ib≈0，Ic≈0，相当于开关断开）'
      : op.sat ? '饱和区（Vce≈0.2 V，相当于开关闭合）' : '放大区（Ic = β·Ib，与 Rc 无关）';
    ro.set('集电极电流 Ic', fmt(op.ic * 1000, 3) + ' mA　（β·Ib = ' + fmt(s.beta * ibA * 1000, 2)
      + ' mA，外电路上限 ' + fmt(((s.Vcc - VCESAT) / s.Rc) * 1000, 2) + ' mA）');
    ro.set('Vce', fmt(op.vce, 3) + ' V　（Vcc − Ic·Rc，最低只能到 Vce(sat) = ' + VCESAT + ' V）');
    ro.set('工作区', region + (op.sat ? '　过驱动倍数 ' + fmt((s.beta * ibA) / ((s.Vcc - VCESAT) / s.Rc), 2) + '×' : ''));
    ro.set('管耗', fmt(pd * 1000, 1) + ' mW　（开关应用要压到饱和，放大应用要避开两个极端）');
  }

  /* 在右半区横向拖动可直接扫 Ib */
  const ibAt = (x) => {
    const gx = 210;
    const gw = cv.W - gx - 22;
    if (gw <= 0) return null;
    return clamp((x - gx) / gw, 0, 1) * 300;
  };
  bindPointer(cv.canvas, {
    pick: (x) => (x < 210 ? null : 'ib'),
    down: (id, x) => { hoverIb = ibAt(x); draw(); },
    move: (id, x) => { hoverIb = ibAt(x); draw(); },
    leave: () => { hoverIb = null; draw(); },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'Ib', label: '基极电流 Ib', min: 0, max: 300, step: 1, value: s.Ib, fmt: 0 },
        { name: 'beta', label: '放大倍数 β', min: 20, max: 300, step: 5, value: s.beta, fmt: 0 },
        { name: 'Rc', label: '集电极电阻 Rc', min: 100, max: 5000, step: 100, value: s.Rc, fmt: 0 },
        { name: 'Vcc', label: '电源电压 Vcc', min: 3, max: 24, step: 1, value: s.Vcc, fmt: 0 },
      ],
    },
    (stt) => { Object.assign(s, stt); hoverIb = null; draw(); },
  );

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() {} };
}
