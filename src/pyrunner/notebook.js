/* =========================================================================
 * 数学笔记本（右下角「笔记」圆钮）
 * -------------------------------------------------------------------------
 * 定位：和 Jupyter 同构的轻量笔记本，但为「学数学」做了几处专门优化：
 *   1. 笔记单元支持 Markdown + $\LaTeX$（KaTeX 渲染），可以边推公式边写代码；
 *   2. 代码单元的 print 输出里写 $$...$$ / $...$ 会被渲染成公式，
 *      内置 show(x) 直接把对象转成 $\LaTeX$（sympy 在就走 sympy.latex）；
 *   3. 与右下角的 Py 浮窗**共用同一个 Python 命名空间**：
 *      笔记本里 x = 3，浮窗里 print(x) 就是 3，反过来也一样；
 *      单元可以「送到浮窗」继续调，浮窗里写顺手的代码可以「取回」成新单元。
 *
 * 存储：localStorage 的 ml-notebook:<ns>，按命名空间分空间（未登录本机 /
 * 登录后的账号空间），与学习进度同一套口径。输出不落盘（图片 base64 太大），
 * 打开后重跑一次就有了。
 *
 * 依赖：Pyodide 与执行入口由 enhancer 通过 api 注入（见 enhancer 的 toolApi）。
 * ========================================================================= */

import { nsKey, progressNS } from '../learning/progress';
import { saveSnippet } from './repo';
/* KaTeX 的加载与输出公式渲染和浮窗共用一份（mathout.js），别各拉各的 */
import { getKatex } from './mathout';
/* 代码补全与层叠，同样与浮窗共用 */
import { attachComplete, harvestWords } from './complete';
import { watchPanel, bringToFront } from './zorder';

const NB_KEY = 'ml-notebook';
const MAX_BOOKS = 20;
const MAX_CELLS = 300;

/* 笔记本专用的小工具函数：跑在每个单元之前，注入共享命名空间 */
const HELPER_PY = `
def _ml_nb_latex(x):
    try:
        import sympy as _sp
        return _sp.latex(x)
    except Exception:
        try:
            return x._repr_latex_()
        except Exception:
            return str(x)

def show(x):
    "把任意对象（最好是 sympy 表达式）打印成渲染好的公式"
    print("$$" + _ml_nb_latex(x) + "$$")

def show_eq(lhs, rhs):
    print("$$" + _ml_nb_latex(lhs) + " = " + _ml_nb_latex(rhs) + "$$")
`;

/* 模板库：g = 分组名。代码一律只用标准库 + numpy/matplotlib/sympy，
   后三个是 Pyodide 自带或按需自动安装的（见 enhancer 的 loadPackage）。
   带 sympy 的模板不用先点按钮——代码里 import 了就自动装。 */
