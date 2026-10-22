/* =========================================================================
 * lab 组件：code-hamming74-syndrome —— 校验子当场变成门牌号
 * -------------------------------------------------------------------------
 * 用法（第 35 章《Hamming(7,4) 码》动手实验）：
 *   { "type": "code-hamming74-syndrome", "title": "…" }
 * 字段（都可省）：data 四个数据位（默认 1,0,1,1，抄课文例题）；
 *   flip 初始注入的错误位（1 起址，0 = 不注错）；height 画布高度（默认 560）。
 *
 * 七位码字按「位置 1..7」排开（p1 p2 d1 p4 d2 d3 d4），点任意一位就翻转它。
 * 三条奇偶方程各管一组位置，逐条点亮 s1 / s2 / s4；
 *   · 单错时 s = s1 + 2s2 + 4s4 恰好等于出错位的位置号——门牌号当场兑现；
 *   · 双错时地址同样算得出来，但它指向的是「第三个位」——本组件会在下方
 *     明确写下「此刻地址不可信」，不假装能纠。
 * 右图把 1..7 的位置编号与三位二进制并排，让「编号 = 校验子」一眼对上。
 *
 * 取舍：只演示标准 (7,4) 布局，不开放改矩阵（那是上一课的事）；
 *   方程为模 2，全部现算。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildToolbar, buildReadout, bindPointer,
  mkBtn, label, clearBg, clamp,
} from '../core.js';

/* 三条方程检查的位置下标（0 起址，对应位置号 1..7） */
const ROWS = [
  { name: 's1', pos: [1, 3, 5, 7] },
  { name: 's2', pos: [2, 3, 6, 7] },
  { name: 's4', pos: [4, 5, 6, 7] },
];

