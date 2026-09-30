import React, { useEffect } from 'react';
import { scheduleEnhance } from '../../pyrunner/enhancer';

/* 浮窗与灯箱是交互系统自己的高频自留地：编辑器打字、流式输出、开关面板
   都在不停打 DOM。这些变更不需要重扫正文，过滤掉可以省掉一整轮
   全文档 querySelectorAll（拖滑块/看输出时尤其明显）。
   漏掉一个自留地的代价是实打实的：公式面板里每敲一个字符、补全候选框每次
   重画（innerHTML=''）、数据面板每次重绘，都会命中 childList 变更 →
   scheduleEnhance() → 全文档重扫。

   交互卡片（viz/lab/quiz/paper/solve/progress）同理：viz.js 里 195 处
   textContent 赋值（58 处在事件/rAF 上下文），拖一格滑块就改一次读数 →
   一次 childList 变更 → 一轮全文档重扫。这些卡片都是叶子 widget，内部
   不再造代码围栏（全站 createElement('pre') 零命中），所以过滤它们不会
   漏掉真正需要增强的新围栏——新围栏的变更 target 落在正文父节点上。
   注意：只过滤"卡片内部"的变更；卡片自身被插入正文时 target 是正文节点，
   照常触发扫描。 */
function isSelfMutation(mutation) {
  const t = mutation.target;
  return !!(
    t &&
    t.nodeType === 1 &&
    t.closest &&
    t.closest(
      '#ml-console, #ml-notebook, #ml-repo, #ml-formula, #ml-backup, .ml-lightbox, .ml-ac, .ml-nav__datapop, ' +
        '.ml-viz, .ml-lab, .ml-quiz, .ml-paper, .ml-solve, .ml-progress',
    )
  );
}

export default function Root({ children }) {
  useEffect(() => {
    const mo = new MutationObserver((muts) => {
      if (muts.some((m) => !isSelfMutation(m))) scheduleEnhance();
    });
    mo.observe(document.body, { childList: true, subtree: true });
    scheduleEnhance();
    return () => mo.disconnect();
  }, []);

  /* 云同步在这里拉起：Root 是站点级入口，每个路由都会走一次。
     用动态 import 是刻意的——同步是可选增强（后端可能压根没部署），
     不该进主包；拉起来之后它把监听挂在 document/window 上，闭包被全局对象
     持有着，之后路由怎么切、组件怎么卸载，同步都还在（boot 幂等）。
     必须放在 useEffect 里：模块顶层会在 SSR 阶段执行，那时没有 window。
     catch 掉：chunk 加载失败也只当站点没有云同步，本地功能一个不少。 */
  useEffect(() => {
    import('../../sync')
      .then((m) => {
        if (m && typeof m.boot === 'function') m.boot();
      })
      .catch(() => {
        /* 没有云同步也要照常学习 */
      });
  }, []);

  return <>{children}</>;
}
