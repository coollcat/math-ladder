import React from 'react';
import Layout from '@theme-original/DocItem/Layout';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import PrereqPanel from '@site/src/components/doc-widgets/PrereqPanel';

/* 前置知识面板（正文内实例）：桌面端由右栏 TOCItems 挂件接管（进度条上方），
 * 这里的实例只在窄屏（≤996px）显示为正文顶部横条——见 custom.css 的媒体查询。 */

export default function LayoutWrapper(props) {
  const { frontMatter } = useDoc();
  const prereqs = Array.isArray(frontMatter?.prereqs) ? frontMatter.prereqs : [];
  return (
    <>
      {prereqs.length > 0 && <PrereqPanel prereqs={prereqs} variant="inline" />}
      <Layout {...props} />
    </>
  );
}
