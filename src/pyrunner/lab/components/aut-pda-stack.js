/* =========================================================================
 * lab 组件：aut-pda-stack —— 下推自动机的栈变化（第 31 章 · 70 课）
 * -------------------------------------------------------------------------
 * 演示什么：一台识别 a^n b^n 的非确定 PDA。左边是有限控制（q0 压栈 / q1 弹栈 /
 * qf 接受），右边是一根真实的栈。每读一个符号：栈顶压入一个 A，或者弹出一个 A。
 * 底部同时打印这次的动作三元组 (状态, 输入, 栈顶) → (新状态, 替换串)，
 * 与课文第 3 节的形式定义逐字对齐。
 *
 * 接受约定按本课第 3 节的说法：**读完输入且栈里只剩底符 $**（终态接受那一路
 * 由 qf 承担，两条约定在这里刚好重合）。栈不空、或遇到 pop 但栈顶不是 A、
 * 或读 b 时栈顶已是 $ —— 三种情况一律拒绝，读数条会写明是哪一种。
 *
 * 用法（课文 lab 围栏）：
 *   { "type": "aut-pda-stack",
 *     "title": "aabb 走一遍：两个 a 压进去，两个 b 弹出来",
 *     "input": "aabb" }
 *
 * 字段（都可省）：
 *   input    只保留 a / b；滤空或未给就用 "aabb"
 *   height   画布高度，默认 470
 *
 * 能玩什么：
 *   - 「单步」读一个符号（压栈或弹栈有独立的小动画：新格子淡入 / 顶格淡出）
 *   - 「回退」把上一步的栈整根取回；「重置」回到栈里只有 $
 *   - 顶部分段器换预设输入：aabb / aaabbb（接受）、aabbb / abab（拒绝）
 * ========================================================================= */

import {
  themeColors, setupCanvas, label, clamp, clearBg,
  buildToolbar, buildReadout, buildSegmented, anim, mkBtn,
} from '../core.js';
import {
  drawNode, drawCurvedArrow, drawSelfLoop, bendsFor, drawEdgeLabel, drawTape, placeIn,
} from './aut-graph-base.js';

const STATES = [
  { id: 'q0', tag: '压栈阶段', pos: [0.16, 0.5] },
  { id: 'q1', tag: '弹栈阶段', pos: [0.55, 0.5] },
  { id: 'qf', tag: '终态', pos: [0.9, 0.5] },
];

/* 转移：读 a 压 A（留在 q0）；读 b 时若栈顶是 A 则弹出；顶到 $ 就转 qf */
const TRANS = [
  { from: 'q0', to: 'q0', on: 'a', top: 'any', push: 'A', label: 'a, X / AX' },
  { from: 'q0', to: 'q1', on: 'b', top: 'A', pop: 'A', label: 'b, A / ε' },
  { from: 'q1', to: 'q1', on: 'b', top: 'A', pop: 'A', label: 'b, A / ε' },
  { from: 'q1', to: 'qf', on: 'ε', top: 'A', pop: 'A', label: 'ε, A / ε' },
];

const PRESETS = [
  { label: 'aabb（接受）', value: 'aabb' },
  { label: 'aaabbb（接受）', value: 'aaabbb' },
  { label: 'aabbb（拒绝）', value: 'aabbb' },
  { label: 'abab（拒绝）', value: 'abab' },
];

function clean(raw) {
  const s = typeof raw === 'string' ? raw : '';
  let o = '';
  for (let i = 0; i < s.length; i += 1) if (s[i] === 'a' || s[i] === 'b') o += s[i];
  return o;
}

