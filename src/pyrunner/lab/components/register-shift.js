/* =========================================================================
 * lab 组件：register-shift（寄存器与移位寄存器）
 * -------------------------------------------------------------------------
 * 演示什么：一串位躺在寄存器里，每来一个时钟上升沿就整体挪一格。
 *   左移 = ×2，右移 = ÷2（整数除），循环移位移出去的那一位从另一头绕回来。
 *   串行输入 Din 从一端挤进来，被挤出去的那一位在另一端变成串行输出 Dout。
 *
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "register-shift",
 *     "title": "一个 8 位移位寄存器：每来一个时钟，位就整体挪一格",
 *     "bits": 8,
 *     "mode": "left",
 *     "pattern": "10110010",
 *     "serIn": 0,
 *     "speed": 1.6
 *   }
 *   ```
 *
 * 字段（全部可省，省了用默认值）：
 *   bits     寄存器位数，4–16，默认 8
 *   mode     移位方向，默认 "left"
 *              "left"  逻辑左移：往 MSB 走，Din 从右端进，Dout 从左端出
 *              "right" 逻辑右移：往 LSB 走，Din 从左端进，Dout 从右端出
 *              "rol"   循环左移：从左端出去的那一位绕回右端
 *              "ror"   循环右移：从右端出去的那一位绕回左端
 *   pattern  初始位串，"0"/"1" 组成的字符串，左端是 MSB，默认 "10110010"
 *   serIn    串行输入端 Din 的初值 0/1，默认 0（循环模式下 Din 被忽略）
 *   speed    连续运行速度，单位「位 / 秒」，默认 1.6
 *
 * 能玩什么：
 *   - 单击任意格子 → 翻转这一位（相当于并行写入）
 *   - 上下拖动格子 → 直接把这一位设成 1（拖到上半格）或 0（拖到下半格）
 *   - 「单步时钟」走一步；「播放 / 暂停」连续移位；「重置」回到初始位串
 *   - 切 Din 的 0/1，看它是怎么从一端被挤进来的
 *   - 底部一条串行输出历史，每移出一位就追加一格
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, anim, buildSegmented, buildReadout,
  buildToolbar, buildSliders, mkBtn, label, clamp,
  clearBg,
} from '../core.js';
import { bitsToInt } from '../engines/logic.js';

const TOP = 44;      // 寄存器格子的上边
const CH = 56;       // 格子高
const MODES = [
  { label: '左移 ×2', value: 'left' },
  { label: '右移 ÷2', value: 'right' },
  { label: '循环左移', value: 'rol' },
  { label: '循环右移', value: 'ror' },
];
const MODE_NAME = {
  left: '逻辑左移（往 MSB 走 · Din 从右端进）',
  right: '逻辑右移（往 LSB 走 · Din 从左端进）',
  rol: '循环左移（移出去的那一位绕回右端）',
  ror: '循环右移（移出去的那一位绕回左端）',
};

/* 圆角矩形（不用 ctx.roundRect，老浏览器没有） */
function rrect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

/* 把 "10110010" 之类的字符串变成位数组（索引 0 是 MSB） */
function parsePattern(p, N) {
  const out = new Array(N).fill(0);
  if (typeof p !== 'string') return out;
  const t = p.replace(/[^01]/g, '');
  for (let i = 0; i < N; i += 1) {
    const c = t[t.length - N + i];
    out[i] = c === '1' ? 1 : 0;
  }
  return out;
}

