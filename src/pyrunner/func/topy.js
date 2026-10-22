/* =========================================================================
 * AST → Python —— 「看见函数」与浮窗 Python 互通的翻译层
 * -------------------------------------------------------------------------
 * 同一棵 expr.js 的 AST，翻成两种 Python：
 *   toNumpy(ast)  数值版：np.sin、** 、np.mod …（向量化，可直接喂 linspace / meshgrid）
 *   toSympy(ast)  符号版：sp.sin、sp.Rational …（可求导、积分、化简）
 *
 * 口径要和 expr.js 一字不差，否则「送到 Python」算出来的曲线会和画布上的对不上：
 *   ln = 自然对数，log(单参) / lg = 常用对数，log(b, x) = 以 b 为底；
 *   round 是「四舍五入」（JS Math.round），不是 numpy 的银行家舍入；
 *   root(n, x) 对奇数次根允许负底数；n! 走伽马函数（非整数也有定义）。
 *
 * 生成的代码只由 AST 里的节点拼成：名字都过 pyName() 洗过，
 * 不会把用户输入的任意文本原样塞进 Python。
 * ========================================================================= */

const PY_RESERVED = new Set((
  'False None True and as assert async await break class continue def del elif else ' +
  'except finally for from global if import in is lambda nonlocal not or pass raise ' +
  'return try while with yield np sp plt math print see seen'
).split(' '));

/* 希腊字母折成 ASCII 名：浮窗的 # sliders: 行只认 [A-Za-z_]\w* */
const GREEK = {
  α: 'alpha', β: 'beta', γ: 'gamma', δ: 'delta', ε: 'epsilon', ζ: 'zeta', η: 'eta',
  θ: 'theta', ϑ: 'theta', ι: 'iota', κ: 'kappa', λ: 'lam', μ: 'mu', ν: 'nu', ξ: 'xi',
  ρ: 'rho', σ: 'sigma', τ: 'tau', υ: 'upsilon', φ: 'phi', ϕ: 'phi', χ: 'chi', ψ: 'psi',
  ω: 'omega', Γ: 'Gamma', Δ: 'Delta', Θ: 'Theta', Λ: 'Lambda', Ξ: 'Xi', Π: 'Pi',
  Σ: 'Sigma', Φ: 'Phi', Ψ: 'Psi', Ω: 'Omega',
};
const ALIAS = { vartheta: 'theta', varphi: 'phi', varepsilon: 'epsilon' };

