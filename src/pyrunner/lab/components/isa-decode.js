/* =========================================================================
 * lab 组件：isa-decode（32 位机器码与指令译码）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   { "type": "isa-decode", "title": "把一条机器码按位域拆开" }
 *   ```
 *
 * 可选字段（都有默认值，最小 spec 只写 type + title 就能跑）：
 *   word    初始机器码，32 位无符号数，写成十进制或十六进制都行。
 *           默认 0x012A4020，译出来正好是 add $t0, $t1, $t2。
 *   ins     初始助记符，默认由 word 译出。给 "lw" / "beq" / "j" 之类可直接开局。
 *   height  画布高度，默认 340
 *
 * 能玩什么：
 *   · 拖最上面那一排 32 个比特格：按下把该位翻过来，按住横着拖就是连着刷一片
 *     （把一片全刷成 0 或全刷成 1）。每刷一下，下面的汇编立刻跟着变。
 *   · 下拉框选助记符 + 滑块改 rs / rt / rd / shamt / imm：反过来说
 *     「我要这条指令」，上面那串比特和 0x 十六进制立刻跟着变。
 *   · 位域彩条对齐在比特格下方，与下面的字段表一一对应：哪几位归谁管，
 *     这一片比特数出来是多少，一眼对得上。
 *
 * 取舍：用的是 MIPS 的三种经典格式（R / I / J），寄存器名按 MIPS 习惯
 * （$t0..$t7、$s0..$s7、$sp、$ra…）而不是 $0..$31，因为这样读汇编才有语感。
 * 16 位立即数按有符号显示（复用 logic.js 的 twosComplement），所以 lw 的偏移
 * 可以是负数。J 型的 26 位 target 用 imm 滑块给 0..63 的小值，够看清跳转目标
 * 是怎么被塞进那 26 位的。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, buildToolbar, buildReadout,
  bindPointer, el, label, clamp,
  clearBg,
} from '../core.js';
import { twosComplement } from '../engines/logic.js';

/* MIPS 的三种指令格式：R 型靠 funct 区分，I / J 型靠 op 区分 */
const ISA = [
  { m: 'add', type: 'R', op: 0x00, funct: 0x20 },
  { m: 'sub', type: 'R', op: 0x00, funct: 0x22 },
  { m: 'and', type: 'R', op: 0x00, funct: 0x24 },
  { m: 'or', type: 'R', op: 0x00, funct: 0x25 },
  { m: 'slt', type: 'R', op: 0x00, funct: 0x2a },
  { m: 'sll', type: 'R', op: 0x00, funct: 0x00 },
  { m: 'addi', type: 'I', op: 0x08 },
  { m: 'lw', type: 'I', op: 0x23 },
  { m: 'sw', type: 'I', op: 0x2b },
  { m: 'beq', type: 'I', op: 0x04 },
  { m: 'bne', type: 'I', op: 0x05 },
  { m: 'j', type: 'J', op: 0x02 },
];

const REGN = ['$zero', '$at', '$v0', '$v1', '$a0', '$a1', '$a2', '$a3',
  '$t0', '$t1', '$t2', '$t3', '$t4', '$t5', '$t6', '$t7',
  '$s0', '$s1', '$s2', '$s3', '$s4', '$s5', '$s6', '$s7',
  '$t8', '$t9', '$k0', '$k1', '$gp', '$sp', '$fp', '$ra'];

const bitAt = (w, i) => (w >>> i) & 1;
const regName = (i) => REGN[i & 31] || ('$' + (i & 31));
const hex8 = (w) => '0x' + (w >>> 0).toString(16).padStart(8, '0');

