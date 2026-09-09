/* =========================================================================
 * 表达式内核 —— 「看见函数」的算式引擎
 * -------------------------------------------------------------------------
 * 一条流水线：文本 → token → AST → 三种产物
 *   1) compile()  编译成可反复调用的 JS 函数（数值求值，采样时最要紧）；
 *   2) toTex()    把 AST 写成 LaTeX（给人看的漂亮公式）；
 *   3) toText()   把 AST 写成纯文本（回灌给输入框，方便接着改）。
 *
 * 语法约定（都是中学/大学课本里的写法，尽量不让人意外）：
 *   - `^` 右结合，`-x^2` 是 `-(x^2)`，`2^-3` 合法；
 *   - 隐式乘法：`2x`、`3(x+1)`、`2\sin x`、`x(x-1)` 都当乘法；
 *   - 一元负号优先级低于 `^`、高于 `*`，所以 `-2x` 是 `(-2)·x`；
 *   - `n!` 是阶乘（走伽马函数，小数也能算）；`|x|` 是绝对值；
 *   - 除 x 以外的未知标识符一律当**可调参数**（a b k θ …），编译后可通过
 *     参数对象改值，这就是「拖滑块看形变」的根据。
 *
 * 对数底数的口径（中国教材习惯，与 Python/Desmos 不同，页面上有说明）：
 *   `ln` = 自然对数，`lg` 与 `log`(单参) = 常用对数（底 10），
 *   `log(b, x)` = 以 b 为底，`log2` = 底 2。
 * ========================================================================= */

/* ---------- 作用域：编译后的函数只能看到这里的符号 ---------- */

const log10 = Math.log10 || ((x) => Math.log(x) / Math.LN10);
const log2 = Math.log2 || ((x) => Math.log(x) / Math.LN2);
const csc = (x) => 1 / Math.sin(x);
const sec = (x) => 1 / Math.cos(x);
const cot = (x) => 1 / Math.tan(x);
const acot = (x) => Math.PI / 2 - Math.atan(x);
const asec = (x) => Math.acos(1 / x);
const acsc = (x) => Math.asin(1 / x);
const coth = (x) => 1 / Math.tanh(x);
const acoth = (x) => 0.5 * Math.log((x + 1) / (x - 1));
const asinh = Math.asinh || ((x) => Math.log(x + Math.sqrt(x * x + 1)));
const acosh = Math.acosh || ((x) => Math.log(x + Math.sqrt(x * x - 1)));
const atanh = Math.atanh || ((x) => 0.5 * Math.log((1 + x) / (1 - x)));
const sign = Math.sign || ((x) => (x > 0 ? 1 : x < 0 ? -1 : 0));
const trunc = Math.trunc || ((x) => (x < 0 ? Math.ceil(x) : Math.floor(x)));

/* 阶乘走伽马：n! = Γ(n+1)，非整数也有定义（半整数能算出 √π/2 那一类） */
function gammaFn(x) {
  if (x < 0 && Math.abs(x - Math.round(x)) < 1e-12) return NaN; /* 负整数极点 */
  return Math.exp(lgamma(x));
}
/* 阶乘：整数范围内老老实实连乘（兰佐斯近似在整数上会给出 120.0000000000003
   这种脏值，看着像算错了），超出再退回伽马函数。 */
function factorial(x) {
  if (Number.isInteger(x) && x >= 0 && x <= 170) {
    let r = 1;
    for (let i = 2; i <= x; i += 1) r *= i;
    return r;
  }
  return gammaFn(x + 1);
}

const LANCZOS = [
  676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012,
  9.9843695780195716e-6, 1.5056327351493116e-7,
];
function lgamma(z) {
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < LANCZOS.length; i += 1) x += LANCZOS[i] / (z + i + 1);
  const t = z + LANCZOS.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function gcd2(a, b) {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

/* 一元函数表：名字 → 实现。toTex 时按 TEX_FN 决定怎么排版。 */
const FN1 = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, cot, sec, csc,
  asin: Math.asin, acos: Math.acos, atan: Math.atan, acot, asec, acsc,
  arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan, arccot: acot,
  sinh: Math.sinh || ((x) => (Math.exp(x) - Math.exp(-x)) / 2),
  cosh: Math.cosh || ((x) => (Math.exp(x) + Math.exp(-x)) / 2),
  tanh: Math.tanh, coth,
  asinh, acosh, atanh, acoth,
  arsinh: asinh, arcosh: acosh, artanh: atanh,
  ln: Math.log, lg: log10, log: log10, log2, log10, exp: Math.exp,
  sqrt: Math.sqrt, abs: Math.abs, sign, floor: Math.floor, ceil: Math.ceil,
  round: Math.round, trunc, gamma: gammaFn,
  deg: (x) => (x * 180) / Math.PI, rad: (x) => (x * Math.PI) / 180,
};

