/* =========================================================================
 * lab 组件：world-model-rollout —— 世界模型的误差复利（第 49 章 · 90 世界模型与视频生成）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "world-model-rollout",
 *     "title": "脑内推演八步：系数差 0.1，误差滚到 0.5",
 *     "trueB": 0.8, "modelB": 0.9, "steps": 8
 *   }
 *   ```
 *
 * 演示什么：一维玩具世界 s_{t+1} = B·s_t + a_t。真实世界用 TRUE_B，模型学到的是
 * 一份稍偏的账本 MODEL_B。两本账吃**同一串动作** a_t，但各滚各的：
 *
 *     s_model ← MODEL_B·s_model + a_t      （推演：只喂自己的想象）
 *     s_true  ← TRUE_B ·s_true  + a_t      （现实：只按真实规律走）
 *
 * 关键在第 0 步：s_0 = 0 时动作项独占，两本账**首拍必然相同**——误差从 0 起步，
 * 看起来"学得很准"。可接下来模型拿自己的想象当下一拍输入，系数上那 0.1 的偏差
 * 每步都被乘进历史，误差就复利生息：0.00 → 0.07 → 0.22 ……八步滚到 0.5 量级。
 *
 * 「完美教具」五问：
 *   ① 动手量：「真实系数 TRUE_B」「模型系数 MODEL_B」两个滑块 + 「推演步数」。
 *      前者是世界本身，后者是模型的账本，差值就是这一课的唯一起因。
 *   ② 即时后果：拖动 MODEL_B，脑内曲线立刻从真实曲线上叉开，叉口随步数张开；
 *      下方误差柱逐根变高，红色越界的那几根就是"不能再信"的步数。
 *   ③ 读数：末步误差 / 首次越界步 / 误差放大倍数——三个数都能用
 *      |MODEL_B^k − TRUE_B^k| 在纸上复核。
 *   ④ 啊哈预设：「模型偏 0.1」一键回到正文 §4 的现场（0.8 / 0.9）；
 *      「偏 0.01」把 MODEL_B 拧到 0.81，同一个八步误差压到 0.04 以内——
 *      小数点后第二位就是这场军备竞赛的全部。
 *   ⑤ 默认状态：TRUE_B=0.8、MODEL_B=0.9、八步 —— 两条曲线首拍重合、之后分道扬镳，
 *      误差柱一路长高。不点任何按钮也能读出"短推演准、长推演漂"。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, setSliderRow, mergeSpec,
  buildReadout, buildToolbar, mkBtn, label, clamp, fmt, clearBg, polyline,
} from '../core.js';

/* 正文 §5 的那串八步动作脚本，原样搬过来，两本账吃同一串 */
const ACTIONS = [1.0, -1.0, 2.0, 0.5, -2.0, 1.0, 1.0, -1.0];
const TOL = 0.1;               /* 「还能信」的误差门槛 */

const BASE_SLIDERS = [
  { name: 'trueB', label: '真实系数 TRUE_B', min: 0.5, max: 0.95, step: 0.01, value: 0.8 },
  { name: 'modelB', label: '模型系数 MODEL_B', min: 0.5, max: 1.05, step: 0.01, value: 0.9 },
  { name: 'steps', label: '推演步数', min: 3, max: 8, step: 1, value: 8 },
];

