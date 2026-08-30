/* 死锁实验室：上半场是资源分配图（有环 = 可能死锁），下半场是银行家算法（安全性判定）。
   一个事后检测、一个事前避免，两者放在一起才看得出「避免死锁」到底避免了什么。 */
import {
  themeColors, setupCanvas, buildSegmented, buildToolbar, buildReadout, el, mkBtn, label,
} from '../core.js';

const P = ['P1', 'P2', 'P3'];
const R = ['R1', 'R2', 'R3'];
/* 0 = 无边，1 = 分配边 R→P（已占有），2 = 请求边 P→R（正等待） */
const SYM = ['·', 'R→P', 'P→R'];

const ALLOC = [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]];
const MAX = [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]];
const REQS = [[1, [1, 0, 2]], [4, [3, 3, 0]], [0, [0, 2, 0]], [2, [3, 0, 1]]];

function safe(avail, alloc, need) {
  const work = avail.slice();
  const finish = alloc.map(() => false);
  const seq = [];
  for (let guard = 0; guard < 100; guard += 1) {
    let moved = false;
    for (let i = 0; i < alloc.length; i += 1) {
      if (finish[i] || !need[i].every((v, k) => v <= work[k])) continue;
      alloc[i].forEach((v, k) => { work[k] += v; });
      finish[i] = true;
      seq.push('P' + i);
      moved = true;
    }
    if (!moved) break;
  }
  return { ok: finish.every(Boolean), seq, work };
}