/* 多参函数：参数个数不定的用 arity: -1 */
const FN_N = {
  pow: { fn: Math.pow, arity: 2 },
  mod: { fn: (a, b) => a - b * Math.floor(a / b), arity: 2 },
  rem: { fn: (a, b) => a % b, arity: 2 },
  atan2: { fn: Math.atan2, arity: 2 },
  root: { fn: (n, x) => (n % 2 === 1 && x < 0 ? -Math.pow(-x, 1 / n) : Math.pow(x, 1 / n)), arity: 2 },
  gcd: { fn: gcd2, arity: 2 },
  hypot: { fn: (a, b) => Math.sqrt(a * a + b * b), arity: 2 },
  /* log 有两个长相：log(x) 走 FN1 当常用对数，log(b,x) 走这里按底数算 */
  log: { fn: (b, x) => Math.log(x) / Math.log(b), arity: 2 },
  max: { fn: Math.max, arity: -1 },
  min: { fn: Math.min, arity: -1 },
};

/* 常量（不是参数） */
/* 黄金比刻意不预置：phi 是常用的希腊字母参数名，占了就没法当旋钮用了 */
const CONSTS = {
  pi: Math.PI, 'π': Math.PI, tau: Math.PI * 2, 'τ': Math.PI * 2,
  e: Math.E, inf: Infinity, '∞': Infinity,
};

/* 名字 ↔ LaTeX：希腊字母当参数时也要能漂亮地显示 */
const TEX_NAME = {
  alpha: '\\alpha', beta: '\\beta', gamma: '\\gamma', delta: '\\delta',
  epsilon: '\\epsilon', varepsilon: '\\varepsilon', zeta: '\\zeta', eta: '\\eta',
  theta: '\\theta', vartheta: '\\vartheta', iota: '\\iota', kappa: '\\kappa',
  lambda: '\\lambda', mu: '\\mu', nu: '\\nu', xi: '\\xi', pi: '\\pi',
  rho: '\\rho', sigma: '\\sigma', tau: '\\tau', upsilon: '\\upsilon',
  phi: '\\phi', varphi: '\\varphi', chi: '\\chi', psi: '\\psi', omega: '\\omega',
  Gamma: '\\Gamma', Delta: '\\Delta', Theta: '\\Theta', Lambda: '\\Lambda',
  Xi: '\\Xi', Pi: '\\Pi', Sigma: '\\Sigma', Phi: '\\Phi', Psi: '\\Psi',
  Omega: '\\Omega',
};

/* 函数名的 LaTeX 排版：true 表示用 \name(x) 形式 */
const TEX_FN = {
  sin: '\\sin', cos: '\\cos', tan: '\\tan', cot: '\\cot', sec: '\\sec', csc: '\\csc',
  asin: '\\arcsin', acos: '\\arccos', atan: '\\arctan', acot: '\\mathrm{arccot}',
  asec: '\\mathrm{arcsec}', acsc: '\\mathrm{arccsc}',
  arcsin: '\\arcsin', arccos: '\\arccos', arctan: '\\arctan', arccot: '\\mathrm{arccot}',
  sinh: '\\sinh', cosh: '\\cosh', tanh: '\\tanh', coth: '\\coth',
  asinh: '\\mathrm{arsinh}', acosh: '\\mathrm{arcosh}', atanh: '\\mathrm{artanh}',
  acoth: '\\mathrm{arcoth}',
  arsinh: '\\mathrm{arsinh}', arcosh: '\\mathrm{arcosh}', artanh: '\\mathrm{artanh}',
  ln: '\\ln', lg: '\\lg', log: '\\log', log2: '\\log_2', log10: '\\lg',
  exp: '\\exp', deg: '\\deg', rad: '\\mathrm{rad}', gamma: '\\Gamma',
};