const TEMPLATES = [
  { g: '—', label: '插入模板…', code: null },

  { g: '入门', label: '打印与变量', code: [
    'name = "数学阶梯"',
    'n = 12',
    'print(f"{name}：第 {n} 章")',
    'print("平方表：", [(i, i * i) for i in range(1, 6)])',
  ].join('\n') },
  { g: '入门', label: '循环与列表推导', code: [
    '# 前 10 个斐波那契数',
    'a, b = 0, 1',
    'fib = []',
    'for _ in range(10):',
    '    fib.append(a)',
    '    a, b = b, a + b',
    'print(fib)',
    'print("平方和 =", sum(x ** 2 for x in fib))',
  ].join('\n') },
  { g: '入门', label: '定义函数', code: [
    'def f(x):',
    '    return x ** 3 - 2 * x - 5',
    '',
    'for x in range(-2, 4):',
    '    print(x, "→", f(x))',
  ].join('\n') },
  { g: '入门', label: '质数筛', code: [
    'def sieve(n):',
    '    mark = [True] * (n + 1)',
    '    for i in range(2, int(n ** 0.5) + 1):',
    '        if mark[i]:',
    '            for j in range(i * i, n + 1, i):',
    '                mark[j] = False',
    '    return [i for i in range(2, n + 1) if mark[i]]',
    '',
    'print("100 以内的质数：", sieve(100))',
  ].join('\n') },

  { g: '符号计算', label: '符号求导', code: [
    'import sympy as sp',
    'x = sp.symbols("x")',
    'f = sp.sin(x) * sp.exp(x)',
    'show(f)                      # 原函数',
    'show(sp.diff(f, x))          # 一阶导',
    'print(sp.simplify(sp.diff(f, x)))',
  ].join('\n') },
  { g: '符号计算', label: '符号积分', code: [
    'import sympy as sp',
    'x = sp.symbols("x")',
    'show(sp.integrate(sp.exp(-x**2), (x, -sp.oo, sp.oo)))',
    'show(sp.integrate(sp.log(x), x))',
  ].join('\n') },
  { g: '符号计算', label: '极限与级数', code: [
    'import sympy as sp',
    'n = sp.symbols("n", positive=True)',
    'show(sp.limit((1 + 1/n)**n, n, sp.oo))   # 这就是 e',
    'show(sp.Sum(1/n**2, (n, 1, sp.oo)).doit())',
  ].join('\n') },
  { g: '符号计算', label: '泰勒展开', code: [
    'import sympy as sp',
    'x = sp.symbols("x")',
    'show(sp.series(sp.cos(x), x, 0, 8))',
    'print(sp.series(sp.exp(x), x, 0, 5))',
  ].join('\n') },
  { g: '符号计算', label: '解方程 / 方程组', code: [
    'import sympy as sp',
    'x, y = sp.symbols("x y")',
    'show(sp.solve(x ** 2 - 5 * x + 6, x))',
    'show(sp.solve([2 * x + y - 3, x - y + 1], [x, y]))',
  ].join('\n') },
  { g: '符号计算', label: '展开 / 因式分解 / 化简', code: [
    'import sympy as sp',
    'x, y = sp.symbols("x y")',
    'show(sp.expand((x + y) ** 3))',
    'show(sp.factor(x ** 3 - y ** 3))',
    'show(sp.simplify(sp.sin(x) ** 2 + sp.cos(x) ** 2))',
  ].join('\n') },
  { g: '符号计算', label: '符号矩阵', code: [
    'import sympy as sp',
    'A = sp.Matrix([[2, 1], [1, 3]])',
    'show(A)',
    'show(A.inv())',
    'print("特征值：", A.eigenvals())',
  ].join('\n') },
  { g: '符号计算', label: '解微分方程', code: [
    'import sympy as sp',
    'x = sp.symbols("x")',
    'y = sp.Function("y")',
    'ode = sp.Eq(sp.Derivative(y(x), x, 2) + y(x), 0)',
    'show(ode)',
    'show(sp.dsolve(ode))',
  ].join('\n') },

  { g: '数值方法', label: '黎曼和逼近面积', code: [
    'import numpy as np',
    'f = lambda t: t ** 2',
    'a, b, n = 0, 1, 50',
    'xs = np.linspace(a, b, n + 1)',
    'approx = sum(f(xs[i]) * (xs[i + 1] - xs[i]) for i in range(n))',
    'print("黎曼和 =", approx, " 精确值 =", 1 / 3)',
  ].join('\n') },
  { g: '数值方法', label: '梯形 / 辛普森积分', code: [
    'import numpy as np',
    'f = lambda t: np.sin(t)',
    'a, b, n = 0, np.pi, 100',
    'xs = np.linspace(a, b, n + 1)',
    'h = (b - a) / n',
    'trap = h * (f(xs).sum() - (f(a) + f(b)) / 2)',
    'print("梯形法 =", trap, "（精确值 2）")',
  ].join('\n') },
  { g: '数值方法', label: '牛顿法求根', code: [
    'f = lambda x: x ** 3 - 2 * x - 5',
    'df = lambda x: 3 * x ** 2 - 2',
    'x = 2.0',
    'for i in range(8):',
    '    x = x - f(x) / df(x)',
    '    print(f"第 {i + 1} 步：x = {x:.12f}")',
  ].join('\n') },
  { g: '数值方法', label: '欧拉法解微分方程', code: [
    '# y' + "' = -y,  y(0) = 1，精确解 y = e^(-t)",
    'h, T = 0.1, 2.0',
    't, y, hist = 0.0, 1.0, []',
    'while t < T - 1e-9:',
    '    hist.append((round(t, 2), round(y, 6)))',
    '    y, t = y + h * (-y), t + h',
    'print(hist[:6], "...")',
    'print("终点误差 =", abs(y - 2.718281828 ** (-1)))',
  ].join('\n') },
  { g: '数值方法', label: '差分近似导数', code: [
    'import math',
    'f = math.sin',
    'x, h = 1.0, 1e-5',
    'd1 = (f(x + h) - f(x - h)) / (2 * h)',
    'd2 = (f(x + h) - 2 * f(x) + f(x - h)) / h ** 2',
    'print("一阶导 ≈", d1, "（精确 cos(1) =", math.cos(1), "）")',
    'print("二阶导 ≈", d2, "（精确 -sin(1) =", -math.sin(1), "）")',
  ].join('\n') },

  { g: '线性代数', label: '线性方程组', code: [
    'import numpy as np',
    'A = np.array([[2.0, 1.0], [1.0, 3.0]])',
    'b = np.array([3.0, 5.0])',
    'x = np.linalg.solve(A, b)',
    'print("解 =", x)',
    'print("校验 A@x =", A @ x)',
  ].join('\n') },
  { g: '线性代数', label: '特征值与特征向量', code: [
    'import numpy as np',
    'A = np.array([[4.0, 1.0], [2.0, 3.0]])',
    'w, V = np.linalg.eig(A)',
    'print("特征值 =", w)',
    'print("特征向量（列）=\\n", V)',
    'print("行列式 =", np.linalg.det(A), " 迹 =", np.trace(A))',
  ].join('\n') },
  { g: '线性代数', label: '最小二乘拟合', code: [
    'import numpy as np',
    'x = np.array([0, 1, 2, 3, 4, 5], dtype=float)',
    'y = np.array([1.1, 1.9, 3.2, 3.8, 5.1, 6.0])',
    'A = np.vstack([x, np.ones_like(x)]).T',
    'k, b = np.linalg.lstsq(A, y, rcond=None)[0]',
    'print(f"拟合直线：y = {k:.3f}x + {b:.3f}")',
  ].join('\n') },

  { g: '概率统计', label: '蒙特卡洛 π', code: [
    'import random',
    'N = 20000',
    'hit = sum(1 for _ in range(N) if random.random() ** 2 + random.random() ** 2 <= 1)',
    'print("蒙特卡洛 π ≈", 4 * hit / N)',
  ].join('\n') },
  { g: '概率统计', label: '掷骰子与大数定律', code: [
    'import random',
    'N = 60000',
    'rolls = [random.randint(1, 6) for _ in range(N)]',
    'mean = sum(rolls) / N',
    'print("点数均值 ≈", round(mean, 4), "（理论 3.5）")',
    'for face in range(1, 7):',
    '    print(face, "点频率 =", round(rolls.count(face) / N, 4))',
  ].join('\n') },
  { g: '概率统计', label: '二项分布与直方图', code: [
    'import random',
    'import matplotlib.pyplot as plt',
    'N, n, p = 5000, 20, 0.3',
    'data = [sum(1 for _ in range(n) if random.random() < p) for _ in range(N)]',
    'plt.hist(data, bins=range(n + 2), align="left", rwidth=0.85)',
    'plt.title("二项分布 B(20, 0.3)")',
    'plt.xlabel("成功次数")',
    'plt.show()',
  ].join('\n') },
  { g: '概率统计', label: '正态分布采样', code: [
    'import statistics',
    'import random',
    'data = [random.gauss(0, 1) for _ in range(5000)]',
    'print("均值 =", round(statistics.mean(data), 4))',
    'print("标准差 =", round(statistics.stdev(data), 4))',
    'print("落在 ±1σ 内的比例 =",',
    '      round(sum(1 for d in data if -1 < d < 1) / len(data), 4), "（理论 0.6827）")',
  ].join('\n') },

  { g: '画图', label: '函数图像', code: [
    'import numpy as np',
    'import matplotlib.pyplot as plt',
    'x = np.linspace(-6, 6, 400)',
    'plt.plot(x, np.sin(x) / x, label="sin(x)/x")',
    'plt.axhline(0, color="#888", lw=0.8)',
    'plt.legend()',
    'plt.show()',
  ].join('\n') },
  { g: '画图', label: '参数曲线', code: [
    'import numpy as np',
    'import matplotlib.pyplot as plt',
    't = np.linspace(0, 2 * np.pi, 500)',
    'plt.plot(np.cos(t) ** 3, np.sin(t) ** 3)',
    'plt.gca().set_aspect("equal")',
    'plt.title("星形线 x=cos³t, y=sin³t")',
    'plt.show()',
  ].join('\n') },
  { g: '画图', label: '散点图', code: [
    'import numpy as np',
    'import matplotlib.pyplot as plt',
    'n = 300',
    'x = np.random.randn(n)',
    'y = 0.6 * x + np.random.randn(n) * 0.5',
    'plt.scatter(x, y, s=14, alpha=0.6)',
    'plt.title("相关与噪声")',
    'plt.show()',
  ].join('\n') },
  { g: '画图', label: '极坐标', code: [
    'import numpy as np',
    'import matplotlib.pyplot as plt',
    'theta = np.linspace(0, 6 * np.pi, 600)',
    'r = theta / (2 * np.pi)',
    'ax = plt.subplot(111, projection="polar")',
    'ax.plot(theta, r)',
    'ax.set_title("阿基米德螺线 r = θ / 2π")',
    'plt.show()',
  ].join('\n') },
  { g: '画图', label: '3D 曲面', code: [
    'import numpy as np',
    'import matplotlib.pyplot as plt',
    'x = np.linspace(-3, 3, 80)',
    'y = np.linspace(-3, 3, 80)',
    'X, Y = np.meshgrid(x, y)',
    'Z = np.sin(np.sqrt(X ** 2 + Y ** 2))',
    'ax = plt.subplot(111, projection="3d")',
    'ax.plot_surface(X, Y, Z, cmap="viridis")',
    'plt.show()',
  ].join('\n') },
  { g: '画图', label: '双子图对比', code: [
    'import numpy as np',
    'import matplotlib.pyplot as plt',
    'x = np.linspace(0, 4 * np.pi, 300)',
    'plt.subplot(2, 1, 1)',
    'plt.plot(x, np.sin(x))',
    'plt.title("sin 与它的傅里叶前 5 项")',
    'plt.subplot(2, 1, 2)',
    'approx = sum(np.sin((2 * k + 1) * x) / (2 * k + 1) for k in range(5))',
    'plt.plot(x, approx * 4 / np.pi)',
    'plt.show()',
  ].join('\n') },

  { g: '数学写法', label: 'show() 打印公式', code: [
    'import sympy as sp',
    'x = sp.symbols("x")',
    'show(sp.sqrt(x ** 2 + 1) / (x - 1))',
    'show_eq(sp.integrate(sp.exp(-x ** 2), (x, -sp.oo, sp.oo)), sp.sqrt(sp.pi))',
  ].join('\n') },
  { g: '数学写法', label: '图文混排输出', code: [
    'print("勾股定理：$a^2 + b^2 = c^2$")',
    'print("欧拉恒等式 $$e^{i\\\\pi} + 1 = 0$$")',
    'print("输出里写 $...$ 或 $$...$$ 都会被渲染成公式")',
  ].join('\n') },
];

