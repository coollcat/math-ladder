/* =========================================================================
 * 式子的「形态」—— 一个输入框里能写下的不只是 y = f(x)
 * -------------------------------------------------------------------------
 * expr.js 只认一条算式；这一层在它前面先看「整句话长什么样」，再决定
 * 把哪几段交给 expr.js、用什么自变量编译、最后怎么采样：
 *
 *   平面（2D）
 *     fx        sin(x)/x、y = x^2、f(x) = …         自变量 x（y 仍是参数，坑 8）
 *     polar     r = 1 + cos(θ)                       自变量 θ（theta / θ 都认）
 *     param2    (cos(t), sin(t))                     自变量 t，带 t 的取值范围
 *     implicit  x^2 + y^2 = 4、x = sin(y)            F(x,y) = 左 − 右，描 F = 0
 *   立体（3D）
 *     fxy       x*y、z = x^2 - y^2                    自变量 x, y
 *     psurf     (cos u sin v, sin u sin v, cos v)     自变量 u, v（参数曲面）
 *     curve3    (cos t, sin t, t/5)                   自变量 t（空间曲线）
 *     sph       r = 1 + 0.3 sin(3θ)                   球坐标 r = f(θ, φ)
 *
 * 判别只看「句子结构」：有没有等号、等号左边是什么、是不是一个带逗号的元组。
 * 这样同一个输入框就够了，不需要让人先去选「我要画哪一类」。
 *
 * 球坐标沿用国内高数教材（同济版）的口径：θ 是方位角（绕 z 轴，0..2π），
 * φ 是与 z 轴正向的夹角（0..π）：x = r sinφ cosθ, y = r sinφ sinθ, z = r cosφ。
 * ========================================================================= */

import { build } from './expr.js';
import { texToText, isLatex } from './latex.js';

/* 希腊字母的几种写法：都当同一个自变量 */
const THETA = ['theta', 'θ', 'vartheta', 'ϑ'];
const PHI = ['phi', 'φ', 'varphi', 'ϕ'];

/**
 * 每种形态的元数据。
 *   groups  自变量分组：同一组里的名字是同一个量的不同写法（θ 与 theta）
 *   ranges  需要取值范围的参数：[键, 显示名, 默认下界, 默认上界]
 *   args    导出到 Python 时的形参名
 */
export const KINDS = {
  fx: { mode: '2d', label: '函数', groups: [['x']], args: ['x'] },
  polar: {
    mode: '2d', label: '极坐标', groups: [THETA], args: ['theta'],
    ranges: [['theta', 'θ', '0', '2π']],
  },
  param2: {
    mode: '2d', label: '参数曲线', groups: [['t']], args: ['t'],
    ranges: [['t', 't', '0', '2π']],
  },
  implicit: { mode: '2d', label: '隐函数', groups: [['x'], ['y']], args: ['x', 'y'] },
  fxy: { mode: '3d', label: '曲面', groups: [['x'], ['y']], args: ['x', 'y'] },
  psurf: {
    mode: '3d', label: '参数曲面', groups: [['u'], ['v']], args: ['u', 'v'],
    ranges: [['u', 'u', '0', '2π'], ['v', 'v', '0', '2π']],
  },
  curve3: {
    mode: '3d', label: '空间曲线', groups: [['t']], args: ['t'],
    ranges: [['t', 't', '0', '4π']],
  },
  sph: {
    mode: '3d', label: '球坐标', groups: [THETA, PHI], args: ['theta', 'phi'],
    ranges: [['theta', 'θ', '0', '2π'], ['phi', 'φ', '0', 'π']],
  },
};

/** 这种形态是不是「真函数」y = f(x)：只有它有零点、极值、导数、面积可言 */
export function isGraphKind(kind) {
  return kind === 'fx' || kind === 'py';
}

/* ---------- 文本层面的小工具 ---------- */

/** 在最外层（不在任何括号里）按 sep 切分 */
export function splitTop(s, sep) {
  const out = [];
  let depth = 0;
  let last = 0;
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (c === '(' || c === '[' || c === '{') depth += 1;
    else if (c === ')' || c === ']' || c === '}') depth -= 1;
    else if (depth === 0 && c === sep) {
      out.push(s.slice(last, i));
      last = i + 1;
    }
  }
  out.push(s.slice(last));
  return out;
}

