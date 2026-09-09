/* =========================================================================
 * 数值分析 —— 从一堆采样点里把函数的「长相」问出来
 * -------------------------------------------------------------------------
 * 不做符号推导（那得再写半个 CAS），一律用数值手段，但每处都做了细化，
 * 免得读数只有采样精度：
 *   零点   采样上找变号 → 二分到底（40 次，double 精度）；
 *   极值   采样上找「比两边都高/低」 → 三点抛物线插值定顶点 → 再迭代两次；
 *   导数   中心差分 (f(x+h)-f(x-h))/2h，h 随 x 的量级缩放；
 *   积分   复合辛普森，遇奇点直接报 NaN 而不是给个看着像数的错值。
 *
 * 采样本身是两轮的：先均匀铺一遍，再按「中点是否偏离两端连线」自适应细分。
 * 只有均匀采样的话，sin(1/x) 靠近原点的地方会画成一堆锯齿。
 * ========================================================================= */

/* 采样基准点数。调大更细腻，调小更省；自适应细分会在这之上补点。 */
const BASE_N = 640;
/* 自适应细分最多补多少点——拖滑块时每帧都要重采，不能没上限 */
const REFINE_BUDGET = 2600;

/**
 * 把编译结果包成「只吐有限数或 NaN」的安全函数。
 * 同时兼容一元与二元：一元时第二个参数传了也无所谓（多余的实参被忽略），
 * 于是 2D 与 3D 能共用同一套参数/预设机制。
 */
export function makeFn(compiled, params) {
  const P = params || compiled.defaults || {};
  return function f(x, y) {
    let v;
    try {
      v = compiled.fn(P, x, y);
    } catch (e) {
      void e;
      return NaN;
    }
    return typeof v === 'number' && Number.isFinite(v) ? v : NaN;
  };
}

/** 均匀采样 */
export function grid(f, x0, x1, n) {
  const N = n || BASE_N;
  const xs = new Float64Array(N + 1);
  const ys = new Float64Array(N + 1);
  const h = (x1 - x0) / N;
  for (let i = 0; i <= N; i += 1) {
    const x = x0 + i * h;
    xs[i] = x;
    ys[i] = f(x);
  }
  return { xs, ys };
}

/**
 * 自适应细分：一段两端连线若与中点真值差得多，就在中间插点，递归下去。
 * 判据用「偏离量 ÷ 当前 y 跨度」，于是陡而直的斜坡不会被无限细分，
 * 只有真的弯（或者藏着尖峰）的地方才补点。
 */
export function refine(f, xs, ys, budget) {
  const remaining = { n: budget || REFINE_BUDGET };
  let span = 0;
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < ys.length; i += 1) {
    if (!Number.isFinite(ys[i])) continue;
    if (ys[i] < lo) lo = ys[i];
    if (ys[i] > hi) hi = ys[i];
  }
  span = hi - lo;
  if (!(span > 0) || !Number.isFinite(span)) span = 1;
  const tol = span * 0.004;

  const outX = [];
  const outY = [];
  const push = (x, y) => {
    outX.push(x);
    outY.push(y);
  };
  push(xs[0], ys[0]);
  for (let i = 1; i < xs.length; i += 1) {
    const a = { x: xs[i - 1], y: ys[i - 1] };
    const b = { x: xs[i], y: ys[i] };
    sub(f, a, b, 0, tol, remaining, push);
    push(b.x, b.y);
  }
  return { xs: Float64Array.from(outX), ys: Float64Array.from(outY) };
}

function sub(f, a, b, depth, tol, remaining, push) {
  /* 有一端算不出来就不折腾了，这段交给断裂检测去切 */
  if (!Number.isFinite(a.y) || !Number.isFinite(b.y)) return;
  if (depth >= 5 || remaining.n <= 0) return;
  const mx = (a.x + b.x) / 2;
  const my = f(mx);
  if (!Number.isFinite(my)) return;
  const lin = (a.y + b.y) / 2;
  if (Math.abs(my - lin) <= tol) return;
  remaining.n -= 1;
  sub(f, a, { x: mx, y: my }, depth + 1, tol, remaining, push);
  push(mx, my);
  sub(f, { x: mx, y: my }, b, depth + 1, tol, remaining, push);
}

