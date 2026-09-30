/* =========================================================================
 * lab 组件：fsm-lab（同步状态机设计）
 * -------------------------------------------------------------------------
 * 演示什么：一个时钟一个输入，状态机就跳一格。
 *   四个自带的经典状态机各代表一类：1101 序列检测器（Mealy，重叠检测）、
 *   模 3 计数器（Moore，输出挂在状态上）、交通灯（Moore + 定时信号）、
 *   奇偶校验器（Mealy，输出挂在转移上）。当前状态高亮，走过的那条边加粗，
 *   下面两条带子分别是输入历史与输出历史。
 *
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "fsm-lab",
 *     "title": "Mealy 机：边上一出现 1101，输出就吐一个 1",
 *     "fsm": "seq1101",
 *     "seq": "1101101",
 *     "speed": 1.8
 *   }
 *   ```
 *
 * 字段（全部可省，省了用默认值）：
 *   fsm    选哪个状态机，默认 "seq1101"
 *            "seq1101" 1101 序列检测器（Mealy，允许重叠）
 *            "mod3"    模 3 计数器（Moore，数输入 1 的个数）
 *            "traffic" 交通灯控制器（Moore，输入 t = 定时到）
 *            "parity"  奇偶校验器（Mealy，输出 = 已收到 1 的个数的奇偶）
 *   seq    初始输入序列字符串，默认 "1101101"。字符不在该机字母表里时按字母表回绕
 *   speed  自动播放速度，单位「步 / 秒」，默认 1.8
 *
 * 能玩什么：
 *   - 拖动状态节点重排转移图（拖过的位置会记住）
 *   - 底部输入带上：单击一格切到下一个输入；按住横着一刷，扫过的格子全刷成同一个值
 *   - 「单步」推进一步，「回退一步」退一步；播放 / 暂停自动走；重置回到初始状态
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, anim, buildSegmented, buildReadout,
  buildToolbar, buildSliders, mkBtn, label, clamp,
  clearBg,
} from '../core.js';

/* ---------- 四个自带状态机 ---------- */

const FSMS = {
  seq1101: {
    title: '「1101」序列检测器（Mealy · 重叠检测）',
    kind: 'mealy',
    inputs: ['0', '1'],
    start: 'S0',
    states: [
      { id: 'S0', desc: '还没对上' },
      { id: 'S1', desc: '收到 1' },
      { id: 'S2', desc: '收到 11' },
      { id: 'S3', desc: '收到 110' },
    ],
    trans: [
      { from: 'S0', to: 'S1', in: '1', out: '0' },
      { from: 'S0', to: 'S0', in: '0', out: '0' },
      { from: 'S1', to: 'S2', in: '1', out: '0' },
      { from: 'S1', to: 'S0', in: '0', out: '0' },
      { from: 'S2', to: 'S2', in: '1', out: '0' },
      { from: 'S2', to: 'S3', in: '0', out: '0' },
      { from: 'S3', to: 'S1', in: '1', out: '1' },
      { from: 'S3', to: 'S0', in: '0', out: '0' },
    ],
    note: 'S3 收到 1 就报一次并回到 S1 —— 末尾那个 1 同时是下一串 1101 的开头（重叠检测）',
  },
  mod3: {
    title: '模 3 计数器（Moore · 输出挂在状态上）',
    kind: 'moore',
    inputs: ['0', '1'],
    start: 'S0',
    states: [
      { id: 'S0', out: '0', desc: '计数 0' },
      { id: 'S1', out: '1', desc: '计数 1' },
      { id: 'S2', out: '2', desc: '计数 2' },
    ],
    trans: [
      { from: 'S0', to: 'S1', in: '1' },
      { from: 'S1', to: 'S2', in: '1' },
      { from: 'S2', to: 'S0', in: '1' },
      { from: 'S0', to: 'S0', in: '0' },
      { from: 'S1', to: 'S1', in: '0' },
      { from: 'S2', to: 'S2', in: '0' },
    ],
    note: 'Moore 机的输出只由状态决定，所以它比 Mealy 机晚一拍、但更抗输入毛刺',
  },
  traffic: {
    title: '交通灯控制器（Moore · 定时信号驱动）',
    kind: 'moore',
    inputs: ['-', 't'],
    start: 'G',
    states: [
      { id: 'G', out: '绿', desc: '绿灯放行' },
      { id: 'Y', out: '黄', desc: '黄灯过渡' },
      { id: 'R', out: '红', desc: '红灯禁行' },
    ],
    trans: [
      { from: 'G', to: 'Y', in: 't' },
      { from: 'Y', to: 'R', in: 't' },
      { from: 'R', to: 'G', in: 't' },
      { from: 'G', to: 'G', in: '-' },
      { from: 'Y', to: 'Y', in: '-' },
      { from: 'R', to: 'R', in: '-' },
    ],
    note: '输入 t = 这段时间的定时到了；没到就一直是 -，状态原地不动',
  },
  parity: {
    title: '奇偶校验器（Mealy · 输出挂在转移上）',
    kind: 'mealy',
    inputs: ['0', '1'],
    start: 'EVEN',
    states: [
      { id: 'EVEN', desc: '已收到偶数个 1' },
      { id: 'ODD', desc: '已收到奇数个 1' },
    ],
    trans: [
      { from: 'EVEN', to: 'EVEN', in: '0', out: '0' },
      { from: 'EVEN', to: 'ODD', in: '1', out: '1' },
      { from: 'ODD', to: 'ODD', in: '0', out: '1' },
      { from: 'ODD', to: 'EVEN', in: '1', out: '0' },
    ],
    note: 'Mealy 机的输出跟着「状态 + 输入」变：同一个状态喂不同输入，输出就不同',
  },
};