export default function render(host) {
  const C0 = themeColors();
  let mode = 'rag';
  const edge = [[2, 1, 0], [0, 2, 0], [0, 1, 2]]; // 默认构造一个环
  let cycle = [];
  let avail = [3, 3, 2];
  const alloc = ALLOC.map((r) => r.slice());
  let reqIdx = 0;

  const cv = setupCanvas(host, 230);
  const ro = buildReadout({ 检测: '—', 环: '—', 安全序列: '—' });
  host.appendChild(buildSegmented(
    [{ label: '资源分配图', value: 'rag' }, { label: '银行家算法', value: 'banker' }],
    mode, (v) => { mode = v; sync(); draw(); },
  ));
  host.appendChild(ro.box);

  const grid = el('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:2px;padding:0.4rem 0.85rem';
  const cells = [];
  grid.appendChild(el('span'));
  R.forEach((r) => grid.appendChild(el('span', null, r)));
  P.forEach((pi, i) => {
    grid.appendChild(el('span', null, pi));
    R.forEach((rj, j) => {
      const b = mkBtn(SYM[edge[i][j]]);
      b.style.margin = '0';
      b.addEventListener('click', () => {
        edge[i][j] = (edge[i][j] + 1) % 3;
        b.textContent = SYM[edge[i][j]];
        detect();
        draw();
      });
      cells.push({ b, i, j });
      grid.appendChild(b);
    });
  });
  host.appendChild(grid);

  const nextReq = mkBtn('试下一个请求');
  const resetBank = mkBtn('恢复初始状态');
  host.appendChild(buildToolbar(nextReq, resetBank));

  const pre = el('pre');
  pre.style.cssText = `margin:0;padding:0.55rem 0.85rem;font:12px/1.6 var(--pyr-mono,monospace);
    white-space:pre-wrap;color:${C0.fg};background:${C0.soft};border-top:1px dashed ${C0.grid}`;
  host.appendChild(pre);

  /* 在 P/R 二部图上找环：请求边 P→R，分配边 R→P */
  function detect() {
    const adj = {};
    const add = (u, v) => { (adj[u] = adj[u] || []).push(v); };
    P.forEach((p, i) => R.forEach((r, j) => {
      if (edge[i][j] === 2) add(p, r);
      if (edge[i][j] === 1) add(r, p);
    }));
    const state = {};
    const stack = [];
    cycle = [];
    let found = null;
    const dfs = (u) => {
      state[u] = 1;
      stack.push(u);
      (adj[u] || []).forEach((v) => {
        if (found) return;
        if (state[v] === 1) {
          found = stack.slice(stack.indexOf(v));
          found.push(v);
        } else if (!state[v]) dfs(v);
      });
      stack.pop();
      state[u] = 2;
    };
    P.concat(R).forEach((n) => { if (!found && !state[n]) dfs(n); });
    cycle = found || [];
    return cycle;
  }

  function onCycle(e) {
    for (let k = 0; k + 1 < cycle.length; k += 1) {
      const a = cycle[k];
      const b = cycle[k + 1];
      const pi = P.indexOf(a);
      const ri = R.indexOf(a);
      if (pi >= 0 && R.indexOf(b) >= 0 && e[pi][R.indexOf(b)] === 2) return true;
      if (ri >= 0 && P.indexOf(b) >= 0 && e[P.indexOf(b)][ri] === 1) return true;
    }
    return false;
  }

  function bankerText(msg) {
    const need = alloc.map((row, i) => row.map((v, k) => MAX[i][k] - v));
    const r = safe(avail, alloc, need);
    const mat = (m) => m.map((row, i) => 'P' + i + ' [' + row.join(' ') + ']').join('\n');
    pre.textContent = `Available = [${avail.join(' ')}]\n\nAllocation      Need = Max − Allocation\n`
      + mat(alloc).split('\n').map((l, i) => l + '      ' + 'P' + i + ' [' + need[i].join(' ') + ']').join('\n')
      + `\n\n${msg}\n安全性：${r.ok ? '安全' : '不安全'}`
      + (r.ok ? `，安全序列 ${r.seq.join(' → ')}` : `（无法找到任何可推进序列，P 中未完成者会死锁）`);
    ro.set('安全序列', r.ok ? r.seq.join(' → ') : '不存在');
  }

  function doRequest() {
    const [i, req] = REQS[reqIdx % REQS.length];
    reqIdx += 1;
    const need = alloc.map((row, k) => row.map((v, c) => MAX[k][c] - v));
    let msg;
    if (req.some((v, k) => v > need[i][k])) msg = `P${i} 请求 [${req.join(' ')}] 超过它的最大需求 [${need[i].join(' ')}] → 非法，直接拒绝。`;
    else if (req.some((v, k) => v > avail[k])) msg = `P${i} 请求 [${req.join(' ')}] 超过 Available [${avail.join(' ')}] → 资源不足，P${i} 阻塞等待。`;
    else {
      const a2 = alloc.map((row) => row.slice());
      const v2 = avail.slice();
      req.forEach((v, k) => { a2[i][k] += v; v2[k] -= v; });
      const n2 = a2.map((row, k) => row.map((x, c) => MAX[k][c] - x));
      const r = safe(v2, a2, n2);
      if (r.ok) {
        req.forEach((v, k) => { alloc[i][k] += v; avail[k] -= v; });
        msg = `P${i} 请求 [${req.join(' ')}]：试分配后仍安全（序列 ${r.seq.join(' → ')}）→ 同意分配。`;
      } else msg = `P${i} 请求 [${req.join(' ')}]：试分配后进入不安全状态 → 拒绝，P${i} 等待。`;
    }
    bankerText(msg);
  }

  function sync() {
    if (mode === 'rag') {
      detect();
      ro.set('检测', cycle.length ? '发现环路 → 死锁' : '无环 → 不会死锁');
      ro.set('环', cycle.length ? cycle.join(' → ') : '无');
      ro.set('安全序列', '—');
      pre.textContent = '点格子循环切换：无 → 分配边 R→P（已占有）→ 请求边 P→R（在等待）。\n'
        + '每类资源只有一个实例时，**有环 ⟺ 死锁**；若某类资源有多个实例，有环只是「可能」死锁。';
      cv.canvas.style.display = '';
      grid.style.display = '';
      nextReq.style.display = 'none';
      resetBank.style.display = 'none';
    } else {
      cv.canvas.style.display = 'none';
      grid.style.display = 'none';
      nextReq.style.display = '';
      resetBank.style.display = '';
      ro.set('检测', '银行家算法');
      ro.set('环', '—');
      bankerText('点「试下一个请求」逐条检验：银行家在**分配之前**先试算一次安全性。');
    }
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const px = 62;
    const rx = W - 62;
    const py = (i) => 34 + (i * (H - 60)) / (P.length - 1);
    const ry = (j) => 34 + (j * (H - 60)) / (R.length - 1);

    P.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(px, py(i), 17, 0, Math.PI * 2);
      ctx.fillStyle = C.soft;
      ctx.fill();
      ctx.strokeStyle = cycle.includes(p) ? C.bad : C.axis;
      ctx.lineWidth = cycle.includes(p) ? 2.4 : 1.2;
      ctx.stroke();
      label(ctx, p, px, py(i) + 4, C.fg, { align: 'center', size: 11, weight: 600 });
    });
    R.forEach((r, j) => {
      ctx.fillStyle = C.soft;
      ctx.fillRect(rx - 14, ry(j) - 14, 28, 28);
      ctx.strokeStyle = cycle.includes(r) ? C.bad : C.axis;
      ctx.lineWidth = cycle.includes(r) ? 2.4 : 1.2;
      ctx.strokeRect(rx - 14, ry(j) - 14, 28, 28);
      label(ctx, r, rx, ry(j) + 4, C.fg, { align: 'center', size: 11, weight: 600 });
      label(ctx, '1 个实例', rx, ry(j) + 26, C.axis, { align: 'center', size: 9 });
    });

    const arrow = (x1, y1, x2, y2, hot) => {
      const col = hot ? C.bad : C.fg;
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.lineWidth = hot ? 2.2 : 1.3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      const a = Math.atan2(y2 - y1, x2 - x1);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - 7 * Math.cos(a - 0.4), y2 - 7 * Math.sin(a - 0.4));
      ctx.lineTo(x2 - 7 * Math.cos(a + 0.4), y2 - 7 * Math.sin(a + 0.4));
      ctx.closePath();
      ctx.fill();
    };

    P.forEach((p, i) => R.forEach((r, j) => {
      const e = edge[i][j];
      const bad = onCycle(edge) && cycle.includes(p) && cycle.includes(r) && e > 0;
      if (e === 2) arrow(px + 17, py(i), rx - 15, ry(j), bad);
      if (e === 1) arrow(rx - 15, ry(j), px + 17, py(i), bad);
    }));
    label(ctx, '圆圈 = 进程，方块 = 资源', 8, 14, C.fg, { size: 11 });
    label(ctx, 'P→R 请求边  /  R→P 分配边', W - 8, 14, C.fg, { size: 11, align: 'right' });
  }

  nextReq.addEventListener('click', doRequest);
  resetBank.addEventListener('click', () => {
    avail = [3, 3, 2];
    alloc.forEach((row, i) => ALLOC[i].forEach((v, k) => { row[k] = v; }));
    reqIdx = 0;
    bankerText('已恢复初始状态（教科书经典 5 进程 3 资源例）。');
  });

  sync();
  draw();
  cv.redraw = draw;
  return { destroy() {} };
}
