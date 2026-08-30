/* 电感：电流的惯性。
   与电容对偶——电容顶住电压，电感顶住电流：v = L·di/dt。
   对偶关系记牢：C 的电压不能突变，L 的电流不能突变。
   第二部分是断电尖峰：把开关一拉，i 必须续流，只能靠杂散电容兜着，
   于是 L 与 C 谐振出一个上百倍于电源的电压尖峰——继电器必须并联续流二极管的原因。 */
import {
  themeColors, setupCanvas, anim, buildSegmented, buildSliders, buildReadout,
  polyline, label, engine, clamp, fmt,
} from '../core.js';

export default function render(host, spec) {
  let C = themeColors();
  const s = { L: spec.L ?? 10, R: spec.R ?? 100, Cs: spec.Cs ?? 2 }; // L: mH，Cs: nF
  const VS = 12;
  let circ = null;
  let phase = 'on';
  let st = null;
  let idx = -1;
  let fail = '';
  let pts = [];

  const cv = setupCanvas(host, 320);
  const seg = buildSegmented(
    [{ label: '闭合开关（建立电流）', value: 'on' }, { label: '断开开关（看尖峰）', value: 'off' }],
    phase,
    (v) => { phase = v; rebuild(); },
  );
  host.appendChild(seg);
  const ro = buildReadout({ 'τ = L/R': '—', '电感电流 i': '—', '电感电压 v = L·di/dt': '—', 储能: '—' });
  host.appendChild(ro.box);

  const henry = () => s.L * 1e-3;

  function rebuild() {
    if (!circ) return;
    pts = [];
    fail = '';
    if (phase === 'on') {
      /* 电源 → R → L → 地：电流按 τ = L/R 爬升到 V/R */
      st = circ.createTransient({
        nodes: ['0', 'in', 'a'],
        elements: [
          { type: 'V', id: 'V1', a: 'in', b: '0', dc: VS },
          { type: 'R', id: 'R1', a: 'in', b: 'a', value: s.R },
          { type: 'L', id: 'L1', a: 'a', b: '0', value: henry() },
        ],
      }, (henry() / s.R) / 300);
      idx = st.nodeIdx.get('a');
      pts.push({ t: 0, v: 0, i: 0 });
    } else {
      /* 断开后：L 与杂散电容 Cs、漏阻 RL 并联自激。先灌入稳态电流再放手 */
      const i0 = VS / s.R;
      st = circ.createTransient({
        nodes: ['0', 'a'],
        elements: [
          { type: 'L', id: 'L1', a: 'a', b: '0', value: henry() },
          { type: 'C', id: 'Cs', a: 'a', b: '0', value: s.Cs * 1e-9 },
          { type: 'R', id: 'Rl', a: 'a', b: '0', value: 1e5 },
        ],
      }, (2 * Math.PI * Math.sqrt(henry() * s.Cs * 1e-9)) / 400);
      st.iInd.set('L1', i0);
      idx = st.nodeIdx.get('a');
      pts.push({ t: 0, v: 0, i: i0 });
    }
  }

  function advance(n) {
    if (!st) return;
    for (let k = 0; k < n; k += 1) {
      const r = circ.step(st, phase === 'on' ? ((el) => (el.dc || 0)) : null);
      if (!r.ok) { fail = r.reason || '求解失败'; st = null; return; }
      pts.push({ t: st.t, v: r.v[idx], i: st.iInd.get('L1') || 0 });
    }
    const win = phase === 'on' ? 6 * (henry() / s.R) : 6 * 2 * Math.PI * Math.sqrt(henry() * s.Cs * 1e-9);
    while (pts.length && pts[0].t < st.t - win) pts.shift();
    if (pts.length > 4000) pts.splice(0, pts.length - 4000);
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
    const tauL = henry() / s.R;
    const iSS = VS / s.R;
    const win = phase === 'on' ? 6 * tauL : 6 * 2 * Math.PI * Math.sqrt(henry() * s.Cs * 1e-9);
    const gx = 52;
    const gw = W - gx - 14;
    const iTop = 30;
    const iH = 118;
    const vTop = 182;
    const vH = 106;
    const dec = Math.max(1, Math.ceil(pts.length / 700));
    const dp = pts.filter((_, k) => k % dec === 0 || k === pts.length - 1);
    const TX = (t) => gx + (clamp((t - (st.t - win)) / win, 0, 1)) * gw;

    /* ---------- 上：电流 ---------- */
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx, iTop); ctx.lineTo(gx, iTop + iH); ctx.lineTo(gx + gw, iTop + iH);
    ctx.stroke();
    const iMax = phase === 'on' ? iSS * 1.1 : iSS * 1.25;
    const IY = (i) => iTop + iH - (clamp(i, -iMax * 0.3, iMax) / iMax) * iH;
    /* 渐近线 V/R */
    if (phase === 'on') {
      ctx.save();
      ctx.strokeStyle = C.grid;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(gx, IY(iSS)); ctx.lineTo(gx + gw, IY(iSS));
      ctx.stroke();
      ctx.restore();
      label(ctx, 'V/R = ' + fmt(iSS * 1000, 1) + ' mA', gx + gw - 4, IY(iSS) - 5, C.fg, { align: 'right', size: 10 });
    }
    polyline(ctx, dp.map((p) => [TX(p.t), IY(p.i)]), C.accent, 2.4);
    label(ctx, 'i_L（电流惯性：连续，不能突变）', gx + 6, iTop - 6, C.accent, { size: 10 });
    label(ctx, 'i (A)', gx - 6, iTop + 8, C.fg, { align: 'right', size: 10 });

    /* ---------- 下：电压 ---------- */
    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(gx, vTop + vH / 2); ctx.lineTo(gx + gw, vTop + vH / 2);
    ctx.stroke();
    const vPk = phase === 'on'
      ? VS * 1.15
      : Math.max(VS, (VS / s.R) * Math.sqrt(henry() / (s.Cs * 1e-9))) * 1.15;
    const VY = (v) => vTop + vH / 2 - (clamp(v, -vPk, vPk) / vPk) * (vH / 2 - 4);
    polyline(ctx, dp.map((p) => [TX(p.t), VY(p.v)]), C.named('red'), 2.2);
    label(ctx, 'v_L = L·di/dt', gx + 6, vTop - 6, C.named('red'), { size: 10 });
    label(ctx, '+' + fmt(vPk, 1) + ' V', gx - 6, vTop + 10, C.fg, { align: 'right', size: 9 });
    label(ctx, '−' + fmt(vPk, 1) + ' V', gx - 6, vTop + vH - 4, C.fg, { align: 'right', size: 9 });
    label(ctx, phase === 'on' ? '横轴 6τ' : '横轴 6 个谐振周期', gx + gw / 2, H - 6, C.fg,
      { align: 'center', size: 10 });

    const cur = pts[pts.length - 1] || { i: 0, v: 0 };
    const w = 0.5 * henry() * cur.i * cur.i;
    ro.set('τ = L/R', fmt(tauL * 1000, 3) + ' ms（L=' + fmt(s.L, 1) + ' mH，R=' + fmt(s.R, 0) + ' Ω）');
    ro.set('电感电流 i', fmt(cur.i * 1000, 2) + ' mA　' + fmt((cur.i / iSS) * 100, 1) + '% 稳态');
    ro.set('电感电压 v = L·di/dt', fmt(cur.v, 2) + ' V　（通电瞬间 v 直接跳到 ' + fmt(VS, 1) + ' V，然后衰减）');
    ro.set('储能', fmt(w * 1e6, 2) + ' µJ = ½Li²　' + (phase === 'off'
      ? '尖峰理论值 i₀·√(L/Cs) = ' + fmt((VS / s.R) * Math.sqrt(henry() / (s.Cs * 1e-9)), 0) + ' V'
      : '对照电容：C 顶电压，L 顶电流'));
  }

  const controls = anim(host, {
    onTick() { advance(phase === 'on' ? 10 : 8); draw(); },
    onReset() { rebuild(); draw(); },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'L', label: '电感 L', min: 0.5, max: 100, step: 0.5, value: s.L, fmt: 1 },
        { name: 'R', label: '串联电阻 R', min: 20, max: 1000, step: 10, value: s.R, fmt: 0 },
        { name: 'Cs', label: '杂散电容 Cs', min: 0.2, max: 20, step: 0.2, value: s.Cs, fmt: 1 },
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
