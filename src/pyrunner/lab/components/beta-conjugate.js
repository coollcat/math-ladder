/* =========================================================================
 * lab 组件：beta-conjugate —— Beta 先验 + 二项数据：后验收缩到哪儿
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   { "type": "beta-conjugate", "title": "先验与数据拔河：后验落在谁旁边", "s": 4, "m": 0.5, "k": 5, "n": 1 }
 *   ```
 *
 * 字段（都有默认值，只写 type + title 也能渲染）：
 *   s  先验强度 a + b，默认 4（先验越硬，越拉得动后验）
 *   m  先验均值 a / (a+b)，默认 0.5
 *   k  观察到的成功数，默认 5
 *   n  观察到的失败数，默认 1
 *   seq  true 时把数据按一条一条喂（画出每步后验的淡淡轨迹），默认 true
 *
 * 「完美教具」五问：
 *   1. 动手量：四个滑块就是贝叶斯更新的全部输入——先验有多硬（s）、
 *      先验押在哪（m）、数据说了什么（k、n）。
 *   2. 即时后果：先验（灰）／似然（橙）／后验（蓝）三条曲线同一帧重画，
 *      后验那条沿着"先验均值 → 数据频率"的方向滑动。
 *   3. 读数：a、b 的具体值，后验均值 (a+k)/(a+b+n)，预测下一封正常的概率，
 *      95% 可信区间与区间宽度；数字与正文的共轭更新表逐项对得上。
 *   4. 啊哈预设：「6 战 6 捷」把先验放成 Beta(1,1)、k=6、n=0，预测概率是 0.875
 *      而不是 1（正文的拉普拉斯继承法则）;「先验顽固 s=100」把同样的数据喂进去，
 *      后验均值只挪到 0.528——数据的份量被先验压到 5.7%；「零数据」把 k=n=0，
 *      三条曲线里后验与先验严丝合缝。
 *   5. 默认状态讲对故事：s=4、m=0.5、k=5、n=1，后验均值 0.7 被数据拽向
 *      5/6≈0.833 的方向，可又没拽到底——不点任何按钮就能读出"先验在扶、
 *      数据在拉"这件事。
 *
 * 口径：Beta(a,b) 密度用 Lanczos logGamma 计算；95% 区间用 0.001 网格 +
 * 归一化后取 2.5%/97.5% 分位（与正文"可信区间"同口径，非正态近似）。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, buildReadout, buildToolbar,
  mkBtn, label, polyline, fmt, clamp, clearBg,
} from '../core.js';

const G = [
  676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012,
  9.9843695780195716e-6, 1.5056327351493116e-7,
];
function logGamma(z) {
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  const zz = z - 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < G.length; i += 1) x += G[i] / (zz + i + 1);
  const t = zz + G.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (zz + 0.5) * Math.log(t) - t + Math.log(x);
}
function betaPdf(x, a, b) {
  if (x <= 0 || x >= 1) return 0;
  return Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x)
    - (logGamma(a) + logGamma(b) - logGamma(a + b)));
}
/* 归一化网格上的分位数：返回 [2.5%, 97.5%] */
function quantiles(a, b, lo, hi) {
  const N = 1000;
  const dx = 1 / N;
  let total = 0;
  const cum = new Array(N + 1).fill(0);
  for (let i = 1; i <= N; i += 1) {
    total += betaPdf(i * dx - dx / 2, a, b) * dx;
    cum[i] = total;
  }
  const q = (p) => {
    const want = total * p;
    for (let i = 1; i <= N; i += 1) {
      if (cum[i] >= want) {
        const prev = cum[i - 1];
        const span = cum[i] - prev || 1e-12;
        return (i - 1 + (want - prev) / span) * dx;
      }
    }
    return 1;
  };
  void lo; void hi;
  return [q(0.025), q(0.975)];
}

