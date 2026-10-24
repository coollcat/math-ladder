/* =========================================================================
 * lab 组件：auction-bid-cliff —— 二价拍卖的报价悬崖（第 51 章 · 40 拍卖机制设计）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "auction-bid-cliff",
 *     "title": "拖你的报价，看那条悬崖：赢不赢只差一格，赚多少与你无关",
 *     "v": 80, "bid": 80, "m": 60
 *   }
 *   ```
 *
 * 演示什么：单件**二价（次价密封）**拍卖。出价最高者赢，但成交价是**第二名的报价 m**，
 * 不是你自己的报价 b。于是净利只有两种可能，构成一条分段常值函数：
 *
 *     b > m ：赢，净利 = v − m   ← 与 b 无关！
 *     b ≤ m ：输，净利 = 0
 *
 * 画布把这条函数画成"平台 + 一道跳变"：平台上把报价从 m+1 一路抬到天上，进账
 * 一分不涨（这就是"诚实是占优策略"的全部几何）；而把 m 拖过 v，平台整体掉到零线
 * 以下——**悬崖底下就是亏损区**，那一刻你的报价再高也只是把同一笔亏损重复一遍。
 *
 * 「完美教具」五问：
 *   ① 动手量：三个滑块「你的估值 v」「你的报价 b」「对手最高价 m」。b 是你的策略，
 *      m 是别人的行为，v 是这场拍卖的客观事实——三者正是公式里的全部自由参数。
 *   ② 即时后果：拖动 b，只有那根竖线在动，平台高度纹丝不动；拖动 m，平台断点
 *      左右移、高度上下移；拖动 v，平台高度跟着变。
 *   ③ 读数：报价 / 对手最高价 / 成交价 / 净利 / 判决——成交价那格永远显示 min(b,m)
 *      以下的口径（赢时等于 m，输时记「未成交」），与正文公式逐项对得上。
 *   ④ 啊哈预设：按钮「对手变强 m = v+5」一键把 m 顶到 v 之上，平台翻到负区；
 *      「虚高 20 元」把 b 推到 v+20，让你亲眼看见那一格什么都没换来。
 *   ⑤ 默认状态：v=80、b=80、m=60 —— 如实报价成交赚 20，且平台从 61 一直铺到 120
 *      全是 20。什么都不点就能读出"抬价没有回报"。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, setSliderRow, mergeSpec,
  buildReadout, buildToolbar, mkBtn, label, clamp, fmt, clearBg, polyline,
} from '../core.js';

const XMAX = 120;               /* 报价轴上限（元） */

const BASE_SLIDERS = [
  { name: 'v', label: '你的估值 v', min: 20, max: 100, step: 5, value: 80 },
  { name: 'bid', label: '你的报价 b', min: 0, max: XMAX, step: 1, value: 80 },
  { name: 'm', label: '对手最高价 m', min: 0, max: XMAX, step: 1, value: 60 },
];

