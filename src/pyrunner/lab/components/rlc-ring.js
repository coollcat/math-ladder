/* RLC 二阶与阻尼振荡。
   一个 ζ 把三种世界分开：ζ<1 欠阻尼（振铃过冲）、ζ=1 临界（最快且不过冲）、
   ζ>1 过阻尼（迟钝爬升）。R 越大越「黏」，临界电阻 R_c = 2√(L/C)。
   主曲线用电路方程真解，两条虚影分别是临界阻尼与 2× 临界阻尼，用来对照。 */
import {
  themeColors, setupCanvas, buildSliders, buildReadout, polyline, label, engine, clamp, fmt,
} from '../core.js';

export default function render(host, spec) {
  let C = themeColors();
  const s = { R: spec.R ?? 20, L: spec.L ?? 1, Cu: spec.C ?? 1 }; // L: mH，Cu: µF
  const VS = 5;
  let circ = null;
  let fail = '';

  const cv = setupCanvas(host, 320);
  const ro = buildReadout({ '阻尼比 ζ': '—', 类型: '—', '自然频率': '—', 过冲: '—' });
  host.appendChild(ro.box);

  const henry = () => s.L * 1e-3;
  const farad = () => s.Cu * 1e-6;

  /* 跑一条 v_C(t)。步长按固有周期取，步数上限防卡 */
  function run(R) {
    const wn = 1 / Math.sqrt(henry() * farad());
    const T = (2 * Math.PI) / wn;
    const zeta = (R / 2) * Math.sqrt(farad() / henry());
    const dt = T / 400;
    const tEnd = Math.min(10 * T, 12 / Math.max(zeta * wn, 1e-6));
    const r = circ.transient(circ.netRLC(R, henry(), farad(), VS), {
      dt,
      tEnd,
      probe: (v, idx) => v[idx.get('out')],
    });
    if (!r.ok) return null;
    return { pts: r.samples.map((x) => [x.t, x.value]), tEnd };
  }

  function draw() {
    C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    if (!circ) { label(ctx, '正在载入 circuit 引擎…', W / 2, H / 2, C.fg, { align: 'center', size: 12 }); return; }

    const p = circ.rlcParams(s.R, henry(), farad());
    const main = run(s.R);
    if (!main) {
      fail = '求解失败：请检查 R/L/C 是否都为正';
      label(ctx, fail, W / 2, H / 2, C.bad, { align: 'center', size: 12 });
      return;
    }
    const Rc = 2 * Math.sqrt(henry() / farad());
    const gCrit = run(Rc);
    const gOver = run(Rc * 2);

    const gx = 46;
    const gw = W - gx - 100;
    const gy = H - 34;
    const gh = gy - 34;
    const tMax = Math.max(main.tEnd, gCrit ? gCrit.tEnd : 0);
    const vMax = VS * 2;
    const TX = (t) => gx + (clamp(t, 0, tMax) / tMax) * gw;
    const VY = (v) => gy - (clamp(v, -vMax * 0.6, vMax) / vMax) * gh;

    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx, gy - gh); ctx.lineTo(gx, gy); ctx.lineTo(gx + gw, gy);
    ctx.stroke();
    label(ctx, 'v_C (V)', gx - 6, gy - gh + 4, C.fg, { align: 'right', size: 10 });
    label(ctx, 't', gx + gw / 2, gy + 16, C.fg, { align: 'center', size: 10 });
    /* 终值线 VS */
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(gx, VY(VS)); ctx.lineTo(gx + gw, VY(VS));
    ctx.stroke();
    ctx.restore();
    label(ctx, '终值 ' + VS + ' V', gx + 4, VY(VS) - 5, C.fg, { size: 10 });

    const map = (r2) => (r2 ? r2.pts.map(([t, v]) => [TX(t), VY(v)]) : []);
    if (gOver) polyline(ctx, map(gOver), C.named('gray'), 1.3, [4, 3]);
    if (gCrit) polyline(ctx, map(gCrit), C.named('purple'), 1.6, [6, 3]);
    polyline(ctx, map(main), p.zeta < 1 ? C.accent : p.zeta > 1 ? C.named('green') : C.accent2, 2.6);

    /* ζ 标尺：用颜色区分三个区 */
    const sx = gx + 8;
    const sy = gy - gh + 16;
    label(ctx, 'ζ = ' + fmt(p.zeta, 3), sx, sy, C.fg, { size: 11, weight: 600 });
    label(ctx, 'R = ' + fmt(s.R, 0) + ' Ω　R_c = 2√(L/C) = ' + fmt(Rc, 1) + ' Ω', sx, sy + 15, C.fg, { size: 10 });
    const lx = gx + gw + 12;
    label(ctx, '── 当前 R', lx, 40, C.accent, { size: 10 });
    label(ctx, '┈ 临界 R_c', lx, 56, C.named('purple'), { size: 10 });
    label(ctx, '┄ 过阻尼 2R_c', lx, 72, C.named('gray'), { size: 10 });

    const vals = main.pts.map((x) => x[1]);
    const peak = Math.max(...vals);
    const over = ((peak - VS) / VS) * 100;
    const NAME = { underdamped: '欠阻尼（振铃过冲）', critical: '临界阻尼（最快无过冲）', overdamped: '过阻尼（迟钝爬升）' };
    ro.set('阻尼比 ζ', fmt(p.zeta, 4) + '　Q = 1/(2ζ) = ' + fmt(p.Q, 3));
    ro.set('类型', NAME[p.type] + '　ωn = ' + fmt(p.wn, 0) + ' rad/s');
    ro.set('自然频率', 'fn = ωn/2π = ' + fmt(p.wn / (2 * Math.PI), 1) + ' Hz　（阻尼振荡 fd = '
      + fmt((p.wn / (2 * Math.PI)) * Math.sqrt(Math.max(1 - p.zeta * p.zeta, 0)), 1) + ' Hz）');
    ro.set('过冲', p.zeta < 1
      ? fmt(over, 1) + '%　峰值 ' + fmt(peak, 3) + ' V（过冲只出现在 ζ<1）'
      : '无过冲：ζ ≥ 1 时响应单调爬升，永不越过终值');
  }

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'R', label: '电阻 R', min: 1, max: 400, step: 1, value: s.R, fmt: 0 },
        { name: 'L', label: '电感 L', min: 0.1, max: 10, step: 0.1, value: s.L, fmt: 1 },
        { name: 'Cu', label: '电容 C', min: 0.05, max: 5, step: 0.05, value: s.Cu, fmt: 2 },
      ],
    },
    (stt) => { Object.assign(s, stt); draw(); },
  );

  draw();
  cv.redraw = draw;
  engine('circuit').then((m) => { circ = m; draw(); }).catch((e) => {
    fail = '引擎加载失败：' + (e && e.message ? e.message : e);
    draw();
  });
  return { slidersBox: sliders.box, destroy() {} };
}
