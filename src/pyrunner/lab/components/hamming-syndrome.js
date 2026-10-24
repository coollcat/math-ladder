/* =========================================================================
 * lab 组件：hamming-syndrome —— 三个哨兵怎么把「错了」变成「错在哪」
 * -------------------------------------------------------------------------
 * 用法（第 62 章《信道编码与差错控制回望》动手实验）：
 *   { "type": "hamming-syndrome", "title": "…" }
 * 字段（都可省）：data 四个信息位（'1011' 或数组，默认 '1011'）；
 *   height 画布高度（默认 470）。
 *
 * 演示什么：Hamming(7,4) 的七格里有三个校验位（位 1、2、4），
 *   p1 管 {1,3,5,7}、p2 管 {2,3,6,7}、p4 管 {4,5,6,7}。
 *   · 点任意一格 = 让噪声在第 i 位翻一面（再点一次收回）；
 *   · 三个哨兵组当场重算奇偶，拼成综合征 s4s2s1，直接读成十进制位号；
 *   · 翻一位：指针正好落在肇事格；翻两位：指针指向一个**无辜**的格子——
 *     这就是「纠错能力只有 t = ⌊(d_min−1)/2⌋ = 1」的现场，不是传说。
 * 取舍：只做 (7,4) 这一族，不开放改生成矩阵；综合征就是坐标这件事，
 *   比任何更大的码都更该先用眼睛看一遍。
 *
 * 交互（完美教具五问）：
 *   1. 动手量：直接点七格之一注入噪声；工具条还能「随机翻一位 / 翻两位 / 清空」。
 *   2. 即时后果：该格翻红、三个哨兵组的圈选下标与奇偶同时重算、指针移动。
 *   3. 读数：发送字 / 接收字 / 综合征 / 判决 / 取回数据，与正文第 4 节逐步算例逐项对齐。
 *   4. 啊哈预设：「翻两位」一键到达纠错失效现场，读数条写明「指到了没错的那一位」。
 *   5. 默认状态即课文例题：1011 → 0110011，零噪声，综合征 000。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildToolbar, buildReadout,
  mkBtn, label, arrow, clearBg, clamp,
} from '../core.js';

/* 三个哨兵组（位号 1..7）与坐落的信息位 */
const GROUPS = [
  { name: 'p1', bits: [1, 3, 5, 7], bit: 1, weight: 1 },
  { name: 'p2', bits: [2, 3, 6, 7], bit: 2, weight: 2 },
  { name: 'p4', bits: [4, 5, 6, 7], bit: 4, weight: 4 },
];
const DATA_POS = [3, 5, 6, 7];

