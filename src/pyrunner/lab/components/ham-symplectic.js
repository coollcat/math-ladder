/* =========================================================================
 * lab 组件：ham-symplectic —— 辛欧拉 vs 显式欧拉：能量为什么不漂
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "ham-symplectic",
 *     "title": "同样的步长，三种积分器：只有一种能量不漂",
 *     "h": 0.1, "N": 2000
 *   }
 *   ```
 *
 * 字段：
 *   system "harmonic"（简谐振子）/ "pendulum"（单摆），默认 harmonic
 *   method "explicit" / "symplectic" / "rk4"，默认 symplectic（左图画哪一个）
 *   h      步长，0.005..0.25，默认 0.1
 *   w      振子频率 ω（harmonic）或摆长参数（pendulum 固定为 1），0.5..2，默认 1
 *   N      步数，200..6000，默认 2000
 *   q0,p0  初始条件，默认 (1.2, 0)
 *
 * 能拖什么：
 *   **左图里拖动** = 换初始条件；三个滑块改步长、频率、步数；播放/重置推进时间。
 *
 * 看什么（本组件最要紧的一张图在右边）：
 *   右图是 log₁₀|相对能量误差| 随时间的变化（只画大小，不画符号）：
 *   · 显式欧拉（q ← q + h·∂H/∂p 用的是**旧**的 p）：一条一路爬升的直线 —— 能量只涨不落，
 *     轨道在左图里是一圈圈往外旋的螺旋；
 *   · 辛欧拉（p ← p − h·∂H/∂q 先更新，q ← q + h·∂H/∂p 用**新**的 p）：一条不涨的带子，
 *     误差在固定幅度里来回振荡 —— 它精确守恒的不是 H，而是一个与 H 相差 O(h) 的"影子能量"；
 *   · RK4 每步更准（误差更小），但它是**单调耗散**的：长时间看，误差一直在往一个方向爬。
 *   把步长 h 拖大：辛欧拉那条带子整体抬高但依然不涨，显式欧拉的斜率更陡。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, buildReadout, buildSegmented, bindPointer,
  polyline, label, fmt, clamp, anim,
} from '../core.js';

const QMAX = 2.4;
const PMAX = 2.0;
const TSPAN = 40;      /* 时间轴长度 */
const MAXPTS = 600;    /* 每条曲线最多画多少个点 */

const METHODS = [
  { value: 0, id: 'explicit', label: '显式欧拉' },
  { value: 1, id: 'symplectic', label: '辛欧拉' },
  { value: 2, id: 'rk4', label: 'RK4' },
];

const SYSTEMS = [
  { value: 0, id: 'harmonic', label: '简谐振子' },
  { value: 1, id: 'pendulum', label: '单摆' },
];

/* 正则方程右端：(q̇, ṗ) = (∂H/∂p, −∂H/∂q) */
function flow(sys, w, q, p) {
  if (sys === 1) return [p, -Math.sin(q)];      /* H = p²/2 − cos q */
  return [p, -w * w * q];                       /* H = p²/2 + ½ω²q² */
}

function energy(sys, w, q, p) {
  if (sys === 1) return 0.5 * p * p - Math.cos(q);
  return 0.5 * p * p + 0.5 * w * w * q * q;
}

/* 一步：显式欧拉 / 辛欧拉 / RK4 —— 三条分支刻意写在一起，方便逐行对照 */
function step(method, sys, w, q, p, h) {
  const f = flow(sys, w, q, p);
  if (method === 0) {
    /* 显式（前向）欧拉：两个方程都用**这一步开始时**的值 */
    return [q + h * f[0], p + h * f[1]];
  }
  if (method === 1) {
    /* 辛欧拉：先更新动量，再用**新动量**更新位置 */
    const pn = p + h * f[1];
    const qn = q + h * flow(sys, w, q, pn)[0];
    return [qn, pn];
  }
  const f2 = flow(sys, w, q + 0.5 * h * f[0], p + 0.5 * h * f[1]);
  const f3 = flow(sys, w, q + 0.5 * h * f2[0], p + 0.5 * h * f2[1]);
  const f4 = flow(sys, w, q + h * f3[0], p + h * f3[1]);
  return [
    q + (h / 6) * (f[0] + 2 * f2[0] + 2 * f3[0] + f4[0]),
    p + (h / 6) * (f[1] + 2 * f2[1] + 2 * f3[1] + f4[1]),
  ];
}

