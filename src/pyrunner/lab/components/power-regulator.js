/* 电源、稳压与纹波。
   线性稳压器的工作方式是把多余的电压全部变成热：P = (Vin − Vout)·I。
   所以它的效率上限就是 Vout/Vin——输入越高越浪费。
   另一个隐蔽的坑是纹波：变压器整流后的电压在波谷处最低，
   只要谷值跌破 Vout + Vdrop，稳压器就「稳不住」，纹波会直接窜到输出。
   设计准则因此是：谷值（而不是平均值）必须留够压差。 */
import {
  themeColors, setupCanvas, buildSegmented, buildSliders, buildReadout, polyline, label, clamp, fmt,
} from '../core.js';

const VOUT = 5;
const FMAINS = 50;

export default function render(host, spec) {
  let C = themeColors();
  const s = { Vin: spec.Vin ?? 12, I: spec.I ?? 0.3, Cu: spec.C ?? 1000 };
  let vdrop = 2.0; // 7805 型

  const cv = setupCanvas(host, 330);
  host.appendChild(buildSegmented(
    [{ label: '7805（压差 2.0 V）', value: 2 }, { label: 'LDO（压差 0.3 V）', value: 0.3 }],
    vdrop,
    (v) => { vdrop = v; draw(); },
  ));
  const ro = buildReadout({ 输出电压: '—', 输入纹波: '—', 压差余量: '—', 效率: '—' });
  host.appendChild(ro.box);

  const farad = () => s.Cu * 1e-6;
  const ripple = () => (s.I / (2 * FMAINS * farad())); // 全波整流纹波峰峰值

  /* 输入电压：直流 Vin 叠加上三角纹波（简化模型，实际是锯齿） */
  const vin = (t) => s.Vin + (ripple() / 2) * (1 - 2 * ((t * 2 * FMAINS) % 1));
  const vout = (t) => Math.max(0, Math.min(VOUT, Math.max(vin(t) - vdrop, 0)));

  function draw() {
    C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const vr = ripple();
    const vTrough = s.Vin - vr / 2;
    const tSpan = 2 / (2 * FMAINS); // 两个纹波周期

    /* ---------- 上：整流输入 vs 稳压输出 ---------- */
    const gx = 46;
    const gw = W - gx - 18;
    const gy = 200;
    const gh = 150;
    const vTop = Math.max(s.Vin + vr / 2, VOUT + vdrop) * 1.12;
    const VY = (v) => gy - (clamp(v, 0, vTop) / vTop) * gh;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx, gy - gh); ctx.lineTo(gx, gy); ctx.lineTo(gx + gw, gy);
    ctx.stroke();
    label(ctx, 'V', gx - 6, gy - gh + 4, C.fg, { align: 'right', size: 10 });
    label(ctx, '两个纹波周期（' + fmt(tSpan * 1000, 1) + ' ms）', gx + gw / 2, gy + 15, C.fg,
      { align: 'center', size: 10 });
    /* Vout 与 Vout+Vdrop 两条基准线 */
    ctx.save();
    ctx.strokeStyle = C.named('green');
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(gx, VY(VOUT)); ctx.lineTo(gx + gw, VY(VOUT));
    ctx.stroke();
    ctx.strokeStyle = C.bad;
    ctx.beginPath();
    ctx.moveTo(gx, VY(VOUT + vdrop)); ctx.lineTo(gx + gw, VY(VOUT + vdrop));
    ctx.stroke();
    ctx.restore();
    label(ctx, 'Vout ' + VOUT + ' V', gx + 4, VY(VOUT) - 4, C.named('green'), { size: 10 });
    label(ctx, '输入下限 Vout+Vdrop = ' + fmt(VOUT + vdrop, 1) + ' V', gx + 4, VY(VOUT + vdrop) - 4,
      C.bad, { size: 10 });
    const pin = [];
    const pout = [];
    for (let k = 0; k <= 300; k += 1) {
      const t = (k / 300) * tSpan;
      pin.push([gx + (k / 300) * gw, VY(vin(t))]);
      pout.push([gx + (k / 300) * gw, VY(vout(t))]);
    }
    polyline(ctx, pin, C.named('gray'), 1.6, [4, 3]);
    polyline(ctx, pout, C.named('green'), 2.6);
    label(ctx, '整流输入（含纹波）', gx + gw - 4, gy - gh + 14, C.named('gray'), { align: 'right', size: 10 });
    label(ctx, '稳压输出', gx + gw - 4, gy - gh + 28, C.named('green'), { align: 'right', size: 10 });
    /* 纹波标尺 */
    const mx = gx + gw * 0.9;
    ctx.strokeStyle = C.named('amber');
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(mx, VY(s.Vin + vr / 2)); ctx.lineTo(mx, VY(vTrough));
    ctx.moveTo(mx - 5, VY(s.Vin + vr / 2)); ctx.lineTo(mx + 5, VY(s.Vin + vr / 2));
    ctx.moveTo(mx - 5, VY(vTrough)); ctx.lineTo(mx + 5, VY(vTrough));
    ctx.stroke();
    label(ctx, fmt(vr, 2) + ' Vpp', mx + 8, (VY(s.Vin + vr / 2) + VY(vTrough)) / 2, C.named('amber'),
      { size: 10 });

    /* ---------- 下：功率去向 ---------- */
    /* 输出平均值：数值积分一个纹波周期，掉出稳压时会自然低于 5 V */
    let sum = 0;
    for (let k = 0; k < 200; k += 1) sum += vout((k / 200) / (2 * FMAINS));
    const vOutAvg = sum / 200;
    const pOut = vOutAvg * s.I;
    const pIn = s.Vin * s.I;
    const pDis = Math.max(pIn - pOut, 0);
    const eff = pIn > 1e-9 ? pOut / pIn : 0;
    const by = 244;
    const bw = W - 40;
    const bar = (y, frac, col, txt) => {
      ctx.fillStyle = C.soft;
      ctx.fillRect(20, y, bw, 18);
      ctx.fillStyle = col;
      ctx.fillRect(20, y, clamp(frac, 0, 1) * bw, 18);
      label(ctx, txt, 24, y + 13, C.fg, { size: 10 });
    };
    const pMax = Math.max(pIn, 1e-6);
    bar(by, pOut / pMax, C.named('green'), '输出功率 ' + fmt(pOut, 2) + ' W');
    bar(by + 26, pDis / pMax, C.named('red'), '稳压器发热 ' + fmt(pDis, 2) + ' W');
    label(ctx, '输入功率 ' + fmt(pIn, 2) + ' W　效率 η = ' + fmt(eff * 100, 1) + '%', 20, by + 62, C.fg,
      { size: 11, weight: 600 });
    label(ctx, '线性稳压器的效率上限就是 Vout/Vin = ' + fmt((VOUT / Math.max(s.Vin, 1e-9)) * 100, 1)
      + '%；要高效就得换开关电源（Buck）', 20, by + 78, C.fg, { size: 10 });

    const margin = vTrough - (VOUT + vdrop);
    ro.set('输出电压', fmt(vOutAvg, 3) + ' V' + (vOutAvg < VOUT - 1e-6 ? '　⚠ 已跌出稳压，纹波窜到输出' : '　（平直）'));
    ro.set('输入纹波', fmt(vr, 3) + ' Vpp　≈ I/(2·f·C)　谷值 ' + fmt(vTrough, 2) + ' V'
      + (vr > s.Vin ? '　⚠ 电容撑不住这个负载，公式已失效' : ''));
    ro.set('压差余量', fmt(margin, 2) + ' V　' + (margin >= 0
      ? '谷值仍高于 Vout+Vdrop，稳得住'
      : '谷值低于输入下限，输出出现缺口：加大 C 或降低 Vin 需求'));
    ro.set('效率', fmt(eff * 100, 1) + '%　损耗 ' + fmt(pDis, 2) + ' W'
      + (pDis > 1 ? '　这么大的功耗必须加散热片' : ''));
  }

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'Vin', label: '整流后平均电压 Vin', min: 5, max: 24, step: 0.1, value: s.Vin, fmt: 1 },
        { name: 'I', label: '负载电流 I', min: 0.01, max: 1, step: 0.01, value: s.I, fmt: 2 },
        { name: 'Cu', label: '滤波电容 C', min: 100, max: 4700, step: 100, value: s.Cu, fmt: 0 },
      ],
    },
    (stt) => { Object.assign(s, stt); draw(); },
  );

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() {} };
}
