/* =========================================================================
 * 3D 曲面 —— z = f(x, y) 的立体图
 * -------------------------------------------------------------------------
 * 不用 WebGL，自己拿 Canvas 2D 做正交投影 + 画家算法（按深度从远到近画）。
 * 理由：曲面的格子是规则网格，面片之间不会互相穿插，画家算法足够正确；
 * 换来的好处是没有 GL 上下文管理、没有 shader，主题色和交互跟 2D 那块完全一致。
 *
 * 三个尺度要先归一，否则形状会被压扁：
 *   u = (x - xc) / 半宽      v = (y - yc) / 半宽      w = (z - zc) / 半高 × 高度夸张
 * x、y 用各自的半宽（保持长宽比），z 单独乘一个 zScale（默认 0.6）——
 * 曲面起伏通常比 xy 范围小一个量级，不夸张一点看上去就是一张平板。
 *
 * 视角用「方位角 az + 仰角 el」两个角描述：
 *   az=0 时相机在 -y 方向看向 +y；el 是从水平面抬起的角度，90° 是正俯视。
 * 旋转只改这两个角，**不需要重新采样**（采样发生在 xy 平面上，与视角无关），
 * 所以拖动时只重投影重画；真要重采的只有改式子、拖参数、改 xy 范围这三种情况。
 * ========================================================================= */

import * as A from './analyze.js';

/* viridis 色标：感知均匀、色盲友好，亮暗两个主题下都好看 */
const RAMP = [
  [68, 1, 84], [72, 40, 120], [62, 74, 137], [49, 104, 142],
  [38, 130, 142], [31, 158, 137], [53, 183, 121], [109, 205, 89],
  [180, 222, 44], [253, 231, 37],
];

/** 色带取样：t ∈ [0,1] → 'rgb(r,g,b)' */
export function rampColor(t) {
  const c = Math.min(1, Math.max(0, t));
  const p = c * (RAMP.length - 1);
  const i = Math.min(RAMP.length - 2, Math.floor(p));
  const f = p - i;
  const a = RAMP[i];
  const b = RAMP[i + 1];
  return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * f) + ',' +
    Math.round(a[1] + (b[1] - a[1]) * f) + ',' +
    Math.round(a[2] + (b[2] - a[2]) * f) + ')';
}

/* 光源方向（在归一化空间里固定，于是转动曲面时明暗会跟着变，立体感就是从这来的） */
const LIGHT = (() => {
  const v = [-0.42, -0.62, 0.66];
  const m = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / m, v[1] / m, v[2] / m];
})();

/**
 * 投影的数学部分（不含屏幕平移缩放），单独抽出来是为了能脱开 DOM 测。
 * 输入是归一化坐标 (u, v, w)：u 沿 x、v 沿 y、w 是高度（已按 zScale 缩放）。
 * 输出 rx / ry 是屏幕偏移（ry 已经按「向上为正」取好号，画的时候 y 取反），
 * depth 越大离相机越远——画家算法就按它从大到小画。
 *
 * 两个角度的零点这么定，是为了让默认视角读起来顺：
 *   az = 0   相机在 -y 方向看向 +y，于是屏幕右方就是 +x；
 *   el = 0   平视，高度 w 直接映射到屏幕纵向；
 *   el = 90° 正俯视，屏幕纵向换成 v（y 轴），且 w 越大离相机越近。
 */
export function projectUVW(u, v, w, az, el) {
  const ca = Math.cos(az);
  const sa = Math.sin(az);
  const ce = Math.cos(el);
  const se = Math.sin(el);
  const T = u * sa + v * ca;   /* 水平面上沿视线方向的分量 */
  const R = u * ca - v * sa;   /* 水平面上沿屏幕横轴的分量 */
  return { rx: R, ry: T * se + w * ce, depth: T * ce - w * se };
}

