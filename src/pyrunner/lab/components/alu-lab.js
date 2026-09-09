/* =========================================================================
 * lab 组件：alu-lab（4 位 ALU 设计：操作码 + 标志位）
 * -------------------------------------------------------------------------
 * 演示什么
 *   ALU = 一堆运算电路 + 一台「多路选择器」。操作码决定走哪条：
 *     op: 0 AND / 1 OR / 2 ADD / 3 SUB / 4 XOR / 5 NOT / 6 移位 / 7 CMP
 *   两个操作数 A、B（4 位）进 ALU，出来 4 位结果 + 四个标志位：
 *     Z 结果为零　C 进位/借位　V 有符号溢出　N 结果为负（最高位）
 *   ADD / SUB / CMP 是有符号溢出真正的舞台：进位进入符号位与走出符号位
 *   不一致时 V=1，结果一行整体标红。
 *
 *   必须玩出来的三件事：
 *     · SUB 在补码世界就是 a + ~b + 1 —— 加法器什么都不用改；
 *     · CMP 和 SUB 算的是同一件事，差别只在「结果写不写回」：比较只留标志位；
 *     · C 是「无符号世界」的溢出信号，V 是「有符号世界」的，同一套电路两副面孔。
 *
 * 能玩什么
 *   · A / B 两行位格子都能点、都能按住拖过去翻转（滑块同步联动）；
 *   · 分段按钮切操作码（或拖 op 滑块 0..7），原理符号与解释跟着换；
 *   · 默认配置就是一次溢出：6 + 7 = 13，4 位装不下 → V=1 结果标红。
 *
 * 用法（在 .md 里写 ```lab 围栏）
 *
 *   ```lab
 *   {
 *     "type": "alu-lab",
 *     "title": "切到 ADD，把 A 拖到 6、B 拖到 7，看 V 为什么亮了"
 *   }
 *   ```
 *
 * spec 字段（全部可省，省了用默认值）
 *   a       操作数 A（0..15），默认 6
 *   b       操作数 B（0..15），默认 7
 *   op      操作码（0..7），默认 2（ADD）。0 AND / 1 OR / 2 ADD / 3 SUB /
 *           4 XOR / 5 NOT / 6 移位 / 7 CMP
 *   height  画布高度（像素），默认 296
 *
 * 引擎：logic.js 的 alu4（结果、进位、零标志全部由引擎给出，本组件只补算
 * V / N 两个标志并负责画与拖）。
 * 口径说明：引擎里操作码 6 的实现是「左移一位」（结果 = (a×2) mod 16，低位补 0，
 * 移出的最高位进 C），本组件标注为「左移 SHL」——与引擎源码注释 `110 shl` 一致。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildSegmented,
  buildReadout, label, clamp, fmt,
} from '../core.js';
import { alu4, toBits, bitsToInt } from '../engines/logic.js';

const N = 4;

const OP_INFO = [
  { name: 'AND', sym: '&', note: '按位与：掩码操作——1 的位放行，0 的位清零' },
  { name: 'OR', sym: '|', note: '按位或：置位操作——1 的位强制点亮' },
  { name: 'ADD', sym: '+', note: '补码加法：V=1 表示结果超出 −8..7（进位入/出符号位不一致）' },
  { name: 'SUB', sym: '−', note: '减法 = a + ~b + 1：加法器原封不动，B 逐位取反再进 1；C=0 表示不够减' },
  { name: 'XOR', sym: '⊕', note: '按位异或：不同为 1——与自己异或得 0，是清零最快的路' },
  { name: 'NOT', sym: '~', note: '按位取反 A（B 被无视）：和 SUB 一起凑出减法' },
  { name: 'SHL', sym: '«', note: '移位：结果 = a 左移一位（= (a×2) mod 16，低位补 0），移出的最高位进 C' },
  { name: 'CMP', sym: '−?', note: '比较：做的还是 a−b，但结果不写回，只留 Z / C / N / V 给分支指令看' },
];

export default function render(host, spec) {
  const s = {
    a: clamp((spec.a ?? 6) | 0, 0, 15),
    b: clamp((spec.b ?? 7) | 0, 0, 15),
    op: clamp((spec.op ?? 2) | 0, 0, 7),
  };
  let bitsA = toBits(s.a, N);   // MSB 在前
  let bitsB = toBits(s.b, N);

  const signedOf = (b) => (b[0] ? bitsToInt(b) - 16 : bitsToInt(b));

  const cv = setupCanvas(host, spec.height || 296);

  const seg = buildSegmented(
    OP_INFO.map((o, i) => ({ label: o.name, value: i })),
    s.op,
    (v) => {
      s.op = v;
      sl.state.op = v;
      const inp = sl.box.querySelectorAll('input')[2];
      if (inp) inp.value = String(v);
      const val = sl.box.querySelectorAll('.ml-slider__val')[2];
      if (val) val.textContent = String(v);
      draw();
    },
  );
  host.appendChild(seg);

  const ro = buildReadout({
    A: '—', B: '—', 结果: '—', 标志: '—', 解释: '—',
  });
  host.appendChild(ro.box);

  const sl = buildSliders(
    {
      sliders: [
        { name: 'a', label: 'A（0..15）', min: 0, max: 15, step: 1, value: s.a, fmt: 0 },
        { name: 'b', label: 'B（0..15）', min: 0, max: 15, step: 1, value: s.b, fmt: 0 },
        { name: 'op', label: '操作码 op', min: 0, max: 7, step: 1, value: s.op, fmt: 0 },
      ],
    },
    (st) => {
      s.a = st.a | 0;
      s.b = st.b | 0;
      s.op = st.op | 0;
      bitsA = toBits(s.a, N);
      bitsB = toBits(s.b, N);
      draw();
    },
  );

  function syncSliders() {
    const inputs = sl.box.querySelectorAll('input');
    const vals = sl.box.querySelectorAll('.ml-slider__val');
    s.a = bitsToInt(bitsA);
    s.b = bitsToInt(bitsB);
    [s.a, s.b].forEach((v, i) => {
      if (inputs[i]) inputs[i].value = String(v);
      if (vals[i]) vals[i].textContent = String(v);
    });
  }

  function geom() {
    const W = cv.W;
    const bw = Math.min(52, (W - 100) / N);
    return { W, bw, x0: 56, yA: 34, yB: 94, yR: 172, cellH: 44, flagY: 232 };
  }

  function drawRow(ctx, g, b, y, color, msbColor, axis) {
    for (let i = 0; i < N; i += 1) {
      const x = g.x0 + i * (g.bw + 5);
      const col = i === 0 ? msbColor : color;
      ctx.fillStyle = b[i] ? col : 'transparent';
      if (b[i]) ctx.fillRect(x, y, g.bw, g.cellH);
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.5, y + 0.5, g.bw - 1, g.cellH - 1);
      label(ctx, String(b[i]), x + g.bw / 2, y + g.cellH / 2 + 6, b[i] ? '#fff' : col,
        { align: 'center', size: 18, weight: 700 });
      label(ctx, String(2 ** (N - 1 - i)), x + g.bw / 2, y + g.cellH + 11,
        i === 0 ? msbColor : axis, { align: 'center', size: 8.5 });
    }
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    const g = geom();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    const r = alu4(bitsA, bitsB, s.op);
    const out = r.out;
    const Rs = signedOf(out);
    const As = signedOf(bitsA);
    const Bs = signedOf(bitsB);
    /* V：进位「进入符号位」与「走出符号位」是否一致 */
    let ovf = false;
    if (s.op === 2) ovf = (bitsA[0] === bitsB[0]) && (out[0] !== bitsA[0]);
    if (s.op === 3 || s.op === 7) ovf = (bitsA[0] !== bitsB[0]) && (out[0] !== bitsA[0]);
    const info = OP_INFO[s.op];

    label(ctx, 'A、B 两行的格子都能点 / 拖翻转；结果与标志位由 logic.js 的 alu4 实时算出',
      10, 16, C.fg, { size: 10.5 });

    /* ---- 三行位 ---- */
    label(ctx, 'A', g.x0 - 12, g.yA + g.cellH / 2 + 5, C.accent, { align: 'right', size: 14, weight: 700 });
    drawRow(ctx, g, bitsA, g.yA, C.accent, C.named('purple'), C.axis);
    label(ctx, fmt(bitsToInt(bitsA)) + '（有符号 ' + As + '）', g.x0 + N * (g.bw + 5) + 6,
      g.yA + g.cellH / 2 + 5, C.accent, { size: 10 });

    label(ctx, 'B', g.x0 - 12, g.yB + g.cellH / 2 + 5, C.named('orange'), { align: 'right', size: 14, weight: 700 });
    drawRow(ctx, g, bitsB, g.yB, C.named('orange'), C.named('purple'), C.axis);
    label(ctx, fmt(bitsToInt(bitsB)) + '（有符号 ' + Bs + '）', g.x0 + N * (g.bw + 5) + 6,
      g.yB + g.cellH / 2 + 5, C.named('orange'), { size: 10 });

    /* ---- ALU 框 ---- */
    const midY = (g.yB + g.cellH + g.yR) / 2;
    ctx.strokeStyle = ovf ? C.bad : C.axis;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(g.x0 + 8.5, midY - 15.5, N * (g.bw + 5) - 14, 31);
    label(ctx, 'ALU　op=' + s.op + ' ' + info.sym, g.x0 + 8 + (N * (g.bw + 5) - 14) / 2,
      midY + 4, ovf ? C.bad : C.fg, { align: 'center', size: 12, weight: 700 });

    /* ---- 结果行 ---- */
    label(ctx, 'Σ', g.x0 - 12, g.yR + g.cellH / 2 + 5, C.ok, { align: 'right', size: 14, weight: 700 });
    for (let i = 0; i < N; i += 1) {
      const x = g.x0 + i * (g.bw + 5);
      const col = ovf ? C.bad : C.ok;
      ctx.fillStyle = out[i] ? col : 'transparent';
      if (out[i]) ctx.fillRect(x, g.yR, g.bw, g.cellH);
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.5, g.yR + 0.5, g.bw - 1, g.cellH - 1);
      label(ctx, String(out[i]), x + g.bw / 2, g.yR + g.cellH / 2 + 6, out[i] ? '#fff' : col,
        { align: 'center', size: 18, weight: 700 });
    }
    label(ctx, fmt(bitsToInt(out)) + (s.op === 2 || s.op === 3 || s.op === 7 ? '（有符号 ' + Rs + '）' : ''),
      g.x0 + N * (g.bw + 5) + 6, g.yR + g.cellH / 2 + 5, ovf ? C.bad : C.ok, { size: 10 });

    /* ---- 标志位 ---- */
    const flags = [
      { k: 'Z', v: r.zero === 1, t: '零' },
      { k: 'C', v: r.carry === 1, t: '进位' },
      { k: 'V', v: ovf, t: '溢出' },
      { k: 'N', v: out[0] === 1, t: '负' },
    ];
    let fx = g.x0;
    flags.forEach((f) => {
      const w = 30;
      const hot = f.v && f.k === 'V';
      ctx.fillStyle = f.v ? (hot ? C.bad : C.accent) : C.soft;
      ctx.fillRect(fx, g.flagY, w, 22);
      ctx.strokeStyle = f.v ? (hot ? C.bad : C.accent) : C.grid;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(fx + 0.5, g.flagY + 0.5, w - 1, 21);
      label(ctx, f.k, fx + w / 2, g.flagY + 15, f.v ? '#fff' : C.axis,
        { align: 'center', size: 12, weight: 700 });
      label(ctx, f.t, fx + w + 5, g.flagY + 15, f.v ? (hot ? C.bad : C.fg) : C.axis, { size: 10 });
      fx += w + 5 + ctx.measureText(f.t).width + 12;
    });

    /* ---- 解释 / 溢出横幅 ---- */
    if (ovf) {
      label(ctx, '⚠ 溢出：' + As + ' ' + info.sym.replace('−?', '−') + ' ' + Bs + ' = ' + (As + Bs)
        + '，4 位补码只装得下 −8..7，符号位被进位污染成了 ' + Rs, 10, g.flagY + 44, C.bad,
        { size: 10.5, weight: 600 });
    } else if (s.op === 7) {
      label(ctx, '比较结果：' + (r.zero === 1 ? '相等（Z=1）' : (Rs < 0 ? 'A < B（N=1）' : 'A ≥ B（C=1）'))
        + '，分支指令就吃这几个标志位', 10, g.flagY + 44, C.ok, { size: 10.5 });
    } else {
      label(ctx, info.note, 10, g.flagY + 44, C.ok, { size: 10.5 });
    }

    ro.set('A', fmt(bitsToInt(bitsA)) + '（有符号 ' + As + '）');
    ro.set('B', fmt(bitsToInt(bitsB)) + '（有符号 ' + Bs + '）');
    ro.set('结果', fmt(bitsToInt(out)) + '（位模式 ' + out.join('') + '）');
    ro.set('标志', 'Z=' + (r.zero === 1 ? 1 : 0) + ' C=' + r.carry + ' V=' + (ovf ? 1 : 0) + ' N=' + out[0]);
    ro.set('解释', info.note);
  }

  /* ---------- 拖拽：A / B 行位翻转 ---------- */
  let lastBit = null;
  bindPointer(cv.canvas, {
    pick(x, y) {
      const g = geom();
      const rows = [[g.yA, 'a'], [g.yB, 'b']];
      for (const [ry, tag] of rows) {
        if (y >= ry && y <= ry + g.cellH) {
          for (let i = 0; i < N; i += 1) {
            const bx = g.x0 + i * (g.bw + 5);
            if (x >= bx && x <= bx + g.bw) return tag + i;
          }
        }
      }
      return null;
    },
    down(id) {
      lastBit = id;
      const i = +id.slice(1);
      if (id[0] === 'a') bitsA[i] ^= 1;
      else bitsB[i] ^= 1;
      syncSliders();
      draw();
    },
    move(id) {
      if (id === lastBit) return;
      lastBit = id;
      const i = +id.slice(1);
      if (id[0] === 'a') bitsA[i] ^= 1;
      else bitsB[i] ^= 1;
      syncSliders();
      draw();
    },
    up() { lastBit = null; },
  });

  draw();
  cv.redraw = draw;
  return { slidersBox: sl.box };
}
