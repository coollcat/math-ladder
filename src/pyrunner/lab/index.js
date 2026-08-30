/* lab 围栏渲染器 —— ```lab 围栏 + JSON 规格，按需加载组件并挂载。
   与 viz 同一套水合安全约定：不删除 React 管辖的节点，只隐藏原容器、
   把组件卡片插到它后面；用 sourceKey 判断此前是否已挂过，避免重复。 */

import { RENDERERS } from './registry.js';

function hashStr(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

function mountAfter(container, widget) {
  const parent = container.parentNode;
  if (!parent) return;
  container.style.display = 'none';
  parent.insertBefore(widget, container.nextSibling);
}

function errorCard(container, msg) {
  const w = document.createElement('div');
  w.className = 'ml-viz ml-lab';
  const e = document.createElement('div');
  e.className = 'ml-quiz__bad';
  e.textContent = msg;
  w.appendChild(e);
  mountAfter(container, w);
  return w;
}

/* 从 Docusaurus 渲染出的代码块里取回原始文本（行被拆成 token-line） */
function extractText(pre) {
  const code = pre.querySelector('code');
  if (!code) return pre.textContent || '';
  const lines = code.querySelectorAll('[class*="token-line"]');
  if (lines.length) return Array.from(lines).map((l) => l.textContent).join('\n');
  return code.textContent || '';
}

export function enhanceLab(root) {
  (root || document).querySelectorAll('pre[class*="language-lab"]').forEach((pre) => {
    const container = pre.closest('.theme-code-block') || pre.parentElement;
    if (!container || container.dataset.mlLabBound === '1') return;

    const raw = extractText(pre);
    const sourceKey = 'lab-' + String(hashStr(raw));

    /* 已经挂过（路由回切/重复扫描）：原容器已被隐藏，直接跳过 */
    const stale = [container.previousElementSibling, container.nextElementSibling]
      .find((n) => n && n.classList.contains('ml-lab') && n.dataset.mlSource === sourceKey);
    if (stale) {
      container.style.display = 'none';
      container.dataset.mlLabBound = '1';
      return;
    }
    container.dataset.mlLabBound = '1';

    let spec = null;
    try {
      spec = JSON.parse(raw);
    } catch (e) {
      errorCard(container, 'lab 规格不是合法 JSON：' + (e && e.message ? e.message : e));
      return;
    }

    const type = spec.type;
    const load = RENDERERS[type];
    const widget = document.createElement('div');
    widget.className = 'ml-viz ml-lab';
    widget.dataset.mlSource = sourceKey;

    if (spec.title) {
      const t = document.createElement('div');
      t.className = 'ml-viz__title';
      t.textContent = spec.title;
      widget.appendChild(t);
    }

    if (!load) {
      const e = document.createElement('div');
      e.className = 'ml-quiz__bad';
      e.textContent = '未知 lab 组件: ' + type + '（可用: ' + Object.keys(RENDERERS).join(' / ') + '）';
      widget.appendChild(e);
      mountAfter(container, widget);
      return;
    }

    /* 先挂载占位卡再异步取组件，保证 DOM 结构稳定、不跳动 */
    const body = document.createElement('div');
    body.className = 'ml-lab__body';
    const loading = document.createElement('div');
    loading.className = 'ml-lab__loading';
    loading.textContent = '正在载入交互组件…';
    body.appendChild(loading);
    const slidersWrap = document.createElement('div');
    slidersWrap.className = 'ml-viz__sliders';
    widget.append(body, slidersWrap);
    mountAfter(container, widget);

    load()
      .then((mod) => {
        const render = mod.default || mod.render;
        if (typeof render !== 'function') throw new Error('组件未导出 render 函数');
        body.innerHTML = '';
        let res = null;
        try {
          res = render(body, spec) || {};
        } catch (e) {
          body.innerHTML = '';
          const err = document.createElement('div');
          err.className = 'ml-quiz__bad';
          err.textContent = '组件渲染出错：' + (e && e.message ? e.message : String(e));
          body.appendChild(err);
          return;
        }
        if (res.slidersBox) slidersWrap.appendChild(res.slidersBox);
        if (res.destroy) {
          widget._mlLabDestroy = res.destroy;
        }
      })
      .catch((e) => {
        body.innerHTML = '';
        const err = document.createElement('div');
        err.className = 'ml-quiz__bad';
        err.textContent = '组件加载失败：' + (e && e.message ? e.message : String(e));
        body.appendChild(err);
      });
  });
}

/* 卸载时清理音频等资源（Docusaurus 客户端路由切换时调用） */
export function disposeLab(root) {
  (root || document).querySelectorAll('.ml-lab').forEach((w) => {
    if (typeof w._mlLabDestroy === 'function') {
      try { w._mlLabDestroy(); } catch (e) { void e; }
      w._mlLabDestroy = null;
    }
  });
}

export default enhanceLab;