/* 一次性把整条配置序列算出来：每步记下状态、栈快照、动作说明、死因 */
function simulate(input) {
  const steps = [];
  let state = 'q0';
  let stack = ['$'];
  steps.push({
    state, stack: stack.slice(), act: null, died: null, pos: 0,
  });
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    const top = stack[stack.length - 1];
    let act = null;
    let died = null;
    if (ch === 'a' && state === 'q0') {
      stack.push('A');
      act = { in: ch, top, to: 'q0', repl: 'A' + top, kind: 'push' };
    } else if (ch === 'b' && (state === 'q0' || state === 'q1') && top === 'A') {
      stack.pop();
      state = 'q1';
      act = { in: ch, top, to: 'q1', repl: 'ε', kind: 'pop' };
    } else if (ch === 'b' && top === '$') {
      died = '栈顶是 $，没有 A 可弹——b 比 a 多';
    } else if (ch === 'a') {
      died = '已经进入弹栈阶段，q1 没有读 a 的转移';
    } else {
      died = '没有可用转移';
    }
    steps.push({
      state, stack: stack.slice(), act, died, pos: i + 1, ch,
    });
    if (died) {
      /* 死亡之后剩余输入不再消耗，补几个空帧好让单步走完 */
      for (let j = i + 1; j < input.length; j += 1) {
        steps.push({
          state, stack: stack.slice(), act: null, died: '（已死，剩余输入不再读取）', pos: j + 1, ch: input[j], frozen: true,
        });
      }
      break;
    }
  }
  const done = steps[steps.length - 1];
  const ok = !done.frozen && done.pos >= input.length && !done.died
    && done.stack.length === 1 && done.stack[0] === '$';
  return { steps, ok };
}

