import React, { useEffect, useState } from 'react';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { readProgress, onProgressChange } from '@site/src/learning/progress';

const KIND_LABEL = {
  core: '必须',
  refresh: '回看',
  optional: '可选',
};

/* 前置知识面板（供两处复用）：
 * - variant="inline"：渲染在正文内，桌面隐藏，窄屏折叠成一行摘要（点开才展开）
 * - variant="toc"：渲染在右侧 TOC 栏顶部（进度条上方），窄屏隐藏
 *
 * 数据来源（2026-10-10 改）：按课拆分的静态 JSON `static/prereqs/<课id>.json`
 * （`scripts/gen-graph.mjs` 生成），挂载后 fetch 当前课那一份（0.1–0.4 KB）。
 * 此前是 import 生成物 prereq-index.js 的整表（83 KB）——本组件是 theme 级、
 * 每个文档页都进首屏，而一页只用其中 1–5 条，整表进 bundle 是净浪费
 * （传输、JSON.parse、「Map(Object.entries)」三遍成本，每个文档页都付）。
 * 现在脚本不再产 prereq-index.js，只产按课 JSON + lesson-count.js（总课数）。
 *
 * 水合安全：SSR 与挂载首帧都渲染空（items 初始为 null），fetch 到货才出面板，
 * 不存在服务端/客户端不一致。fetch 失败（缺文件/网络）时面板就不显示，
 * 与旧版「解析不到引用标题」的降级路径一致。
 *
 * 2026-10 UI 改版：正文内实例（inline）改用原生 <details>，默认收起，只占一行
 * （「前置知识 · N 门 · 必读」+ 箭头）。此前手机上一进页面就铺开 300–400px，
 * 首屏只剩这块面板、标题被挤到屏外。展开态由 <details> 原生驱动，
 * 初始 open=false 在 SSR/CSR 一致，不存在水合问题。 */

export default function PrereqPanel({ prereqs: propPrereqs, variant = 'inline' }) {
  const [items, setItems] = useState(null);
  const [done, setDone] = useState({});
  const [foldOpen, setFoldOpen] = useState(false);

  let docId = '';
  let prereqs = propPrereqs;
  try {
    const { metadata, frontMatter } = useDoc();
    docId = (metadata && metadata.id) || '';
    if (!prereqs && Array.isArray(frontMatter && frontMatter.prereqs)) {
      prereqs = frontMatter.prereqs;
    }
  } catch {
    /* 不在 docs 文档上下文（如移动 TOC 的其它复用处）：只用调用方传进来的 prereqs */
  }
  const count = Array.isArray(prereqs) ? prereqs.length : 0;
  /* useBaseUrl(url) 返回的是**解析后的 URL 字符串**（不是「返回函数的钩子」），
     所以要把拼好的路径直接交给它；无条件调用以保持钩子顺序稳定。 */
  const prereqUrl = useBaseUrl(
    count && docId ? `prereqs/${encodeURIComponent(docId)}.json` : '',
  );

  useEffect(() => {
    if (!prereqUrl) {
      setItems([]);
      return undefined;
    }
    let alive = true;
    setItems(null);
    fetch(prereqUrl)
      .then((r) => (r.ok ? r.json() : { prereqs: [] }))
      .then((data) => {
        if (alive) setItems(Array.isArray(data && data.prereqs) ? data.prereqs : []);
      })
      .catch(() => {
        if (alive) setItems([]);
      });
    return () => {
      alive = false;
    };
  }, [prereqUrl]);

  useEffect(() => {
    const update = () => setDone(readProgress());
    update();
    return onProgressChange(update);
  }, []);

  if (!count || !items || !items.length) return null;

  const list = (
    <ul className="ml-prereq__list">
      {items.map((it) => {
        const kind = KIND_LABEL[it.kind] ? it.kind : 'default';
        return (
          <li key={it.id} className={`ml-prereq__item ml-prereq__item--${kind}`}>
            <div className="ml-prereq__head">
              <a href={it.to}>{it.title}</a>
              {done[it.to] && <span className="ml-prereq__done">✓ 已学</span>}
              {KIND_LABEL[kind] && <span className="ml-prereq__kind">{KIND_LABEL[kind]}</span>}
            </div>
            {it.why && <div className="ml-prereq__why">{it.why}</div>}
            {it.recall && (
              <div className="ml-prereq__recall">
                <span>快速回想</span>
                {it.recall}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
  const note = <div className="ml-prereq__note">必须先掌握的读懂，回看的只补用到的部分</div>;

  /* 正文内实例：原生折叠，默认只露一行摘要 */
  if (variant === 'inline') {
    const coreCount = items.filter((it) => it.kind === 'core').length;
    return (
      <details
        className="ml-prereq ml-prereq--inline ml-prereq--fold"
        aria-label="前置知识"
        onToggle={(e) => setFoldOpen(!!e.currentTarget.open)}
      >
        <summary className="ml-prereq__summary">
          <span className="ml-prereq__chev" aria-hidden="true">
            ▸
          </span>
          <span className="ml-prereq__summary-title">前置知识</span>
          <span className="ml-prereq__summary-meta">
            {items.length} 门
            {coreCount ? ` · 必读 ${coreCount}` : ' · 仅回看'}
          </span>
          <span className="ml-prereq__summary-hint">{foldOpen ? '收起' : '展开'}</span>
        </summary>
        <div className="ml-prereq__body">
          {list}
          {note}
        </div>
      </details>
    );
  }

  return (
    <aside className={`ml-prereq ml-prereq--${variant}`} aria-label="前置知识">
      <div className="ml-prereq__title">▣ 前置知识</div>
      {list}
      {note}
    </aside>
  );
}
