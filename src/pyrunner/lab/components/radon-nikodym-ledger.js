/* =========================================================================
 * lab 组件：radon-nikodym-ledger —— 密度就是权重之比，奇异那一截单独立账
 *                    （第 25 章 · 45 课《Radon-Nikodym 定理：密度的出生证》）
 * -------------------------------------------------------------------------
 * 演示什么：RN 导数不是玄学，它是"两个测度在同一块点上的权重比"。
 *   三个点，各自给 ν 权重与 μ 权重，则 f(x) = μ(x)/ν(x) 就是密度；
 *   恒等式 μ(A) = ∫_A f dν 在 A 上逐点成立，误差为零。
 *   唯一的例外是 ν(x) = 0 而 μ(x) > 0 的点：那里 ν 认定"不可能发生"，
 *   μ 却真的发了货 —— 密度写不出来，字典里这叫"不绝对连续"。
 *   把这撮点单独立账，就是 Lebesgue 分解 μ = μ_ac + μ_sing：
 *   差值恒等于奇异部分，一个子都不差。
 *
 * 用法（课文 lab 围栏）：
 *   { "type": "radon-nikodym-ledger",
 *     "title": "三点账本：f = μ/ν，差值就是奇异部分",
 *     "nu": [1, 1, 1],
 *     "mu": [2, 0, 5],
 *     "probe": [true, false, true] }
 *
 * 字段（都可省）：
 *   nu     三个点的 ν 权重，数组长度 3，每项 0..5，默认 [1,1,1]
 *   mu     三个点的 μ 权重，同上，默认 [2,0,5]
 *   probe  被测集合 A 含哪些点，布尔数组长度 3，默认 [true,true,true]
 *   height 画布高度，默认 380
 *
 * 交互（完美教具五问）：
 *   1. 动手量：六个滑块 = 三个点的 ν 权重与 μ 权重，正是课文例 1 里
 *      "计数测度 1,1,1 对 2,0,5"那张表的每一项。
 *   2. 即时后果：柱子高度、f 的数值、读数四行同时重算；把某个 ν 拖到 0
 *      而 μ 还非零，那一栏立刻转红并标注"密度不存在"。
 *   3. 读数：μ(A) / ∫_A f dν / 差值（= 奇异部分）/ 状态，与正文例 1 的
 *      逐点核对表、例 3 的 δ₀ ≪̸ λ 判定一一对得上。
 *   4. 啊哈预设：「点质量撞零测集」一键把 ν 在第 1 点拖到 0：μ(A) 不变，
 *      积分掉了 2，差值恰好 2 —— 密度不存在时账并不会平，缺口就是奇异部分。
 *   5. 默认状态：ν=(1,1,1)、μ=(2,0,5)、A=全部，f=(2,0,5)，μ(A)=7=∫_A f dν，
 *      差值 0 —— 这正是例 1，读者什么都不点也能看到恒等式成立。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, setSliderRow, buildToolbar,
  buildReadout, mkBtn, label, clearBg, clamp, fmt,
} from '../core.js';

const PTS = 3;

/* 每个场景 = 一份 (ν, μ) 权重表。三个场景分别对应课文例 1、例 3、例 4。 */
const SCENES = {
  ex1: { nu: [1, 1, 1], mu: [2, 0, 5], probe: [true, true, true] },
  singular: { nu: [0, 1, 1], mu: [2, 0, 5], probe: [true, true, true] },
  mixed: { nu: [0, 2, 2], mu: [3, 4, 6], probe: [true, true, true] },
};

