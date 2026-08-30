/* 分压与戴维南等效。
   任何线性二端网络，对外部负载而言都等价于一个电压源 Vth 串一个电阻 Rth：
   Vth = 空载输出电压，Rth = 独立源置零后看进去的电阻。
   本组件把原电路和等效电路分别丢给 circuit.dc 真解，逐点比对输出是否一致。 */
import {
  themeColors, setupCanvas, buildSegmented, buildSliders, buildReadout, polyline, label, engine, clamp, fmt,
} from '../core.js';

export default function render(host, spec) {
  let C = themeColors();
  const s = { Vs: spec.Vs ?? 12, R1: spec.R1 ?? 1000, R2: spec.R2 ?? 3000, RL: spec.RL ?? 2000 };
  let mode = 'real'; // real | equiv
  let circ = null;
  let fail = '';

  const cv = setupCanvas(host, 300);
  const seg = buildSegmented(
    [{ label: '原电路（R1/R2 分压）', value: 'real' }, { label: '戴维南等效（Vth + Rth）', value: 'equiv' }],
    mode,
    (v) => { mode = v; draw(); },
  );
  host.appendChild(seg);
  const ro = buildReadout({ Vth: '—', Rth: '—', 'Vout（原）': '—', 'Vout（等效）': '—', 负载功率: '—' });
  host.appendChild(ro.box);

  const netReal = (RL) => ({
    nodes: ['0', 'in', 'out'],
    elements: [
      { type: 'V', id: 'V1', a: 'in', b: '0', dc: s.Vs },
      { type: 'R', id: 'R1', a: 'in', b: 'out', value: s.R1 },
      { type: 'R', id: 'R2', a: 'out', b: '0', value: s.R2 },
      { type: 'R', id: 'RL', a: 'out', b: '0', value: RL },
    ],
  });
  const netEquiv = (Vth, Rth, RL) => ({
    nodes: ['0', 'x', 'out'],
    elements: [
      { type: 'V', id: 'Vth', a: 'x', b: '0', dc: Vth },
      { type: 'R', id: 'Rth', a: 'x', b: 'out', value: Rth },
      { type: 'R', id: 'RL', a: 'out', b: '0', value: RL },
    ],
  });

  const thevenin = () => ({
    Vth: (s.Vs * s.R2) / (s.R1 + s.R2),
    Rth: (s.R1 * s.R2) / (s.R1 + s.R2),
  });

  function out(net) {
    const r = circ.dc(net);
    if (!r.ok) return null;
    return r.v[r.nodeIdx.get('out')];
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
    const th = thevenin();
    const vr = out(netReal(s.RL));
    const ve = out(netEquiv(th.Vth, th.Rth, s.RL));
    if (vr === null || ve === null) {
      fail = '求解失败：请检查是否有悬空节点或缺少接地路径';
      label(ctx, fail, W / 2, H / 2, C.bad, { align: 'center', size: 12 });
      return;
    }

    /* ---------- 左：电路图 ---------- */
    const L = 30;
    const T = 44;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(L, T); ctx.lineTo(L, T + 130); ctx.lineTo(150, T + 130); ctx.lineTo(150, T); ctx.lineTo(L, T);
    ctx.stroke();
    const box = (x, y, tx, col) => {
      ctx.fillStyle = C.bg;
      ctx.fillRect(x - 20, y - 13, 40, 26);
      ctx.strokeStyle = col;
      ctx.strokeRect(x - 20, y - 13, 40, 26);
      label(ctx, tx, x, y + 4, C.fg, { align: 'center', size: 10 });
    };
    label(ctx, 'Vs = ' + fmt(s.Vs, 1) + ' V', L + 4, T - 8, C.fg, { size: 10 });
    if (mode === 'real') {
      box(L, T + 44, 'R1', C.accent2);
      box(150, T + 44, 'R2', C.accent2);
      box(150, T + 96, 'RL', C.named('green'));
      label(ctx, fmt(s.R1, 0) + ' Ω', L + 26, T + 48, C.fg, { size: 10 });
      label(ctx, fmt(s.R2, 0) + ' Ω', 150 + 26, T + 48, C.fg, { size: 10 });
      label(ctx, fmt(s.RL, 0) + ' Ω', 150 + 26, T + 100, C.fg, { size: 10 });
      label(ctx, 'out', 150, T + 130 + 16, C.named('green'), { align: 'center', size: 10 });
      label(ctx, 'R1 与 R2 串联分压；RL 与 R2 并联，会拉低输出（负载效应）',
        L - 10, T + 172, C.fg, { size: 10 });
    } else {
      box(L, T + 44, 'Vth', C.accent);
      box(150, T + 44, 'Rth', C.accent);
      box(150, T + 96, 'RL', C.named('green'));
      label(ctx, fmt(th.Vth, 2) + ' V', L + 30, T + 48, C.accent, { size: 10 });
      label(ctx, fmt(th.Rth, 0) + ' Ω', 150 + 30, T + 48, C.accent, { size: 10 });
      label(ctx, fmt(s.RL, 0) + ' Ω', 150 + 26, T + 100, C.fg, { size: 10 });
      label(ctx, 'out', 150, T + 130 + 16, C.named('green'), { align: 'center', size: 10 });
      label(ctx, '两个元件顶替整个网络，对外特性完全相同', L - 10, T + 172, C.accent, { size: 10 });
    }

    /* ---------- 右：Vout vs RL ---------- */
    const gx = 210;
    const gw = W - gx - 26;
    const gy = H - 30;
    const gh = gy - 40;
    const rMin = 10;
    const rMax = 100000;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx, gy - gh); ctx.lineTo(gx, gy); ctx.lineTo(gx + gw, gy);
    ctx.stroke();
    label(ctx, 'Vout (V)', gx - 6, gy - gh + 4, C.fg, { align: 'right', size: 10 });
    label(ctx, '负载 RL（对数 Ω）→', gx + gw / 2, gy + 16, C.fg, { align: 'center', size: 10 });
    const RX = (r) => gx + (Math.log(r / rMin) / Math.log(rMax / rMin)) * gw;
    const VY = (v) => gy - (clamp(v, 0, s.Vs) / Math.max(s.Vs, 0.001)) * gh;
    [100, 1000, 10000].forEach((r) => {
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(RX(r), gy - gh); ctx.lineTo(RX(r), gy);
      ctx.stroke();
      label(ctx, r >= 1000 ? r / 1000 + 'k' : String(r), RX(r), gy + 13, C.fg, { align: 'center', size: 9 });
    });
    /* Vth 渐近线 */
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(gx, VY(th.Vth)); ctx.lineTo(gx + gw, VY(th.Vth));
    ctx.stroke();
    ctx.restore();
    label(ctx, 'Vth', gx + 4, VY(th.Vth) - 5, C.accent, { size: 10 });
    /* 曲线：逐点真解 */
    const pts = [];
    for (let i = 0; i <= 44; i += 1) {
      const rl = rMin * (rMax / rMin) ** (i / 44);
      const v = mode === 'real' ? out(netReal(rl)) : out(netEquiv(th.Vth, th.Rth, rl));
      if (v !== null) pts.push([RX(rl), VY(v)]);
    }
    polyline(ctx, pts, mode === 'real' ? C.accent2 : C.accent, 2.2);
    /* 工作点 + 最大功率点 RL = Rth */
    ctx.fillStyle = C.named('amber');
    ctx.beginPath();
    ctx.arc(RX(s.RL), VY(vr), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.named('purple');
    ctx.beginPath();
    ctx.arc(RX(th.Rth), VY(th.Vth / 2), 4, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, 'RL=Rth 最大功率', RX(th.Rth) + 5, VY(th.Vth / 2) - 6, C.named('purple'), { size: 9 });

    const pl = (vr * vr) / s.RL;
    ro.set('Vth', fmt(th.Vth, 3) + ' V　（= Vs·R2/(R1+R2)，空载输出）');
    ro.set('Rth', fmt(th.Rth, 1) + ' Ω　（= R1∥R2，独立源置零后看进去）');
    ro.set('Vout（原）', fmt(vr, 4) + ' V');
    ro.set('Vout（等效）', fmt(ve, 4) + ' V　误差 ' + fmt(Math.abs(vr - ve), 6) + ' V');
    ro.set('负载功率', fmt(pl * 1000, 2) + ' mW　负载效应：RL 越小，输出被拉得越低');
  }

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'Vs', label: '电源电压 Vs', min: 1, max: 24, step: 0.5, value: s.Vs, fmt: 1 },
        { name: 'R1', label: '上拉 R1', min: 100, max: 10000, step: 100, value: s.R1, fmt: 0 },
        { name: 'R2', label: '下拉 R2', min: 100, max: 10000, step: 100, value: s.R2, fmt: 0 },
        { name: 'RL', label: '负载 RL', min: 100, max: 20000, step: 100, value: s.RL, fmt: 0 },
      ],
    },
    (st) => { Object.assign(s, st); draw(); },
  );

  draw();
  cv.redraw = draw;
  engine('circuit').then((m) => { circ = m; draw(); }).catch((e) => {
    fail = '引擎加载失败：' + (e && e.message ? e.message : e);
    draw();
  });
  return { slidersBox: sliders.box, destroy() {} };
}