const ALL_FN1 = Object.keys(FN1);
const ALL_FN_N = Object.keys(FN_N);

/* ---------- tokenizer ---------- */

const T_NUM = 'num';
const T_NAME = 'name';
const T_OP = 'op';
const T_LP = '(';
const T_RP = ')';
const T_BAR = '|';
const T_COMMA = ',';
const T_END = 'end';

/* 标识符允许 Unicode 字母（希腊字母可直接敲） */
const ID_START = /[A-Za-z\u0370-\u03ff\u0391-\u03a9\u03b1-\u03c9\u2100-\u214f]/;
const ID_BODY = /[0-9A-Za-z_'\u0370-\u03ff\u0391-\u03a9\u03b1-\u03c9\u2100-\u214f]/;

/* 中文排版里混进来的全角/花体符号 → ASCII */
const SUB_CHAR = {
  '×': '*', '⋅': '*', '·': '*', '∗': '*',
  '−': '-', '–': '-', '—': '-', '－': '-',
  '÷': '/', '∕': '/', '⁄': '/',
  '（': '(', '）': ')', '［': '(', '］': ')', '【': '(', '】': ')',
  '，': ',', '＋': '+', '＊': '*', '／': '/', '＜': '(', '＞': ')',
  '[': '(', ']': ')',
};

class ParseError extends Error {
  constructor(msg, pos) {
    super(msg);
    this.pos = pos;
    this.isParseError = true;
  }
}

function tokenize(src) {
  const toks = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    /* 数学文本里空格只起分隔作用（"2 sin x" 与 "2sin x" 同义），直接丢掉 */
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i += 1;
      continue;
    }
    /* 数字：1 / 1.5 / .5 / 1e-3 / 1.5E+10 */
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      const m = /^(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?/.exec(src.slice(i));
      toks.push({ t: T_NUM, v: parseFloat(m[0]), s: m[0], pos: i });
      i += m[0].length;
      continue;
    }
    if (ID_START.test(c)) {
      let j = i + 1;
      while (j < n && ID_BODY.test(src[j])) j += 1;
      toks.push({ t: T_NAME, v: src.slice(i, j), pos: i });
      i = j;
      continue;
    }
    if ('+-*/^%!'.includes(c)) {
      toks.push({ t: T_OP, v: c, pos: i });
      i += 1;
      continue;
    }
    if (c === '(') { toks.push({ t: T_LP, v: c, pos: i }); i += 1; continue; }
    if (c === ')') { toks.push({ t: T_RP, v: c, pos: i }); i += 1; continue; }
    if (c === '|') { toks.push({ t: T_BAR, v: c, pos: i }); i += 1; continue; }
    if (c === ',' || c === '，') { toks.push({ t: T_COMMA, v: ',', pos: i }); i += 1; continue; }
    /* 中文排版里混进来的全角/花体符号：统一折算成 ASCII，免得粘贴过来就报错 */
    if (SUB_CHAR[c]) {
      const v = SUB_CHAR[c];
      toks.push({ t: v === '(' ? T_LP : v === ')' ? T_RP : T_OP, v, pos: i });
      i += 1;
      continue;
    }
    /* 花括号是从 LaTeX 那边漏进来的：给一句能照做的提示，别只说「看不懂」 */
    if (c === '{' || c === '}') {
      throw new ParseError('这是 LaTeX 的花括号。分式请写 (1)/(2)，或切到 LaTeX 输入', i);
    }
    throw new ParseError('看不懂的字符 “' + c + '”', i);
  }
  toks.push({ t: T_END, v: '', pos: n });
  return toks;
}

/* ---------- 自变量 ----------
 * 2D 只有一个自变量 x；3D 曲面是 z = f(x, y)，要两个。
 * 谁当自变量由调用方通过 compile(src, { vars }) 指定，其余自由标识符一律当参数。
 * 大写写法（X、Y）也认，从别处粘过来的式子不至于报「不认识」。 */
const DEFAULT_VARS = ['x'];

