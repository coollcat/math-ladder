/* =========================================================================
 * lab 组件：counter-lab（计数器与时钟分频）
 * -------------------------------------------------------------------------
 * 演示什么：一个时钟沿打进来，计数器就 +1；每一位都是前一位的二分频——
 *   Q0 是 CLK 的 ÷2，Q1 是 ÷4，Q2 是 ÷8……计到模值 −1 后下一个沿回零，
 *   那一拍会吐出一个进位脉冲（RCO）。整块画布就是一张时序图。
 *
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "counter-lab",
 *     "title": "4 位二进制计数器：每一位都是前一位的二分频",
 *     "mod": 16,
 *     "div": 6,
 *     "fclk": 12,
 *     "speed": 3
 *   }
 *   ```
 *
 * 字段（全部可省，省了用默认值）：
 *   mod    模值（几进制），2–16，默认 16（即 4 位二进制计数器）。
 *          取 10 就是常见的十进制计数器（BCD）
 *   div    分频系数 n，1–16，默认 6（每 6 个时钟周期翻转一次，输出 CLK/6）
 *   fclk   时钟频率，单位 MHz，1–100，默认 12（只影响读数里的频率数字）
 *   speed  播放速度，单位「时钟周期 / 秒」，默认 3
 *
 * 能玩什么：
 *   - 拖动那条琥珀色的播放头（左右拖）→ 逐拍 scrub，看每一拍各输出是什么
 *   - 拖动「DIV ÷n」行右端的把手（上下拖）→ 直接改分频系数
 *   - 播放 / 暂停 / 重置
 *   - 红色竖虚线就是回零的那一拍，同时 RCO 拉高一拍
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, anim, buildReadout, buildToolbar,
  buildSliders, mkBtn, label, clamp, fmt,
  clearBg,
  setSliderRow,
} from '../core.js';

const TOP = 46;
const ROWH = 26;
const PADL = 92;

export default function render(host, spec) {
  const s = {
    mod: Math.round(clamp(spec.mod ?? 16, 2, 16)),
    div: Math.round(clamp(spec.div ?? 6, 1, 16)),
    fclk: clamp(spec.fclk ?? 12, 1, 100),
    speed: clamp(spec.speed ?? 3, 0.3, 12),
  };
  let head = 0;             // 播放头位置（单位：时钟周期，可带小数）
  let dragKind = null;

  const cv = setupCanvas(host, 300);
  const ro = buildReadout({
    当前计数值: '—', 二进制: '—', 已回零: '—', 分频输出: '—', 各级频率: '—', 说明: '—',
  });
  host.appendChild(ro.box);

  const bDec = mkBtn('十进制计数器 (mod 10)');
  const bBin = mkBtn('二进制计数器 (mod 16)');
  bDec.addEventListener('click', () => { s.mod = 10; syncSliders(); draw(); });
  bBin.addEventListener('click', () => { s.mod = 16; syncSliders(); draw(); });
  host.appendChild(buildToolbar(bDec, bBin));

  const bits = () => Math.max(1, Math.ceil(Math.log2(s.mod)));
  /* 窗口里放整数个计数循环，这样播放头绕回左端时波形无缝衔接 */
  const win = () => s.mod * Math.max(1, Math.round(32 / s.mod));

  function rows() {
    const n = bits();
    const out = [{ key: 'clk', name: 'CLK', color: 'amber' }];
    for (let i = 0; i < n; i += 1) {
      out.push({ key: 'q' + i, name: 'Q' + i + (i === 0 ? ' (LSB)' : i === n - 1 ? ' (MSB)' : ''), color: null, i });
    }
    out.push({ key: 'div', name: 'DIV ÷' + s.div, color: 'teal' });
    out.push({ key: 'rco', name: 'RCO 回零脉冲', color: 'red' });
    return out;
  }

  function countAt(k) {
    return ((k % s.mod) + s.mod) % s.mod;
  }

  function rowValue(key, k) {
    if (key === 'clk') return null;
    const c = countAt(k);
    if (key === 'div') return Math.floor(k / s.div) & 1;
    if (key === 'rco') return c === s.mod - 1 ? 1 : 0;
    return (c >> Number(key.slice(1))) & 1;
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    const n = bits();
    const NWIN = win();
    const x0 = PADL;
    const x1 = W - 10;
    const X = (t) => x0 + (t / NWIN) * (x1 - x0);
    const rs = rows();
    const plotBot = TOP + rs.length * ROWH;

    label(ctx, s.mod + ' 进制计数器（' + n + ' 位）· 时钟 ' + fmt(s.fclk, 0) + ' MHz', 10, 18, C.fg,
      { size: 12, weight: 600 });
    label(ctx, '拖琥珀色播放头逐拍看 · 红色虚线 = 回零那一拍', 10, 32, C.grid, { size: 10 });

    /* 回零竖线 */
    for (let k = 0; k <= NWIN; k += 1) {
      if (k === 0 || k % s.mod !== 0) continue;
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = C.bad;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(X(k), TOP - 6);
      ctx.lineTo(X(k), plotBot + 2);
      ctx.stroke();
      ctx.restore();
      if (k <= s.mod) label(ctx, '回零', X(k) + 3, TOP - 8, C.bad, { size: 9 });
    }

    /* 各行波形 */
    rs.forEach((r, ri) => {
      const yb = TOP + ri * ROWH + ROWH;
      const yHi = yb - 16;
      const yLo = yb - 4;
      const col = r.color ? C.named(r.color) : r.key === 'rco' ? C.bad : C.series(r.i ?? 0);

      /* 通道底纹 */
      ctx.fillStyle = C.soft;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x0, yHi - 5, x1 - x0, ROWH - 4);
      ctx.globalAlpha = 1;

      label(ctx, r.name, x0 - 8, yLo - 1, col, { align: 'right', size: 10, weight: 600 });

      ctx.strokeStyle = col;
      ctx.lineWidth = ri === 0 ? 2 : 1.8;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      let prev = null;
      for (let h = 0; h <= NWIN * 2; h += 1) {
        const t = h / 2;
        const k = Math.floor(t);
        let v;
        if (r.key === 'clk') v = t - k < 0.5 ? 1 : 0;
        else v = rowValue(r.key, k);
        const x = X(t);
        const y = v ? yHi : yLo;
        if (prev === null) ctx.moveTo(x, y);
        else {
          ctx.lineTo(x, prev ? yHi : yLo);
          ctx.lineTo(x, y);
        }
        prev = v;
      }
      ctx.stroke();

      /* DIV 行右端的分频把手（可上下拖） */
      if (r.key === 'div') {
        const hx = x1 - 54;
        const hy = yHi - 5;
        ctx.fillStyle = C.accent;
        ctx.strokeStyle = C.axis;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(hx, hy, 52, ROWH - 4);
        ctx.fill();
        ctx.stroke();
        label(ctx, '÷' + s.div + ' ⇕', hx + 26, hy + 15, C.bg, { align: 'center', size: 10, weight: 700 });
      }
    });

    /* 时间刻度 */
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k <= NWIN; k += Math.max(1, Math.round(NWIN / 16))) {
      ctx.moveTo(X(k), plotBot);
      ctx.lineTo(X(k), plotBot + 4);
    }
    ctx.stroke();
    for (let k = 0; k <= NWIN; k += Math.max(1, Math.round(NWIN / 8))) {
      label(ctx, String(k), X(k), plotBot + 15, C.fg, { align: 'center', size: 9 });
    }
    label(ctx, '时钟周期数', x1, plotBot + 15, C.grid, { align: 'right', size: 9 });

    /* 播放头 */
    const hx = X(head);
    ctx.strokeStyle = C.named('amber');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx, TOP - 8);
    ctx.lineTo(hx, plotBot + 6);
    ctx.stroke();
    ctx.fillStyle = C.named('amber');
    ctx.beginPath();
    ctx.moveTo(hx, TOP - 10);
    ctx.lineTo(hx - 5, TOP - 18);
    ctx.lineTo(hx + 5, TOP - 18);
    ctx.closePath();
    ctx.fill();

    /* 当前拍的电平标注 */
    const kNow = Math.floor(head + 1e-9);
    const cNow = countAt(kNow);
    let yy = plotBot + 32;
    label(ctx, '第 ' + kNow + ' 拍（上升沿后）：Q = '
      + Array.from({ length: n }, (_, i) => (cNow >> (n - 1 - i)) & 1).join('')
      + '，DIV = ' + (Math.floor(kNow / s.div) & 1)
      + '，RCO = ' + (cNow === s.mod - 1 ? 1 : 0), x0, yy, C.fg, { size: 10 });
    yy += 16;
    label(ctx, '分频链：' + Array.from({ length: n }, (_, i) => 'Q' + i + ' = ' + fmt(s.fclk / 2 ** (i + 1), 3) + ' MHz').join('　')
      + '　DIV = ' + fmt(s.fclk / s.div, 3) + ' MHz', x0, yy, C.grid, { size: 9 });

    ro.set('当前计数值', cNow + ' / ' + (s.mod - 1) + '（模 ' + s.mod + '）');
    ro.set('二进制', Array.from({ length: n }, (_, i) => (cNow >> (n - 1 - i)) & 1).join(''));
    ro.set('已回零', Math.floor(kNow / s.mod) + ' 次（第 ' + (kNow % s.mod) + ' 拍是本次循环的第 ' + (kNow % s.mod + 1) + ' 个状态）');
    ro.set('分频输出', 'CLK ÷ ' + s.div + ' = ' + fmt(s.fclk / s.div, 4) + ' MHz，占空比 50%');
    ro.set('各级频率', Array.from({ length: n }, (_, i) => 'Q' + i + ' ' + fmt(s.fclk / 2 ** (i + 1), 3)).join(' / ') + ' MHz');
    ro.set('说明', s.mod === 10
      ? '十进制计数器：计到 9 后回零，浪费了 10–15 这六个状态'
      : 'n 位二进制计数器自由跑就是天然的 ÷2ⁿ 分频器，模值 = 2^' + n + ' = ' + s.mod);
  }

  bindPointer(cv.canvas, {
    pick(px, py) {
      const NWIN = win();
      const x0 = PADL;
      const x1 = cv.W - 10;
      const X = (t) => x0 + (t / NWIN) * (x1 - x0);
      const rs = rows();
      const di = rs.findIndex((r) => r.key === 'div');
      if (di >= 0) {
        const hy = TOP + di * ROWH + ROWH - 16 - 5;
        if (px >= x1 - 58 && px <= x1 && py >= hy - 4 && py <= hy + ROWH) return 'div';
      }
      if (Math.abs(px - X(head)) <= 9 && py >= TOP - 20 && py <= TOP + rs.length * ROWH + 8) return 'head';
      if (py >= TOP - 20 && py <= TOP + rs.length * ROWH + 8 && px >= x0 - 20) return 'head';
      return null;
    },
    down(id, px, py) {
      dragKind = id;
      if (id === 'head') {
        const NWIN = win();
        const x0 = PADL;
        const x1 = cv.W - 10;
        head = clamp(((px - x0) / (x1 - x0)) * NWIN, 0, NWIN);
        draw();
      }
    },
    move(id, px, py) {
      if (id === 'head') {
        const NWIN = win();
        const x0 = PADL;
        const x1 = cv.W - 10;
        head = clamp(((px - x0) / (x1 - x0)) * NWIN, 0, NWIN);
        draw();
      } else if (id === 'div') {
        const rs = rows();
        const di = rs.findIndex((r) => r.key === 'div');
        const hy = TOP + di * ROWH + ROWH - 16 - 5;
        const rel = (py - (hy + ROWH / 2)) / 12;
        const nv = Math.round(clamp(s.div - rel, 1, 16));
        if (nv !== s.div) {
          s.div = nv;
          syncSliders();
          draw();
        }
      }
    },
    up() { dragKind = null; },
  });

  const controls = anim(host, {
    onTick(dt) {
      head += dt * s.speed;
      const NWIN = win();
      if (head >= NWIN) head -= NWIN;
      draw();
    },
    onReset() { head = 0; draw(); },
  });

  let sliders = null;
  function syncSliders() {
    if (!sliders) return;
    setSliderRow(sliders, 0, s.mod);
    setSliderRow(sliders, 1, s.div);
  }
  /* 不重建滑块组（拖把手时会丢焦点），只在 s 变化时把数值写回 DOM */
  sliders = buildSliders(
    {
      sliders: [
        { name: 'mod', label: '模值（几进制）', min: 2, max: 16, step: 1, value: s.mod, fmt: 0 },
        { name: 'div', label: '分频系数 n', min: 1, max: 16, step: 1, value: s.div, fmt: 0 },
        { name: 'fclk', label: '时钟频率 (MHz)', min: 1, max: 100, step: 1, value: s.fclk, fmt: 0 },
        { name: 'speed', label: '播放速度 (周期/秒)', min: 0.3, max: 12, step: 0.1, value: s.speed, fmt: 1 },
      ],
    },
    (v) => {
      s.mod = Math.round(v.mod);
      s.div = Math.round(v.div);
      s.fclk = v.fclk;
      s.speed = v.speed;
      head = clamp(head, 0, win());
      draw();
    },
  );
  void dragKind;

  draw();
  cv.redraw = draw;
  return {
    slidersBox: sliders.box,
    destroy() { controls.stop(); },
  };
}