/**
 * 把采样切成若干连续段。断开有两种理由：
 *   1. 算不出来（NaN/Inf）——1/x 在 0 处、sqrt(x) 在负数处；
 *   2. 跳得离谱且方向翻转——tan(x) 在 π/2 处从 +∞ 跳到 -∞，
 *      这种竖线是渐近线不是曲线，画出来会变成一根穿屏的假线。
 */
export function segments(xs, ys) {
  /* 尺度用分位数而不是 max-min：tan(x) 在渐近线旁边那几个采样值能到几万，
     拿它当尺子的话，真正的跳变反而显得「不够大」，整条 tan 会连成一根。 */
  const finite = [];
  for (let i = 0; i < ys.length; i += 1) if (Number.isFinite(ys[i])) finite.push(ys[i]);
  let scale = 1;
  if (finite.length > 4) {
    finite.sort((a, b) => a - b);
    const q = (p) => finite[Math.min(finite.length - 1, Math.max(0, Math.floor(finite.length * p)))];
    scale = Math.max(q(0.95) - q(0.05), Math.abs(q(0.5)) * 1e-3, 1e-9);
  }

  const segs = [];
  let start = null;
  for (let i = 0; i < ys.length; i += 1) {
    const ok = Number.isFinite(ys[i]);
    if (ok && start === null) start = i;
    if (!ok && start !== null) {
      /* 算不出来：1/x 在 0 处、sqrt(x) 在负半轴 */
      if (i - start > 1) segs.push([start, i - 1]);
      start = null;
      continue;
    }
    if (ok && start !== null && i > start) {
      const jump = Math.abs(ys[i] - ys[i - 1]);
      /* 只认「一步跨过去且翻了符号」：tan 在 π/2、1/x 在 0 都是这个长相。
         不翻符号的巨大跳变（比如 x^10 在边界）是真的陡，不是断的。 */
      if (jump > scale * 0.6 && ys[i] * ys[i - 1] < 0) {
        if (i - 1 - start > 1) segs.push([start, i - 1]);
        start = i;
      }
    }
  }
  if (start !== null && ys.length - 1 - start > 1) segs.push([start, ys.length - 1]);
  return segs;
}

/**
 * 补掉孤立的「算不出来」。
 * sin(x)/x 在 x=0 是 0/0，采样点又刚好落在 0 上，不补的话曲线中间会留个
 * 小缺口——偏偏它是最该被看见的那条曲线。
 * 只在两侧都算得出来、且彼此挨得很近时才补：1/x 在 0 两边是 ±64 这种
 * 一正一负的悬崖，那是真极点，补了就是一条穿过去的假线。
 */
export function healIsolated(ys) {
  for (let i = 1; i < ys.length - 1; i += 1) {
    if (Number.isFinite(ys[i])) continue;
    const a = ys[i - 1];
    const c = ys[i + 1];
    if (!Number.isFinite(a) || !Number.isFinite(c)) continue;
    const scale = Math.max(Math.abs(a), Math.abs(c), 1e-9);
    if (Math.abs(a - c) > scale * 0.05) continue;
    ys[i] = (a + c) / 2;
  }
}

/* 按粗分段结果逐段细分，再拼回一条完整的采样序列。
   段与段之间插一个 NaN 当隔板，stitch 完再跑一次 segments 就能各归各段。 */