/* 明暗两主题要分开调：viridis 的低端是深紫 (68,1,84)，按亮色那套系数
   乘完几乎和深色背景融为一体，所以暗色主题下环境光更足、整体再提一档亮。 */
const LIGHTING = {
  light: { amb: 0.38, dif: 0.62, gain: 1 },
  dark: { amb: 0.52, dif: 0.66, gain: 1.45 },
};

function cssVar(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v && v.trim()) || fallback;
  } catch (e) {
    void e;
    return fallback;
  }
}

function isDark() {
  const t = document.documentElement.dataset.theme;
  if (t === 'dark') return true;
  if (t === 'light') return false;
  return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

let cache = null;
function themeColors() {
  if (cache) return cache;
  const dark = isDark();
  cache = {
    bg: cssVar('--ml-viz-bg', dark ? '#20242c' : '#ffffff'),
    fg: cssVar('--ml-viz-fg', dark ? '#e8eaed' : '#1c1e21'),
    grid: cssVar('--ml-viz-grid', dark ? 'rgba(148,163,184,0.20)' : 'rgba(107,114,128,0.18)'),
    axis: cssVar('--ml-viz-axis', dark ? 'rgba(148,163,184,0.60)' : 'rgba(107,114,128,0.60)'),
    muted: dark ? 'rgba(232,234,237,0.62)' : 'rgba(28,30,33,0.58)',
    dark,
  };
  return cache;
}

export function createSurface(host, opts) {
  const o = opts || {};
  const wrap = document.createElement('div');
  wrap.className = 'ml-fn__plot ml-fn__surface';
  host.appendChild(wrap);

  const canvas = document.createElement('canvas');
  canvas.className = 'ml-fn__canvas';
  wrap.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  /* 视角：方位角、仰角、缩放。zScale 是高度夸张倍数 */
  let az = o.az === undefined ? -0.9 : o.az;
  let el = o.el === undefined ? 0.52 : o.el;
  let zoom = 1;
  let zScale = o.zScale === undefined ? 0.6 : o.zScale;

  let mesh = null;      /* {xs, ys, z, nx, ny} */
  let zlo = -1;
  let zhi = 1;
  let marks = [];
  let showWire = true;
  let showBox = true;
  let lod = 1;          /* 1 = 每个格子都画；2/3 = 拖动时跳格降精度 */
  let W = 300;
  let H = 200;
  let dpr = 1;
  const shadeCache = new Map();

  /* 悬停探针：pick 到的 (x, y) 与曲面高度 z。meshAt 是调用方给的求值函数，
     只在 hover 时用——旋转/缩放永远不需要它。 */
  let hoverMark = null;
  let meshAt = null;

  const cbView = [];
  const cbHover = [];

  /* ---------- 尺寸 ---------- */
  function fit() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(240, wrap.clientWidth || 320);
    const h = Math.max(180, o.height || wrap.clientHeight || 420);
    if (Math.abs(w - W) < 1 && Math.abs(h - H) < 1 && canvas.width) return false;
    W = w;
    H = h;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    return true;
  }
  fit();
  let ro = null;
  if (window.ResizeObserver) {
    ro = new ResizeObserver(() => {
      if (fit()) draw();
    });
    ro.observe(wrap);
  }
  const mo = new MutationObserver(() => {
    cache = null;
    draw();
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- 投影 ---------- */

  let proj = null;
  function buildProjection() {
    const ca = Math.cos(az);
    const sa = Math.sin(az);
    const ce = Math.cos(el);
    const se = Math.sin(el);
    /* 场景归一化后的半径约 sqrt(1 + 1 + zScale²)，据此定基准缩放 */
    const base = Math.min(W, H) / (2 * Math.sqrt(2 + zScale * zScale) * 1.06);
    const S = base * zoom;
    const cx = W / 2;
    const cy = H / 2 + (H * 0.02);
    proj = { ca, sa, ce, se, S, cx, cy };
  }

  /** (u,v,w) 归一化坐标 → 屏幕；depth 越大离相机越远 */
  function project(u, v, w) {
    const p = projectUVW(u, v, w, az, el);
    return {
      sx: proj.cx + proj.S * p.rx,
      sy: proj.cy - proj.S * p.ry,
      depth: p.depth,
    };
  }

  /* ---------- 归一化 ---------- */

  let norm = null;
  function buildNorm() {
    if (!mesh) { norm = null; return; }
    const x0 = mesh.xs[0];
    const x1 = mesh.xs[mesh.nx];
    const y0 = mesh.ys[0];
    const y1 = mesh.ys[mesh.ny];
    const hx = Math.max((x1 - x0) / 2, 1e-9);
    const hy = Math.max((y1 - y0) / 2, 1e-9);
    const hz = Math.max((zhi - zlo) / 2, 1e-9);
    norm = {
      xc: (x0 + x1) / 2, yc: (y0 + y1) / 2, zc: (zlo + zhi) / 2,
      hx, hy, hz,
      /* 法线要按各方向的缩放比换算：w 对 u 的导数 = fz · (hx/hz) · zScale */
      kw: (hx / hz) * zScale,
      kwy: (hy / hz) * zScale,
    };
  }

  const toU = (x) => (x - norm.xc) / norm.hx;
  const toV = (y) => (y - norm.yc) / norm.hy;
  const toW = (z) => ((z - norm.zc) / norm.hz) * zScale;

  /* ---------- 绘制 ---------- */

  function drawBox(C) {
    /* 底面网格 + 四条竖边 + 顶面边框：给高度一个参照 */
    const { xs, ys, nx, ny } = mesh;
    const step = Math.max(1, Math.round(nx / 8));
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    const wlo = toW(zlo);
    ctx.beginPath();
    for (let i = 0; i <= nx; i += step) {
      const a = project(toU(xs[i]), toV(ys[0]), wlo);
      const b = project(toU(xs[i]), toV(ys[ny]), wlo);
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
    }
    for (let j = 0; j <= ny; j += step) {
      const a = project(toU(xs[0]), toV(ys[j]), wlo);
      const b = project(toU(xs[nx]), toV(ys[j]), wlo);
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
    }
    ctx.stroke();

    /* 四条竖边 + 顶框 */
    const corners = [[0, 0], [nx, 0], [nx, ny], [0, ny]];
    const pts = corners.map(([i, j]) => ({
      lo: project(toU(xs[i]), toV(ys[j]), wlo),
      hi: project(toU(xs[i]), toV(ys[j]), toW(zhi)),
    }));
    ctx.strokeStyle = C.axis;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    pts.forEach((p) => {
      ctx.moveTo(p.lo.sx, p.lo.sy);
      ctx.lineTo(p.hi.sx, p.hi.sy);
    });
    for (let k = 0; k < 4; k += 1) {
      const a = pts[k].hi;
      const b = pts[(k + 1) % 4].hi;
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /** 在底面四条边里挑最靠前的两条，分别标 x 与 y 的刻度 */
  function drawTicks(C) {
    const { xs, ys, nx, ny } = mesh;
    const wlo = toW(zlo);
    const edges = [
      { kind: 'y', pts: [[0, 0], [0, ny]], vals: ys },
      { kind: 'x', pts: [[0, 0], [nx, 0]], vals: xs },
      { kind: 'y', pts: [[nx, 0], [nx, ny]], vals: ys },
      { kind: 'x', pts: [[0, ny], [nx, ny]], vals: xs },
    ];
    /* 只画最靠前的两条（一条标 x、一条标 y） */
    const scored = edges.map((e) => {
      const mid = project(
        toU(xs[e.pts[0][0]]),
        toV(ys[e.pts[0][1]]),
        wlo,
      );
      return { e, depth: mid.depth };
    }).sort((a, b) => a.depth - b.depth);
    const picked = [];
    for (const s of scored) {
      if (picked.length >= 2) break;
      if (picked.some((p) => p.e.kind === s.e.kind)) continue;
      picked.push(s);
    }
    ctx.save();
    ctx.fillStyle = C.muted;
    ctx.font = '10px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    picked.forEach(({ e }) => {
      const ax = xs[e.pts[0][0]];
      const bx = xs[e.pts[1][0]];
      const ay = ys[e.pts[0][1]];
      const by = ys[e.pts[1][1]];
      const n = e.kind === 'x' ? nx : ny;
      /* 步长按各自方向的格数算——nx 与 ny 相同时无所谓，分开了也不至于一条挤一条疏 */
      const step = Math.max(1, Math.round(n / 4));
      for (let k = 0; k <= n; k += step) {
        const t = k / n;
        /* 沿这条边走：标 x 的边 y 固定、x 变，标 y 的边反过来 */
        const px = ax + (bx - ax) * t;
        const py = ay + (by - ay) * t;
        const label = e.kind === 'x' ? px : py;
        const wpt = project(toU(px), toV(py), wlo);
        ctx.fillText(shortNum(label), wpt.sx, wpt.sy + 11);
      }
    });

    /* z 轴刻度：画在最靠前的那条竖边上 */
    const corners = [[0, 0], [nx, 0], [nx, ny], [0, ny]];
    let best = null;
    corners.forEach(([i, j]) => {
      const p = project(toU(xs[i]), toV(ys[j]), wlo);
      if (!best || p.depth < best.depth) best = Object.assign({ i, j }, p);
    });
    [zlo, (zlo + zhi) / 2, zhi].forEach((zv) => {
      const p = project(toU(xs[best.i]), toV(ys[best.j]), toW(zv));
      ctx.textAlign = 'right';
      ctx.fillText(shortNum(zv), p.sx - 5, p.sy);
    });
    ctx.restore();
  }

  function shortNum(v) {
    if (!Number.isFinite(v)) return '—';
    if (Math.abs(v) >= 1e5 || (Math.abs(v) < 1e-3 && v !== 0)) return v.toExponential(1).replace('e+', 'e');
    if (Number.isInteger(v)) return String(v);
    const r = Math.round(v * 100) / 100;
    return String(r);
  }

  function drawSurface() {
    if (!mesh || !norm) return;
    const { xs, ys, z, nx, ny } = mesh;
    const stride = ny + 1;
    const step = Math.max(1, lod);

    /* 先算出所有需要的投影点，避免重复计算（同一格子的顶点会被邻居复用） */
    const pu = new Float32Array((nx + 1) * (ny + 1));
    const pv = new Float32Array((nx + 1) * (ny + 1));
    const pd = new Float32Array((nx + 1) * (ny + 1));
    for (let i = 0; i <= nx; i += 1) {
      const u = toU(xs[i]);
      for (let j = 0; j <= ny; j += 1) {
        const k = i * stride + j;
        const zv = z[k];
        if (!Number.isFinite(zv)) {
          pd[k] = NaN;
          continue;
        }
        const p = project(u, toV(ys[j]), toW(zv));
        pu[k] = p.sx;
        pv[k] = p.sy;
        pd[k] = p.depth;
      }
    }

    /* 收集面片：中心深度决定绘制顺序（画家算法，远的先画） */
    const quads = [];
    for (let i = 0; i + step <= nx; i += step) {
      for (let j = 0; j + step <= ny; j += step) {
        const k00 = i * stride + j;
        const k10 = (i + step) * stride + j;
        const k01 = i * stride + (j + step);
        const k11 = (i + step) * stride + (j + step);
        if (!Number.isFinite(pd[k00]) || !Number.isFinite(pd[k10]) ||
            !Number.isFinite(pd[k01]) || !Number.isFinite(pd[k11])) continue;
        const zc = (z[k00] + z[k10] + z[k01] + z[k11]) / 4;
        quads.push({
          k00, k10, k11, k01,
          depth: (pd[k00] + pd[k10] + pd[k01] + pd[k11]) / 4,
          zc,
          gi: i,
          gj: j,
        });
      }
    }
    quads.sort((a, b) => b.depth - a.depth);

    const span = Math.max(zhi - zlo, 1e-12);
    const C = themeColors();
    const L = LIGHTING[C.dark ? 'dark' : 'light'];
    for (let q = 0; q < quads.length; q += 1) {
      const f = quads[q];
      const { k00, k10, k11, k01, gi, gj } = f;
      /* 法线：偏导走 analyze.js 的中心差分（与别处共用一套算法），
         再乘 kw/kwy 把「原始单位的斜率」换算成「归一化空间的斜率」——
         不换算的话，xy 跨 20、z 只跨 1 的曲面会算出一条几乎垂直于地面的法线。 */
      let nz = 1;
      let nxv = 0;
      let nyv = 0;
      if (gi > 0 && gi < nx && gj > 0 && gj < ny) {
        const gr = A.gradient2(mesh, gi, gj);
        if (gr) {
          nxv = -gr.fx * norm.kw;
          nyv = -gr.fy * norm.kwy;
        }
      }
      const len = Math.hypot(nxv, nyv, nz) || 1;
      const light = Math.max(0, (nxv / len) * LIGHT[0] + (nyv / len) * LIGHT[1] + (nz / len) * LIGHT[2]);
      const shade = L.amb + L.dif * light;
      const tint = Math.min(1, Math.max(0, (f.zc - zlo) / span));
      const rgb = rampShade(tint, shade, L.gain);
      ctx.fillStyle = rgb;
      ctx.beginPath();
      ctx.moveTo(pu[k00], pv[k00]);
      ctx.lineTo(pu[k10], pv[k10]);
      ctx.lineTo(pu[k11], pv[k11]);
      ctx.lineTo(pu[k01], pv[k01]);
      ctx.closePath();
      ctx.fill();
      /* 同色描边：盖住相邻面片之间的白缝（Canvas 抗锯齿会留下细线） */
      ctx.strokeStyle = rgb;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    /* 网格线：只在降采样后的格线上画，间隔太大就看不见起伏了 */
    if (showWire && lod <= 1) {
      const wstep = Math.max(1, Math.round(nx / 10)) * step;
      ctx.save();
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      for (let i = 0; i <= nx; i += wstep) {
        for (let j = 0; j + step <= ny; j += step) {
          const a = i * stride + j;
          const b = i * stride + (j + step);
          if (!Number.isFinite(pd[a]) || !Number.isFinite(pd[b])) continue;
          ctx.moveTo(pu[a], pv[a]);
          ctx.lineTo(pu[b], pv[b]);
        }
      }
      for (let j = 0; j <= ny; j += wstep) {
        for (let i = 0; i + step <= nx; i += step) {
          const a = i * stride + j;
          const b = (i + step) * stride + j;
          if (!Number.isFinite(pd[a]) || !Number.isFinite(pd[b])) continue;
          ctx.moveTo(pu[a], pv[a]);
          ctx.lineTo(pu[b], pv[b]);
        }
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  /* 色带 × 明暗。量化成 64×32 档后缓存字符串——逐面片拼 rgb() 字符串
     在 2000 个格子的时候是实打实的一笔开销。 */
  function rampShade(t, shade, gain) {
    const ti = Math.round(Math.min(1, Math.max(0, t)) * 63);
    const si = Math.round(Math.min(2, Math.max(0, shade)) * 31);
    const key = ti * 4096 + si + (gain > 1 ? 1 << 20 : 0);
    let s = shadeCache.get(key);
    if (s) return s;
    const base = RAMP[Math.min(RAMP.length - 1, Math.round((ti / 63) * (RAMP.length - 1)))];
    const m = (si / 31) * gain;
    s = 'rgb(' + Math.round(Math.min(255, base[0] * m)) + ',' +
      Math.round(Math.min(255, base[1] * m)) + ',' +
      Math.round(Math.min(255, base[2] * m)) + ')';
    if (shadeCache.size < 8192) shadeCache.set(key, s);
    return s;
  }

  function drawMarks(C) {
    if (!marks.length || !norm) return;
    ctx.save();
    ctx.font = '11px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    marks.forEach((m) => {
      const p = project(toU(m.x), toV(m.y), toW(m.z));
      ctx.beginPath();
      ctx.fillStyle = m.color || C.fg;
      ctx.arc(p.sx, p.sy, 3.6, 0, Math.PI * 2);
      ctx.fill();
      if (m.label) {
        /* viridis 高端是亮黄，直接写浅色字会看不清——先垫一块底色再写字 */
        const tw = ctx.measureText(m.label).width;
        ctx.globalAlpha = 0.82;
        ctx.fillStyle = C.bg;
        ctx.beginPath();
        ctx.rect(p.sx - tw / 2 - 3, p.sy - 6 - 13, tw + 6, 14);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = C.fg;
        ctx.fillText(m.label, p.sx, p.sy - 6);
      }
    });
    ctx.restore();
  }

  /* 悬停探针：光标指到哪里，就从 z=0 平面竖一根虚线到曲面点。
     读数文字在工作区那边，这里只负责把「指在哪」画出来。 */
  function drawHover(C) {
    if (!hoverMark || !norm) return;
    const a = project(toU(hoverMark.x), toV(hoverMark.y), toW(0));
    const b = project(toU(hoverMark.x), toV(hoverMark.y), toW(hoverMark.z));
    ctx.save();
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.muted;
    ctx.beginPath();
    ctx.arc(a.sx, a.sy, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.fg;
    ctx.beginPath();
    ctx.arc(b.sx, b.sy, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.bg;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    if (!canvas.isConnected) return;
    const C = themeColors();
    buildProjection();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!mesh) return;
    if (showBox) drawBox(C);
    drawSurface();
    if (showBox) drawTicks(C);
    drawMarks(C);
    drawHover(C);
  }

  /* 拖动与悬停都高频发生（高刷鼠标每秒能发一百多个 move），
     直接每个事件重画一遍 1600 个面片是在白烧 CPU——rAF 合并成一帧一次。 */
  let rafId2 = 0;
  function requestDraw() {
    if (rafId2) return;
    rafId2 = requestAnimationFrame(() => {
      rafId2 = 0;
      draw();
    });
  }

  /* ---------- 交互 ---------- */

  function toLocal(ev) {
    const r = canvas.getBoundingClientRect();
    return { px: ev.clientX - r.left, py: ev.clientY - r.top };
  }

  /**
   * 反投影：求光标落在 z=0 平面上的 (x, y)。
   * projectUVW 的水平面部分是正交矩阵（R = u·ca − v·sa，T = u·sa + v·ca），
   * 逆变换就是转置：u = R·ca + T·sa，v = −R·sa + T·ca；T 从 ry 里把
   * z=0 平面的高度贡献扣掉后解出来。
   * 仰角压到接近 0（正平视）时 ry 与 u、v 无关，反解会除以零级别的爆炸，
   * 那时干脆不探——压着地平线本来就指不到曲面上。
   */
  function pick(px, py) {
    if (!mesh || !norm || !proj) return null;
    const se = proj.se;
    if (Math.abs(se) < 0.05) return null;
    const ce = proj.ce;
    const ca = proj.ca;
    const sa = proj.sa;
    const rx = (px - proj.cx) / proj.S;
    const ry = -(py - proj.cy) / proj.S;
    const w0 = toW(0);
    const T = (ry - w0 * ce) / se;
    const u = rx * ca + T * sa;
    const v = -rx * sa + T * ca;
    const x = u * norm.hx + norm.xc;
    const y = v * norm.hy + norm.yc;
    if (x < mesh.xs[0] || x > mesh.xs[mesh.nx] || y < mesh.ys[0] || y > mesh.ys[mesh.ny]) {
      return null;
    }
    return { x, y };
  }

  function updateHover(px, py) {
    let next = null;
    const h = pick(px, py);
    if (h && meshAt) {
      const z = meshAt(h.x, h.y);
      if (Number.isFinite(z)) next = { x: h.x, y: h.y, z };
    }
    /* 域外滑来滑去（next 与 hoverMark 都是 null）就不必每步重画 */
    if (!next && !hoverMark) return;
    hoverMark = next;
    requestDraw();
    cbHover.forEach((f) => f(next));
  }

  function clearHover() {
    if (!hoverMark) return;
    hoverMark = null;
    requestDraw();
    cbHover.forEach((f) => f(null));
  }

  let drag = null;
  canvas.addEventListener('pointerdown', (ev) => {
    const { px, py } = toLocal(ev);
    drag = { px, py, az, el };
    try { canvas.setPointerCapture(ev.pointerId); } catch (e) { void e; }
    canvas.classList.add('is-dragging');
    clearHover();
    /* 拖动时降精度：44×44 全画是 1900 多个面片，逐帧重画会掉帧 */
    if (lod === 1) {
      lod = 2;
      draw();
    }
  });
  canvas.addEventListener('pointermove', (ev) => {
    const { px, py } = toLocal(ev);
    if (drag) {
      az = drag.az - (px - drag.px) * 0.008;
      el = Math.min(Math.PI / 2, Math.max(-0.05, drag.el + (py - drag.py) * 0.006));
      requestDraw();
      return;
    }
    updateHover(px, py);
  });
  canvas.addEventListener('pointerleave', clearHover);
  const endDrag = () => {
    if (!drag) return;
    drag = null;
    canvas.classList.remove('is-dragging');
    lod = 1;
    draw();
    cbView.forEach((f) => f({ az, el, zoom }));
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    zoom = Math.min(6, Math.max(0.35, zoom * Math.exp((ev.deltaY > 0 ? 1 : -1) * 0.12)));
    draw();
    cbView.forEach((f) => f({ az, el, zoom }));
  }, { passive: false });

  canvas.addEventListener('dblclick', (ev) => {
    ev.preventDefault();
    az = -0.9;
    el = 0.52;
    zoom = 1;
    draw();
    cbView.forEach((f) => f({ az, el, zoom }));
  });

  return {
    el: wrap,
    canvas,
    draw,
    setData(d) {
      mesh = (d && d.mesh) || null;
      zlo = d && d.zlo !== undefined ? d.zlo : -1;
      zhi = d && d.zhi !== undefined ? d.zhi : 1;
      marks = (d && d.marks) || [];
      showWire = !d || d.wire !== false;
      showBox = !d || d.box !== false;
      /* 悬停求值由调用方给（surface 只管几何，不认识式子）；
         网格换了旧探针就作废 */
      meshAt = (d && d.at) || null;
      clearHover();
      buildNorm();
      draw();
    },
    /** 转到标准三视角：俯视、正视、等轴 */
    setAngles(a, e) {
      az = a;
      el = Math.max(-0.05, Math.min(Math.PI / 2, e));
      draw();
    },
    getAngles() { return { az, el, zoom }; },
    setZoom(z) { zoom = z; draw(); },
    setZScale(v) { zScale = v; buildNorm(); draw(); },
    get zScale() { return zScale; },
    onView(f) { cbView.push(f); },
    /** 悬停探针：回调收到 {x, y, z} 或 null（域外、算不出、正平视时） */
    onHover(f) { cbHover.push(f); },
    destroy() {
      if (ro) ro.disconnect();
      mo.disconnect();
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    },
  };
}
