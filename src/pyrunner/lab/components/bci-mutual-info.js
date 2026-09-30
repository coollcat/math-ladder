/* 神经编码能传多少比特：两个等概率刺激、一个泊松神经元。
   互信息 I(S;R) = H(R) − H(R|S) 随观察窗 T 长起来，但封顶在 1 bit——
   封顶值是刺激自身的熵，不是神经元的本事不够。
   左图可拖：拖标记直接改观察窗。 */
import {
  themeColors, setupCanvas, buildSliders, buildReadout,
  polyline, label, clamp, fmt,
  pois,
  pointerXY,
  clearBg,
} from '../core.js';

/* 两个等概率刺激的互信息（对计数求和，截到 KMAX 项） */
function mutualInfo(l1, l2, kmax) {
  const K = kmax || Math.max(12, Math.ceil(Math.max(l1, l2) + 6 * Math.sqrt(Math.max(l1, l2)) + 4));
  let mi = 0;
  for (let k = 0; k <= K; k += 1) {
    const p1 = pois(k, l1);
    const p2 = pois(k, l2);
    const pm = 0.5 * p1 + 0.5 * p2;
    if (p1 > 0 && pm > 0) mi += 0.5 * p1 * Math.log2(p1 / pm);
    if (p2 > 0 && pm > 0) mi += 0.5 * p2 * Math.log2(p2 / pm);
  }
  return Math.max(mi, 0);
}

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    rA: spec.rA ?? 4,     // sp/s 刺激 A 下的发放率
    rB: spec.rB ?? 1,     // sp/s 刺激 B
    T: spec.T ?? 1.0,     // s 观察窗
    N: spec.N ?? 1,       // 独立神经元个数
  };
  const cv = setupCanvas(host, 380);
  const ro = buildReadout({
    '互信息 I(S;R)': '—', 'H(R) 响应熵': '—', 'H(R|S) 噪声熵': '—', 上限: '—', 每个脉冲: '—',
  });
  host.appendChild(ro.box);

  const lams = () => [s.rA * s.T * s.N, s.rB * s.T * s.N];

  const sl = buildSliders(
    {
      sliders: [
        { name: 'T', label: '观察窗 T (s)', min: 0.05, max: 4, step: 0.05, value: s.T, fmt: 2 },
        { name: 'rA', label: '刺激 A 的发放率 (sp/s)', min: 0.5, max: 30, step: 0.5, value: s.rA, fmt: 1 },
        { name: 'rB', label: '刺激 B 的发放率 (sp/s)', min: 0.5, max: 30, step: 0.5, value: s.rB, fmt: 1 },
        { name: 'N', label: '独立神经元个数 N', min: 1, max: 20, step: 1, value: s.N, fmt: 0 },
      ],
    },
    (v) => { s.T = v.T; s.rA = v.rA; s.rB = v.rB; s.N = Math.round(v.N); draw(); },
  );
  const ranges = sl.box.querySelectorAll('input[type="range"]');

  function entropies() {
    const [l1, l2] = lams();
    const K = Math.max(12, Math.ceil(Math.max(l1, l2) + 6 * Math.sqrt(Math.max(l1, l2)) + 4));
    let hR = 0;
    let hRs = 0;
    for (let k = 0; k <= K; k += 1) {
      const p1 = pois(k, l1);
      const p2 = pois(k, l2);
      const pm = 0.5 * p1 + 0.5 * p2;
      if (pm > 0) hR -= pm * Math.log2(pm);
      if (p1 > 0) hRs -= 0.5 * p1 * Math.log2(p1);
      if (p2 > 0) hRs -= 0.5 * p2 * Math.log2(p2);
    }
    return { hR, hRs, mi: Math.max(hR - hRs, 0), l1, l2, K };
  }

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    const lx = 46;
    const lw = Math.max(W * 0.5 - lx - 10, 120);
    const rxp = lx + lw + 26;
    const rw = W - rxp - 12;

    /* ===== 左上：I(T) 曲线 ===== */
    const TMAX = Math.max(2, Math.ceil(s.T * 1.15));
    const ay0 = 30;
    const ay1 = 186;
    ctx.strokeStyle = C.axis;
    ctx.strokeRect(lx + 0.5, ay0 + 0.5, lw, ay1 - ay0);
    const TX = (t) => lx + (t / TMAX) * lw;
    const TY = (v) => ay1 - clamp(v, 0, 1) * (ay1 - ay0 - 6);
    /* 1 bit 天花板 */
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = C.named('red');
    ctx.beginPath();
    ctx.moveTo(lx, TY(1));
    ctx.lineTo(lx + lw, TY(1));
    ctx.stroke();
    ctx.restore();
    label(ctx, '1 bit 天花板 = 刺激的熵 H(S)', lx + 6, TY(1) - 5, C.named('red'), { size: 10 });

    const curve = [];
    for (let i = 0; i <= 120; i += 1) {
      const t = (i / 120) * TMAX;
      curve.push([TX(t), TY(mutualInfo(s.rA * t * s.N, s.rB * t * s.N))]);
    }
    polyline(ctx, curve, C.accent, 2.2);
    /* 当前点 */
    const cur = mutualInfo(...lams());
    ctx.fillStyle = C.bad;
    ctx.beginPath();
    ctx.arc(TX(s.T), TY(cur), 5.5, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, 'I(T) 随观察窗：起初近似线性，随后压向 1 bit', lx, ay0 - 10, C.fg,
      { size: 11, weight: 600 });
    label(ctx, '0', lx - 5, ay1 + 4, C.fg, { size: 9, align: 'right' });
    label(ctx, fmt(TMAX, 1) + ' s', lx + lw, ay1 + 14, C.fg, { size: 9, align: 'right' });
    label(ctx, '1 bit', lx - 5, TY(1) + 4, C.fg, { size: 9, align: 'right' });

    /* ===== 左下：I(N) 曲线 ===== */
    const by0 = 224;
    const by1 = H - 34;
    ctx.strokeStyle = C.axis;
    ctx.strokeRect(lx + 0.5, by0 + 0.5, lw, by1 - by0);
    const NMAX = 20;
    const NX = (n) => lx + (n / NMAX) * lw;
    const NY = (v) => by1 - clamp(v, 0, 1) * (by1 - by0 - 6);
    const curveN = [];
    for (let i = 0; i <= 60; i += 1) {
      const n = 1 + (i / 60) * (NMAX - 1);
      curveN.push([NX(n), NY(mutualInfo(s.rA * s.T * n, s.rB * s.T * n))]);
    }
    polyline(ctx, curveN, C.named('teal'), 2.2);
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = C.named('red');
    ctx.beginPath();
    ctx.moveTo(lx, NY(1));
    ctx.lineTo(lx + lw, NY(1));
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = C.bad;
    ctx.beginPath();
    ctx.arc(NX(Math.min(s.N, NMAX)), NY(mutualInfo(s.rA * s.T * Math.min(s.N, NMAX), s.rB * s.T * Math.min(s.N, NMAX))),
      5, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, '加神经元（N 条独立通道）——信息也往 1 bit 挤', lx, by0 - 10, C.fg,
      { size: 11, weight: 600 });
    label(ctx, 'N=1', lx, by1 + 14, C.fg, { size: 9 });
    label(ctx, 'N=' + NMAX, lx + lw, by1 + 14, C.fg, { size: 9, align: 'right' });

    /* ===== 右：计数分布的重叠 ===== */
    if (rw > 70) {
      const py0 = 30;
      const py1 = H - 34;
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(rxp + 0.5, py0 + 0.5, rw, py1 - py0);
      const [l1, l2] = lams();
      const K = Math.max(8, Math.min(60, Math.ceil(Math.max(l1, l2) + 5 * Math.sqrt(Math.max(l1, l2)) + 3)));
      const p1 = [];
      const p2 = [];
      for (let k = 0; k <= K; k += 1) { p1.push(pois(k, l1)); p2.push(pois(k, l2)); }
      const pmax = Math.max(...p1, ...p2, 1e-6);
      const bw = rw / (K + 1);
      const YY = (v) => py1 - (v / pmax) * (py1 - py0 - 16);
      for (let k = 0; k <= K; k += 1) {
        ctx.fillStyle = C.accent;
        ctx.globalAlpha = 0.55;
        ctx.fillRect(rxp + k * bw + 1, YY(p1[k]), Math.max(1, bw - 2), py1 - YY(p1[k]));
        ctx.fillStyle = C.accent2;
        ctx.fillRect(rxp + k * bw + 1, YY(p2[k]), Math.max(1, bw - 2), py1 - YY(p2[k]));
      }
      ctx.globalAlpha = 1;
      /* 边缘分布轮廓 */
      polyline(ctx, p1.map((v, k) => [rxp + (k + 0.5) * bw, YY(0.5 * (v + p2[k]))]), C.fg, 1.4, [4, 3]);
      label(ctx, 'P(k|A) 蓝 / P(k|B) 橙 / 虚线 = 边缘 P(k)', rxp, py0 - 10, C.fg,
        { size: 11, weight: 600 });
      label(ctx, '0', rxp, py1 + 14, C.fg, { size: 9 });
      label(ctx, '脉冲数 k = ' + K, rxp + rw, py1 + 14, C.fg, { size: 9, align: 'right' });
      const overlap = p1.reduce((a, v, k) => a + Math.min(v, p2[k]), 0);
      label(ctx, '两分布重叠 ' + fmt(overlap * 100, 1) + '%', rxp + 6, py0 + 14, C.fg,
        { size: 10, weight: 600 });
    }

    /* ---------- 读数 ---------- */
    const e = entropies();
    ro.set('互信息 I(S;R)', fmt(e.mi, 4) + ' bit（λA = ' + fmt(e.l1, 2) + '，λB = ' + fmt(e.l2, 2) + '）');
    ro.set('H(R) 响应熵', fmt(e.hR, 4) + ' bit');
    ro.set('H(R|S) 噪声熵', fmt(e.hRs, 4) + ' bit');
    ro.set('上限', '1 bit（两个等概率刺激）· 已达 ' + fmt(e.mi * 100, 1) + '%');
    ro.set('每个脉冲', e.l1 + e.l2 > 0 ? fmt(e.mi / Math.max((e.l1 + e.l2) / 2, 1e-9), 4) + ' bit/脉冲'
      : '—');
  }

  /* ---------- 拖动：在上图里直接改 T ---------- */
  let dragging = false;
  function setT(px) {
    const lx = 46;
    const lw = Math.max(cv.W * 0.5 - lx - 10, 120);
    const TMAX = Math.max(2, Math.ceil(s.T * 1.15));
    s.T = clamp(((px - lx) / lw) * TMAX, 0.05, 4);
    if (ranges[0]) {
      ranges[0].value = String(s.T);
      const v = ranges[0].parentNode.querySelector('.ml-slider__val');
      if (v) v.textContent = fmt(s.T, 2);
    }
    draw();
  }
  function onDown(ev) {
    const p = pointerXY(cv.canvas, ev);
    if (p.y < 200) { dragging = true; setT(p.x); }
  }
  function onMove(ev) { if (dragging) setT(pointerXY(cv.canvas, ev).x); }
  function onUp() { dragging = false; }
  cv.canvas.style.cursor = 'ew-resize';
  cv.canvas.addEventListener('pointerdown', onDown);
  cv.canvas.addEventListener('pointermove', onMove);
  cv.canvas.addEventListener('pointerup', onUp);
  cv.canvas.addEventListener('pointercancel', onUp);

  draw();
  cv.redraw = draw;
  return {
    slidersBox: sl.box,
    destroy() {
      cv.canvas.removeEventListener('pointerdown', onDown);
      cv.canvas.removeEventListener('pointermove', onMove);
      cv.canvas.removeEventListener('pointerup', onUp);
      cv.canvas.removeEventListener('pointercancel', onUp);
    },
  };
}
