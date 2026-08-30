/* 一阶响应与时间常数 τ。
   工程上真正要记住的只有三个数：1τ → 63.2%，2τ → 86.5%，3τ → 95.0%，
   5τ 之后 99.3% 就算「稳了」。这张图把数值解（后向欧拉）和解析解叠在一起，
   两条线几乎重合——说明数值积分是可信的，也是后面所有瞬态仿真的信心来源。 */
import {
  themeColors, setupCanvas, anim, buildSegmented, buildSliders, buildReadout,
  polyline, label, engine, clamp, fmt,
} from '../core.js';

const MARKS = [[1, 0.632, '1τ 63.2%'], [2, 0.865, '2τ 86.5%'], [3, 0.950, '3τ 95.0%'], [5, 0.993, '5τ 99.3%']];

export default function render(host, spec) {
  let C = themeColors();
  const s = { R: spec.R ?? 1000, Cu: spec.C ?? 100, V: spec.V ?? 5 };
  let circ = null;
  let mode = 'charge';
  let st = null;
  let idx = -1;
  let fail = '';
  let pts = [];
  const NT = 300; // 每 τ 的步数

  const cv = setupCanvas(host, 320);
  const seg = buildSegmented(
    [{ label: '充电（0 → V）', value: 'charge' }, { label: '放电（V → 0）', value: 'discharge' }],
    mode,
    (v) => { mode = v; rebuild(); },
  );
  host.appendChild(seg);
  const ro = buildReadout({ 'τ = RC': '—', '当前 t': '—', '数值解 v(t)': '—', 解析解: '—' });
  host.appendChild(ro.box);

  const capF = () => s.Cu * 1e-6;
  const tau = () => s.R * capF();
  const srcVal = () => (mode === 'charge' ? s.V : 0);

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
    st = circ.createTransient(net, tau() / NT);
    idx = st.nodeIdx.get('out');
    pts = [];
    fail = '';
    /* 放电要先有电：把电容先充到满，再把源拉到 0 */
    if (mode === 'discharge') {
      for (let k = 0; k < 6 * NT; k += 1) {
        const r = circ.step(st, () => s.V);
        if (!r.ok) { fail = r.reason || '求解失败'; return; }
      }
    }
    /* 种子样本：暂停状态下曲线与读数也不空 */
    pts.push({ t: st.t, v: st.v[idx] });
  }

  function advance(n) {
    if (!st) return;
    for (let k = 0; k < n; k += 1) {
      const r = circ.step(st, srcVal);
      if (!r.ok) { fail = r.reason || '求解失败'; st = null; return; }
      pts.push({ t: st.t, v: r.v[idx] });
    }
    const win = 6 * tau();
    while (pts.length > 2 && pts[0].t < st.t - win) pts.shift();
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
    const gx = 46;
    const gw = W - gx - 96;
    const gy = H - 34;
    const gh = gy - 34;
    const vSpan = Math.max(s.V, 0.001);
    const VY = (v) => gy - (clamp(v, -0.05 * vSpan, vSpan * 1.05) / (vSpan * 1.05)) * gh;
    const TX = (t) => gx + (clamp(t, 0, 6 * T) / (6 * T)) * gw;

    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx, gy - gh); ctx.lineTo(gx, gy); ctx.lineTo(gx + gw, gy);
    ctx.stroke();
    label(ctx, 'v (V)', gx - 6, gy - gh + 4, C.fg, { align: 'right', size: 10 });
    label(ctx, 't（横轴 0 → 6τ）', gx + gw / 2, gy + 16, C.fg, { align: 'center', size: 10 });

    /* 1τ/2τ/3τ/5τ 刻度线与百分比 */
    MARKS.forEach(([n, frac, txt]) => {
      const x = TX(n * T);
      ctx.save();
      ctx.strokeStyle = C.named('purple');
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, gy); ctx.lineTo(x, VY(mode === 'charge' ? frac * s.V : (1 - frac) * s.V));
      ctx.lineTo(gx, VY(mode === 'charge' ? frac * s.V : (1 - frac) * s.V));
      ctx.stroke();
      ctx.restore();
      label(ctx, txt, x + 3, VY(mode === 'charge' ? frac * s.V : (1 - frac) * s.V) - 4,
        C.named('purple'), { size: 9 });
      label(ctx, n + 'τ', x, gy + 14, C.fg, { align: 'center', size: 9 });
    });

    /* 解析解（细虚线） */
    const an = [];
    for (let k = 0; k <= 240; k += 1) {
      const t = (k / 240) * 6 * T;
      an.push([TX(t), VY(circ.rcStepAnalytic(t, s.R, capF(), mode === 'charge' ? s.V : 0)
        + (mode === 'charge' ? 0 : s.V * Math.exp(-t / T)))]);
    }
    polyline(ctx, an, C.named('gray'), 1.4, [5, 4]);
    /* 数值解 */
    if (pts.length > 1) polyline(ctx, pts.map((p) => [TX(p.t), VY(p.v)]), C.accent, 2.4);

    /* 图例 + 当前点 */
    const lx = gx + gw + 12;
    label(ctx, '── 数值解（后向欧拉）', lx, 40, C.accent, { size: 10 });
    label(ctx, '┄ 解析解 V(1−e^{−t/RC})', lx, 56, C.named('gray'), { size: 10 });
    label(ctx, '┈ τ 刻度', lx, 72, C.named('purple'), { size: 10 });
    const cur = pts[pts.length - 1];
    if (cur) {
      ctx.fillStyle = C.named('amber');
      ctx.beginPath();
      ctx.arc(TX(cur.t), VY(cur.v), 5, 0, Math.PI * 2);
      ctx.fill();
    }

    const tNow = st ? st.t - (mode === 'discharge' ? 6 * T : 0) : 0;
    const vNum = cur ? cur.v : 0;
    const vAna = mode === 'charge'
      ? circ.rcStepAnalytic(tNow, s.R, capF(), s.V)
      : s.V * Math.exp(-tNow / T);
    ro.set('τ = RC', fmt(T * 1000, 3) + ' ms（' + fmt(s.R, 0) + ' Ω × ' + fmt(s.Cu, 0) + ' µF）');
    ro.set('当前 t', fmt(tNow * 1000, 3) + ' ms = ' + fmt(tNow / T, 2) + ' τ');
    ro.set('数值解 v(t)', fmt(vNum, 4) + ' V（' + fmt((vNum / Math.max(s.V, 1e-9)) * 100, 1) + '%）');
    ro.set('解析解', fmt(vAna, 4) + ' V　偏差 ' + fmt(Math.abs(vNum - vAna), 5) + ' V'
      + '　（后向欧拉是一阶精度，步数越多偏差越小）');
  }

  const controls = anim(host, {
    onTick() { advance(6); draw(); },
    onReset() { rebuild(); draw(); },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'R', label: '电阻 R', min: 100, max: 10000, step: 100, value: s.R, fmt: 0 },
        { name: 'Cu', label: '电容 C', min: 1, max: 1000, step: 1, value: s.Cu, fmt: 0 },
        { name: 'V', label: '阶跃幅值 V', min: 1, max: 12, step: 0.5, value: s.V, fmt: 1 },
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