export default function render(host, spec) {
  /* 信息位：接受 '1011' 或 [1,0,1,1] */
  const raw = spec.data === undefined ? '1011'
    : Array.isArray(spec.data) ? spec.data.map((b) => (Number(b) ? '1' : '0')).join('')
      : String(spec.data);
  const info = (raw.replace(/[^01]/g, '') + '1011').slice(0, 4).split('').map(Number);

  let noise = [];              /* 被噪声翻掉的位号（1..7） */
  let hover = 0;

  const cv = setupCanvas(host, clamp(spec.height || 470, 360, 900));
  const ro = buildReadout({ 发送码字: '—', 接收码字: '—', 综合征: '—', 判决: '—', 取回数据: '—' });
  host.appendChild(ro.box);

  const bOne = mkBtn('随机翻一位');
  const bTwo = mkBtn('翻两位（纠错失效）');
  const bClear = mkBtn('清空噪声');
  const bData = mkBtn('换一组信息位');
  host.appendChild(buildToolbar(bOne, bTwo, bClear, bData));

  /* 码字与综合征全部现算，不查表：课文里的 0110011 与 101 必须自己长出来 */
  function codeword() {
    const c = new Array(8).fill(0);
    DATA_POS.forEach((p, i) => { c[p] = info[i]; });
    GROUPS.forEach((g) => {
      let s = 0;
      g.bits.forEach((p) => { if (g.bit !== p) s ^= c[p]; });  /* 校验位自己先空着 */
      c[g.bit] = s;
    });
    return c;
  }

  function received() {
    const c = codeword().slice();
    noise.forEach((p) => { c[p] = c[p] ? 0 : 1; });
    return c;
  }

  function syndrome(r) {
    return GROUPS.map((g) => {
      let s = 0;
      g.bits.forEach((p) => { s ^= r[p]; });
      return s;
    });                                   /* [s1, s2, s4] */
  }

  let seed = 2026;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    const cw = codeword();
    const rv = received();
    const syn = syndrome(rv);
    const pos = syn[0] * 1 + syn[1] * 2 + syn[2] * 4;   /* s4s2s1 读成十进制 */
    const wrongCount = noise.length;
    const fixed = rv.slice();
    const okFix = pos > 0 && pos <= 7 && wrongCount === 1;
    if (pos > 0 && pos <= 7) fixed[pos] = fixed[pos] ? 0 : 1;
    const gotData = DATA_POS.map((p) => (okFix ? fixed[p] : rv[p])).join('');
    const wantData = info.join('');
    const correct = okFix ? gotData === wantData : (wrongCount === 0 && rv.join('') === cw.join(''));

    label(ctx, 'Hamming(7,4)：位 1、2、4 是哨兵，位 3、5、6、7 装数据。点任意一格 = 让噪声翻它一面',
      14, 20, C.axis, { size: 10.5 });

    /* ---- 七格 ---- */
    const wide = W >= 560;
    const cellW = Math.min(52, (W - 60) / 7 - 8);
    const gap = 8;
    const totalW = 7 * cellW + 6 * gap;
    const x0 = (W - totalW) / 2;
    const y0 = 44;
    const cellH = 46;
    const geo = [];

    for (let p = 1; p <= 7; p += 1) {
      const x = x0 + (p - 1) * (cellW + gap);
      const isP = GROUPS.some((g) => g.bit === p);
      const flipped = noise.indexOf(p) >= 0;
      geo.push({ p, x, y: y0, w: cellW, h: cellH });
      ctx.save();
      ctx.fillStyle = flipped ? C.bad : (isP ? C.named('orange') : C.named('blue'));
      ctx.globalAlpha = flipped ? 0.92 : 0.16;
      ctx.fillRect(x, y0, cellW, cellH);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = flipped ? C.bad : (isP ? C.named('orange') : C.named('blue'));
      ctx.lineWidth = hover === p ? 2.4 : 1.4;
      ctx.strokeRect(x, y0, cellW, cellH);
      ctx.restore();
      label(ctx, String(rv[p]), x + cellW / 2, y0 + cellH / 2 + 8, flipped ? '#ffffff' : C.fg,
        { size: 20, align: 'center', weight: 700 });
      label(ctx, '位 ' + p, x + cellW / 2, y0 - 4, C.axis, { size: 9, align: 'center' });
      label(ctx, isP ? 'p' : 'd', x + cellW / 2, y0 + cellH + 13, isP ? C.named('orange') : C.named('blue'),
        { size: 9.5, align: 'center', weight: 700 });
    }

    /* ---- 三个哨兵组 ---- */
    let gy = y0 + cellH + 34;
    GROUPS.forEach((g, gi) => {
      const s = syn[gi];
      label(ctx, g.name + ' 管 { ' + g.bits.join(', ') + ' }：奇偶 = ' + s,
        14, gy + 4, s ? C.bad : C.ok, { size: 11, weight: 700 });
      /* 圈出这一组覆盖的格 */
      g.bits.forEach((p) => {
        const it = geo[p - 1];
        ctx.save();
        ctx.strokeStyle = s ? C.bad : C.ok;
        ctx.globalAlpha = 0.8;
        ctx.lineWidth = 1.6;
        ctx.strokeRect(it.x - 2, it.y - 2 + gi * 3, it.w + 4, it.h + 4);
        ctx.restore();
      });
      gy += 22;
    });

    /* ---- 综合征 → 指针 ---- */
    const sy = gy + 16;
    label(ctx, '综合征 s4s2s1 = ' + syn[2] + syn[1] + syn[0] + ' = ' + pos + ' 号位',
      14, sy, pos ? C.bad : C.ok, { size: 13, weight: 700 });

    if (pos >= 1 && pos <= 7) {
      const t = geo[pos - 1];
      const ax = t.x + t.w / 2;
      const good = wrongCount === 1;
      arrow(ctx, ax, sy + 10, ax, y0 + cellH + 4, good ? C.ok : C.bad, 2, 8);
      label(ctx, good ? '确实错在这里' : '这里没错！', ax, sy + 26, good ? C.ok : C.bad,
        { size: 10.5, align: 'center', weight: 700 });
    } else if (wrongCount > 0) {
      label(ctx, '综合征为 000：算上去一切自洽，错误隐身了', 14, sy + 20, C.bad, { size: 10.5 });
    }

    /* ---- 账本 ---- */
    const bx = wide ? W - Math.min(268, W * 0.42) : 14;
    let by = sy + (wide ? 34 : 48);
    const line = 17;
    label(ctx, '发送 ' + cw.slice(1, 8).join(''), bx, by, C.fg, { size: 11 });
    by += line;
    label(ctx, '接收 ' + rv.slice(1, 8).join('') + (wrongCount ? '（翻 ' + wrongCount + ' 位）' : '（无噪声）'),
      bx, by, wrongCount ? C.bad : C.ok, { size: 11 });
    by += line;
    label(ctx, '取回数据 ' + gotData + (correct ? ' ✓' : ' ✗ 应为 ' + wantData), bx, by,
      correct ? C.ok : C.bad, { size: 11, weight: 700 });
    by += line + 2;
    if (wrongCount === 0) label(ctx, '零噪声：哨兵全平账，综合征 000', bx, by, C.axis, { size: 10 });
    else if (wrongCount === 1) label(ctx, '一位错：综合征直读肇事位号，翻回去即可', bx, by, C.ok, { size: 10 });
    else label(ctx, '两位错：综合征指向第三位，越修越花', bx, by, C.bad, { size: 10 });

    ro.set('发送码字', cw.slice(1, 8).join(''));
    ro.set('接收码字', rv.slice(1, 8).join(''));
    ro.set('综合征', syn[2] + syn[1] + syn[0] + '（' + pos + ' 号位）');
    ro.set('判决', wrongCount === 0 ? '无错可纠'
      : wrongCount === 1 ? '翻正第 ' + pos + ' 位'
        : '越界：翻两位时指向无辜的第 ' + pos + ' 位');
    ro.set('取回数据', gotData + (correct ? '（与原数据一致）' : '（与原数据 ' + wantData + ' 不符）'));
  }

  bindPointer(cv.canvas, {
    pick(x, y) {
      const hit = geoPick(x, y);
      return hit || null;
    },
    down(id) { toggle(id); },
    move(id, x, y) {
      const hit = geoPick(x, y);
      if (hit && hit !== id) { toggle(id); toggle(hit); }
    },
    hover(x, y) {
      const hit = geoPick(x, y);
      if (hit !== hover) { hover = hit || 0; draw(); }
    },
    up() { hover = 0; draw(); },
  });

  /* geo 在 draw() 里重建，指针命中直接按几何现算，避免闭包拿到旧表 */
  function geoPick(x, y) {
    const cw2 = cv.W;
    const cellW = Math.min(52, (cw2 - 60) / 7 - 8);
    const gap2 = 8;
    const totalW2 = 7 * cellW + 6 * gap2;
    const x0b = (cw2 - totalW2) / 2;
    const y0b = 44;
    if (y < y0b || y > y0b + 46) return null;
    for (let p = 1; p <= 7; p += 1) {
      const xa = x0b + (p - 1) * (cellW + gap2);
      if (x >= xa - 2 && x <= xa + cellW + 2) return p;
    }
    return null;
  }

  function toggle(p) {
    const i = noise.indexOf(p);
    if (i >= 0) noise.splice(i, 1);
    else noise.push(p);
    draw();
  }

  bOne.addEventListener('click', () => {
    noise = [1 + Math.floor(rnd() * 7)];
    draw();
  });
  bTwo.addEventListener('click', () => {
    const first = 1 + Math.floor(rnd() * 7);
    let second = 1 + Math.floor(rnd() * 7);
    let guard = 0;
    while (second === first && guard < 20) { second = 1 + Math.floor(rnd() * 7); guard += 1; }
    noise = [first, second];
    draw();
  });
  bClear.addEventListener('click', () => { noise = []; draw(); });
  bData.addEventListener('click', () => {
    for (let i = 0; i < 4; i += 1) info[i] = rnd() < 0.5 ? 0 : 1;
    noise = [];
    draw();
  });

  draw();
  cv.redraw = draw;
  return { destroy() { cv.redraw = null; } };
}