export default function render(host, spec) {
  const s = {
    bits: Math.round(clamp(spec.bits ?? 8, 4, 16)),
    mode: MODES.some((m) => m.value === spec.mode) ? spec.mode : 'left',
    pattern: typeof spec.pattern === 'string' ? spec.pattern : '10110010',
    serIn: spec.serIn ? 1 : 0,
    speed: spec.speed ?? 1.6,
  };
  let N = s.bits;
  const initial = () => parsePattern(s.pattern, N);
  let bits = initial();
  let hist = [];           // 串行输出历史（旧 → 新）
  let phase = 0;           // 0..1，一次移位的动画进度
  let steps = 0;
  let dragIdx = null;
  let dragMoved = false;

  const cv = setupCanvas(host, 300);
  const ro = buildReadout({
    位串: '—', 十六进制: '—', 无符号: '—', 有符号补码: '—',
    串行输出: '—', 已移位: '—', 提示: '—',
  });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(MODES, s.mode, (v) => {
    s.mode = v;
    phase = 0;
    draw();
  }));

  const bStep = mkBtn('单步时钟');
  const bSer = mkBtn('串行输入 Din = 0');
  const bZero = mkBtn('清零');
  const bOne = mkBtn('全 1');
  host.appendChild(buildToolbar(bStep, bSer, bZero, bOne));

  function syncSer() {
    bSer.textContent = '串行输入 Din = ' + s.serIn;
    bSer.classList.toggle('is-active', !!s.serIn);
  }
  bStep.addEventListener('click', () => { commit(); phase = 0; draw(); });
  bSer.addEventListener('click', () => { s.serIn ^= 1; syncSer(); draw(); });
  bZero.addEventListener('click', () => { bits = new Array(N).fill(0); phase = 0; draw(); });
  bOne.addEventListener('click', () => { bits = new Array(N).fill(1); phase = 0; draw(); });
  syncSer();

  function geom() {
    const padL = 42;
    const padR = 42;
    const cw = Math.max(10, (cv.W - padL - padR) / N);
    return { padL, padR, cw, x: (i) => padL + i * cw };
  }

  /* 一次移位的结果：to = 新位串，inc = 进来的位，outv = 出去的位，dir = 屏幕方向 */
  function next() {
    const to = new Array(N).fill(0);
    if (s.mode === 'left' || s.mode === 'rol') {
      const outv = bits[0];
      const inc = s.mode === 'rol' ? outv : s.serIn;
      for (let i = 0; i < N - 1; i += 1) to[i] = bits[i + 1];
      to[N - 1] = inc;
      return { to, inc, outv, dir: -1 };
    }
    const outv = bits[N - 1];
    const inc = s.mode === 'ror' ? outv : s.serIn;
    for (let i = N - 1; i > 0; i -= 1) to[i] = bits[i - 1];
    to[0] = inc;
    return { to, inc, outv, dir: 1 };
  }

  function commit() {
    const nx = next();
    bits = nx.to;
    hist.push(nx.outv);
    if (hist.length > 16) hist.shift();
    steps += 1;
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    const g = geom();
    const nx = next();
    const off = nx.dir * phase * g.cw;

    label(ctx, N + ' 位移位寄存器 · ' + MODE_NAME[s.mode], 10, 18, C.fg, { size: 12, weight: 600 });

    /* 两端的端口名 */
    const exitLeft = nx.dir < 0;
    label(ctx, exitLeft ? '← Dout' : 'Din →', 6, TOP - 8, exitLeft ? C.accent2 : C.named('teal'), { size: 10 });
    label(ctx, exitLeft ? 'Din →' : '← Dout', W - 6, TOP - 8, exitLeft ? C.named('teal') : C.accent2,
      { size: 10, align: 'right' });

    /* 静止的框 */
    for (let i = 0; i < N; i += 1) {
      rrect(ctx, g.x(i) + 2, TOP, g.cw - 4, CH, 7);
      ctx.fillStyle = C.soft;
      ctx.fill();
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    /* 正在移动的位（含刚进来 / 正出去的两个） */
    const chips = [];
    for (let i = 0; i < N; i += 1) {
      chips.push({ v: bits[i], x: g.x(i) + off, a: 1 - phase * (nx.dir < 0 ? (i === 0 ? 1 : 0) : (i === N - 1 ? 1 : 0)) });
    }
    chips.push({ v: nx.inc, x: g.x(nx.dir < 0 ? N : -1) + off, a: phase });
    chips.forEach((c2) => {
      if (c2.a <= 0.02) return;
      ctx.globalAlpha = Math.min(1, c2.a);
      rrect(ctx, c2.x + 3, TOP + 4, g.cw - 6, CH - 8, 6);
      ctx.fillStyle = c2.v ? C.accent : C.bg;
      ctx.fill();
      ctx.strokeStyle = c2.v ? C.accent : C.axis;
      ctx.lineWidth = c2.v ? 2 : 1.4;
      ctx.stroke();
      label(ctx, String(c2.v), c2.x + g.cw / 2, TOP + CH / 2 + 8, c2.v ? C.bg : C.grid,
        { align: 'center', size: Math.min(24, g.cw * 0.5), weight: 700 });
      /* 上下拖动的把手提示 */
      ctx.fillStyle = c2.v ? C.bg : C.axis;
      ctx.globalAlpha = Math.min(1, c2.a) * 0.55;
      ctx.beginPath();
      ctx.moveTo(c2.x + g.cw / 2 - 4, TOP + 10);
      ctx.lineTo(c2.x + g.cw / 2 + 4, TOP + 10);
      ctx.lineTo(c2.x + g.cw / 2, TOP + 15);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    });
    ctx.globalAlpha = 1;

    /* 位序号与权重 */
    for (let i = 0; i < N; i += 1) {
      const k = N - 1 - i;
      if (g.cw >= 18) label(ctx, String(k), g.x(i) + g.cw / 2, TOP + CH + 14, C.fg, { align: 'center', size: 10 });
      if (g.cw >= 24) label(ctx, '2^' + k, g.x(i) + g.cw / 2, TOP + CH + 26, C.grid, { align: 'center', size: 8 });
    }

    /* 串行输出历史 */
    const hy = TOP + CH + 40;
    label(ctx, '串行输出 Dout（先出在左）', 10, hy + 13, C.fg, { size: 10 });
    const hx0 = 152;
    const hw = 22;
    hist.forEach((v, i) => {
      const x = hx0 + i * (hw + 3);
      if (x + hw > W - 6) return;
      ctx.fillStyle = v ? C.accent2 : C.soft;
      ctx.strokeStyle = v ? C.accent2 : C.axis;
      ctx.lineWidth = 1.2;
      rrect(ctx, x, hy, hw, 20, 4);
      ctx.fill();
      ctx.stroke();
      label(ctx, String(v), x + hw / 2, hy + 15, v ? C.bg : C.grid, { align: 'center', size: 11, weight: 600 });
    });
    if (!hist.length) label(ctx, '（还没移出过位）', hx0 + 2, hy + 14, C.grid, { size: 10 });

    /* 数值解释：无符号 / 补码有符号 */
    const u = bitsToInt(bits);
    const maxU = 2 ** N - 1;
    const sg = bits[0] ? u - 2 ** N : u;
    const lo = -(2 ** (N - 1));
    const hi = 2 ** (N - 1) - 1;
    const bars = [
      { y: hy + 40, name: '无符号', v: u, a: 0, b: maxU, txt: String(u) },
      { y: hy + 66, name: '补码有符号', v: sg, a: lo, b: hi, txt: String(sg) },
    ];
    bars.forEach((bar) => {
      const x0 = 10;
      const bw = W - 20;
      label(ctx, bar.name, x0, bar.y - 3, C.fg, { size: 10 });
      ctx.fillStyle = C.soft;
      ctx.fillRect(x0, bar.y, bw, 14);
      const t = (bar.v - bar.a) / (bar.b - bar.a);
      const zeroT = (0 - bar.a) / (bar.b - bar.a);
      const px = x0 + Math.max(0, Math.min(1, t)) * bw;
      ctx.fillStyle = C.accent;
      if (bar.a < 0) {
        ctx.fillRect(x0 + Math.min(t, zeroT) * bw, bar.y, Math.abs(t - zeroT) * bw, 14);
      } else {
        ctx.fillRect(x0, bar.y, Math.max(1, t * bw), 14);
      }
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(px, bar.y - 3);
      ctx.lineTo(px, bar.y + 17);
      ctx.stroke();
      label(ctx, bar.txt, x0 + bw, bar.y - 3, C.accent, { size: 10, weight: 600, align: 'right' });
      label(ctx, '[' + bar.a + ' , ' + bar.b + ']', x0 + 2, bar.y + 11, C.grid, { size: 8 });
    });

    label(ctx, '单击格子翻转 · 上下拖动直接设 1 / 0', 10, H - 6, C.grid, { size: 9 });

    ro.set('位串', bits.join('') + '（MSB → LSB）');
    ro.set('十六进制', '0x' + u.toString(16).toUpperCase().padStart(Math.ceil(N / 4), '0'));
    ro.set('无符号', u + ' / ' + maxU);
    ro.set('有符号补码', sg + '（范围 ' + lo + ' … ' + hi + '）');
    ro.set('串行输出', hist.length ? hist.join('') : '—');
    ro.set('已移位', steps + ' 次');
    ro.set('提示', s.mode === 'left' ? '左移一位 = ×2，最高位被挤出去变成 Dout'
      : s.mode === 'right' ? '右移一位 = ÷2（向下取整），最低位被挤出去变成 Dout'
        : '循环移位不丢位：转满 ' + N + ' 次回到原样');
  }

  bindPointer(cv.canvas, {
    pick(px, py) {
      if (py < TOP || py > TOP + CH) return null;
      const g = geom();
      const i = Math.floor((px - g.padL) / g.cw);
      if (i < 0 || i >= N) return null;
      return i;
    },
    down(id) {
      dragIdx = id;
      dragMoved = false;
      phase = 0;
    },
    move(id, px, py) {
      if (dragIdx === null || dragIdx === undefined) return;
      if (Math.abs(py - (TOP + CH / 2)) > 4) dragMoved = true;
      if (!dragMoved) return;
      const want = py < TOP + CH / 2 ? 1 : 0;
      if (bits[id] !== want) {
        bits[id] = want;
        draw();
      }
    },
    up(id) {
      if (!dragMoved && bits[id] !== undefined) {
        bits[id] ^= 1;
        draw();
      }
      dragIdx = null;
      dragMoved = false;
    },
  });

  const controls = anim(host, {
    onTick(dt) {
      if (phase === 0) {
        /* 动画期间不要重复取样 */
      }
      phase += dt * s.speed;
      while (phase >= 1) {
        commit();
        phase -= 1;
      }
      draw();
    },
    onReset() {
      bits = initial();
      hist = [];
      phase = 0;
      steps = 0;
      draw();
    },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'bits', label: '寄存器位数', min: 4, max: 16, step: 1, value: s.bits, fmt: 0 },
        { name: 'speed', label: '移位速度 (位/秒)', min: 0.3, max: 6, step: 0.1, value: s.speed, fmt: 1 },
      ],
    },
    (v) => {
      const nb = Math.round(v.bits);
      if (nb !== N) {
        N = nb;
        s.bits = nb;
        bits = initial();
        hist = [];
        phase = 0;
        steps = 0;
      }
      s.speed = v.speed;
      draw();
    },
  );

  draw();
  cv.redraw = draw;
  return {
    slidersBox: sliders.box,
    destroy() { controls.stop(); },
  };
}
