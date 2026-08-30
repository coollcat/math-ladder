import React, { useEffect } from 'react';
import { scheduleEnhance } from '../../pyrunner/enhancer';

/* 浮窗与灯箱是交互系统自己的高频自留地：编辑器打字、流式输出、开关面板
   都在不停打 DOM。这些变更不需要重扫正文，过滤掉可以省掉一整轮
   全文档 querySelectorAll（拖滑块/看输出时尤其明显）。 */
function isSelfMutation(mutation) {
  const t = mutation.target;
  return !!(t && t.nodeType === 1 && t.closest && t.closest('#ml-console, .ml-lightbox'));
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
  return <>{children}</>;
}
