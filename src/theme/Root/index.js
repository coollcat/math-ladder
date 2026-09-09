import React, { useEffect } from 'react';
import { scheduleEnhance } from '../../pyrunner/enhancer';

/* 浮窗与灯箱是交互系统自己的高频自留地：编辑器打字、流式输出、开关面板
   都在不停打 DOM。这些变更不需要重扫正文，过滤掉可以省掉一整轮
   全文档 querySelectorAll（拖滑块/看输出时尤其明显）。 */
function isSelfMutation(mutation) {
  const t = mutation.target;
  return !!(
    t &&
    t.nodeType === 1 &&
    t.closest &&
    /* 浮窗控制台 / 笔记本 / 代码仓库都是高频自留地，它们的 DOM 变动不必重扫正文 */
    t.closest('#ml-console, #ml-notebook, #ml-repo, .ml-lightbox')
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