function normalizeVars(v) {
  if (!v || !v.length) return DEFAULT_VARS.slice();
  return v.slice();
}

function matchVar(name, vars) {
  for (let i = 0; i < vars.length; i += 1) {
    if (name === vars[i]) return vars[i];
  }
  const up = name.toUpperCase();
  for (let i = 0; i < vars.length; i += 1) {
    if (up === vars[i].toUpperCase()) return vars[i];
  }
  return null;
}

/* ---------- Pratt parser ----------
 * 每个中缀算符记 [左绑定力, 右绑定力]：爬升时把 minBp 与左绑定力比，
 * 递归右子树时把右绑定力当 minBp 传下去。左绑定力 < 右绑定力 → 左结合。
 *
 *   加减 1/2    乘除 3/4    一元负号 5    幂 6/3    后缀 ! 8
 *
 * 三个要紧的后果：
 *   - 幂左绑定力 6 高于一元负号的 5，所以 -x^2 是 -(x^2)，不是 (-x)^2；
 *   - 幂右绑定力 3 低于 6，所以 a^b^c 归成 a^(b^c)（右结合）；
 *   - 幂右侧下限 3 恰好等于隐式乘法的绑定力，于是 2^3x 读作 2^(3x)
 *     （手写体里 ^ 后面的东西一直管到下一个加减号，这样才符合直觉）。 */
const BP = {
  '+': [1, 2], '-': [1, 2],
  '*': [3, 4], '/': [3, 4],
  '^': [6, 3],
  '!': [8, 0],
  unary: 5,
};

/* AST 节点统一成 {k: 类别, ...}，k 取值：
 *   num / var / const / neg / add / sub / mul / div / pow / fact / abs / call */
