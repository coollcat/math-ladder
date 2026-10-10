import React, { useEffect, useState } from 'react';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import useBaseUrl from '@docusaurus/useBaseUrl';

/* 前置知识面板（供两处复用）：
 * - variant="inline"：渲染在正文内，桌面隐藏，窄屏退化为正文顶部横条
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
 * 与旧版「解析不到引用标题」的降级路径一致。 */
export default function PrereqPanel({ prereqs: propPrereqs, variant = 'inline' }) {
  const [items, setItems] = useState(null);

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

  if (!count || !items || !items.length) return null;
  return (
    <aside className={`ml-prereq ml-prereq--${variant}`} aria-label="前置知识">
      <div className="ml-prereq__title">▣ 前置知识</div>
      <ul className="ml-prereq__list">
        {items.map((it) => (
          <li key={it.id}>
            <a href={it.to}>{it.title}</a>
          </li>
        ))}
      </ul>
      <div className="ml-prereq__note">建议先读它们，再来上这一课</div>
    </aside>
  );
}