/* 位域表：hi/lo 是比特编号（31 最高位，0 最低位） */
function fieldsOf(type, w) {
  const op = (w >>> 26) & 0x3f;
  if (type === 'R') {
    const fn = w & 0x3f;
    const r = ISA.find((x) => x.type === 'R' && x.funct === fn);
    return [
      { n: 'op', cn: '操作码', hi: 31, lo: 26, v: op, d: '全 0 表示这是 R 型，做什么要看 funct' },
      { n: 'rs', cn: '源寄存器 1', hi: 25, lo: 21, v: (w >>> 21) & 0x1f, d: '第一个源操作数' },
      { n: 'rt', cn: '源寄存器 2', hi: 20, lo: 16, v: (w >>> 16) & 0x1f, d: '第二个源操作数' },
      { n: 'rd', cn: '目的寄存器', hi: 15, lo: 11, v: (w >>> 11) & 0x1f, d: '结果写回这里（R 型才有）' },
      { n: 'shamt', cn: '移位量', hi: 10, lo: 6, v: (w >>> 6) & 0x1f, d: '只有移位指令用，其余恒为 0' },
      { n: 'funct', cn: '功能码', hi: 5, lo: 0, v: fn, d: r ? `0x${fn.toString(16)} = ${r.m}（R 型真正区分指令的地方）` : `0x${fn.toString(16)} 没有对应指令` },
    ];
  }
  if (type === 'I') {
    const raw = w & 0xffff;
    const sgn = twosComplement(raw, 16).signed;
    return [
      { n: 'op', cn: '操作码', hi: 31, lo: 26, v: op, d: '非 0，直接决定是哪条 I 型指令' },
      { n: 'rs', cn: '源寄存器/基址', hi: 25, lo: 21, v: (w >>> 21) & 0x1f, d: 'lw/sw 里当基址寄存器' },
      { n: 'rt', cn: '目的/源寄存器', hi: 20, lo: 16, v: (w >>> 16) & 0x1f, d: 'lw 是目的，sw 是源，beq 是第二个比较数' },
      { n: 'imm', cn: '立即数/偏移', hi: 15, lo: 0, v: sgn, d: `16 位有符号：${sgn}（无符号看是 ${raw}）` },
    ];
  }
  return [
    { n: 'op', cn: '操作码', hi: 31, lo: 26, v: op, d: '0x02 = j' },
    { n: 'target', cn: '跳转目标', hi: 25, lo: 0, v: w & 0x03ffffff, d: '26 位字地址，真实地址还要补上 PC 高 4 位并左移 2 位' },
  ];
}

function asmText(e, cur, w) {
  if (!e) return '未定义指令（这一串比特没有对应操作）';
  if (e.type === 'R') {
    if (e.m === 'sll') return `sll ${regName(cur.rd)}, ${regName(cur.rt)}, ${cur.shamt}`;
    return `${e.m} ${regName(cur.rd)}, ${regName(cur.rs)}, ${regName(cur.rt)}`;
  }
  if (e.type === 'I') {
    const im = twosComplement(w & 0xffff, 16).signed;
    if (e.m === 'lw' || e.m === 'sw') return `${e.m} ${regName(cur.rt)}, ${im}(${regName(cur.rs)})`;
    if (e.m === 'beq' || e.m === 'bne') return `${e.m} ${regName(cur.rs)}, ${regName(cur.rt)}, ${im}`;
    return `${e.m} ${regName(cur.rt)}, ${regName(cur.rs)}, ${im}`;
  }
  return `j ${w & 0x03ffffff}`;
}