function parse(src, vars) {
  const VARS = normalizeVars(vars);
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const next = () => toks[p++];

  /* 一个「原子」从这里开始吗？（数字 / 名字 / 左括号 / 绝对值竖线） */
  function startsAtom(t) {
    return t.t === T_NUM || t.t === T_NAME || t.t === T_LP || t.t === T_BAR;
  }

  /* 隐式乘法：NUM|NAME|) 后面紧跟 NUM|NAME|( 时补一个 * */
  function implicitMulNext() {
    const t = peek();
    return t.t === T_NUM || t.t === T_NAME || t.t === T_LP;
  }
  function parseExpr(minBp) {
    let left = null;
    const t = peek();
    if (t.t === T_OP && (t.v === '-' || t.v === '+')) {
      next();
      const operand = parseExpr(BP.unary);
      left = t.v === '-' ? { k: 'neg', a: operand } : operand;
    } else {
      left = parseAtom();
    }
    for (;;) {
      const tk = peek();
      if (tk.t === T_OP && tk.v === '!') {
        if (BP['!'][0] < minBp) break;
        next();
        left = { k: 'fact', a: left };
        continue;
      }
      if (tk.t === T_OP && (tk.v === '+' || tk.v === '-' || tk.v === '*' || tk.v === '/' || tk.v === '^' || tk.v === '%')) {
        const [lbp, rbp] = BP[tk.v];
        if (lbp < minBp) break;
        next();
        const right = parseExpr(rbp);
        left = {
          k: tk.v === '+' ? 'add' : tk.v === '-' ? 'sub' : tk.v === '*' ? 'mul'
            : tk.v === '/' ? 'div' : tk.v === '^' ? 'pow' : 'mod',
          a: left,
          b: right,
        };
        continue;
      }
      /* 隐式乘法 */
      if (implicitMulNext() && BP['*'][0] >= minBp) {
        const right = parseExpr(BP['*'][1]);
        left = { k: 'mul', a: left, b: right };
        continue;
      }
      break;
    }
    return left;
  }

  function parseAtom() {
    const t = next();
    if (t.t === T_NUM) return { k: 'num', v: t.v };
    if (t.t === T_LP) {
      const inner = parseExpr(0);
      const close = next();
      if (close.t !== T_RP) throw new ParseError('括号没配对：缺一个右括号', close.pos);
      return inner;
    }
    if (t.t === T_BAR) {
      const inner = parseExpr(0);
      const close = next();
      if (close.t !== T_BAR) throw new ParseError('绝对值符号 |…| 没配对', close.pos);
      return { k: 'abs', a: inner };
    }
    if (t.t === T_NAME) {
      const name = t.v;
      /* 常量：pi、e、tau。常量后面跟括号不算调用，交给隐式乘法处理 */
      if (Object.prototype.hasOwnProperty.call(CONSTS, name)) {
        return { k: 'const', name, v: CONSTS[name] };
      }
      /* 自变量：x(x+1) 是乘法，不是函数调用，所以先于函数名判断。
         y 只在 3D（vars 里带 y）时是自变量，2D 下仍然是可调参数。 */
      const asVar = matchVar(name, VARS);
      if (asVar) return { k: 'var', name: asVar };

      const isFn1 = Object.prototype.hasOwnProperty.call(FN1, name);
      const isFnN = Object.prototype.hasOwnProperty.call(FN_N, name);

      /* 已知函数 + 括号：标准调用 */
      if ((isFn1 || isFnN) && peek().t === T_LP) {
        next();
        const args = [];
        if (peek().t !== T_RP) {
          for (;;) {
            args.push(parseExpr(0));
            if (peek().t === T_COMMA) { next(); continue; }
            break;
          }
        }
        if (next().t !== T_RP) throw new ParseError('函数 ' + name + ' 的括号没配对', t.pos);
        return makeCall(name, args, t.pos);
      }

      /* 已知函数不带括号：\sin x、\ln 2 这种手写体。吃掉后面一个「原子」当参数，
         所以 \sin x^2 是 (sin x)^2 —— 与课本上的读法一致。 */
      if (isFn1 && startsAtom(peek())) {
        return makeCall(name, [parseAtom()], t.pos);
      }

      /* 未知名字 + 左括号：单字母按乘法（a(x+1)），多字母多半是函数名写错了 */
      if (peek().t === T_LP && !isFn1 && !isFnN) {
        if (name.length > 1) throw new ParseError('不认识的函数 “' + name + '”', t.pos);
        return { k: 'var', name, isParam: true };
      }

      return { k: 'var', name, isParam: true };
    }
    if (t.t === T_END) throw new ParseError('算式没写完', t.pos);
    throw new ParseError('“' + t.v + '” 出现在这里不合适', t.pos);
  }

  /* 同名多长相（log）按参数个数挑一个：先看多参表是否凑巧对上，再落回一元表 */
  function makeCall(name, args, pos) {
    const spec = Object.prototype.hasOwnProperty.call(FN_N, name) ? FN_N[name] : null;
    if (spec && (spec.arity < 0 ? args.length >= 2 : args.length === spec.arity)) {
      return { k: 'call', name, args };
    }
    if (Object.prototype.hasOwnProperty.call(FN1, name)) {
      if (args.length !== 1) {
        throw new ParseError(name + ' 只接受 1 个参数，这里给了 ' + args.length + ' 个', pos);
      }
      return { k: 'call', name, args };
    }
    if (spec) {
      throw new ParseError(name + ' 要 ' + spec.arity + ' 个参数，这里给了 ' + args.length + ' 个', pos);
    }
    throw new ParseError('不认识的函数 “' + name + '”', pos);
  }

  const ast = parseExpr(0);
  const end = peek();
  if (end.t !== T_END) throw new ParseError('“' + end.v + '” 后面还有多余的东西', end.pos);
  return ast;
}

/* ---------- 收集参数（除自变量以外的自由标识符） ---------- */

function collectParams(ast) {
  const set = new Set();
  (function walk(node) {
    if (!node) return;
    switch (node.k) {
      case 'var':
        if (node.isParam) set.add(node.name);
        break;
      case 'num':
      case 'const':
        break;
      case 'neg':
      case 'abs':
      case 'fact':
        walk(node.a);
        break;
      case 'call':
        node.args.forEach(walk);
        break;
      default:
        walk(node.a);
        walk(node.b);
    }
  })(ast);
  return Array.from(set).sort();
}

/* ---------- 编译成 JS 函数 ---------- */