function stitch(f, base, coarse, o) {
  if (o.refine === false || coarse.length === 0) return base;
  const budget = Math.floor((o.budget || REFINE_BUDGET) / coarse.length);
  const xs = [];
  const ys = [];
  coarse.forEach(([i0, i1], k) => {
    if (k > 0) {
      xs.push(NaN);
      ys.push(NaN);
    }
    const subX = base.xs.slice(i0, i1 + 1);
    const subY = base.ys.slice(i0, i1 + 1);
    const r = refine(f, subX, subY, budget);
    for (let i = 0; i < r.xs.length; i += 1) {
      xs.push(r.xs[i]);
      ys.push(r.ys[i]);
    }
  });
  return { xs: Float64Array.from(xs), ys: Float64Array.from(ys) };
}

/* ---------- 零点 ---------- */

export function findZeros(f, xs, ys, segs) {
  const out = [];
  const eps = 1e-12;
  const bisect = (a, b) => {
    let fa = f(a);
    let fb = f(b);
    for (let k = 0; k < 40; k += 1) {
      const m = (a + b) / 2;
      if (!(m > a && m < b)) break;
      const fm = f(m);
      if (!Number.isFinite(fm)) break;
      if (fa === 0) return a;
      if (fb === 0) return b;
      if (fa * fm <= 0) { b = m; fb = fm; } else { a = m; fa = fm; }
    }
    return (a + b) / 2;
  };

  (segs || segments(xs, ys)).forEach(([i0, i1]) => {
    for (let i = i0 + 1; i <= i1; i += 1) {
      const y0 = ys[i - 1];
      const y1 = ys[i];
      if (!Number.isFinite(y0) || !Number.isFinite(y1)) continue;
      if (y0 === 0) {
        out.push({ x: xs[i - 1], y: 0 });
        continue;
      }
      if (y0 * y1 < 0) {
        const x = bisect(xs[i - 1], xs[i]);
        out.push({ x, y: f(x) });
      }
    }
    /* 「擦到零就弹回去」的零点（x^2 在 0 处）：两边同号但中间有个极小 */
    for (let i = i0 + 1; i < i1; i += 1) {
      const a = ys[i - 1];
      const b = ys[i];
      const c = ys[i + 1];
      if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) continue;
      if (Math.abs(b) < eps && Math.abs(b) < Math.abs(a) && Math.abs(b) < Math.abs(c)) {
        out.push({ x: xs[i], y: b });
      }
    }
  });
  return dedupe(out);
}

function dedupe(list) {
  const sorted = list.slice().sort((p, q) => p.x - q.x);
  const out = [];
  sorted.forEach((p) => {
    const last = out[out.length - 1];
    if (last && Math.abs(p.x - last.x) < 1e-7) return;
    out.push(p);
  });
  return out;
}

/* ---------- 极值 ---------- */

/** 三点定一条抛物线，返回顶点（用来把极值细化到采样精度以下） */
function parabolaVertex(x1, y1, x2, y2, x3, y3) {
  const d1 = x2 - x1;
  const d2 = x3 - x2;
  if (Math.abs(d1) < 1e-15 || Math.abs(d2) < 1e-15) return null;
  const s1 = (y2 - y1) / d1;
  const s2 = (y3 - y2) / d2;
  const A = (s2 - s1) / (x3 - x1);
  if (!Number.isFinite(A) || Math.abs(A) < 1e-18) return null;
  const B = s1 - A * (x1 + x2);
  const xv = -B / (2 * A);
  if (!Number.isFinite(xv)) return null;
  const C = y1 - A * x1 * x1 - B * x1;
  const yv = C - (B * B) / (4 * A);
  return { x: xv, y: yv };
}

