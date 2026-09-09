/* =========================================================================
 * LaTeX → 算式 —— 把「拼出来的公式」翻译成内核能算的文本
 * -------------------------------------------------------------------------
 * 符号键盘敲出来的都是 LaTeX（`\frac{2x+1}{x-1}`），而 expr.js 吃的是普通
 * 算式文本（`(2*x+1)/(x-1)`）。这个模块就是两者之间的翻译，只覆盖「一元函数
 * 表达式」需要的那一小片 LaTeX：分式、根式、上下标、\left…\right、函数名、
 * 希腊字母。遇到求和、积分、矩阵这类超出范围的，给一句能照做的提示，
 * 而不是抛一句谁也看不懂的解析错。
 *
 * 两条不那么显然的约定：
 *   1. 函数后面缺参数时默认补 x。点一下 \sin 就想看见 sin(x) 的曲线，
 *      这是「边拼边看」体验的前提，不能因为没填完就报红。
 *   2. `\sin^{-1} x` 按排版传统译作 asin(x)（反正弦），不是 1/sin(x)。
 *      想要倒数就写 `\left(\sin x\right)^{-1}`。
 * ========================================================================= */

import { FN1, FN_N, CONSTS, TEX_NAME, build, ParseError } from './expr.js';

/* LaTeX 命令 → 内部函数名 */
const CMD_FN = {
  '\\sin': 'sin', '\\cos': 'cos', '\\tan': 'tan', '\\cot': 'cot',
  '\\sec': 'sec', '\\csc': 'csc',
  '\\arcsin': 'asin', '\\arccos': 'acos', '\\arctan': 'atan',
  '\\arccot': 'acot', '\\arcsec': 'asec', '\\arccsc': 'acsc',
  '\\sinh': 'sinh', '\\cosh': 'cosh', '\\tanh': 'tanh', '\\coth': 'coth',
  '\\ln': 'ln', '\\lg': 'lg', '\\log': 'log', '\\exp': 'exp', '\\deg': 'deg',
};

/* \sin^{-1} 这类「反函数」写法 */
const INVERSE = {
  sin: 'asin', cos: 'acos', tan: 'atan', cot: 'acot', sec: 'asec', csc: 'acsc',
  sinh: 'asinh', cosh: 'acosh', tanh: 'atanh', coth: 'acoth',
};

/* 希腊字母命令 → 拉丁转写（反过来用 expr.js 的 TEX_NAME） */
const GREEK = (() => {
  const m = {};
  Object.keys(TEX_NAME).forEach((latin) => {
    m[TEX_NAME[latin]] = latin;
  });
  return m;
})();

/* 纯排版命令：看见了就当没看见 */
const SPACING = new Set([
  '\\!', '\\,', '\\:', '\\;', '\\ ', '\\quad', '\\qquad',
  '\\thinspace', '\\negthinspace', '\\enspace', '\\hspace', '\\kern', '\\mkern',
]);

/* 明确超出「函数表达式」范围的东西，单独给提示 */
const UNSUPPORTED = {
  '\\sum': '求和符号（本站的「看见函数」只画一元函数的曲线）',
  '\\prod': '连乘符号',
  '\\int': '积分符号（要算面积请用面板上的「∫ 面积」工具）',
  '\\iint': '二重积分符号',
  '\\oint': '曲线积分符号',
  '\\lim': '极限符号',
  '\\begin': '多行环境 / 矩阵',
  '\\\\': '换行（这里只支持单行公式）',
  '\\overline': '上划线',
  '\\vec': '向量记号',
  '\\hat': '帽号',
  '\\bar': '上划线',
  '\\dot': '点记号',
  '\\text': '文字框（把里面的文字直接删掉即可）',
  '\\mbox': '文字框',
  '\\mathbb': '数集记号（如 \\mathbb{R}），这里只认算式',
  '\\mathcal': '花体记号',
  '\\mathbf': '粗体记号',
  '\\binom': '组合数（暂未支持）',
  '\\pm': '正负号（一个式子只能是一条曲线，请分别写两个）',
  '\\mp': '正负号',
};

