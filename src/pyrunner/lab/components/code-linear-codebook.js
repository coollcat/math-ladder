/* =========================================================================
 * lab 组件：code-linear-codebook —— 用几个基向量摊开整座码本
 * -------------------------------------------------------------------------
 * 用法（第 35 章《线性码》动手实验）：
 *   { "type": "code-linear-codebook", "title": "…" }
 * 字段（都可省）：n 码长（3–6，默认 4）；k 维数（1–3，默认 2）；
 *   basis 初始基码字（0/1 数组的数组）；height 画布高度（默认 540）。
 *
 * 上面一排是 k 个基码字，点任意一位就翻转它；下面按 2^k 个消息列出全部
 * 线性组合（异或），于是「几个基向量 → 一整座码本」当场摊平。
 * 右侧三本账同步：
 *   · 码字个数 = 2^k；
 *   · 封闭性抽检：任取两个码字异或，结果是否仍在码本里（全枚举，O(4^k)）；
 *   · 重量谱：每个码字里 1 的个数，最小非零重量就是 d_min（线性码的定理）。
 * 基向量退化（第二行 = 第一行）时会立刻出现重复码字：个数不足 2^k，本组件
 *   直接标红「不再线性无关」，而不是假装仍是 k 维。
 *
 * 取舍：k ≤ 3 / n ≤ 6 是有意限制——再大就画不下逐位表格，而且 2^k 行会
 *   溢出屏幕。所有组合用真异或现算，没有预置答案。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildToolbar, buildReadout, bindPointer,
  mkBtn, label, clearBg, clamp,
} from '../core.js';

const DEF_N = 4;
const DEF_K = 2;

function hamWeight(w) {
  let c = 0;
  for (let i = 0; i < w.length; i += 1) c += w[i];
  return c;
}
const xorWords = (a, b) => a.map((v, i) => v ^ b[i]);
const keyOf = (w) => w.join('');

export default function render(host, spec) {
  const n = clamp(Math.round(spec.n || DEF_N), 3, 6);
  const k = clamp(Math.round(spec.k || DEF_K), 1, 3);

  let basis;
  if (Array.isArray(spec.basis) && spec.basis.length) {
    basis = spec.basis.slice(0, k).map((row) => {
      const r = Array.isArray(row) ? row.slice(0, n) : [];
      while (r.length < n) r.push(0);
      return r.map((b) => (Number(b) ? 1 : 0));
    });
    while (basis.length < k) basis.push(new Array(n).fill(0));
  } else {
    /* 默认抄课文那两个基码字 110 / 101，只在前两次位上填 1 */
    basis = [];
    for (let i = 0; i < k; i += 1) {
      const row = new Array(n).fill(0);
      row[i % n] = 1;
      row[(i + 1) % n] = 1;
      basis.push(row);
    }
  }

  const cv = setupCanvas(host, spec.height || 540);
  const ro = buildReadout({
    基向量: '—',
    码字个数: '—',
    线性无关: '—',
    封闭性抽检: '—',
    'd_min（最小非零重量）': '—',
  });
  host.appendChild(ro.box);

  const bRand = mkBtn('随机换一组基');
  const bId = mkBtn('换成单位基');
  const bZero = mkBtn('全部清零');
  host.appendChild(buildToolbar(bRand, bId, bZero));

  /* 全枚举 2^k 个消息，逐个异或出码字 */
  function codebook() {
    const out = [];
    for (let m = 0; m < (1 << k); m += 1) {
      const msg = [];
      const word = new Array(n).fill(0);
      for (let i = 0; i < k; i += 1) {
        const bit = (m >> (k - 1 - i)) & 1;
        msg.push(bit);
        if (bit) for (let j = 0; j < n; j += 1) word[j] ^= basis[i][j];
      }
      out.push({ m, msg, word });
    }
    return out;
  }

  const geo = { bx: 0, by: 0, cell: 0, rowH: 28, panelX: 0, panelY: 0, panelW: 0, W: 0, H: 0 };

  function layout(W, H) {
    const wide = W >= 640;
    geo.W = W;
    geo.H = H;
    const pad = 16;
    geo.cell = clamp(Math.floor((Math.min(W, wide ? W * 0.46 : W) - pad * 2 - 62) / n), 22, 40);
    geo.bx = pad + 46;
    geo.by = 60;
    geo.panelX = wide ? Math.min(W * 0.56, geo.bx + geo.cell * n + 40) : pad;
    geo.panelY = wide ? 60 : geo.by + geo.rowH * (k + 2 + (1 << k)) + 30;
    geo.panelW = wide ? W - geo.panelX - pad : W - pad * 2;
  }

  function drawBits(ctx, C, word, x0, y0, cell, color, dim) {
    for (let i = 0; i < word.length; i += 1) {
      const cx = x0 + i * cell;
      ctx.save();
      ctx.fillStyle = word[i] ? color : C.soft;
      ctx.globalAlpha = word[i] ? (dim ? 0.5 : 0.9) : 0.6;
      ctx.fillRect(cx, y0, cell - 3, 22);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.strokeRect(cx + 0.5, y0 + 0.5, cell - 4, 21);
      ctx.restore();
      label(ctx, String(word[i]), cx + (cell - 3) / 2, y0 + 16,
        word[i] ? C.bg : C.fg, { size: 12, align: 'center', weight: 700 });
    }
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    layout(W, H);

    const books = codebook();
    const keys = new Set(books.map((b) => keyOf(b.word)));
    const fullDim = keys.size === (1 << k);

    label(ctx, '基码字（点任意一位翻转它）', geo.bx - 46, 26, C.fg, { size: 12.5, weight: 700 });
    label(ctx, '消息 → 码字 = 各基的异或组合', geo.bx - 46, 44, C.axis, { size: 10.5 });

    let yy = geo.by;
    for (let i = 0; i < k; i += 1) {
      label(ctx, 'g' + (i + 1), geo.bx - 14, yy + 16, C.named(['blue', 'orange', 'green'][i % 3]),
        { size: 13, weight: 700, align: 'right' });
      drawBits(ctx, C, basis[i], geo.bx, yy, geo.cell, C.named(['blue', 'orange', 'green'][i % 3]), false);
      yy += geo.rowH;
    }

    yy += 14;
    label(ctx, '全部 ' + books.length + ' 个消息的像', geo.bx - 46, yy, C.fg, { size: 12, weight: 700 });
    yy += 16;
    books.forEach((b) => {
      label(ctx, b.msg.join(''), geo.bx - 14, yy + 16, C.axis, { size: 12, align: 'right' });
      label(ctx, '→', geo.bx - 6, yy + 16, C.axis, { size: 11 });
      drawBits(ctx, C, b.word, geo.bx + 14, yy, geo.cell, C.named('teal'), false);
      yy += geo.rowH;
    });

    /* ---- 右侧三本账 ---- */
    const px = geo.panelX;
    let py = geo.panelY;
    const pw = geo.panelW;

    label(ctx, '码字个数 = ' + keys.size + ' / 应为 2^k = ' + (1 << k), px, py, C.fg, { size: 12 });
    py += 18;
    if (fullDim) {
      label(ctx, '基向量线性无关 ✓', px, py, C.ok, { size: 12, weight: 700 });
    } else {
      label(ctx, '基向量退化：只剩 ' + keys.size + ' 个不同码字', px, py, C.bad, { size: 12, weight: 700 });
      label(ctx, '有基是别人的组合，维度低于 k', px, py + 16, C.axis, { size: 10.5 });
    }
    py += 30;

    /* 封闭性：全枚举两两异或（2^k ≤ 8，共 64 次，很便宜） */
    let bad = 0;
    let checked = 0;
    for (let i = 0; i < books.length; i += 1) {
      for (let j = 0; j < books.length; j += 1) {
        checked += 1;
        if (!keys.has(keyOf(xorWords(books[i].word, books[j].word)))) bad += 1;
      }
    }
    label(ctx, '封闭性：' + checked + ' 对数全部两两异或', px, py, C.fg, { size: 11.5 });
    py += 17;
    label(ctx, bad === 0 ? '结果都还在码本里 ✓（真线性）' : bad + ' 对异或跑出了码本 ✗',
      px, py, bad === 0 ? C.ok : C.bad, { size: 11.5, weight: 700 });
    py += 26;

    /* 重量谱 + d_min */
    const ws = books.map((b) => hamWeight(b.word));
    const nz = ws.filter((w) => w > 0);
    const dmin = nz.length ? Math.min(...nz) : 0;
    label(ctx, '重量谱（含零码字）', px, py, C.fg, { size: 11.5 });
    py += 14;
    const bw = Math.min(pw - 8, 250);
    const step = bw / books.length;
    books.forEach((b, i) => {
      const h = 46 * (ws[i] / Math.max(1, n));
      const cx = px + i * step + 2;
      ctx.fillStyle = ws[i] === 0 ? C.named('gray') : C.named('purple');
      ctx.globalAlpha = 0.85;
      ctx.fillRect(cx, py + 60 - h, Math.max(4, step - 5), h);
      ctx.globalAlpha = 1;
      label(ctx, String(ws[i]), cx + Math.max(4, step - 5) / 2, py + 74, C.axis, { size: 9.5, align: 'center' });
      label(ctx, b.msg.join(''), cx + Math.max(4, step - 5) / 2, py + 88, C.axis, { size: 9, align: 'center' });
    });
    py += 104;
    label(ctx, 'd_min = 最小非零重量 = ' + (nz.length ? dmin : '—') + '　（线性码定理）',
      px, py, C.fg, { size: 11.5, weight: 700 });
    py += 18;
    label(ctx, dmin >= 2 ? '纠错半径 t = ⌊(d−1)/2⌋ = ' + Math.floor((dmin - 1) / 2) : '重量 1 码字在场：t = 0，只能检错',
      px, py, C.axis, { size: 10.5 });

    ro.set('基向量', 'k = ' + k + '，n = ' + n);
    ro.set('码字个数', keys.size + ' / ' + (1 << k));
    ro.set('线性无关', fullDim ? '是' : '否（退化）');
    ro.set('封闭性抽检', bad === 0 ? checked + ' 对全通过' : bad + ' 对失败');
    ro.set('d_min（最小非零重量）', nz.length ? String(dmin) : '—');
  }

  /* 命中：先找基码字的位，再找码字表（码字表只读，点了只翻转并不存在的位） */
  const hitBasis = (x0, y0) => {
    for (let i = 0; i < k; i += 1) {
      const yb = geo.by + i * geo.rowH;
      if (y0 < yb || y0 > yb + 22) continue;
      const j = Math.floor((x0 - geo.bx) / geo.cell);
      if (j >= 0 && j < n) return [i, j];
    }
    return null;
  };

  bindPointer(cv.canvas, {
    pick(x0, y0) { return hitBasis(x0, y0) ? 'bit' : null; },
    hover(x0, y0) { cv.canvas.style.cursor = hitBasis(x0, y0) ? 'pointer' : 'default'; },
    down(id, x0, y0) {
      const h = hitBasis(x0, y0);
      if (!h) return;
      basis[h[0]][h[1]] = 1 - basis[h[0]][h[1]];
      draw();
    },
    move() {},
    up() {},
    leave() { cv.canvas.style.cursor = 'default'; },
  });

  bId.addEventListener('click', () => {
    basis = [];
    for (let i = 0; i < k; i += 1) {
      const row = new Array(n).fill(0);
      row[i] = 1;
      basis.push(row);
    }
    draw();
  });
  bZero.addEventListener('click', () => {
    basis = basis.map(() => new Array(n).fill(0));
    draw();
  });
  let seed = 7;
  bRand.addEventListener('click', () => {
    basis = [];
    for (let i = 0; i < k; i += 1) {
      const row = [];
      for (let j = 0; j < n; j += 1) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        row.push((seed >> 16) & 1);
      }
      basis.push(row);
    }
    draw();
  });

  draw();
  cv.redraw = draw;
  return { destroy() {} };
}
