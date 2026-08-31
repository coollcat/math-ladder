import React, { useEffect, useState } from 'react';

/* =========================================================================
 * 左右侧栏折叠控件
 * -------------------------------------------------------------------------
 * 两个贴在视口左右边缘的细长按钮，点击收起/展开对应侧栏：
 *   左（l）= 章节导航 sidebar   右（r）= 目录 TOC + 前置知识 + 进度条
 * 折叠后正文列自动补满（见 custom.css 的 .ml-side-*-collapsed 规则）。
 *
 * 两个约束：
 *   1. 水合安全——初始值一律 null，挂载后才读 localStorage 再改 class，
 *      与 TOCItems 里的 MiniProgress 同一套路，避免 SSR/CSR 输出不一致；
 *   2. 窄屏不显示——<997px 时 Docusaurus 本来就隐藏 TOC、sidebar 变抽屉，
 *      再摆两个悬浮按钮只会挡正文，CSS 里直接 display:none。
 * ========================================================================= */

const KEY = 'ml-rail-collapsed';

function readState() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) || '{}');
    return { l: !!raw.l, r: !!raw.r };
  } catch {
    return { l: false, r: false };
  }
}

export default function RailControls() {
  const [st, setSt] = useState(null);

  useEffect(() => {
    const s = readState();
    setSt(s);
    const root = document.documentElement.classList;
    root.toggle('ml-side-l-collapsed', s.l);
    root.toggle('ml-side-r-collapsed', s.r);
  }, []);

  if (!st) return null;

  const toggle = (side) => {
    const next = { ...st, [side]: !st[side] };
    setSt(next);
    document.documentElement.classList.toggle(
      side === 'l' ? 'ml-side-l-collapsed' : 'ml-side-r-collapsed',
      next[side],
    );
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* 隐私模式写不进去：本次会话内仍生效，只是不跨会话记忆 */
    }
  };

  return (
    <>
      <button
        type="button"
        className="ml-rail-btn ml-rail-btn--left"
        onClick={() => toggle('l')}
        title={st.l ? '展开左侧章节导航' : '收起左侧章节导航（正文变宽）'}
        aria-label={st.l ? '展开左侧章节导航' : '收起左侧章节导航'}
        aria-expanded={!st.l}
      >
        {st.l ? '›' : '‹'}
      </button>
      <button
        type="button"
        className="ml-rail-btn ml-rail-btn--right"
        onClick={() => toggle('r')}
        title={st.r ? '展开右侧目录与进度' : '收起右侧目录与进度（正文变宽）'}
        aria-label={st.r ? '展开右侧目录' : '收起右侧目录'}
        aria-expanded={!st.r}
      >
        {st.r ? '‹' : '›'}
      </button>
    </>
  );
}
