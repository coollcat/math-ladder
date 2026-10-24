/* =========================================================================
 * lab component: nyquist-stability-tour -- a complex-plane curve, does it loop around -1
 * -------------------------------------------------------------------------
 * Usage (chapter 60, Nyquist stability criterion):
 *
 *   { "type": "nyquist-stability-tour", "title": "how large can K get", "K": 20, "a": 1, "b": 2, "c": 3 }
 *
 * Fields (all optional):
 *   K  open-loop gain (0.2..24, default 20)
 *   a  first pole at -a (0.2..4, default 1)
 *   b  second pole at -b (0.5..8, default 2)
 *   c  third pole at -c (1..8, default 3)  -- FIXED third pole, this is what makes K* finite
 *   height canvas height, default 400
 *
 * What it shows:
 *   L(s) = K / ((s+a)(s+b)(s+c)). Three real poles. Sweep omega from -inf to +inf
 *   and draw the full locus: solid = positive frequencies, dashed = mirror image.
 *   The orange diamond is the critical point -1. The readout gives P, N, Z.
 *
 * Why three poles (this is the crux of the lesson):
 *   With only two poles the phase never reaches -180 deg for finite omega, so the
 *   locus can never cross the negative real axis; min Re L = -K/((a+b)(sqrt a+sqrt b)^2)
 *   is attained at a frequency where Im L != 0. In other words a 2-pole minimum-phase
 *   loop is stable for EVERY K > 0 (closed-loop poles have real part -(a+b)/2 always).
 *   A "critical gain" needs three poles so that the phase really reaches -180 deg.
 *
 * Critical gain:
 *   phase(L) = -180 deg  <=>  omega0 = sqrt(ab + bc + ca)
 *   and |L(j*omega0)| = K / ((a+b+c)(ab+bc+ca) - abc), so
 *   K* = (a+b+c)(ab+bc+ca) - abc.  Verified: a=1,b=2,c=3 -> K*=60, L(j*sqrt11) = -1 exactly.
 *
 * Encirclement count:
 *   Computed as a genuine winding number of the digitised closed contour around -1
 *   (sum of unwrapped angle increments), and cross-checked against the Routh table
 *   for the closed-loop cubic. The old implementation used "min Re < -1" as a proxy,
 *   which is NOT an encirclement test and reported false instability.
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, mergeSpec, buildReadout, buildToolbar,
  mkBtn, setSliderRow, setSliderMax, label, clamp, fmt, polyline,
} from '../core.js';

const BASE = [
  /* 初始上限要够得到 K*=60（a=1,b=2,c=3），否则读者一开始就拖不到包围侧；
     每次重绘还会按当前 K* 动态放宽（见 draw 末尾的 setSliderMax）。 */
  { name: 'K', label: '增益 K', min: 0.2, max: 24, step: 0.1, value: 20 },
  { name: 'a', label: '极点 −a 的 a', min: 0.2, max: 4, step: 0.1, value: 1 },
  { name: 'b', label: '极点 −b 的 b', min: 0.5, max: 8, step: 0.1, value: 2 },
  { name: 'c', label: '极点 −c 的 c（固定）', min: 1, max: 8, step: 0.5, value: 3 },
];

