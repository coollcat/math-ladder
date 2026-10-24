/* =========================================================================
 * lab 组件：flash-attention-tiling —— 那张 n×n 矩阵到底占多少显存
 * -------------------------------------------------------------------------
 * 用法（第 47 章《Flash Attention》）：
 *
 *   { "type": "flash-attention-tiling", "title": "同一份注意力，两种存法", "n": 4096, "B": 256, "d": 64 }
 *
 * 字段（都可省，走滑块默认）：
 *   n      序列长度（512..8192，步长 512，默认 4096）
 *   B      分块大小（32..512，步长 32，默认 256）
 *   d      头维度（16..128，步长 16，默认 64）
 *   height 画布高度，默认 340
 *
 * 演示什么：
 *   · 上半幅：标准注意力——整张 n×n 的分数矩阵必须落在 HBM 里，格子满屏。
 *   · 下半幅：Flash——SRAM 里只有一个 B 宽的条带，沿 K 块滑过去，
 *     滑过的格子算完就丢。橙色条带就是「片上缓存」。
 *   · 拖条带（或点格子）选当前处理到哪个 K 块，读数给出此刻的峰值占用。
 *   · 「n 翻倍」保持 B、d 不动：标准显存涨到 4 倍，而 Flash 峰值 — 一个字节都不涨，
 *     它只由 B 和 d 决定。这就是 $O(n^2)$ 与 $O(1)$（对 n 而言）的分野。
 *
 * 完美教具五问：
 *   1 动手量：n（序列长度）、B（块大小）、d（头维度），以及条带位置——
 *     前三个是分块策略里真正的自由参数，条带位置是遍历顺序。
 *   2 即时后果：格子密度、条带宽度、两根显存条一帧内跟着变。
 *   3 读数：标准峰值显存 / Flash 峰值占用 / 压缩倍数 / 搬运比，
 *     公式在下面注释里逐条写明，与正文表格的 $O(n^2)$ 对 $O(n)$ 一致。
 *   4 啊哈预设：「n 翻倍」一键看出标准涨 4 倍 Flash 纹丝不动；「块减半」看条带变窄
 *     但 T 翻倍、K/V 要多搬一遍——省内存不是白来的（搬运比读数会掉）。
 *   5 默认状态：n=4096、B=256、d=64 时标准 64.00 MB、Flash 0.375 MB，
 *     差 171 倍，搬运量差 4.03 倍（实跑核对的数，读数与之一致）。
 *
 * 口径说明（与正文一致，正文表格用的就是这套）：
 *   标准峰值显存  = 4·n²            字节（n×n 个 float32 的 S 矩阵）
 *   Flash 峰值    = 4·B·(2d + B)    字节（一块 K + 一块 V + 一块 B×B 的 S；与 n 无关）
 *   HBM 搬运量    = 标准 4n² + 2nd，Flash 4·T·n·d（T = ⌈n/B⌉ 个 Q 块各扫一遍 K/V）
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, mergeSpec, buildReadout, buildToolbar,
  mkBtn, setSliderRow, label, clamp, fmt, bindPointer,
} from '../core.js';

const BASE = [
  { name: 'n', label: '序列长度 n', min: 512, max: 8192, step: 512, value: 4096 },
  { name: 'B', label: '块大小 B', min: 32, max: 512, step: 32, value: 256 },
  { name: 'd', label: '头维度 d', min: 16, max: 128, step: 16, value: 64 },
];

const MAXCELL = 12;   /* 画面上最多画 12×12 格，超出的用「T×T」文字交代，避免糊成一片 */

function mb(bytes) {
  return bytes / (1024 * 1024);
}

