/* =========================================================================
 * lab 组件：code-generator-parity —— G 造码字、H 查合法性，两本账同时翻
 * -------------------------------------------------------------------------
 * 用法（第 35 章《生成矩阵与校验矩阵》动手实验）：
 *   { "type": "code-generator-parity", "title": "…" }
 * 字段（都可省）：G / H 初始矩阵（二维 0/1 数组，默认抄课文那组 2×5 与 3×5）；
 *   m 初始消息；height 画布高度（默认 560）。
 *
 * 三行流水线全在一屏：
 *   ① 消息 m（点位翻转）── mG mod 2 ──▶ 码字 c；
 *   ② 信道（点码字任意一位就翻转它）──▶ 接收块 r；
 *   ③ 校验子 s = H rᵀ mod 2（三条奇偶灯逐个亮）。
 * G 与 H 的每个元素都能点着改；右上角实时算 GHᵀ 是否为零矩阵——那是
 * 「两张脸描述同一个码」的代数签名。s = 0 只说「通过全部方程」，本组件
 * 用一句灰字提醒它不等于「一定没出错」。
 *
 * 取舍：矩阵规模限制在 k ≤ 4、n ≤ 7；更大的矩阵在画布上没法逐格点。
 *   所有乘加都在 F2 里现算（加法异或、乘法 AND），不查表。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildToolbar, buildReadout, bindPointer,
  mkBtn, label, clearBg, clamp,
} from '../core.js';

const DEF_G = [[1, 1, 1, 0, 0], [0, 0, 1, 1, 1]];
const DEF_H = [[1, 1, 0, 0, 0], [0, 0, 0, 1, 1], [0, 1, 1, 0, 1]];

const normMat = (mat, rows, cols, fallback) => {
  if (!Array.isArray(mat) || !mat.length) return fallback.map((r) => r.slice());
  const out = [];
  for (let i = 0; i < rows; i += 1) {
    const src = Array.isArray(mat[i]) ? mat[i] : [];
    const r = [];
    for (let j = 0; j < cols; j += 1) r.push(Number(src[j]) ? 1 : 0);
    out.push(r);
  }
  return out;
};

/* 把样例矩阵裁剪/补零成 rows×cols（课文矩阵比画布小的时候不会越界） */
function fillFrom(src, rows, cols) {
  const out = [];
  for (let i = 0; i < rows; i += 1) {
    const line = [];
    for (let j = 0; j < cols; j += 1) line.push(src[i] && src[i][j] ? 1 : 0);
    out.push(line);
  }
  return out;
}

const mulMod2 = (v, M) => {
  const cols = M[0].length;
  const out = [];
  for (let j = 0; j < cols; j += 1) {
    let s = 0;
    for (let i = 0; i < M.length; i += 1) s += v[i] * M[i][j];
    out.push(s % 2);
  }
  return out;
};

