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
}
