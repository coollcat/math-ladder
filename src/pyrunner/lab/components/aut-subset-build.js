/* =========================================================================
 * lab 组件：aut-subset-build —— 子集构造：NFA 的「房间名单」变成 DFA 的状态
 * -------------------------------------------------------------------------
 * 左边是 NFA，右边是一棵不断长出来的子集队列。每按一次「单步」，就取出队列
 * 里的第一个子集 S，对每个符号 a 算 delta_D(S,a) = 所有落点的并集，得到新
 * 子集 T：
 *   · T 是第一次出现 → 在右边新建一个 DFA 状态，并把它排进队列；
 *   · T 早就有了     → 只连一条边，不新建状态。
 * 于是 n 个 NFA 状态最多会长出 2^n 个 DFA 状态——而实际能长出来多少，取决于
 * 从起点真正**可达**多少个子集。这就是本课「不必造满 2^n」那句话的现场版。
 *
 * 机器取课文里的「倒数第二个符号是 a」：S --a--> S, S --a--> A,
 * S --b--> S, A --a--> F, A --b--> F。全集 = {S, A, F}，8 个子集，实测只长出 4 个。
 *
 * 用法（课文 lab 围栏）：
 *   { "type": "aut-subset-build",
 *     "title": "从 {S} 出发长出来的 DFA：8 个子集里只有 4 个真的出现" }
 *
 * 字段（都可省）：
 *   height  画布高度，默认 470
 *   step    初始步数（默认 0）；给个数可以让学生直接跳到「长完」的样子
 *
 * 能玩什么：
 *   - 「单步」处理队列里的一个子集；「回退」撤回最近一次处理
 *   - 「一键长完」把队列跑空；「重置」回到只有 {S} 的初始状态
 *   - 每一步在读数条里写明：取的是哪个子集、读哪个符号、落点并成什么、新状态还是旧状态
 * ========================================================================= */

import {
  themeColors, setupCanvas, label, clamp, clearBg,
  buildToolbar, buildReadout, anim, mkBtn,
} from '../core.js';
import {
  drawNode, drawCurvedArrow, drawSelfLoop, bendsFor, drawEdgeLabel, placeIn,
} from './aut-graph-base.js';

const NFA = {
  states: [
    { id: 'S', pos: [0.1, 0.5] },
    { id: 'A', pos: [0.5, 0.5] },
    { id: 'F', pos: [0.9, 0.5] },
  ],
  start: 'S',
  accept: 'F',
  alphabet: ['a', 'b'],
  trans: [
    { from: 'S', to: 'S', on: 'a' },
    { from: 'S', to: 'S', on: 'b' },
    { from: 'S', to: 'A', on: 'a' },
    { from: 'A', to: 'F', on: 'a' },
    { from: 'A', to: 'F', on: 'b' },
  ],
};

const NAME = (set) => (set.length ? '{' + set.join(', ') + '}' : '∅');
/* 圆里只放紧凑写法（{S, A, F} → SAF），与课文 Python 实验里的缩写口径一致 */
const compact = (id) => id.replace(/[{}\s]/g, '').replace(/,/g, '');
const key = (set) => set.join(',');

/* 子集构造：把每次「处理队列首项」的结果记成一帧，供单步/回退直接查 */
function build() {
  const start = [NFA.start];
  const nodes = [{ set: start, id: NAME(start) }];
  const edges = [];
  const queue = [0];
  const inQueue = new Set([0]);
  const frames = [{
    nodes: nodes.map((n) => n.id), edges: [], queue: queue.map((i) => nodes[i].id),
    action: null, step: 0,
  }];
  let guard = 0;

  while (queue.length && guard < 40) {
    guard += 1;
    const si = queue.shift();
    inQueue.delete(si);
    const S = nodes[si].set;
    NFA.alphabet.forEach((a) => {
      const out = [];
      S.forEach((q) => {
        NFA.trans.forEach((t) => {
          if (t.from === q && t.on === a && out.indexOf(t.to) < 0) out.push(t.to);
        });
      });
      const order = NFA.states.map((s) => s.id);
      out.sort((x, y) => order.indexOf(x) - order.indexOf(y));
      const k = key(out);
      let ti = nodes.findIndex((n) => key(n.set) === k);
      let created = false;
      if (ti < 0) {
        nodes.push({ set: out, id: NAME(out) });
        ti = nodes.length - 1;
        created = true;
      }
      if (created) { queue.push(ti); inQueue.add(ti); }
      edges.push({
        from: si, to: ti, on: a, result: NAME(out), created,
        src: NAME(S), pool: out.slice(),
      });
      frames.push({
        nodes: nodes.map((n) => n.id),
        edges: edges.map((e) => ({
          from: nodes[e.from].id, to: nodes[e.to].id, on: e.on, created: e.created,
        })),
        queue: queue.map((i) => nodes[i].id),
        action: {
          from: NAME(S), on: a, to: NAME(out), created,
          union: S.map((q) => 'δ(' + q + ',' + a + ')={' + (NFA.trans
            .filter((t) => t.from === q && t.on === a).map((t) => t.to).join(',') || '∅') + '}'),
        },
        step: frames.length,
      });
    });
  }
  /* 队列跑空后再补一帧，标成「完成」 */
  frames.push({
    nodes: nodes.map((n) => n.id), edges: frames[frames.length - 1].edges.slice(),
    queue: [], action: { done: true }, step: frames.length,
  });
  return frames;
}

