/* =========================================================================
 * lab 组件：aut-fsm-runner —— 有限状态机跑输入带（第 31 章 · 20 课）
 * -------------------------------------------------------------------------
 * 演示什么：一台确定性有限状态机逐符号吃掉输入带。当前状态填色、刚走过的
 * 那条边加粗，输入带上读取头逐格右移。读完后：停在双圈 = 接受，停在
 * 单圈 = 拒绝。
 *
 * 关于「卡死」：标准 DFA 的转移函数处处有定义，遇到没画出的边应该先补一个
 * 死状态。本组件把缺边按工程惯例处理成「卡死 = 拒绝」，并在读数条里写明
 * 这一点——它不是另立一套语义，而是把「补死状态」那一步替你省掉了。
 *
 * 用法（课文 lab 围栏）：
 *   { "type": "aut-fsm-runner",
 *     "title": "闸机只有两个状态：这一张票用过没有",
 *     "machine": "turnstile",
 *     "input": "投通投通通" }
 *
 * 字段（都可省）：
 *   machine  四台机器之一：turnstile / parity / endsab / mod3（省缺 turnstile）
 *   input    输入串，只保留该机字母表里的字符；滤空或未给就用该机默认串
 *   height   画布高度，默认 430
 *
 * 能玩什么：
 *   - 「单步」吃一个符号、「回退」吐回一个符号；「播放」自动连走，「重置」回起点
 *   - 顶部分段器换机器：同一份输入在不同机器上走出的轨迹立刻能对比
 *   - 接受态画双圈，起点有入箭头，卡死时该状态描红并标「卡死」
 * ========================================================================= */

import {
  themeColors, setupCanvas, label, clamp, clearBg,
  buildToolbar, buildReadout, buildSegmented, anim, mkBtn,
} from '../core.js';
import {
  drawNode, drawCurvedArrow, drawSelfLoop, bendsFor, drawEdgeLabel, drawTape, placeIn,
} from './aut-graph-base.js';

/* 四台机器。pos 是归一化坐标（[0,1]² 的绘图区），只为排版，不含数学含义。 */
const MACHINES = {
  turnstile: {
    name: '闸机（2 态）',
    why: '两个状态只记一件事：这张票用过没有。多余的投币不叠加，因为状态已经是「放行」。',
    states: [
      { id: 'LOCKED', tag: '锁住', pos: [0.28, 0.5] },
      { id: 'OPEN', tag: '放行', pos: [0.74, 0.5] },
    ],
    alphabet: ['投', '通'],
    start: 'LOCKED',
    accepting: ['OPEN'],
    trans: [
      { from: 'LOCKED', to: 'OPEN', on: '投' },
      { from: 'LOCKED', to: 'LOCKED', on: '通' },
      { from: 'OPEN', to: 'OPEN', on: '投' },
      { from: 'OPEN', to: 'LOCKED', on: '通' },
    ],
    input: '投通投通通',
  },
  parity: {
    name: '偶数个 a（2 态）',
    why: '「读到过奇数个 a 还是偶数个 a」只需要一个比特的记忆——这正是有限状态机最擅长的活。',
    states: [
      { id: 'EVEN', tag: '偶数个 a', pos: [0.28, 0.5] },
      { id: 'ODD', tag: '奇数个 a', pos: [0.74, 0.5] },
    ],
    alphabet: ['a', 'b'],
    start: 'EVEN',
    accepting: ['EVEN'],
    trans: [
      { from: 'EVEN', to: 'ODD', on: 'a' },
      { from: 'EVEN', to: 'EVEN', on: 'b' },
      { from: 'ODD', to: 'EVEN', on: 'a' },
      { from: 'ODD', to: 'ODD', on: 'b' },
    ],
    input: 'abbaa',
  },
  endsab: {
    name: '以 ab 结尾（3 态）',
    why: '三个状态分别记「还没见到 a」「刚见到 a」「已经凑齐 ab」。最后停在第三格才算认出来。',
    states: [
      { id: 'S0', tag: '还没见到 a', pos: [0.5, 0.1] },
      { id: 'SA', tag: '刚见到 a', pos: [0.85, 0.72] },
      { id: 'SAB', tag: '凑齐 ab', pos: [0.15, 0.72] },
    ],
    alphabet: ['a', 'b'],
    start: 'S0',
    accepting: ['SAB'],
    trans: [
      { from: 'S0', to: 'SA', on: 'a' },
      { from: 'S0', to: 'S0', on: 'b' },
      { from: 'SA', to: 'SA', on: 'a' },
      { from: 'SA', to: 'SAB', on: 'b' },
      { from: 'SAB', to: 'SA', on: 'a' },
      { from: 'SAB', to: 'S0', on: 'b' },
    ],
    input: 'aabab',
  },
  mod3: {
    name: 'a 的个数 mod 3（3 态）',
    why: '三个状态记余数。想数到 mod 7 就要 7 个状态：有限记忆的价钱写得明明白白。',
    states: [
      { id: 'R0', tag: '余 0', pos: [0.5, 0.1] },
      { id: 'R1', tag: '余 1', pos: [0.85, 0.72] },
      { id: 'R2', tag: '余 2', pos: [0.15, 0.72] },
    ],
    alphabet: ['a', 'b'],
    start: 'R0',
    accepting: ['R0'],
    trans: [
      { from: 'R0', to: 'R1', on: 'a' },
      { from: 'R1', to: 'R2', on: 'a' },
      { from: 'R2', to: 'R0', on: 'a' },
      { from: 'R0', to: 'R0', on: 'b' },
      { from: 'R1', to: 'R1', on: 'b' },
      { from: 'R2', to: 'R2', on: 'b' },
    ],
    input: 'aabaa',
  },
};

