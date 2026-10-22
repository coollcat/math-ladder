/* =========================================================================
 * lab 组件：aut-nfa-guess —— NFA 的多线程猜测（第 31 章 · 40 课）
 * -------------------------------------------------------------------------
 * 演示什么：一台 NFA 读一个符号时可以有零条、一条或多条出边。本组件把每条
 * 可能的路径画成一条「线程」：读入一个符号，每个存活线程各自分叉；没有出边
 * 的线程当场死掉（灰掉并标 ✗）。只要有**一条**线程读完输入落在接受态，整台
 * 机器就接受——这就是 NFA 的「存在性」语义，不是掷骰子。
 *
 * 机器取课文里的「倒数第二个符号是 a」（状态 S / A / F，Σ = {a,b}）。
 *
 * 用法（课文 lab 围栏）：
 *   { "type": "aut-nfa-guess",
 *     "title": "三条线程同时猜：哪一条能猜中「倒数第二个是 a」",
 *     "input": "aabab" }
 *
 * 字段（都可省）：
 *   input    输入串，只保留 a / b；滤空或未给就用 "aabab"
 *   height   画布高度，默认 470
 *   maxRows  线程表最多显示几行，默认 7（超出的折叠成一行统计）
 *
 * 能玩什么：
 *   - 「单步」吃一个符号，看线程分叉与死亡；「回退」把上一步的线程表整张取回
 *   - 顶部分段器换预设输入：bab（接受）/ abb（拒绝）/ aabab（接受）/ bba（拒绝）
 *   - 接受时，那条走到 F 的线程整条描金
 * ========================================================================= */

import {
  themeColors, setupCanvas, label, clamp, clearBg,
  buildToolbar, buildReadout, buildSegmented, anim, mkBtn,
} from '../core.js';
import {
  drawNode, drawCurvedArrow, drawSelfLoop, bendsFor, drawEdgeLabel, drawTape, placeIn,
} from './aut-graph-base.js';

const STATES = [
  { id: 'S', tag: '起点：随时可以猜', pos: [0.12, 0.52] },
  { id: 'A', tag: '猜中了「a 是倒数第二个」', pos: [0.5, 0.52] },
  { id: 'F', tag: '又读到一个符号，收工', pos: [0.86, 0.52] },
];

const TRANS = [
  { from: 'S', to: 'S', on: 'a' },
  { from: 'S', to: 'S', on: 'b' },
  { from: 'S', to: 'A', on: 'a' },
  { from: 'A', to: 'F', on: 'a' },
  { from: 'A', to: 'F', on: 'b' },
];

const PRESETS = [
  { label: 'bab（接受）', value: 'bab' },
  { label: 'abb（拒绝）', value: 'abb' },
  { label: 'aabab（接受）', value: 'aabab' },
  { label: 'bba（拒绝）', value: 'bba' },
];

const MAX_T = 26;   // 线程数上限：只是防止画面爆炸，不影响判定

function clean(raw) {
  const s = typeof raw === 'string' ? raw : '';
  let o = '';
  for (let i = 0; i < s.length; i += 1) if (s[i] === 'a' || s[i] === 'b') o += s[i];
  return o;
}

