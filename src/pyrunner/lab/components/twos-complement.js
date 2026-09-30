/* =========================================================================
 * lab 组件：twos-complement（位模式 ↔ 数值对照，补码与溢出）
 * -------------------------------------------------------------------------
 * 演示什么
 *   同一串二进制位，按「无符号」和「补码（有符号）」两种读法会得到不同的数。
 *   上半部分是一条 8 位位模式条：点/拖某个格子把这一位翻转，下面的数值
 *   （无符号 / 有符号 / 十六进制）与数值滑块全部实时联动——拖滑块改数值，
 *   位模式也会跟着变，双向都是活的。
 *
 *   下半部分是一个 8 位加法器：当前位模式 A + 加数 B，逐位给出和、进位 C、
 *   零标志 Z 与溢出标志 V。**一旦有符号溢出（进位进入符号位 ≠ 进位走出
 *   符号位），整个和一行整体标红**，并解释为什么「两个正数相加得负」。
 *   这正是补码世界里「数装不下」的唯一判定方法，跟无符号的进位是两回事。
 *
 * 能玩什么
 *   · 在大位模式条上点一下 / 按住拖过去（像画笔一样刷过多个格子）翻转位；
 *   · 拖「数值」滑块（−128..127）：位模式跟着重排，最高位自动变成符号位；
 *   · 拖「加数 B」滑块，或直接在 B 行上拖格子翻转：看 V 什么时候亮红。
 *   · 必玩：把数值拖到 100，再加 100 —— 127 以上的部分去哪了？
 *
 * 用法（在 .md 里写 ```lab 围栏）
 *
 *   ```lab
 *   {
 *     "type": "twos-complement",
 *     "title": "把数值拖到 100，加数也拖到 100，看看溢出怎么被抓出来"
 *   }
 *   ```
 *
 * spec 字段（全部可省，省了用默认值）
 *   value   初始数值（有符号，−128..127），默认 100
 *   b       初始加数 B（有符号，−128..127），默认 100
 *   height  画布高度（像素），默认 310
 *
 * 引擎：logic.js 的 twosComplement / bitsToInt（位模式装填与数值换算都走
 * 引擎，本组件只负责画与拖）。字长固定 8 位——4 位太挤、16 位看不清
 * 每一位的权重，8 位刚好能用手算核对。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout,
  label, clamp,
  clearBg,
  setSliderRow,
} from '../core.js';
import { twosComplement, bitsToInt } from '../engines/logic.js';

const N = 8;
const MOD = 256;
const HALF = 128;

export default function render(host, spec) {
  const s = {
    value: clamp((spec.value ?? 100) | 0, -HALF, HALF - 1),
    b: clamp((spec.b ?? 100) | 0, -HALF, HALF - 1),
  };
  let bits = twosComplement(s.value, N).bits;   // MSB 在前
  const bitsB = twosComplement(s.b, N).bits;

  const signedOf = (b) => (b[0] ? bitsToInt(b) - MOD : bitsToInt(b));
  const hex = (u) => '0x' + u.toString(16).padStart(2, '0').toUpperCase();

  const cv = setupCanvas(host, spec.height || 310);
  const ro = buildReadout({
    无符号值: '—', 有符号值: '—', 十六进制: '—',
    加数B: '—', 'A + B': '—', 判定: '—',
  });
  host.appendChild(ro.box);

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'value', label: '数值（有符号）', min: -HALF, max: HALF - 1, step: 1, value: s.value, fmt: 0 },
        { name: 'b', label: '加数 B（有符号）', min: -HALF, max: HALF - 1, step: 1, value: s.b, fmt: 0 },
      ],
    },
    (st) => {
      s.value = st.value | 0;
      s.b = st.b | 0;
      bits = twosComplement(s.value, N).bits;
      bitsB.splice(0, N, ...twosComplement(s.b, N).bits);
      draw();
    },
  );

  function syncSliders() {
    s.value = signedOf(bits);
    s.b = signedOf(bitsB);
    setSliderRow(sliders, 0, s.value);
    setSliderRow(sliders, 1, s.b);
  }

  /* ---------- 几何 ---------- */
  function geom() {
    const W = cv.W;
    const bigW = Math.min(56, (W - 40) / N);
    const bw = Math.min(28, (W - 110) / N);
    const x0 = (W - bigW * N - (N - 1) * 4) / 2;      // 大位模式条起点（居中）
    const ax = 62;                                     // 加法器各行的起点
    return {
      W,
      bigW, bw, x0, ax,
      bigY: 46, bigH: 56,
      rowA: 158, rowB: 188, rowS: 218, cellH: 24,
      flagY: 254,
    };
  }

  function drawCell(ctx, x, y, w, h, v, fillCol, txtCol, fs) {
    ctx.fillStyle = v ? fillCol : 'transparent';
    if (v) ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = fillCol;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    label(ctx, String(v), x + w / 2, y + h / 2 + fs * 0.36, v ? txtCol : fillCol,
      { align: 'center', size: fs, weight: 700 });
  }

  function drawBitsRow(ctx, g, b, y, cellW, h, fs, cols) {
    for (let i = 0; i < N; i += 1) {
      drawCell(ctx, g.ax + i * (cellW + 3), y, cellW, h, b[i], cols(i), '#fff', fs);
    }
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    const g = geom();
    clearBg(ctx, W, H, C);

    const A = bitsToInt(bits);
    const As = signedOf(bits);
    const Bv = bitsToInt(bitsB);
    const Bs = signedOf(bitsB);
    const sum = (A + Bv) % MOD;
    const sumBits = twosComplement(sum, N).bits;
    const sumS = signedOf(sumBits);
    const carryOut = A + Bv >= MOD;
    /* 有符号溢出：进位进入符号位（A、B 符号位）与走出符号位（和符号位）不一致 */
    const ovf = (bits[0] === bitsB[0]) && (sumBits[0] !== bits[0]);
    const zero = sum === 0;

    /* ---- 提示 ---- */
    label(ctx, '8 位位模式：点一下 / 按住拖过格子翻转任意一位', 10, 18, C.fg, { size: 11 });
    label(ctx, '同一串位，两种读法：无符号 0..255　·　补码 −128..127', 10, 33, C.grid, { size: 10 });

    /* ---- 大位模式条 ---- */
    for (let i = 0; i < N; i += 1) {
      const x = g.x0 + i * (g.bigW + 4);
      const isSign = i === 0;
      drawCell(ctx, x, g.bigY, g.bigW, g.bigH, bits[i],
        isSign ? C.named('purple') : C.accent, C.bg, 20);
      label(ctx, String(2 ** (N - 1 - i)), x + g.bigW / 2, g.bigY + g.bigH + 14,
        isSign ? C.named('purple') : C.axis, { align: 'center', size: 9 });
    }
    label(ctx, '符号位', g.x0 + g.bigW / 2, g.bigY - 6, C.named('purple'),
      { align: 'center', size: 9, weight: 600 });

    /* ---- 加法器 ---- */
    label(ctx, '8 位加法器：A（上面的位模式）+ B', 10, g.rowA - 12, C.fg, { size: 11 });
    label(ctx, 'A', g.ax - 10, g.rowA + 16, C.accent, { align: 'right', size: 12, weight: 700 });
    label(ctx, '+B', g.ax - 10, g.rowB + 16, C.named('orange'), { align: 'right', size: 12, weight: 700 });
    label(ctx, '=Σ', g.ax - 10, g.rowS + 16, C.fg, { align: 'right', size: 12, weight: 700 });
    label(ctx, 'B 行的格子也能拖', g.ax + N * 31 + 8, g.rowB + 16, C.grid, { size: 9 });

    const colA = (i) => (i === 0 ? C.named('purple') : C.accent);
    drawBitsRow(ctx, g, bits, g.rowA, g.bw, g.cellH, 11, colA);
    drawBitsRow(ctx, g, bitsB, g.rowB, g.bw, g.cellH, 11, (i) => (i === 0 ? C.named('purple') : C.named('orange')));

    /* 和一行：溢出时整行标红 */
    for (let i = 0; i < N; i += 1) {
      const x = g.ax + i * (g.bw + 3);
      drawCell(ctx, x, g.rowS, g.bw, g.cellH, sumBits[i],
        ovf ? C.bad : (i === 0 ? C.named('purple') : C.ok), '#fff', 11);
    }
    /* 进位出框 */
    ctx.strokeStyle = carryOut ? C.bad : C.grid;
    ctx.lineWidth = carryOut ? 2 : 1;
    ctx.strokeRect(g.ax - 30.5, g.rowS + 3.5, 18, g.cellH - 7);
    label(ctx, carryOut ? '1' : '0', g.ax - 21, g.rowS + 17, carryOut ? C.bad : C.axis,
      { align: 'center', size: 11, weight: 700 });
    label(ctx, 'C', g.ax - 34, g.rowS + 17, C.axis, { align: 'right', size: 10 });

    /* ---- 标志位 ---- */
    const flags = [
      { k: 'Z', v: zero, t: '结果为零' },
      { k: 'C', v: carryOut, t: '无符号进位（≥256）' },
      { k: 'V', v: ovf, t: '有符号溢出' },
      { k: 'N', v: sumBits[0] === 1, t: '结果为负' },
    ];
    let fx = g.ax;
    flags.forEach((f) => {
      const w = 26;
      ctx.fillStyle = f.v ? (f.k === 'V' ? C.bad : C.accent) : C.soft;
      ctx.fillRect(fx, g.flagY, w, 20);
      ctx.strokeStyle = f.v ? (f.k === 'V' ? C.bad : C.accent) : C.grid;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(fx + 0.5, g.flagY + 0.5, w - 1, 19);
      label(ctx, f.k, fx + w / 2, g.flagY + 14, f.v ? '#fff' : C.axis,
        { align: 'center', size: 12, weight: 700 });
      label(ctx, f.t, fx + w + 6, g.flagY + 14, f.v ? (f.k === 'V' ? C.bad : C.fg) : C.axis, { size: 9.5 });
      fx += w + 6 + ctx.measureText(f.t).width + 16;
    });

    /* ---- 结论 ---- */
    if (ovf) {
      label(ctx, '⚠ 溢出：' + As + ' + ' + Bs + ' = ' + (As + Bs)
        + '，但 8 位补码装不下（范围 −128..127），符号位被进位污染成了 ' + sumS,
        10, g.flagY + 40, C.bad, { size: 10.5, weight: 600 });
    } else if (carryOut) {
      label(ctx, '无符号溢出（C=1）：按无符号读 256 丢给了进位；按补码读刚好是对的',
        10, g.flagY + 40, C.ok, { size: 10 });
    } else {
      label(ctx, '✔ 无溢出：' + As + ' + ' + Bs + ' = ' + sumS
        + '（试试点 V 旁边看它什么时候亮）', 10, g.flagY + 40, C.ok, { size: 10 });
    }

    ro.set('无符号值', String(A));
    ro.set('有符号值', As + '（补码读法）');
    ro.set('十六进制', hex(A));
    ro.set('加数B', Bs + '（' + hex(Bv) + '）');
    ro.set('A + B', As + ' + ' + Bs + ' = ' + sumS + '（无符号读法 ' + sum + '）');
    ro.set('判定', ovf ? '⚠ 有符号溢出 V=1' : (carryOut ? '进位 C=1（无符号）' : '✔ 装得下'));
  }

  /* ---------- 拖拽：大条与 B 行的位翻转 ---------- */
  let lastBit = null;   // 'big3' / 'b5'
  function toggleBig(i) {
    bits[i] ^= 1;
    syncSliders();
    draw();
  }
  function toggleB(i) {
    bitsB[i] ^= 1;
    syncSliders();
    draw();
  }
  bindPointer(cv.canvas, {
    pick(x, y) {
      const g = geom();
      if (y >= g.bigY && y <= g.bigY + g.bigH) {
        for (let i = 0; i < N; i += 1) {
          const bx = g.x0 + i * (g.bigW + 4);
          if (x >= bx && x <= bx + g.bigW) return 'big' + i;
        }
      }
      if (y >= g.rowB && y <= g.rowB + g.cellH) {
        for (let i = 0; i < N; i += 1) {
          const bx = g.ax + i * (g.bw + 3);
          if (x >= bx && x <= bx + g.bw) return 'b' + i;
        }
      }
      return null;
    },
    down(id) {
      lastBit = id;
      if (id[0] === 'b') toggleB(+id.slice(1));
      else toggleBig(+id.slice(3));
    },
    move(id) {
      if (id === lastBit) return;
      lastBit = id;
      if (id[0] === 'b') toggleB(+id.slice(1));
      else toggleBig(+id.slice(3));
    },
    up() { lastBit = null; },
  });

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box };
}