/** 任意标识符 → 合法且不撞名的 Python 名 */
export function pyName(name) {
  let s = ALIAS[name] || name;
  s = s.replace(/[\u0370-\u03ff]/g, (c) => GREEK[c] || 'g');
  s = s.replace(/'/g, '_p').replace(/[^A-Za-z0-9_]/g, '_');
  if (!/^[A-Za-z_]/.test(s)) s = '_' + s;
  if (PY_RESERVED.has(s)) s += '_';
  return s;
}

/* 优先级：1 加减 · 2 乘除 · 3 一元负号 · 4 幂 · 5 原子（数、名字、函数调用） */
function wrap(r, min) {
  return r.p < min ? '(' + r.s + ')' : r.s;
}

function numText(v) {
  if (v === Infinity) return 'np.inf';
  if (v === -Infinity) return '-np.inf';
  return String(v);
}

/* ---------- numpy ---------- */

const NP1 = {
  sin: 'np.sin', cos: 'np.cos', tan: 'np.tan',
  asin: 'np.arcsin', acos: 'np.arccos', atan: 'np.arctan',
  arcsin: 'np.arcsin', arccos: 'np.arccos', arctan: 'np.arctan',
  sinh: 'np.sinh', cosh: 'np.cosh', tanh: 'np.tanh',
  asinh: 'np.arcsinh', acosh: 'np.arccosh', atanh: 'np.arctanh',
  arsinh: 'np.arcsinh', arcosh: 'np.arccosh', artanh: 'np.arctanh',
  ln: 'np.log', lg: 'np.log10', log: 'np.log10', log10: 'np.log10', log2: 'np.log2',
  exp: 'np.exp', sqrt: 'np.sqrt', abs: 'np.abs', sign: 'np.sign',
  floor: 'np.floor', ceil: 'np.ceil', trunc: 'np.trunc',
  deg: 'np.degrees', rad: 'np.radians',
};

/** numpy 表达式。返回 { code, needs }；needs 含 'gamma' 时调用方要导入 scipy.special.gamma 为 _gamma */
export function toNumpy(ast) {
  const needs = new Set();
  const atom = (s) => ({ s, p: 5 });
  function em(n) {
    switch (n.k) {
      case 'num': return atom(numText(n.v));
      case 'const':
        if (n.name === 'pi' || n.name === 'π') return atom('np.pi');
        if (n.name === 'tau' || n.name === 'τ') return { s: '2*np.pi', p: 2 };
        if (n.name === 'e') return atom('np.e');
        return atom('np.inf');
      case 'var': return atom(pyName(n.name));
      case 'neg': return { s: '-' + wrap(em(n.a), 2), p: 3 };
      case 'add': return { s: em(n.a).s + ' + ' + wrap(em(n.b), 1), p: 1 };
      case 'sub': return { s: em(n.a).s + ' - ' + wrap(em(n.b), 2), p: 1 };
      case 'mul': return { s: wrap(em(n.a), 2) + '*' + wrap(em(n.b), 2), p: 2 };
      case 'div': return { s: wrap(em(n.a), 2) + '/' + wrap(em(n.b), 3), p: 2 };
      case 'mod': return atom('np.mod(' + em(n.a).s + ', ' + em(n.b).s + ')');
      case 'pow': return { s: wrap(em(n.a), 5) + '**' + wrap(em(n.b), 3), p: 4 };
      case 'abs': return atom('np.abs(' + em(n.a).s + ')');
      case 'fact':
        needs.add('gamma');
        return atom('_gamma(' + em(n.a).s + ' + 1)');
      case 'call': return call(n);
      default: return atom('np.nan');
    }
  }
  function call(n) {
    const A = n.args.map((x) => em(x).s);
    const a = A[0];
    switch (n.name) {
      case 'cot': return { s: '1/np.tan(' + a + ')', p: 2 };
      case 'sec': return { s: '1/np.cos(' + a + ')', p: 2 };
      case 'csc': return { s: '1/np.sin(' + a + ')', p: 2 };
      case 'coth': return { s: '1/np.tanh(' + a + ')', p: 2 };
      case 'acot': case 'arccot': return { s: 'np.pi/2 - np.arctan(' + a + ')', p: 1 };
      case 'asec': return atom('np.arccos(1/(' + a + '))');
      case 'acsc': return atom('np.arcsin(1/(' + a + '))');
      case 'acoth': return { s: '0.5*np.log((' + a + ' + 1)/(' + a + ' - 1))', p: 2 };
      case 'round': return atom('np.floor(' + a + ' + 0.5)');
      case 'gamma':
        needs.add('gamma');
        return atom('_gamma(' + a + ')');
      case 'pow': return { s: wrap(em(n.args[0]), 5) + '**' + wrap(em(n.args[1]), 3), p: 4 };
      case 'mod': return atom('np.mod(' + A[0] + ', ' + A[1] + ')');
      case 'rem': return atom('np.fmod(' + A[0] + ', ' + A[1] + ')');
      case 'atan2': return atom('np.arctan2(' + A[0] + ', ' + A[1] + ')');
      case 'hypot': return atom('np.hypot(' + A[0] + ', ' + A[1] + ')');
      case 'gcd':
        return atom('np.gcd(np.round(' + A[0] + ').astype(int), np.round(' + A[1] + ').astype(int))');
      case 'root': {
        const k = '(' + A[0] + ')';
        const x = '(' + A[1] + ')';
        return atom('np.where((np.mod(' + k + ', 2) == 1) & (' + x + ' < 0), -np.abs(' + x + ')**(1.0/' + k +
          '), np.power(' + x + ', 1.0/' + k + '))');
      }
      case 'log':
        if (A.length === 2) return { s: 'np.log(' + A[1] + ')/np.log(' + A[0] + ')', p: 2 };
        return atom('np.log10(' + a + ')');
      case 'max': return atom(A.reduce((acc, x) => 'np.maximum(' + acc + ', ' + x + ')'));
      case 'min': return atom(A.reduce((acc, x) => 'np.minimum(' + acc + ', ' + x + ')'));
      default:
        if (NP1[n.name]) return atom(NP1[n.name] + '(' + a + ')');
        return atom('np.nan');
    }
  }
  const code = em(ast).s;
  return { code, needs: Array.from(needs) };
}

/* ---------- sympy ---------- */

const SP1 = {
  sin: 'sp.sin', cos: 'sp.cos', tan: 'sp.tan', cot: 'sp.cot', sec: 'sp.sec', csc: 'sp.csc',
  asin: 'sp.asin', acos: 'sp.acos', atan: 'sp.atan', acot: 'sp.acot', asec: 'sp.asec', acsc: 'sp.acsc',
  arcsin: 'sp.asin', arccos: 'sp.acos', arctan: 'sp.atan', arccot: 'sp.acot',
  sinh: 'sp.sinh', cosh: 'sp.cosh', tanh: 'sp.tanh', coth: 'sp.coth',
  asinh: 'sp.asinh', acosh: 'sp.acosh', atanh: 'sp.atanh', acoth: 'sp.acoth',
  arsinh: 'sp.asinh', arcosh: 'sp.acosh', artanh: 'sp.atanh',
  ln: 'sp.log', exp: 'sp.exp', sqrt: 'sp.sqrt', abs: 'sp.Abs', sign: 'sp.sign',
  floor: 'sp.floor', ceil: 'sp.ceiling', gamma: 'sp.gamma',
};

function isIntLiteral(n) {
  return n.k === 'num' && Number.isInteger(n.v);
}

/** 只含数字与四则运算（不含名字）的子树：Python 会先按浮点算掉，sympy 就拿不到精确值 */
function pureNumeric(n) {
  if (n.k === 'num') return true;
  if (n.k === 'neg') return pureNumeric(n.a);
  if (n.k === 'add' || n.k === 'sub' || n.k === 'mul' || n.k === 'div' || n.k === 'pow') {
    return pureNumeric(n.a) && pureNumeric(n.b);
  }
  return false;
}

export function toSympy(ast) {
  const atom = (s) => ({ s, p: 5 });
  function num(v) {
    if (v === Infinity) return atom('sp.oo');
    if (Number.isInteger(v)) return atom(String(v));
    return atom("sp.Rational('" + String(v) + "')");
  }
  function em(n) {
    switch (n.k) {
      case 'num': return num(n.v);
      case 'const':
        if (n.name === 'pi' || n.name === 'π') return atom('sp.pi');
        if (n.name === 'tau' || n.name === 'τ') return { s: '2*sp.pi', p: 2 };
        if (n.name === 'e') return atom('sp.E');
        return atom('sp.oo');
      case 'var': return atom(pyName(n.name));
      case 'neg': return { s: '-' + wrap(em(n.a), 2), p: 3 };
      case 'add': return { s: em(n.a).s + ' + ' + wrap(em(n.b), 1), p: 1 };
      case 'sub': return { s: em(n.a).s + ' - ' + wrap(em(n.b), 2), p: 1 };
      case 'mul': return { s: wrap(em(n.a), 2) + '*' + wrap(em(n.b), 2), p: 2 };
      case 'div': {
        /* 1/3 这种纯数字相除：Python 会先算成 0.333…，必须包成 sp.S 保住有理数 */
        if (isIntLiteral(n.a) && isIntLiteral(n.b)) return atom('sp.Rational(' + n.a.v + ', ' + n.b.v + ')');
        const left = pureNumeric(n.a) && pureNumeric(n.b) ? 'sp.S(' + em(n.a).s + ')' : wrap(em(n.a), 2);
        return { s: left + '/' + wrap(em(n.b), 3), p: 2 };
      }
      case 'mod': return atom('sp.Mod(' + em(n.a).s + ', ' + em(n.b).s + ')');
      case 'pow': {
        const base = pureNumeric(n.a) && pureNumeric(n.b) ? 'sp.S(' + em(n.a).s + ')' : wrap(em(n.a), 5);
        return { s: base + '**' + wrap(em(n.b), 3), p: 4 };
      }
      case 'abs': return atom('sp.Abs(' + em(n.a).s + ')');
      case 'fact': return atom('sp.gamma(' + em(n.a).s + ' + 1)');
      case 'call': return call(n);
      default: return atom('sp.nan');
    }
  }
  function call(n) {
    const A = n.args.map((x) => em(x).s);
    const a = A[0];
    switch (n.name) {
      case 'lg': case 'log10': return atom('sp.log(' + a + ', 10)');
      case 'log2': return atom('sp.log(' + a + ', 2)');
      case 'log': return atom(A.length === 2 ? 'sp.log(' + A[1] + ', ' + A[0] + ')' : 'sp.log(' + a + ', 10)');
      case 'round': return atom('sp.floor(' + a + ' + sp.Rational(1, 2))');
      case 'trunc': return { s: 'sp.sign(' + a + ')*sp.floor(sp.Abs(' + a + '))', p: 2 };
      case 'deg': return { s: '(' + a + ')*180/sp.pi', p: 2 };
      case 'rad': return { s: '(' + a + ')*sp.pi/180', p: 2 };
      case 'pow': return { s: wrap(em(n.args[0]), 5) + '**' + wrap(em(n.args[1]), 3), p: 4 };
      case 'mod': case 'rem': return atom('sp.Mod(' + A[0] + ', ' + A[1] + ')');
      case 'atan2': return atom('sp.atan2(' + A[0] + ', ' + A[1] + ')');
      case 'hypot': return atom('sp.sqrt((' + A[0] + ')**2 + (' + A[1] + ')**2)');
      case 'gcd': return atom('sp.gcd(' + A[0] + ', ' + A[1] + ')');
      case 'root': return atom('sp.real_root(' + A[1] + ', ' + A[0] + ')');
      case 'max': return atom('sp.Max(' + A.join(', ') + ')');
      case 'min': return atom('sp.Min(' + A.join(', ') + ')');
      default:
        if (SP1[n.name]) return atom(SP1[n.name] + '(' + a + ')');
        return atom('sp.nan');
    }
  }
  return em(ast).s;
}

/* =========================================================================
 * 整段脚本
 * -------------------------------------------------------------------------
 * 输入是工作区导出的快照（见 workspace.js 的 exportSnapshot）：
 *   { mode, view:[x0,x1,y0,y1], domain, angles:{az,el}, params:{a:1},
 *     paramMeta:{a:{min,max,step}},
 *     funcs:[{ label:'f1', kind, color, numpy:[…], sympy:[…], needs:[…],
 *              ranges:{t:[0,6.28]}, py:{name}|null, src }] }
 * ========================================================================= */

function fmt(v) {
  if (!Number.isFinite(v)) return '0';
  const r = Math.round(v * 1e6) / 1e6;
  return String(r);
}

function sliderLine(snap) {
  const names = Object.keys(snap.params || {});
  const used = new Set();
  snap.funcs.forEach((f) => (f.paramNames || []).forEach((p) => used.add(p)));
  const list = names.filter((p) => used.has(p));
  if (!list.length) return { line: '', sliders: [] };
  const sliders = list.map((p) => {
    const m = (snap.paramMeta && snap.paramMeta[p]) || { min: -10, max: 10, step: 0.05 };
    const value = Math.round(snap.params[p] * 1e4) / 1e4;
    return { name: pyName(p), value, min: m.min, max: m.max, step: m.step };
  });
  const line = '# sliders: ' + sliders.map((s) =>
    s.name + '=' + fmt(s.value) + ' [' + fmt(s.min) + ':' + fmt(s.max) + ':' + fmt(s.step) + ']').join(', ');
  return { line, sliders };
}

function needsOf(snap) {
  const set = new Set();
  snap.funcs.forEach((f) => (f.needs || []).forEach((n) => set.add(n)));
  return set;
}

function body(f) {
  return f.numpy.length === 1 ? f.numpy[0] : '(' + f.numpy.join(', ') + ')';
}

function defLine(f) {
  const args = (f.args || ['x']).join(', ');
  if (f.py) {
    /* 来自浮窗的 Python 函数：有名字就直接调它（参数照滑块传）；lambda 没名字可叫，从 seen() 取回 */
    /* 名字和导出的 f1、f2 撞上就别直呼其名（def f1(x): return f1(x) 是无穷递归），改从 seen() 取 */
    const named = /^[A-Za-z_]\w*$/.test(f.py.name || '') && f.py.name !== 'lambda' && !/^f\d+$/.test(f.py.name);
    const callee = named ? f.py.name : 'seen(' + (f.index || 0) + ')';
    const kw = (f.paramNames || []).map((p) => p + '=' + pyName(p)).join(', ');
    return '# ' + f.label + ' 来自浮窗里的 Python 函数' + (named ? ' ' + f.py.name : '（匿名）') + '\n' +
      'def ' + f.label + '(' + args + '):\n    return ' + callee + '(' + args + (kw ? ', ' + kw : '') + ')\n';
  }
  return 'def ' + f.label + '(' + args + '):\n    return ' + body(f) + '\n';
}

/** 数值作图：numpy + matplotlib。返回 { code, sliders } */
export function numpyScript(snap) {
  const d3 = snap.mode === '3d';
  const { line, sliders } = sliderLine(snap);
  const needs = needsOf(snap);
  const out = [];
  out.push('# 从「看见函数」导出 · ' + (d3 ? '立体' : '平面') + '（数值作图）');
  if (line) {
    out.push('# 参数由浮窗的滑块注入（下面这行 # sliders: 就是滑块的配方），拖一下图就重画');
    out.push(line);
  }
  out.push('import numpy as np');
  out.push('import matplotlib.pyplot as plt');
  if (needs.has('gamma')) out.push('from scipy.special import gamma as _gamma');
  out.push("np.seterr(all='ignore')   # 0/0、log(负数) 这类点只给 nan，不刷一屏警告");
  if (sliders.length) {
    /* 浮窗里参数由滑块先注入命名空间；拷到本机跑时没有滑块，就落到看见函数里的当前值。
       不能直接写 a = 1.0——那会把滑块注入的值盖掉，拖滑块就没反应了 */
    sliders.forEach((s) => out.push(s.name + " = globals().get('" + s.name + "', " + fmt(s.value) + ')'));
  }
  out.push('');
  out.push('def _arr(v, like):');
  out.push('    """常数函数（如 f(x) = 3）返回的是一个数，铺成和自变量一样的形状才好画"""');
  out.push('    return np.broadcast_to(np.asarray(v, dtype=float), np.shape(like))');
  out.push('');
  snap.funcs.forEach((f) => out.push(defLine(f)));

  if (!d3) {
    const [x0, x1, y0, y1] = snap.view;
    const anyFree = snap.funcs.some((f) => f.kind !== 'fx' && f.kind !== 'py');
    out.push('fig, ax = plt.subplots(figsize=(7.2, ' + (anyFree ? '5.6' : '4.4') + '))');
    if (snap.funcs.some((f) => f.kind === 'fx' || f.kind === 'py')) {
      out.push('x = np.linspace(' + fmt(x0) + ', ' + fmt(x1) + ', 1601)');
    }
    snap.funcs.forEach((f) => {
      const c = "color='" + f.color + "'";
      const lab = "label='" + f.label + "'";
      if (f.kind === 'fx' || f.kind === 'py') {
        out.push('y = _arr(' + f.label + '(x), x)');
        out.push('y = np.where(np.abs(y) > 1e6, np.nan, y)   # 渐近线附近的巨值不画，免得竖着连一根线');
        out.push('ax.plot(x, y, ' + c + ', ' + lab + ')');
      } else if (f.kind === 'param2') {
        const [a, b] = f.ranges.t;
        out.push('t = np.linspace(' + fmt(a) + ', ' + fmt(b) + ', 2001)');
        out.push('px, py = ' + f.label + '(t)');
        out.push('ax.plot(_arr(px, t), _arr(py, t), ' + c + ', ' + lab + ')');
      } else if (f.kind === 'polar') {
        const [a, b] = f.ranges.theta;
        out.push('theta = np.linspace(' + fmt(a) + ', ' + fmt(b) + ', 2001)');
        out.push('r = _arr(' + f.label + '(theta), theta)');
        out.push('ax.plot(r*np.cos(theta), r*np.sin(theta), ' + c + ', ' + lab + ')');
      } else if (f.kind === 'implicit') {
        out.push('gx, gy = np.meshgrid(np.linspace(' + fmt(x0) + ', ' + fmt(x1) + ', 500), np.linspace(' +
          fmt(y0) + ', ' + fmt(y1) + ', 500))');
        out.push('ax.contour(gx, gy, _arr(' + f.label + '(gx, gy), gx), levels=[0], colors=[\'' + f.color + "'])");
        out.push("ax.plot([], [], " + c + ", " + lab + ")   # 等高线不进图例，补一条空线占位");
      }
    });
    out.push("ax.axhline(0, color='0.55', lw=0.8)");
    out.push("ax.axvline(0, color='0.55', lw=0.8)");
    out.push('ax.set_xlim(' + fmt(x0) + ', ' + fmt(x1) + ')');
    out.push('ax.set_ylim(' + fmt(y0) + ', ' + fmt(y1) + ')');
    if (anyFree) out.push("ax.set_aspect('equal', adjustable='box')   # 圆要画成圆");
    out.push('ax.legend()');
    out.push('plt.show()');
  } else {
    const d = snap.domain;
    const az = snap.angles ? -90 - (snap.angles.az * 180) / Math.PI : -38;
    const el = snap.angles ? (snap.angles.el * 180) / Math.PI : 30;
    const explicitN = snap.funcs.filter((f) => f.kind === 'fxy' || f.kind === 'py').length;
    const surfN = snap.funcs.filter((f) => f.kind !== 'curve3').length;
    out.push('fig = plt.figure(figsize=(6.8, 5.6))');
    out.push("ax = fig.add_subplot(projection='3d')");
    if (explicitN) {
      out.push('d = ' + fmt(d) + '   # xy 域的半边长：[-d, d]²');
      out.push('X, Y = np.meshgrid(np.linspace(-d, d, 81), np.linspace(-d, d, 81))');
    }
    snap.funcs.forEach((f) => {
      const single = surfN === 1;
      const paint = single ? "cmap='viridis'" : "color='" + f.color + "'";
      if (f.kind === 'fxy' || f.kind === 'py') {
        out.push('Z = _arr(' + f.label + '(X, Y), X)');
        out.push('Z = np.where(np.isfinite(Z), Z, np.nan)');
        out.push('ax.plot_surface(X, Y, Z, ' + paint + ', linewidth=0, antialiased=True, alpha=0.92)');
      } else if (f.kind === 'psurf' || f.kind === 'sph') {
        const k1 = f.kind === 'sph' ? 'theta' : 'u';
        const k2 = f.kind === 'sph' ? 'phi' : 'v';
        const r1 = f.ranges[k1];
        const r2 = f.ranges[k2];
        out.push('U, V = np.meshgrid(np.linspace(' + fmt(r1[0]) + ', ' + fmt(r1[1]) + ', 81), np.linspace(' +
          fmt(r2[0]) + ', ' + fmt(r2[1]) + ', 81))');
        if (f.kind === 'sph') {
          out.push('R = _arr(' + f.label + '(U, V), U)   # 球坐标：U 是方位角 θ，V 是与 z 轴的夹角 φ');
          out.push('SX, SY, SZ = R*np.sin(V)*np.cos(U), R*np.sin(V)*np.sin(U), R*np.cos(V)');
        } else {
          out.push('SX, SY, SZ = (_arr(c, U) for c in ' + f.label + '(U, V))');
        }
        out.push('ax.plot_surface(SX, SY, SZ, ' + paint + ', linewidth=0, antialiased=True, alpha=0.92)');
      } else if (f.kind === 'curve3') {
        const r = f.ranges.t;
        out.push('t = np.linspace(' + fmt(r[0]) + ', ' + fmt(r[1]) + ', 1201)');
        out.push('cx, cy, cz = (_arr(c, t) for c in ' + f.label + '(t))');
        out.push("ax.plot(cx, cy, cz, color='" + f.color + "', lw=2.4)");
      }
    });
    if (!explicitN) {
      out.push('# 参数曲面 / 空间曲线按真实比例画（球要像球）');
      out.push('lims = np.array([ax.get_xlim3d(), ax.get_ylim3d(), ax.get_zlim3d()])');
      out.push('ax.set_box_aspect(np.ptp(lims, axis=1))');
    }
    out.push('ax.view_init(elev=' + fmt(Math.round(el)) + ', azim=' + fmt(Math.round(az)) + ')   # 与看见函数里此刻的视角一致');
    out.push("ax.set_xlabel('x'); ax.set_ylabel('y'); ax.set_zlabel('z')");
    out.push('plt.show()');
  }
  out.push('');
  out.push('# 反过来也行：see(' + (snap.funcs[0] ? snap.funcs[0].label : 'f1') +
    ') 把这里的函数画回「看见函数」；seen() 取回那边此刻的式子');
  return { code: out.join('\n') + '\n', sliders };
}

/* ---------- 符号推导 ---------- */

function symbolsLine(names) {
  if (!names.length) return '';
  if (names.length === 1) return names[0] + " = sp.Symbol('" + names[0] + "', real=True)";
  return names.join(', ') + " = sp.symbols('" + names.join(' ') + "', real=True)";
}

/** 符号推导：sympy。返回 { code } */
export function sympyScript(snap) {
  const out = [];
  out.push('# 从「看见函数」导出 · 符号推导（sympy）');
  out.push('# 每一步都包在 _try 里：sympy 算不出来就说一声，不会把整段卡死在报错上');
  out.push('import sympy as sp');
  out.push('');
  const argSet = new Set();
  const paramSet = new Set();
  snap.funcs.forEach((f) => {
    (f.args || []).forEach((a) => argSet.add(a));
    (f.paramNames || []).forEach((p) => paramSet.add(pyName(p)));
  });
  argSet.forEach((a) => paramSet.delete(a));
  out.push(symbolsLine(Array.from(argSet)));
  if (paramSet.size) out.push(symbolsLine(Array.from(paramSet).sort()) + '   # 参数也当符号，推导完再代值');
  out.push('');
  out.push('def _try(label, fn):');
  out.push('    try:');
  out.push('        print(label, fn())');
  out.push('    except Exception as e:');
  out.push("        print(label, '（sympy 没算出来：' + type(e).__name__ + '）')");
  out.push('');
  const vals = Array.from(paramSet).sort()
    .map((p) => p + ': ' + fmt(snap.params[Object.keys(snap.params).find((k) => pyName(k) === p)])).join(', ');
  if (paramSet.size) out.push('vals = {' + vals + '}   # 看见函数里此刻的参数值');
  else out.push('vals = {}');
  out.push('');

  snap.funcs.forEach((f) => {
    const L = f.label;
    const S = f.sympy || [];
    out.push('# ---------- ' + L + ' · ' + (f.kindLabel || f.kind) + ' ----------');
    if (f.py || !S.length) {
      out.push('# ' + L + ' 是 Python 函数，没有符号形式可推导');
      out.push('');
      return;
    }
    if (f.kind === 'fx') {
      out.push(L + ' = ' + S[0]);
      out.push("print('" + L + "(x)   =', " + L + ')');
      out.push("_try(\"" + L + "'(x)  =\", lambda: sp.simplify(sp.diff(" + L + ', x)))');
      out.push("_try(\"" + L + "''(x) =\", lambda: sp.simplify(sp.diff(" + L + ', x, 2)))');
      out.push("_try('∫" + L + " dx  =', lambda: sp.integrate(" + L + ', x))');
      out.push("_try('x→∞ 的极限 =', lambda: sp.limit(" + L + ', x, sp.oo))');
      out.push("_try('x=0 处展开 =', lambda: sp.series(" + L + ', x, 0, 5))');
      out.push('if ' + L + '.is_polynomial(x) or ' + L + '.is_rational_function(x):');
      out.push("    _try('驻点 f′(x)=0 :', lambda: sp.solve(sp.diff(" + L + '.subs(vals), x), x))');
      out.push("_try('代入参数后 f′(x) =', lambda: sp.diff(" + L + ', x).subs(vals))');
    } else if (f.kind === 'fxy') {
      out.push(L + ' = ' + S[0]);
      out.push("print('" + L + "(x, y) =', " + L + ')');
      out.push("_try('∂f/∂x =', lambda: sp.simplify(sp.diff(" + L + ', x)))');
      out.push("_try('∂f/∂y =', lambda: sp.simplify(sp.diff(" + L + ', y)))');
      out.push("_try('梯度 ∇f =', lambda: [sp.simplify(sp.diff(" + L + ', v)) for v in (x, y)])');
      out.push("_try('黑塞矩阵 H =', lambda: sp.hessian(" + L + ', (x, y)))');
      out.push('if ' + L + '.is_polynomial(x, y):');
      out.push("    _try('驻点 ∇f = 0 :', lambda: sp.solve([sp.diff(" + L + '.subs(vals), v) for v in (x, y)], [x, y], dict=True))');
    } else if (f.kind === 'param2') {
      out.push(L + 'x, ' + L + 'y = ' + S[0] + ', ' + S[1]);
      out.push("print('(x(t), y(t)) =', (" + L + 'x, ' + L + 'y))');
      out.push("_try('dx/dt =', lambda: sp.simplify(sp.diff(" + L + 'x, t)))');
      out.push("_try('dy/dt =', lambda: sp.simplify(sp.diff(" + L + 'y, t)))');
      out.push("_try('切线斜率 dy/dx =', lambda: sp.simplify(sp.diff(" + L + 'y, t) / sp.diff(' + L + 'x, t)))');
      const [a, b] = f.ranges.t;
      out.push("_try('弧长（数值）=', lambda: sp.N(sp.Integral(sp.sqrt(sp.diff(" + L + 'x, t)**2 + sp.diff(' + L +
        'y, t)**2).subs(vals), (t, ' + fmt(a) + ', ' + fmt(b) + '))))');
    } else if (f.kind === 'polar') {
      out.push(L + ' = ' + S[0] + '   # r(θ)');
      out.push("print('r(θ) =', " + L + ')');
      out.push("_try('dr/dθ =', lambda: sp.simplify(sp.diff(" + L + ', theta)))');
      out.push("_try('切线斜率 dy/dx =', lambda: sp.simplify(sp.diff(" + L + '*sp.sin(theta), theta) / sp.diff(' + L +
        '*sp.cos(theta), theta)))');
      const [a, b] = f.ranges.theta;
      out.push("_try('½∫r² dθ =', lambda: sp.integrate(" + L + '**2/2, (theta, ' + fmt(a) + ', ' + fmt(b) + ')).subs(vals))');
    } else if (f.kind === 'implicit') {
      out.push(L + ' = ' + S[0] + '   # F(x, y)，曲线是 F = 0');
      out.push("print('F(x, y) =', " + L + ')');
      out.push("_try('隐函数求导 dy/dx = −F_x/F_y =', lambda: sp.simplify(-sp.diff(" + L + ', x) / sp.diff(' + L + ', y)))');
      out.push("_try('与 x 轴的交点 =', lambda: sp.solve(" + L + '.subs(vals).subs(y, 0), x))');
    } else if (f.kind === 'psurf' || f.kind === 'sph') {
      if (f.kind === 'sph') {
        out.push(L + 'r = ' + S[0] + '   # r(θ, φ)');
        out.push(L + ' = sp.Matrix([' + L + 'r*sp.sin(phi)*sp.cos(theta), ' + L + 'r*sp.sin(phi)*sp.sin(theta), ' +
          L + 'r*sp.cos(phi)])');
        out.push("_try('r_θ × r_φ =', lambda: sp.simplify(" + L + '.diff(theta).cross(' + L + '.diff(phi))))');
      } else {
        out.push(L + ' = sp.Matrix([' + S.join(', ') + '])');
        out.push("print('r(u, v) =', list(" + L + '))');
        out.push("_try('r_u =', lambda: list(sp.simplify(" + L + '.diff(u))))');
        out.push("_try('r_v =', lambda: list(sp.simplify(" + L + '.diff(v))))');
        out.push("_try('法向量 r_u × r_v =', lambda: list(sp.simplify(" + L + '.diff(u).cross(' + L + '.diff(v)))))');
      }
    } else if (f.kind === 'curve3') {
      out.push(L + ' = sp.Matrix([' + S.join(', ') + '])');
      out.push("print('r(t) =', list(" + L + '))');
      out.push("_try('速度 r′(t) =', lambda: list(sp.simplify(" + L + '.diff(t))))');
      out.push("_try('速率 |r′(t)| =', lambda: sp.simplify(" + L + '.diff(t).norm()))');
      out.push("_try('曲率 κ =', lambda: sp.simplify(" + L + '.diff(t).cross(' + L + '.diff(t, 2)).norm() / ' + L +
        '.diff(t).norm()**3))');
    }
    out.push('');
  });
  out.push('# 把推导结果画回去：see(sp.diff(f1, x))，或 see(某个 sympy 表达式)');
  return { code: out.join('\n') + '\n' };
}

/** 浮窗里 see()/seen() 的演示片段 */
export const BRIDGE_DEMO = [
  '# Python ⇄ 看见函数：两个函数就够了',
  '#   see(...)  把式子 / sympy 表达式 / Python 函数画进「看见函数」',
  '#   seen()    取回「看见函数」里此刻的函数（可直接当 numpy 函数调用）',
  'import numpy as np',
  '',
  'def bump(x, a=1.0, w=2.0):        # 带默认值的关键字参数会变成看见函数里的滑块',
  '    return a * np.exp(-x**2 / w)',
  '',
  'see(bump, x=(-6, 6))              # Python 函数：每次拖滑块、平移画布都回到 Python 重新采样',
  'see("sin(x)/x", add=True)         # 字符串式子：交给看见函数自己解析，零点极值照常标',
  '',
  'fs = seen()                       # 取回来的是可调用对象',
  'for f in fs:',
  '    print(f, "  f(1) =", f(1.0))',
  '',
].join('\n');