/* 跑 N 步，返回轨道点与相对能量误差（每隔若干步取一个采样点存下来） */
function run(method, sys, w, q0, p0, h, n) {
  const e0 = energy(sys, w, q0, p0);
  const every = Math.max(1, Math.floor(n / MAXPTS));
  const out = { qs: [], ps: [], err: [], ts: [] };
  let q = q0;
  let p = p0;
  for (let i = 0; i <= n; i += 1) {
    if (i % every === 0) {
      out.qs.push(q);
      out.ps.push(p);
      out.ts.push(i * h);
      out.err.push(Math.abs(energy(sys, w, q, p) - e0) / Math.max(Math.abs(e0), 1e-9));
    }
    const nx = step(method, sys, w, q, p, h);
    q = nx[0];
    p = nx[1];
    if (!isFinite(q) || !isFinite(p) || Math.abs(q) > 1e6 || Math.abs(p) > 1e6) break;
  }
  return out;
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
  const idOf = (list, name, dflt) => {
    const hit = list.find((x) => x.id === name);
    return hit ? hit.value : dflt;
  };
  let sys = idOf(SYSTEMS, spec.system, 0);
  let method = idOf(METHODS, spec.method, 1);
  let h = clamp(typeof spec.h === 'number' ? spec.h : 0.1, 0.005, 0.25);
  let w = clamp(typeof spec.w === 'number' ? spec.w : 1, 0.5, 2);
  let n = Math.round(clamp(typeof spec.N === 'number' ? spec.N : 2000, 200, 6000));
  let q0 = clamp(typeof spec.q0 === 'number' ? spec.q0 : 1.2, -QMAX, QMAX);
  let p0 = clamp(typeof spec.p0 === 'number' ? spec.p0 : 0, -PMAX, PMAX);

  const cv = setupCanvas(host, 340);
  const ro = buildReadout({
    末态误差: '—', 显式欧拉: '—', 辛欧拉: '—', RK4: '—', 时间: '—',
  });
  host.appendChild(ro.box);

  const gx = { x0: 44, y0: 22, w: 0, h: 0, rx: 0, ry: 0, rw: 0, rh: 0 };
  const runs = [null, null, null];
  let refPts = [];
  let idx = 0;

  const SX = (q) => gx.x0 + ((q + QMAX) / (2 * QMAX)) * gx.w;
  const SY = (p) => gx.y0 + gx.h - ((p + PMAX) / (2 * PMAX)) * gx.h;

  /* 参考解：谐振子有精确椭圆，单摆用极小步长的 RK4 走一遍（只在重算时做一次） */
  function buildRef() {
    if (sys === 0) {
      const e = energy(0, w, q0, p0);
      const a = Math.sqrt(2 * e) / w;
      const b = Math.sqrt(2 * e);
      refPts = [];
      for (let i = 0; i <= 180; i += 1) {
        const th = (2 * Math.PI * i) / 180;
        refPts.push([a * Math.cos(th), b * Math.sin(th)]);
      }
      return;
    }
    const r = run(2, sys, w, q0, p0, h / 20, Math.min(n * 20, 30000));
    refPts = r.qs.map((q, i) => [q, r.ps[i]]);
  }

  function rebuild() {
    for (let m = 0; m < 3; m += 1) runs[m] = run(m, sys, w, q0, p0, h, n);
    buildRef();
    idx = 0;
  }

  /* 相对误差幅度：末段（后 20%）的平均值与最大值 */
  function stats(r) {
    const k = Math.max(1, Math.floor(r.err.length * 0.2));
    const tail = r.err.slice(-k);
    return {
      last: r.err[r.err.length - 1] || 0,
      mean: tail.reduce((s, v) => s + v, 0) / tail.length,
      max: Math.max(...tail, 1e-16),
    };
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    gx.w = Math.round((W - gx.x0 - 40) * 0.46);
    gx.h = H - gx.y0 - 44;
    gx.rx = gx.x0 + gx.w + 40;
    gx.rw = W - gx.rx - 42;
    gx.ry = gx.y0 + 24;
    gx.rh = gx.h - 48;

    /* 左：参考轨道（灰虚线）+ 当前方法的轨道 */
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(SX(0) + 0.5, gx.y0);
    ctx.lineTo(SX(0) + 0.5, gx.y0 + gx.h);
    ctx.moveTo(gx.x0, SY(0) + 0.5);
    ctx.lineTo(gx.x0 + gx.w, SY(0) + 0.5);
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.rect(gx.x0, gx.y0, gx.w, gx.h);
    ctx.clip();
    polyline(ctx, refPts.map(([q, p]) => [SX(q), SY(p)]), C.named('gray'), 1.6, [5, 4]);
    const sel = runs[method];
    polyline(ctx, sel.qs.map((q, i) => [SX(q), SY(sel.ps[i])]), C.series(method), 2);
    ctx.fillStyle = C.bad;
    ctx.beginPath();
    ctx.arc(SX(q0), SY(p0), 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    label(ctx, `${SYSTEMS[sys].label}（ω = ${fmt(w, 2)}）`, gx.x0, gx.y0 - 8, C.fg, { size: 12, weight: 600 });
    label(ctx, `左图：${METHODS[method].label}（灰虚线 = 参考解）`, gx.x0, H - 8, C.axis, { size: 11 });

    /* 右：log10|相对能量误差| —— 三种方法同图对比 */
    const lo = -16;
    const hi = 4;
    const yOf = (v) => gx.ry + gx.rh - ((clamp(Math.log10(Math.max(v, 1e-16)), lo, hi) - lo) / (hi - lo)) * gx.rh;
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let e = lo; e <= hi; e += 4) {
      ctx.moveTo(gx.rx, yOf(10 ** e) + 0.5);
      ctx.lineTo(gx.rx + gx.rw, yOf(10 ** e) + 0.5);
    }
    ctx.moveTo(gx.rx + 0.5, gx.ry);
    ctx.lineTo(gx.rx + 0.5, gx.ry + gx.rh);
    ctx.stroke();
    for (let e = lo; e <= hi; e += 4) {
      label(ctx, `1e${e}`, gx.rx - 4, yOf(10 ** e) + 4, C.axis, { size: 10, align: 'right' });
    }
    for (let m = 0; m < 3; m += 1) {
      const r = runs[m];
      polyline(ctx, r.err.map((v, i) => [gx.rx + (i / Math.max(r.err.length - 1, 1)) * gx.rw, yOf(v)]),
        C.series(m), m === method ? 2.6 : 1.8);
    }
    const selRun = runs[method];
    const cx = gx.rx + (idx / Math.max(selRun.err.length - 1, 1)) * gx.rw;
    polyline(ctx, [[cx, gx.ry], [cx, gx.ry + gx.rh]], C.axis, 1.2);
    label(ctx, '|相对能量误差|（对数轴，只看大小）', gx.rx - 30, gx.ry - 10, C.fg, { size: 11, weight: 600 });
    for (let m = 0; m < 3; m += 1) {
      label(ctx, METHODS[m].label, gx.rx + 6 + m * 76, gx.ry + gx.rh + 16, C.series(m), { size: 11, weight: 600 });
    }

    const s = [0, 1, 2].map((m) => stats(runs[m]));
    const t = (idx / Math.max(selRun.err.length - 1, 1)) * TSPAN;
    ro.set('末态误差', `${METHODS[method].label}：${fmt(stats(selRun).last, 3)}`);
    ro.set('显式欧拉', `末态 ${fmt(s[0].last, 3)}，末段幅度 ${fmt(s[0].max, 3)}（只涨不落）`);
    ro.set('辛欧拉', `末态 ${fmt(s[1].last, 3)}，末段幅度 ${fmt(s[1].max, 3)}（有界，不随时间增长）`);
    ro.set('RK4', `末态 ${fmt(s[2].last, 3)}，末段幅度 ${fmt(s[2].max, 3)}（单调耗散）`);
    ro.set('时间', `t = ${fmt(t, 2)}（步长 h = ${fmt(h, 3)}，共 ${n} 步）`);
  }

  const loop = anim(host, {
    onTick(dt) {
      const selRun = runs[method];
      idx += Math.max(1, Math.round(dt * 220));
      if (idx >= selRun.err.length) idx = 0;
      draw();
    },
    onReset() { idx = 0; draw(); },
  });

  const sl = buildSliders(
    {
      sliders: mergeSpec([
        { name: 'h', label: '步长 h', min: 0.005, max: 0.25, step: 0.005, value: h, fmt: 3 },
        { name: 'w', label: '频率 ω', min: 0.5, max: 2, step: 0.05, value: w, fmt: 2 },
        { name: 'N', label: '步数 N', min: 200, max: 6000, step: 100, value: n, fmt: 0 },
      ], spec),
    },
    (st) => {
      h = st.h; w = st.w; n = Math.round(st.N);
      rebuild();
      draw();
    },
  );
  h = sl.state.h; w = sl.state.w; n = Math.round(sl.state.N);

  const segM = buildSegmented(
    METHODS.map((m) => ({ value: m.value, label: m.label })),
    method,
    (v) => { method = v; idx = 0; draw(); },
  );
  const segS = buildSegmented(
    SYSTEMS.map((m) => ({ value: m.value, label: m.label })),
    sys,
    (v) => { sys = v; rebuild(); draw(); },
  );
  host.insertBefore(segS, ro.box);
  host.insertBefore(segM, segS);

  bindPointer(cv.canvas, {
    pick(x, y) {
      return x >= gx.x0 - 10 && x <= gx.x0 + gx.w + 10 && y >= gx.y0 - 10 && y <= gx.y0 + gx.h + 10
        ? 'ic' : null;
    },
    down(id, x, y) { setIC(x, y); },
    move(id, x, y) { setIC(x, y); },
  });

  function setIC(x, y) {
    q0 = clamp(((x - gx.x0) / gx.w) * 2 * QMAX - QMAX, -QMAX, QMAX);
    p0 = clamp(PMAX - ((y - gx.y0) / gx.h) * 2 * PMAX, -PMAX, PMAX);
    rebuild();
    draw();
  }

  rebuild();
  draw();
  cv.redraw = draw;
  return {
    slidersBox: sl.box,
    destroy() { loop.stop(); },
  };
}
