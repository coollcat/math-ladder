/* =========================================================================
 * lab 组件：ham-liouville —— 相空间里一团初始条件的面积怎么变
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "ham-liouville",
 *     "title": "一团初始条件：形状可以拉长，面积一寸不让",
 *     "flow": "shear",
 *     "T": 6
 *   }
 *   ```
 *
 * 字段：
 *   flow  "osc"（谐振子，纯旋转）/ "shear"（剪切流 H = p²/2）/ "damped"（带阻尼，非哈密顿），
 *         默认 "shear"
 *   T     总演化时间，1..14，默认 6
 *   rq,rp 初始那团点云的横向 / 纵向半径，默认 0.45 / 0.35
 *   qc,pc 点云中心（拖动画布也能改），默认 (0.9, 0.7)
 *   gamma 阻尼系数，0..0.6，默认 0.25（只在 damped 下有效）
 *
 * 能拖什么：
 *   **在左图上拖动** = 把那团初始条件搬到别处；右侧面积曲线、后续帧全部重算。
 *   播放/重置按钮推进时间；滑块能改团的大小、总时间和阻尼。
 *
 * 看什么：
 *   左图实线圈出的是**当前**那团点的凸包，虚线圈是出发时的样子：
 *   剪切流里点云被拉成一根斜面条，凸包面积却和原来一模一样 —— 这就是刘维尔定理
 *   （相体积不可压）。谐振子里更平凡：整团只是刚性地转圈。
 *   切到"阻尼"，面积曲线立刻掉下去 —— 因为它不是哈密顿流：
 *   ṗ 里那个 −γp 项把相体积"吸"掉了，一切耗散系统的共同特征。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, buildReadout, buildSegmented, bindPointer,
  polyline, label, fmt, clamp, anim,
} from '../core.js';

const QMAX = 2.6;
const PMAX = 2.2;
const NPTS = 168;      /* 点云里多少个初始条件 */
const KEYS = 120;      /* 预先算多少帧 */
const SUB = 12;        /* 每帧内部再细分多少步（保证 RK4 够准） */

const FLOWS = [
  { value: 0, id: 'osc', label: '谐振子（旋转）' },
  { value: 1, id: 'shear', label: '剪切流' },
  { value: 2, id: 'damped', label: '带阻尼（反面）' },
];

/* 右端项：前两个是哈密顿的，第三个不是 */
function rhs(flow, q, p, gamma) {
  if (flow === 1) return [p, 0];                    /* H = p²/2：q̇ = p、ṗ = 0 */
  if (flow === 2) return [p, -q - gamma * p];       /* 阻尼振子：相体积会缩 */
  return [p, -q];                                   /* H = (p² + q²)/2 */
}

function rk4(flow, q, p, h, gamma) {
  const f1 = rhs(flow, q, p, gamma);
  const f2 = rhs(flow, q + 0.5 * h * f1[0], p + 0.5 * h * f1[1], gamma);
  const f3 = rhs(flow, q + 0.5 * h * f2[0], p + 0.5 * h * f2[1], gamma);
  const f4 = rhs(flow, q + h * f3[0], p + h * f3[1], gamma);
  return [
    q + (h / 6) * (f1[0] + 2 * f2[0] + 2 * f3[0] + f4[0]),
    p + (h / 6) * (f1[1] + 2 * f2[1] + 2 * f3[1] + f4[1]),
  ];
}

/* 确定性地点云：同心环采样（不用随机数，重画时点不会跳） */
function blob(qc, pc, rq, rp) {
  const pts = [];
  const rings = 9;
  for (let i = 1; i <= rings; i += 1) {
    const t = i / rings;
    const per = Math.max(4, Math.round(NPTS * t / rings));
    for (let j = 0; j < per; j += 1) {
      const th = (2 * Math.PI * j) / per;
      pts.push([qc + rq * t * Math.cos(th), pc + rp * t * Math.sin(th)]);
    }
  }
  return pts;
}

/* 凸包（Andrew 单调链）—— 面积用它的鞋带公式算 */
function hullArea(pts) {
  const a = pts.slice().sort((x, y) => (x[0] - y[0]) || (x[1] - y[1]));
  if (a.length < 3) return 0;
  const cross = (o, u, v) => (u[0] - o[0]) * (v[1] - o[1]) - (u[1] - o[1]) * (v[0] - o[0]);
  const lower = [];
  a.forEach((pt) => {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pt) <= 0) lower.pop();
    lower.push(pt);
  });
  const upper = [];
  for (let i = a.length - 1; i >= 0; i -= 1) {
    const pt = a[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pt) <= 0) upper.pop();
    upper.push(pt);
  }
  const h = lower.concat(upper.slice(1, -1));
  let s = 0;
  for (let i = 0; i < h.length; i += 1) {
    const u = h[i];
    const v = h[(i + 1) % h.length];
    s += u[0] * v[1] - v[0] * u[1];
  }
  return Math.abs(s) / 2;
}