export default function render(host, spec) {
  const H = Number.isFinite(spec.height) ? clamp(spec.height, 340, 720) : 460;
  const st = {
    trueB: Number.isFinite(spec.trueB) ? clamp(spec.trueB, 0.5, 0.95) : 0.8,
    modelB: Number.isFinite(spec.modelB) ? clamp(spec.modelB, 0.5, 1.05) : 0.9,
    steps: Number.isFinite(spec.steps) ? clamp(Math.round(spec.steps), 3, ACTIONS.length) : ACTIONS.length,
  };

  /* 两本账同时滚，返回每一步的状态与误差 */
  function rollout(trueB, modelB, n) {
    const sTrue = [0];
    const sModel = [0];
    const errs = [0];
    for (let t = 0; t < n; t += 1) {
      const act = ACTIONS[t];
      const nextModel = modelB * sModel[t] + act;
      const nextTrue = trueB * sTrue[t] + act;
      sModel.push(nextModel);
      sTrue.push(nextTrue);
      errs.push(Math.abs(nextModel - nextTrue));
    }
    return { sTrue, sModel, errs };
  }

  const ro = buildReadout({
    '第一拍误差': '—',
    '末步误差': '—',
    '首次越界': '—',
    '末步 ÷ 第二拍': '—',
  });
  host.appendChild(ro.box);

  const sliders = buildSliders({ sliders: mergeSpec(BASE_SLIDERS, spec) }, (next) => {
    if (next.trueB !== undefined) st.trueB = Math.round(next.trueB * 100) / 100;
    if (next.modelB !== undefined) st.modelB = Math.round(next.modelB * 100) / 100;
    if (next.steps !== undefined) st.steps = Math.round(next.steps);
    draw();
  });

  function preset(patch) {
    Object.assign(st, patch);
    ['trueB', 'modelB', 'steps'].forEach((k, i) => {
      setSliderRow(sliders, i, st[k], k === 'steps' ? undefined : 2, k);
    });
    draw();
  }
  const bText = mkBtn('模型偏 0.1');
  const bTiny = mkBtn('偏 0.01');
  const bTrue = mkBtn('系数全对');
  const bReset = mkBtn('重置');
  host.appendChild(buildToolbar(bText, bTiny, bTrue, bReset));

  const cv = setupCanvas(host, H);

  function draw() {
    const C = themeColors();
    const W = cv.W;
    const Hh = cv.H;
    const ctx = cv.ctx;
    clearBg(ctx, W, Hh, C);

    const n = st.steps;
    const { sTrue, sModel, errs } = rollout(st.trueB, st.modelB, n);

    /* 上半屏：两条状态曲线；下半屏：误差柱 */
    const padL = 52;
    const padR = 20;
    const plotW = Math.max(W - padL - padR, 120);
    const topY = 38;
    const topH = Math.max((Hh - 150) * 0.56, 90);
    const botY = topY + topH + 54;
    const botH = Math.max(Hh - botY - 56, 70);

    let lo = 0;
    let hi = 0;
    for (let k = 0; k <= n; k += 1) {
      lo = Math.min(lo, sTrue[k], sModel[k]);
      hi = Math.max(hi, sTrue[k], sModel[k]);
    }
    const pad = Math.max((hi - lo) * 0.12, 0.4);
    const yLo = lo - pad;
    const yHi = hi + pad;
    const X = (k) => padL + (k / n) * plotW;
    const Y = (v) => topY + topH - ((v - yLo) / Math.max(yHi - yLo, 1e-6)) * topH;

    /* 零线 + 上下边界 */
    polyline(ctx, [[padL, Y(0)], [padL + plotW, Y(0)]], C.axis, 1.2, [3, 3]);
    label(ctx, 's = 0', padL - 6, Y(0) + 4, C.axis, { align: 'right', size: 10 });

    /* 误差超门槛的区段先铺一层淡红，读者一眼看出"再往后就不可信" */
    let crossed = 0;
    for (let k = 0; k <= n; k += 1) {
      if (errs[k] > TOL) { crossed = k; break; }
    }
    if (crossed) {
      ctx.save();
      ctx.globalAlpha = 0.10;
      ctx.fillStyle = C.bad;
      ctx.fillRect(X(crossed), topY, padL + plotW - X(crossed), topH);
      ctx.restore();
      label(ctx, '误差 > ' + TOL + '：不能再信', X(crossed) + 6, topY + 14, C.bad, { size: 11, weight: 700 });
    }

    /* 两条状态曲线（先画真实，再画模型；模型的点更大） */
    const pTrue = [];
    const pModel = [];
    for (let k = 0; k <= n; k += 1) {
      pTrue.push([X(k), Y(sTrue[k])]);
      pModel.push([X(k), Y(sModel[k])]);
    }
    polyline(ctx, pTrue, C.named('blue'), 2.6);
    polyline(ctx, pModel, C.named('orange'), 2.6, [6, 3]);
    for (let k = 0; k <= n; k += 1) {
      ctx.fillStyle = C.named('blue');
      ctx.beginPath();
      ctx.arc(X(k), Y(sTrue[k]), 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.named('orange');
      ctx.beginPath();
      ctx.arc(X(k), Y(sModel[k]), 3.4, 0, Math.PI * 2);
      ctx.fill();
    }

    /* 图例 */
    label(ctx, '—— 真实世界 s_true', padL, topY - 14, C.named('blue'), { size: 11, weight: 600 });
    label(ctx, '- - 模型脑内 ŝ', padL + 130, topY - 14, C.named('orange'), { size: 11, weight: 600 });

    /* 末步两条曲线的落差，用一根双箭头竖线标出来 */
    const dl = X(n);
    polyline(ctx, [[dl, Y(sTrue[n])], [dl, Y(sModel[n])]], C.bad, 2);
    label(ctx, '差 ' + fmt(errs[n], 2), dl - 6, (Y(sTrue[n]) + Y(sModel[n])) / 2, C.bad, { align: 'right', size: 11, weight: 700 });

    /* 下半屏：误差柱 */
    polyline(ctx, [[padL, botY + botH], [padL + plotW, botY + botH]], C.axis, 1.2);
    let maxErr = TOL * 1.4;
    for (let k = 1; k <= n; k += 1) maxErr = Math.max(maxErr, errs[k]);
    const bw = Math.min(28, plotW / (n + 1) - 6);
    for (let k = 1; k <= n; k += 1) {
      const h = (errs[k] / maxErr) * botH;
      const cx = X(k);
      ctx.fillStyle = errs[k] > TOL ? C.bad : C.named('teal');
      ctx.globalAlpha = 0.82;
      ctx.fillRect(cx - bw / 2, botY + botH - h, bw, Math.max(h, 1.2));
      ctx.globalAlpha = 1;
      label(ctx, fmt(errs[k], 2), cx, botY + botH - h - 5, C.fg, { align: 'center', size: 10 });
    }
    /* 门槛线 */
    const yTol = botY + botH - (TOL / maxErr) * botH;
    polyline(ctx, [[padL, yTol], [padL + plotW, yTol]], C.accent2, 1.4, [5, 4]);
    label(ctx, '门槛 ' + TOL, padL + plotW - 4, yTol - 5, C.accent2, { align: 'right', size: 10, weight: 600 });
    label(ctx, '每步误差 |ŝ − s|', padL - 6, botY - 8, C.fg, { align: 'right', size: 11, weight: 600 });
    label(ctx, '步 t', padL + plotW / 2, botY + botH + 20, C.fg, { align: 'center', size: 11 });

    /* 读数：第一拍永远是 0（动作项独占），所以"放大倍数"只能拿第二拍当分母 */
    const base = n >= 2 ? errs[2] : 0;
    const ratio = base > 1e-9 ? errs[n] / base : 0;
    ro.set('第一拍误差', fmt(errs[1], 3));
    ro.set('末步误差', fmt(errs[n], 3));
    ro.set('首次越界', crossed ? '第 ' + crossed + ' 步' : '全程未越界');
    ro.set('末步 ÷ 第二拍', base > 1e-9 ? fmt(ratio, 1) + ' 倍' : '—');
  }

  bText.addEventListener('click', () => preset({ trueB: 0.8, modelB: 0.9 }));
  bTiny.addEventListener('click', () => preset({ trueB: 0.8, modelB: 0.81 }));
  bTrue.addEventListener('click', () => preset({ modelB: st.trueB }));
  bReset.addEventListener('click', () => preset({ trueB: 0.8, modelB: 0.9, steps: 8 }));

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() { cv.redraw = null; } };
}