export default function render(host, spec) {
  const pickArr = (arr, def) => Array.from({ length: PTS }, (_, i) => {
    const v = Array.isArray(arr) ? Number(arr[i]) : NaN;
    return clamp(Number.isFinite(v) ? Math.round(v) : def[i], 0, 5);
  });

  const st = {
    nu: pickArr(spec.nu, SCENES.ex1.nu),
    mu: pickArr(spec.mu, SCENES.ex1.mu),
    probe: Array.from({ length: PTS }, (_, i) => (
      Array.isArray(spec.probe) && typeof spec.probe[i] === 'boolean'
        ? spec.probe[i] : SCENES.ex1.probe[i]
    )),
  };

  const cv = setupCanvas(host, clamp(spec.height || 380, 320, 640));
  const ro = buildReadout({
    'μ(A)': '—', '∫_A f dν': '—', 差值: '—', 状态: '—',
  });
  host.appendChild(ro.box);

  const bEx1 = mkBtn('例 1：ν 全是 1');
  const bSing = mkBtn('点质量撞零测集');
  const bMix = mkBtn('一半 ac 一半奇异');
  host.appendChild(buildToolbar(bEx1, bSing, bMix));

  const sl = buildSliders({
    sliders: [
      { name: 'n0', label: 'ν(1)', min: 0, max: 5, step: 1, value: st.nu[0] },
      { name: 'n1', label: 'ν(2)', min: 0, max: 5, step: 1, value: st.nu[1] },
      { name: 'n2', label: 'ν(3)', min: 0, max: 5, step: 1, value: st.nu[2] },
      { name: 'm0', label: 'μ(1)', min: 0, max: 9, step: 1, value: st.mu[0] },
      { name: 'm1', label: 'μ(2)', min: 0, max: 9, step: 1, value: st.mu[1] },
      { name: 'm2', label: 'μ(3)', min: 0, max: 9, step: 1, value: st.mu[2] },
    ],
  }, (s) => {
    st.nu = [s.n0, s.n1, s.n2];
    st.mu = [s.m0, s.m1, s.m2];
    draw();
  });
  host.appendChild(sl.box);

  /* 密度：ν 为 0 的点返回 null（不存在），调用方据此画红叉。 */
  function dens(i) {
    if (st.nu[i] === 0) return null;
    return st.mu[i] / st.nu[i];
  }

  /* 一栏红不红：ν 说"不可能"而 μ 真的发了货 */
  function singular(i) {
    return st.nu[i] === 0 && st.mu[i] > 0;
  }

  /* 账本：把 A 上的 μ 质量与 ∫_A f dν 分别累出来，差值就是奇异部分。 */
  function ledger() {
    let muA = 0;
    let intA = 0;
    let singA = 0;
    for (let i = 0; i < PTS; i += 1) {
      if (!st.probe[i]) continue;
      muA += st.mu[i];
      const f = dens(i);
      if (f === null) singA += st.mu[i];
      else intA += f * st.nu[i];
    }
    return { muA, intA, singA };
  }

  function geom(W) {
    const padX = 24;
    const colW = (W - padX * 2) / PTS;
    const base = 250;                              /* 基线，底部留给 f 与 A 标记 */
    const top = 62;
    return { padX, colW, base, top };
  }

  function draw() {
    const C = themeColors();
    const W = cv.W;
    const H = cv.H;
    if (W < 40) return;
    clearBg(cv.ctx, W, H, C);
    const ctx = cv.ctx;
    const g = geom(W);

    const maxV = Math.max(1, ...st.nu, ...st.mu);
    const hOf = (v) => (g.base - g.top) * (v / maxV);

    label(ctx, '每点两根柱：ν 权重（蓝）与 μ 权重（橙）；数字是该点的 f = μ/ν', 12, 22,
      C.fg, { size: 12, weight: 600 });
    label(ctx, '点一下柱子所在的那一栏，把它加进 / 移出被测集合 A', 12, 40,
      C.fg, { size: 11 });

    /* 基线 */
    ctx.save();
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(g.padX - 6, g.base + 0.5);
    ctx.lineTo(W - g.padX + 6, g.base + 0.5);
    ctx.stroke();
    ctx.restore();

    for (let i = 0; i < PTS; i += 1) {
      const cx = g.padX + g.colW * (i + 0.5);
      const bad = singular(i);
      const inA = st.probe[i];

      /* A 的底纹：跨整栏从顶到底淡淡一层，读者一眼看到 A 含哪几点 */
      if (inA) {
        ctx.save();
        ctx.fillStyle = C.accent2;
        ctx.globalAlpha = 0.10;
        ctx.fillRect(g.padX + g.colW * i + 3, g.top - 12, g.colW - 6, g.base - g.top + 40);
        ctx.restore();
      }

      /* 两根柱：ν 在左、μ 在右 */
      const bw = Math.min(30, g.colW * 0.26);
      const gap = 8;
      const xn = cx - bw - gap / 2;
      const xm = cx + gap / 2;

      const hN = hOf(st.nu[i]);
      ctx.save();
      ctx.fillStyle = C.accent;
      ctx.globalAlpha = 0.75;
      ctx.fillRect(xn, g.base - hN, bw, hN);
      ctx.restore();
      label(ctx, String(st.nu[i]), xn + bw / 2, g.base - hN - 6, C.fg,
        { size: 11, align: 'center' });

      const hM = hOf(st.mu[i]);
      ctx.save();
      ctx.fillStyle = bad ? C.bad : C.accent2;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(xm, g.base - hM, bw, hM);
      ctx.restore();
      label(ctx, String(st.mu[i]), xm + bw / 2, g.base - hM - 6, C.fg,
        { size: 11, align: 'center' });

      /* 点的名字 */
      label(ctx, 'x=' + (i + 1), cx, g.base + 18, C.fg, { size: 12, weight: 600, align: 'center' });

      /* f 的数值：ν=0 时写"不存在"，这就是例 3 的结论现场 */
      const f = dens(i);
      if (f === null) {
        label(ctx, 'ν=0 →', cx, g.base + 38, C.bad, { size: 11, align: 'center' });
        label(ctx, bad ? 'f 不存在' : 'f 无定义', cx, g.base + 54, C.bad,
          { size: 11, weight: 600, align: 'center' });
      } else {
        label(ctx, 'f = ' + fmt(f, 2), cx, g.base + 38, C.fg, { size: 12, align: 'center' });
        label(ctx, 'f·ν = ' + fmt(f * st.nu[i], 2), cx, g.base + 54, C.fg,
          { size: 11, align: 'center' });
      }

      /* A 的标记 */
      label(ctx, inA ? 'A 含此点' : 'A 不含', cx, g.base + 74,
        inA ? C.accent2 : C.fg, { size: 10, align: 'center' });
    }

    /* 右侧一条恒等式横幅：把读数写成公式，读者不必自己拼 */
    const L = ledger();
    const okStr = L.singA === 0
      ? 'μ(A) = ∫_A f dν  ✓'
      : 'μ(A) ≠ ∫_A f dν，缺口 = 奇异部分';
    label(ctx, okStr, 12, H - 12, L.singA === 0 ? C.ok : C.bad,
      { size: 12, weight: 600 });

    ro.set('μ(A)', fmt(L.muA, 2));
    ro.set('∫_A f dν', fmt(L.intA, 2));
    ro.set('差值', fmt(L.muA - L.intA, 2) + (L.singA ? '（= 奇异部分）' : ''));
    ro.set('状态', L.singA > 0
      ? 'μ ≪ ν 不成立：有 ν 零测集承载了 μ 的质量'
      : (st.probe.some((v) => v) ? 'μ ≪ ν 成立，密度 f = μ/ν 逐点可算' : 'A 是空集：两边都是 0'));
  }

  function pick(x, y) {
    const g = geom(cv.W);
    if (y < g.top - 12 || y > g.base + 84) return null;
    const i = Math.floor((x - g.padX) / g.colW);
    if (i < 0 || i >= PTS) return null;
    return 'col' + i;
  }

  bindPointer(cv.canvas, {
    pick,
    down(id) {
      const i = Number(id.slice(3));
      st.probe[i] = !st.probe[i];
      draw();
    },
  });

  function load(scene) {
    st.nu = scene.nu.slice();
    st.mu = scene.mu.slice();
    st.probe = scene.probe.slice();
    setSliderRow(sl, 0, st.nu[0], 0, 'n0');
    setSliderRow(sl, 1, st.nu[1], 0, 'n1');
    setSliderRow(sl, 2, st.nu[2], 0, 'n2');
    setSliderRow(sl, 3, st.mu[0], 0, 'm0');
    setSliderRow(sl, 4, st.mu[1], 0, 'm1');
    setSliderRow(sl, 5, st.mu[2], 0, 'm2');
    draw();
  }

  bEx1.addEventListener('click', () => { load(SCENES.ex1); });
  bSing.addEventListener('click', () => { load(SCENES.singular); });
  bMix.addEventListener('click', () => { load(SCENES.mixed); });

  cv.redraw = draw;
  draw();

  return {
    destroy() {
      cv.redraw = null;
    },
  };
}