export default function render(host, spec) {
  const k = clamp(Math.round(spec.k || DEF_G.length), 1, 4);
  const n = clamp(Math.round(spec.n || DEF_G[0].length), 2, 7);
  const nc = Math.max(1, Math.min(n - k, 4));   /* 校验行数 = n-k */

  let G = normMat(spec.G, k, n, DEF_G.map((r) => {
    const row = r.slice(0, n);
    while (row.length < n) row.push(0);
    return row;
  }));
  let H = normMat(spec.H, nc, n, DEF_H.slice(0, nc).map((r) => {
    const row = r.slice(0, n);
    while (row.length < n) row.push(0);
    return row;
  }));

  let m = Array.isArray(spec.m) && spec.m.length === k ? spec.m.map((b) => (Number(b) ? 1 : 0)) : new Array(k).fill(0).map((_, i) => (i === 0 ? 1 : 0));
  let flips = new Array(n).fill(0);   /* 信道注入：1 表示这一位被翻转 */

  const cv = setupCanvas(host, spec.height || 560);
  const ro = buildReadout({
    消息: '—',
    码字: '—',
    接收块: '—',
    校验子: '—',
    'GHᵀ 全零': '—',
  });
  host.appendChild(ro.box);

  const bClear = mkBtn('清空信道');
  const bOne = mkBtn('翻转第 1 位');
  const bReset = mkBtn('重置矩阵');
  host.appendChild(buildToolbar(bClear, bOne, bReset));

  const geo = { cell: 26, gx: 0, gy: 0, hx: 0, hy: 0, sigX: 0, W: 0, H: 0, wide: false };

  function layout(W, Hh) {
    const wide = W >= 660;
    geo.wide = wide;
    geo.W = W;
    geo.H = Hh;
    geo.cell = clamp(Math.floor((Math.min(W, wide ? W * 0.5 : W) - 120) / n), 20, 34);
    geo.gx = 78;
    geo.gy = 74;
    geo.hx = 78;
    geo.hy = geo.gy + k * (geo.cell + 6) + 96;
    geo.sigX = wide ? Math.min(W * 0.6, geo.gx + n * geo.cell + 60) : 78;
  }

  function matCell(ctx, C, x0, y0, cell, i, j, val, isHot) {
    const x = x0 + j * cell;
    const y = y0 + i * cell;
    ctx.save();
    ctx.fillStyle = val ? C.named('blue') : C.soft;
    ctx.globalAlpha = val ? 0.85 : 0.65;
    ctx.fillRect(x, y, cell - 4, cell - 4);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = isHot ? C.accent2 : C.grid;
    ctx.lineWidth = isHot ? 2 : 1;
    ctx.strokeRect(x + 0.5, y + 0.5, cell - 5, cell - 5);
    ctx.restore();
    label(ctx, String(val), x + (cell - 4) / 2, y + cell * 0.7,
      val ? C.bg : C.fg, { size: Math.round(cell * 0.46), align: 'center', weight: 700 });
  }

  function drawWord(ctx, C, word, y0, color, flipMask, prefix) {
    const cell = geo.cell;
    if (prefix) label(ctx, prefix, geo.gx - 12, y0 + cell * 0.7, color, { size: 13, weight: 700, align: 'right' });
    word.forEach((b, j) => {
      const x = geo.gx + j * cell;
      const flipped = flipMask && flipMask[j];
      ctx.save();
      ctx.fillStyle = flipped ? C.bad : (b ? color : C.soft);
      ctx.globalAlpha = b || flipped ? 0.88 : 0.6;
      ctx.fillRect(x, y0, cell - 4, cell - 4);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = C.grid;
      ctx.strokeRect(x + 0.5, y0 + 0.5, cell - 5, cell - 5);
      ctx.restore();
      label(ctx, String(b), x + (cell - 4) / 2, y0 + cell * 0.7,
        b || flipped ? C.bg : C.fg, { size: Math.round(cell * 0.46), align: 'center', weight: 700 });
      if (flipped) label(ctx, '×', x + cell / 2, y0 + cell + 9, C.bad, { size: 10, align: 'center' });
    });
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const Hh = cv.H;
    clearBg(ctx, W, Hh, C);
    layout(W, Hh);
    const cell = geo.cell;

    /* ---- 流水线计算 ---- */
    const codeword = mulMod2(m, G);
    const received = codeword.map((b, i) => b ^ flips[i]);
    const syndrome = H.map((row) => {
      let s = 0;
      for (let i = 0; i < n; i += 1) s += row[i] * received[i];
      return s % 2;
    });
    /* GHᵀ：k×nc，每格是第 i 行 G 与第 j 行 H 的内积 */
    const gh = [];
    let ghAllZero = true;
    for (let i = 0; i < k; i += 1) {
      const row = [];
      for (let j = 0; j < nc; j += 1) {
        let s = 0;
        for (let c = 0; c < n; c += 1) s += G[i][c] * H[j][c];
        const v = s % 2;
        if (v) ghAllZero = false;
        row.push(v);
      }
      gh.push(row);
    }

    /* ---- G ---- */
    label(ctx, 'G（k×n）：每一行是一个基码字，点格可改', geo.gx - 60, geo.gy - 16, C.fg, { size: 12, weight: 700 });
    for (let i = 0; i < k; i += 1) {
      label(ctx, 'g' + (i + 1), geo.gx - 12, geo.gy + i * (cell + 6) + cell * 0.7, C.axis,
        { size: 12, align: 'right' });
      for (let j = 0; j < n; j += 1) matCell(ctx, C, geo.gx, geo.gy + i * (cell + 6), cell, 0, j, G[i][j], false);
    }

    /* ---- H ---- */
    const hy = geo.gy + k * (cell + 6) + 24;
    label(ctx, 'H（(n−k)×n）：每一行是一条奇偶检查，点格可改', geo.gx - 60, hy - 16, C.fg, { size: 12, weight: 700 });
    for (let i = 0; i < nc; i += 1) {
      label(ctx, 'h' + (i + 1), geo.gx - 12, hy + i * (cell + 6) + cell * 0.7, C.axis, { size: 12, align: 'right' });
      for (let j = 0; j < n; j += 1) matCell(ctx, C, geo.gx, hy + i * (cell + 6), cell, 0, j, H[i][j], false);
    }
    geo.hy = hy;

    /* ---- 流水线 ---- */
    let py = hy + nc * (cell + 6) + 34;
    label(ctx, '1 消息 m（点翻）', geo.gx - 60, py - 14, C.fg, { size: 11.5, weight: 700 });
    drawWord(ctx, C, m, py, C.named('orange'), null, 'm');
    py += cell + 34;

    label(ctx, '2 码字 c = mG', geo.gx - 60, py - 14, C.fg, { size: 11.5, weight: 700 });
    drawWord(ctx, C, codeword, py, C.named('blue'), null, 'c');
    py += cell + 34;

    label(ctx, '3 接收块 r（点一位 = 该位被噪声翻转）', geo.gx - 60, py - 14, C.fg, { size: 11.5, weight: 700 });
    drawWord(ctx, C, received, py, C.named('teal'), flips, 'r');
    py += cell + 34;

    /* ---- 右侧：校验子与 GHᵀ ---- */
    const px = geo.sigX;
    let qy = geo.gy - 2;
    label(ctx, '校验子 s = H rᵀ', px, qy, C.fg, { size: 12.5, weight: 700 });
    qy += 20;
    H.forEach((row, i) => {
      const parts = [];
      for (let j = 0; j < n; j += 1) if (row[j]) parts.push('r' + (j + 1));
      label(ctx, 's' + (i + 1) + ' = ' + (parts.join('+') || '0') + ' ≡ ' + syndrome[i],
        px, qy, syndrome[i] ? C.bad : C.ok, { size: 11, weight: syndrome[i] ? 700 : 400 });
      qy += 17;
    });
    qy += 8;
    label(ctx, 's = [' + syndrome.join(', ') + ']', px, qy, C.fg, { size: 12, weight: 700 });
    qy += 19;
    const zero = syndrome.every((v) => v === 0);
    label(ctx, zero ? '通过全部检查（落在码空间里）' : '至少一条方程不通过', px, qy,
      zero ? C.ok : C.bad, { size: 11 });
    qy += 17;
    label(ctx, zero ? '注意：这不排除偶数个错互相抵消' : '非零 = 确实有错；但未必知道错在哪', px, qy,
      C.axis, { size: 10 });

    qy += 34;
    label(ctx, 'GHᵀ 应为零矩阵（两张脸同一个码）', px, qy, C.fg, { size: 12, weight: 700 });
    qy += 18;
    const cc = Math.max(18, Math.min(26, cell));
    for (let i = 0; i < k; i += 1) {
      for (let j = 0; j < nc; j += 1) {
        const x = px + j * cc;
        const y = qy + i * cc;
        ctx.save();
        ctx.fillStyle = gh[i][j] ? C.bad : C.soft;
        ctx.globalAlpha = gh[i][j] ? 0.9 : 0.7;
        ctx.fillRect(x, y, cc - 3, cc - 3);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = C.grid;
        ctx.strokeRect(x + 0.5, y + 0.5, cc - 4, cc - 4);
        ctx.restore();
        label(ctx, String(gh[i][j]), x + (cc - 3) / 2, y + cc * 0.66,
          gh[i][j] ? C.bg : C.fg, { size: 11, align: 'center', weight: 700 });
      }
    }
    qy += k * cc + 16;
    label(ctx, ghAllZero ? '全零 ✓：这组 G、H 配对成功' : '有非零格：G 与 H 不配对（码字不一定满足检查）',
      px, qy, ghAllZero ? C.ok : C.bad, { size: 11, weight: 700 });

    ro.set('消息', m.join(''));
    ro.set('码字', codeword.join(''));
    ro.set('接收块', received.join(''));
    ro.set('校验子', '[' + syndrome.join(', ') + ']');
    ro.set('GHᵀ 全零', ghAllZero ? '是' : '否');
  }

  /* 命中：G 的格、H 的格、消息位、接收位 */
  function hit(x0, y0) {
    const cell = geo.cell;
    const rowHit = (yb, rows) => {
      if (y0 < yb || y0 > yb + rows * (cell + 6)) return -1;
      const i = Math.floor((y0 - yb) / (cell + 6));
      return i >= 0 && i < rows ? i : -1;
    };
    const col = (x0) => {
      const j = Math.floor((x0 - geo.gx) / cell);
      return j >= 0 && j < n ? j : -1;
    };
    if (x0 >= geo.gx) {
      const gi = rowHit(geo.gy, k);
      if (gi >= 0) {
        const j = col(x0);
        if (j >= 0) return { kind: 'G', i: gi, j };
      }
      const hi = rowHit(geo.hy, nc);
      if (hi >= 0) {
        const j = col(x0);
        if (j >= 0) return { kind: 'H', i: hi, j };
      }
      const my = geo.hy + nc * (cell + 6) + 34;
      if (y0 >= my && y0 <= my + cell - 4) {
        const j = col(x0);
        if (j >= 0 && j < k) return { kind: 'm', i: 0, j };
      }
      const ry = my + 2 * (cell + 34);
      if (y0 >= ry && y0 <= ry + cell - 4) {
        const j = col(x0);
        if (j >= 0) return { kind: 'r', i: 0, j };
      }
    }
    return null;
  }

  bindPointer(cv.canvas, {
    pick(x0, y0) { return hit(x0, y0) ? 'cell' : null; },
    hover(x0, y0) { cv.canvas.style.cursor = hit(x0, y0) ? 'pointer' : 'default'; },
    down(id, x0, y0) {
      const h = hit(x0, y0);
      if (!h) return;
      if (h.kind === 'G') G[h.i][h.j] = 1 - G[h.i][h.j];
      else if (h.kind === 'H') H[h.i][h.j] = 1 - H[h.i][h.j];
      else if (h.kind === 'm') m[h.j] = 1 - m[h.j];
      else if (h.kind === 'r') flips[h.j] = 1 - flips[h.j];
      draw();
    },
    move() {},
    up() {},
    leave() { cv.canvas.style.cursor = 'default'; },
  });

  bClear.addEventListener('click', () => { flips = new Array(n).fill(0); draw(); });
  bOne.addEventListener('click', () => { flips = flips.map((v, i) => (i === 0 ? 1 - v : 0)); draw(); });
  bReset.addEventListener('click', () => {
    G = fillFrom(DEF_G, k, n);
    H = fillFrom(DEF_H, nc, n);
    flips = new Array(n).fill(0);
    draw();
  });

  draw();
  cv.redraw = draw;
  return { destroy() {} };
}