const KEYS = Object.keys(MACHINES);

function cleanInput(raw, M) {
  const s = typeof raw === 'string' ? raw : '';
  let out = '';
  for (let i = 0; i < s.length; i += 1) if (M.alphabet.indexOf(s[i]) >= 0) out += s[i];
  return out;
}

export default function render(host, spec) {
  const H = Number.isFinite(spec.height) ? clamp(spec.height, 280, 720) : 430;
  const startKey = KEYS.indexOf(spec.machine) >= 0 ? spec.machine : 'turnstile';
  const startInput = cleanInput(spec.input, MACHINES[startKey]);
  let M = MACHINES[startKey];
  let input = startInput || M.input;
  let trace = [];
  let pos = 0;

  const ro = buildReadout({ 机器: '—', 当前状态: '—', 已读输入: '—', 判定: '—' });
  host.appendChild(ro.box);

  host.appendChild(buildSegmented(
    KEYS.map((k) => ({ label: MACHINES[k].name, value: k })),
    startKey,
    (v) => {
      M = MACHINES[v] || MACHINES.turnstile;
      input = cleanInput(spec.input, M) || M.input;
      reset();
    },
  ));

  const bStep = mkBtn('单步 ▶');
  const bBack = mkBtn('◀ 回退');
  host.appendChild(buildToolbar(bStep, bBack));

  const cv = setupCanvas(host, H);
  const geo = { x: 0, y: 0, w: 0, h: 0, r: 0, narrow: false, tapeY: 0, cell: 0 };

  function stepOf(state, ch) {
    for (let i = 0; i < M.trans.length; i += 1) {
      const t = M.trans[i];
      if (t.from === state && t.on === ch) return t;
    }
    return null;
  }

  function replay() {
    trace = [M.start];
    let s = M.start;
    for (let i = 0; i < input.length; i += 1) {
      if (s === null) { trace.push(null); continue; }
      const t = stepOf(s, input[i]);
      s = t ? t.to : null;
      trace.push(s);
    }
  }

  function layout() {
    const W = cv.W;
    const Hh = cv.H;
    const narrow = W < 620;
    geo.narrow = narrow;
    geo.x = 12;
    geo.y = 28;
    geo.w = W - 24;
    geo.h = Math.max(Hh - 138, 120);
    geo.r = narrow ? 20 : 23;
    geo.tapeY = geo.y + geo.h + 20;
    geo.cell = clamp((W - 70) / Math.max(input.length, 1), 15, 30);
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    clearBg(ctx, cv.W, cv.H, C);
    layout();
    const cur = trace[Math.min(pos, trace.length - 1)];
    const prev = pos > 0 ? trace[pos - 1] : null;
    const lastSym = pos > 0 ? input[pos - 1] : null;

    label(ctx, '状态机：' + M.name + '　字母表 ' + M.alphabet.map((c) => '「' + c + '」').join(' '),
      geo.x + 2, 17, C.fg, { size: geo.narrow ? 10.5 : 11.5, weight: 700 });
    label(ctx, '双圈 = 接受态　填色 = 当前状态　粗边 = 刚走过的那条转移',
      geo.x + 2, cv.H - 24, C.grid, { size: 10 });
    label(ctx, M.why, geo.x + 2, cv.H - 8, C.grid, { size: 10 });

    /* 边 */
    const plan = bendsFor(M.trans.map((t) => ({ from: t.from, to: t.to, t })), geo.r);
    const labels = [];
    plan.forEach((p) => {
      const t = p.edge.t;
      const active = pos > 0 && t.from === prev && t.to === cur && t.on === lastSym;
      const col = active ? C.accent2 : C.axis;
      const A = placeIn(geo, (M.states.find((s) => s.id === t.from) || {}).pos);
      let mid;
      if (p.self) {
        mid = drawSelfLoop(ctx, A, geo.r, { color: col, w: active ? 2.4 : 1.2 });
      } else {
        const B = placeIn(geo, (M.states.find((s) => s.id === t.to) || {}).pos);
        mid = drawCurvedArrow(ctx, A, B, {
          r0: geo.r, r1: geo.r, bend: p.bend, color: col, w: active ? 2.4 : 1.2,
        });
      }
      labels.push({ x: mid.x, y: mid.y, ch: t.on, active, self: p.self });
    });

    /* 节点 */
    M.states.forEach((st) => {
      const p = placeIn(geo, st.pos);
      const isCur = st.id === cur;
      drawNode(ctx, C, {
        x: p.x,
        y: p.y,
        r: geo.r,
        label: st.id,
        sub: st.tag,
        active: isCur,
        accepting: M.accepting.indexOf(st.id) >= 0,
        dead: isCur && cur === null,
        start: st.id === M.start,
        fontSize: geo.narrow ? 9.5 : 10.5,
        badge: isCur && cur === null ? '卡死' : '',
        badgeColor: C.bad,
      });
    });

    /* 边标签最后画，避免被节点盖住 */
    labels.forEach((L) => {
      drawEdgeLabel(ctx, C, L.x, L.y, L.ch, {
        color: L.active ? C.accent2 : C.fg,
        active: L.active,
        size: 11,
      });
    });

    drawTape(ctx, C, {
      symbols: input.split(''),
      pos,
      x: Math.max(geo.x, (cv.W - Math.max(input.length, 1) * geo.cell) / 2),
      y: geo.tapeY,
      cell: geo.cell,
      label: '输入带（读取头指向下一个待吃符号）',
      deadFrom: (() => {
        for (let i = 0; i < trace.length; i += 1) if (trace[i] === null) return i - 1;
        return NaN;
      })(),
    });

    /* 判定徽标 */
    if (pos >= input.length) {
      const ok = cur !== null && M.accepting.indexOf(cur) >= 0;
      const txt = cur === null ? '卡死 → 拒绝' : (ok ? '接受' : '拒绝');
      const col = cur === null ? C.bad : (ok ? C.ok : C.bad);
      const w = geo.narrow ? 86 : 100;
      const bx = cv.W - w - 14;
      ctx.save();
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.14;
      ctx.fillRect(bx, 6, w, 22);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(bx + 0.5, 6.5, w - 1, 21);
      ctx.restore();
      label(ctx, txt, bx + w / 2, 21, col, { size: 11.5, align: 'center', weight: 700 });
    }

    const curSt = M.states.find((s) => s.id === cur);
    ro.set('机器', M.name + '：' + M.states.length + ' 态、' + M.alphabet.length + ' 符号、'
      + M.trans.length + ' 条转移');
    ro.set('当前状态', cur === null
      ? '卡死（没有可用转移；严格 DFA 应先补一个死状态）'
      : cur + '（' + (curSt ? curSt.tag : '') + '）' + (M.accepting.indexOf(cur) >= 0 ? '，接受态' : '，非接受态'));
    ro.set('已读输入', pos + ' / ' + input.length + '　读过的「' + input.slice(0, pos) + '」'
      + (pos < input.length ? '　待读的「' + input.slice(pos) + '」' : '　输入已耗尽'));
    if (cur === null) {
      ro.set('判定', '拒绝：「' + lastSym + '」在 ' + prev + ' 上没有出边');
    } else if (pos < input.length) {
      ro.set('判定', '还没读完——接受与否只在读完后由终态决定');
    } else if (M.accepting.indexOf(cur) >= 0) {
      ro.set('判定', '接受：读完输入且停在 ' + cur + '（双圈）');
    } else {
      ro.set('判定', '拒绝：读完了，但停在 ' + cur + '（单圈）');
    }
  }

  function reset() { replay(); pos = 0; draw(); }

  let acc = 0;
  const controls = anim(host, {
    onTick(dt) {
      acc += dt;
      if (acc < 0.55) return;
      acc = 0;
      pos = pos >= input.length ? 0 : pos + 1;
      draw();
    },
    onReset() { acc = 0; pos = 0; draw(); },
  });

  bStep.addEventListener('click', () => {
    controls.stop();
    pos = Math.min(pos + 1, input.length);
    draw();
  });
  bBack.addEventListener('click', () => {
    controls.stop();
    pos = Math.max(pos - 1, 0);
    draw();
  });

  reset();
  cv.redraw = draw;
  return { destroy() { controls.stop(); cv.redraw = null; } };
}