function codegen(node, vars) {
  switch (node.k) {
    case 'num':
      return '(' + node.v + ')';
    case 'const':
      return '(' + (isFinite(node.v) ? node.v : 'Infinity') + ')';
    case 'var':
      /* 自变量直接当形参名，参数走 P[...] */
      return vars.indexOf(node.name) >= 0
        ? node.name
        : 'P[' + JSON.stringify(node.name) + ']';
    /* 每一层递归都要把 vars 传下去，漏一层就认不出自变量了 */
    case 'neg':
      return '(-' + codegen(node.a, vars) + ')';
    case 'add':
      return '(' + codegen(node.a, vars) + '+' + codegen(node.b, vars) + ')';
    case 'sub':
      return '(' + codegen(node.a, vars) + '-' + codegen(node.b, vars) + ')';
    case 'mul':
      return '(' + codegen(node.a, vars) + '*' + codegen(node.b, vars) + ')';
    case 'div':
      return '(' + codegen(node.a, vars) + '/' + codegen(node.b, vars) + ')';
    case 'mod':
      return 'S.mod(' + codegen(node.a, vars) + ',' + codegen(node.b, vars) + ')';
    case 'pow':
      return 'S.pow(' + codegen(node.a, vars) + ',' + codegen(node.b, vars) + ')';
    case 'fact':
      return 'S.fact(' + codegen(node.a, vars) + ')';
    case 'abs':
      return 'Math.abs(' + codegen(node.a, vars) + ')';
    case 'call':
      if (Object.prototype.hasOwnProperty.call(FN_N, node.name)) {
        return 'S.' + node.name + '(' + node.args.map((a) => codegen(a, vars)).join(',') + ')';
      }
      return 'S.' + node.name + '(' + codegen(node.args[0], vars) + ')';
    default:
      throw new ParseError('内部错误：未知节点 ' + node.k, 0);
  }
}

/**
 * 编译。
 *   compile(src)                —— 一元：fn(P, x)
 *   compile(src, {vars:['x','y']}) —— 二元（3D 曲面）：fn(P, x, y)
 * P 是参数对象。编译出来的代码只认 S（函数表）、P 和自变量这几个形参，
 * 因此即使算式来自用户输入也碰不到全局作用域。
 */
export function compile(src, opts) {
  const vars = normalizeVars(opts && opts.vars);
  const ast = parse(src, vars);
  const params = collectParams(ast);
  const body = codegen(ast, vars);
  const scope = Object.assign({ pow: Math.pow, mod: FN_N.mod.fn, fact: factorial }, FN1);
  Object.keys(FN_N).forEach((k) => {
    /* log 两边都占了一个名字，交给下面那个看参数个数分派的版本 */
    if (k !== 'log') scope[k] = FN_N[k].fn;
  });
  scope.log = (...a) => (a.length === 1 ? log10(a[0]) : Math.log(a[1]) / Math.log(a[0]));
  let fn;
  try {
    /* 形参数就是自变量表，所以 3D 自动生成 (S, P, x, y) => … */
    fn = new Function('S', 'P', ...vars, 'return ' + body + ';').bind(null, scope);
  } catch (e) {
    throw new ParseError('算式没法变成可计算的形式：' + (e && e.message ? e.message : e), 0);
  }
  return { fn, params, ast, src, vars };
}

/* ---------- AST → LaTeX ---------- */

/* 优先级：越小越松。用来决定要不要给子表达式加括号。
 *   add 1 / mul 2 / neg 3 / pow 4 / 自带定界符的（分数、根号、绝对值）5
 * 函数调用给 4：它不带定界符，所以 \sin x 当幂的底数时必须写成
 * \left(\sin x\right)^2，否则 \sin x^2 会被读成 \sin(x^2)。 */
function nodePrec(n) {
  switch (n.k) {
    case 'add': case 'sub': return 1;
    case 'mul': case 'mod': return 2;
    case 'neg': return 3;
    case 'pow': return 4;
    case 'call': return 4;
    default: return 5; /* num / var / const / div / abs：都自带边界 */
  }
}

function wrapIf(node, min) {
  const tex = toTex(node);
  if (nodePrec(node) < min) return '\\left(' + tex + '\\right)';
  return tex;
}

const wrapParen = (tex) => '\\left(' + tex + '\\right)';

