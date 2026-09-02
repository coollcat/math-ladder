import React from 'react';
import Layout from '@theme-original/DocItem/Layout';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import PrereqPanel from '@site/src/components/doc-widgets/PrereqPanel';
import RailControls from '@site/src/components/doc-widgets/RailControls';

/* 前置知识面板（正文内实例）：桌面端由右栏 TOCItems 挂件接管（进度条上方），
 * 这里的实例只在窄屏（≤996px）显示为正文顶部横条——见 custom.css 的媒体查询。
 * RailControls 是右侧栏（目录/进度）的折叠把手，只在桌面（≥997px）显示；
 * 左侧章节导航的折叠交给 Docusaurus 自带的「收起侧栏」按钮（侧栏左下角）。 */

export default function LayoutWrapper(props) {
  const { frontMatter } = useDoc();
  const prereqs = Array.isArray(frontMatter?.prereqs) ? frontMatter.prereqs : [];
  return (
    <>
      <RailControls />
      {prereqs.length > 0 && <PrereqPanel prereqs={prereqs} variant="inline" />}
      <Layout {...props} />
    </>
  );
}