class TexError extends Error {
  constructor(msg) {
    super(msg);
    this.isParseError = true;
  }
}

/* ---------- tokenizer ---------- */

const C_CMD = 'cmd';
const C_LB = '{';
const C_RB = '}';
const C_SUP = '^';
const C_SUB = '_';
const C_AMP = '&';
const C_CHAR = 'char';

function texTokens(src) {
  const toks = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    /* % 起头是 LaTeX 注释，整行丢掉 */
    if (c === '%') {
      while (i < n && src[i] !== '\n') i += 1;
      continue;
    }
    if (c === '\\') {
      const m = /^\\([A-Za-z]+|.)/.exec(src.slice(i));
      if (!m) throw new TexError('反斜杠后面空空如也');
      toks.push({ t: C_CMD, v: m[0], pos: i });
      i += m[0].length;
      continue;
    }
    if (c === '{' || c === '}' || c === '^' || c === '_' || c === '&') {
      toks.push({ t: c, v: c, pos: i });
      i += 1;
      continue;
    }
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i += 1;
      continue;
    }
    toks.push({ t: C_CHAR, v: c, pos: i });
    i += 1;
  }
  return toks;
}

/* ---------- 转换 ---------- */

/* 已知名字集合：用来把裸字母序列切成一个个标识符（theta / sinx / xy） */
const KNOWN = new Set(['x', 'X']);
Object.keys(FN1).forEach((k) => KNOWN.add(k));
Object.keys(FN_N).forEach((k) => KNOWN.add(k));
Object.keys(CONSTS).forEach((k) => KNOWN.add(k));
Object.keys(TEX_NAME).forEach((k) => KNOWN.add(k));

const OP_CHARS = '+-*/,!<>';