export default function render(host, spec) {
  const H = clamp(spec.height || 340, 260, 560);
  const sliders = buildSliders({ sliders: mergeSpec(BASE, spec) }, () => { syncCursor(); draw(); });
  const S = () => sliders.state;

  const ro = buildReadout({
    '块数 T': '—',
    '标准峰值显存': '—',
    'Flash 峰值': '—',
    '压缩倍数': '—',
    'HBM 搬运比': '—',
  });
  host.appendChild(ro.box);

  const bDouble = mkBtn('n 翻倍');
  const bHalf = mkBtn('块减半');
  const bReset = mkBtn('重置');
  host.appendChild(buildToolbar(bDouble, bHalf, bReset));

  const hint = document.createElement('div');
  hint.className = 'ml-lab__hint';
  hint.textContent = '上面那张满是格子的矩阵就是要被塞进 HBM 的东西；下面橙色条带是 SRAM 里的块，拖它沿 K 方向走。';
  host.appendChild(hint);

  const cv = setupCanvas(host, H);
  const geo = {};
  let cursor = 0;   /* 当前处理到第几个 K 块 */

  function stats() {
    const n = Math.round(S().n);
    const B = Math.round(S().B);
    const d = Math.round(S().d);
    const T = Math.ceil(n / B);
    const stdBytes = 4 * n * n;
    const flashBytes = 4 * B * (2 * d + B);
    const stdTraffic = 4 * n * n + 2 * n * d;
    const flashTraffic = 4 * T * n * d;
    return { n, B, d, T, stdBytes, flashBytes, stdTraffic, flashTraffic };
  }

  function syncCursor() {
    const { T } = stats();
    cursor = clamp(cursor, 0, Math.max(T - 1, 0));
  }

  function draw() {
    const { n, B, d, T, stdBytes, flashBytes, stdTraffic, flashTraffic } = stats();
    const ctx = cv.ctx;
    const W = cv.W;
    const C = themeColors();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    const padL = 12;
    const boxW = Math.min(W - padL * 2, 380);
    const topY = 26;
    const topH = Math.round((H - 110) * 0.58);
    const botY = topY + topH + 44;
    const botH = Math.max(46, H - botY - 34);
    const cells = Math.min(T, MAXCELL);
    const cw = boxW / cells;

    /* ---- 上：标准注意力，整张矩阵进 HBM ---- */
    label(ctx, '标准：$S = QK^T$ 整张落 HBM（' + T + '×' + T + ' 块）', padL, topY - 8, C.fg, { size: 12, weight: 600 });
    for (let r = 0; r < cells; r += 1) {
      for (let c = 0; c < cells; c += 1) {
        const x = padL + c * cw;
        const y = topY + r * (topH / cells);
        ctx.fillStyle = C.named('blue');
        ctx.globalAlpha = 0.18 + 0.10 * ((r + c) % 3);
        ctx.fillRect(x + 0.5, y + 0.5, cw - 1, topH / cells - 1);
        ctx.globalAlpha = 1;
      }
    }
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(padL, topY, boxW, topH);

    /* ---- 下：Flash，SRAM 里只有一条 B 宽的带 ---- */
    const stripH = Math.min(30, Math.max(18, botH * 0.4));
    label(ctx, 'Flash：SRAM 里只留一块，沿 K 块滑过去', padL, botY - 8, C.fg, { size: 12, weight: 600 });
    /* K 块下标 cursor 落在哪个格子上：格数被 MAXCELL 压过，按比例折算 */
    const cellOf = (idx) => Math.round((idx / Math.max(T - 1, 1)) * Math.max(cells - 1, 0));
    for (let c = 0; c < cells; c += 1) {
      const x = padL + c * cw;
      const on = c === cellOf(cursor);
      ctx.fillStyle = on ? C.named('orange') : C.soft;
      ctx.fillRect(x + 1, botY, cw - 2, stripH);
    }
    ctx.strokeStyle = C.axis;
    ctx.strokeRect(padL, botY, boxW, stripH);

    /* 条带下面三个框＝此刻 SRAM 里同时驻留的东西：一块 K、一块 V、一块 B×B 的 S */
    const slots = ['K 块', 'V 块', 'S 块'];
    slots.forEach((s, i) => {
      const w = (boxW - 8) / 3;
      const x = padL + 4 + i * w;
      const y = botY + stripH + 10;
      ctx.fillStyle = i === 1 ? C.named('orange') : C.named('teal');
      ctx.globalAlpha = 0.28;
      ctx.fillRect(x + 1, y, w - 4, 28);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(x + 1, y, w - 4, 28);
      label(ctx, s + ' ' + (i === 2 ? B + '×' + B : B + '×' + d), x + w / 2 - 2, y + 18, C.fg, { size: 10.5, weight: 600, align: 'center' });
    });

    /* ---- 右侧：两根显存条按对数刻度对比 ---- */
    const barX = padL + boxW + 18;
    const barW = Math.max(W - barX - 12, 60);
    if (barW > 70) {
      const maxV = Math.max(stdBytes, flashBytes);
      const rows = [
        { name: '标准', v: stdBytes, col: C.named('red') },
        { name: 'Flash', v: flashBytes, col: C.named('green') },
      ];
      rows.forEach((row, i) => {
        const y = topY + 12 + i * 52;
        const w = Math.max((row.v / maxV) * barW, 2);
        ctx.fillStyle = row.col;
        ctx.globalAlpha = 0.75;
        ctx.fillRect(barX, y, w, 18);
        ctx.globalAlpha = 1;
        label(ctx, row.name + ' ' + fmt(mb(row.v), 2) + ' MB', barX, y - 3, C.fg, { size: 10.5, weight: 600 });
      });
      label(ctx, '峰值显存', barX, topY - 8, C.fg, { size: 12, weight: 600 });
    }

    /* 底注：把「一块」和「整张」的倍数写清楚 */
    label(ctx,
      '同一份注意力：' + fmt(stdBytes / Math.max(flashBytes, 1), 0) + ' 倍显存差 · 搬运量 ' + fmt(stdTraffic / Math.max(flashTraffic, 1), 2) + ' 倍',
      padL, H - 8, C.axis, { size: 11 });

    geo.padL = padL;
    geo.boxW = boxW;
    geo.botY = botY;
    geo.botH = botH;
    geo.cells = cells;

    ro.set('块数 T', String(T));
    ro.set('标准峰值显存', fmt(mb(stdBytes), 2) + ' MB');
    ro.set('Flash 峰值', fmt(mb(flashBytes), 3) + ' MB');
    ro.set('压缩倍数', fmt(stdBytes / Math.max(flashBytes, 1), 0) + '×');
    ro.set('HBM 搬运比', fmt(stdTraffic / Math.max(flashTraffic, 1), 2) + '×');
  }

  /* 拖条带选 K 块。指针换算提到模块内的 moveCursor，绝不在回调里裸调兄弟方法
     （SPEC §4：对象方法简写里裸调 move() 会 ReferenceError）。 */
  function moveCursor(x) {
    const t = clamp((x - geo.padL) / Math.max(geo.boxW, 1), 0, 1);
    const { T } = stats();
    cursor = Math.round(t * Math.max(T - 1, 0));
    draw();
  }

  bindPointer(cv.canvas, {
    pick(x, y) {
      if (!geo.boxW) return null;
      if (y < geo.botY - 8 || y > geo.botY + geo.botH + 8) return null;
      if (x < geo.padL || x > geo.padL + geo.boxW) return null;
      return 'strip';
    },
    move(id, x) {
      moveCursor(x);
    },
    down(id, x) {
      moveCursor(x);
    },
  });

  bDouble.addEventListener('click', () => {
    const n2 = clamp(Math.round(S().n * 2), 512, 8192);
    setSliderRow(sliders, 0, n2, undefined, 'n');
    syncCursor();
    draw();
  });
  bHalf.addEventListener('click', () => {
    const B2 = clamp(Math.round(S().B / 2), 32, 512);
    setSliderRow(sliders, 1, B2, undefined, 'B');
    syncCursor();
    draw();
  });
  bReset.addEventListener('click', () => {
    setSliderRow(sliders, 0, 4096, undefined, 'n');
    setSliderRow(sliders, 1, 256, undefined, 'B');
    setSliderRow(sliders, 2, 64, undefined, 'd');
    cursor = 0;
    draw();
  });

  syncCursor();
  draw();
  cv.redraw = draw;

  return {
    slidersBox: sliders.box,
    destroy() {
      cv.redraw = null;
    },
  };
}