/* ---------- 存储 ---------- */

let data = null;
let api = null;
let els = null;
let saveTimer = null;

function uid(p) {
  return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function load() {
  if (data) return data;
  if (typeof window === 'undefined') return { v: 1, books: [], activeId: null };
  try {
    const v = JSON.parse(window.localStorage.getItem(nsKey(NB_KEY)) || 'null');
    if (v && Array.isArray(v.books)) {
      data = v;
      return data;
    }
  } catch {
    /* 数据坏了：重建一份，不阻断 */
  }
  data = { v: 1, books: [starterBook()], activeId: null };
  data.activeId = data.books[0].id;
  persist();
  return data;
}

function persist() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(nsKey(NB_KEY), JSON.stringify(data));
  } catch {
    /* 配额满：笔记本太大时放弃写入，界面仍可用 */
  }
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 400);
}

function starterBook() {
  return {
    id: uid('b'),
    title: '我的笔记本',
    at: Date.now(),
    cells: [
      {
        id: uid('c'),
        kind: 'md',
        src: [
          '# 数学笔记本',
          '',
          '左边写推导，右边跑代码。公式直接写 $\\LaTeX$：',
          '',
          '$$ e^{i\\pi} + 1 = 0 $$',
          '',
          '- 代码单元和右下角的 **Py 浮窗**共用同一套变量；',
          '- 输出里写 `$x^2$` 会渲染成公式，`show(x)` 可以把对象转成公式；',
          '- `Ctrl+Enter` 运行当前单元。',
        ].join('\n'),
      },
      { id: uid('c'), kind: 'code', src: 'import math\nprint("π =", math.pi)\nprint("2**10 =", 2 ** 10)' },
      {
        id: uid('c'),
        kind: 'code',
        src: '# show() 会把结果渲染成公式（装了 sympy 就能打印符号表达式）\nshow("\\\\frac{a}{b} + \\\\sqrt{c}")\nprint("也可以混着写：勾股定理 $a^2+b^2=c^2$")',
      },
    ],
  };
}