export function findExtrema(f, xs, ys, segs) {
  const out = [];
  (segs || segments(xs, ys)).forEach(([i0, i1]) => {
    for (let i = i0 + 1; i < i1; i += 1) {
      const a = ys[i - 1];
      const b = ys[i];
      const c = ys[i + 1];
      if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) continue;
      const isMax = b > a && b >= c;
      const isMin = b < a && b <= c;
      if (!isMax && !isMin) continue;
      /* 平顶（常函数）不报极值 */
      if (a === b && b === c) continue;

      let x = xs[i];
      let y = b;
      let step = (xs[i + 1] - xs[i - 1]) / 2;
      /* 迭代两轮：用当前估计左右各取一点重拟合，精度从采样步长降到 ~1e-10 */
      for (let k = 0; k < 2; k += 1) {
        const v = parabolaVertex(x - step, f(x - step), x, y, x + step, f(x + step));
        if (!v) break;
        if (!Number.isFinite(v.y)) break;
        /* 拟合跑飞了（跳到邻域外）就不再信它 */
        if (Math.abs(v.x - x) > step) break;
        const better = isMax ? v.y >= y : v.y <= y;
        if (better) { x = v.x; y = v.y; }
        step *= 0.25;
      }
      /* 取真值而不是拟合值：拟合值可能比真值还「更优」一点点，读数会假 */
      const real = f(x);
      out.push({ x, y: Number.isFinite(real) ? real : y, type: isMax ? 'max' : 'min' });
    }
  });
  return dedupe(out);
}

/* ---------- 导数 / 积分 ---------- */

/** 中心差分。h 跟着 x 的量级走，x=1e8 附近不至于全被抵消掉。 */
export function derivative(f) {
  return function d(x) {
    const h = 1e-5 * Math.max(1, Math.abs(x));
    const a = f(x + h);
    const b = f(x - h);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN;
    return (a - b) / (2 * h);
  };
}

/**
 * 复合辛普森。区间里有算不出来的点就返回 NaN——
 * 拿辛普森硬跨 1/x 的奇点会给出一个「很像答案」的错值，那比不答更糟。
 */
export function integrate(f, a, b, n) {
  if (!(a < b)) { const t = a; a = b; b = t; }
  if (b - a < 1e-15) return 0;
  const N = Math.max(2, Math.round((n || 512) / 2) * 2);
  const h = (b - a) / N;
  let acc = 0;
  for (let i = 0; i <= N; i += 1) {
    let y = f(a + i * h);
    if (!Number.isFinite(y)) {
      /* 撞上算不出的点。分两种处理：
         内部点若是可去奇点（sin(x)/x 在 0 处那种），用左右邻居补一个值；
         若是真极点（1/x 在 0 处，两边一正一负差好几个数量级）就报 NaN。
         端点没有两侧，只能拿内侧两点线性外推——∫₀¹⁰ sin(x)/x 就是这么算出来的。 */
      if (i === 0) {
        const y1 = f(a + h);
        const y2 = f(a + 2 * h);
        if (!Number.isFinite(y1) || !Number.isFinite(y2)) return NaN;
        y = 2 * y1 - y2;
      } else if (i === N) {
        const y1 = f(a + (N - 1) * h);
        const y2 = f(a + (N - 2) * h);
        if (!Number.isFinite(y1) || !Number.isFinite(y2)) return NaN;
        y = 2 * y1 - y2;
      } else {
        const yl = f(a + (i - 1) * h);
        const yr = f(a + (i + 1) * h);
        const scale = Math.max(Math.abs(yl), Math.abs(yr), 1e-9);
        if (!Number.isFinite(yl) || !Number.isFinite(yr) ||
            Math.abs(yl - yr) > scale * 0.05) return NaN;
        y = (yl + yr) / 2;
      }
    }
    acc += y * (i === 0 || i === N ? 1 : i % 2 ? 4 : 2);
  }
  return (acc * h) / 3;
}

