import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from '@docusaurus/router';
import Layout from '@theme-original/DocItem/Layout';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import PrereqPanel from '@site/src/components/doc-widgets/PrereqPanel';
import RailControls from '@site/src/components/doc-widgets/RailControls';

/* 前置知识面板（正文内实例）与右侧栏折叠把手。
 *
 * 桌面（≥997px）：正文内实例由 CSS 隐藏，右栏 TOCItems 挂件接管；
 *   RailControls 是右侧栏的折叠把手。
 *
 * 窄屏（≤996px）：正文内实例折叠成一行摘要，**插在面包屑之后**。
 *   为什么不直接 <PrereqPanel/> 摆在 <Layout/> 前面：那样它会落在
 *   main > .container 的第一个子节点，也就是面包屑、本页总览、标题**之上**，
 *   手机首屏会先被它占掉一行，标题继续往下掉（Lead 实测确认过这个问题）。
 *   这里改成「挂载后在面包屑 nav 后面插一个空槽、用 portal 把面板渲染进去」：
 *   - portal 的挂载点在 React 树之外，卸载时 React 会正确清掉 portal 内容，
 *     不会去 removeChild 一个被挪过位置的节点（直接搬 DOM 节点会踩这个坑）；
 *   - SSR 与首帧都不渲染 portal（host 为 null），不存在水合不一致；
 *   - 面包屑缺失（非文档页）时退化为不渲染，与旧版「拿不到就不显示」一致。
 *   依赖 pathname 而不是只依赖 hasPrereqs：文档页之间跳转时 Layout 不重挂载，
 *   只看 hasPrereqs 的话第二门课会延续第一门的挂载点（或干脆没有）。
 * 左侧章节导航的折叠交给 Docusaurus 自带的「收起侧栏」按钮（侧栏左下角）。 */

export default function LayoutWrapper(props) {
  const { frontMatter } = useDoc();
  const { pathname } = useLocation();
  const prereqs = Array.isArray(frontMatter?.prereqs) ? frontMatter.prereqs : [];
  const hasPrereqs = prereqs.length > 0;
  const [host, setHost] = useState(null);

  useEffect(() => {
    if (!hasPrereqs) {
      setHost(null);
      return undefined;
    }
    /* 兜底：路由切换时 frontMatter 与 pathname 的更新不在同一帧，
       可能上一次留下的空槽还在。先清干净再插，避免出现两个挂载点。 */
    document.querySelectorAll('.ml-prereq-slot').forEach((n) => n.remove());
    const nav = document.querySelector('nav[class*="breadcrumbsContainer"]');
    if (!nav || !nav.parentElement) return undefined;
    const slot = document.createElement('div');
    slot.className = 'ml-prereq-slot';
    nav.insertAdjacentElement('afterend', slot);
    setHost(slot);
    return () => {
      setHost(null);
      if (slot.parentElement) slot.parentElement.removeChild(slot);
    };
  }, [hasPrereqs, pathname]);

  return (
    <>
      <RailControls />
      {hasPrereqs && host
        ? createPortal(<PrereqPanel prereqs={prereqs} variant="inline" />, host)
        : null}
      <Layout {...props} />
    </>
  );
}