export default function render(host, spec) {
  const data = Array.isArray(spec.data) && spec.data.length === 4
    ? spec.data.map((b) => (Number(b) ? 1 : 0))
    : [1, 0, 1, 1];
  let code = encode(data);
  const flip0 = clamp(Math.round(spec.flip === undefined ? 6 : spec.flip), 0, 7);
  let flips = new Array(7).fill(0);
  if (flip0) flips[flip0 - 1] = 1;

  const cv = setupCanvas(host, spec.height || 560);
  const ro = buildReadout({
    码字: '—',
    接收块: '—',
    校验子: '—',
    '地址 s': '—',
    判决: '—',
  });
  host.appendChild(ro.box);

  const bNoErr = mkBtn('清空注错');
  const bOne = mkBtn('随机注 1 位');
  const bTwo = mkBtn('随机注 2 位');
  host.appendChild(buildToolbar(bNoErr, bOne, bTwo));

  function encode(d) {
    const p1 = (d[0] + d[1] + d[3]) % 2;
    const p2 = (d[0] + d[2] + d[3]) % 2;
    const p4 = (d[1] + d[2] + d[3]) % 2;
    return [p1, p2, d[0], p4, d[1], d[2], d[3]];
  }

  const geo = { x0: 0, y0: 0, cell: 0, wide: false, W: 0, H: 0, rx: 0 };

  function layout(W, Hh) {
    const wide = W >= 640;
    geo.wide = wide;
    geo.W = W;
    geo.H = Hh;
    geo.cell = clamp(Math.floor((Math.min(W, wide ? W * 0.62 : W) - 90) / 7), 26, 52);
    geo.x0 = 56;
    geo.y0 = 84;
    geo.rx = wide ? Math.min(W * 0.66, geo.x0 + 7 * geo.cell + 34) : 56;
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const Hh = cv.H;
    clearBg(ctx, W, Hh, C);
    layout(W, Hh);
    const cell = geo.cell;

    const received = code.map((b, i) => b ^ flips[i]);
    const s = ROWS.map((row) => {
      let t = 0;
      row.pos.forEach((p) => { t += received[p - 1]; });
      return t % 2;
    });
    const address = s[0] + 2 * s[1] + 4 * s[2];
    const errCount = flips.reduce((a, b) => a + b, 0);

    label(ctx, 'Hamming(7,4) 七位码字：位置号写在格子上方，点任意一位就翻转', 16, 26, C.fg, { size: 12.5, weight: 700 });
    label(ctx, '角色：p1 p2 d1 p4 d2 d3 d4——三条方程分别检查编号含 1、2、4 的位置', 16, 46, C.axis, { size: 10.5 });

    const roles = ['p1', 'p2', 'd1', 'p4', 'd2', 'd3', 'd4'];
    for (let i = 0; i < 7; i += 1) {
      const x = geo.x0 + i * cell;
      const y = geo.y0;
      const isFlip = flips[i] === 1;
      label(ctx, String(i + 1), x + cell / 2, y - 22, C.axis, { size: 11, align: 'center' });
      label(ctx, i + 1 < 8 ? (i + 1).toString(2).padStart(3, '0') : '', x + cell / 2, y - 8, C.axis,
        { size: 9, align: 'center' });
      ctx.save();
      ctx.fillStyle = isFlip ? C.bad : (received[i] ? C.named('blue') : C.soft);
      ctx.globalAlpha = isFlip ? 0.9 : (received[i] ? 0.85 : 0.6);
      ctx.fillRect(x, y, cell - 4, cell - 4);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, cell - 5, cell - 5);
      ctx.restore();
      label(ctx, String(received[i]), x + (cell - 4) / 2, y + cell * 0.62,
        received[i] || isFlip ? C.bg : C.fg, { size: Math.round(cell * 0.44), align: 'center', weight: 700 });
      label(ctx, roles[i], x + cell / 2, y + cell + 13, i === 0 || i === 1 || i === 3 ? C.named('orange') : C.axis,
        { size: 9.5, align: 'center' });
      if (isFlip) label(ctx, '×', x + cell / 2, y + cell + 26, C.bad, { size: 10, align: 'center' });
    }

    /* ---- 三条方程 ---- */
    let py = geo.y0 + cell + 52;
    label(ctx, '三条奇偶方程（每一位被几条方程检查，就出现在几行里）', 16, py - 12, C.fg, { size: 12, weight: 700 });
    ROWS.forEach((row, i) => {
      const parts = row.pos.map((p) => received[p - 1]);
      const expr = row.pos.map((p) => p).join('+');
      label(ctx, row.name + '：位 ' + expr + ' = ' + parts.join('+') + ' ≡ ' + s[i],
        24, py + i * 22, s[i] ? C.bad : C.ok, { size: 11.5, weight: s[i] ? 700 : 400 });
    });
    py += ROWS.length * 22 + 12;

    const expr = s[0] + ' + 2×' + s[1] + ' + 4×' + s[2] + ' = ' + address;
    label(ctx, '地址 s = ' + expr, 24, py, C.fg, { size: 13.5, weight: 700 });
    py += 22;
    if (address === 0) {
      label(ctx, 's = 0：通过全部三条检查', 24, py, C.ok, { size: 12, weight: 700 });
      py += 18;
      label(ctx, '（可能是真的没错，也可能是偶数个错互相抵消）', 24, py, C.axis, { size: 10.5 });
    } else if (errCount === 1) {
      label(ctx, 's = ' + address + '：恰好指向第 ' + address + ' 位 —— 翻回来即可', 24, py, C.ok,
        { size: 12, weight: 700 });
      py += 18;
      label(ctx, '单错时地址 = 出错位置，这正是 Hamming 的设计', 24, py, C.axis, { size: 10.5 });
    } else {
      label(ctx, '注入了 ' + errCount + ' 个错：地址 ' + address + ' 此刻不可信', 24, py, C.bad,
        { size: 12, weight: 700 });
      py += 18;
      label(ctx, '它可能指向一个根本没出错的位——纠错半径只有 1 位', 24, py, C.axis, { size: 10.5 });
    }

    /* ---- 右（下）方：位置号 ↔ 二进制 对照 ---- */
    const rx = geo.rx;
    let ry = geo.wide ? 84 : py + 34;
    label(ctx, '门牌号对照表', rx, ry - 12, C.fg, { size: 12, weight: 700 });
    for (let p = 1; p <= 7; p += 1) {
      const bits = [1, 2, 4].map((w) => ((p & w) ? 1 : 0));
      const hitAddr = p === address;
      label(ctx, String(p), rx, ry + (p - 1) * 18, hitAddr ? C.accent : C.axis,
        { size: 11, weight: hitAddr ? 700 : 400 });
      label(ctx, '= ' + bits.join('') + (hitAddr && address ? '  ← 当前地址' : ''), rx + 18, ry + (p - 1) * 18,
        hitAddr ? C.accent : C.axis, { size: 11, weight: hitAddr ? 700 : 400 });
    }
    if (geo.wide) {
      let qy = ry + 7 * 18 + 22;
      label(ctx, '码字 = ' + code.join(''), rx, qy, C.fg, { size: 11 });
      qy += 16;
      label(ctx, '接收 = ' + received.join(''), rx, qy, C.fg, { size: 11 });
      qy += 16;
      label(ctx, '错位 = ' + (flips.map((v, i) => (v ? i + 1 : '')).filter(Boolean).join('、') || '无'),
        rx, qy, C.bad, { size: 11 });
    }

    ro.set('码字', code.join(''));
    ro.set('接收块', received.join(''));
    ro.set('校验子', '(' + s.join(', ') + ')');
    ro.set('地址 s', String(address));
    ro.set('判决', address === 0 ? '通过检查' : (errCount === 1 ? '纠正第 ' + address + ' 位' : '地址不可信'));
  }

  function hit(x0, y0) {
    const i = Math.floor((x0 - geo.x0) / geo.cell);
    if (i < 0 || i >= 7) return -1;
    if (y0 < geo.y0 || y0 > geo.y0 + geo.cell) return -1;
    return i;
  }

  bindPointer(cv.canvas, {
    pick(x0, y0) { return hit(x0, y0) >= 0 ? 'bit' : null; },
    hover(x0, y0) { cv.canvas.style.cursor = hit(x0, y0) >= 0 ? 'pointer' : 'default'; },
    down(id, x0, y0) {
      const i = hit(x0, y0);
      if (i < 0) return;
      flips[i] = 1 - flips[i];
      draw();
    },
    move() {},
    up() {},
    leave() { cv.canvas.style.cursor = 'default'; },
  });

  bNoErr.addEventListener('click', () => { flips = new Array(7).fill(0); draw(); });
  let seed = 11;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  bOne.addEventListener('click', () => {
    flips = new Array(7).fill(0);
    flips[Math.floor(rnd() * 7)] = 1;
    draw();
  });
  bTwo.addEventListener('click', () => {
    flips = new Array(7).fill(0);
    const a = Math.floor(rnd() * 7);
    let b = Math.floor(rnd() * 7);
    while (b === a) b = Math.floor(rnd() * 7);
    flips[a] = 1;
    flips[b] = 1;
    draw();
  });

  draw();
  cv.redraw = draw;
  return { destroy() {} };
}