export default function render(host, spec) {
  const H = spec.height || 340;
  let word = (spec.word === undefined ? 0x012a4020 : Number(spec.word)) >>> 0;
  let m = ISA.find((x) => x.m === spec.ins) ? spec.ins : null;
  const cur = { rs: 9, rt: 10, rd: 8, shamt: 0, imm: 4 };
  let paint = 1;          // 拖拽时刷进去的值
  let bitGeo = { x0: 8, cw: 8, y0: 24, h: 20 };

  const cv = setupCanvas(host, H);

  /* 助记符下拉框（「我要这条指令」那一侧） */
  const selBar = el('div', 'ml-viz__controls');
  const sel = el('select');
  sel.className = 'ml-viz-btn';
  sel.style.font = 'inherit';
  sel.style.padding = '4px 6px';
  ISA.forEach((x) => {
    const o = el('option', null, `${x.m}  (${x.type} 型)`);
    o.value = x.m;
    sel.appendChild(o);
  });
  sel.addEventListener('change', () => {
    m = sel.value;
    rebuild();
    draw();
  });
  selBar.append(el('span', 'ml-lab__hint', '选指令 →'), sel);
  host.appendChild(selBar);

  const ro = buildReadout({ 机器码: '—', 类型: '—', 汇编: '—' });
  host.appendChild(ro.box);

  const bZero = el('button', 'ml-viz-btn', '全部清 0');
  const bOne = el('button', 'ml-viz-btn', '全部置 1');
  const bRand = el('button', 'ml-viz-btn', '随机一条');
  bZero.type = 'button';
  bOne.type = 'button';
  bRand.type = 'button';
  host.appendChild(buildToolbar(bZero, bOne, bRand));

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'rs', label: 'rs', min: 0, max: 31, step: 1, value: cur.rs },
        { name: 'rt', label: 'rt', min: 0, max: 31, step: 1, value: cur.rt },
        { name: 'rd', label: 'rd', min: 0, max: 31, step: 1, value: cur.rd },
        { name: 'shamt', label: 'shamt', min: 0, max: 31, step: 1, value: cur.shamt },
        { name: 'imm', label: 'imm / target', min: -32, max: 63, step: 1, value: cur.imm },
      ],
    },
    (stx) => {
      cur.rs = stx.rs | 0;
      cur.rt = stx.rt | 0;
      cur.rd = stx.rd | 0;
      cur.shamt = stx.shamt | 0;
      cur.imm = stx.imm | 0;
      rebuild();
      draw();
    },
  );

  /* 助记符 + 字段 → 机器码 */
  function rebuild() {
    const e = ISA.find((x) => x.m === m) || ISA[0];
    let w = (e.op << 26) >>> 0;
    if (e.type === 'R') {
      w = (w | ((cur.rs & 31) << 21) | ((cur.rt & 31) << 16) | ((cur.rd & 31) << 11)
        | ((cur.shamt & 31) << 6) | (e.funct & 0x3f)) >>> 0;
    } else if (e.type === 'I') {
      w = (w | ((cur.rs & 31) << 21) | ((cur.rt & 31) << 16) | (cur.imm & 0xffff)) >>> 0;
    } else {
      w = (w | (Math.abs(cur.imm) & 0x03ffffff)) >>> 0;
    }
    word = w >>> 0;
  }

  /* 机器码 → 助记符 + 字段（改比特之后走这条） */
  function readBack() {
    const op = (word >>> 26) & 0x3f;
    let e = null;
    if (op === 0x00) e = ISA.find((x) => x.type === 'R' && x.funct === (word & 0x3f)) || null;
    else e = ISA.find((x) => x.type !== 'R' && x.op === op) || null;
    m = e ? e.m : null;
    cur.rs = (word >>> 21) & 0x1f;
    cur.rt = (word >>> 16) & 0x1f;
    cur.rd = (word >>> 11) & 0x1f;
    cur.shamt = (word >>> 6) & 0x1f;
    cur.imm = (!e || e.type === 'J') ? (word & 0x03ffffff) : twosComplement(word & 0xffff, 16).signed;
    sel.value = m || '';
    const inputs = sliders.box.querySelectorAll('input');
    const spans = sliders.box.querySelectorAll('.ml-slider__val');
    ['rs', 'rt', 'rd', 'shamt', 'imm'].forEach((k, i) => {
      sliders.state[k] = cur[k];
      if (inputs[i]) inputs[i].value = String(cur[k]);
      if (spans[i]) spans[i].textContent = String(cur[k]);
    });
  }

  function setBit(d, v) {
    const b = 31 - d;
    word = (v ? (word | (1 << b)) : (word & ~(1 << b))) >>> 0;
    readBack();
    draw();
  }

  /* ---------- 绘制 ---------- */
  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const Hh = cv.H;
    clearBg(ctx, W, Hh, C);

    const e = ISA.find((x) => x.m === m) || null;
    const type = e ? e.type : (((word >>> 26) & 0x3f) === 0 ? 'R' : 'I');
    const fs = fieldsOf(type, word);

    const cw = (W - 16) / 32;
    const x0 = 8;
    const y0 = 24;
    const bh = 20;
    bitGeo = { x0, cw, y0, h: bh };
    const bx = (d) => x0 + d * cw;

    label(ctx, `机器码 ${hex8(word)}　—　拖动比特格改值，或改下面的指令让这里跟着变`,
      8, 13, C.fg, { size: 11 });

    /* 32 个比特格 */
    for (let d = 0; d < 32; d += 1) {
      const v = bitAt(word, 31 - d);
      ctx.fillStyle = v ? C.accent : C.soft;
      ctx.fillRect(bx(d), y0, cw - 1, bh);
      ctx.strokeStyle = v ? C.accent : C.grid;
      ctx.lineWidth = 1;
      ctx.strokeRect(bx(d) + 0.5, y0 + 0.5, cw - 2, bh - 1);
      if (cw >= 11) {
        label(ctx, String(v), bx(d) + (cw - 1) / 2, y0 + bh / 2 + 4, v ? C.bg : C.axis,
          { align: 'center', size: 10, weight: 700 });
      }
    }
    /* 比特编号刻度 */
    const ticks = W >= 430 ? [31, 26, 21, 16, 11, 6, 0] : [31, 16, 0];
    ticks.forEach((b) => {
      label(ctx, String(b), bx(31 - b) + cw / 2, y0 + bh + 11, C.axis, { align: 'center', size: 9 });
    });

    /* 位域彩条 */
    const by = y0 + bh + 16;
    const bhh = 26;
    fs.forEach((f, i) => {
      const fx = bx(31 - f.hi);
      const fw = bx(31 - f.lo + 1) - fx - 1;
      const col = C.series(i);
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.22;
      ctx.fillRect(fx, by, fw, bhh);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.3;
      ctx.strokeRect(fx + 0.5, by + 0.5, fw - 1, bhh - 1);
      if (fw >= 30) {
        label(ctx, f.n, fx + fw / 2, by + 11, col, { align: 'center', size: 9.5, weight: 700 });
        label(ctx, String(f.v), fx + fw / 2, by + 22, C.fg, { align: 'center', size: 10 });
      } else {
        label(ctx, f.n[0].toUpperCase(), fx + fw / 2, by + 16, col, { align: 'center', size: 9, weight: 700 });
      }
    });

    /* 分组二进制 + 十六进制 */
    const groups = fs.map((f) => {
      let s = '';
      for (let b = f.hi; b >= f.lo; b -= 1) s += String(bitAt(word, b));
      return s;
    });
    label(ctx, groups.join(' '), 8, by + bhh + 15, C.fg, { size: 11, weight: 600 });
    label(ctx, hex8(word) + `　${type} 型`, 8, by + bhh + 30, C.axis, { size: 10 });

    /* 汇编 */
    const ay = by + bhh + 52;
    ctx.fillStyle = C.soft;
    ctx.fillRect(6, ay - 14, W - 12, 28);
    label(ctx, asmText(e, cur, word), 12, ay + 5, e ? C.accent : C.bad, { size: 14, weight: 700 });

    /* 字段表 */
    const ty = ay + 30;
    const rowH = Math.min(18, Math.max(13, (Hh - ty - 26) / fs.length));
    fs.forEach((f, i) => {
      const y = ty + i * rowH;
      const col = C.series(i);
      ctx.fillStyle = col;
      ctx.fillRect(8, y + 2, 3, rowH - 6);
      label(ctx, f.n + ' ' + f.cn, 16, y + rowH - 4, C.fg, { size: 10.5, weight: 600 });
      const bitTxt = f.hi === f.lo ? `[${f.hi}]` : `[${f.hi}:${f.lo}]`;
      label(ctx, bitTxt, W * 0.42, y + rowH - 4, C.axis, { size: 10 });
      label(ctx, String(f.v), W * 0.58, y + rowH - 4, col, { size: 10.5, weight: 700 });
      label(ctx, f.d, W * 0.70, y + rowH - 4, C.fg, { size: 10 });
    });

    label(ctx, '上面改比特 → 汇编跟着变；下面改指令与字段 → 比特跟着变。两边是同一串比特的两种写法。',
      8, Hh - 6, C.accent2, { size: 10 });

    ro.set('机器码', hex8(word));
    ro.set('类型', `${type} 型　${e ? e.m : '未定义'}　op=0x${((word >>> 26) & 0x3f).toString(16)}`);
    ro.set('汇编', asmText(e, cur, word));
  }

  /* ---------- 拖着刷比特 ---------- */
  const bitFromX = (x) => clamp(Math.floor((x - bitGeo.x0) / bitGeo.cw), 0, 31);
  bindPointer(cv.canvas, {
    pick(x, y) {
      if (y < bitGeo.y0 - 3 || y > bitGeo.y0 + bitGeo.h + 3) return null;
      if (x < bitGeo.x0 - 2 || x > bitGeo.x0 + 32 * bitGeo.cw + 2) return null;
      return 'b' + bitFromX(x);
    },
    down(id, x) {
      const d = bitFromX(x);
      paint = bitAt(word, 31 - d) ? 0 : 1;
      setBit(d, paint);
    },
    hover(x, y, activeId) {
      if (!activeId || activeId[0] !== 'b') return;
      setBit(bitFromX(x), paint);
    },
    move() { /* 实际刷值在 hover 里做，这样横着拖能连着刷一整片 */ },
    up() { paint = 1; },
  });

  bZero.addEventListener('click', () => { word = 0; readBack(); draw(); });
  bOne.addEventListener('click', () => { word = 0xffffffff; readBack(); draw(); });
  bRand.addEventListener('click', () => {
    const pickOne = ISA[Math.floor(Math.random() * ISA.length)];
    m = pickOne.m;
    cur.rs = Math.floor(Math.random() * 32);
    cur.rt = Math.floor(Math.random() * 32);
    cur.rd = Math.floor(Math.random() * 32);
    cur.shamt = Math.floor(Math.random() * 4);
    cur.imm = Math.floor(Math.random() * 33) - 16;
    sel.value = m;
    rebuild();
    readBack();
    draw();
  });

  if (m) {
    cur.rs = (word >>> 21) & 0x1f;
    cur.rt = (word >>> 16) & 0x1f;
    cur.rd = (word >>> 11) & 0x1f;
    cur.shamt = (word >>> 6) & 0x1f;
    rebuild();
  }
  readBack();
  draw();
  cv.redraw = draw;
  return {
    slidersBox: sliders.box,
    destroy() { /* 无动画、无音频 */ },
  };
}