export default function render(host, spec) {
  const H = clamp(spec.height || 400, 300, 620);
  const sliders = buildSliders({ sliders: mergeSpec(BASE, spec) }, () => draw());
  const S = () => sliders.state;

  const ro = buildReadout({
    '开环右半极点 P': '0',
    '顺时针包围数 N': '—',
    '闭环右半极点 Z': '—',
    '临界增益 K*': '—',
    '增益裕度': '—',
  });
  host.appendChild(ro.box);

  const bCrit = mkBtn('跳到临界');
  const bHalf = mkBtn('K 减半');
  const bReset = mkBtn('重置');
  host.appendChild(buildToolbar(bCrit, bHalf, bReset));

  const hint = document.createElement('div');
  hint.className = 'ml-lab__hint';
  hint.textContent = '实线是正频率、虚线是负频率镜像。橙色菱形就是 −1：轨迹绕过去了，闭环就长出右半平面极点。三个极点都在左半平面（P=0），所以绕几圈就长几个右半平面闭环极点。';
  host.appendChild(hint);

  const cv = setupCanvas(host, H);

  /* L(jω) = K / ((a + jω)(b + jω)(c + jω)) */
  function Lof(w, K, a, b, c) {
    const r1 = a * b - w * w;
    const i1 = w * (a + b);
    const r2 = r1 * c - i1 * w;
    const i2 = r1 * w + i1 * c;
    const den = r2 * r2 + i2 * i2;
    if (den < 1e-12) return { re: 0, im: 0 };
    return { re: (K * r2) / den, im: (-K * i2) / den };
  }

  /* 相位穿越频率 ω₀ = √(ab+bc+ca)：此处三个极点的相角之和正好 −180°。
     临界增益 K* = (a+b+c)(ab+bc+ca) − abc，此时 |L(jω₀)| = 1 且 L(jω₀) = −1。
     实跑核对：a=1,b=2,c=3 → ω₀=√11=3.3166，K*=60，L(jω₀)=−1.000000。 */
  function omegaCross(a, b, c) {
    return Math.sqrt(a * b + b * c + c * a);
  }
  function criticalK(a, b, c) {
    return (a + b + c) * (a * b + b * c + c * a) - a * b * c;
  }

  /* 真卷绕数：把 ω 从 −∞ 扫到 +∞ 的闭合轨迹离散化，累加绕 −1 的角增量。
     顺时针为正（与读数栏「顺时针包围数 N」一致），且用 Routh 交叉校验。 */
  function encirclements(K, a, b, c) {
    const N = 4000;
    let prev = null;
    let total = 0;
    for (let i = 0; i <= N; i += 1) {
      /* tan 映射把 [−π/2, π/2] 铺成 −∞→∞，低频段不会被挤掉 */
      const t = -Math.PI / 2 + Math.PI * (i / N);
      const w = Math.tan(t);
      if (!isFinite(w)) { prev = null; continue; }
      const p = Lof(w, K, a, b, c);
      const ang = Math.atan2(p.im, p.re + 1); // 相对 −1 的辐角
      if (prev !== null) {
        let d = ang - prev;
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        total += d;
      }
      prev = ang;
    }
    /* total 是逆时针为正的弧度；读数栏要顺时针为正，取负 */
    return Math.round(-total / (2 * Math.PI));
  }

  /* Routh 表给的闭环右半平面极点数，用来交叉校验卷绕数（Z = P + N，P=0）。 */
  function routhZ(K, a, b, c) {
    const A = a + b + c;
    const B = a * b + b * c + c * a;
    const C0 = a * b * c + K;
    const s1 = (A * B - C0) / A;
    const col = [1, A, s1, C0];
    let signChanges = 0;
    for (let i = 1; i < col.length; i += 1) {
      if (col[i] * col[i - 1] < 0) signChanges += 1;
    }
    return signChanges;
  }

  /* 上限留 60% 余量：课文要读者把 K 从 K*=60 拖到 90（1.5 倍）看 N 翻成 2，
     1.4 倍只能到 84、够不着，读者会以为「拖不过去」是缺陷。 */
  function kMaxOf(a, b, c) {
    return Math.max(24, Math.ceil(criticalK(a, b, c) * 1.6));
  }

  function draw() {
    const K = S().K;
    const a = S().a;
    const b = S().b;
    const c = S().c;
    const ctx = cv.ctx;
    const W = cv.W;
    const C = themeColors();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    const Ks = criticalK(a, b, c);
    const N = encirclements(K, a, b, c);
    const P = 0;
    const Z = P + N;

    /* 视野：把原点和 −1 都框进来，再按 K 外扩留边 */
    const reach = Math.max(2.2, Math.abs(Lof(Math.sqrt(a * b) * 0.4, K, a, b, c).re) * 1.15);
    const xmin = -Math.max(reach, 1.6);
    const xmax = Math.max(reach * 0.9, 0.6);
    const ymax = Math.max(reach * 0.7, 0.8);
    const padL = 34;
    const padT = 22;
    const padB = 26;
    const padR = 12;
    const X = (v) => padL + ((v - xmin) / (xmax - xmin)) * (W - padL - padR);
    const Y = (v) => padT + (1 - (v + ymax) / (2 * ymax)) * (H - padT - padB);

    /* 网格与坐标轴 */
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    for (let s = Math.ceil(xmin); s <= xmax; s += 1) {
      ctx.beginPath(); ctx.moveTo(X(s), padT); ctx.lineTo(X(s), H - padB); ctx.stroke();
    }
    for (let s = Math.ceil(-ymax); s <= ymax; s += 1) {
      ctx.beginPath(); ctx.moveTo(padL, Y(s)); ctx.lineTo(W - padR, Y(s)); ctx.stroke();
    }
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(padL, Y(0)); ctx.lineTo(W - padR, Y(0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X(0), padT); ctx.lineTo(X(0), H - padB); ctx.stroke();

    /* 轨迹：正频实线、负频虚线 */
    const pos = [];
    const neg = [];
    const NW = 420;
    for (let i = 0; i <= NW; i += 1) {
      const th = (Math.PI / 2) * (i / NW);
      const w = Math.tan(th);
      if (!isFinite(w) || w > 1e4) continue;
      const p = Lof(w, K, a, b, c);
      pos.push([X(p.re), Y(p.im)]);
      neg.push([X(p.re), Y(-p.im)]);
    }
    polyline(ctx, pos, C.named('blue'), 2.2);
    polyline(ctx, neg, C.named('blue'), 1.4, [5, 4]);

    /* 临界点 −1 */
    const cx = X(-1);
    const cy = Y(0);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = C.named('orange');
    ctx.fillRect(-5.5, -5.5, 11, 11);
    ctx.strokeStyle = C.bg;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-5.5, -5.5, 11, 11);
    ctx.restore();
    label(ctx, '−1', cx + 10, cy - 8, C.named('orange'), { size: 12, weight: 700 });

    /* 原点 */
    label(ctx, 'O', X(0) + 4, Y(0) - 6, C.axis, { size: 11 });

    /* 图注 */
    label(ctx, 'L(jω) = K / ((s+a)(s+b)(s+c))，ω: −∞ → +∞', padL, padT - 6, C.fg, { size: 12, weight: 600 });
    const marginal = Math.abs(K - Ks) <= Ks * 0.002;
    const verdict = Z > 0
      ? '闭环不稳定（Z=' + Z + '）'
      : (marginal ? '临界：闭环极点在虚轴上' : '闭环稳定（Z=0）');
    label(ctx, verdict, W - padR, H - 8, Z > 0 ? C.named('red') : C.named('green'), { size: 12.5, weight: 700, align: 'right' });
    label(ctx, '实心＝正频率　虚线＝负频率镜像', padL, H - 8, C.axis, { size: 10.5 });

    ro.set('开环右半极点 P', String(P));
    ro.set('顺时针包围数 N', String(N));
    ro.set('闭环右半极点 Z', String(Z) + (Z === routhZ(K, a, b, c) ? '（卷绕数 ✓ Routh 一致）' : '（⚠ 与 Routh 不一致）'));
    ro.set('临界增益 K*', fmt(Ks, 2));
    setSliderMax(sliders, 0, kMaxOf(a, b, c));
    ro.set('增益裕度', marginal
      ? '1.00×（正踩在 K* 上）'
      : (Ks > K ? fmt(Ks / K, 2) + '×（还能再乘这么多）' : '已越过（' + fmt(K / Ks, 2) + '× 临界）'));
  }

  bCrit.addEventListener('click', () => {
    const Ks = criticalK(S().a, S().b, S().c);
    setSliderRow(sliders, 0, clamp(Math.round(Ks * 10) / 10, 0.2, kMaxOf(S().a, S().b, S().c)), undefined, 'K');
    draw();
  });
  bHalf.addEventListener('click', () => {
    setSliderRow(sliders, 0, clamp(Math.round(S().K * 5) / 10, 0.2, 24), undefined, 'K');
    draw();
  });
  bReset.addEventListener('click', () => {
    setSliderRow(sliders, 0, 20, undefined, 'K');
    setSliderRow(sliders, 1, 1, undefined, 'a');
    setSliderRow(sliders, 2, 2, undefined, 'b');
    setSliderRow(sliders, 3, 3, undefined, 'c');
    draw();
  });

  draw();
  cv.redraw = draw;

  return {
    slidersBox: sliders.box,
    destroy() {
      cv.redraw = null;
    },
  };
}
