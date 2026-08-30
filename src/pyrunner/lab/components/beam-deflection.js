/* 梁的挠度与刚度：把变形后的梁形叠加在原始位置上（放大系数可调），
   并把数值解和解析解并排放——EI 翻倍，挠度减半；跨度翻倍，挠度翻八倍。 */
import {
  themeColors, setupCanvas, buildSegmented, buildReadout, buildSliders,
  engine, polyline, label, fmt,
} from '../core.js';

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    support: spec.support || 'simply',
    L: spec.L ?? 6,
    P: spec.P ?? 20000,
    E: spec.E ?? 210,      // GPa
    I: spec.I ?? 8000,     // cm⁴
    mag: spec.mag ?? 8,    // px per mm 挠度
  };

  const cv = setupCanvas(host, 300);
  const ro = buildReadout({ '最大挠度 δ': '—', '挠跨比': '—', '解析解': '—', '相对误差': '—' });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(
    [{ label: '简支梁', value: 'simply' }, { label: '悬臂梁', value: 'cantilever' }],
    s.support,
    (v) => { s.support = v; draw(); },
  ));

  let mech = null;
  let res = null;

  function compute() {
    if (!mech) return;
    const EI = s.E * 1e9 * s.I * 1e-8; // GPa·cm⁴ → N·m²
    const x = s.support === 'cantilever' ? s.L : s.L / 2;
    res = mech.beamAnalysis({
      L: s.L,
      EI,
      loads: [{ type: 'point', P: -s.P, x }],
      support: s.support,
      n: 301,
    });
    res.EI = EI;
    res.analytic = s.support === 'cantilever'
      ? -mech.cantileverTipDeflection(s.P, s.L, EI)
      : -mech.simplySupportedMidDeflection(s.P, s.L, EI);
  }

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    compute();
    if (!res) {
      label(ctx, '正在载入 mech 引擎…', W / 2, H / 2, C.fg, { align: 'center', size: 12 });
      return;
    }

    const gx = 44;
    const gw = W - 88;
    const by = Math.round(H * 0.44);
    const ex = (x) => gx + (x / s.L) * gw;

    /* 未变形位置（虚线） */
    ctx.save();
    ctx.strokeStyle = C.axis;
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(ex(0), by);
    ctx.lineTo(ex(s.L), by);
    ctx.stroke();
    ctx.restore();
    label(ctx, '未变形轴线', ex(s.L), by - 8, C.axis, { align: 'right', size: 10 });

    /* 支座 */
    const sup = (X, fixedEnd) => {
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 2;
      if (fixedEnd) {
        ctx.beginPath();
        ctx.moveTo(X - 10, by - 14);
        ctx.lineTo(X - 10, by + 14);
        ctx.stroke();
        for (let k = 0; k < 3; k += 1) {
          ctx.beginPath();
          ctx.moveTo(X - 10, by - 10 + k * 10);
          ctx.lineTo(X - 21, by - 4 + k * 10);
          ctx.stroke();
        }
        return;
      }
      ctx.beginPath();
      ctx.moveTo(X, by);
      ctx.lineTo(X - 9, by + 17);
      ctx.lineTo(X + 9, by + 17);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(X - 5, by + 21, 4, 0, Math.PI * 2);
      ctx.moveTo(X + 10, by + 21);
      ctx.arc(X + 5, by + 21, 4, 0, Math.PI * 2);
      ctx.stroke();
    };
    if (s.support === 'cantilever') sup(ex(0), true);
    else { sup(ex(0), false); sup(ex(s.L), false); }

    /* 载荷 */
    const lx = s.support === 'cantilever' ? s.L : s.L / 2;
    ctx.strokeStyle = C.named('red');
    ctx.fillStyle = C.named('red');
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(ex(lx), by - 58);
    ctx.lineTo(ex(lx), by - 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ex(lx), by - 3);
    ctx.lineTo(ex(lx) - 5, by - 13);
    ctx.lineTo(ex(lx) + 5, by - 13);
    ctx.closePath();
    ctx.fill();
    label(ctx, 'P = ' + fmt(s.P / 1000, 1) + ' kN', ex(lx) + 7, by - 50, C.named('red'), { size: 11, weight: 600 });

    /* 变形后的梁。放大倍率的单位是「每 1 mm 实际挠度画多少 px」，
       并自动限幅，免得大挠度时飞出画面 */
    const dmm = Math.abs(res.maxDeflection) * 1000;
    let pxPerMm = s.mag;
    if (dmm * pxPerMm > 68) pxPerMm = 68 / Math.max(dmm, 1e-9);
    const pts = res.x.map((x, i) => [ex(x), by + res.y[i] * 1000 * pxPerMm]);
    polyline(ctx, pts, C.accent, 3);

    /* 最大挠度标注 */
    const iMax = res.y.indexOf(res.maxDeflection);
    const xm = res.x[iMax];
    ctx.strokeStyle = C.named('amber');
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(pts[iMax][0], by);
    ctx.lineTo(pts[iMax][0], pts[iMax][1]);
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, 'δ = ' + fmt(dmm, 3) + ' mm', pts[iMax][0] + 6, (by + pts[iMax][1]) / 2, C.named('amber'), { size: 11, weight: 600 });
    label(ctx, 'x = ' + fmt(xm, 2) + ' m', pts[iMax][0] + 6, (by + pts[iMax][1]) / 2 + 14, C.fg, { size: 10 });

    label(ctx, '变形放大：1 mm 挠度 → ' + fmt(pxPerMm, 2) + ' px', gx, 14, C.fg, { size: 10 });
    label(ctx, 'EI = ' + fmt(res.EI / 1000, 1) + ' kN·m²', gx + gw, 14, C.fg, { align: 'right', size: 10 });

    const d = Math.abs(res.maxDeflection);
    const err = Math.abs(d - Math.abs(res.analytic)) / Math.max(1e-12, Math.abs(res.analytic));
    ro.set('最大挠度 δ', fmt(d * 1000, 3) + ' mm');
    ro.set('挠跨比', 'L / ' + fmt(s.L / Math.max(d, 1e-12), 0) + (s.L / Math.max(d, 1e-12) < 250 ? '（偏软）' : '（满足 L/250）'));
    ro.set('解析解', fmt(Math.abs(res.analytic) * 1000, 3) + ' mm');
    ro.set('相对误差', fmt(err * 100, 2) + ' %');
  }

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'E', label: '弹性模量 E', min: 10, max: 400, step: 5, value: s.E, fmt: 0 },
        { name: 'I', label: '截面惯性矩 I', min: 200, max: 60000, step: 100, value: s.I, fmt: 0 },
        { name: 'L', label: '跨度 L', min: 2, max: 14, step: 0.1, value: s.L, fmt: 2 },
        { name: 'P', label: '集中力 P', min: 1000, max: 80000, step: 500, value: s.P, fmt: 0 },
        { name: 'mag', label: '放大倍率（px/mm）', min: 0.05, max: 40, step: 0.05, value: s.mag, fmt: 2 },
      ],
    },
    (st) => { s.E = st.E; s.I = st.I; s.L = st.L; s.P = st.P; s.mag = st.mag; draw(); },
  );

  draw();
  cv.redraw = draw;
  engine('mech').then((m) => { mech = m; draw(); }).catch(() => { void 0; });
  return { slidersBox: sliders.box, destroy() {} };
}
