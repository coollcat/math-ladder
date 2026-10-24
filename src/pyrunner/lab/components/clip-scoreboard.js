/* =========================================================================
 * lab 组件：clip-scoreboard —— CLIP 的 N×N 记分板：温度与错位现场
 * -------------------------------------------------------------------------
 * 演示什么：$N$ 张图与 $N$ 句话凑成一块相似度记分板。对角线是真配对，
 *   每一格是余弦相似度。两条滑块分别拧"文本塔整体错开多少度"与温度 τ：
 *   错开 0° 时对角线满格、损失 0.0134；错开 60° 时行方向一个都不认领自己，
 *   损失跳到 1.9800。读者亲手把"对齐"这件事拧坏、再拧回来。
 *   注意 45° 那一档是个平局陷阱：对角与相邻格恰好都是 0.7071，
 *   argmax 判不出胜负（读数仍显示 4/4），要到 60° 才真正翻盘。
 *
 * 用法（第 48 章《CLIP 与多模态对齐》动手实验）：
 *   { "type": "clip-scoreboard",
 *     "title": "拧温度和错位角，看记分板与损失",
 *     "hint": "拖两条滑块；对角线的深色框是真配对",
 *     "pairs": 4 }
 *
 * 字段（都可省）：pairs 配对数（2~6，默认 4）/ tau 初值 / phi 初值（度）/
 *   height 画布高度（默认 340）。
 *
 * 五问：
 *   1. 动手量：两条滑块就是 CLIP 里两个真实旋钮——文本塔的偏置（对齐好坏）
 *      与温度 τ（softmax 的陡峭度）。
 *   2. 即时后果：每一格的颜色、对角框、每行的柱状概率条、损失读数同帧更新。
 *   3. 读数：损失按正文那条对称 InfoNCE 算（行、列各一遍再平均），
 *      并且给出"行方向有几行认领了自己"——τ 再小也救不回错位的配对。
 *   4. 啊哈预设：「错位 60°（全错）」把行 argmax 全部赶到别的列上（0/4）；
 *      「τ=0.07」把温度压到 CLIP 实际用的量级，损失对相似度差变得极其敏感。
 *   5. 默认状态：错位 0°、τ=0.2，对角线 1.0000、损失 0.0134，
 *      一打开就是"已经对齐"的教科书状态。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, setSliderRow, buildToolbar, buildReadout,
  mkBtn, label, clamp, fmt, clearBg,
} from '../core.js';

export default function render(host, spec) {
  const n = clamp(Math.round(Number(spec.pairs) || 4), 2, 6);
  const st = {
    phi: Number.isFinite(spec.phi) ? spec.phi : 0,
    tau: Number.isFinite(spec.tau) ? spec.tau : 0.2,
  };

  /* 图像塔固定在 0°/90°/180°/270°…；文本塔整体再偏 phi 度。
     这样 phi=0 时 S[i][j]=cos(Δ_ij)，对角恒为 1，与正文的玩具算例同构。 */
  const imgAng = (i) => (360 / n) * i;
  const txtAng = (j) => (360 / n) * j + st.phi;

  function matrix() {
    const S = [];
    for (let i = 0; i < n; i += 1) {
      const row = [];
      for (let j = 0; j < n; j += 1) {
        row.push(Math.cos(((imgAng(i) - txtAng(j)) * Math.PI) / 180));
      }
      S.push(row);
    }
    return S;
  }

  function softmax(row, tau) {
    const mx = Math.max(...row);
    const ex = row.map((v) => Math.exp((v - mx) / tau));
    const Z = ex.reduce((a, b) => a + b, 0);
    return ex.map((e) => e / Z);
  }

  /* 对称 InfoNCE：行（图找句）与列（句找图）各算一遍交叉熵再平均，与正文公式一致 */
  function stats(S) {
    let Lrow = 0;
    let hit = 0;
    for (let i = 0; i < n; i += 1) {
      const p = softmax(S[i], st.tau);
      Lrow += -Math.log(Math.max(p[i], 1e-12));
      if (S[i][i] >= Math.max(...S[i]) - 1e-12) hit += 1;
    }
    let Lcol = 0;
    for (let j = 0; j < n; j += 1) {
      const col = S.map((row) => row[j]);
      const p = softmax(col, st.tau);
      Lcol += -Math.log(Math.max(p[j], 1e-12));
    }
    return { L: (Lrow + Lcol) / 2 / n, hit, rows: Array.from({ length: n }, (_, i) => softmax(S[i], st.tau)) };
  }

  const cv = setupCanvas(host, spec.height || 340);
  const ro = buildReadout({
    '对称 InfoNCE 损失': '—',
    '对角相似度': '—',
    '行方向认领下数': '—',
    '温度 τ': '—',
  });
  host.appendChild(ro.box);

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    const S = matrix();
    const M = stats(S);

    const padL = 62;
    const padT = 34;
    const gridW = Math.min(W - padL - 130, H - padT - 86);
    const cell = Math.max(18, gridW / n);
    const gx = padL;
    const gy = padT;

    /* 列标题：文本塔（句子） */
    for (let j = 0; j < n; j += 1) {
      label(ctx, 'T' + (j + 1), gx + cell * (j + 0.5), gy - 8, C.fg,
        { align: 'center', size: 10.5 });
    }
    label(ctx, '文本塔 tⱼ →', gx + (cell * n) / 2, gy - 24, C.named('purple'),
      { align: 'center', size: 10.5 });
    /* 行标题：图像塔 */
    for (let i = 0; i < n; i += 1) {
      label(ctx, 'V' + (i + 1), gx - 8, gy + cell * (i + 0.5) + 4, C.fg,
        { align: 'right', size: 10.5 });
    }
    ctx.save();
    ctx.translate(gx - 40, gy + (cell * n) / 2);
    ctx.rotate(-Math.PI / 2);
    label(ctx, '图像塔 vᵢ', 0, 0, C.named('blue'), { align: 'center', size: 10.5 });
    ctx.restore();

    /* 每一格：颜色随相似度从 bad 到 ok；对角加深色框 */
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        const v = S[i][j];            // [-1, 1]
        const t = (v + 1) / 2;        // [0, 1]
        const x = gx + cell * j;
        const y = gy + cell * i;
        ctx.save();
        ctx.globalAlpha = 0.18 + 0.72 * t;
        ctx.fillStyle = v >= 0 ? C.ok : C.bad;
        ctx.fillRect(x + 1.5, y + 1.5, cell - 3, cell - 3);
        ctx.restore();
        ctx.strokeStyle = i === j ? C.fg : C.grid;
        ctx.lineWidth = i === j ? 2.2 : 1;
        ctx.strokeRect(x + 1.5, y + 1.5, cell - 3, cell - 3);
        if (cell >= 34) {
          label(ctx, fmt(v, 2), x + cell / 2, y + cell / 2 + 4,
            Math.abs(v) > 0.55 ? C.bg : C.fg, { align: 'center', size: Math.min(11, cell * 0.26) });
        }
      }
    }

    /* 右侧：每行的 softmax 概率（"这一行认领谁"） */
    const rx = gx + cell * n + 26;
    const rw = Math.max(40, W - rx - 16);
    label(ctx, '每行认领谁（softmax）', rx, gy - 8, C.fg, { size: 10.5 });
    for (let i = 0; i < n; i += 1) {
      const y = gy + cell * (i + 0.5);
      const p = M.rows[i];
      let x = rx;
      for (let j = 0; j < n; j += 1) {
        const w = Math.max(1.5, p[j] * rw);
        ctx.fillStyle = j === i ? C.ok : C.named('gray');
        ctx.globalAlpha = j === i ? 0.95 : 0.55;
        ctx.fillRect(x, y - 7, w, 13);
        ctx.globalAlpha = 1;
        x += w;
      }
      const top = p.indexOf(Math.max(...p));
      label(ctx, top === i ? '✔ 认领自己' : '✘ 认成 T' + (top + 1), rx + rw + 6, y + 4,
        top === i ? C.ok : C.bad, { size: 10 });
    }

    if (spec.hint) label(ctx, String(spec.hint), padL - 40, H - 6, C.grid, { size: 10 });

    const diag = S.map((row, i) => row[i]);
    ro.set('对称 InfoNCE 损失', (M.L < 1e-4 ? M.L.toExponential(2) : M.L.toFixed(4))
      + (M.L < 0.05 ? '　（几乎完美对齐）' : M.L > 1.2 ? '　（错得离谱）' : ''));
    ro.set('对角相似度', diag.map((v) => v.toFixed(2)).join(' / '));
    ro.set('行方向认领下数', M.hit + ' / ' + n + (M.hit === 0 ? '　← 一句话都没配对成功' : ''));
    ro.set('温度 τ', st.tau.toFixed(2) + (st.tau < 0.15
      ? '　很苛刻：只盯着最像的那个错配学'
      : st.tau > 0.6 ? '　很宽容：好配对与坏配对的差别被抹平'
        : '　CLIP 的量级：既分得开也不算苛刻'));
  }

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'phi', label: '文本塔错位 φ (°)', min: 0, max: 90, step: 1, value: st.phi, fmt: 0 },
        { name: 'tau', label: '温度 τ', min: 0.05, max: 1, step: 0.01, value: st.tau, fmt: 2 },
      ],
    },
    (state) => { st.phi = state.phi; st.tau = state.tau; draw(); },
  );

  const bar = buildToolbar(
    (() => {
      const b = mkBtn('对齐（φ=0）');
      b.addEventListener('click', () => {
        st.phi = 0; st.tau = 0.2;
        setSliderRow(sliders, 0, 0, 0, 'phi');
        setSliderRow(sliders, 1, 0.2, 2, 'tau');
        draw();
      });
      return b;
    })(),
    (() => {
      const b = mkBtn('错位 60°（全错）');
      b.addEventListener('click', () => {
        st.phi = 60; st.tau = 0.2;
        setSliderRow(sliders, 0, 60, 0, 'phi');
        setSliderRow(sliders, 1, 0.2, 2, 'tau');
        draw();
      });
      return b;
    })(),
    (() => {
      const b = mkBtn('CLIP 实测温度 τ=0.07');
      b.addEventListener('click', () => {
        st.phi = 0; st.tau = 0.07;
        setSliderRow(sliders, 0, 0, 0, 'phi');
        setSliderRow(sliders, 1, 0.07, 2, 'tau');
        draw();
      });
      return b;
    })(),
  );
  host.appendChild(bar);

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() {} };
}
