/* =========================================================================
 * lab 组件：code-hamming-sphere —— 给「差几位」造一把尺子
 * -------------------------------------------------------------------------
 * 用法（第 35 章《Hamming 距离》动手实验）：
 *   { "type": "code-hamming-sphere", "title": "…" }
 * 字段（都可省）：n 码长 2–4（默认 3）；x / y 两个初始串（0/1 数组）；
 *   t 初始半径（默认 1）；height 画布高度（默认 520）。
 *
 * 一屏两本账：
 *   · 左边上下两条位带，点任意一位就翻转它；不同的位之间打星号，并给出 d(x,y)；
 *   · 右边是全部 2^n 个串的距离矩阵，第 i 行第 j 列 = d(word_i, word_j)。
 *     把 x 那一行、y 那一列描边；点任一格可把 x / y 直接挪过去。
 *   · 半径 t 的球：数出「与 x 距离 ≤ t」的串有几个，并与 Σ C(n,i) 对拍。
 * 「逐圈扩张」让 t 从 0 长到 n，球是一圈一圈厚的——这是距离的离散本性。
 *
 * 取舍：状态只有 x / y / t 三个变量，全部由指针与播放器直接改，不做快照；
 *   矩阵每帧重算 8×8（或 16×16）次比较，代价可以忽略。
 * ========================================================================= */

import {
  themeColors, setupCanvas, anim, buildToolbar, buildReadout, bindPointer,
  mkBtn, label, clamp, clearBg,
} from '../core.js';

/* 全部 n 位串，按字典序（000,001,010,…）：下标就是二进制读法 */
function wordsOf(n) {
  const out = [];
  for (let k = 0; k < (1 << n); k += 1) {
    const w = [];
    for (let i = n - 1; i >= 0; i -= 1) w.push((k >> i) & 1);
    out.push(w);
  }
  return out;
}

/* 逐位比较，数不同的位置 */
function ham(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) d += 1;
  return d;
}

/* 二项式系数 C(n,k)：半径 t 的球体积公式里要用 */
function binom(n, k) {
  let r = 1;
  for (let i = 1; i <= k; i += 1) r = (r * (n - k + i)) / i;
  return Math.round(r);
}