export function texToText(tex) {
  const toks = texTokens(tex);
  let p = 0;
  const peek = () => toks[p] || { t: 'eof', v: '', pos: toks.length };
  const take = () => toks[p++];

  /* 读一个完整「项」并挂到 items 上 */
  function readItem(items) {
    const t = take();
    if (t.t === C_LB) {
      const inner = convSeq();
      if (peek().t !== C_RB) throw new TexError('花括号没配对：缺一个 }');
      take();
      push(items, { kind: 'atom', text: '(' + inner + ')' });
      return;
    }
    if (t.t === C_CHAR) {
      readChar(items, t);
      return;
    }
    if (t.t !== C_CMD) {
      if (t.t === C_AMP) throw new TexError('不支持 & 对齐符');
      throw new TexError('“' + t.v + '” 出现在这里不合适');
    }
    readCmd(items, t);
  }

  /* 字符：数字合成一个数、字母序列按「最长已知名」切分、运算符单独成项 */
  function readChar(items, t) {
    if (/[0-9]/.test(t.v) || t.v === '.') {
      let s = t.v;
      while (peek().t === C_CHAR && /[0-9.]/.test(peek().v)) s += take().v;
      push(items, { kind: 'atom', text: s });
      return;
    }
    if (/[A-Za-z]/.test(t.v)) {
      let s = t.v;
      while (peek().t === C_CHAR && /[A-Za-z]/.test(peek().v)) s += take().v;
      /* 从长到短贪心切：sinx → sin + x，theta → theta，abc → a + b + c */
      let i = 0;
      while (i < s.length) {
        let len = Math.min(s.length - i, 12);
        for (; len >= 1; len -= 1) {
          if (KNOWN.has(s.slice(i, i + len))) break;
        }
        if (len < 1) {
          /* 没预置过的字母（y、u、v、t …）一律当参数名，单个字母为单位。
             这样 xy 是 x·y，abc 是 a·b·c，跟课本里的写法一致。 */
          push(items, { kind: 'atom', text: s[i] });
          i += 1;
          continue;
        }
        const word = s.slice(i, i + len);
        i += len;
        if (Object.prototype.hasOwnProperty.call(FN1, word) && peek().t === C_LB) {
          /* 带花括号参数的已知一元函数：sin{x} → sin(x) */
          take();
          const inner = convSeq();
          if (peek().t !== C_RB) throw new TexError('花括号没配对：缺一个 }');
          take();
          push(items, { kind: 'atom', text: word + '(' + inner + ')' });
        } else if (Object.prototype.hasOwnProperty.call(FN1, word)) {
          push(items, { kind: 'func', name: word, pow: null, sub: null });
        } else {
          push(items, { kind: 'atom', text: word === 'X' ? 'x' : word });
        }
      }
      return;
    }
    if (OP_CHARS.includes(t.v) || '()[]|'.includes(t.v)) {
      /* 括号与运算符原样成项：{x+1} 会一路拼成 (x+1)，省掉专门的分组逻辑。
         标记为 op，于是不会被前面那个待喂参数的函数吃掉——
         \sin(x) 因此是 sin(x)，而不是 sin( 后头再跟一串。 */
      push(items, { kind: 'atom', text: t.v, op: true });
      return;
    }
    if (t.v === ' ') return;
    throw new TexError('看不懂的字符 “' + t.v + '”');
  }

  function readCmd(items, t) {
    const v = t.v;

    if (SPACING.has(v)) {
      /* \hspace{1em} 这类还带一个参数，照样吃掉 */
      if (v === '\\hspace' || v === '\\kern' || v === '\\mkern') readArg();
      return;
    }
    if (Object.prototype.hasOwnProperty.call(UNSUPPORTED, v)) {
      throw new TexError('暂不支持 ' + UNSUPPORTED[v]);
    }

    if (v === '\\frac' || v === '\\dfrac' || v === '\\tfrac' || v === '\\cfrac') {
      const a = readArg();
      const b = readArg();
      push(items, { kind: 'atom', text: '((' + a + ')/(' + b + '))' });
      return;
    }
    if (v === '\\sqrt') {
      let idx = null;
      /* 可选参数 [n]：\sqrt[3]{x} */
      if (peek().t === C_CHAR && peek().v === '[') {
        take();
        let s = '';
        while (peek().t !== 'eof' && !(peek().t === C_CHAR && peek().v === ']')) {
          s += convOneChar();
        }
        if (peek().t === 'eof') throw new TexError('\\sqrt[ 没配上 ]');
        take();
        idx = s;
      }
      const a = readArg();
      push(items, { kind: 'atom', text: idx ? 'root(' + idx + ',' + a + ')' : 'sqrt(' + a + ')' });
      return;
    }
    if (v === '\\left') {
      const left = take();
      const inner = convSeq('\\right');
      if (peek().t !== C_CMD || peek().v !== '\\right') throw new TexError('\\left 没配上 \\right');
      take();
      const right = take();
      void right;
      const d = delimOf(left);
      if (d === 'abs') push(items, { kind: 'atom', text: 'abs(' + inner + ')' });
      else if (d === 'none') push(items, { kind: 'atom', text: '(' + inner + ')' });
      else push(items, { kind: 'atom', text: '(' + inner + ')' });
      return;
    }
    if (v === '\\right') throw new TexError('多出来一个 \\right');
    if (v === '\\middle') throw new TexError('不支持 \\middle');

    if (v === '\\placeholder') {
      /* 键盘留的空位：算的时候先当 1，让曲线立刻画出来，UI 另外提示「还没填完」 */
      readArg();
      push(items, { kind: 'atom', text: '1' });
      return;
    }
    if (v === '\\infty') { push(items, { kind: 'atom', text: 'inf' }); return; }
    if (v === '\\cdot' || v === '\\times' || v === '\\ast' || v === '\\bullet') {
      push(items, { kind: 'atom', text: '*', op: true });
      return;
    }
    if (v === '\\div') { push(items, { kind: 'atom', text: '/', op: true }); return; }
    if (v === '\\circ') { push(items, { kind: 'atom', text: '*', op: true }); return; }
    if (v === '\\bmod' || v === '\\mod') { push(items, { kind: 'atom', text: ',', op: true }); return; }
    if (v === '\\mathrm' || v === '\\operatorname' || v === '\\text' ||
        v === '\\textrm' || v === '\\hbox') {
      const a = readArg();
      if (v === '\\operatorname') {
        if (!Object.prototype.hasOwnProperty.call(FN1, a)) {
          throw new TexError('不认识的函数 “' + a + '”');
        }
        push(items, { kind: 'func', name: a, pow: null, sub: null });
      } else {
        push(items, { kind: 'atom', text: a.replace(/[^A-Za-z0-9]/g, '') || '1' });
      }
      return;
    }
    if (Object.prototype.hasOwnProperty.call(CMD_FN, v)) {
      const name = CMD_FN[v];
      /* \sin(x) 这种「函数名紧跟括号」：把括号里整段直接当参数。
         少了这一步，"(" 会被当成结构性字符跳过，函数只能捞到后面的 x，
         拼出 sin(x)(x) 这种鬼东西。 */
      if (peek().t === C_CHAR && peek().v === '(') {
        push(items, { kind: 'atom', text: name + '(' + readParenGroup('(', ')') + ')' });
        return;
      }
      push(items, { kind: 'func', name, pow: null, sub: null });
      return;
    }
    if (Object.prototype.hasOwnProperty.call(GREEK, v)) {
      push(items, { kind: 'atom', text: GREEK[v] });
      return;
    }
    throw new TexError('不认识的 LaTeX 命令 “' + v + '”');
  }

  function delimOf(tok) {
    if (tok.t === C_CMD) {
      if (tok.v === '|' || tok.v === '\\|') return 'abs';
      if (tok.v === '.') return 'none';
      if (tok.v === '\\{' || tok.v === '\\}' || tok.v === '\\langle' ||
          tok.v === '\\rangle' || tok.v === '\\lceil' || tok.v === '\\rceil' ||
          tok.v === '\\lfloor' || tok.v === '\\rfloor' || tok.v === '/' ||
          tok.v === '\\backslash') return 'none';
      throw new TexError('不支持的定界符 “' + tok.v + '”');
    }
    if (tok.v === '|') return 'abs';
    if (tok.v === '(' || tok.v === '[' || tok.v === '.') return 'none';
    throw new TexError('\\left 后面应该跟一个定界符（如 ( 或 |）');
  }

  /* 供 \sqrt[…] 的可选参数用：这里只可能出现「一个东西」，
     但那一个东西也可能是空位（ⁿ√ 按钮就是这么拼出来的）或一组花括号 */
  function convOneChar() {
    const t = take();
    if (t.t === C_LB) {
      const inner = convSeq();
      if (peek().t !== C_RB) throw new TexError('花括号没配对：缺一个 }');
      take();
      return '(' + inner + ')';
    }
    if (t.t === C_CMD) {
      if (t.v === '\\placeholder') {
        readArg();
        return '1';
      }
      if (Object.prototype.hasOwnProperty.call(GREEK, t.v)) return GREEK[t.v];
      if (t.v === '\\pi') return 'pi';
      throw new TexError('\\sqrt[…] 里不支持 “' + t.v + '”');
    }
    return t.v;
  }

  /* 读一对括号（可嵌套）：( … ) */
  function readParenGroup(open, close) {
    take(); /* 吃掉左括号 */
    const inner = convSeq(null, close);
    if (peek().t !== C_CHAR || peek().v !== close) {
      throw new TexError('括号没配对：缺一个 ' + close);
    }
    take();
    return inner;
  }

  /* 读一个参数：{…} 组，或者单个项 */
  function readArg() {
    const t = peek();
    if (t.t === C_LB) {
      take();
      const inner = convSeq();
      if (peek().t !== C_RB) throw new TexError('花括号没配对：缺一个 }');
      take();
      return inner;
    }
    if (t.t === 'eof') throw new TexError('公式没写完：这里还缺一块');
    const items = [];
    readItem(items);
    return finish(items);
  }

  /* 把项挂上去：函数项等下一个原子来当参数，运算符不参与「填充参数」 */
  function push(items, item) {
    const last = items[items.length - 1];
    if (item.kind === 'atom' && !item.op && last && last.kind === 'func') {
      items[items.length - 1] = { kind: 'atom', text: applyFunc(last, item.text) };
      return;
    }
    items.push(item);
  }

  function applyFunc(f, arg) {
    let name = f.name;
    if (f.pow === '-1' && INVERSE[name]) return INVERSE[name] + '(' + arg + ')';
    if (f.sub) return name + '(' + f.sub + ',' + arg + ')';
    if (f.pow) return '(' + name + '(' + arg + '))^(' + f.pow + ')';
    return name + '(' + arg + ')';
  }

  /* 收尾：还没配上参数的函数默认喂 x，让「点一下就出图」成立。
     相邻两块都以字母数字结尾/开头时补一个空格——否则 2、π、x 三块会粘成
     一个 "2pix"，被内核当成名叫 pix 的参数。 */
  function finish(items) {
    let out = '';
    items.forEach((it) => {
      const t = it.kind === 'func' ? applyFunc(it, 'x') : it.text;
      if (out && /[A-Za-z0-9_]$/.test(out) && /^[A-Za-z0-9_]/.test(t)) out += ' ';
      out += t;
    });
    return out;
  }

  /* endCmd：\left…\right 的内层要在这个命令处停下，否则 \right 会被当成
     普通命令去解析，反手抛一句「多出来一个 \right」 */
  function convSeq(endCmd, endChar) {
    const items = [];
    for (;;) {
      const t = peek();
      if (t.t === 'eof' || t.t === C_RB) break;
      if (endCmd && t.t === C_CMD && t.v === endCmd) break;
      if (endChar && t.t === C_CHAR && t.v === endChar) break;
      if (t.t === C_AMP) throw new TexError('不支持 & 对齐符');
      if (t.t === C_SUP || t.t === C_SUB) {
        take();
        const arg = readArg();
        const last = items.pop();
        if (!last) throw new TexError('“' + t.v + '” 前面缺东西');
        if (t.t === C_SUP) {
          if (last.kind === 'func') items.push(Object.assign({}, last, { pow: arg }));
          else items.push({ kind: 'atom', text: '(' + last.text + ')^(' + arg + ')' });
        } else {
          /* 下标只有 \log_2 x 这一种合法用法 */
          if (last.kind !== 'func') throw new TexError('下标只能跟在函数后面，比如 \\log_2 x');
          items.push(Object.assign({}, last, { sub: arg }));
        }
        continue;
      }
      readItem(items);
    }
    return finish(items);
  }

  const out = convSeq();
  if (p < toks.length) {
    const t = toks[p];
    if (t.t === C_RB) throw new TexError('多出来一个 }');
  }
  if (!out.trim()) throw new TexError('还没写东西');
  return out;
}