/** 单调区间：用极值点把视窗切开，每段取中点问一次导数符号 */
export function monotonic(f, x0, x1, extrema) {
  const cuts = [x0];
  (extrema || []).forEach((e) => {
    if (e.x > x0 && e.x < x1) cuts.push(e.x);
  });
  cuts.push(x1);
  cuts.sort((a, b) => a - b);
  const d = derivative(f);
  const out = [];
  for (let i = 0; i + 1 < cuts.length; i += 1) {
    const a = cuts[i];
    const b = cuts[i + 1];
    if (b - a < 1e-12) continue;
    const mid = (a + b) / 2;
    const s = d(mid);
    /* 导数取不出来（段内有断点）就退化成比较两端函数值 */
    const dir = Number.isFinite(s) ? (s > 0 ? 'up' : 'down')
      : f(b) > f(a) ? 'up' : 'down';
    const last = out[out.length - 1];
    if (last && last.dir === dir && Math.abs(last.x1 - a) < 1e-12) last.x1 = b;
    else out.push({ x0: a, x1: b, dir });
  }
  return out;
}

/** 奇偶性：抽几个点比对 f(-x) 与 ±f(x)。不满足就返回 null，不瞎猜。 */
export function parity(f, span) {
  const R = span || 6;
  let rel = 0;
  let checked = 0;
  let isOdd = true;
  let isEven = true;
  for (let i = 1; i <= 12; i += 1) {
    const x = (i / 12) * R;
    const a = f(x);
    const b = f(-x);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    const scale = Math.max(1, Math.abs(a), Math.abs(b));
    rel = Math.max(rel, Math.abs(a - b) / scale);
    if (Math.abs(a + b) / scale > 1e-7) isOdd = false;
    if (Math.abs(a - b) / scale > 1e-7) isEven = false;
    checked += 1;
  }
  if (!checked) return null;
  if (isOdd) return 'odd';
  if (isEven) return 'even';
  return null;
}

/* ---------- 交点 ---------- */

/** 两条曲线的交点 = f-g 的零点 */
export function intersections(f, g, x0, x1) {
  const h = (x) => f(x) - g(x);
  const s = grid(h, x0, x1, 400);
  const segs = segments(s.xs, s.ys);
  return findZeros(h, s.xs, s.ys, segs);
}

/* ---------- 一次算齐 ---------- */

/**
 * 把一条曲线的全套性质问出来。
 * 采样只做一次，零点/极值/单调都在这份数据上算，拖滑块才跟得上。
 */
export function analyze(f, x0, x1, opts) {
  const o = opts || {};
  const base = grid(f, x0, x1, o.n || BASE_N);
  /* 先把孤立的可去奇点补上，再找断点 */
  healIsolated(base.ys);
  /* 断点是先在均匀采样上找的：细分会在渐近线旁边插出一堆巨大的值，
     等它插完再判断「哪里断了」反而看不清。先分区间，再在每段内部细分。 */
  const coarse = segments(base.xs, base.ys);
  const fine = stitch(f, base, coarse, o);
  const segs = segments(fine.xs, fine.ys);
  const zeros = o.zeros === false ? [] : findZeros(f, fine.xs, fine.ys, segs);
  const extrema = o.extrema === false ? [] : findExtrema(f, fine.xs, fine.ys, segs);
  const mono = o.mono === false ? [] : monotonic(f, x0, x1, extrema);
  return { xs: fine.xs, ys: fine.ys, segs, zeros, extrema, mono };
}

