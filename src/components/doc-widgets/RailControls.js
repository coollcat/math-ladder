import React, { useEffect, useState } from 'react';

/* =========================================================================
 * 右侧栏折叠控件
 * -------------------------------------------------------------------------
 * 一个贴在视口右边缘的细长按钮，点击收起/展开右侧栏（目录 TOC + 前置知识 + 进度条），
 * 折叠后正文列自动补满并铺满整屏（见 custom.css 的 .ml-side-r-collapsed 规则）。

 * 左侧章节导航不在这里做——Docusaurus 自带的「收起侧栏」按钮（侧栏左下角）
 * 才是正解，它会同时驱动 theme 内部的 docMainContainer 宽度计算；
 * 早先这里也挂过一个左侧把手，但那套 display:none 的写法与新版的
 * flex 布局打架（点了没反应），已移除。
 *
 * 两个约束：
 *   1. 水合安全——初始值一律 null，挂载后才读 localStorage 再改 class，
 *      与 TOCItems 里的 MiniProgress 同一套路，避免 SSR/CSR 输出不一致；
 *   2. 窄屏不显示——<997px 时 Docusaurus 本来就隐藏 TOC、sidebar 变抽屉，
 *      再摆悬浮按钮只会挡正文，CSS 里直接 display:none。
 * ========================================================================= */

const KEY = 'ml-rail-collapsed';

function readState() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) || '{}');
    /* 只读 r：旧版本存过 l（左侧把手），那份状态已无对应按钮，忽略即可 */
    return !!raw.r;
  } catch {
    return false;
  }
}

export default function RailControls() {
  const [collapsed, setCollapsed] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const r = readState();
    setCollapsed(r);
    setReady(true);
    document.documentElement.classList.toggle('ml-side-r-collapsed', r);
  }, []);

  if (!ready) return null;

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.documentElement.classList.toggle('ml-side-r-collapsed', next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ r: next }));
    } catch {
      /* 隐私模式写不进去：本次会话内仍生效，只是不跨会话记忆 */
    }
  };

  return (
    <button
      type="button"
      className="ml-rail-btn ml-rail-btn--right"
      onClick={toggle}
      title={collapsed ? '展开右侧目录与进度' : '收起右侧目录与进度（正文铺满）'}
      aria-label={collapsed ? '展开右侧目录' : '收起右侧目录'}
      aria-expanded={!collapsed}
    >
      {collapsed ? '‹' : '›'}
    </button>
  );
}