function mergeSpec(base, spec) {
  const given = Array.isArray(spec && spec.sliders) ? spec.sliders : [];
  return base.map((d) => {
    const top = spec && typeof spec[d.name] === 'number' ? spec[d.name] : d.value;
    const o = given.find((gg) => gg && gg.name === d.name) || {};
    const item = Object.assign({}, d, { value: top }, o, { name: d.name });
    item.value = clamp(item.value, item.min, item.max);
    return item;
  });
}

export default function render(host, spec) {
  const flowOf = (name) => {
    const hit = FLOWS.find((f) => f.id === name);
    return hit ? hit.value : 1;
  };
  let flow = flowOf(spec.flow);
  let qc = clamp(typeof spec.qc === 'number' ? spec.qc : 0.9, -QMAX, QMAX);
  let pc = clamp(typeof spec.pc === 'number' ? spec.pc : 0.7, -PMAX, PMAX);
  let rq = clamp(typeof spec.rq === 'number' ? spec.rq : 0.45, 0.08, 1.4);
  let rp = clamp(typeof spec.rp === 'number' ? spec.rp : 0.35, 0.08, 1.4);
  let gamma = 0.25;
  let T = clamp(typeof spec.T === 'number' ? spec.T : 6, 1, 14);

  const cv = setupCanvas(host, 330);
  const ro = buildReadout({ 帧: '—', 初始面积: '—', 当前面积: '—', 面积比: '—', 流: '—' });
  host.appendChild(ro.box);

  const g = { x0: 44, y0: 20, w: 0, h: 0, rx: 0, ry: 0, rw: 0, rh: 0 };
  let frames = [];
  let areas = [];
  let a0 = 1;
  let fi = 0;

  const SX = (q) => g.x0 + ((q + QMAX) / (2 * QMAX)) * g.w;
  const SY = (p) => g.y0 + g.h - ((p + PMAX) / (2 * PMAX)) * g.h;

  /* 预演：把点云在 KEYS 个时刻的位置与凸包面积一次性算好，播放时只查表 */
  function precompute() {
    const pts = blob(qc, pc, rq, rp);
    a0 = Math.max(hullArea(pts), 1e-9);
    frames = [];
    areas = [];
    let cur = pts;
    const h = T / (KEYS - 1) / SUB;
    for (let k = 0; k < KEYS; k += 1) {
      frames.push(cur);
      areas.push(hullArea(cur) / a0);
      const next = cur.map(([q, p]) => {
        let qq = q;
        let pp = p;
        for (let s = 0; s < SUB; s += 1) {
          const nx = rk4(flow, qq, pp, h, gamma);
          qq = nx[0];
          pp = nx[1];
        }
        return [qq, pp];
      });
      cur = next;
    }
    fi = 0;
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    g.w = Math.round((W - g.x0 - 40) * 0.6);
    g.h = H - g.y0 - 44;
    g.rx = g.x0 + g.w + 34;
    g.rw = W - g.rx - 26;
    g.ry = g.y0 + 24;
    g.rh = g.h - 44;

    /* 参照系 */
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(SX(0) + 0.5, g.y0);
    ctx.lineTo(SX(0) + 0.5, g.y0 + g.h);
    ctx.moveTo(g.x0, SY(0) + 0.5);
    ctx.lineTo(g.x0 + g.w, SY(0) + 0.5);
    ctx.stroke();

    const now = frames[fi] || [];

    ctx.save();
    ctx.beginPath();
    ctx.rect(g.x0, g.y0, g.w, g.h);
    ctx.clip();
    /* 出发时的轮廓（虚线椭圆）：点云的初始包络 */
    ctx.strokeStyle = C.named('gray');
    ctx.lineWidth = 1.6;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.ellipse(SX(qc), SY(pc), rq * (g.w / (2 * QMAX)), rp * (g.h / (2 * PMAX)), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    /* 当前点云 */
    ctx.fillStyle = C.accent2;
    now.forEach(([q, p]) => {
      ctx.beginPath();
      ctx.arc(SX(q), SY(p), 2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    /* 右图：面积随时间的曲线 */
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(g.rx, g.ry + g.rh);
    ctx.lineTo(g.rx + g.rw, g.ry + g.rh);
    ctx.moveTo(g.rx + 0.5, g.ry);
    ctx.lineTo(g.rx + 0.5, g.ry + g.rh);
    ctx.stroke();

    const top = Math.max(1.35, ...areas.map((v) => (isFinite(v) ? v : 1.35)));
    const pts = areas.map((v, i) => [
      g.rx + (i / (KEYS - 1)) * g.rw,
      g.ry + g.rh - (clamp(v, 0, top) / top) * g.rh,
    ]);
    polyline(ctx, pts, C.accent2, 2.2);
    /* 面积 = 1 的基准线：哈密顿流应该一直贴着它 */
    const y1 = g.ry + g.rh - (1 / top) * g.rh;
    polyline(ctx, [[g.rx, y1], [g.rx + g.rw, y1]], C.named('green'), 1.6, [5, 4]);
    const cx = g.rx + (fi / (KEYS - 1)) * g.rw;
    polyline(ctx, [[cx, g.ry], [cx, g.ry + g.rh]], C.accent, 1.4);

    label(ctx, '面积 / 初始面积', g.rx, g.ry - 8, C.fg, { size: 11, weight: 600 });
    label(ctx, `t = ${fmt((fi / (KEYS - 1)) * T, 2)}`, Math.min(cx + 6, g.rx + g.rw - 52),
      g.ry + 12, C.accent, { size: 11 });
    label(ctx, '绿虚线 = 面积不变', g.rx, g.ry + g.rh + 14, C.named('green'), { size: 11 });
    label(ctx, `${FLOWS[flow].label}：${flow === 2 ? 'ṗ = −q − γp（有耗散）' : '哈密顿矢量场'}`,
      g.x0, H - 6, C.axis, { size: 11 });
    label(ctx, '位置 q', g.x0 + g.w - 44, SY(0) + 15, C.fg, { size: 11 });

    ro.set('帧', `${fi + 1} / ${KEYS}`);
    ro.set('初始面积', fmt(a0, 4));
    ro.set('当前面积', fmt((areas[fi] || 1) * a0, 4));
    ro.set('面积比', fmt(areas[fi] || 1, 4));
    ro.set('流', flow === 2 ? '非哈密顿（面积会缩）' : '哈密顿（面积守恒）');
  }

  const loop = anim(host, {
    onTick(dt) {
      fi += Math.max(1, Math.round(dt * 90));
      if (fi >= KEYS) fi = 0;
      draw();
    },
    onReset() { fi = 0; draw(); },
  });

  const sl = buildSliders(
    {
      sliders: mergeSpec([
        { name: 'rq', label: '团横半径', min: 0.08, max: 1.2, step: 0.02, value: rq, fmt: 2 },
        { name: 'rp', label: '团纵半径', min: 0.08, max: 1.2, step: 0.02, value: rp, fmt: 2 },
        { name: 'T', label: '总时间 T', min: 1, max: 14, step: 0.5, value: T, fmt: 1 },
        { name: 'gamma', label: '阻尼 γ', min: 0, max: 0.6, step: 0.01, value: gamma, fmt: 2 },
      ], spec),
    },
    (st) => {
      rq = st.rq;
      rp = st.rp;
      T = st.T;
      gamma = st.gamma;
      precompute();
      draw();
    },
  );
  rq = sl.state.rq;
  rp = sl.state.rp;
  T = sl.state.T;
  gamma = sl.state.gamma;

  const seg = buildSegmented(
    FLOWS.map((f) => ({ value: f.value, label: f.label })),
    flow,
    (v) => { flow = v; precompute(); draw(); },
  );
  host.insertBefore(seg, ro.box);

  bindPointer(cv.canvas, {
    pick(x, y) {
      return x >= g.x0 - 10 && x <= g.x0 + g.w + 10 && y >= g.y0 - 10 && y <= g.y0 + g.h + 10
        ? 'blob' : null;
    },
    down(id, x, y) { setCenter(x, y); },
    move(id, x, y) { setCenter(x, y); },
    up() { precompute(); draw(); },
  });

  function setCenter(x, y) {
    qc = clamp(((x - g.x0) / g.w) * 2 * QMAX - QMAX, -QMAX + rq, QMAX - rq);
    pc = clamp(PMAX - ((y - g.y0) / g.h) * 2 * PMAX, -PMAX + rp, PMAX - rp);
    precompute();
    draw();
  }

  precompute();
  draw();
  cv.redraw = draw;
  return {
    slidersBox: sl.box,
    destroy() { loop.stop(); },
  };
}