function activeBook() {
  const d = load();
  let b = d.books.find((x) => x.id === d.activeId);
  if (!b) {
    b = d.books[0] || starterBook();
    if (!d.books.length) d.books.push(b);
    d.activeId = b.id;
  }
  return b;
}

/* KaTeX 的按需加载见 mathout.js（浮窗控制台与笔记本共用同一个实例） */

/* ---------- 渲染小工具 ---------- */

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function appendMath(box, tex, display, katex) {
  if (!katex) {
    box.appendChild(el('code', 'ml-nb__rawtex', (display ? '$$' : '$') + tex + (display ? '$$' : '$')));
    return;
  }
  try {
    const span = document.createElement('span');
    if (display) span.className = 'ml-nb__math';
    span.innerHTML = katex.renderToString(tex, { displayMode: display, throwOnError: false });
    box.appendChild(span);
  } catch {
    box.appendChild(el('code', 'ml-nb__rawtex', tex));
  }
}

/** 把一段纯文本塞进 box：连续的 $...$ 渲染成行内公式，其余当普通文本。 */
function appendTextWithMath(box, str, katex) {
  const segs = String(str).split(/(\$[^$\n]+?\$)/g);
  let buf = '';
  const flush = () => {
    if (buf) {
      box.appendChild(document.createTextNode(buf));
      buf = '';
    }
  };
  for (const seg of segs) {
    if (seg.length > 2 && seg.startsWith('$') && seg.endsWith('$')) {
      flush();
      appendMath(box, seg.slice(1, -1), false, katex);
    } else {
      buf += seg;
    }
  }
  flush();
}

/* 公式先抽成 token（私有区字符 U+E000 包裹的下标），排版完再换回 KaTeX 的 HTML——
   否则转义、切行、列表包装都会把 LaTeX 里的 < > & 弄坏。 */
const TOK = '\uE000';
const TOK_RE = new RegExp(TOK + '(\\d+)' + TOK, 'g');

