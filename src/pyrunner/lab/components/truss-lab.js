/* 桁架与杆件内力：五节点静定桁架，拖两个外载荷，逐节点列平衡方程解出全部杆力。
   受拉杆与受压杆染成两色——这是桁架设计里第一件要看懂的事（压杆还得防屈曲）。

   注意：mech.solveTruss 目前恒返回 {ok:false}（见报告），因此这里先用引擎试算，
   失败则回落到组件内的节点法平衡矩阵求解器；引擎修好后自动改走引擎。 */
import {
  themeColors, setupCanvas, bindPointer, buildReadout, buildToolbar, mkBtn,
  engine, label, clamp, fmt,
} from '../core.js';

const NODES = [
  { id: 'A', x: 0, y: 0 },
  { id: 'B', x: 2, y: 0 },
  { id: 'C', x: 4, y: 0 },
  { id: 'D', x: 1, y: 1.8 },
  { id: 'E', x: 3, y: 1.8 },
];
const MEMBERS = [
  { id: 'AB', a: 'A', b: 'B' },
  { id: 'BC', a: 'B', b: 'C' },
  { id: 'AD', a: 'A', b: 'D' },
  { id: 'DB', a: 'D', b: 'B' },
  { id: 'BE', a: 'B', b: 'E' },
  { id: 'EC', a: 'E', b: 'C' },
  { id: 'DE', a: 'D', b: 'E' },
];
const SUPPORTS = [
  { node: 'A', type: 'pin' },
  { node: 'C', type: 'roller-y' },
];

/* 节点法：未知量 = 各杆轴力（拉为正）+ 各支座反力分量。
   每个节点两个方程 ΣFx=0、ΣFy=0，方阵用高斯消元求解。 */
function solveJoints(loads) {
  const idx = new Map();
  NODES.forEach((n, i) => idx.set(n.id, i));
  const m = MEMBERS.length;
  const rCols = [];
  SUPPORTS.forEach((sp) => {
    if (sp.type === 'pin') rCols.push({ node: sp.node, dir: 'x' }, { node: sp.node, dir: 'y' });
    else rCols.push({ node: sp.node, dir: sp.type === 'roller-x' ? 'x' : 'y' });
  });
  const n = NODES.length * 2;
  const A = [];
  for (let i = 0; i < n; i += 1) A.push(new Float64Array(m + rCols.length));
  const b = new Float64Array(n);

  MEMBERS.forEach((mem, k) => {
    const i = idx.get(mem.a);
    const j = idx.get(mem.b);
    const dx = NODES[j].x - NODES[i].x;
    const dy = NODES[j].y - NODES[i].y;
    const L = Math.hypot(dx, dy) || 1e-12;
    const cx = dx / L;
    const cy = dy / L;
    /* 杆力 N（拉为正）在节点 i 上沿 i→j 方向拉，在节点 j 上沿 j→i 方向拉 */
    A[i * 2][k] += cx;
    A[i * 2 + 1][k] += cy;
    A[j * 2][k] -= cx;
    A[j * 2 + 1][k] -= cy;
  });
  rCols.forEach((rc, k) => {
    const i = idx.get(rc.node);
    A[i * 2 + (rc.dir === 'y' ? 1 : 0)][m + k] += 1;
  });
  loads.forEach((ld) => {
    const i = idx.get(ld.node);
    b[i * 2] -= ld.fx || 0;
    b[i * 2 + 1] -= ld.fy || 0;
  });

  /* 高斯消元（部分主元） */
  const M = A.map((row) => Float64Array.from(row));
  const z = Float64Array.from(b);
  const cols = m + rCols.length;
  for (let col = 0; col < cols; col += 1) {
    let piv = col;
    for (let r = col + 1; r < n; r += 1) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-9) continue;
    if (piv !== col) {
      const t = M[piv]; M[piv] = M[col]; M[col] = t;
      const sv = z[piv]; z[piv] = z[col]; z[col] = sv;
    }
    for (let r = col + 1; r < n; r += 1) {
      const f = M[r][col] / M[col][col];
      if (!f) continue;
      for (let c = col; c < cols; c += 1) M[r][c] -= f * M[col][c];
      z[r] -= f * z[col];
    }
  }
  /* 超定系统（静定时应为一致）：回代后校验残差 */
  const x = new Float64Array(cols);
  for (let r = n - 1; r >= 0; r -= 1) {
    let pcol = -1;
    for (let c = 0; c < cols; c += 1) if (Math.abs(M[r][c]) > 1e-9) { pcol = c; break; }
    if (pcol < 0) { if (Math.abs(z[r]) > 1e-6) return null; continue; }
    let sval = z[r];
    for (let c = pcol + 1; c < cols; c += 1) sval -= M[r][c] * x[c];
    x[pcol] = sval / M[r][pcol];
  }
  let res = 0;
  for (let r = 0; r < n; r += 1) {
    let row = -b[r];
    for (let c = 0; c < cols; c += 1) row += A[r][c] * x[c];
    res = Math.max(res, Math.abs(row));
  }
  if (res > 1e-3 * (1 + b.reduce((t, v) => t + Math.abs(v), 0))) return null;

  const forces = {};
  MEMBERS.forEach((mem, k) => { forces[mem.id] = x[k]; });
  const reactions = rCols.map((rc, k) => ({ node: rc.node, dir: rc.dir, value: x[m + k] }));
  return { forces, reactions };
}

