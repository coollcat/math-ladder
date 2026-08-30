/* 电容：电压的惯性。
   i = C·dv/dt 是电容的定义式，也是全章最反直觉的一条：
   电容顶住的是电压——电压不能突变，否则需要无穷大电流。
   方波驱动下，v 是连续的圆滑指数曲线，i 却在换相瞬间跳变。 */
import {
  themeColors, setupCanvas, anim, buildSliders, buildReadout, polyline, label, engine, clamp, fmt,
} from '../core.js';

export default function render(host, spec) {
  let C = themeColors();
  const s = { R: spec.R ?? 1000, Cu: spec.C ?? 100, V: spec.V ?? 5 }; // Cu 单位 µF
  let circ = null;
  let st = null;
  let fail = '';
  let idx = -1;
  let sim = [];   // {t, v, i}
  const NSTEP = 300;

  const cv = setupCanvas(host, 320);
  const ro = buildReadout({ 'τ = RC': '—', '电压 v_C': '—', '电流 i = C·dv/dt': '—', '电荷与储能': '—' });
  host.appendChild(ro.box);

  const capF = () => s.Cu * 1e-6;
  const tau = () => s.R * capF();

  function rebuild() {
    if (!circ) return;
    const net = {
      nodes: ['0', 'in', 'out'],
      elements: [
        { type: 'R', id: 'R1', a: 'in', b: 'out', value: s.R },
        { type: 'C', id: 'C1', a: 'out', b: '0', value: capF() },
        { type: 'V', id: 'V1', a: 'in', b: '0', dc: s.V },
      ],
    };
    st = circ.createTransient(net, tau() / NSTEP);
    idx = st.nodeIdx.get('out');
    sim = [{ t: 0, v: st.v[idx], i: 0 }]; // 种子样本：暂停时读数也不空
    fail = '';
  }

  function advance(n) {
    if (!st) return;
    for (let k = 0; k < n; k += 1) {
      const prev = sim.length ? sim[sim.length - 1].v : 0;
      const r = circ.step(st, (el, t) => ((t % (8 * tau())) < 4 * tau() ? s.V : 0));
      if (!r.ok) { fail = r.reason || '求解失败'; st = null; return; }
      const v = r.v[idx];
      sim.push({ t: st.t, v, i: capF() * (v - prev) / (tau() / NSTEP) });
    }
    const cut = st.t - 8.2 * tau();
    while (sim.length && sim[0].t < cut) sim.shift();
  }

  function draw() {
    C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    if (!circ || !st) {
      label(ctx, fail ? '求解失败：' + fail : '正在载入 circuit 引擎…', W / 2, H / 2,
        fail ? C.bad : C.fg, { align: 'center', size: 12 });
      return;
    }
    const T = tau();
    const vTop = 34;
    const vH = 130;
    const iTop = 200;
    const iH = 84;
    const gx = 44;
    const gw = W - gx - 14;

    /* ---------- 上：v_C 与驱动方波 ---------- */
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx, vTop); ctx.lineTo(gx, vTop + vH); ctx.lineTo(gx + gw, vTop + vH);
    ctx.stroke();
    const TX = (t) => gx + ((t - (st.t - 8 * T)) / (8 * T)) * gw;
    const VY = (v) => vTop + vH - (clamp(v, -0.5, s.V + 0.5) / (s.V + 0.5)) * vH;
    /* 驱动方波（虚线） */
    const sp = [];
    for (let k = 0; k <= 320; k += 1) {
      const t = (st.t - 8 * T) + (k / 320) * 8 * T;
      sp.push([TX(t), VY((t % (8 * T)) < 4 * T ? s.V : 0)]);
    }
    polyline(ctx, sp, C.named('gray'), 1.2, [4, 3]);
    label(ctx, '方波驱动（虚线）', gx + 6, vTop - 6, C.named('gray'), { size: 10 });
    /* v_C */
    const dec = Math.max(1, Math.ceil(sim.length / 700));
    const decim = sim.filter((_, k) => k % dec === 0 || k === sim.length - 1);
    polyline(ctx, decim.map((p) => [TX(p.t), VY(p.v)]), C.named('green'), 2.4);
    label(ctx, 'v_C（电压惯性：连续、爬升）', gx + gw - 4, vTop - 6, C.named('green'), { align: 'right', size: 10 });
    /* 换相时刻：v 连续但 i 跳变 */
    const lastSw = Math.floor(st.t / (4 * T)) * 4 * T;
    if (lastSw > st.t - 8 * T && lastSw < st.t) {
      const sx = TX(lastSw);
      ctx.save();
      ctx.strokeStyle = C.named('amber');
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(sx, vTop); ctx.lineTo(sx, vTop + vH + iH + 26);
      ctx.stroke();
      ctx.restore();
      label(ctx, '换相：v 连续，i 可跳变', sx + 5, vTop + 14, C.named('amber'), { size: 10 });
    }

    /* ---------- 下：i = C·dv/dt ---------- */
    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(gx, iTop + iH / 2); ctx.lineTo(gx + gw, iTop + iH / 2);
    ctx.stroke();
    const iPk = Math.max(s.V / s.R, 1e-9);
    const IY = (i) => iTop + iH / 2 - (clamp(i, -iPk, iPk) / iPk) * (iH / 2 - 4);
    polyline(ctx, decim.map((p) => [TX(p.t), IY(p.i)]), C.accent2, 2.2);
    label(ctx, 'i = C·dv/dt', gx + gw - 4, iTop - 6, C.accent2, { align: 'right', size: 10 });
    label(ctx, '+' + fmt(iPk * 1000, 1) + ' mA', gx - 4, iTop + 10, C.fg, { align: 'right', size: 9 });
    label(ctx, '−' + fmt(iPk * 1000, 1) + ' mA', gx - 4, iTop + iH - 4, C.fg, { align: 'right', size: 9 });
    label(ctx, '横轴 8τ（= ' + fmt(8 * T * 1000, 1) + ' ms）', gx + gw / 2, H - 6, C.fg, { align: 'center', size: 10 });

    const cur = sim[sim.length - 1] || { v: 0, i: 0 };
    ro.set('τ = RC', fmt(T * 1000, 2) + ' ms　（' + fmt(s.R, 0) + ' Ω × ' + fmt(s.Cu, 0) + ' µF）');
    ro.set('电压 v_C', fmt(cur.v, 3) + ' V　→ ' + fmt((cur.v / s.V) * 100, 1) + '% 满幅（不能突变）');
    ro.set('电流 i = C·dv/dt', fmt(cur.i * 1000, 3) + ' mA　（换相瞬间 ±' + fmt((s.V / s.R) * 1000, 1) + ' mA）');
    ro.set('电荷与储能', 'Q = C·v = ' + fmt(capF() * cur.v * 1e6, 2) + ' µC　W = ½Cv² = '
      + fmt(0.5 * capF() * cur.v * cur.v * 1e6, 2) + ' µJ');
  }

  const controls = anim(host, {
    onTick() {
      advance(8);
      draw();
    },
    onReset() { rebuild(); draw(); },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'R', label: '电阻 R', min: 100, max: 10000, step: 100, value: s.R, fmt: 0 },
        { name: 'Cu', label: '电容 C', min: 10, max: 1000, step: 10, value: s.Cu, fmt: 0 },
        { name: 'V', label: '方波幅值 V', min: 1, max: 12, step: 0.5, value: s.V, fmt: 1 },
      ],
    },
    (stt) => { Object.assign(s, stt); rebuild(); draw(); },
  );

  draw();
  cv.redraw = draw;
  engine('circuit').then((m) => { circ = m; rebuild(); draw(); }).catch((e) => {
    fail = '引擎加载失败：' + (e && e.message ? e.message : e);
    draw();
  });
  /* 自动起播：本组件的结论全在时间演化里，静态图看不出来。
     尊重「减少动效」偏好，那边由 anim 自己把播放键禁用。 */
  if (!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    controls.toggle(true);
  }
  return { slidersBox: sliders.box, destroy() { controls.stop(); } };
}