/** 极简 Markdown：标题 / 列表 / 粗斜体 / 行内码 / 公式，够写数学笔记了。 */
function renderMd(src, katex) {
  const math = [];
  let s = String(src || '');
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (m, body) => {
    math.push({ d: true, body });
    return TOK + (math.length - 1) + TOK;
  });
  s = s.replace(/(^|[^\\$])\$([^$\n]+?)\$/g, (m, pre, body) => {
    math.push({ d: false, body });
    return pre + TOK + (math.length - 1) + TOK;
  });
  s = esc(s);

  const inline = (t) =>
    t
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');

  const out = [];
  let para = [];
  let ul = null;
  let ol = null;
  const flushPara = () => {
    if (para.length) {
      out.push('<p>' + inline(para.join('<br>')) + '</p>');
      para = [];
    }
  };
  const closeLists = () => {
    if (ul) {
      out.push('<ul>' + ul.join('') + '</ul>');
      ul = null;
    }
    if (ol) {
      out.push('<ol>' + ol.join('') + '</ol>');
      ol = null;
    }
  };
  for (const raw of s.split('\n')) {
    const line = raw.trim();
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      closeLists();
      flushPara();
      out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
      continue;
    }
    const li = line.match(/^[-*]\s+(.*)$/);
    if (li) {
      flushPara();
      if (ol) {
        out.push('<ol>' + ol.join('') + '</ol>');
        ol = null;
      }
      (ul = ul || []).push('<li>' + inline(li[1]) + '</li>');
      continue;
    }
    const oli = line.match(/^\d+[.)]\s+(.*)$/);
    if (oli) {
      flushPara();
      if (ul) {
        out.push('<ul>' + ul.join('') + '</ul>');
        ul = null;
      }
      (ol = ol || []).push('<li>' + inline(oli[1]) + '</li>');
      continue;
    }
    if (!line) {
      closeLists();
      flushPara();
      continue;
    }
    closeLists();
    para.push(line);
  }
  closeLists();
  flushPara();

  return out
    .join('')
    .replace(TOK_RE, (m, i) => {
      const it = math[Number(i)];
      if (!it) return '';
      if (!katex) return `<code>${esc((it.d ? '$$' : '$') + it.body + (it.d ? '$$' : '$'))}</code>`;
      try {
        return katex.renderToString(it.body, { displayMode: it.d, throwOnError: false });
      } catch {
        return `<code>${esc(it.body)}</code>`;
      }
    });
}

function autoGrow(ta) {
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight + 4, 520) + 'px';
}

/* ---------- 单元 ---------- */

function setStatus(s) {
  if (els) els.foot.textContent = s || defaultStatus();
}

function defaultStatus() {
  const ns = progressNS();
  const b = activeBook();
  return (
    `${b.cells.length} 个单元 · 与右下角 Py 浮窗共用同一套变量 · 存在` +
    (ns === ':guest' ? '本机（登录后存入账号空间）' : '账号 ' + ns.slice(1))
  );
}

async function runCell(cell, cellEl) {
  const out = cellEl.querySelector('.ml-nb__out');
  const stt = cellEl.querySelector('.ml-nb__cellstatus');
  out.classList.add('is-visible');
  out.innerHTML = '';
  stt.textContent = '运行中…';
  setStatus('运行中…（第一次要下载 Python 运行时，请稍等）');

  let katex = null;
  try {
    katex = await getKatex();
  } catch {
    /* 公式渲染不可用：退化为纯文本输出 */
  }

  const pushText = (s) => {
    const pre = el('pre', 'ml-nb__text');
    appendTextWithMath(pre, s, katex);
    out.appendChild(pre);
    out.scrollTop = out.scrollHeight;
  };

  try {
    const res = await api.exec(cell.src, {
      helpers: HELPER_PY,
      onText: (s, isErr) => {
        /* stderr 不逐行刷：最后统一用美化后的报错一次显示 */
        if (!isErr && s) pushText(s);
      },
      status: (s) => {
        stt.textContent = s;
      },
    });
    if (res.err) {
      out.innerHTML = '';
      out.appendChild(el('pre', 'ml-nb__err', api.prettify ? api.prettify(res.err) : res.err));
      stt.textContent = '出错 ✗';
    } else {
      (res.imgs || []).forEach((b64) => {
        const box = el('div', 'py-runner__img ml-nb__img');
        const img = document.createElement('img');
        img.src = 'data:image/png;base64,' + b64;
        img.alt = '单元输出的图像';
        box.appendChild(img);
        out.appendChild(box);
      });
      if (!out.childNodes.length) {
        out.appendChild(el('div', 'ml-nb__dim', '(运行完毕，无输出)'));
      }
      stt.textContent = '完成 ✔';
    }
  } catch (e) {
    out.appendChild(el('pre', 'ml-nb__err', String((e && e.message) || e)));
    stt.textContent = '出错 ✗';
  }
  setStatus('');
}

function moveCell(cell, dir) {
  const b = activeBook();
  const i = b.cells.findIndex((c) => c.id === cell.id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= b.cells.length) return;
  const tmp = b.cells[i];
  b.cells[i] = b.cells[j];
  b.cells[j] = tmp;
  persist();
  renderCells();
}

function removeCell(cell) {
  const b = activeBook();
  if (b.cells.length <= 1) {
    b.cells = [];
  } else {
    b.cells = b.cells.filter((c) => c.id !== cell.id);
  }
  persist();
  renderCells();
}

function addCell(kind, src, afterCell) {
  const b = activeBook();
  if (b.cells.length >= MAX_CELLS) {
    setStatus(`单个笔记本最多 ${MAX_CELLS} 个单元`);
    return null;
  }
  const cell = { id: uid('c'), kind, src: src || '' };
  const i = afterCell ? b.cells.findIndex((c) => c.id === afterCell.id) : -1;
  if (i >= 0) b.cells.splice(i + 1, 0, cell);
  else b.cells.push(cell);
  persist();
  renderCells();
  return cell;
}

