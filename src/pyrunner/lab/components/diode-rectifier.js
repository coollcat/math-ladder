/* 二极管与整流。
   左图是二极管的性格：Shockley 指数曲线 i = Is(e^{v/nVt} − 1)，
   0.6 V 以下几乎不通，越过去电流指数级暴涨——这就是「0.7 V 压降」说法的来源。
   右图是它最经典的用途：半波整流 + 电容滤波。电容在峰值时被充到 Vp，
   然后在两个峰值之间独自给负载供电，于是电压缓慢下滑——这段下滑量就是纹波。 */
import {
  themeColors, setupCanvas, buildSliders, buildReadout, polyline, label, engine, clamp, fmt,
} from '../core.js';

export default function render(host, spec) {
  let C = themeColors();
  const s = { Cu: spec.C ?? 470, R: spec.R ?? 1000, Vp: spec.Vp ?? 12, f: spec.f ?? 50 };
  let circ = null;
  let fail = '';
  let res = null;
  let dirty = true; // 瞬态只在参数变动时重算，主题重绘不必重跑

  const cv = setupCanvas(host, 320);
  const ro = buildReadout({ '纹波峰峰值': '—', '输出直流 Vdc': '—', '二极管峰值电流': '—', '导通角': '—' });
  host.appendChild(ro.box);

  const farad = () => s.Cu * 1e-6;
  const DT = 1e-5;

  function compute() {
    if (!circ) return;
    const net = circ.netRectifier(s.R, farad(), s.Vp, s.f);
    const r = circ.transient(net, {
      dt: DT,
      tEnd: 0.1,
      sourceFn: (el, t) => (el.id === 'V1' ? s.Vp * Math.sin(2 * Math.PI * s.f * t) : (el.dc || 0)),
      probe: (v, idx) => [v[idx.get('out')], v[idx.get('in')]],
    });
    if (!r.ok) { fail = r.reason || '求解失败'; res = null; return; }
    fail = '';
    const per = Math.round(1 / (s.f * DT));
    const tail = r.samples.slice(-2 * per);
    const vo = tail.map((x) => x.value[0]);
    const vmax = Math.max(...vo);
    const vmin = Math.min(...vo);
    const vdc = vo.reduce((a, b) => a + b, 0) / vo.length;
    /* 二极管电流 = 电容电流 + 负载电流 */
    let iPk = 0;
    let onCount = 0;
    for (let k = 1; k < tail.length; k += 1) {
      const dv = (tail[k].value[0] - tail[k - 1].value[0]) / DT;
      const id = farad() * dv + tail[k].value[0] / s.R;
      if (id > iPk) iPk = id;
      if (id > 1e-6) onCount += 1;
    }
    res = {
      tail, vo, vmax, vmin, vdc, iPk,
      ripple: vmax - vmin,
      duty: onCount / (tail.length - 1),
      t0: tail[0].t,
    };
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
    if (dirty) { compute(); dirty = false; }
    if (!res) { label(ctx, '求解失败：' + fail, W / 2, H / 2, C.bad, { align: 'center', size: 12 }); return; }

    /* ---------- 左：二极管 I-V ---------- */
    const lw = Math.min(230, W * 0.42);
    const lx = 42;
    const ly = H - 36;
    const lh = ly - 40;
    const vLo = -0.2;
    const vHi = 1.0;
    const iMax = Math.max(res.iPk * 1.15, 1e-4);
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lx, ly - lh); ctx.lineTo(lx, ly); ctx.lineTo(lx + lw, ly);
    ctx.stroke();
    label(ctx, 'i (mA)', lx - 6, ly - lh + 4, C.fg, { align: 'right', size: 10 });
    label(ctx, 'v (V)', lx + lw, ly + 14, C.fg, { align: 'right', size: 10 });
    const IVX = (v) => lx + ((clamp(v, vLo, vHi) - vLo) / (vHi - vLo)) * lw;
    const IVY = (i) => ly - (clamp(i, 0, iMax) / iMax) * lh;
    const curve = [];
    for (let k = 0; k <= 220; k += 1) {
      const v = vLo + (k / 220) * (vHi - vLo);
      curve.push([IVX(v), IVY(circ.diodeCurrent(v))]);
    }
    polyline(ctx, curve, C.accent, 2.4);
    /* 0.7 V 拐点 */
    ctx.save();
    ctx.strokeStyle = C.named('purple');
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(IVX(0.7), ly); ctx.lineTo(IVX(0.7), ly - lh);
    ctx.stroke();
    ctx.restore();
    label(ctx, '≈0.7 V 膝点', IVX(0.7) + 4, ly - lh + 12, C.named('purple'), { size: 10 });
    ctx.fillStyle = C.named('amber');
    ctx.beginPath();
    ctx.arc(IVX(0.7), IVY(circ.diodeCurrent(0.7)), 4.5, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, 'Shockley i = Is(e^{v/nVt}−1)', lx, 28, C.accent, { size: 10, weight: 600 });
    label(ctx, fmt(iMax * 1000, 1) + ' mA', lx - 6, ly - lh + 18, C.fg, { align: 'right', size: 9 });

    /* ---------- 右：整流波形 ---------- */
    const gx = lx + lw + 44;
    const gw = W - gx - 14;
    const gy = H - 36;
    const gh = gy - 40;
    const tSpan = 2 / s.f;
    const TX = (t) => gx + ((t - res.t0) / tSpan) * gw;
    const vTop = Math.max(s.Vp, res.vmax) * 1.1;
    const VY = (v) => gy - (clamp(v, -vTop * 0.25, vTop) / vTop) * gh;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx, gy - gh); ctx.lineTo(gx, gy); ctx.lineTo(gx + gw, gy);
    ctx.stroke();
    label(ctx, 'v (V)', gx - 6, gy - gh + 4, C.fg, { align: 'right', size: 10 });
    label(ctx, '两个工频周期', gx + gw / 2, gy + 16, C.fg, { align: 'center', size: 10 });
    /* 输入正弦 */
    const sin = [];
    const dec = Math.max(1, Math.ceil(res.tail.length / 700));
    for (let i = 0; i <= 240; i += 1) {
      const t = res.t0 + (i / 240) * tSpan;
      sin.push([TX(t), VY(s.Vp * Math.sin(2 * Math.PI * s.f * t))]);
    }
    polyline(ctx, sin, C.named('gray'), 1.3, [4, 3]);
    /* 输出 */
    polyline(ctx, res.tail.filter((_, k) => k % dec === 0).map((x) => [TX(x.t), VY(x.value[0])]),
      C.named('green'), 2.4);
    label(ctx, '输入交流（虚线）', gx + 4, 28, C.named('gray'), { size: 10 });
    label(ctx, '整流输出（实线）', gx + gw - 4, 28, C.named('green'), { align: 'right', size: 10 });
    /* 纹波标尺 */
    const midX = gx + gw * 0.82;
    ctx.strokeStyle = C.named('amber');
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(midX, VY(res.vmax)); ctx.lineTo(midX, VY(res.vmin));
    ctx.moveTo(midX - 5, VY(res.vmax)); ctx.lineTo(midX + 5, VY(res.vmax));
    ctx.moveTo(midX - 5, VY(res.vmin)); ctx.lineTo(midX + 5, VY(res.vmin));
    ctx.stroke();
    label(ctx, '纹波 ' + fmt(res.ripple, 3) + ' V', midX + 8, (VY(res.vmax) + VY(res.vmin)) / 2,
      C.named('amber'), { size: 10 });

    const approx = s.Vp / (s.f * s.R * farad());
    ro.set('纹波峰峰值', fmt(res.ripple, 3) + ' V　纹波率 ' + fmt((res.ripple / Math.max(res.vdc, 1e-9)) * 100, 2)
      + '%　（估算 Vr ≈ Vp/(f·R·C) = ' + fmt(approx, 3) + ' V）');
    ro.set('输出直流 Vdc', fmt(res.vdc, 3) + ' V　峰值 ' + fmt(res.vmax, 3) + ' V，谷值 ' + fmt(res.vmin, 3) + ' V');
    ro.set('二极管峰值电流', fmt(res.iPk * 1000, 2) + ' mA　（比平均负载电流大得多：导通角很窄）');
    ro.set('导通角', fmt(res.duty * 360, 1) + '°　C 越大 → 充电时间常数越小 → 峰值电流越大');
  }

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'Cu', label: '滤波电容 C', min: 10, max: 2200, step: 10, value: s.Cu, fmt: 0 },
        { name: 'R', label: '负载电阻 R', min: 100, max: 10000, step: 100, value: s.R, fmt: 0 },
        { name: 'Vp', label: '交流峰值 Vp', min: 2, max: 24, step: 0.5, value: s.Vp, fmt: 1 },
        { name: 'f', label: '频率 f', min: 50, max: 400, step: 10, value: s.f, fmt: 0 },
      ],
    },
    (stt) => { Object.assign(s, stt); dirty = true; draw(); },
  );

  draw();
  cv.redraw = draw;
  engine('circuit').then((m) => { circ = m; draw(); }).catch((e) => {
    fail = '引擎加载失败：' + (e && e.message ? e.message : e);
    draw();
  });
  return { slidersBox: sliders.box, destroy() {} };
}