const NR = 26;            // 状态节点半径
const DIAGRAM_H = 224;    // 上半部状态转移图的高度
const TAPE_X = 62;

export default function render(host, spec) {
  const s = {
    fsm: FSMS[spec.fsm] ? spec.fsm : 'seq1101',
    speed: clamp(spec.speed ?? 1.8, 0.2, 6),
  };
  const layouts = {};      // 每个状态机记一份节点位置（拖动过就留存）
  let cur = null;
  let ptr = 0;
  let outs = [];
  let path = [];
  let lastEdge = null;
  let hits = 0;
  let seq = [];
  let dragNode = null;
  let paintVal = null;
  let paintMoved = false;
  let acc = 0;

  const cv = setupCanvas(host, 368);
  const ro = buildReadout({
    当前状态: '—', 当前输入: '—', 当前输出: '—', 类型: '—',
    已走步数: '—', 命中次数: '—', 状态编码: '—',
  });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(
    [
      { label: '1101 检测', value: 'seq1101' },
      { label: '模 3 计数', value: 'mod3' },
      { label: '交通灯', value: 'traffic' },
      { label: '奇偶校验', value: 'parity' },
    ],
    s.fsm,
    (v) => { s.fsm = v; resetAll(); draw(); },
  ));

  const bStep = mkBtn('单步');
  const bBack = mkBtn('回退一步');
  host.appendChild(buildToolbar(bStep, bBack));
  bStep.addEventListener('click', () => { step(); draw(); });
  bBack.addEventListener('click', () => { unstep(); draw(); });

  const f = () => FSMS[s.fsm];

  function parseSeq(str) {
    const alpha = f().inputs;
    const raw = typeof str === 'string' ? str.replace(/\s+/g, '') : '';
    const base = raw.length ? raw.split('') : ['1', '1', '0', '1', '1', '0', '1'];
    return base.slice(0, 32).map((ch) => {
      const i = alpha.indexOf(ch);
      return alpha[i >= 0 ? i : 0];
    });
  }

  function resetAll() {
    cur = f().start;
    seq = parseSeq(spec.seq);
    ptr = 0;
    outs = [];
    path = [f().start];
    lastEdge = null;
    hits = 0;
  }

  function step() {
    if (ptr >= seq.length) return false;
    const inp = seq[ptr];
    const t = f().trans.find((x) => x.from === cur && x.in === inp);
    if (!t) return false;
    const out = f().kind === 'moore'
      ? (f().states.find((x) => x.id === t.to) || {}).out
      : t.out;
    lastEdge = t;
    cur = t.to;
    outs.push(out);
    path.push(cur);
    if (out === '1') hits += 1;
    ptr += 1;
    return true;
  }

  /* 回退：状态机没有逆函数，只能从头重放到 ptr-1 */
  function unstep() {
    if (ptr <= 0) return;
    const save = seq.slice();
    const n = ptr - 1;
    resetAll();
    seq = save;
    for (let i = 0; i < n; i += 1) step();
  }

  function layout() {
    const st = f().states;
    if (!layouts[s.fsm]) {
      const cx = cv.W * 0.5;
      const cy = 112;
      const R = Math.min(96, 44 + st.length * 17);
      const o = {};
      st.forEach((sd, i) => {
        const a = -Math.PI / 2 + (i / st.length) * Math.PI * 2;
        o[sd.id] = { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
      });
      layouts[s.fsm] = o;
    }
    const o = layouts[s.fsm];
    Object.keys(o).forEach((k) => {
      o[k].x = clamp(o[k].x, NR + 4, Math.max(NR + 5, cv.W - NR - 4));
      o[k].y = clamp(o[k].y, NR + 34, DIAGRAM_H - NR - 8);
    });
    return o;
  }

  /* 同一对节点之间的多条边要分开弯，否则叠在一起看不清 */
  function edgeCurves() {
    const groups = {};
    f().trans.forEach((t, i) => {
      const k = [t.from, t.to].sort().join('|');
      (groups[k] = groups[k] || []).push(i);
    });
    const out = [];
    Object.keys(groups).forEach((k) => {
      const g = groups[k];
      g.forEach((idx, j) => { out[idx] = g.length === 1 ? 0 : (j - (g.length - 1) / 2) * 1.05; });
    });
    return out;
  }

  function arrowHead(ctx, ex, ey, fx, fy, col, on) {
    const dx = ex - fx;
    const dy = ey - fy;
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d;
    const uy = dy / d;
    const L = on ? 9 : 7;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - ux * L - uy * 4.5, ey - uy * L + ux * 4.5);
    ctx.lineTo(ex - ux * L + uy * 4.5, ey - uy * L - ux * 4.5);
    ctx.closePath();
    ctx.fill();
  }

  function edgeText(t) {
    return f().kind === 'moore' ? t.in : t.in + ' / ' + t.out;
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    const F = f();
    const pos = layout();
    const curves = edgeCurves();

    label(ctx, F.title, 10, 16, C.fg, { size: 12, weight: 600 });
    label(ctx, '拖动节点可重排 · 加粗的那条边就是刚刚走过的一步', 10, 30, C.grid, { size: 10 });

    /* ---- 转移边 ---- */
    F.trans.forEach((t, i) => {
      const p0 = pos[t.from];
      const p1 = pos[t.to];
      const on = lastEdge === t;
      const col = on ? C.accent : C.grid;
      const txt = edgeText(t);
      if (t.from === t.to) {
        const ax = p0.x;
        const ay = p0.y - NR;
        ctx.strokeStyle = col;
        ctx.lineWidth = on ? 2.4 : 1.4;
        ctx.beginPath();
        ctx.arc(ax, ay - 13, 15, Math.PI * 0.12, Math.PI * 0.88, true);
        ctx.stroke();
        const ex2 = ax + 15 * Math.cos(Math.PI * 0.12);
        const ey2 = ay - 13 - 15 * Math.sin(Math.PI * 0.12);
        arrowHead(ctx, ex2, ey2, ax, ay - 13, col, on);
        label(ctx, txt, ax, ay - 36, col, { align: 'center', size: 10, weight: on ? 700 : 400 });
        return;
      }
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const d = Math.hypot(dx, dy) || 1;
      const ux = dx / d;
      const uy = dy / d;
      const cc = curves[i] || 0;
      const sx = p0.x + ux * NR;
      const sy = p0.y + uy * NR;
      const ex = p1.x - ux * NR;
      const ey = p1.y - uy * NR;
      const mx = (sx + ex) / 2 + (-uy) * cc * 38;
      const my = (sy + ey) / 2 + ux * cc * 38;
      ctx.strokeStyle = col;
      ctx.lineWidth = on ? 2.6 : 1.4;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(mx, my, ex, ey);
      ctx.stroke();
      arrowHead(ctx, ex, ey, mx, my, col, on);
      const lx = 0.25 * sx + 0.5 * mx + 0.25 * ex;
      const ly = 0.25 * sy + 0.5 * my + 0.25 * ey;
      ctx.font = '400 10px system-ui, -apple-system, "Segoe UI", sans-serif';
      const tw = ctx.measureText(txt).width;
      ctx.fillStyle = C.bg;
      ctx.fillRect(lx - tw / 2 - 2, ly - 9, tw + 4, 12);
      label(ctx, txt, lx, ly, col, { align: 'center', size: 10, weight: on ? 700 : 400 });
    });

    /* ---- 状态节点 ---- */
    const encBits = Math.max(1, Math.ceil(Math.log2(F.states.length)));
    F.states.forEach((sd, i) => {
      const p = pos[sd.id];
      const on = sd.id === cur;
      ctx.beginPath();
      ctx.arc(p.x, p.y, NR, 0, Math.PI * 2);
      ctx.fillStyle = on ? C.accent : C.soft;
      ctx.fill();
      ctx.strokeStyle = on ? C.accent : C.axis;
      ctx.lineWidth = on ? 3 : 1.6;
      ctx.stroke();
      if (on) {
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(p.x, p.y, NR + 6, 0, Math.PI * 2);
        ctx.strokeStyle = C.accent;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      label(ctx, sd.id, p.x, p.y + 1, on ? C.bg : C.fg, { align: 'center', size: 13, weight: 700 });
      if (F.kind === 'moore') {
        label(ctx, '/' + sd.out, p.x, p.y + 15, on ? C.bg : C.accent2, { align: 'center', size: 10, weight: 600 });
      } else {
        label(ctx, sd.desc, p.x, p.y + NR + 13, on ? C.accent : C.grid, { align: 'center', size: 9 });
      }
      label(ctx, i.toString(2).padStart(encBits, '0'), p.x + NR + 3, p.y - NR + 3, C.grid, { size: 8 });
    });

    /* ---- 分隔线 ---- */
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, DIAGRAM_H);
    ctx.lineTo(W, DIAGRAM_H);
    ctx.stroke();

    /* ---- 输入 / 输出带 ---- */
    const tapeY = DIAGRAM_H + 34;
    const cellW = clamp((W - TAPE_X - 16) / Math.max(6, seq.length) - 3, 12, 30);
    label(ctx, '输入 x', 8, tapeY + 15, C.fg, { size: 10, weight: 600 });
    label(ctx, '输出 z', 8, tapeY + 47, C.fg, { size: 10, weight: 600 });
    seq.forEach((v, i) => {
      const x = TAPE_X + i * (cellW + 3);
      const used = i < ptr;
      const now = i === ptr;
      ctx.fillStyle = now ? C.named('amber') : used ? C.soft : C.bg;
      ctx.strokeStyle = now ? C.named('amber') : C.axis;
      ctx.lineWidth = now ? 2 : 1;
      ctx.beginPath();
      ctx.rect(x, tapeY, cellW, 22);
      ctx.fill();
      ctx.stroke();
      label(ctx, v, x + cellW / 2, tapeY + 16, now ? C.bg : used ? C.fg : C.grid,
        { align: 'center', size: 11, weight: 700 });
      const ov = used ? outs[i] : null;
      ctx.fillStyle = ov === '1' ? C.ok : ov ? C.soft : C.bg;
      ctx.strokeStyle = ov === '1' ? C.ok : C.axis;
      ctx.lineWidth = ov === '1' ? 2 : 1;
      ctx.beginPath();
      ctx.rect(x, tapeY + 32, cellW, 22);
      ctx.fill();
      ctx.stroke();
      if (ov) {
        label(ctx, ov, x + cellW / 2, tapeY + 48, ov === '1' ? C.bg : C.fg,
          { align: 'center', size: 11, weight: 700 });
      }
    });

    /* ---- 状态轨迹 ---- */
    const ty = tapeY + 76;
    const shown = path.slice(-14);
    label(ctx, '状态轨迹', 8, ty, C.fg, { size: 10, weight: 600 });
    shown.forEach((node, i) => {
      const x = TAPE_X + i * 44;
      if (x > W - 24) return;
      const isLast = i === shown.length - 1;
      label(ctx, node, x, ty, isLast ? C.accent : C.fg, { size: 10, weight: isLast ? 700 : 400 });
      if (i < shown.length - 1) label(ctx, '→', x + 32, ty, C.grid, { size: 10 });
    });
    label(ctx, F.note, 8, H - 6, C.grid, { size: 9 });

    const curOut = F.kind === 'moore'
      ? (F.states.find((x) => x.id === cur) || {}).out
      : (ptr > 0 ? outs[ptr - 1] : '—');
    ro.set('当前状态', cur);
    ro.set('当前输入', ptr < seq.length ? seq[ptr] : '（走到头了）');
    ro.set('当前输出', curOut === undefined ? '—' : String(curOut));
    ro.set('类型', F.kind === 'moore' ? 'Moore（输出只由状态决定）' : 'Mealy（输出由状态 + 输入决定）');
    ro.set('已走步数', ptr + ' / ' + seq.length);
    ro.set('命中次数', hits + ' 次输出为 1');
    ro.set('状态编码', F.states.length + ' 个状态 → 至少 ' + encBits + ' 个触发器（'
      + F.states.map((sd, i) => sd.id + '=' + i.toString(2).padStart(encBits, '0')).join('  ') + '）');
  }

  /* ---------- 交互：拖节点 + 刷输入带 ---------- */

  function tapeCellAt(px, py) {
    const tapeY = DIAGRAM_H + 34;
    if (py < tapeY - 4 || py > tapeY + 58) return -1;
    const cellW = clamp((cv.W - TAPE_X - 16) / Math.max(6, seq.length) - 3, 12, 30);
    const i = Math.floor((px - TAPE_X) / (cellW + 3));
    if (i < 0 || i >= seq.length) return -1;
    if (px > TAPE_X + i * (cellW + 3) + cellW + 3) return -1;
    return i;
  }

  function nodeAt(px, py) {
    const pos = layout();
    let hit = null;
    let bd = NR + 6;
    Object.keys(pos).forEach((k) => {
      const d = Math.hypot(px - pos[k].x, py - pos[k].y);
      if (d < bd) { bd = d; hit = k; }
    });
    return hit;
  }

  bindPointer(cv.canvas, {
    pick(px, py) {
      const n = nodeAt(px, py);
      if (n) return { kind: 'node', id: n };
      const t = tapeCellAt(px, py);
      if (t >= 0) return { kind: 'tape', i: t };
      return null;
    },
    down(id) {
      if (id.kind === 'node') {
        dragNode = id.id;
      } else {
        /* 按下就把这一格切到下一个输入，之后横扫会把扫过的格子刷成同一个值 */
        const alpha = f().inputs;
        const k = alpha.indexOf(seq[id.i]);
        paintVal = alpha[(k + 1) % alpha.length];
        paintMoved = false;
        seq[id.i] = paintVal;
        draw();
      }
    },
    move(id, px, py) {
      if (id.kind === 'node') {
        const pos = layout();
        if (!pos[dragNode]) return;
        pos[dragNode].x = clamp(px, NR + 4, Math.max(NR + 5, cv.W - NR - 4));
        pos[dragNode].y = clamp(py, NR + 34, DIAGRAM_H - NR - 8);
        draw();
        return;
      }
      const j = tapeCellAt(px, py);
      if (j >= 0 && j !== id.i) paintMoved = true;
      if (j >= 0 && seq[j] !== paintVal) {
        seq[j] = paintVal;
        draw();
      }
    },
    up() {
      dragNode = null;
      paintVal = null;
      paintMoved = false;
    },
  });

  const controls = anim(host, {
    onTick(dt) {
      acc += dt;
      if (acc < 1 / s.speed) return;
      acc = 0;
      if (!step()) return;
      draw();
    },
    onReset() { acc = 0; resetAll(); draw(); },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'speed', label: '播放速度 (步/秒)', min: 0.2, max: 6, step: 0.1, value: s.speed, fmt: 1 },
      ],
    },
    (v) => { s.speed = v.speed; draw(); },
  );

  resetAll();
  draw();
  cv.redraw = draw;
  return {
    slidersBox: sliders.box,
    destroy() { controls.stop(); },
  };
}