function buildCellEl(cell) {
  const wrap = el('div', 'ml-nb__cell');
  wrap.dataset.id = cell.id;

  const bar = el('div', 'ml-nb__cellbar');
  const kind = el('span', 'ml-nb__kind', cell.kind === 'code' ? '代码' : '笔记');
  kind.classList.add(cell.kind === 'code' ? 'ml-nb__kind--code' : 'ml-nb__kind--md');
  bar.appendChild(kind);

  const mk = (label, title, fn) => {
    const b = el('button', 'ml-nb__mini', label);
    b.type = 'button';
    if (title) b.title = title;
    b.addEventListener('click', fn);
    return b;
  };

  bar.appendChild(mk('↑', '上移', () => moveCell(cell, -1)));
  bar.appendChild(mk('↓', '下移', () => moveCell(cell, 1)));
  bar.appendChild(mk('✕', '删除这个单元', () => removeCell(cell)));

  if (cell.kind === 'code') {
    bar.appendChild(mk('▶ 运行', '运行这个单元（Ctrl+Enter）', () => runCell(cell, wrap)));
    bar.appendChild(mk('⇄ 送到浮窗', '把这段代码装进右下角的 Py 浮窗继续调', () => {
      api.setSource(cell.src, '笔记本片段');
      setStatus('已送到浮窗');
    }));
    bar.appendChild(mk('存', '把这段代码存进代码仓库', () => {
      const first = (cell.src.split('\n')[0] || '').replace(/^#\s*/, '').slice(0, 40);
      const r = saveSnippet({ name: first || '笔记本片段', code: cell.src, from: '笔记本' });
      setStatus(r.ok ? '已存进代码仓库' : '存不进去：' + (r.reason === 'full' ? '仓库已满' : '存储空间不足'));
    }));
    const stt = el('span', 'ml-nb__cellstatus', '');
    bar.appendChild(stt);

    const ta = document.createElement('textarea');
    ta.className = 'ml-nb__code';
    ta.spellcheck = false;
    ta.value = cell.src;
    ta.placeholder = '写 Python，Ctrl+Enter 运行；变量与 Py 浮窗互通';
    requestAnimationFrame(() => autoGrow(ta));

    /* 代码补全：候选 = 静态词表 + 这个单元里自己起过的名字。
       挂在下面的 keydown 之前，补全吃下的 Tab 不会再多出两个空格。 */
    const ac = attachComplete(ta);
    const refreshAc = () => ac.setExtras(harvestWords(cell.src));
    refreshAc();

    ta.addEventListener('input', () => {
      cell.src = ta.value;
      autoGrow(ta);
      refreshAc();
      scheduleSave();
    });
    ta.addEventListener('keydown', (ev) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
        ev.preventDefault();
        runCell(cell, wrap);
      }
      if (ev.key === 'Tab') {
        ev.preventDefault();
        const s = ta.selectionStart;
        const e2 = ta.selectionEnd;
        ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(e2);
        ta.selectionStart = ta.selectionEnd = s + 2;
        cell.src = ta.value;
        refreshAc();
        scheduleSave();
      }
    });

    const out = el('div', 'ml-nb__out');
    wrap.append(bar, ta, out);
    return wrap;
  }

  /* ---- 笔记单元：默认渲染态，点一下进编辑态，失焦回渲染态 ---- */
  bar.appendChild(mk('编辑', '编辑这段笔记', () => setEditing(wrap, true)));
  bar.appendChild(mk('转代码', '复制一份成代码单元', () => {
    addCell('code', cell.src, cell);
  }));

  const view = el('div', 'ml-nb__mdview');
  view.innerHTML = '<p class="ml-nb__dim">（空笔记，点「编辑」写点什么）</p>';
  const ta = document.createElement('textarea');
  ta.className = 'ml-nb__md';
  ta.spellcheck = false;
  ta.value = cell.src;
  ta.placeholder = 'Markdown + $LaTeX$：# 标题、- 列表、**粗体**、$$公式$$';
  ta.style.display = 'none';
  requestAnimationFrame(() => autoGrow(ta));

  ta.addEventListener('input', () => {
    cell.src = ta.value;
    autoGrow(ta);
    scheduleSave();
    /* 编辑框被隐藏时（渲染态）还可能被外部改内容——公式面板就是这么插进来的。
       这时渲染区是可见的，改完必须立刻重画，否则用户看不到刚插的公式。 */
    if (ta.style.display === 'none') paintMd(wrap, cell);
  });
  ta.addEventListener('blur', () => setEditing(wrap, false));
  ta.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      ev.preventDefault();
      ta.blur();
    }
  });
  view.addEventListener('click', () => setEditing(wrap, true));

  wrap.append(bar, view, ta);
  wrap.__view = view;
  wrap.__ta = ta;
  paintMd(wrap, cell);
  return wrap;
}

function setEditing(wrap, on) {
  const ta = wrap.__ta;
  const view = wrap.__view;
  if (!ta || !view) return;
  ta.style.display = on ? '' : 'none';
  view.style.display = on ? 'none' : '';
  if (on) {
    autoGrow(ta);
    ta.focus();
  }
}