function numTex(v) {
  if (!isFinite(v)) return v > 0 ? '\\infty' : '-\\infty';
  if (Number.isInteger(v) && Math.abs(v) < 1e15) return String(v);
  return String(v);
}

function nameTex(name) {
  if (name === 'x' || name === 'y') return name;
  if (Object.prototype.hasOwnProperty.call(CONSTS, name)) {
    if (name === 'pi' || name === 'π') return '\\pi';
    if (name === 'tau' || name === 'τ') return '\\tau';
    if (name === 'e') return 'e';
    if (name === 'inf' || name === '∞') return '\\infty';
  }
  return TEX_NAME[name] || name;
}

export function toTex(node) {
  switch (node.k) {
    case 'num':
      return numTex(node.v);
    case 'const':
      return nameTex(node.name);
    case 'var':
      return nameTex(node.name);
    case 'neg': {
      /* -(-z) 就是 z，顺手化简，否则拆负号时会连出两个减号 */
      if (node.a.k === 'neg') return toTex(node.a.a);
      const a = node.a;
      /* 「数字系数 × 尾巴」整体取负写成 -2x 就够了：负号后面紧跟着系数，
         不会被误读成 (-2)·x 以外的意思，省一对括号清爽很多 */
      if (a.k === 'mul' && (a.a.k === 'num' || a.a.k === 'const')) return '-' + toTex(a);
      return '-' + wrapIf(a, 3);
    }
    case 'add':
      /* a + (-b) 直接写成 a-b：加减同级有结合律，加号后面跟负号只是难看 */
      return toTex(node.a) + (node.b.k === 'neg' ? '' : '+') + toTex(node.b);
    case 'sub':
      /* 减号右边必须比加减更紧：a-(b+c) 省了括号就成了 a-b+c，意思反了 */
      return toTex(node.a) + '-' + wrapIf(node.b, 2);
    case 'mul': {
      const a = node.a;
      const b = node.b;
      /* 一侧带负号时把负号提到整个乘积外面：2·(-x) 写成 -2x，
         比 2\left(-x\right) 顺眼，也跟手写一致 */
      if (b.k === 'neg') return toTex({ k: 'neg', a: { k: 'mul', a, b: b.a } });
      if (a.k === 'neg') return toTex({ k: 'neg', a: { k: 'mul', a: a.a, b } });
      /* 系数贴着写：2x、3\theta —— 手写体就是这样，不必画个乘号 */
      if (a.k === 'num' || a.k === 'const') {
        if (b.k === 'num' || b.k === 'const') return toTex(a) + '\\cdot ' + toTex(b);
        return toTex(a) + wrapIf(b, 3);
      }
      if ((a.k === 'var' || a.k === 'call') && (b.k === 'var' || b.k === 'call')) {
        return wrapIf(a, 2) + '\\,' + wrapIf(b, 2);
      }
      return wrapIf(a, 2) + '\\cdot ' + wrapIf(b, 2);
    }
    case 'div':
      return '\\frac{' + toTex(node.a) + '}{' + toTex(node.b) + '}';
    case 'mod':
      return wrapIf(node.a, 2) + '\\bmod ' + wrapIf(node.b, 2);
    case 'pow': {
      /* 平方根与倒数专门排版，看起来才像手写体 */
      if (isHalf(node.b)) return '\\sqrt{' + toTex(node.a) + '}';
      if (isMinusOne(node.b)) return '\\frac{1}{' + toTex(node.a) + '}';
      /* 分数/根号/绝对值自带边界，当底数时不必再套一层括号 */
      const selfBound = node.a.k === 'div' || node.a.k === 'abs' ||
        (node.a.k === 'call' && (node.a.name === 'sqrt' || node.a.name === 'root'));
      const base = selfBound || nodePrec(node.a) >= 5 ? toTex(node.a) : wrapParen(toTex(node.a));
      return base + '^{' + toTex(node.b) + '}';
    }
    case 'fact':
      return wrapIf(node.a, 5) + '!';
    case 'abs':
      return '\\left|' + toTex(node.a) + '\\right|';
    case 'call': {
      const a = node.args.map((x) => toTex(x)).join(',');
      if (node.name === 'sqrt') return '\\sqrt{' + a + '}';
      if (node.name === 'abs') return '\\left|' + a + '\\right|';
      if (node.name === 'root') return '\\sqrt[' + toTex(node.args[0]) + ']{' + toTex(node.args[1]) + '}';
      if (node.name === 'log' && node.args.length === 2) {
        return '\\log_{' + toTex(node.args[0]) + '}\\left(' + toTex(node.args[1]) + '\\right)';
      }
      const texName = TEX_FN[node.name] || '\\operatorname{' + node.name + '}';
      const arg = node.args.length === 1 ? node.args[0] : null;
      if (arg) {
        /* 单参数且已经自带括号（分数、根号、绝对值）就不重复加 \left( */
        if (arg.k === 'div' || arg.k === 'abs' || (arg.k === 'call' && (arg.name === 'sqrt' || arg.name === 'root'))) {
          return texName + ' ' + toTex(arg);
        }
        if (arg.k === 'pow' || arg.k === 'num' || arg.k === 'var' || arg.k === 'const') {
          return texName + ' ' + toTex(arg);
        }
        return texName + wrapParen(toTex(arg));
      }
      return texName + wrapParen(a);
    }
    default:
      return '?';
  }
}

