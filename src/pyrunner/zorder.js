/* =========================================================================
 * 浮窗层叠：最近点过的窗口排最上面
 * -------------------------------------------------------------------------
 * 三个浮窗（控制台 / 笔记本 / 代码仓库）可以在屏幕上叠着开。这里维护一个
 * 按「最近交互」排序的栈，每次交互把对应面板挪到栈顶，然后从下往上重新派
 * z-index（1056 起，每级 +1）。
 *
 * 为什么不用「谁被点谁 +1」的递增写法：点几十次 z-index 就飞到几千，
 * 迟早盖过右下角的圆钮（z-index 1060）和灯箱。重新派号能保证永远只占
 * 1056/1057/1058 三档，圆钮始终在最上层、始终点得到。
 * ========================================================================= */

const BASE_Z = 1056;
const stack = [];

function restack() {
  stack.forEach((el, i) => {
    el.style.zIndex = String(BASE_Z + i);
  });
}

/** 把 el 提到最上层（已是栈顶则什么都不做）。 */
export function bringToFront(el) {
  if (!el) return;
  const i = stack.indexOf(el);
  if (i >= 0) stack.splice(i, 1);
  stack.push(el);
  restack();
}

/**
 * 让一个面板参与层叠管理：按下、拖头部、内部获得焦点都会把它提到最上面。
 * 面板被移除（跨代重建）时自动从栈里掉出去——用 WeakRef 太绕，这里在
 * restack 前先过滤掉已经不在文档里的节点。
 *
 * 顺带挂一条**窗口尺寸变化时把面板夹回视口**的兜底：四个面板（控制台/
 * 笔记本/仓库/公式/数据）都实现了「拖头部」，但拖动时的夹取只在 pointermove
 * 里做。用户先在大屏把面板拖到右下角、再把窗口缩小（或手机转屏），面板就
 * 会连 × 一起留在屏幕外，**唯一的出路是刷新页面**。这里统一兜住，
 * 各面板不必各写一遍。
 */
export function watchPanel(el) {
  if (!el || el.__mlZWatch) return;
  el.__mlZWatch = true;
  const onDown = () => {
    /* 先清掉已消失的节点，避免栈无限增长 */
    for (let i = stack.length - 1; i >= 0; i -= 1) {
      if (!stack[i].isConnected) stack.splice(i, 1);
    }
    bringToFront(el);
  };
  el.addEventListener('pointerdown', onDown, true);
  el.addEventListener('focusin', onDown, true);
  if (!window.__mlZResizeHooked) {
    window.__mlZResizeHooked = true;
    let t = null;
    window.addEventListener('resize', () => {
      clearTimeout(t);
      /* 防抖：手机上转屏会连发一串 resize */
      t = setTimeout(clampAll, 120);
    });
  }
}

/** 把带内联坐标的面板夹回视口内（只动「已经拖过」的那些）。 */
function clampAll() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    const el = stack[i];
    if (!el.isConnected) {
      stack.splice(i, 1);
      continue;
    }
    /* 没有内联 left 的面板是 CSS 定位（居中/整页/气泡），不该动它 */
    if (!el.style.left || el.classList.contains('is-fullpage')) continue;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = parseFloat(el.style.left);
    const top = parseFloat(el.style.top);
    if (!Number.isFinite(left) || !Number.isFinite(top)) continue;
    const maxL = Math.max(8, vw - w - 8);
    const maxT = Math.max(8, vh - h - 8);
    el.style.left = Math.min(Math.max(left, 8), maxL) + 'px';
    el.style.top = Math.min(Math.max(top, 8), maxT) + 'px';
  }
}

/**
 * el 是不是当前**最上面**的那个面板。
 *
 * 给分层关闭用：几个浮窗可以叠着开，Escape 只该关掉最上面那一层。
 * 各面板的 Escape 监听都挂在 document 上，靠 `stopPropagation()` 拦不住彼此
 * （同元素上的监听之间它无效，得用 stopImmediatePropagation），所以判断
 * 「谁是栈顶」这件事必须自己做，不能指望事件冒泡的顺序。
 *
 * 面板只在「打开」和「被交互」时入栈（openX 都会调 bringToFront），
 * 所以栈里没有的节点按「不在最上面」处理；栈顶若已从文档里摘掉，往下顺延。
 */
export function isTopmost(el) {
  if (!el) return false;
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    const top = stack[i];
    if (!top.isConnected) continue;
    /* 关掉的面板**不算**：它只是摘掉了 is-open，节点还在文档里、也还在栈上。
       漏了这一句的话，关掉笔记本/仓库之后栈顶仍是那个已关的面板，
       底下的浮窗再怎么按 Esc 都关不掉（只能去点 ×），手感像坏了。 */
    if (!top.classList.contains('is-open')) continue;
    return top === el;
  }
  return false;
}