/** 键盘留的空位有几个（用来提示「还有空格没填」） */
export function countPlaceholders(tex) {
  const m = tex.match(/\\placeholder/g);
  return m ? m.length : 0;
}

/**
 * 把用户敲的东西统一成 LaTeX，用于实时预览：
 *   带反斜杠或 ^ _ 的按 LaTeX 原样渲染（所见即所得）；
 *   不带的一律当普通算式，先解析再排版，于是 "sin(x)/x" 也能看见漂亮公式。
 * 失败时抛出带中文说明的错误，交给预览框显示。
 */
export function toDisplayTex(src) {
  const s = (src || '').trim();
  if (!s) return '';
  if (isLatex(s)) {
    /* LaTeX 走一遍翻译，顺带把不认识的成分挡在预览阶段之外 */
    texToText(s);
    return s;
  }
  return build(s).tex;
}

/**
 * 这一串该当 LaTeX 还是当普通算式？
 * 判据是「有没有 LaTeX 才有的记号」：反斜杠命令，或者带花括号的上下标。
 * 光有一个 ^ 不算——x^2 是大家手打的习惯写法，得让它走算式那条路，
 * 否则 "x^2+1" 会被原样丢给 KaTeX，渲染出来没有上标。
 */
export function isLatex(s) {
  return /\\|\^\{|\_\{/.test(s);
}

export { TexError };
export const SUPPORTED_CMDS = Object.keys(CMD_FN);
export { ParseError };
