/* =========================================================================
 * lab 组件：adder-lab（波纹进位加法器：看进位一级一级爬上去）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "adder-lab",
 *     "title": "把 0111 + 0001 拖出来，看进位怎么一路爬到最高位",
 *     "bits": 4,
 *     "a": 7,
 *     "b": 1,
 *     "tpd": 2
 *   }
 *   ```
 *
 * 字段（全部可省略）：
 *   bits  位宽，4（默认）或 8
 *   a     加数 A 初值，默认 7
 *   b     加数 B 初值，默认 1（7+1 是最经典的「进位一路爬到底」例子）
 *   tpd   每一级门的延迟（ns），默认 2
 *
 * 演示什么：
 *   一位全加器只管三位输入（a、b、低位进位）算出「本位和 + 进位输出」。
 *   把 N 个串起来就是波纹加法器：**高位的计算必须等低位把进位送上来**，
 *   所以最坏情况是进位从最低位一路爬到最高位，总延迟 = N × t_pd。
 *   下方甘特图把这件事摊平：每一位的和要等到自己的进位到达才算得出来，
 *   那条斜线就是「波纹」这个名字的来历。
 *   每一位还标了 G（自己产生进位 a·b=1）/ P（传播进位 a⊕b=1）/ K（掐断进位
 *   a+b=0）——这正是后面超前进位加法器要用的三个信号。
 *   点任意一位，下面画出这一位全加器的门级内部（两个 XOR + 两个 AND + 一个 OR）
 *   和它们此刻的真实取值。
 *
 * 能拖什么：
 *   · 点 A/B 的任意一位 → 翻转这一位（等价于改数值，但你能看清是哪一位在动）
 *   · 按住横着拖过去 → 把一路上的位刷成同一个值（比如刷出 1111）
 *   · 点任意一位选中它，看门级内部
 *   · 「播放」→ 时间游标在甘特图上扫过去，和位在进位到达前显示 ?
 *   滑块：A、B 的十进制值，以及每级门延迟 t_pd。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout,
  buildSegmented, anim, el, label, clamp, fmt,
  clearBg,
  setSliderRow,
} from '../core.js';
import { rippleAdder, evalCombinational, toBits, bitsToInt } from '../engines/logic.js';

export default function render(host, spec) {
  let C = themeColors();
  const s = {
    bits: spec.bits === 8 ? 8 : 4,
    a: spec.a ?? 7,
    b: spec.b ?? 1,
    tpd: spec.tpd ?? 2,
  };
  s.a = clamp(Math.round(s.a), 0, 2 ** s.bits - 1);
  s.b = clamp(Math.round(s.b), 0, 2 ** s.bits - 1);
  let selBit = 0;      // 选中的位，按「位权 p」计：0 = LSB
  let paintRow = null; // 正在刷的是 'a' 还是 'b'
  let paintVal = 0;
  let animT = 0;

  const cv = setupCanvas(host, 470);
  const ro = buildReadout({
    '算式': '—', 'A': '—', 'B': '—', '和 S': '—',
    '进位输出 Cout': '—', '最坏延迟': '—', '进位链': '—',
  });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(
    [{ label: '4 位', value: 4 }, { label: '8 位', value: 8 }],
    s.bits,
    (v) => {
      s.bits = v;
      const top = 2 ** v - 1;
      s.a = Math.min(s.a, top);
      s.b = Math.min(s.b, top);
      selBit = Math.min(selBit, v - 1);
      rebuildSliders();
      draw();
    },
  ));

  /* ---------- 求值：网表交给引擎 ---------- */
  function solve() {
    const bits = s.bits;
    const net = rippleAdder(bits);
    const ab = toBits(s.a, bits);   // 索引 0 = MSB
    const bb = toBits(s.b, bits);
    const values = {};
    for (let i = 0; i < bits; i += 1) {
      values['a' + i] = ab[i];
      values['b' + i] = bb[i];
    }
    evalCombinational(net, values, 200);
    /* 按位权整理：p = 0 是最低位，对应网表里的下标 i = bits-1-p */
    const rows = [];
    for (let p = 0; p < bits; p += 1) {
      const i = bits - 1 - p;
      rows.push({
        p,
        i,
        a: values['a' + i],
        b: values['b' + i],
        s: values['s' + i],
        x: values['x' + i],
        cin: p === 0 ? 0 : values['c' + (i + 1)],
        cout: values['c' + i],
        m1: p === 0 ? values['c' + i] : values['m1_' + i],
        m2: p === 0 ? null : values['m2_' + i],
        g: values['a' + i] & values['b' + i],
        pk: values['a' + i] ^ values['b' + i],
      });
    }
    return { rows, cout: values.cout, values, net };
  }

  /* ---------- 几何 ---------- */
  const X0 = 96;
  const colW = () => Math.min(58, Math.max(30, (cv.W - X0 - 74) / s.bits));
  const colX = (p) => X0 + p * colW();
  const ROW_A = 36;
  const ROW_B = 70;
  const ROW_C = 100;
  const ROW_S = 110;
  const CELL = 30;
  const bitRect = (p, y) => ({ x: colX(p), y, w: colW() - 6, h: CELL });

  function cellHit(x, y) {
    if (y >= ROW_A && y <= ROW_A + CELL) return { row: 'a', p: pAt(x) };
    if (y >= ROW_B && y <= ROW_B + CELL) return { row: 'b', p: pAt(x) };
    if (y >= ROW_S && y <= ROW_S + CELL) return { row: 'sel', p: pAt(x) };
    return null;
  }
  function pAt(x) {
    const p = Math.floor((x - X0) / colW());
    return p >= 0 && p < s.bits ? p : null;
  }

  /* ---------- 绘制 ---------- */
  function chip(ctx, x, y, w, h, text, val, hot) {
    ctx.fillStyle = hot ? C.soft : C.bg;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = hot ? C.accent2 : C.axis;
    ctx.lineWidth = hot ? 2 : 1.2;
    ctx.strokeRect(x, y, w, h);
    label(ctx, text, x + w / 2, y + h / 2 + 4, C.fg, { align: 'center', size: 11, weight: 700 });
    if (val !== null && val !== undefined) {
      label(ctx, String(val), x + w + 8, y + h / 2 + 4,
        val === 1 ? C.ok : C.axis, { size: 11, weight: 700 });
    }
  }

  function draw() {
    C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    const bits = s.bits;
    const R = solve();
    const tMax = (bits + 0.6) * s.tpd;
    const T = controls && controls.playing ? animT : 1e9;

    clearBg(ctx, W, H, C);
    label(ctx, '本图按电路习惯**从低位到高位**画：左边是最低位 LSB，进位从左往右爬（书写顺序相反）',
      8, 15, C.grid, { size: 10 });

    /* ---------- 位标题 ---------- */
    for (let p = 0; p < bits; p += 1) {
      label(ctx, '位' + p, colX(p) + (colW() - 6) / 2, ROW_A - 5, C.fg,
        { align: 'center', size: 10, weight: 700 });
    }
    label(ctx, 'Cout', X0 + bits * colW() + 12, ROW_A - 5, C.fg, { size: 10, weight: 700 });

    /* ---------- A / B 行 ---------- */
    const drawBitRow = (rowKey, y, arr) => {
      label(ctx, rowKey === 'a' ? '加数 A' : '加数 B', 8, y + CELL / 2 + 5, C.fg, { size: 11, weight: 600 });
      for (let p = 0; p < bits; p += 1) {
        const r = bitRect(p, y);
        const v = arr[p];
        ctx.fillStyle = v ? C.series(rowKey === 'a' ? 0 : 1) : C.bg;
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = C.axis;
        ctx.lineWidth = 1;
        ctx.strokeRect(r.x, r.y, r.w, r.h);
        label(ctx, String(v), r.x + r.w / 2, r.y + 21, v ? C.bg : C.fg,
          { align: 'center', size: 15, weight: 700 });
        label(ctx, String(2 ** p), r.x + r.w / 2, r.y + r.h + 11, C.grid,
          { align: 'center', size: 8 });
      }
    };
    drawBitRow('a', ROW_A, R.rows.map((q) => q.a));
    drawBitRow('b', ROW_B, R.rows.map((q) => q.b));

    /* ---------- 进位链 ---------- */
    label(ctx, '进位', 8, ROW_C + 12, C.fg, { size: 11, weight: 600 });
    for (let p = 0; p < bits; p += 1) {
      const q = R.rows[p];
      const x1 = colX(p) + (colW() - 6) / 2;
      const from = p === 0 ? X0 - 44 : colX(p - 1) + (colW() - 6) / 2;
      const y = ROW_C + 6;
      ctx.strokeStyle = q.cin ? C.named('red') : C.grid;
      ctx.lineWidth = q.cin ? 2.2 : 1;
      ctx.beginPath();
      ctx.moveTo(from + 10, y);
      ctx.lineTo(x1 - 8, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x1 - 8, y);
      ctx.lineTo(x1 - 14, y - 4);
      ctx.lineTo(x1 - 14, y + 4);
      ctx.closePath();
      ctx.fillStyle = q.cin ? C.named('red') : C.grid;
      ctx.fill();
      if (p === 0) label(ctx, '0', from + 2, y + 4, C.grid, { size: 9 });
      /* 从本位往上冒的进位输出 */
      ctx.strokeStyle = q.cout ? C.named('red') : C.grid;
      ctx.lineWidth = q.cout ? 2.2 : 1;
      ctx.beginPath();
      ctx.moveTo(x1, y + 6);
      ctx.lineTo(x1 + 14, y + 6);
      ctx.lineTo(x1 + 14, ROW_S - 4);
      ctx.stroke();
    }
    /* 末位进位 → Cout */
    const lastX = colX(bits - 1) + (colW() - 6) / 2;
    ctx.strokeStyle = R.cout ? C.named('red') : C.grid;
    ctx.lineWidth = R.cout ? 2.4 : 1;
    ctx.beginPath();
    ctx.moveTo(lastX + 14, ROW_C + 12);
    ctx.lineTo(X0 + bits * colW() + 22, ROW_C + 12);
    ctx.stroke();

    /* ---------- 和 S 行 ---------- */
    label(ctx, '和 S', 8, ROW_S + CELL / 2 + 5, C.fg, { size: 11, weight: 600 });
    for (let p = 0; p < bits; p += 1) {
      const q = R.rows[p];
      const r = bitRect(p, ROW_S);
      const ready = (p + 1) * s.tpd <= T;
      ctx.fillStyle = p === selBit ? C.soft : C.bg;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = p === selBit ? C.accent2 : C.axis;
      ctx.lineWidth = p === selBit ? 2.2 : 1;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      if (!ready) {
        label(ctx, '?', r.x + r.w / 2, r.y + 21, C.named('red'),
          { align: 'center', size: 15, weight: 700 });
      } else {
        label(ctx, String(q.s), r.x + r.w / 2, r.y + 21, q.s ? C.ok : C.fg,
          { align: 'center', size: 15, weight: 700 });
      }
      /* G / P / K 标记 */
      const tag = q.g ? 'G' : q.pk ? 'P' : 'K';
      const col = q.g ? C.named('red') : q.pk ? C.named('amber') : C.grid;
      label(ctx, tag, r.x + r.w / 2, r.y + r.h + 12, col, { align: 'center', size: 9, weight: 700 });
    }
    /* Cout 灯 */
    const cx = X0 + bits * colW() + 8;
    ctx.fillStyle = R.cout ? C.named('red') : C.soft;
    ctx.fillRect(cx, ROW_S, 34, CELL);
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(cx, ROW_S, 34, CELL);
    label(ctx, String(R.cout), cx + 17, ROW_S + 21, R.cout ? C.bg : C.fg,
      { align: 'center', size: 15, weight: 700 });
    label(ctx, 'G=产生 / P=传播 / K=掐断', 8, ROW_S + CELL + 24, C.grid, { size: 9 });

    /* ---------- 门级内部（选中的那一位） ---------- */
    const dy = 186;
    label(ctx, '第 ' + selBit + ' 位的门级内部　（点上面的位可以换一位看）',
      8, dy - 8, C.fg, { size: 11, weight: 600 });
    const q = R.rows[selBit];
    const lsb = selBit === 0;
    label(ctx, 'a=' + q.a, 8, dy + 18, C.series(0), { size: 11, weight: 700 });
    label(ctx, 'b=' + q.b, 8, dy + 40, C.series(1), { size: 11, weight: 700 });
    label(ctx, 'cin=' + q.cin, 8, dy + 62, C.named('red'), { size: 11, weight: 700 });

    const gx = 58;
    const gy1 = dy + 4;
    const gy2 = dy + 34;
    const gy3 = dy + 62;
    /* 线：a,b → 第一级 */
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(46, gy1 + 8);
    ctx.lineTo(gx + 6, gy1 + 8);
    ctx.moveTo(46, gy2 + 8);
    ctx.lineTo(gx + 6, gy2 + 8);
    ctx.stroke();
    chip(ctx, gx, gy1, 54, 22, 'XOR', q.x, false);
    label(ctx, 'x = a⊕b', gx + 78, gy1 + 15, C.fg, { size: 10 });
    if (lsb) {
      label(ctx, '最低位只有两个输入，用半加器就够：和 = a⊕b，进位 = a·b',
        gx, gy2 + 16, C.grid, { size: 10 });
      if (gx + 250 + 54 < W) {
        chip(ctx, gx + 250, gy1, 54, 22, 'BUF', q.s, false);
        label(ctx, '和 S' + selBit, gx + 250, gy1 - 4, C.fg, { size: 10 });
      }
    }
    /* 第二级 */
    const gx2 = gx + 150;
    ctx.strokeStyle = q.x ? C.ok : C.axis;
    ctx.lineWidth = q.x ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(gx + 54, gy1 + 11);
    ctx.lineTo(gx2 + 6, gy1 + 11);
    ctx.stroke();
    ctx.strokeStyle = q.cin ? C.named('red') : C.axis;
    ctx.lineWidth = q.cin ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(46, gy3 + 11);
    ctx.lineTo(46, gy1 + 30);
    ctx.lineTo(gx2 + 6, gy1 + 30);
    ctx.stroke();
    chip(ctx, gx2, gy1, 54, 22, 'XOR', q.s, true);
    label(ctx, '和 S' + selBit + ' = x⊕cin', gx2 + 78, gy1 + 15, C.accent, { size: 10, weight: 600 });

    /* 进位支路 */
    if (!lsb) {
      chip(ctx, gx, gy3, 54, 22, 'AND', q.m1, false);
      label(ctx, 'a·b（产生）', gx + 62, gy3 + 15, C.fg, { size: 10 });
      chip(ctx, gx2, gy3, 54, 22, 'AND', q.m2, false);
      label(ctx, 'x·cin（传播）', gx2 + 62, gy3 + 15, C.fg, { size: 10 });
      const gx3 = gx2 + 150;
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx + 54, gy3 + 11);
      ctx.lineTo(gx3 + 6, gy3 + 3);
      ctx.moveTo(gx2 + 54, gy3 + 11);
      ctx.lineTo(gx3 + 6, gy3 + 19);
      ctx.stroke();
      chip(ctx, gx3, gy3 - 6, 54, 22, 'OR', q.cout, false);
      label(ctx, '进位 C' + (selBit + 1) + ' = a·b + x·cin', gx3 + 62, gy3 + 9, C.named('red'), { size: 10 });
    } else {
      chip(ctx, gx, gy3, 54, 22, 'AND', q.cout, false);
      label(ctx, '进位 C1 = a·b', gx + 62, gy3 + 15, C.named('red'), { size: 10 });
    }

    /* ---------- 甘特图：各位的和什么时候才算得出来 ---------- */
    const gyTop = 300;
    const gxo = 78;
    const gwd = W - gxo - 40;
    label(ctx, '进位波纹：每一位的和要等进位爬到（时间轴，单位 ns）',
      8, gyTop - 8, C.fg, { size: 11, weight: 600 });
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gxo, gyTop);
    ctx.lineTo(gxo, gyTop + bits * 14 + 8);
    ctx.stroke();
    const xt = (t) => gxo + (t / tMax) * gwd;
    for (let p = 0; p < bits; p += 1) {
      const y = gyTop + 6 + p * 14;
      const tValid = (p + 1) * s.tpd;   // 本位和稳定的时刻
      const tWait = p * s.tpd;          // 在此之前只能干等进位
      /* 等待段 */
      ctx.fillStyle = C.soft;
      ctx.fillRect(xt(0), y, Math.max(0, xt(tWait) - xt(0)), 10);
      /* 真正计算的最后一级 */
      ctx.fillStyle = C.series(p === selBit ? 2 : 5);
      ctx.fillRect(xt(tWait), y, Math.max(1, xt(tValid) - xt(tWait)), 10);
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1;
      ctx.strokeRect(xt(0), y, Math.max(1, xt(tValid) - xt(0)), 10);
      label(ctx, 'S' + p, 8, y + 9, p === selBit ? C.accent2 : C.fg, { size: 9, weight: 700 });
      label(ctx, fmt(tValid, 1), xt(tValid) + 6, y + 9, C.fg, { size: 9 });
    }
    /* 时间游标 */
    if (controls && controls.playing) {
      const xc = gxo + (Math.min(animT, tMax) / tMax) * gwd;
      ctx.strokeStyle = C.accent2;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(xc, gyTop - 2);
      ctx.lineTo(xc, gyTop + bits * 14 + 8);
      ctx.stroke();
      label(ctx, 't = ' + fmt(animT, 2) + ' ns', clamp(xc + 4, gxo, W - 70), gyTop - 4,
        C.accent2, { size: 9, weight: 700 });
    }
    label(ctx, '合计最坏延迟 = ' + bits + ' × ' + fmt(s.tpd, 1) + ' ns = '
      + fmt(bits * s.tpd, 1) + ' ns（位数翻倍，延迟也翻倍——这就是波纹的代价）',
      8, gyTop + bits * 14 + 24, C.fg, { size: 10 });

    /* ---------- 读数 ---------- */
    const sumBits = R.rows.slice().reverse().map((z) => z.s);
    const sumVal = bitsToInt(sumBits) + (R.cout ? 2 ** bits : 0);
    const abin = toBits(s.a, bits).join('');
    const bbin = toBits(s.b, bits).join('');
    const sbin = sumBits.join('');
    ro.set('算式', s.a + ' + ' + s.b + ' = ' + (s.a + s.b)
      + '　（' + abin + ' + ' + bbin + ' = ' + (R.cout ? '1' : '') + sbin + '）');
    ro.set('A', abin + '₂ = ' + s.a + '　点任意一位可翻转');
    ro.set('B', bbin + '₂ = ' + s.b);
    ro.set('和 S', sbin + '₂ = ' + bitsToInt(sumBits) + '　（不含进位）');
    ro.set('进位输出 Cout', R.cout
      ? '1　⚠ 无符号溢出：' + bits + ' 位装不下 ' + sumVal
      : '0　（结果在 ' + bits + ' 位范围内）');
    ro.set('最坏延迟', fmt(bits * s.tpd, 1) + ' ns = ' + bits + ' 级 × '
      + fmt(s.tpd, 1) + ' ns/级');
    const chain = R.rows.map((z) => (z.g ? 'G' : z.pk ? 'P' : 'K')).join(' → ');
    let run = 0;
    for (let p = 0; p < bits && R.rows[p].pk && !R.rows[p].g; p += 1) run += 1;
    ro.set('进位链', chain + '　（从最低位起连续 P 的位数 = ' + run
      + '，进位要一级一级穿过它们；全 P 时最慢）');
  }

  /* ---------- 交互 ---------- */
  bindPointer(cv.canvas, {
    pick: (x, y) => {
      const h = cellHit(x, y);
      if (!h || h.p === null) return null;
      return h.row + ':' + h.p;
    },
    down(id, x, y) {
      void id;
      const h = cellHit(x, y);
      if (!h || h.p === null) return;
      if (h.row === 'sel') {
        selBit = h.p;
        draw();
        return;
      }
      const arr = toBits(h.row === 'a' ? s.a : s.b, s.bits);
      const i = s.bits - 1 - h.p;
      paintVal = arr[i] ? 0 : 1;
      paintRow = h.row;
      arr[i] = paintVal;
      if (h.row === 'a') s.a = bitsToInt(arr);
      else s.b = bitsToInt(arr);
      syncSliders();
      draw();
    },
    move(id, x, y) {
      void id;
      if (!paintRow) return;
      const p = pAt(x);
      if (p === null) return;
      const arr = toBits(paintRow === 'a' ? s.a : s.b, s.bits);
      const i = s.bits - 1 - p;
      if (arr[i] === paintVal) return;
      arr[i] = paintVal;
      if (paintRow === 'a') s.a = bitsToInt(arr);
      else s.b = bitsToInt(arr);
      syncSliders();
      draw();
    },
    up() { paintRow = null; },
  });

  /* ---------- 滑块（位宽切换时重建） ---------- */
  const slidersBox = el('div', 'ml-viz__sliders');
  let sl = null;
  function sliderSpec() {
    const top = 2 ** s.bits - 1;
    return {
      sliders: [
        { name: 'a', label: '加数 A', min: 0, max: top, step: 1, value: s.a, fmt: 0 },
        { name: 'b', label: '加数 B', min: 0, max: top, step: 1, value: s.b, fmt: 0 },
        { name: 'tpd', label: '每级门延迟 t_pd (ns)', min: 0.5, max: 6, step: 0.5, value: s.tpd, fmt: 1 },
      ],
    };
  }
  function rebuildSliders() {
    if (sl) sl = null;
    slidersBox.innerHTML = '';
    const made = buildSliders(sliderSpec(), (v) => {
      s.a = Math.round(v.a);
      s.b = Math.round(v.b);
      s.tpd = v.tpd;
      draw();
    });
    while (made.box.firstChild) slidersBox.appendChild(made.box.firstChild);
    sl = made;
  }
  function syncSliders() {
    if (!sl) return;
    /* 点格子改了值时把滑块把手拉到同一位置 */
    setSliderRow(sl, 0, s.a);
    setSliderRow(sl, 1, s.b);
    setSliderRow(sl, 2, s.tpd);
  }
  rebuildSliders();

  const controls = anim(host, {
    onTick(dt) {
      animT += dt * ((s.bits + 0.6) * s.tpd / 2.0);
      if (animT > (s.bits + 0.9) * s.tpd) animT = 0;
      draw();
    },
    onReset() { animT = 0; draw(); },
  });

  draw();
  cv.redraw = draw;
  return {
    slidersBox,
    destroy() { controls.stop(); },
  };
}