async function paintMd(wrap, cell) {
  const view = wrap.__view;
  if (!view) return;
  let katex = null;
  try {
    katex = await getKatex();
  } catch {
    /* 没有 KaTeX 也能看纯文本 */
  }
  if (!cell.src.trim()) {
    view.innerHTML = '<p class="ml-nb__dim">（空笔记，点「编辑」写点什么）</p>';
    return;
  }
  view.innerHTML = renderMd(cell.src, katex);
}

function renderCells() {
  if (!els) return;
  const b = activeBook();
  els.body.innerHTML = '';
  if (!b.cells.length) {
    els.body.appendChild(el('p', 'ml-nb__empty', '这个笔记本是空的。点上面的「＋ 代码」或「＋ 笔记」开始。'));
  }
  b.cells.forEach((c) => els.body.appendChild(buildCellEl(c)));
  setStatus('');
}

function renderBooks() {
  if (!els) return;
  const d = load();
  const sel = els.books;
  sel.innerHTML = '';
  d.books.forEach((b) => {
    const o = document.createElement('option');
    o.value = b.id;
    o.textContent = `${b.title}（${b.cells.length}）`;
    sel.appendChild(o);
  });
  sel.value = d.activeId;
  els.title.value = activeBook().title;
}

/* ---------- 面板 ---------- */

function build() {
  const panel = el('div', 'ml-notebook');
  panel.id = 'ml-notebook';

  /* 头部：标题 + 笔记本切换 + 整页 + 关闭 */
  const head = el('div', 'ml-notebook__head');
  const brand = el('span', 'ml-notebook__brand', '数学笔记本');
  const title = el('input', 'ml-notebook__title');
  title.type = 'text';
  title.placeholder = '笔记本名字';
  const books = document.createElement('select');
  books.className = 'ml-notebook__books';
  const btnNew = el('button', 'ml-notebook__hbtn', '＋ 新建');
  btnNew.type = 'button';
  btnNew.title = '新建一个笔记本';
  const btnDel = el('button', 'ml-notebook__hbtn', '删除');
  btnDel.type = 'button';
  btnDel.title = '删除当前笔记本';
  const btnMode = el('button', 'ml-notebook__hbtn', '整页');
  btnMode.type = 'button';
  btnMode.title = '在浮窗与整页之间切换';
  const btnClose = el('button', 'ml-notebook__close', '×');
  btnClose.type = 'button';
  btnClose.title = '关闭（Esc）';
  head.append(brand, title, books, btnNew, btnDel, btnMode, btnClose);

  /* 工具条 */
  const bar = el('div', 'ml-notebook__bar');
  const mkBtn = (label, cls, title, fn) => {
    const b = el('button', 'py-runner__btn' + (cls ? ' ' + cls : ''), label);
    b.type = 'button';
    if (title) b.title = title;
    b.addEventListener('click', fn);
    return b;
  };
  const btnCode = mkBtn('＋ 代码', '', '在末尾加一个代码单元', () => addCell('code', ''));
  const btnMd = mkBtn('＋ 笔记', 'py-runner__btn--ghost', '在末尾加一个笔记单元', () => addCell('md', ''));
  const btnRunAll = mkBtn('▶ 全部运行', '', '从上到下依次运行所有代码单元', runAll);
  const btnClearOut = mkBtn('清空输出', 'py-runner__btn--ghost', '清掉所有单元的 outputs', () => {
    renderCells();
    setStatus('输出已清空');
  });
  const btnFromConsole = mkBtn('⇅ 取回浮窗代码', 'py-runner__btn--ghost', '把 Py 浮窗编辑器里的代码拿进来当新单元', () => {
    const src = api.getSource ? api.getSource() : '';
    if (!src.trim()) {
      setStatus('浮窗编辑器是空的');
      return;
    }
    addCell('code', src);
    setStatus('已把浮窗代码取回成一个新单元');
  });
  /* 公式输入器：符号面板 + 实时预览，插到光标处（与浮窗的「公式」是同一个） */
  const btnFx = mkBtn('公式…', 'py-runner__btn--ghost', '打开公式输入器：符号面板 + 实时预览，插入到光标处', async () => {
    try {
      const mod = await import('./formula');
      await mod.openFormula();
    } catch (e) {
      setStatus('公式面板打不开：' + ((e && e.message) || e));
    }
  });
  const tpl = document.createElement('select');
  tpl.className = 'ml-notebook__tpl';
  /* 按 g 字段分组：模板一多，一个平铺的下拉根本翻不过来 */
  let lastGroup = null;
  let groupEl = null;
  TEMPLATES.forEach((t, i) => {
    if (t.g !== lastGroup) {
      lastGroup = t.g;
      if (t.g !== '—') {
        groupEl = document.createElement('optgroup');
        groupEl.label = t.g;
        tpl.appendChild(groupEl);
      } else {
        groupEl = null;
      }
    }
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = t.label;
    (groupEl || tpl).appendChild(o);
  });
  tpl.addEventListener('change', () => {
    const t = TEMPLATES[Number(tpl.value)];
    tpl.value = '0';
    if (!t || !t.code) return;
    addCell('code', t.code);
    setStatus('已插入模板：' + t.label);
  });
  bar.append(btnCode, btnMd, btnRunAll, btnClearOut, btnFromConsole, btnFx, tpl);

  const body = el('div', 'ml-notebook__body');
  const foot = el('div', 'ml-notebook__foot', '');
  panel.append(head, bar, body, foot);
  document.body.appendChild(panel);

  /* 拖动：头部按下（避开按钮/输入框） */
  let drag = null;
  head.addEventListener('pointerdown', (ev) => {
    if (ev.target.closest('button, input, select')) return;
    if (panel.classList.contains('is-fullpage')) return;
    const r = panel.getBoundingClientRect();
    panel.style.transform = 'none';
    panel.style.left = r.left + 'px';
    panel.style.top = r.top + 'px';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    drag = { dx: ev.clientX - r.left, dy: ev.clientY - r.top };
    head.setPointerCapture(ev.pointerId);
  });
  head.addEventListener('pointermove', (ev) => {
    if (!drag || ev.buttons === 0) {
      drag = null;
      return;
    }
    const w = panel.offsetWidth;
    const h = panel.offsetHeight;
    panel.style.left = Math.min(Math.max(ev.clientX - drag.dx, 8), window.innerWidth - w - 8) + 'px';
    panel.style.top = Math.min(Math.max(ev.clientY - drag.dy, 8), window.innerHeight - h - 8) + 'px';
  });
  const endDrag = () => {
    drag = null;
  };
  head.addEventListener('pointerup', endDrag);
  head.addEventListener('pointercancel', endDrag);
  head.addEventListener('lostpointercapture', endDrag);

  btnClose.addEventListener('click', () => closeNotebook());
  btnMode.addEventListener('click', () => {
    const full = panel.classList.toggle('is-fullpage');
    btnMode.textContent = full ? '浮窗' : '整页';
    if (!full) {
      panel.style.left = '';
      panel.style.top = '';
    }
  });
  title.addEventListener('input', () => {
    activeBook().title = title.value.slice(0, 60) || '未命名';
    scheduleSave();
  });
  books.addEventListener('change', () => {
    const d = load();
    d.activeId = books.value;
    persist();
    renderBooks();
    renderCells();
  });
  btnNew.addEventListener('click', () => {
    const d = load();
    if (d.books.length >= MAX_BOOKS) {
      setStatus(`最多 ${MAX_BOOKS} 个笔记本`);
      return;
    }
    const b = { id: uid('b'), title: '新笔记本 ' + (d.books.length + 1), at: Date.now(), cells: [] };
    d.books.push(b);
    d.activeId = b.id;
    persist();
    renderBooks();
    renderCells();
  });
  btnDel.addEventListener('click', () => {
    const d = load();
    if (d.books.length <= 1) {
      setStatus('至少留一个笔记本');
      return;
    }
    const b = activeBook();
    if (!window.confirm(`删除笔记本《${b.title}》？`)) return;
    d.books = d.books.filter((x) => x.id !== b.id);
    d.activeId = d.books[0].id;
    persist();
    renderBooks();
    renderCells();
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && panel.classList.contains('is-open')) closeNotebook();
  });

  /* 参与层叠：点到谁谁在最上面（控制台 / 笔记本 / 仓库共用 zorder 的栈） */
  watchPanel(panel);
  els = { panel, body, foot, books, title };
  return els;
}