export default function render(host, spec) {
  const C = themeColors();
  const loads = [
    { node: 'D', fx: 0, fy: spec.wD ?? -600 },
    { node: 'E', fx: 0, fy: spec.wE ?? -400 },
  ];

  const cv = setupCanvas(host, 300);
  const ro = buildReadout({ '最大拉力': '—', '最大压力': '—', '支座反力': '—', '求解方式': '—' });
  host.appendChild(ro.box);

  let mech = null;
  let forces = null;
  let src = '—';

  /* 世界坐标 → 画布 */
  const world = { x0: 0, x1: 4, y0: -0.4, y1: 2.6 };
  const sc = () => Math.min((cv.W - 76) / (world.x1 - world.x0), (cv.H - 66) / (world.y1 - world.y0));
  const px = (X) => 38 + (X - world.x0) * sc();
  const py = (Y) => cv.H - 34 - (Y - world.y0) * sc();
  const FSC = 0.03; // px per N

  function compute() {
    /* 先试引擎，引擎不可用则回落 */
    if (mech) {
      const mems = MEMBERS.map((m) => ({ ...m }));
      mech.indexMembers(mems, NODES);
      const r = mech.solveTruss(NODES, mems, SUPPORTS, loads);
      const vals = r && r.ok ? Object.values(r.forces) : [];
      if (r && r.ok && vals.length && vals.every((v) => isFinite(v))) {
        forces = r.forces;
        src = 'mech.solveTruss';
        return;
      }
    }
    const r = solveJoints(loads);
    forces = r ? r.forces : null;
    src = r ? '节点法平衡矩阵（组件内）' : '求解失败';
  }

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    compute();

    let maxN = 1;
    if (forces) MEMBERS.forEach((m) => { maxN = Math.max(maxN, Math.abs(forces[m.id] || 0)); });

    /* 支座 */
    SUPPORTS.forEach((sp) => {
      const nd = NODES.find((n) => n.id === sp.node);
      const X = px(nd.x);
      const Y = py(nd.y);
      ctx.strokeStyle = C.accent;
      ctx.fillStyle = C.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X, Y);
      ctx.lineTo(X - 11, Y + 18);
      ctx.lineTo(X + 11, Y + 18);
      ctx.closePath();
      ctx.stroke();
      if (sp.type === 'roller') {
        ctx.beginPath();
        ctx.arc(X - 6, Y + 23, 4.5, 0, Math.PI * 2);
        ctx.moveTo(X + 11, Y + 23);
        ctx.arc(X + 6, Y + 23, 4.5, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        for (let k = -1; k <= 1; k += 1) {
          ctx.beginPath();
          ctx.moveTo(X + k * 13, Y + 18);
          ctx.lineTo(X + k * 13 - 6, Y + 25);
          ctx.stroke();
        }
      }
    });

    /* 杆件：拉绿压红，粗细随轴力大小 */
    MEMBERS.forEach((m) => {
      const p = NODES.find((n) => n.id === m.a);
      const q = NODES.find((n) => n.id === m.b);
      const N = forces ? (forces[m.id] || 0) : 0;
      const t = Math.min(1, Math.abs(N) / maxN);
      ctx.strokeStyle = !forces ? C.axis : N > 0.5 ? C.ok : N < -0.5 ? C.bad : C.axis;
      ctx.lineWidth = 2 + t * 4.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(px(p.x), py(p.y));
      ctx.lineTo(px(q.x), py(q.y));
      ctx.stroke();
      if (forces) {
        const mx = (px(p.x) + px(q.x)) / 2;
        const my = (py(p.y) + py(q.y)) / 2;
        label(ctx, fmt(N, 0) + ' N', mx + 4, my - 3, ctx.strokeStyle, { size: 10, weight: 600 });
      }
    });

    /* 节点 */
    NODES.forEach((n) => {
      ctx.fillStyle = C.fg;
      ctx.beginPath();
      ctx.arc(px(n.x), py(n.y), 3.5, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, n.id, px(n.x) - 12, py(n.y) + 16, C.fg, { size: 10 });
    });

    /* 可拖的外载荷 */
    loads.forEach((ld) => {
      const nd = NODES.find((n) => n.id === ld.node);
      const X = px(nd.x);
      const Y = py(nd.y);
      const len = Math.abs(ld.fy) * FSC;
      const col = C.named('purple');
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(X, Y - len - 26);
      ctx.lineTo(X, Y - 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(X, Y - 4);
      ctx.lineTo(X - 5, Y - 14);
      ctx.lineTo(X + 5, Y - 14);
      ctx.closePath();
      ctx.fill();
      label(ctx, fmt(Math.abs(ld.fy), 0) + ' N', X + 7, Y - len - 22, col, { size: 10, weight: 600 });
    });

    label(ctx, '拖紫色箭头改载荷大小', 8, 13, C.fg, { size: 11 });
    label(ctx, '绿 = 受拉', W - 8, 13, C.ok, { align: 'right', size: 11, weight: 600 });
    label(ctx, '红 = 受压', W - 8, 28, C.bad, { align: 'right', size: 11, weight: 600 });

    if (forces) {
      const vals = MEMBERS.map((m) => forces[m.id] || 0);
      ro.set('最大拉力', fmt(Math.max(0, ...vals), 0) + ' N');
      ro.set('最大压力', fmt(Math.min(0, ...vals), 0) + ' N');
      const tot = -loads.reduce((t, l) => t + l.fy, 0);
      ro.set('支座反力', '共 ' + fmt(tot, 0) + ' N 向上');
    } else {
      ro.set('最大拉力', '—');
      ro.set('最大压力', '—');
      ro.set('支座反力', '—');
    }
    ro.set('求解方式', src);
  }

  bindPointer(cv.canvas, {
    pick(X, Y) {
      let best = null;
      let bd = 18;
      loads.forEach((ld, i) => {
        const nd = NODES.find((n) => n.id === ld.node);
        const ax = px(nd.x);
        const ay = py(nd.y) - 6 - Math.abs(ld.fy) * FSC - 26;
        const d = Math.hypot(X - ax, Y - ay);
        if (d < bd) { bd = d; best = 'L' + i; }
      });
      return best;
    },
    down(id) { void id; },
    move(id, X, Y) {
      const i = Number(id.slice(1));
      const nd = NODES.find((n) => n.id === loads[i].node);
      loads[i].fy = -clamp((py(nd.y) - 32 - Y) / FSC, 0, 2000);
      draw();
    },
  });

  const zero = mkBtn('卸掉全部载荷');
  zero.addEventListener('click', () => {
    loads.forEach((l) => { l.fy = 0; });
    draw();
  });
  const flip = mkBtn('两侧对称加载');
  flip.addEventListener('click', () => {
    loads[0].fy = -600;
    loads[1].fy = -600;
    draw();
  });
  host.appendChild(buildToolbar(zero, flip));

  draw();
  cv.redraw = draw;
  engine('mech').then((m) => { mech = m; draw(); }).catch(() => { void 0; });

  return { destroy() {} };
}