export default function render(host, spec) {
  const H = Number.isFinite(spec.height) ? clamp(spec.height, 300, 760) : 470;
  const maxRows = Number.isFinite(spec.maxRows) ? clamp(spec.maxRows, 3, 12) : 7;
  const init = clean(spec.input) || 'aabab';
  let input = init;
  let pos = 0;
  const snapshots = [];      // 每一步的线程表快照
  let omitted = 0;

  /* ---------- 线程模拟：一次性把每个时刻的线程表算好 ---------- */
  function simulate() {
    snapshots.length = 0;
    let threads = [{ path: ['S'], dead: -1 }];
    omitted = 0;
    snapshots.push({ threads: threads.map((t) => ({ path: t.path.slice(), dead: t.dead })), omitted });
    for (let k = 0; k < input.length; k += 1) {
      const sym = input[k];
      const next = [];
      threads.forEach((th) => {
        if (th.dead >= 0) {
          next.push({ path: th.path, dead: th.dead });   // 死线程原样保留在表里（灰掉）
          return;
        }
        const last = th.path[th.path.length - 1];
        const outs = TRANS.filter((t) => t.from === last && t.on === sym);
        if (!outs.length) {
          next.push({ path: th.path, dead: k + 1 });
          return;
        }
        outs.forEach((t) => next.push({ path: th.path.concat([t.to]), dead: -1 }));
      });
      /* 超上限：优先留活线程，再按加入顺序截断 */
      let list = next;
      let cut = 0;
      if (list.length > MAX_T) {
        const alive = list.filter((t) => t.dead < 0);
        const dead = list.filter((t) => t.dead >= 0);
        cut = Math.max(alive.length - MAX_T, 0);
        list = alive.slice(0, MAX_T).concat(dead);
      }
      threads = list;
      snapshots.push({ threads: threads.map((t) => ({ path: t.path.slice(), dead: t.dead })), omitted: cut });
    }
  }

  const ro = buildReadout({
    线程: '—',
    可达状态集: '—',
    已读输入: '—',
    判定: '—',
  });
  host.appendChild(ro.box);

  host.appendChild(buildSegmented(PRESETS, init, (v) => {
    input = v;
    pos = 0;
    simulate();
    draw();
  }));

  const bStep = mkBtn('单步 ▶');
  const bBack = mkBtn('◀ 回退');
  host.appendChild(buildToolbar(bStep, bBack));

  const cv = setupCanvas(host, H);
  const geo = { x: 0, y: 0, w: 0, h: 0, r: 0, narrow: false, tapeY: 0, cell: 0, listY: 0 };

  function layout() {
    const W = cv.W;
    const Hh = cv.H;
    const narrow = W < 620;
    geo.narrow = narrow;
    geo.x = 12;
    geo.y = 26;
    geo.w = W - 24;
    geo.h = Math.round(Math.max((Hh - 190), 110) * (narrow ? 0.86 : 1));
    geo.r = narrow ? 20 : 24;
    geo.tapeY = geo.y + geo.h + 18;
    geo.cell = clamp((W - 70) / Math.max(input.length, 1), 16, 30);
    geo.listY = geo.tapeY + 46;
  }

  function currentSnap() { return snapshots[Math.min(pos, snapshots.length - 1)]; }

  function liveStates(snap) {
    const set = [];
    snap.threads.forEach((t) => {
      if (t.dead >= 0) return;
      const s = t.path[t.path.length - 1];
      if (set.indexOf(s) < 0) set.push(s);
    });
    return set;
  }

  function accepted(threads) {
    if (pos < input.length) return false;
    return threads.some((t) => t.dead < 0 && t.path[t.path.length - 1] === 'F');
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    clearBg(ctx, cv.W, cv.H, C);
    layout();
    const snap = currentSnap();
    const live = liveStates(snap);
    const aliveCount = snap.threads.filter((t) => t.dead < 0).length;
    const deadCount = snap.threads.length - aliveCount;
    const win = accepted(snap.threads);
    const winPath = win
      ? (snap.threads.find((t) => t.dead < 0 && t.path[t.path.length - 1] === 'F') || {}).path
      : null;
    const lastSym = pos > 0 ? input[pos - 1] : null;

    label(ctx, 'NFA：倒数第二个符号是 a　字母表「a」「b」',
      geo.x + 2, 16, C.fg, { size: geo.narrow ? 10.5 : 11.5, weight: 700 });
    label(ctx, '填色 = 此刻至少有一条线程停在它上面　金线 = 走出迷宫的那条线程',
      geo.x + 2, cv.H - 24, C.grid, { size: 10 });
    label(ctx, '死线程不消失：它留在表里，提醒你「这条路走不通」也是信息',
      geo.x + 2, cv.H - 8, C.grid, { size: 10 });

    /* 边 */
    const plan = bendsFor(TRANS.map((t) => ({ from: t.from, to: t.to, t })), geo.r);
    const labels = [];
    plan.forEach((p) => {
      const t = p.edge.t;
      const isWinEdge = winPath && (() => {
        for (let i = 0; i + 1 < winPath.length; i += 1) {
          if (winPath[i] === t.from && winPath[i + 1] === t.to) return true;
        }
        return false;
      })();
      const col = isWinEdge ? C.named('amber') : C.axis;
      const A = placeIn(geo, (STATES.find((s) => s.id === t.from) || {}).pos);
      let mid;
      if (p.self) {
        const dx = p.selfTotal > 1 ? (p.selfIdx === 0 ? -geo.r * 0.85 : geo.r * 0.85) : 0;
        mid = drawSelfLoop(ctx, A, geo.r, { color: col, w: isWinEdge ? 2.2 : 1.2, dx });
      } else {
        const B = placeIn(geo, (STATES.find((s) => s.id === t.to) || {}).pos);
        mid = drawCurvedArrow(ctx, A, B, {
          r0: geo.r, r1: geo.r, bend: p.bend, color: col, w: isWinEdge ? 2.2 : 1.2,
        });
      }
      labels.push({ x: mid.x, y: mid.y, ch: t.on, win: !!isWinEdge });
    });

    STATES.forEach((st) => {
      const p = placeIn(geo, st.pos);
      const active = live.indexOf(st.id) >= 0;
      drawNode(ctx, C, {
        x: p.x,
        y: p.y,
        r: geo.r,
        label: st.id,
        sub: st.tag,
        active,
        accepting: st.id === 'F',
        start: st.id === 'S',
        fontSize: geo.narrow ? 9.5 : 10.5,
        badge: active ? '活动' : '',
        badgeColor: C.accent,
      });
    });

    labels.forEach((L) => {
      drawEdgeLabel(ctx, C, L.x, L.y, L.ch, {
        color: L.win ? C.named('amber') : C.fg, active: L.win, size: 11,
      });
    });

    /* 输入带 */
    drawTape(ctx, C, {
      symbols: input.split(''),
      pos,
      x: Math.max(geo.x, (cv.W - Math.max(input.length, 1) * geo.cell) / 2),
      y: geo.tapeY,
      cell: geo.cell,
      label: '输入带（读取头指向下一个待吃符号）',
    });

    /* 线程表 */
    drawThreads(ctx, C, snap, winPath, aliveCount, deadCount, lastSym);

    ro.set('线程', '存活 ' + aliveCount + ' 条 / 共 ' + snap.threads.length + ' 条'
      + (snap.omitted ? '（另有 ' + snap.omitted + ' 条超上限已折叠）' : ''));
    ro.set('可达状态集', '{' + live.join(', ') + '}' + (live.length ? '' : '（全部线程已死）')
      + (deadCount ? '　其中 ' + deadCount + ' 条已死' : ''));
    ro.set('已读输入', pos + ' / ' + input.length + '　读过的「' + input.slice(0, pos) + '」'
      + (pos < input.length ? '　待读的「' + input.slice(pos) + '」' : '　输入已耗尽'));
    if (win) ro.set('判定', '接受：存在一条路径读完全部输入并停在 F（第 ' + pos + ' 步）');
    else if (pos < input.length) ro.set('判定', '还没读完；此刻只能记录「还有哪些线程活着」');
    else ro.set('判定', '拒绝：所有线程都没能在读完输入时停在 F');
  }

  function drawThreads(ctx, C, snap, winPath, aliveCount, deadCount, lastSym) {
    const x0 = geo.x + 2;
    let y = geo.listY;
    label(ctx, '线程表（每条线程 = 一条具体路径；✗ = 该步无出边，当场死亡）',
      x0, y, C.axis, { size: 10 });
    y += 15;
    const list = snap.threads;
    const shown = list.slice(0, maxRows);
    const fs = geo.narrow ? 10 : 10.5;
    shown.forEach((t) => {
      const isWin = winPath && t.dead < 0 && t.path.length === winPath.length
        && t.path.every((s, i) => s === winPath[i]);
      const col = t.dead >= 0 ? C.grid : (isWin ? C.named('amber') : C.accent);
      const txt = t.path.join(' → ') + (t.dead >= 0 ? '  ✗ 第 ' + t.dead + ' 步「' + input[t.dead - 1] + '」无出边' : '');
      label(ctx, txt, x0 + 8, y, col, { size: fs, weight: t.dead >= 0 ? 400 : 600 });
      y += 15;
    });
    if (list.length > maxRows) {
      label(ctx, '…… 还有 ' + (list.length - maxRows) + ' 条线程未列出（判定不受影响：只要有一条走通就算接受）',
        x0 + 8, y, C.grid, { size: fs - 0.5 });
      y += 15;
    }
    if (!list.length) {
      label(ctx, '（空）', x0 + 8, y, C.grid, { size: fs });
      y += 15;
    }
    if (pos >= input.length) {
      const txt = aliveCount && winPath ? '读完了：金色那条直通接受态' : '读完了：没有任何线程停在 F';
      label(ctx, txt, x0, y + 2, winPath ? C.ok : C.bad, { size: 11, weight: 700 });
      void lastSym;
    }
  }

  function reset() { pos = 0; draw(); }

  let acc = 0;
  const controls = anim(host, {
    onTick(dt) {
      acc += dt;
      if (acc < 0.75) return;
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

  simulate();
  reset();
  cv.redraw = draw;
  return { destroy() { controls.stop(); cv.redraw = null; } };
}
