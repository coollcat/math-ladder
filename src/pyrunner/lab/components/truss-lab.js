/* 桁架与杆件内力：五节点静定桁架，拖两个外载荷，逐节点列平衡方程解出全部杆力。
   受拉杆与受压杆染成两色——这是桁架设计里第一件要看懂的事（压杆还得防屈曲）。
   求解统一走 mech.solveTruss（引擎的节点法平衡矩阵 + 高斯消元；2026-09-30
   已实测返回 ok:true，组件内曾经的 82 行回落求解器按「只留活口」纪律删除）。 */
import {
  themeColors, setupCanvas, bindPointer, buildReadout, buildToolbar, mkBtn,
  engine, label, clamp, fmt,
  clearBg,
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
    if (!mech) {
      forces = null;
      src = '引擎未就绪';
      return;
    }
    const mems = MEMBERS.map((m) => ({ ...m }));
    mech.indexMembers(mems, NODES);
    const r = mech.solveTruss(NODES, mems, SUPPORTS, loads);
    const vals = r && r.ok ? Object.values(r.forces) : [];
    if (r && r.ok && vals.length && vals.every((v) => isFinite(v))) {
      forces = r.forces;
      src = 'mech.solveTruss';
      return;
    }
    forces = null;
    src = '求解失败';
  }

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
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
