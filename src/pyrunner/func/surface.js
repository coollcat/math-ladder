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

/** '#rrggbb' / '#rgb' / 'rgb(r,g,b)' → [r, g, b]；认不出就给一个中性蓝 */
function parseColor(c) {
  const s = String(c || '').trim();
  let m = /^#([0-9a-f]{6})$/i.exec(s);
  if (m) {
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(s);
  if (m) return [m[1], m[2], m[3]].map((h) => parseInt(h + h, 16));
  m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(s);
  if (m) return [+m[1], +m[2], +m[3]];
  return [70, 120, 190];
}

/** 统一成 X/Y/Z 三个数组：grid 把 xs、ys 铺开（布局 i*(ny+1)+j 与 analyze.grid2 一致） */
function prepObject(o) {
  if (!o || !o.type) return null;
  const ob = Object.assign({}, o);
  ob.rgb = parseColor(ob.color);
  if (ob.type === 'grid') {
    const m = ob.mesh;
    if (!m) return null;
    const stride = m.ny + 1;
    const size = (m.nx + 1) * stride;
    ob.X = new Float64Array(size);
    ob.Y = new Float64Array(size);
    for (let i = 0; i <= m.nx; i += 1) {
      for (let j = 0; j <= m.ny; j += 1) {
        ob.X[i * stride + j] = m.xs[i];
        ob.Y[i * stride + j] = m.ys[j];
      }
    }
    ob.Z = m.z;
    ob.nu = m.nx;
    ob.nv = m.ny;
    return ob;
  }
  if (!ob.X || !ob.Y || !ob.Z) return null;
  if (ob.type === 'curve') {
    ob.n = ob.n || ob.X.length - 1;
    return ob;
  }
  if (ob.type === 'param') return ob;
  return null;
}

/** 全部对象有限值的包围盒；一个有限点都没有返回 null */
function sceneBox(objs) {
  const b = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, z0: Infinity, z1: -Infinity };
  objs.forEach((ob) => {
    for (let k = 0; k < ob.X.length; k += 1) {
      const x = ob.X[k];
      const y = ob.Y[k];
      const z = ob.Z[k];
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
      if (x < b.x0) b.x0 = x;
      if (x > b.x1) b.x1 = x;
      if (y < b.y0) b.y0 = y;
      if (y > b.y1) b.y1 = y;
      if (z < b.z0) b.z0 = z;
      if (z > b.z1) b.z1 = z;
    }
  });
  return b.x0 <= b.x1 ? b : null;
}

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
  let ctx = canvas.getContext('2d');

  /* 曲面本体与视角有关，但与悬停探针无关。把本体画到离屏画布缓存，
     悬停时只把缓存贴回来再补探针，避免每帧重排 1600 个面片。 */
  let baseCanvas = null;
  let baseCtx = null;
  let baseDirty = true;
  function markBaseDirty() { baseDirty = true; }

  /* 视角：方位角、仰角、缩放。zScale 是高度夸张倍数 */
  let az = o.az === undefined ? -0.9 : o.az;
  let el = o.el === undefined ? 0.52 : o.el;
  let zoom = 1;
  let zScale = o.zScale === undefined ? 0.6 : o.zScale;

  /* 场景里的对象（2026-10 起不止一张 z = f(x,y)）：
       grid   z = f(x, y) 的规则网格（mesh = {xs, ys, z, nx, ny}）
       param  参数曲面：X/Y/Z 三张 (nu+1)×(nv+1) 网格，索引 i*(nv+1)+j（球坐标也折成它）
       curve  空间折线：X/Y/Z 各 n+1 个点
     所有面片与线段放进同一张表按深度排序，于是曲线绕到曲面背后会被正确挡住。 */
  let objects = [];
  let mesh = null;      /* 第一张 grid 的网格：悬停反投影（指到 xy 平面）只对它有意义 */
  let bounds = null;    /* {x0, x1, y0, y1}：参照框与刻度用 */
  let equal = false;    /* 三轴同比例：参数曲面 / 空间曲线要按真实形状画（球要像球） */
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
    baseDirty = true;
    return true;
  }
  fit();
  let ro = null;
  if (window.ResizeObserver) {
    ro = new ResizeObserver(() => {
      if (fit()) {
        dropRect();
        draw();
      }
    });
    ro.observe(wrap);
  }
  const mo = new MutationObserver(() => {
    cache = null;
    markBaseDirty();
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
    /* 场景归一化后的半径约 sqrt(1 + 1 + zk²)，据此定基准缩放（zk 是实际的高度系数） */
    const zk = norm ? norm.zk : zScale;
    const base = Math.min(W, H) / (2 * Math.sqrt(2 + zk * zk) * 1.06);
    const S = base * zoom;
    const cx = W / 2;
    const cy = H / 2 + (H * 0.02);
    /* 视角一变，缓存的本体就作废。此前只有松手 / setAngles 才标脏，
       拖动旋转、滚轮缩放的过程中画面纹丝不动，松手才「跳」到新视角 */
    const key = az + '|' + el + '|' + S + '|' + W + '|' + H;
    if (!proj || proj.key !== key) baseDirty = true;
    proj = { ca, sa, ce, se, S, cx, cy, key };
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
  /* 两种归一：
       曲面 z = f(x,y)：x、y 各按半宽，z 单独按半高 × zScale（起伏常比 xy 小一个量级）；
       equal（参数曲面 / 空间曲线）：三轴共用最大的那个半宽，zScale 换算成相对默认值 0.6 的倍数，
       默认就是真实比例——球是圆的、螺线的螺距不被拉伸。 */
  function buildNorm() {
    if (!bounds) { norm = null; return; }
    const { x0, x1, y0, y1 } = bounds;
    let hx = Math.max((x1 - x0) / 2, 1e-9);
    let hy = Math.max((y1 - y0) / 2, 1e-9);
    let hz = Math.max((zhi - zlo) / 2, 1e-9);
    let zk = zScale;
    if (equal) {
      const h = Math.max(hx, hy, hz);
      hx = h;
      hy = h;
      hz = h;
      zk = zScale / 0.6;
    }
    norm = {
      xc: (x0 + x1) / 2, yc: (y0 + y1) / 2, zc: (zlo + zhi) / 2,
      hx, hy, hz, zk,
    };
  }

  const toU = (x) => (x - norm.xc) / norm.hx;
  const toV = (y) => (y - norm.yc) / norm.hy;
  const toW = (z) => ((z - norm.zc) / norm.hz) * norm.zk;

  /* ---------- 绘制 ---------- */

  function drawBox(C) {
    /* 底面网格 + 四条竖边 + 顶面边框：给高度一个参照（按包围盒画，不依赖网格） */
    const { x0, x1, y0, y1 } = bounds;
    const N = 8;
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    const wlo = toW(zlo);
    ctx.beginPath();
    for (let k = 0; k <= N; k += 1) {
      const x = x0 + ((x1 - x0) * k) / N;
      const a = project(toU(x), toV(y0), wlo);
      const b = project(toU(x), toV(y1), wlo);
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
    }
    for (let k = 0; k <= N; k += 1) {
      const y = y0 + ((y1 - y0) * k) / N;
      const a = project(toU(x0), toV(y), wlo);
      const b = project(toU(x1), toV(y), wlo);
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
    }
    ctx.stroke();

    /* 四条竖边 + 顶框 */
    const corners = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    const pts = corners.map(([x, y]) => ({
      lo: project(toU(x), toV(y), wlo),
      hi: project(toU(x), toV(y), toW(zhi)),
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
    const { x0, x1, y0, y1 } = bounds;
    const wlo = toW(zlo);
    const edges = [
      { kind: 'y', pts: [[x0, y0], [x0, y1]] },
      { kind: 'x', pts: [[x0, y0], [x1, y0]] },
      { kind: 'y', pts: [[x1, y0], [x1, y1]] },
      { kind: 'x', pts: [[x0, y1], [x1, y1]] },
    ];
    /* 只画最靠前的两条（一条标 x、一条标 y）。按边的中点比深度 */
    const scored = edges.map((e) => {
      const mid = project(
        toU((e.pts[0][0] + e.pts[1][0]) / 2),
        toV((e.pts[0][1] + e.pts[1][1]) / 2),
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
      const ax = e.pts[0][0];
      const bx = e.pts[1][0];
      const ay = e.pts[0][1];
      const by = e.pts[1][1];
      /* 每条边五个刻度（两端 + 四等分点）：对称的域正好落在 -d, -d/2, 0, d/2, d */
      for (let k = 0; k <= 4; k += 1) {
        const t = k / 4;
        /* 沿这条边走：标 x 的边 y 固定、x 变，标 y 的边反过来 */
        const px = ax + (bx - ax) * t;
        const py = ay + (by - ay) * t;
        const label = e.kind === 'x' ? px : py;
        const wpt = project(toU(px), toV(py), wlo);
        ctx.fillText(shortNum(label), wpt.sx, wpt.sy + 11);
      }
    });

    /* z 轴刻度：画在最靠前的那条竖边上 */
    const corners = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    let best = null;
    corners.forEach(([x, y]) => {
      const p = project(toU(x), toV(y), wlo);
      if (!best || p.depth < best.depth) best = Object.assign({ x, y }, p);
    });
    [zlo, (zlo + zhi) / 2, zhi].forEach((zv) => {
      const p = project(toU(best.x), toV(best.y), toW(zv));
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

  /** 把一个对象的全部顶点投影一遍：屏幕坐标 sx/sy、深度 d，以及归一化坐标 U/V/W（算法线用） */
  function projectObject(ob) {
    const n = ob.X.length;
    if (!ob.P || ob.P.sx.length !== n) {
      ob.P = {
        sx: new Float32Array(n), sy: new Float32Array(n), d: new Float32Array(n),
        U: new Float32Array(n), V: new Float32Array(n), W: new Float32Array(n),
      };
    }
    const P = ob.P;
    for (let k = 0; k < n; k += 1) {
      const x = ob.X[k];
      const y = ob.Y[k];
      const z = ob.Z[k];
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
        P.d[k] = NaN;
        continue;
      }
      const u = toU(x);
      const v = toV(y);
      const w = toW(z);
      const p = project(u, v, w);
      P.sx[k] = p.sx;
      P.sy[k] = p.sy;
      P.d[k] = p.depth;
      P.U[k] = u;
      P.V[k] = v;
      P.W[k] = w;
    }
    return P;
  }

  /**
   * 整个场景一次画完：所有对象的面片与线段进同一张表，按深度从远到近画（画家算法）。
   * 法线一律用两条对角线的叉积，在归一化空间里算——z = f(x,y) 与参数曲面同一套，
   * 并且「高度夸张」改了以后明暗自动跟着变。参数曲面没有固定的「上面」，取双面光照。
   *
   * 网格线跟着面片一起画，而不是最后整张叠上去：后者会把被挡住的那半边网格也透出来。
   * 相邻两格共用的那条边只由**后画的那一格**描（ord 记录每格的绘制次序），
   * 否则后画的格子用同色描边盖缝时会把先画的网格线吃掉一半，线就时粗时细。
   */
  function drawScene() {
    if (!objects.length || !norm) return;
    const C = themeColors();
    const L = LIGHTING[C.dark ? 'dark' : 'light'];
    const step = Math.max(1, lod);
    const span = Math.max(zhi - zlo, 1e-12);
    const prims = [];
    objects.forEach((ob, oi) => {
      const P = projectObject(ob);
      const d = P.d;
      if (ob.type === 'curve') {
        for (let i = 0; i + step <= ob.n; i += step) {
          const a = i;
          const b = i + step;
          if (!Number.isFinite(d[a]) || !Number.isFinite(d[b])) continue;
          /* 跨过无穷远（tan 一类）的一步：归一化空间里一跳超过半个盒子就断开 */
          if (Math.hypot(P.U[b] - P.U[a], P.V[b] - P.V[a], P.W[b] - P.W[a]) > 0.9) continue;
          /* 深度略往前挪：曲线常常就躺在曲面上，不挪的话会和面片抢同一层深度、被吃成虚线 */
          prims.push({ t: 1, o: oi, a, b, d: (d[a] + d[b]) / 2 - 0.015 });
        }
        return;
      }
      const stride = ob.nv + 1;
      for (let i = 0; i + step <= ob.nu; i += step) {
        for (let j = 0; j + step <= ob.nv; j += step) {
          const k00 = i * stride + j;
          const k10 = (i + step) * stride + j;
          const k01 = i * stride + (j + step);
          const k11 = (i + step) * stride + (j + step);
          if (!Number.isFinite(d[k00]) || !Number.isFinite(d[k10]) ||
              !Number.isFinite(d[k01]) || !Number.isFinite(d[k11])) continue;
          prims.push({ t: 0, o: oi, k00, k10, k11, k01, i, j, d: (d[k00] + d[k10] + d[k01] + d[k11]) / 4 });
        }
      }
    });
    prims.sort((a, b) => b.d - a.d);

    const wire = showWire && lod <= 1;
    /* 每格的绘制次序（只在画网格线时需要） */
    if (wire) {
      objects.forEach((ob) => {
        if (ob.type === 'curve') return;
        const size = ob.nu * ob.nv;
        if (!ob.ord || ob.ord.length !== size) ob.ord = new Int32Array(size);
        ob.ord.fill(-1);
      });
      prims.forEach((p, q) => {
        if (p.t === 0) objects[p.o].ord[p.i * objects[p.o].nv + p.j] = q;
      });
    }
    const wireColor = C.dark ? 'rgba(0,0,0,0.34)' : 'rgba(0,0,0,0.22)';

    for (let q = 0; q < prims.length; q += 1) {
      const p = prims[q];
      const ob = objects[p.o];
      const P = ob.P;
      if (p.t === 1) {
        ctx.strokeStyle = ob.color || C.fg;
        ctx.lineWidth = ob.width || 2.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(P.sx[p.a], P.sy[p.a]);
        ctx.lineTo(P.sx[p.b], P.sy[p.b]);
        ctx.stroke();
        continue;
      }
      const { k00, k10, k11, k01 } = p;
      /* 法线 = (P11 − P00) × (P01 − P10) */
      const ax = P.U[k11] - P.U[k00];
      const ay = P.V[k11] - P.V[k00];
      const az2 = P.W[k11] - P.W[k00];
      const bx = P.U[k01] - P.U[k10];
      const by = P.V[k01] - P.V[k10];
      const bz = P.W[k01] - P.W[k10];
      let nx = ay * bz - az2 * by;
      let ny = az2 * bx - ax * bz;
      let nz = ax * by - ay * bx;
      const len = Math.hypot(nx, ny, nz);
      let light = 0.6;
      if (len > 0) {
        nx /= len; ny /= len; nz /= len;
        const dot = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
        /* z = f(x,y) 的法线一律朝上（nz > 0），参数曲面双面受光 */
        light = ob.type === 'grid' ? Math.max(0, nz < 0 ? -dot : dot) : Math.abs(dot);
      }
      const shade = L.amb + L.dif * light;
      let rgb;
      if (ob.ramp) {
        const zc = (ob.Z[k00] + ob.Z[k10] + ob.Z[k01] + ob.Z[k11]) / 4;
        rgb = rampShade(Math.min(1, Math.max(0, (zc - zlo) / span)), shade, L.gain);
      } else {
        rgb = solidShade(ob.rgb, shade, L.gain);
      }
      ctx.fillStyle = rgb;
      ctx.beginPath();
      ctx.moveTo(P.sx[k00], P.sy[k00]);
      ctx.lineTo(P.sx[k10], P.sy[k10]);
      ctx.lineTo(P.sx[k11], P.sy[k11]);
      ctx.lineTo(P.sx[k01], P.sy[k01]);
      ctx.closePath();
      if (ob.alpha && ob.alpha < 1) ctx.globalAlpha = ob.alpha;
      ctx.fill();
      /* 同色描边：盖住相邻面片之间的白缝（Canvas 抗锯齿会留下细线） */
      ctx.strokeStyle = rgb;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;

      if (wire) {
        const { i, j } = p;
        const nu = ob.nu;
        const nv = ob.nv;
        const wi = Math.max(1, Math.round(nu / 10));
        const wj = Math.max(1, Math.round(nv / 10));
        const ord = ob.ord;
        const later = (ni, nj) => ni < 0 || nj < 0 || ni >= nu || nj >= nv || ord[ni * nv + nj] < q;
        ctx.strokeStyle = wireColor;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        if (i % wi === 0 && later(i - 1, j)) { ctx.moveTo(P.sx[k00], P.sy[k00]); ctx.lineTo(P.sx[k01], P.sy[k01]); }
        if ((i + 1) % wi === 0 && later(i + 1, j)) { ctx.moveTo(P.sx[k10], P.sy[k10]); ctx.lineTo(P.sx[k11], P.sy[k11]); }
        if (j % wj === 0 && later(i, j - 1)) { ctx.moveTo(P.sx[k00], P.sy[k00]); ctx.lineTo(P.sx[k10], P.sy[k10]); }
        if ((j + 1) % wj === 0 && later(i, j + 1)) { ctx.moveTo(P.sx[k01], P.sy[k01]); ctx.lineTo(P.sx[k11], P.sy[k11]); }
        ctx.stroke();
      }
    }
  }

  /* 纯色 × 明暗（第二个起的曲面用曲线色，不用色带，叠在一起才分得清谁是谁） */
  function solidShade(c, shade, gain) {
    const m = Math.min(1.35, shade * (gain > 1 ? 1.1 : 1));
    return 'rgb(' + Math.round(Math.min(255, c[0] * m)) + ',' +
      Math.round(Math.min(255, c[1] * m)) + ',' +
      Math.round(Math.min(255, c[2] * m)) + ')';
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
    /* z = f(x,y) 从 z=0 平面竖上去；参数曲面 / 曲线上的点从参照框底面竖上去 */
    const a = project(toU(hoverMark.x), toV(hoverMark.y), toW(hoverMark.floor === undefined ? 0 : hoverMark.floor));
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

  function ensureBase(C) {
    if (!baseCanvas) {
      baseCanvas = document.createElement('canvas');
      baseCtx = baseCanvas.getContext('2d');
    }
    if (baseCanvas.width !== canvas.width || baseCanvas.height !== canvas.height) {
      baseCanvas.width = canvas.width;
      baseCanvas.height = canvas.height;
      baseDirty = true;
    }
    if (!baseDirty) return;

    const mainCtx = ctx;
    ctx = baseCtx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!objects.length || !bounds || !norm) {
      ctx = mainCtx;
      baseDirty = false;
      return;
    }
    if (showBox) drawBox(C);
    drawScene();
    if (showBox) drawTicks(C);
    drawMarks(C);
    ctx = mainCtx;
    baseDirty = false;
  }

  function draw() {
    if (!canvas.isConnected) return;
    const C = themeColors();
    buildProjection();
    ensureBase(C);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(baseCanvas, 0, 0, W, H);
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

  /* 位置缓存：getBoundingClientRect 会强制同步布局，挂在每次 pointermove
     上就是布局抖动。画布位置只在滚动或改尺寸时动，缓存起来，
     拖动开始时再刷一次。 */
  let rectCache = null;
  const dropRect = () => { rectCache = null; };
  const ac = new AbortController();
  const opt = { signal: ac.signal };
  window.addEventListener('scroll', dropRect, Object.assign({ passive: true }, opt));

  function toLocal(ev) {
    const r = rectCache || (rectCache = canvas.getBoundingClientRect());
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

  /**
   * 参数曲面 / 空间曲线的悬停：没有「xy 平面上的一点对应唯一高度」可言，
   * 就找屏幕上离光标最近的顶点（12px 内），重叠时取离相机近的那个。
   * 投影坐标直接用上一次画本体时算好的（本体脏了说明视角刚变，这一下先不探）。
   */
  function pickVertex(px, py) {
    if (baseDirty || !norm) return null;
    let best = null;
    const R2 = 144;
    objects.forEach((ob, oi) => {
      if (ob.type === 'grid' || !ob.P) return;
      const P = ob.P;
      for (let k = 0; k < P.d.length; k += 1) {
        if (!Number.isFinite(P.d[k])) continue;
        const dx = P.sx[k] - px;
        const dy = P.sy[k] - py;
        const r2 = dx * dx + dy * dy;
        if (r2 > R2) continue;
        /* 先比深度（前面的挡住后面的），深度差不多再比距离 */
        const score = P.d[k] * 40 + r2 / R2;
        if (!best || score < best.score) best = { score, oi, k };
      }
    });
    if (!best) return null;
    const ob = objects[best.oi];
    const k = best.k;
    const h = { x: ob.X[k], y: ob.Y[k], z: ob.Z[k], floor: zlo, obj: best.oi, label: ob.label || '' };
    if (ob.type === 'curve') {
      if (ob.ts) h.t = ob.ts[k];
    } else {
      const i = Math.floor(k / (ob.nv + 1));
      const j = k % (ob.nv + 1);
      if (ob.us) h.u = ob.us[i];
      if (ob.vs) h.v = ob.vs[j];
    }
    return h;
  }

  function updateHover(px, py) {
    let next = null;
    const h = pick(px, py);
    if (h && meshAt) {
      const z = meshAt(h.x, h.y);
      if (Number.isFinite(z)) next = { x: h.x, y: h.y, z };
    }
    if (!next && objects.some((ob) => ob.type !== 'grid')) next = pickVertex(px, py);
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
    dropRect(); /* 可能刚滚过页，位置缓存作废旧值 */
    const { px, py } = toLocal(ev);
    drag = { px, py, az, el };
    try { canvas.setPointerCapture(ev.pointerId); } catch (e) { void e; }
    canvas.classList.add('is-dragging');
    clearHover();
    /* 拖动时降精度：44×44 全画是 1900 多个面片，逐帧重画会掉帧 */
    if (lod === 1) {
      lod = 2;
      markBaseDirty();
      draw();
    }
  }, opt);
  canvas.addEventListener('pointermove', (ev) => {
    const { px, py } = toLocal(ev);
    if (drag) {
      az = drag.az - (px - drag.px) * 0.008;
      el = Math.min(Math.PI / 2, Math.max(-0.05, drag.el + (py - drag.py) * 0.006));
      requestDraw();
      return;
    }
    updateHover(px, py);
  }, opt);
  canvas.addEventListener('pointerleave', clearHover, opt);
  const endDrag = () => {
    if (!drag) return;
    drag = null;
    canvas.classList.remove('is-dragging');
    lod = 1;
    markBaseDirty();
    draw();
    cbView.forEach((f) => f({ az, el, zoom }));
  };
  canvas.addEventListener('pointerup', endDrag, opt);
  canvas.addEventListener('pointercancel', endDrag, opt);

  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    zoom = Math.min(6, Math.max(0.35, zoom * Math.exp((ev.deltaY > 0 ? 1 : -1) * 0.12)));
    /* 滚轮也能连发一串，同样合并到帧里，别每次都重画 1900 个面片 */
    requestDraw();
    cbView.forEach((f) => f({ az, el, zoom }));
  }, Object.assign({ passive: false }, opt));

  canvas.addEventListener('dblclick', (ev) => {
    ev.preventDefault();
    az = -0.9;
    el = 0.52;
    zoom = 1;
    draw();
    cbView.forEach((f) => f({ az, el, zoom }));
  }, opt);

  return {
    el: wrap,
    canvas,
    draw,
    /**
     * d.mesh     z = f(x,y) 的网格（旧接口，等价于 objects 里第一个 grid）
     * d.objects  [{type:'grid', mesh} | {type:'param', X,Y,Z,nu,nv, us,vs} | {type:'curve', X,Y,Z,n, ts}]
     *            每个还可带 color（'#rrggbb'）、ramp（按高度上色带）、label、width、alpha
     * d.bounds   {x0,x1,y0,y1}；不给就按 grid 网格的 xy 或全部对象的有限值包围盒
     * d.zlo/zhi  高度范围；不给就按全部对象 Z 的有限值
     * d.equal    三轴同比例
     */
    setData(d) {
      const dd = d || {};
      const list = [];
      if (dd.mesh) list.push({ type: 'grid', mesh: dd.mesh, ramp: true });
      (dd.objects || []).forEach((x) => { if (x) list.push(x); });
      objects = list.map(prepObject).filter(Boolean);
      const g = objects.find((x) => x.type === 'grid');
      mesh = g ? g.mesh : null;
      const box = sceneBox(objects);
      zlo = dd.zlo !== undefined ? dd.zlo : (box ? box.z0 : -1);
      zhi = dd.zhi !== undefined ? dd.zhi : (box ? box.z1 : 1);
      if (!(zhi > zlo)) {
        const c = Number.isFinite(zlo) ? zlo : 0;
        zlo = c - 1;
        zhi = c + 1;
      }
      if (dd.bounds) bounds = dd.bounds;
      else if (mesh) bounds = { x0: mesh.xs[0], x1: mesh.xs[mesh.nx], y0: mesh.ys[0], y1: mesh.ys[mesh.ny] };
      else bounds = box ? { x0: box.x0, x1: box.x1, y0: box.y0, y1: box.y1 } : null;
      if (bounds) {
        /* 退化成一条线（如 x 恒为 0 的曲线）时撑开一点，别除以零 */
        const padTo = (a, b) => (b - a > 1e-9 ? [a, b] : [a - 1, b + 1]);
        const [x0, x1] = padTo(bounds.x0, bounds.x1);
        const [y0, y1] = padTo(bounds.y0, bounds.y1);
        bounds = { x0, x1, y0, y1 };
      }
      equal = !!dd.equal;
      marks = dd.marks || [];
      showWire = dd.wire !== false;
      showBox = dd.box !== false;
      /* 悬停求值由调用方给（surface 只管几何，不认识式子）；
         网格换了旧探针就作废 */
      meshAt = dd.at || null;
      markBaseDirty();
      clearHover();
      buildNorm();
      draw();
    },
    /** 转到标准三视角：俯视、正视、等轴 */
    setAngles(a, e) {
      az = a;
      el = Math.max(-0.05, Math.min(Math.PI / 2, e));
      markBaseDirty();
      draw();
    },
    getAngles() { return { az, el, zoom }; },
    setZoom(z) { zoom = z; markBaseDirty(); draw(); },
    setZScale(v) { zScale = v; buildNorm(); markBaseDirty(); draw(); },
    get zScale() { return zScale; },
    onView(f) { cbView.push(f); },
    /** 悬停探针：回调收到 {x, y, z} 或 null（域外、算不出、正平视时） */
    onHover(f) { cbHover.push(f); },
    destroy() {
      ac.abort(); /* 一次摘掉 canvas 上的全部监听器与 window 的滚动失效 */
      if (rafId2) { cancelAnimationFrame(rafId2); rafId2 = 0; }
      if (ro) ro.disconnect();
      mo.disconnect();
      baseCanvas = null;
      baseCtx = null;
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    },
  };
}
