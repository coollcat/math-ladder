/* =========================================================================
 * 输出里的数学公式渲染（浮窗控制台 / 笔记本共用）
 * -------------------------------------------------------------------------
 * Python 输出是纯文本，但学数学时常常想 print 出个公式。约定沿用 LaTeX：
 *   $$...$$ → 独占一行的显示公式；$...$ → 行内公式。
 * 例如 print("$$\\frac{a}{b}$$")、print("勾股定理 $a^2+b^2=c^2$")。
 *
 * 两条纪律：
 *   1. KaTeX 走动态 import，不进主包（只有真出现 $ 时才拉那 270KB）；
 *   2. 先把原文当纯文本写进节点，等 KaTeX 到货再「升级」成公式节点——
 *      这样网络慢/加载失败时输出也不会是空白。
 * ========================================================================= */

let katexPromise = null;

export function getKatex() {
  if (!katexPromise) {
    katexPromise = import('katex')
      .then((m) => m.default || m)
      .catch((e) => {
        katexPromise = null; /* 失败后允许下次重试 */
        throw e;
      });
  }
  return katexPromise;
}

function texNode(katex, tex, display) {
  if (!katex) return null;
  try {
    const span = document.createElement('span');
    if (display) span.className = 'ml-math-display';
    span.innerHTML = katex.renderToString(tex, { displayMode: display, throwOnError: false });
    return span;
  } catch {
    return null;
  }
}

/** 把一段含 $...$ 的文本铺进 el（不做 Markdown，只处理行内公式）。 */
function paintInline(el, text, katex) {
  const segs = String(text).split(/(\$[^$\n]+?\$)/g);
  for (const seg of segs) {
    if (seg.length > 2 && seg.startsWith('$') && seg.endsWith('$')) {
      const node = texNode(katex, seg.slice(1, -1), false);
      el.appendChild(node || document.createTextNode(seg));
    } else if (seg) {
      el.appendChild(document.createTextNode(seg));
    }
  }
}

/**
 * 把 text 写进 el，并把里面的公式渲染成 KaTeX。
 * 同步阶段一定写入纯文本（绝不空白），随后异步升级。
 */
export function setMathText(el, text) {
  const src = String(text == null ? '' : text);
  el.textContent = src;
  if (src.indexOf('$') < 0) return;
  getKatex()
    .then((katex) => {
      /* 期间节点可能已被清屏（clearOut）：不在文档里就别白忙 */
      if (!el.isConnected) return;
      el.textContent = '';
      for (const part of src.split(/(\$\$[\s\S]+?\$\$)/g)) {
        if (!part) continue;
        if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
          const node = texNode(katex, part.slice(2, -2), true);
          if (node) {
            el.appendChild(node);
            continue;
          }
          paintInline(el, part, katex);
        } else {
          paintInline(el, part, katex);
        }
      }
    })
    .catch(() => {
      /* KaTeX 不可用：纯文本输出已经在了，什么都不用做 */
    });
}

/** 只把 Markdown 里公式的 LaTeX 源交出去时用得着（笔记本复用同一个 katex 实例）。 */
export { texNode };