/** "(a, b, c)" → ['a','b','c']；不是整体被一对括号包住的元组就返回 null */
export function tupleParts(text) {
  const s = text.trim();
  if (!s || (s[0] !== '(' && s[0] !== '[')) return null;
  let depth = 0;
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (c === '(' || c === '[' || c === '{') depth += 1;
    else if (c === ')' || c === ']' || c === '}') {
      depth -= 1;
      if (depth === 0 && i !== s.length - 1) return null;
    }
  }
  if (depth !== 0) return null;
  const parts = splitTop(s.slice(1, -1), ',');
  return parts.length >= 2 ? parts.map((p) => p.trim()) : null;
}

/**
 * 从 Python / 计算器里粘过来的写法折算成本站算式：
 *   x**2 → x^2；np.sin → sin；np.log（自然对数）→ ln；np.arctan2 → atan2；np.power → pow
 * 注意 log 的口径：numpy/math 的 log 是自然对数，本站单参 log 是常用对数（见 expr.js 文件头），
 * 所以带 np./math. 前缀的 log 必须改成 ln，不能只把前缀剥掉。
 */
export function normalizeText(s) {
  return String(s)
    .replace(/\*\*/g, '^')
    .replace(/\b(?:np|numpy|math|sp|sympy)\.log\s*\(/g, 'ln(')
    .replace(/\b(?:np|numpy|math|sp|sympy)\./g, '')
    .replace(/\barctan2\s*\(/g, 'atan2(')
    .replace(/\bpower\s*\(/g, 'pow(')
    .replace(/==/g, '=');
}

function toPlain(side) {
  const s = side.trim();
  if (!s) throw new Error('等号有一边是空的');
  return normalizeText(isLatex(s) ? texToText(s) : s);
}

/* ---------- AST 小工具 ---------- */

function walkAst(node, fn) {
  if (!node) return;
  fn(node);
  if (node.a) walkAst(node.a, fn);
  if (node.b) walkAst(node.b, fn);
  if (node.args) node.args.forEach((x) => walkAst(x, fn));
}

function usesVars(compiled, names) {
  let hit = false;
  walkAst(compiled.ast, (n) => {
    if (n.k === 'var' && !n.isParam && names.indexOf(n.name) >= 0) hit = true;
  });
  return hit;
}

/* ---------- 编译 ---------- */

function flatVars(kind) {
  return KINDS[kind].groups.reduce((acc, g) => acc.concat(g), []);
}

function compileComp(text, kind) {
  return build(text, { vars: flatVars(kind) });
}

/**
 * 编译结果 → 求值闭包。别名组里的每个名字都喂同一个值，
 * 于是用户写 θ 还是 theta 都对。长度 1、2 的情形单独写开，免得每次求值都展开数组。
 */
export function evaluator(compiled, kind, P) {
  const groups = KINDS[kind] ? KINDS[kind].groups : [['x']];
  const idx = compiled.vars.map((v) => groups.findIndex((g) => g.indexOf(v) >= 0));
  const fn = compiled.fn;
  const safe = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : NaN);
  if (idx.length === 1) {
    return (a) => {
      try { return safe(fn(P, a)); } catch (e) { void e; return NaN; }
    };
  }
  if (idx.length === 2 && idx[0] === 0 && idx[1] === 1) {
    return (a, b) => {
      try { return safe(fn(P, a, b)); } catch (e) { void e; return NaN; }
    };
  }
  return (a, b) => {
    const args = idx.map((g) => (g === 1 ? b : a));
    try { return safe(fn(P, ...args)); } catch (e) { void e; return NaN; }
  };
}

function unionParams(comps) {
  const set = new Set();
  comps.forEach((c) => c.params.forEach((p) => set.add(p)));
  return Array.from(set).sort();
}

function tuple(texs) {
  return '\\left(' + texs.join(',\\ ') + '\\right)';
}

function makeForm(kind, comps, extra) {
  const tex = extra && extra.tex !== undefined ? extra.tex : comps[0].tex;
  return Object.assign({
    kind,
    comps,
    params: unionParams(comps),
    tex,
    displayTex: tex,
  }, extra || {});
}

const LHS_FX = /^(?:y|[A-Za-z]\w*\(x\))$/;
const LHS_FXY = /^(?:z|[A-Za-z]\w*\(x,y\))$/;
const LHS_R2 = /^(?:r|r\((?:θ|theta|ϑ|vartheta)\))$/;
const LHS_R3 = /^(?:r|r\((?:θ|theta),(?:φ|phi|varphi|ϕ)\))$/;

/**
 * 主入口：一整句 → 形态 + 编译好的分量。失败抛带中文说明的 Error。
 * mode 决定按平面还是立体的规则读（同一句 r = … 在两边意思不同）。
 */
export function compileForm(raw, mode) {
  const src = String(raw || '').trim().replace(/==/g, '=');
  if (!src) return null;
  const d3 = mode === '3d';
  const eq = splitTop(src, '=');
  if (eq.length > 2) throw new Error('一个式子里只能有一个等号');

  if (eq.length === 2) {
    const lhsRaw = toPlain(eq[0]);
    const rhs = toPlain(eq[1]);
    const L = lhsRaw.replace(/\s+/g, '');
    if (!d3) {
      if (LHS_FX.test(L)) {
        const c = compileComp(rhs, 'fx');
        return makeForm('fx', [c], { displayTex: (L === 'y' ? 'y' : 'f(x)') + '=' + c.tex });
      }
      if (LHS_R2.test(L)) {
        const c = compileComp(rhs, 'polar');
        return makeForm('polar', [c], { tex: 'r=' + c.tex, displayTex: 'r=' + c.tex });
      }
      if (/^\(x,y\)$/.test(L)) return tupleForm(rhs, false, src);
      /* 其余一律当隐函数：F(x, y) = 左 − 右 */
      const lc = build(lhsRaw, { vars: ['x', 'y'] });
      const rc = build(rhs, { vars: ['x', 'y'] });
      const F = build('(' + lhsRaw + ')-(' + rhs + ')', { vars: ['x', 'y'] });
      const tex = lc.tex + '=' + rc.tex;
      return makeForm('implicit', [F], { tex, displayTex: tex });
    }
    if (LHS_FXY.test(L)) {
      const c = compileComp(rhs, 'fxy');
      return makeForm('fxy', [c], { displayTex: (L === 'z' ? 'z' : 'f(x,y)') + '=' + c.tex });
    }
    if (LHS_R3.test(L)) {
      const c = compileComp(rhs, 'sph');
      return makeForm('sph', [c], { tex: 'r=' + c.tex, displayTex: 'r=' + c.tex });
    }
    if (/^\(x,y,z\)$/.test(L)) return tupleForm(rhs, true, src);
    throw new Error('立体模式能画：z = f(x, y)、参数曲面 (x(u,v), y(u,v), z(u,v))、' +
      '空间曲线 (x(t), y(t), z(t))、球坐标 r = f(θ, φ)。隐式曲面 F(x,y,z)=0 暂不支持');
  }

  const text = toPlain(src);
  if (tupleParts(text)) return tupleForm(text, d3, src);
  if (d3) return makeForm('fxy', [compileComp(text, 'fxy')]);
  return makeForm('fx', [compileComp(text, 'fx')]);
}

function tupleForm(text, d3, src) {
  const parts = tupleParts(text);
  if (!parts) throw new Error('参数式要写成 (x(t), y(t)) 这样带括号、用逗号隔开的形式');
  if (!d3) {
    if (parts.length === 3) throw new Error('三个分量是空间曲线或参数曲面：切到「立体」模式再看');
    if (parts.length !== 2) throw new Error('平面参数曲线要两个分量 (x(t), y(t))，这里有 ' + parts.length + ' 个');
    const comps = parts.map((p) => compileComp(p, 'param2'));
    const tex = tuple(comps.map((c) => c.tex));
    return makeForm('param2', comps, { tex, displayTex: tex });
  }
  if (parts.length === 2) throw new Error('两个分量是平面参数曲线：切到「平面」模式再看');
  if (parts.length !== 3) throw new Error('立体参数式要三个分量 (x, y, z)，这里有 ' + parts.length + ' 个');
  /* 用到 u 或 v 就是曲面，否则按 t 当空间曲线 */
  const asSurf = parts.map((p) => compileComp(p, 'psurf'));
  const kind = asSurf.some((c) => usesVars(c, ['u', 'v'])) ? 'psurf' : 'curve3';
  const comps = kind === 'psurf' ? asSurf : parts.map((p) => compileComp(p, 'curve3'));
  void src;
  const tex = tuple(comps.map((c) => c.tex));
  return makeForm(kind, comps, { tex, displayTex: tex });
}

/**
 * 预览用的 LaTeX。手写 LaTeX 的原样渲染（所见即所得），
 * 普通算式先解析再排版。解析失败直接抛，交给预览框显示原因。
 */
export function displayTex(raw, mode) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const form = compileForm(s, mode);
  return isLatex(s) ? s : form.displayTex;
}

/** 猜一句话更像平面还是立体（Python 送来的字符串没说模式时用） */
export function guessMode(raw) {
  try {
    const f2 = compileForm(raw, '2d');
    if (!f2) return '2d';
    const has = (names) => names.some((n) => f2.params.indexOf(n) >= 0);
    if (f2.kind === 'fx' && has(['y'])) return '3d';
    if (has(['z'])) return '3d';
    if (f2.kind === 'polar' && has(PHI)) return '3d';
    return '2d';
  } catch (e) {
    try {
      compileForm(raw, '3d');
      return '3d';
    } catch (e2) {
      void e2;
      return '2d';
    }
  }
}

/* =========================================================================
 * 采样
 * ========================================================================= */

/** 平面参数曲线：均匀取 t，按「跳得特别远」断开（tan 一类的穿无穷） */
export function sampleCurve2(fx, fy, t0, t1, n) {
  const N = Math.max(8, n || 1600);
  const xs = new Float64Array(N + 1);
  const ys = new Float64Array(N + 1);
  const ts = new Float64Array(N + 1);
  for (let i = 0; i <= N; i += 1) {
    const t = t0 + ((t1 - t0) * i) / N;
    ts[i] = t;
    xs[i] = fx(t);
    ys[i] = fy(t);
  }
  return { xs, ys, ts, segs: curveSegments(xs, ys) };
}

function quantileSpan(arr) {
  const v = [];
  for (let i = 0; i < arr.length; i += 1) if (Number.isFinite(arr[i])) v.push(arr[i]);
  if (v.length < 2) return 0;
  v.sort((a, b) => a - b);
  const cut = Math.floor(v.length * 0.02);
  return v[v.length - 1 - cut] - v[cut];
}

/**
 * 断点：一步走得比「典型步长 × 60」还远、且超过整体跨度的 8%，就当穿过了无穷远。
 * 两个条件缺一不可：只看步长比，速度变化大的正常曲线（螺线外圈）会被误断；
 * 只看跨度比，又会把真正的渐近跳跃连成一根横穿全图的线。
 */
export function curveSegments(xs, ys) {
  const n = xs.length;
  const steps = [];
  for (let i = 1; i < n; i += 1) {
    const d = Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
    if (Number.isFinite(d)) steps.push(d);
  }
  const sorted = steps.slice().sort((a, b) => a - b);
  const med = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  const span = Math.max(quantileSpan(xs), quantileSpan(ys), 1e-12);
  const limit = Math.max(med * 60, span * 0.08);
  const segs = [];
  let start = -1;
  for (let i = 0; i < n; i += 1) {
    const ok = Number.isFinite(xs[i]) && Number.isFinite(ys[i]);
    if (!ok) {
      if (start >= 0 && i - 1 > start) segs.push([start, i - 1]);
      start = -1;
      continue;
    }
    if (start < 0) {
      start = i;
      continue;
    }
    const d = Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
    if (d > limit) {
      if (i - 1 > start) segs.push([start, i - 1]);
      start = i;
    }
  }
  if (start >= 0 && n - 1 > start) segs.push([start, n - 1]);
  return segs;
}

/** 极坐标 r = f(θ) → 参数曲线 (r cosθ, r sinθ)。负的 r 照常画（穿过原点到对面） */
export function samplePolar(fr, t0, t1, n) {
  const N = Math.max(8, n || 2000);
  const rs = new Float64Array(N + 1);
  const xs = new Float64Array(N + 1);
  const ys = new Float64Array(N + 1);
  const ts = new Float64Array(N + 1);
  for (let i = 0; i <= N; i += 1) {
    const t = t0 + ((t1 - t0) * i) / N;
    const r = fr(t);
    ts[i] = t;
    rs[i] = r;
    xs[i] = r * Math.cos(t);
    ys[i] = r * Math.sin(t);
  }
  return { xs, ys, ts, rs, segs: curveSegments(xs, ys) };
}

/** 折线弧长（只在连续段内累加） */
export function arcLength2(c) {
  let L = 0;
  c.segs.forEach(([i0, i1]) => {
    for (let i = i0 + 1; i <= i1; i += 1) L += Math.hypot(c.xs[i] - c.xs[i - 1], c.ys[i] - c.ys[i - 1]);
  });
  return L;
}

/** 闭合曲线的有向面积（格林公式 / 鞋带公式 ½∮(x dy − y dx)） */
export function shoelace(c) {
  if (c.segs.length !== 1) return NaN;
  const [i0, i1] = c.segs[0];
  let s = 0;
  for (let i = i0; i < i1; i += 1) s += c.xs[i] * c.ys[i + 1] - c.xs[i + 1] * c.ys[i];
  s += c.xs[i1] * c.ys[i0] - c.xs[i0] * c.ys[i1];
  return s / 2;
}

/** 首尾是否相接 */
export function isClosed(c) {
  if (c.segs.length !== 1) return false;
  const [i0, i1] = c.segs[0];
  if (i0 !== 0 || i1 !== c.xs.length - 1) return false;
  const span = Math.max(quantileSpan(c.xs), quantileSpan(c.ys), 1e-12);
  return Math.hypot(c.xs[i1] - c.xs[i0], c.ys[i1] - c.ys[i0]) < span * 1e-6;
}

/** ½∫ r² dθ（复合辛普森；有算不出的点就报 NaN） */
export function polarArea(fr, t0, t1) {
  let n = 2000;
  if (n % 2) n += 1;
  const h = (t1 - t0) / n;
  let s = 0;
  for (let i = 0; i <= n; i += 1) {
    const r = fr(t0 + i * h);
    if (!Number.isFinite(r)) return NaN;
    const w = i === 0 || i === n ? 1 : i % 2 ? 4 : 2;
    s += w * r * r;
  }
  return (s * h) / 3 / 2;
}

/* ---------- 隐函数：marching squares ---------- */

/* 每种角点组合连哪两条边。边编号：0 下、1 右、2 上、3 左；
   5 与 10 是鞍点，按格子中心的符号二选一（见 implicit2）。 */
const MS = {
  1: [[3, 0]], 2: [[0, 1]], 3: [[3, 1]], 4: [[1, 2]], 6: [[0, 2]], 7: [[3, 2]],
  8: [[2, 3]], 9: [[0, 2]], 11: [[1, 2]], 12: [[3, 1]], 13: [[0, 1]], 14: [[3, 0]],
};

/**
 * 描 F(x, y) = 0：在视野网格上找变号的边，线性插值定交点，再把一段段小线段
 * 按共享的边串成长折线（画出来是连续的线，而不是一地碎渣）。
 *
 * 变号不一定是零点——1/x = y 在 x=0 两侧 F 从 +∞ 跳到 −∞，同样变号。
 * 分辨办法：在插值出来的交点上真算一次 F，零点附近 |F| 会远小于两端，
 * 极点附近反而更大；后者直接丢掉，不然渐近线会被描成一条竖线。
 */
export function implicit2(F, x0, x1, y0, y1, nx, ny) {
  const NX = Math.max(4, nx | 0);
  const NY = Math.max(4, ny | 0);
  const stride = NY + 1;
  const hx = (x1 - x0) / NX;
  const hy = (y1 - y0) / NY;
  const val = new Float64Array((NX + 1) * stride);
  for (let i = 0; i <= NX; i += 1) {
    const x = x0 + i * hx;
    for (let j = 0; j <= NY; j += 1) val[i * stride + j] = F(x, y0 + j * hy);
  }
  const VOFF = (NX + 1) * stride;
  const pts = new Map();
  /* 边上的交点：缓存，相邻两个格子共用同一个点（串线就靠它） */
  function edgePoint(id) {
    if (pts.has(id)) return pts.get(id);
    let ia; let ja; let ib; let jb;
    if (id < VOFF) {
      ia = Math.floor(id / stride); ja = id % stride; ib = ia + 1; jb = ja;
    } else {
      const k = id - VOFF;
      ia = Math.floor(k / NY); ja = k % NY; ib = ia; jb = ja + 1;
    }
    const fa = val[ia * stride + ja];
    const fb = val[ib * stride + jb];
    const t = fa / (fa - fb);
    const x = x0 + (ia + (ib - ia) * t) * hx;
    const y = y0 + (ja + (jb - ja) * t) * hy;
    const fp = F(x, y);
    const ok = Number.isFinite(fp) && Math.abs(fp) <= 0.75 * Math.max(Math.abs(fa), Math.abs(fb));
    const p = ok ? [x, y] : null;
    pts.set(id, p);
    return p;
  }
  const H = (i, j) => i * stride + j;          /* (i,j)-(i+1,j) */
  const V = (i, j) => VOFF + i * NY + j;        /* (i,j)-(i,j+1) */
  const segA = [];
  const segB = [];
  for (let i = 0; i < NX; i += 1) {
    for (let j = 0; j < NY; j += 1) {
      const v00 = val[i * stride + j];
      const v10 = val[(i + 1) * stride + j];
      const v11 = val[(i + 1) * stride + j + 1];
      const v01 = val[i * stride + j + 1];
      if (!Number.isFinite(v00) || !Number.isFinite(v10) || !Number.isFinite(v11) || !Number.isFinite(v01)) continue;
      const c = (v00 > 0 ? 1 : 0) | (v10 > 0 ? 2 : 0) | (v11 > 0 ? 4 : 0) | (v01 > 0 ? 8 : 0);
      if (c === 0 || c === 15) continue;
      const edges = [H(i, j), V(i + 1, j), H(i, j + 1), V(i, j)];
      let pairs = MS[c];
      if (c === 5 || c === 10) {
        const center = F(x0 + (i + 0.5) * hx, y0 + (j + 0.5) * hy);
        const up = center > 0;
        if (c === 5) pairs = up ? [[0, 1], [2, 3]] : [[3, 0], [1, 2]];
        else pairs = up ? [[3, 0], [1, 2]] : [[0, 1], [2, 3]];
      }
      pairs.forEach(([ea, eb]) => {
        const a = edges[ea];
        const b = edges[eb];
        if (!edgePoint(a) || !edgePoint(b)) return;
        segA.push(a);
        segB.push(b);
      });
    }
  }
  /* 串线 */
  const adj = new Map();
  const link = (e, s) => {
    const l = adj.get(e);
    if (l) l.push(s);
    else adj.set(e, [s]);
  };
  for (let s = 0; s < segA.length; s += 1) {
    link(segA[s], s);
    link(segB[s], s);
  }
  const used = new Uint8Array(segA.length);
  const outX = [];
  const outY = [];
  const segs = [];
  const step = (from, cur) => {
    const l = adj.get(cur) || [];
    for (let q = 0; q < l.length; q += 1) {
      if (!used[l[q]]) {
        used[l[q]] = 1;
        return segA[l[q]] === cur ? segB[l[q]] : segA[l[q]];
      }
    }
    void from;
    return null;
  };
  for (let s = 0; s < segA.length; s += 1) {
    if (used[s]) continue;
    used[s] = 1;
    const chain = [segA[s], segB[s]];
    let cur = segB[s];
    for (;;) {
      const nx2 = step(null, cur);
      if (nx2 === null) break;
      chain.push(nx2);
      cur = nx2;
    }
    cur = segA[s];
    for (;;) {
      const nx2 = step(null, cur);
      if (nx2 === null) break;
      chain.unshift(nx2);
      cur = nx2;
    }
    const i0 = outX.length;
    chain.forEach((e) => {
      const p = pts.get(e);
      outX.push(p[0]);
      outY.push(p[1]);
    });
    segs.push([i0, outX.length - 1]);
  }
  return { xs: Float64Array.from(outX), ys: Float64Array.from(outY), segs };
}

/* ---------- 3D ---------- */

/** 参数曲面：网格索引 i*(nv+1)+j，i 沿 u、j 沿 v（与 grid2 同一套布局） */
export function sampleSurface(fx, fy, fz, u0, u1, v0, v1, nu, nv) {
  const NU = Math.max(2, nu | 0);
  const NV = Math.max(2, nv | 0);
  const size = (NU + 1) * (NV + 1);
  const X = new Float64Array(size);
  const Y = new Float64Array(size);
  const Z = new Float64Array(size);
  const us = new Float64Array(NU + 1);
  const vs = new Float64Array(NV + 1);
  for (let i = 0; i <= NU; i += 1) us[i] = u0 + ((u1 - u0) * i) / NU;
  for (let j = 0; j <= NV; j += 1) vs[j] = v0 + ((v1 - v0) * j) / NV;
  for (let i = 0; i <= NU; i += 1) {
    for (let j = 0; j <= NV; j += 1) {
      const k = i * (NV + 1) + j;
      X[k] = fx(us[i], vs[j]);
      Y[k] = fy(us[i], vs[j]);
      Z[k] = fz(us[i], vs[j]);
    }
  }
  return { X, Y, Z, nu: NU, nv: NV, us, vs };
}

/** 球坐标 r = f(θ, φ) → 参数曲面（θ 方位角走 i，φ 天顶角走 j） */
export function sampleSpherical(fr, t0, t1, p0, p1, nu, nv) {
  const rx = (t, p) => fr(t, p) * Math.sin(p) * Math.cos(t);
  const ry = (t, p) => fr(t, p) * Math.sin(p) * Math.sin(t);
  const rz = (t, p) => fr(t, p) * Math.cos(p);
  return sampleSurface(rx, ry, rz, t0, t1, p0, p1, nu, nv);
}

/** 曲面面积 ≈ Σ |d₁ × d₂| / 2（每个四边形用两条对角线的叉积） */
export function surfaceArea(S) {
  const { X, Y, Z, nu, nv } = S;
  const st = nv + 1;
  let A = 0;
  for (let i = 0; i < nu; i += 1) {
    for (let j = 0; j < nv; j += 1) {
      const a = i * st + j;
      const b = (i + 1) * st + j;
      const c = (i + 1) * st + j + 1;
      const d = i * st + j + 1;
      const d1x = X[c] - X[a]; const d1y = Y[c] - Y[a]; const d1z = Z[c] - Z[a];
      const d2x = X[d] - X[b]; const d2y = Y[d] - Y[b]; const d2z = Z[d] - Z[b];
      const cx = d1y * d2z - d1z * d2y;
      const cy = d1z * d2x - d1x * d2z;
      const cz = d1x * d2y - d1y * d2x;
      const s = Math.hypot(cx, cy, cz) / 2;
      if (Number.isFinite(s)) A += s;
    }
  }
  return A;
}

export function sampleCurve3(fx, fy, fz, t0, t1, n) {
  const N = Math.max(8, n || 800);
  const X = new Float64Array(N + 1);
  const Y = new Float64Array(N + 1);
  const Z = new Float64Array(N + 1);
  const ts = new Float64Array(N + 1);
  for (let i = 0; i <= N; i += 1) {
    const t = t0 + ((t1 - t0) * i) / N;
    ts[i] = t;
    X[i] = fx(t);
    Y[i] = fy(t);
    Z[i] = fz(t);
  }
  return { X, Y, Z, n: N, ts };
}

export function arcLength3(C) {
  let L = 0;
  for (let i = 1; i <= C.n; i += 1) {
    const d = Math.hypot(C.X[i] - C.X[i - 1], C.Y[i] - C.Y[i - 1], C.Z[i] - C.Z[i - 1]);
    if (Number.isFinite(d)) L += d;
  }
  return L;
}

/** 有限值的 [min, max]；一个都没有返回 null */
export function finiteRange(arr) {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < arr.length; i += 1) {
    const v = arr[i];
    if (!Number.isFinite(v)) continue;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return lo <= hi ? [lo, hi] : null;
}