export default function render(host, spec) {
  const H = Number.isFinite(spec.height) ? clamp(spec.height, 300, 760) : 470;
  const init = clean(spec.input) || 'aabb';
  let input = init;
  let sim = simulate(input);
  let pos = 0;

  const ro = buildReadout({
    配置: '—',
    这次的转移: '—',
    栈: '—',
    判定: '—',
  });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(PRESETS, init, (v) => {
    input = v;
    sim = simulate(input);
    pos = 0;
    draw();
  }));

  const bStep = mkBtn('单步 ▶');
  const bBack = mkBtn('◀ 回退');
  host.appendChild(buildToolbar(bStep, bBack));

  const cv = setupCanvas(host, H);
  const geo = { x: 0, y: 0, w: 0, h: 0, r: 0, narrow: false, tapeY: 0, cell: 0, stk: null };

  function layout() {
    const W = cv.W;
    const Hh = cv.H;
    const narrow = W < 620;
    geo.narrow = narrow;
    geo.x = 12;
    geo.y = 26;
    geo.w = W - 24;
    geo.h = Math.round(Math.max(Hh - 200, 100) * (narrow ? 0.82 : 1));
    geo.r = narrow ? 19 : 22;
    geo.tapeY = geo.y + geo.h + 18;
    geo.cell = clamp((W - 70) / Math.max(input.length, 1), 16, 30);
    const stkW = narrow ? 88 : 110;
    geo.stk = {
      x: W - stkW - 14,
      y: geo.y + 8,
      w: stkW,
      h: Math.max(geo.h - 24, 80),
      cw: Math.min(stkW - 12, 64),
      chh: narrow ? 20 : 22,
    };
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    clearBg(ctx, cv.W, cv.H, C);
    layout();
    const st = sim.steps[Math.min(pos, sim.steps.length - 1)];
    const finished = pos >= sim.steps.length - 1;

    label(ctx, 'PDA：识别 aⁿbⁿ　栈底 $ 永不弹出',
      geo.x + 2, 16, C.fg, { size: geo.narrow ? 10.5 : 11.5, weight: 700 });
    label(ctx, '接受约定：读完输入 且 栈里只剩 $　（a 先压后弹，配对成功）',
      geo.x + 2, cv.H - 24, C.grid, { size: 10 });
    label(ctx, '栈顶在柱子最上面一格：push 往上涨一格，pop 矮一格',
      geo.x + 2, cv.H - 8, C.grid, { size: 10 });

    /* 有限控制图（左 3/4 宽） */
    const g = {
      x: geo.x, y: geo.y, w: geo.w - geo.stk.w - 12, h: geo.h,
    };
    drawControl(ctx, C, g, st);

    drawStack(ctx, C, st, sim.steps[pos - 1]);

    drawTape(ctx, C, {
      symbols: input.split(''),
      pos: Math.min(st.pos, input.length),
      x: Math.max(geo.x, (cv.W - Math.max(input.length, 1) * geo.cell) / 2),
      y: geo.tapeY,
      cell: geo.cell,
      label: '输入带（读取头指向下一个待读符号）',
      deadFrom: st.died ? Math.min(st.pos - 1, input.length - 1) : NaN,
    });

    /* 读数 */
    ro.set('配置', '(' + st.state + ', ' + input.slice(st.pos) + ', '
      + (st.stack[st.stack.length - 1] || '$') + ')'
      + (st.stack.length > 1 ? '，栈 = ' + st.stack.slice().reverse().join('') : '，栈 = $'));
    if (st.act) {
      const from = sim.steps[pos - 1];
      ro.set('这次的转移', '(' + from.state + ', ' + st.act.in + ', ' + st.act.top + ') → ('
        + st.act.to + ', ' + st.act.repl + ')'
        + (st.act.kind === 'push' ? '　压栈：栈顶多一个 A' : '　弹栈：栈顶的 A 被取走'));
    } else if (st.died) {
      ro.set('这次的转移', '无法转移：' + st.died);
    } else {
      ro.set('这次的转移', '还没读入（第 0 步，栈里只有底符）');
    }
    ro.set('栈', st.stack.slice().reverse().join('') + '　（顶 → 底，共 ' + st.stack.length + ' 格）');
    if (st.died) ro.set('判定', '拒绝：' + st.died);
    else if (!finished) ro.set('判定', '还在读，栈深 ' + (st.stack.length - 1) + ' 个 A');
    else if (sim.ok) ro.set('判定', '接受：输入耗尽，栈回到只剩 $');
    else ro.set('判定', '拒绝：读完了但栈里还压着 ' + (st.stack.length - 1) + ' 个 A（a 比 b 多）');

    drawLog(ctx, C, st);
  }

  function drawControl(ctx, C, g, st) {
    const R = geo.r;
    const at = (s) => placeIn(g, (STATES.find((x) => x.id === s) || {}).pos);
    const plan = bendsFor(TRANS.map((t) => ({ from: t.from, to: t.to, t })), R);
    const labs = [];
    plan.forEach((p) => {
      const t = p.edge.t;
      const A = at(t.from);
      const active = st.act && st.act.to === t.to
        && (t.from === (sim.steps[pos - 1] || {}).state)
        && t.on === st.act.in;
      const col = active ? C.accent2 : C.axis;
      let mid;
      if (t.from === t.to) {
        mid = drawSelfLoop(ctx, A, R, { color: col, w: active ? 2.3 : 1.2 });
      } else {
        const B = at(t.to);
        mid = drawCurvedArrow(ctx, A, B, {
          r0: R, r1: R, bend: p.bend, color: col, w: active ? 2.3 : 1.2,
        });
      }
      labs.push({ x: mid.x, y: mid.y, txt: t.label, active });
    });
    STATES.forEach((s) => {
      const p = at(s.id);
      drawNode(ctx, C, {
        x: p.x, y: p.y, r: R, label: s.id, sub: s.tag,
        active: s.id === st.state,
        accepting: s.id === 'qf',
        start: s.id === 'q0',
        fontSize: geo.narrow ? 9.5 : 10.5,
      });
    });
    labs.forEach((L) => drawEdgeLabel(ctx, C, L.x, L.y, L.txt, {
      color: L.active ? C.accent2 : C.fg, active: L.active, size: 9,
    }));
  }

  function drawStack(ctx, C, st, prevSt) {
    const s = geo.stk;
    ctx.save();
    ctx.fillStyle = C.soft;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(s.x - 2, s.y - 2, s.w + 4, s.h + 4);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = C.grid;
    ctx.strokeRect(s.x - 2.5, s.y - 2.5, s.w + 5, s.h + 5);
    ctx.restore();
    label(ctx, '栈', s.x + 4, s.y - 8, C.fg, { size: 11, weight: 700 });

    const stack = st.stack;                   // 底 → 顶
    const bx = s.x + (s.w - s.cw) / 2;
    const baseY = s.y + s.h - 10;
    for (let i = 0; i < stack.length; i += 1) {
      const fromBottom = i;                    // 0 = 底符
      const y = baseY - (fromBottom + 1) * s.chh;
      const isTop = i === stack.length - 1;
      const fresh = prevSt && st.stack.length > prevSt.stack.length && isTop;
      ctx.save();
      ctx.fillStyle = i === 0 ? C.named('gray') : (isTop ? C.accent : C.soft);
      ctx.globalAlpha = isTop ? (fresh ? 0.4 : 0.28) : (i === 0 ? 0.2 : 0.9);
      ctx.fillRect(bx, y, s.cw, s.chh - 2);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = isTop ? C.accent : C.axis;
      ctx.lineWidth = isTop ? 2 : 1;
      ctx.strokeRect(bx + 0.5, y + 0.5, s.cw - 1, s.chh - 3);
      ctx.restore();
      label(ctx, stack[i], bx + s.cw / 2, y + s.chh * 0.66,
        isTop ? C.accent : (i === 0 ? C.named('gray') : C.fg),
        { size: 13, align: 'center', weight: isTop ? 700 : 400 });
    }
    /* 栈顶指针 */
    const topY = baseY - stack.length * s.chh;
    ctx.save();
    ctx.fillStyle = C.accent2;
    ctx.beginPath();
    ctx.moveTo(bx + s.cw + 5, topY + s.chh * 0.5);
    ctx.lineTo(bx + s.cw + 15, topY + s.chh * 0.5 - 5);
    ctx.lineTo(bx + s.cw + 15, topY + s.chh * 0.5 + 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    label(ctx, '栈顶', s.x + s.w - 2, topY + s.chh * 0.5 + 4, C.accent2, { size: 9, align: 'right' });
    if (prevSt && prevSt.stack.length > st.stack.length) {
      label(ctx, '刚刚弹掉一格', s.x + s.w / 2, baseY - prevSt.stack.length * s.chh - 4,
        C.bad, { size: 9, align: 'center' });
    }
  }

  function drawLog(ctx, C, st) {
    const x0 = geo.x + 2;
    let y = geo.tapeY + 40;
    label(ctx, '转移记录（形式：(状态, 输入, 栈顶) → (新状态, 用 γ 替换栈顶)）', x0, y, C.axis, { size: 10 });
    y += 15;
    const from = Math.max(0, pos - 3);
    for (let i = from; i <= pos; i += 1) {
      const a = sim.steps[i];
      if (i === 0) {
        label(ctx, '起点：(q0, ' + input + ', $)', x0 + 8, y, C.grid, { size: 10 });
        y += 14;
        continue;
      }
      const before = sim.steps[i - 1];
      const txt = a.act
        ? '(' + before.state + ', ' + a.act.in + ', ' + a.act.top + ') → ('
          + a.act.to + ', ' + a.act.repl + ')'
        : '✗ ' + (a.died || '');
      label(ctx, (i === pos ? '▶ ' : '   ') + txt, x0 + 8, y,
        a.act ? (i === pos ? C.accent2 : C.axis) : C.bad,
        { size: 10, weight: i === pos ? 700 : 400 });
      y += 14;
    }
    void st;
  }

  let acc = 0;
  const controls = anim(host, {
    onTick(dt) {
      acc += dt;
      if (acc < 0.8) return;
      acc = 0;
      pos = pos >= sim.steps.length - 1 ? 0 : pos + 1;
      draw();
    },
    onReset() { acc = 0; pos = 0; draw(); },
  });

  bStep.addEventListener('click', () => {
    controls.stop();
    pos = Math.min(pos + 1, sim.steps.length - 1);
    draw();
  });
  bBack.addEventListener('click', () => {
    controls.stop();
    pos = Math.max(pos - 1, 0);
    draw();
  });

  draw();
  cv.redraw = draw;
  return { destroy() { controls.stop(); cv.redraw = null; } };
}