export default function render(host, spec) {
  const H = Number.isFinite(spec.height) ? clamp(spec.height, 320, 700) : 400;
  const st = {
    v: Number.isFinite(spec.v) ? clamp(spec.v, 20, 100) : 80,
    bid: Number.isFinite(spec.bid) ? clamp(spec.bid, 0, XMAX) : 80,
    m: Number.isFinite(spec.m) ? clamp(spec.m, 0, XMAX) : 60,
  };

  /* 净利：b 严格大于 m 才赢（与正文 python 的 if b > m 同口径） */
  function profitOf(b, m, v) {
    return b > m ? v - m : 0;
  }

  const ro = buildReadout({
    '你的报价': '—',
    '对手最高价': '—',
    '成交价': '—',
    '净利': '—',
    '判决': '—',
  });
  host.appendChild(ro.box);

  const sliders = buildSliders({ sliders: mergeSpec(BASE_SLIDERS, spec) }, (next) => {
    if (next.v !== undefined) st.v = Math.round(next.v);
    if (next.bid !== undefined) st.bid = Math.round(next.bid);
    if (next.m !== undefined) st.m = Math.round(next.m);
    draw();
  });

  /* 预设：一键到达反例与临界点 */
  function preset(patch) {
    Object.assign(st, patch);
    const order = ['v', 'bid', 'm'];
    order.forEach((k, i) => setSliderRow(sliders, i, st[k], undefined, k));
    draw();
  }
  const bHonest = mkBtn('如实报价 b = v');
  const bOver = mkBtn('虚高 20 元');
  const bStrong = mkBtn('换一天：m = v+5');
  const bDoom = mkBtn('虚高撞上强对手');
  const bReset = mkBtn('重置');
  host.appendChild(buildToolbar(bHonest, bOver, bStrong, bDoom, bReset));

  const cv = setupCanvas(host, H);
  const geo = { x: 58, y: 42, w: 0, h: 0 };

  function draw() {
    const C = themeColors();
    const W = cv.W;
    const Hh = cv.H;
    const ctx = cv.ctx;
    clearBg(ctx, W, Hh, C);

    geo.w = W - 92;
    geo.h = Hh - 108;

    const plat = st.v - st.m;                      /* 平台高度（赢时的净利） */
    const lo = Math.min(0, plat) - 12;
    const hi = Math.max(0, plat) + 12;
    const span = Math.max(hi - lo, 1);
    const X = (b) => geo.x + (clamp(b, 0, XMAX) / XMAX) * geo.w;
    const Y = (val) => geo.y + geo.h - ((val - lo) / span) * geo.h;

    /* 零线（不赔不赚） */
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.4;
    polyline(ctx, [[geo.x, Y(0)], [geo.x + geo.w, Y(0)]], C.axis, 1.4);
    label(ctx, '净利 0', geo.x - 8, Y(0) + 4, C.axis, { align: 'right', size: 11 });

    /* 左侧纵轴刻度：平台高度与零 */
    ctx.strokeStyle = C.axis;
    polyline(ctx, [[geo.x, geo.y], [geo.x, geo.y + geo.h]], C.axis, 1.4);
    label(ctx, '净利（元）', geo.x - 4, geo.y - 12, C.fg, { size: 12, weight: 600 });
    label(ctx, fmt(plat, 0), geo.x - 8, Y(plat) + 4, plat >= 0 ? C.ok : C.bad, { align: 'right', size: 11, weight: 700 });

    /* 亏损区（平台在零线以下时整片染红，读者一眼知道悬崖底在哪） */
    if (plat < 0) {
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = C.bad;
      ctx.fillRect(X(st.m), Y(0), geo.x + geo.w - X(st.m), Y(plat) - Y(0));
      ctx.restore();
      label(ctx, '亏损区', X(st.m) + 8, Y(0) + 16, C.bad, { size: 12, weight: 700 });
    }

    /* 利润曲线：b ≤ m 平台在 0，b > m 平台在 v−m，断点处一条虚线连起来 */
    const right = geo.x + geo.w;
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = plat >= 0 ? C.ok : C.bad;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(X(st.m), Y(0));
    ctx.lineTo(X(st.m), Y(plat));
    ctx.stroke();
    ctx.restore();
    polyline(ctx, [[geo.x, Y(0)], [X(st.m), Y(0)]], C.axis, 3.4);
    polyline(ctx, [[X(st.m), Y(plat)], [right, Y(plat)]], plat >= 0 ? C.ok : C.bad, 3.4);

    /* 断点标注：m 的位置就是那条悬崖边 */
    label(ctx, 'm = ' + fmt(st.m, 0), X(st.m), geo.y + geo.h + 18, C.accent2, { align: 'center', size: 12, weight: 700 });
    ctx.save();
    ctx.globalAlpha = 0.5;
    polyline(ctx, [[X(st.m), geo.y + geo.h], [X(st.m), geo.y + geo.h + 6]], C.accent2, 1.6);
    ctx.restore();

    /* 当前报价竖线 + 落点 */
    const pNow = profitOf(st.bid, st.m, st.v);
    const winNow = st.bid > st.m;
    polyline(ctx, [[X(st.bid), geo.y + 4], [X(st.bid), geo.y + geo.h]], C.accent, 1.6, [3, 3]);
    ctx.fillStyle = C.accent;
    ctx.beginPath();
    ctx.arc(X(st.bid), Y(pNow), 5.5, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, 'b = ' + fmt(st.bid, 0), X(st.bid), geo.y - 6, C.accent, { align: 'center', size: 12, weight: 700 });

    /* 平台高度的一句人话 */
    const tip = plat >= 0
      ? '赢了赚 ' + fmt(plat, 0) + ' 元 —— 从 m+1 抬到 ' + XMAX + ' 都是这个数'
      : '赢了亏 ' + fmt(-plat, 0) + ' 元 —— m 已越过 v，报价再高也翻不了身';
    label(ctx, tip, geo.x, geo.y + geo.h + 40, plat >= 0 ? C.ok : C.bad, { size: 12 });

    /* x 轴标题 */
    label(ctx, '你的报价 b（元）', geo.x + geo.w / 2, geo.y + geo.h + 64, C.fg, { align: 'center', size: 12 });

    const deal = winNow ? fmt(st.m, 0) + ' 元（对手的最高价）' : '未成交';
    ro.set('你的报价', fmt(st.bid, 0) + ' 元');
    ro.set('对手最高价', fmt(st.m, 0) + ' 元');
    ro.set('成交价', deal);
    ro.set('净利', (pNow >= 0 ? '+' : '') + fmt(pNow, 0) + ' 元');
    ro.set('判决', winNow ? (pNow >= 0 ? '赢，赚 ' + fmt(pNow, 0) : '赢，净亏 ' + fmt(-pNow, 0)) : '出局，分文不动');
  }

  bHonest.addEventListener('click', () => preset({ bid: st.v }));
  bOver.addEventListener('click', () => preset({ bid: Math.min(st.v + 20, XMAX) }));
  bStrong.addEventListener('click', () => preset({ m: Math.min(st.v + 5, XMAX) }));
  /* 啊哈预设：正文 §4 第 3 步那天的完整现场——虚高到 v+20，对手却顶到 v+5，
     于是"赢"了却以 v−m = −5 接盘。利润只由 v 与 m 决定，b 再高也改不动它。 */
  bDoom.addEventListener('click', () => preset({ bid: Math.min(st.v + 20, XMAX), m: Math.min(st.v + 5, XMAX) }));
  bReset.addEventListener('click', () => preset({ v: 80, bid: 80, m: 60 }));

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() { cv.redraw = null; } };
}
