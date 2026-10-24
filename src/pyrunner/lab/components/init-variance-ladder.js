/* =========================================================================
 * lab 组件：init-variance-ladder —— 深度电梯里的方差传声筒（第 46 章 · 45 初始化与对称死锁）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "init-variance-ladder",
 *     "title": "二十层电梯：每层乘一次 n·Var(w)，看信号肥成什么样或瘦成什么样",
 *     "n": 64, "ratio": 1.0, "depth": 20
 *   }
 *   ```
 *
 * 演示什么：一个线性层把 n 路独立信号加起来，输出的方差是
 *
 *     Var(a) = n · Var(w) · Var(x)      ⇒  Var(x_L) = (n·Var(w))^L · Var(x_0)
 *
 * 于是「每层乘一次 n·Var(w)」这一个数，就决定了深度的命运。本组件把这条
 * 几何级数画成一条**对数纵轴**的折线：横轴是层号 0…depth，纵轴是信号标准差
 * （对数刻度，1 那条虚线是"不肥不瘦"的守恒线）。
 *
 * 三种命运在同一个画面里分辨得清清楚楚：
 *   · n·Var(w) = 1（Xavier 1/n）      → 折线贴住 1，全程平稳；
 *   · n·Var(w) < 1（偏小 0.5/n）      → 折线一路下坠，20 层后气若游丝；
 *   · n·Var(w) > 1（2/n / 爆炸档）    → 折线一路爬升，20 层后顶破天花板。
 *
 * 「完美教具」五问：
 *   ① 动手量：「输入路数 n」「Var(w) 系数 c（即 Var(w) = c/n）」「层数 depth」。
 *      c 是这一课唯一的自由参数（配方就是给 c 取 1 还是 2），n 与 depth 是场景。
 *   ② 即时后果：拖动 c 越过 1 那条临界线，折线当场由下坠翻成爬升；拖动 depth，
 *      折线按同一斜率延长；拖动 n 在 c 固定的情况下**折线不动**——这正是
 *      "配方要写成 1/n，不能写成常数"的现场证明。
 *   ③ 读数：每层倍率 n·Var(w)、末层标准差、末层是否越出 [0.1, 10] 的健康带。
 *      末层标准差可与 (c)^depth 逐位对账。
 *   ④ 啊哈预设：「忘开根号」一键把正文 §4 那道笔误摆上台（标准差取了方差的值，
 *      等价 c ≈ 1/15）——二十层后末层方差掉到 1e-24 量级，折线直接贴地。
 *   ⑤ 默认状态：n=64、c=1、20 层 —— 折线水平贴住 1，什么都不点就是"Xavier 恰好
 *      守恒"这一条要点；拖动 n 折线不动（倍率只由 c 定），这是"配方必须写成 c/n
 *      才免疫路数"的现场证据。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, setSliderRow, mergeSpec,
  buildReadout, buildToolbar, mkBtn, label, clamp, fmt, clearBg, polyline,
} from '../core.js';

const BASE_SLIDERS = [
  { name: 'n', label: '输入路数 n', min: 8, max: 256, step: 8, value: 64 },
  { name: 'c', label: 'Var(w) 系数 c', min: 0.05, max: 3, step: 0.05, value: 1 },
  { name: 'depth', label: '层数 depth', min: 4, max: 40, step: 1, value: 20 },
];

export default function render(host, spec) {
  const H = Number.isFinite(spec.height) ? clamp(spec.height, 320, 700) : 420;
  const st = {
    n: Number.isFinite(spec.n) ? clamp(Math.round(spec.n), 8, 256) : 64,
    c: Number.isFinite(spec.ratio) ? clamp(spec.ratio, 0.05, 3) : 1,
    depth: Number.isFinite(spec.depth) ? clamp(Math.round(spec.depth), 4, 40) : 20,
  };

  const ro = buildReadout({
    '每层倍率 n·Var(w)': '—',
    '单个权重 σ_w': '—',
    '末层标准差': '—',
    '末层方差': '—',
    '诊断': '—',
  });
  host.appendChild(ro.box);

  const sliders = buildSliders({ sliders: mergeSpec(BASE_SLIDERS, spec) }, (next) => {
    if (next.n !== undefined) st.n = Math.round(next.n);
    if (next.c !== undefined) st.c = Math.round(next.c * 100) / 100;
    if (next.depth !== undefined) st.depth = Math.round(next.depth);
    draw();
  });

  function preset(patch) {
    Object.assign(st, patch);
    ['n', 'c', 'depth'].forEach((k, i) => {
      setSliderRow(sliders, i, st[k], k === 'c' ? 2 : undefined, k);
    });
    draw();
  }
  const bXavier = mkBtn('Xavier  c = 1');
  const bHalf = mkBtn('偏小  c = 0.5');
  const bHe = mkBtn('He  c = 2');
  const bForgot = mkBtn('忘开根号 c = 1/15');
  const bReset = mkBtn('重置');
  host.appendChild(buildToolbar(bXavier, bHalf, bHe, bForgot, bReset));

  const cv = setupCanvas(host, H);

  function draw() {
    const C = themeColors();
    const W = cv.W;
    const Hh = cv.H;
    const ctx = cv.ctx;
    clearBg(ctx, W, Hh, C);

    const per = st.c;                       /* 每层倍率 = n·Var(w) = n·(c/n) = c */
    const L = st.depth;

    /* 对数纵轴：固定量程 1e-30 … 1e+18，跨度 48 个数量级 —— 一次看全三种命运 */
    const LO = -30;
    const HI = 18;
    const padL = 62;
    const padR = 22;
    const padT = 44;
    const plotW = Math.max(W - padL - padR, 120);
    const plotH = Math.max(Hh - padT - 78, 110);
    const X = (k) => padL + (k / Math.max(L, 1)) * plotW;
    const Y = (lv) => padT + plotH - ((clamp(lv, LO, HI) - LO) / (HI - LO)) * plotH;

    /* 数量级网格（每 6 个数量级一条） */
    for (let lv = LO; lv <= HI; lv += 6) {
      polyline(ctx, [[padL, Y(lv)], [padL + plotW, Y(lv)]], C.grid, 1);
      label(ctx, '1e' + lv, padL - 8, Y(lv) + 4, C.axis, { align: 'right', size: 10 });
    }

    /* 守恒线 = 1（标准差不动）：这是"Xavier 恰好"的坐标 */
    polyline(ctx, [[padL, Y(0)], [padL + plotW, Y(0)]], C.accent2, 1.6, [6, 4]);
    label(ctx, '标准差 = 1：不肥不瘦', padL + plotW - 4, Y(0) - 6, C.accent2, { align: 'right', size: 11, weight: 700 });

    /* 健康带 [0.1, 10]：淡绿底色，出带即视为病态 */
    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = C.ok;
    ctx.fillRect(padL, Y(1), plotW, Y(-1) - Y(1));
    ctx.restore();

    /* 折线：每层标准差 = (n·Var(w))^(k/2) */
    const pts = [];
    for (let k = 0; k <= L; k += 1) {
      const lv = (k * Math.log10(per)) / 2;   /* log10 标准差 = (k/2)·log10(倍率) */
      pts.push([X(k), Y(lv)]);
    }
    const lastLv = (L * Math.log10(per)) / 2;
    const col = Math.abs(lastLv) <= 1 ? C.ok : (lastLv > 1 ? C.bad : C.named('purple'));
    polyline(ctx, pts, col, 2.8);
    for (let k = 0; k <= L; k += Math.max(1, Math.round(L / 20))) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(pts[k][0], pts[k][1], 2.6, 0, Math.PI * 2);
      ctx.fill();
    }

    /* 临界线 c = 1 的提示：倍率贴着 1 时折线水平 */
    label(ctx, '每层倍率 = ' + fmt(per, 2), padL, padT - 22, C.fg, { size: 12, weight: 600 });
    label(ctx, per > 1 ? '倍率 > 1：逐层放大（会爆）' : per < 1 ? '倍率 < 1：逐层衰减（会消失）' : '倍率 = 1：逐层守恒（Xavier）',
      padL, padT - 6, col, { size: 11, weight: 700 });

    /* 轴标题 */
    label(ctx, '层号 L', padL + plotW / 2, padT + plotH + 26, C.fg, { align: 'center', size: 11 });
    label(ctx, '信号标准差（对数刻度）· 拖动输入路数 n 时折线不动：配方的是 c/n，不是常数',
      padL + 4, padT + plotH + 46, C.axis, { size: 10 });

    /* 读数：末层标准差 = (c)^(L/2)；方差 = c^L。
       注意「每层倍率」只由 c 决定——n 怎么拖它都不动，这正是配方必须写成
       c/n 而不能写成常数的原因；n 真正影响的是单个权重的 σ_w = √(c/n)。 */
    const sd = Math.pow(st.c, L / 2);
    const va = Math.pow(st.c, L);
    ro.set('每层倍率 n·Var(w)', fmt(per, 2));
    ro.set('单个权重 σ_w', fmt(Math.sqrt(st.c / st.n), 4));
    ro.set('末层标准差', fmt(sd, 4));
    ro.set('末层方差', fmt(va, 4));
    ro.set('诊断', Math.abs(lastLv) <= 1
      ? '健康（在 10 倍以内）'
      : (lastLv > 1 ? '爆炸（信号越传越大）' : '消失（信号越传越小）'));
  }

  bXavier.addEventListener('click', () => preset({ c: 1 }));
  bHalf.addEventListener('click', () => preset({ c: 0.5 }));
  bHe.addEventListener('click', () => preset({ c: 2 }));
  bForgot.addEventListener('click', () => preset({ c: 0.0667 }));
  bReset.addEventListener('click', () => preset({ n: 64, c: 1, depth: 20 }));

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() { cv.redraw = null; } };
}