/* 判断「指数是不是 1/2」：除法节点不算折叠成小数，得认 div(1,2) 这个长相 */
function isHalf(n) {
  if (n.k === 'num') return Math.abs(n.v - 0.5) < 1e-12;
  return n.k === 'div' && isNum(n.a, 1) && isNum(n.b, 2);
}
function isMinusOne(n) {
  if (n.k === 'num') return n.v === -1;
  return n.k === 'neg' && isNum(n.a, 1);
}
function isNum(n, v) {
  return n.k === 'num' && Math.abs(n.v - v) < 1e-12;
}

/* ---------- AST → 纯文本（回灌输入框） ---------- */

export function toText(node) {
  switch (node.k) {
    case 'num':
      return String(node.v);
    case 'const':
    case 'var':
      return node.name;
    case 'neg':
      return '-' + parenText(node.a, 3);
    case 'add':
      return toText(node.a) + (node.b.k === 'neg' ? '' : '+') + toText(node.b);
    case 'sub':
      return toText(node.a) + '-' + parenText(node.b, 2);
    case 'mul':
      return parenText(node.a, 2) + '*' + parenText(node.b, 2);
    case 'div':
      return parenText(node.a, 2) + '/' + parenText(node.b, 2);
    case 'mod':
      return 'mod(' + toText(node.a) + ',' + toText(node.b) + ')';
    case 'pow':
      return parenText(node.a, 5) + '^' + parenText(node.b, 5);
    case 'fact':
      return parenText(node.a, 5) + '!';
    case 'abs':
      return 'abs(' + toText(node.a) + ')';
    case 'call':
      return node.name + '(' + node.args.map(toText).join(',') + ')';
    default:
      return '?';
  }
}

function parenText(node, min) {
  const s = toText(node);
  if (nodePrec(node) < min) return '(' + s + ')';
  return s;
}

/* ---------- 对外便利接口 ---------- */

/**
 * 一次性把文本算成 { fn, tex, params, text, vars }；失败抛 ParseError。
 * 第二个参数透传给 compile，3D 用法：build('sin(x)*cos(y)', { vars: ['x','y'] })。
 */
export function build(src, opts) {
  const c = compile(src, opts);
  /* 参数默认值 1：先让图画出来，滑块再慢慢调 */
  const defaults = {};
  c.params.forEach((p) => { defaults[p] = 1; });
  c.defaults = defaults;
  c.tex = toTex(c.ast);
  c.text = toText(c.ast);
  return c;
}

export function evalAt(compiled, x, params) {
  try {
    return compiled.fn(params || compiled.defaults, x);
  } catch (e) {
    void e;
    return NaN;
  }
}

/** 二元求值（3D 曲面用） */
export function evalAt2(compiled, x, y, params) {
  try {
    return compiled.fn(params || compiled.defaults, x, y);
  } catch (e) {
    void e;
    return NaN;
  }
}

export { parse, tokenize, ParseError, FN1, FN_N, CONSTS, TEX_NAME, TEX_FN, ALL_FN1, ALL_FN_N, gammaFn };