async function runAll() {
  const b = activeBook();
  const cells = b.cells.filter((c) => c.kind === 'code');
  if (!cells.length) {
    setStatus('没有代码单元');
    return;
  }
  for (const cell of cells) {
    const cellEl = els.body.querySelector(`.ml-nb__cell[data-id="${cell.id}"]`);
    if (!cellEl) continue;
    cellEl.scrollIntoView({ block: 'nearest' });
    /* 串行运行：单元之间常有先后依赖（同一命名空间），并行会互相打断 */
    // eslint-disable-next-line no-await-in-loop
    await runCell(cell, cellEl);
  }
  setStatus(`全部运行完毕（${cells.length} 个代码单元）`);
}

/* ---------- 对外 ---------- */

export async function openNotebook(toolApi) {
  api = toolApi;
  if (!els || !document.contains(els.panel)) build();
  load();
  renderBooks();
  renderCells();
  els.panel.classList.add('is-open');
  bringToFront(els.panel);
  /* 先摸一下 KaTeX：等用户写完笔记再加载就慢了 */
  try {
    await getKatex();
    renderCells();
  } catch {
    /* 加载失败就是没公式，不打断使用 */
  }
}

export function closeNotebook() {
  if (els) els.panel.classList.remove('is-open');
  /* data 为 null 说明从没打开过（load() 没跑），此时 persist() 会写进去一个 "null"，
     把用户已有的笔记本抹掉——只在这一轮真的读过数据时才落盘。 */
  if (data) persist();
}

export function isNotebookOpen() {
  return !!(els && els.panel.classList.contains('is-open'));
}