/** 端点读数：曲线在视窗两端的去向（给「渐近趋势」用） */
export function endValues(f, x0, x1) {
  /* inward 是「往区间内部走」的位移。比较时要换算回「x 增大」这个统一方向：
     左端点 inward 为正（右邻），右端点 inward 为负（左邻），
     不换算的话右端点会把下降读成上升。 */
  const probe = (x, inward) => {
    const a = f(x);
    const b = f(x + inward);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    const delta = inward > 0 ? b - a : a - b;
    return { y: a, dir: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat' };
  };
  const span = (x1 - x0) * 0.002;
  return { left: probe(x0, span), right: probe(x1, -span) };
}

/* =========================================================================
 * 3D：二元采样与网格上的性质（z = f(x, y)）
 * -------------------------------------------------------------------------
 * 曲面不像曲线那样能「自适应细分」——一张 48×48 的网格已经 2300 多个格子，
 * 再细分收益很低、代价很高。所以这里只做规则网格采样，
 * 细腻度靠格子数调，奇点靠 healGrid2 补。
 *
 * 网格存成一维 Float64Array，索引 i*(ny+1)+j：i 沿 x 走，j 沿 y 走。
 * 这样切片、跳采样（拖动时降精度）都很直接。
 * ========================================================================= */

/** 规则网格采样。z 的长度是 (nx+1)*(ny+1) */
export function grid2(f, x0, x1, y0, y1, nx, ny) {
  const NX = Math.max(2, nx | 0);
  const NY = Math.max(2, ny | 0);
  const xs = new Float64Array(NX + 1);
  const ys = new Float64Array(NY + 1);
  const z = new Float64Array((NX + 1) * (NY + 1));
  const hx = (x1 - x0) / NX;
  const hy = (y1 - y0) / NY;
  for (let i = 0; i <= NX; i += 1) xs[i] = x0 + i * hx;
  for (let j = 0; j <= NY; j += 1) ys[j] = y0 + j * hy;
  for (let i = 0; i <= NX; i += 1) {
    for (let j = 0; j <= NY; j += 1) {
      z[i * (NY + 1) + j] = f(xs[i], ys[j]);
    }
  }
  return { xs, ys, z, nx: NX, ny: NY };
}

/**
 * 补掉孤立的「算不出来」。
 * 与 2D 的 healIsolated 同一个道理，只是邻居从左右两个变成上下左右四个：
 * sin(sqrt(x²+y²))/sqrt(x²+y²) 在原点正是 0/0，不补的话曲面中心会破个洞。
 * 只补四邻齐全、且彼此挨得近的点——真极点（1/(x²+y²)）两边的落差会很大，
 * 那种不能补，补了就是在悬崖上铺一块平板。
 */
export function healGrid2(g) {
  const { nx, ny, z } = g;
  const stride = ny + 1;
  let healed = 0;
  for (let i = 1; i < nx; i += 1) {
    for (let j = 1; j < ny; j += 1) {
      const k = i * stride + j;
      if (Number.isFinite(z[k])) continue;
      const l = z[k - 1];
      const r = z[k + 1];
      const d = z[k - stride];
      const u = z[k + stride];
      if (![l, r, d, u].every(Number.isFinite)) continue;
      const lo = Math.min(l, r, d, u);
      const hi = Math.max(l, r, d, u);
      const scale = Math.max(Math.abs(lo), Math.abs(hi), 1e-9);
      /* 条件一：四邻自己得差不多高，否则这个洞本来就在斜坡上 */
      if (hi - lo > scale * 0.25) continue;

      /* 条件二：四邻往外再走一步，值不能塌下去。
         这条是分辨「可去奇点」与「真极点」的关键——
         1/(x²+y²) 在原点四邻对称、四个值完全相等，光看条件一会误判成平地，
         但往外一步就从 400 掉到 100（75% 的落差），那是一座尖峰不是一块平板。
         sin(r)/r 在原点往外一步只掉 0.1%，是平的，可以放心补。 */
      /* 两侧都要看守不守得住边界：z[k-2] 在 j==1 时会串到上一行的末尾
         （索引合法但位置错了，比越界更隐蔽），负索引则靠 undefined→NaN 侥幸跳过。
         显式给 NaN 才是「这一侧没有第二步」的正确表达。 */
      const l2 = j >= 2 ? z[k - 2] : NaN;
      const r2 = j + 2 <= ny ? z[k + 2] : NaN;
      const d2 = i >= 2 ? z[k - 2 * stride] : NaN;
      const u2 = i + 2 <= nx ? z[k + 2 * stride] : NaN;
      if (![l2, r2, d2, u2].every(Number.isFinite)) continue;
      const drop = Math.max(
        Math.abs(l - l2), Math.abs(r - r2), Math.abs(d - d2), Math.abs(u - u2),
      );
      if (drop > scale * 0.5) continue;

      z[k] = (l + r + d + u) / 4;
      healed += 1;
    }
  }
  return healed;
}

/**
 * z 的上下界：用分位数而不是极值。
 * 1/(x²+y²) 在原点那几个值能到 1e8，拿它当上界整张图会被压成一张平板。
 * 一个有限值都没有时返回 empty: true——这种曲面画不出任何面片，
 * 调用方该说的是「算不出来」，而不是展示默认的 [-1, 1] 假装有高度。
 */
export function zRange(z, padRatio) {
  const finite = [];
  for (let i = 0; i < z.length; i += 1) if (Number.isFinite(z[i])) finite.push(z[i]);
  if (!finite.length) return { lo: -1, hi: 1, empty: true };
  finite.sort((a, b) => a - b);
  const cut = Math.max(1, Math.floor(finite.length * 0.01));
  let lo = finite[cut];
  let hi = finite[finite.length - 1 - cut];
  if (!(hi > lo)) {
    const c = (lo + hi) / 2 || 0;
    lo = c - 1;
    hi = c + 1;
  }
  const pad = (hi - lo) * (padRatio === undefined ? 0.08 : padRatio);
  return { lo: lo - pad, hi: hi + pad, empty: false };
}

/**
 * 网格上的局部极大 / 极小。
 * 判据是「比 8 个邻居都高（低）就」——曲面是规则的，这样找又快又够用；
 * 鞍点不报（它在一个方向上是极大、另一个方向上是极小，本来就没什么好标的）。
 *
 * 但涟漪的环形脊沿环每隔几格就出一个「极大」，尖谷的谷线整条都是「极小」
 * ——直接报会沿圈撒一串点。所以同类候选满足下面任一条就并成一群，
 * 一群只报最极端的那个：
 *   一、挨得近（4 格内，可传递）——谷线、山脊这类候选密集的线状结构；
 *   二、近等高面连通——从候选出发只走「高度与它相差不到 1%」的格子，
 *       涟漪环带这种近平的通道能整圈走通；独立峰之间隔着深谷，走不过去。
 *   （环在对角扇区会有十几格的候选空洞，光靠规则一连不上，所以要有二。）
 */
export function extrema2(g, limit) {
  const { nx, ny, xs, ys, z } = g;
  const stride = ny + 1;
  const cand = [];
  for (let i = 1; i < nx; i += 1) {
    for (let j = 1; j < ny; j += 1) {
      const k = i * stride + j;
      const v = z[k];
      if (!Number.isFinite(v)) continue;
      let isMax = true;
      let isMin = true;
      for (let di = -1; di <= 1 && (isMax || isMin); di += 1) {
        for (let dj = -1; dj <= 1; dj += 1) {
          if (di === 0 && dj === 0) continue;
          const w = z[(i + di) * stride + (j + dj)];
          if (!Number.isFinite(w)) { isMax = false; isMin = false; break; }
          if (w > v) isMax = false;
          if (w < v) isMin = false;
        }
      }
      if (isMax || isMin) cand.push({ i, j, z: v, type: isMax ? 'max' : 'min' });
    }
  }
  const n = cand.length;
  if (!n) return limit ? [] : [];

  /* 并查集 */
  const parent = new Int32Array(n);
  for (let q = 0; q < n; q += 1) parent[q] = q;
  const find = (a) => {
    while (parent[a] !== a) {
      parent[a] = parent[parent[a]];
      a = parent[a];
    }
    return a;
  };
  const union = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  /* 规则一：同类候选距离 ≤ 4 格（按格长量，与域大小无关） */
  const cell = Math.max(
    Math.abs(xs[nx] - xs[0]) / nx,
    Math.abs(ys[ny] - ys[0]) / ny,
    1e-12,
  );
  const rad2 = (cell * 4) * (cell * 4);
  for (let a = 0; a < n; a += 1) {
    for (let b = a + 1; b < n; b += 1) {
      if (cand[a].type !== cand[b].type) continue;
      const dx = xs[cand[b].i] - xs[cand[a].i];
      const dy = ys[cand[b].j] - ys[cand[a].j];
      if (dx * dx + dy * dy < rad2) union(a, b);
    }
  }

  /* 规则二：近等高面连通。每个候选当一次种子，泛滥碰到的同类候选并入。
     stamp 复用一块访问表，免得每个种子都新开数组。 */
  const seenCell = new Int32Array(z.length);
  let stamp = 0;
  for (let s = 0; s < n; s += 1) {
    const zs = cand[s].z;
    const tol = Math.max(Math.abs(zs), 1) * 0.01;
    stamp += 1;
    const stack = [cand[s].i * stride + cand[s].j];
    seenCell[stack[0]] = stamp;
    while (stack.length) {
      const c = stack.pop();
      const ci = (c / stride) | 0;
      const cj = c % stride;
      for (let di = -1; di <= 1; di += 1) {
        for (let dj = -1; dj <= 1; dj += 1) {
          if (di === 0 && dj === 0) continue;
          const ni = ci + di;
          const nj = cj + dj;
          if (ni < 0 || ni > nx || nj < 0 || nj > ny) continue;
          const nk = ni * stride + nj;
          if (seenCell[nk] === stamp) continue;
          const w = z[nk];
          if (!Number.isFinite(w) || Math.abs(w - zs) > tol) continue;
          seenCell[nk] = stamp;
          stack.push(nk);
        }
      }
    }
    for (let q = 0; q < n; q += 1) {
      if (q === s || cand[q].type !== cand[s].type) continue;
      if (seenCell[cand[q].i * stride + cand[q].j] === stamp) union(s, q);
    }
  }

  /* 每群取最极端者（极大取最高、极小取最低） */
  const best = [];
  for (let q = 0; q < n; q += 1) {
    const r = find(q);
    const cur = best[r];
    if (!cur || (cand[q].type === 'max' ? cand[q].z > cur.z : cand[q].z < cur.z)) {
      best[r] = cand[q];
    }
  }
  const out = [];
  for (let q = 0; q < n; q += 1) {
    if (best[find(q)] === cand[q]) out.push({ x: xs[cand[q].i], y: ys[cand[q].j], z: cand[q].z, type: cand[q].type });
  }
  /* 极大在前；同类里极大按高度降序、极小按高度升序（最深的先）。
     极小不能按 |z| 降序排：谷底尖端 z=0 会被排到最后、被截断掉，
     显示出来的反而全是谷线远端的「极小」。 */
  out.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'max' ? -1 : 1;
    return a.type === 'max' ? b.z - a.z : a.z - b.z;
  });
  return limit ? out.slice(0, limit) : out;
}

/**
 * 中心差分求偏导。
 * 分母是「前后两点之间的距离」而不是它的一半——(f(x+h) - f(x-h)) / 2h 里的
 * 2h 恰好就是 x_{i+1} - x_{i-1}，再乘一次 2 就会得到一半的结果。
 * 曲面的法线由它给出：z = f(x,y) 的法线方向是 (-fx, -fy, 1)。
 */
export function gradient2(g, i, j) {
  const { nx, ny, xs, ys, z } = g;
  const stride = ny + 1;
  const k = i * stride + j;
  if (i <= 0 || i >= nx || j <= 0 || j >= ny) return null;
  const zxp = z[(i + 1) * stride + j];
  const zxn = z[(i - 1) * stride + j];
  const zyp = z[k + 1];
  const zyn = z[k - 1];
  if (![zxp, zxn, zyp, zyn].every(Number.isFinite)) return null;
  const hx = xs[i + 1] - xs[i - 1];
  const hy = ys[j + 1] - ys[j - 1];
  if (!(Math.abs(hx) > 0) || !(Math.abs(hy) > 0)) return null;
  return { fx: (zxp - zxn) / hx, fy: (zyp - zyn) / hy };
}