export default function render(host, spec) {
  const H = Number.isFinite(spec.height) ? clamp(spec.height, 300, 760) : 470;
  const FRAMES = build();
  const total = FRAMES.length - 1;
  let step = Number.isFinite(spec.step) ? clamp(Math.round(spec.step), 0, total) : 0;

  const ro = buildReadout({
    这一步: '—',
    队列: '—',
    'DFA 状态数': '—',
    最终判定: '—',
  });
  host.appendChild(ro.box);

  const bStep = mkBtn('单步 ▶');
  const bBack = mkBtn('◀ 回退');
  const bAll = mkBtn('一键长完');
  const bZero = mkBtn('重置');
  host.appendChild(buildToolbar(bStep, bBack, bAll, bZero));

  const cv = setupCanvas(host, H);
  const geo = { left: null, right: null, r: 0, narrow: false };

  function layout() {
    const W = cv.W;
    const Hh = cv.H;
    const narrow = W < 660;
    geo.narrow = narrow;
    geo.r = narrow ? 15 : 18;
    if (narrow) {
      const half = Math.round((Hh - 96) / 2);
      geo.left = { x: 8, y: 30, w: W - 16, h: half };
      geo.right = { x: 8, y: 30 + half + 44, w: W - 16, h: half };
    } else {
      geo.left = { x: 8, y: 30, w: Math.round(W * 0.44), h: Hh - 92 };
      geo.right = { x: Math.round(W * 0.47), y: 30, w: W - Math.round(W * 0.47) - 8, h: Hh - 92 };
    }
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    clearBg(ctx, cv.W, cv.H, C);
    layout();
    const f = FRAMES[step];
    const done = step >= total;

    label(ctx, '子集构造：左边是 NFA，右边是从 {' + NFA.start + '} 长出来的 DFA',
      geo.left.x + 2, 18, C.fg, { size: geo.narrow ? 10.5 : 11.5, weight: 700 });
    label(ctx, '每个 DFA 状态都是一张「现在哪些房间有人」的名单；名单含 F 就是接受态',
      geo.left.x + 2, cv.H - 24, C.grid, { size: 10 });
    label(ctx, '全集 2³ = 8 个子集，但从起点可达的只有 ' + (f.nodes.length) + ' 个——这正是「不必造满」的含义',
      geo.left.x + 2, cv.H - 8, C.grid, { size: 10 });

    drawNfa(ctx, C);
    drawDfa(ctx, C, f, done);
    drawLegend(ctx, C);

    const act = f.action;
    if (!act) {
      ro.set('这一步', '第 0 步：队列里只有初始子集 ' + NAME([NFA.start]));
    } else if (act.done) {
      ro.set('这一步', '队列跑空：所有可达子集都处理过了');
    } else {
      ro.set('这一步', act.from + ' 读「' + act.on + '」→ ' + act.to
        + '　' + act.union.join('　')
        + (act.created ? '　⇒ 首次出现，新建 DFA 状态' : '　⇒ 之前已有，只连边'));
    }
    ro.set('队列', f.queue.length ? f.queue.join('  ') : '（空）');
    ro.set('DFA 状态数', f.nodes.length + ' / 8（' + f.edges.length + ' 条转移边）');
    const accept = f.nodes.filter((n) => n.indexOf('F') >= 0);
    ro.set('最终判定', done
      ? '接受态 ' + (accept.length ? accept.join('、') : '（无）')
      : '还没跑完，接受态名单还在长');
  }

  function drawNfa(ctx, C) {
    const g = geo.left;
    const R = geo.r;
    const px = (u) => g.x + 26 + u * (g.w - 52);
    const py = (v) => g.y + 34 + v * (g.h - 62);
    label(ctx, 'NFA（3 个状态）', g.x + 2, g.y - 4, C.named('blue'), { size: 11, weight: 700 });
    const plan = bendsFor(NFA.trans.map((t) => ({ from: t.from, to: t.to, t })), R);
    const labs = [];
    plan.forEach((p) => {
      const t = p.edge.t;
      const A = { x: px((NFA.states.find((s) => s.id === t.from) || {}).pos[0]), y: py((NFA.states.find((s) => s.id === t.from) || {}).pos[1]) };
      let mid;
      if (p.self) {
        const dx = p.selfTotal > 1 ? (p.selfIdx === 0 ? -R * 0.95 : R * 0.95) : 0;
        mid = drawSelfLoop(ctx, A, R, { color: C.axis, w: 1.2, dx });
      } else {
        const B = { x: px((NFA.states.find((s) => s.id === t.to) || {}).pos[0]), y: py((NFA.states.find((s) => s.id === t.to) || {}).pos[1]) };
        mid = drawCurvedArrow(ctx, A, B, { r0: R, r1: R, bend: p.bend, color: C.axis, w: 1.2 });
      }
      labs.push({ x: mid.x, y: mid.y, ch: t.on });
    });
    NFA.states.forEach((st) => {
      drawNode(ctx, C, {
        x: px(st.pos[0]), y: py(st.pos[1]), r: R, label: st.id,
        accepting: st.id === NFA.accept, start: st.id === NFA.start, fontSize: 10.5,
      });
    });
    labs.forEach((L) => drawEdgeLabel(ctx, C, L.x, L.y, L.ch, { size: 10 }));
  }

  function drawDfa(ctx, C, f, done) {
    const g = geo.right;
    const R = geo.r;
    label(ctx, 'DFA（每个圆是一个子集）', g.x + 2, g.y - 4, C.named('green'), { size: 11, weight: 700 });
    const ids = f.nodes;
    const n = ids.length;
    /* 环形布局：子集数量变化时也不会互相压住 */
    const cxp = g.x + g.w / 2;
    const cyp = g.y + g.h / 2 + 4;
    const rad = Math.max(Math.min(g.w, g.h) * 0.34, R * 2.1);
    const at = (id) => {
      const i = ids.indexOf(id);
      if (i < 0) return { x: cxp, y: cyp };
      if (n === 1) return { x: cxp, y: cyp };
      const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
      return { x: cxp + Math.cos(ang) * rad, y: cyp + Math.sin(ang) * rad };
    };
    const eplan = bendsFor(f.edges.map((e) => ({ from: e.from, to: e.to, e })), R);
    const labs = [];
    eplan.forEach((p) => {
      const e = p.edge.e;
      const A = at(e.from);
      const col = e.created ? C.accent : C.axis;
      let mid;
      if (e.from === e.to) {
        mid = drawSelfLoop(ctx, A, R, { color: col, w: e.created ? 1.9 : 1.2, down: A.y >= cyp });
      } else {
        const B = at(e.to);
        mid = drawCurvedArrow(ctx, A, B, {
          r0: R, r1: R, bend: p.bend || (n > 2 ? R * 0.2 : 0),
          color: col, w: e.created ? 1.9 : 1.2,
        });
      }
      labs.push({ x: mid.x, y: mid.y, ch: e.on, fresh: e.created });
    });
    ids.forEach((id, i) => {
      const p = at(id);
      const isAcc = id.indexOf('F') >= 0;
      const isStart = id === NAME([NFA.start]);
      const fresh = f.action && !f.action.done && f.action.created && id === f.action.to;
      const touched = f.action && !f.action.done
        && (id === f.action.from || id === f.action.to);
      drawNode(ctx, C, {
        x: p.x, y: p.y, r: R,
        label: compact(id),
        sub: '',
        active: !!touched,
        accepting: isAcc,
        start: isStart,
        strokeColor: fresh ? C.accent2 : undefined,
        fillColor: fresh ? C.accent2 : C.accent,
        fontSize: Math.max(8, R * 0.5),
        badge: fresh ? '新' : '',
        badgeColor: C.accent2,
      });
      void i;
    });
    labs.forEach((L) => drawEdgeLabel(ctx, C, L.x, L.y, L.ch, {
      color: L.fresh ? C.accent : C.fg, active: L.fresh, size: 9.5,
    }));
    if (done) {
      label(ctx, '队列跑空：DFA 构造完成', g.x + 4, g.y + g.h - 4, C.ok, { size: 11, weight: 700 });
    }
  }

  function drawLegend(ctx, C) {
    const y = cv.H - 40;
    label(ctx, '蓝框 = 这一步正在处理的子集　橙边 = 这一步新长出来的状态/边　双圈 = 名单里含 F（接受）',
      geo.left.x + 2, y, C.grid, { size: 10 });
  }

  let acc = 0;
  const controls = anim(host, {
    onTick(dt) {
      acc += dt;
      if (acc < 0.7) return;
      acc = 0;
      step = step >= total ? 0 : step + 1;
      draw();
    },
    onReset() { acc = 0; step = 0; draw(); },
  });

  bStep.addEventListener('click', () => {
    controls.stop();
    step = Math.min(step + 1, total);
    draw();
  });
  bBack.addEventListener('click', () => {
    controls.stop();
    step = Math.max(step - 1, 0);
    draw();
  });
  bAll.addEventListener('click', () => {
    controls.stop();
    step = total;
    draw();
  });
  bZero.addEventListener('click', () => {
    controls.stop();
    step = 0;
    draw();
  });

  draw();
  cv.redraw = draw;
  return { destroy() { controls.stop(); cv.redraw = null; } };
}