export default function render(host, spec) {
  const n = clamp(Math.round(spec.n || 3), 2, 4);
  const WORDS = wordsOf(n);
  const N = WORDS.length;
  const norm = (v) => (Array.isArray(v) && v.length === n ? v.map((b) => (Number(b) ? 1 : 0)) : null);

  let x = norm(spec.x) || WORDS[0].slice();
  let y = norm(spec.y) || WORDS[N - 1].slice();
  let t = clamp(Math.round(spec.t === undefined ? 1 : spec.t), 0, n);

  const cv = setupCanvas(host, spec.height || 520);
  const ro = buildReadout({
    'd(x,y)': '—',
    '不同位': '—',
    '半径 t': '—',
    '球内字数': '—',
    '公式 ΣC(n,i)': '—',
  });
  host.appendChild(ro.box);

  const bSwap = mkBtn('交换 x / y');
  const bNot = mkBtn('y 整体取反');
  const bZero = mkBtn('半径归零');
  host.appendChild(buildToolbar(bSwap, bNot, bZero));

  const geo = { bw: 34, bx: 40, by: 52, mx: 0, my: 0, cell: 20, wide: false, N };

  function layout(W, Hh) {
    const pad = 14;
    const wide = W >= 620;
    geo.wide = wide;
    if (wide) {
      const matMax = Math.min(W * 0.46, Hh - 120);
      geo.cell = Math.max(10, Math.floor(matMax / N));
      const matW = geo.cell * N;
      geo.mx = W - pad - matW;
      geo.my = 96;
      geo.bx = pad + 30;
      geo.bw = Math.max(24, Math.min(46, Math.floor((geo.mx - pad - 60) / n)));
      geo.by = 56;
    } else {
      const avail = Math.max(120, Hh - 250);
      geo.cell = Math.max(9, Math.min(Math.floor((W - 2 * pad - 16) / N), Math.floor(avail / N)));
      geo.mx = pad + 22;
      geo.my = Hh - geo.cell * N - 16;
      geo.bx = pad + 30;
      geo.bw = Math.max(24, Math.min(46, Math.floor((W - 2 * pad - 70) / n)));
      geo.by = 52;
    }
  }

  function drawStrip(bits, ytop, color, name, C) {
    const ctx = cv.ctx;
    const s = geo.bw;
    label(ctx, name, geo.bx - 12, ytop + s * 0.7, color, { size: 14, weight: 700, align: 'right' });
    for (let i = 0; i < n; i += 1) {
      const cx = geo.bx + i * s;
      ctx.save();
      ctx.fillStyle = bits[i] ? color : C.soft;
      ctx.globalAlpha = bits[i] ? 0.9 : 0.75;
      ctx.fillRect(cx, ytop, s - 3, s - 3);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.strokeRect(cx + 0.5, ytop + 0.5, s - 4, s - 4);
      ctx.restore();
      label(ctx, String(bits[i]), cx + (s - 3) / 2, ytop + s * 0.66,
        bits[i] ? C.bg : C.fg, { size: Math.round(s * 0.48), align: 'center', weight: 700 });
    }
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const Hh = cv.H;
    clearBg(ctx, W, Hh, C);
    layout(W, Hh);
    const s = geo.bw;

    label(ctx, '位带（点任意一位就翻转它）', geo.bx, 24, C.axis, { size: 11 });
    drawStrip(x, geo.by, C.named('blue'), 'x', C);
    drawStrip(y, geo.by + s + 30, C.named('orange'), 'y', C);

    const d = ham(x, y);
    for (let i = 0; i < n; i += 1) {
      if (x[i] !== y[i]) {
        label(ctx, '∗', geo.bx + i * s + (s - 3) / 2, geo.by + s * 2 + 22,
          C.bad, { size: 17, align: 'center', weight: 700 });
      }
    }
    label(ctx, 'd(x, y) = ' + d, geo.bx, geo.by + s * 2 + 50, C.fg, { size: 16, weight: 700 });
    label(ctx, '∗ 标出的是「不同」的位，只数位置不数大小', geo.bx, geo.by + s * 2 + 68, C.axis, { size: 10.5 });

    /* ---- 距离矩阵 ---- */
    const cell = geo.cell;
    const Nn = N;
    label(ctx, '距离矩阵：行 = 左边的串，列 = 上边的串（悬停读数 / 点格换串）', geo.mx, geo.my - 34, C.axis, { size: 10.5 });
    for (let i = 0; i < Nn; i += 1) {
      for (let j = 0; j < Nn; j += 1) {
        const dd = ham(WORDS[i], WORDS[j]);
        const cx = geo.mx + j * cell;
        const cy = geo.my + i * cell;
        ctx.save();
        if (dd === 0) {
          ctx.fillStyle = C.ok;
          ctx.globalAlpha = 0.55;
        } else {
          ctx.fillStyle = C.accent;
          ctx.globalAlpha = 0.08 + (dd / n) * 0.5;
        }
        ctx.fillRect(cx, cy, cell - 1, cell - 1);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = C.bg;
        ctx.lineWidth = 0.6;
        ctx.strokeRect(cx + 0.5, cy + 0.5, cell - 2, cell - 2);
        ctx.restore();
        if (cell >= 20) {
          label(ctx, String(dd), cx + cell / 2 - 0.5, cy + cell * 0.68,
            dd === 0 ? C.bg : C.fg, { size: Math.min(12, cell * 0.5), align: 'center', weight: dd === 0 ? 700 : 400 });
        }
      }
    }

    /* x 那一行 / y 那一列描边（用下标定位，串可能重复出现——这里全枚举，必唯一） */
    const ix = WORDS.findIndex((w) => ham(w, x) === 0);
    const iy = WORDS.findIndex((w) => ham(w, y) === 0);
    ctx.save();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = C.named('blue');
    ctx.strokeRect(geo.mx - 2, geo.my + ix * cell - 2, cell * Nn + 4, cell + 4);
    ctx.strokeStyle = C.named('orange');
    ctx.strokeRect(geo.mx + iy * cell - 2, geo.my - 2, cell + 4, cell * Nn + 4);
    if (ix >= 0 && iy >= 0) {
      ctx.strokeStyle = C.fg;
      ctx.lineWidth = 2;
      ctx.strokeRect(geo.mx + iy * cell - 3, geo.my + ix * cell - 3, cell + 6, cell + 6);
    }
    ctx.restore();

    /* 半径 t 的球：数一数 x 的 t 邻域装了多少串 */
    let inBall = 0;
    for (let j = 0; j < Nn; j += 1) if (ham(x, WORDS[j]) <= t) inBall += 1;
    let theory = 0;
    for (let i = 0; i <= Math.min(t, n); i += 1) theory += binom(n, i);

    const ly = geo.my + cell * Nn + 22;
    label(ctx, '半径 t = ' + t + ' 的球：' + inBall + ' 个串', geo.mx, ly, C.fg, { size: 12, weight: 700 });
    label(ctx, '公式 Σ_{i=0}^{t} C(n,i) = ' + theory + (inBall === theory ? '（一致）' : '（不一致！）'),
      geo.mx, ly + 17, inBall === theory ? C.ok : C.bad, { size: 11 });

    /* 球体柱状：每个距离层各有几个串 */
    const hist = [];
    for (let i = 0; i <= n; i += 1) hist.push(0);
    for (let j = 0; j < Nn; j += 1) hist[ham(x, WORDS[j])] += 1;
    const bx0 = geo.mx;
    const bw0 = Math.min(cell * Nn, (geo.wide ? geo.mx - 40 : W - 40) - bx0);
    const step = bw0 / (n + 1);
    label(ctx, 'x 的距离分布（≥t 的部分就是球外）', bx0, ly + 38, C.axis, { size: 10 });
    for (let i = 0; i <= n; i += 1) {
      const h = 34 * (hist[i] / Math.max(1, Nn));
      const cx = bx0 + i * step + 3;
      ctx.fillStyle = i <= t ? C.named('green') : C.named('gray');
      ctx.globalAlpha = 0.85;
      ctx.fillRect(cx, ly + 78 - h, step - 6, h);
      ctx.globalAlpha = 1;
      label(ctx, String(hist[i]), cx + (step - 6) / 2, ly + 92, C.axis, { size: 9.5, align: 'center' });
      label(ctx, String(i), cx + (step - 6) / 2, ly + 105, i <= t ? C.ok : C.axis, { size: 9.5, align: 'center' });
    }

    ro.set('d(x,y)', String(d));
    ro.set('不同位', x.map((v, i) => (v !== y[i] ? i + 1 : '')).filter(Boolean).join('、') || '（无）');
    ro.set('半径 t', t + ' / ' + n);
    ro.set('球内字数', String(inBall));
    ro.set('公式 ΣC(n,i)', String(theory));
  }

  /* 指针命中：先看位带，再看矩阵。两者都不中就把 hover 清掉。 */
  let hover = null;
  function hit(x0, y0) {
    const s = geo.bw;
    const inStrip = (ytop) => x0 >= geo.bx && x0 < geo.bx + s * n && y0 >= ytop && y0 < ytop + s;
    if (inStrip(geo.by)) return { kind: 'x', i: Math.floor((x0 - geo.bx) / s) };
    if (inStrip(geo.by + s + 30)) return { kind: 'y', i: Math.floor((x0 - geo.bx) / s) };
    const j = Math.floor((x0 - geo.mx) / geo.cell);
    const i = Math.floor((y0 - geo.my) / geo.cell);
    if (j >= 0 && j < N && i >= 0 && i < N) return { kind: 'm', i, j };
    return null;
  }

  bindPointer(cv.canvas, {
    pick(x0, y0) { return hit(x0, y0) ? 'main' : null; },
    hover(x0, y0) {
      const h = hit(x0, y0);
      const key = h ? h.kind + h.i + (h.j === undefined ? '' : h.j) : '';
      cv.canvas.style.cursor = h ? 'pointer' : 'default';
      if (h && h.kind === 'm') {
        ro.set('不同位', 'd(' + WORDS[h.i].join('') + ', ' + WORDS[h.j].join('') + ') = ' + ham(WORDS[h.i], WORDS[h.j]));
      }
      if (key !== hover) hover = key;
    },
    leave() { hover = null; cv.canvas.style.cursor = 'default'; draw(); },
    down(id, x0, y0) {
      const h = hit(x0, y0);
      if (!h) return;
      if (h.kind === 'x') x[h.i] = 1 - x[h.i];
      else if (h.kind === 'y') y[h.i] = 1 - y[h.i];
      else { x = WORDS[h.i].slice(); y = WORDS[h.j].slice(); }
      draw();
    },
    move() {},
    up() { draw(); },
  });

  bSwap.addEventListener('click', () => { const tmp = x; x = y; y = tmp; draw(); });
  bNot.addEventListener('click', () => { y = y.map((b) => 1 - b); draw(); });
  bZero.addEventListener('click', () => { t = 0; draw(); });

  let acc = 0;
  const player = anim(host, {
    onTick(dt) {
      acc += dt;
      if (acc < 0.7) return;
      acc = 0;
      t = t >= n ? 0 : t + 1;
      draw();
    },
    onReset() { t = 0; acc = 0; draw(); },
  });

  draw();
  cv.redraw = draw;
  return { destroy() { player.stop(); } };
}