export default function render(host, spec) {
  const st = {
    s: Number.isFinite(spec.s) ? spec.s : 4,
    m: Number.isFinite(spec.m) ? spec.m : 0.5,
    k: Number.isFinite(spec.k) ? spec.k : 5,
    n: Number.isFinite(spec.n) ? spec.n : 1,
    seq: spec.seq !== false,
  };

  const cv = setupCanvas(host, 340);
  const ro = buildReadout({
    先验: '—', 后验: '—', 后验均值: '—', 预测下一个: '—', '95% 区间': '—', 数据份量: '—',
  });
  host.appendChild(ro.box);

  function ab() {
    const a = Math.max(0.2, st.s * st.m);
    const b = Math.max(0.2, st.s * (1 - st.m));
    return [a, b];
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    const padL = 44;
    const padR = 16;
    const padT = 16;
    const padB = 34;
    const [a0, b0] = ab();
    const a1 = a0 + st.k;
    const b1 = b0 + st.n;
    const X = (x) => padL + x * (W - padL - padR);
    const Y = (y) => H - padB - (Math.min(y, pmax) / pmax) * (H - padT - padB);

    /* 三条曲线的峰高定纵轴：先验/似然/后验同尺度才好比 */
    let pmax = 0;
    for (let i = 0; i <= 240; i += 1) {
      const x = i / 240;
      pmax = Math.max(pmax, betaPdf(x, a0, b0), betaPdf(x, a1, b1), betaPdf(x, st.k + 1, st.n + 1));
    }
    pmax = pmax || 1;

    /* 网格 */
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
      const y = padT + ((H - padT - padB) * i) / 4;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
    }
    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, H - padB);
    ctx.moveTo(padL, H - padB);
    ctx.lineTo(W - padR, H - padB);
    ctx.stroke();
    for (let i = 0; i <= 10; i += 1) {
      label(ctx, fmt(i / 10, 1), X(i / 10), H - padB + 14, C.axis, { size: 10, align: 'center' });
    }

    const curve = (aa, bb, color, w, dash, alpha) => {
      const pts = [];
      for (let i = 0; i <= 300; i += 1) {
        const x = i / 300;
        pts.push([X(x), Y(betaPdf(x, aa, bb))]);
      }
      ctx.globalAlpha = alpha;
      polyline(ctx, pts, color, w, dash);
      ctx.globalAlpha = 1;
    };

    /* 逐条喂数据的轨迹：先连喂 k 个成功、再喂 n 个失败，每步画一条淡后验。
       （这与正文"分批 vs 一锅端终局相同"的实测同口径——终点重合，只是路径不同。） */
    if (st.seq && st.k + st.n > 1) {
      let aa = a0;
      let bb = b0;
      const steps = Math.min(10, st.k + st.n);
      for (let i = 0; i < steps; i += 1) {
        if (i < st.k) aa += 1;
        else bb += 1;
        curve(aa, bb, C.named('green'), 1, [2, 4], 0.22);
      }
    }

    curve(a0, b0, C.axis, 2, [6, 4], 0.9);
    if (st.k + st.n > 0) curve(st.k + 1, st.n + 1, C.accent2, 1.6, null, 0.75);
    curve(a1, b1, C.accent, 2.8, null, 1);

    /* 先验均值与后验均值两条竖线：看懂"往哪边挪" */
    const mv = a0 / (a0 + b0);
    const mp = a1 / (a1 + b1);
    const [q1, q2] = quantiles(a1, b1, 0, 1);
    ctx.strokeStyle = C.axis;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(X(mv), padT);
    ctx.lineTo(X(mv), H - padB);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.soft;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(X(q1), padT, Math.max(1, X(q2) - X(q1)), H - padT - padB);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(X(mp), padT);
    ctx.lineTo(X(mp), H - padB);
    ctx.stroke();

    label(ctx, '先验 Beta(' + fmt(a0, 1) + ', ' + fmt(b0, 1) + ')', padL + 4, padT + 12, C.axis, { size: 11 });
    if (st.k + st.n > 0) {
      label(ctx, '似然 ∝ p^k(1−p)^n', padL + 4, padT + 27, C.accent2, { size: 11 });
    }
    label(ctx, '后验 Beta(' + fmt(a1, 1) + ', ' + fmt(b1, 1) + ')', W - padR - 4, padT + 12, C.accent,
      { size: 11, align: 'right' });
    label(ctx, '95%', X(q1) + 2, H - padB - 4, C.fg, { size: 10 });
    label(ctx, 'p', W - padR - 2, H - padB + 14, C.axis, { size: 11, align: 'right' });

    /* ---- 读数：与正文共轭更新表逐项对齐 ---- */
    ro.set('先验', 'Beta(' + fmt(a0, 2) + ', ' + fmt(b0, 2) + ')，均值 ' + fmt(mv, 3));
    ro.set('后验', 'Beta(' + fmt(a0, 2) + ' + ' + st.k + ', ' + fmt(b0, 2) + ' + ' + st.n + ') = Beta('
      + fmt(a1, 2) + ', ' + fmt(b1, 2) + ')');
    ro.set('后验均值', fmt(mp, 4) + ' = (a+k)/(a+b+n) = ' + fmt(a1, 1) + '/' + fmt(a1 + b1, 1));
    ro.set('预测下一个', 'P(下一个成功) = ' + fmt(mp, 4));
    ro.set('95% 区间', '[' + fmt(q1, 3) + ', ' + fmt(q2, 3) + ']，宽 ' + fmt(q2 - q1, 3));
    ro.set('数据份量', 'n 占后验总权重的 ' + fmt((st.k + st.n) / (a1 + b1), 3)
      + '（先验仍占 ' + fmt(1 - (st.k + st.n) / (a1 + b1), 3) + '）');
  }
  draw();
  cv.redraw = draw;

  function btn(text, fn) {
    const b = mkBtn(text);
    b.addEventListener('click', fn);
    return b;
  }
  const bar = buildToolbar(
    btn('6 战 6 捷', () => { st.s = 2; st.m = 0.5; st.k = 6; st.n = 0; sync(); draw(); }),
    btn('先验顽固 s = 100', () => { st.s = 100; st.m = 0.5; st.k = 6; st.n = 0; sync(); draw(); }),
    btn('零数据（后验≠先验才怪）', () => { st.s = 4; st.m = 0.5; st.k = 0; st.n = 0; sync(); draw(); }),
    btn('复位', () => { st.s = 4; st.m = 0.5; st.k = 5; st.n = 1; sync(); draw(); }),
  );
  host.appendChild(bar);

  const sl = buildSliders({
    sliders: [
      { name: 's', label: '先验强度 a+b', min: 0.4, max: 120, step: 0.2, value: st.s },
      { name: 'm', label: '先验均值', min: 0.02, max: 0.98, step: 0.01, value: st.m },
      { name: 'k', label: '成功 k', min: 0, max: 40, step: 1, value: st.k },
      { name: 'n', label: '失败 n', min: 0, max: 40, step: 1, value: st.n },
    ],
  }, (state) => {
    st.s = state.s;
    st.m = state.m;
    st.k = state.k;
    st.n = state.n;
    draw();
  });
  host.appendChild(sl.box);

  /* 按钮改的是同一份状态：把滑块也拨过去，免得"数字变了滑杆没动" */
  function sync() {
    const set = (i, v, digits) => {
      const row = sl.box.children[i];
      if (!row) return;
      if (row.children[1]) row.children[1].value = String(v);
      if (row.children[2]) row.children[2].textContent = digits === undefined ? String(v) : fmt(v, digits);
    };
    set(0, st.s);
    set(1, st.m);
    set(2, st.k);
    set(3, st.n);
    sl.state.s = st.s;
    sl.state.m = st.m;
    sl.state.k = st.k;
    sl.state.n = st.n;
  }

  return {
    destroy() {
      cv.redraw = null;
    },
  };
}