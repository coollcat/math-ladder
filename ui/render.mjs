/* 数学阶梯 · 新 UI 渲染管线
 * docs/*.md → HTML：front matter 解析 / 数学段保护 + KaTeX 服务端渲染 /
 * 自定义围栏（quiz 真交互，exercise/python/viz 静态卡片 + 主站跳转）/ 相对 .md 链接改写
 */
import katex from 'katex';
import { Marked } from 'marked';

const marked = new Marked({ gfm: true, breaks: false });

/* ---------- front matter（YAML 子集：key: value 与 - 列表） ---------- */
export function parseFrontMatter(src) {
  if (!src.startsWith('---')) return { fm: {}, body: src };
  const end = src.indexOf('\n---', 3);
  if (end < 0) return { fm: {}, body: src };
  const head = src.slice(3, end).replace(/^\r?\n/, '');
  const body = src.slice(end + 4).replace(/^\r?\n/, '');
  const fm = {};
  let lastKey = null;
  for (const raw of head.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const m = raw.match(/^(\s*)- (.*)$/);
    if (m && lastKey) {
      if (!Array.isArray(fm[lastKey])) fm[lastKey] = [];
      fm[lastKey].push(m[2].trim().replace(/^['"]|['"]$/g, ''));
      continue;
    }
    const kv = raw.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (kv) {
      lastKey = kv[1];
      let v = kv[2].trim();
      if (v === '[]') { fm[lastKey] = []; continue; }
      v = v.replace(/^['"]|['"]$/g, '');
      fm[lastKey] = v === '' ? '' : (/^\d+$/.test(v) ? Number(v) : v);
    }
  }
  return { fm, body };
}

/* ---------- 路径工具 ---------- */
export function stripNum(s) { return s.replace(/^\d+-(.*)$/, '$1'); }
export function chNum(dir) { const m = dir.match(/^(\d+)/); return m ? parseInt(m[1], 10) : 999; }
/** id 形如 "04-algebra/10-letters"（index.md 时第二段为 "index"） */
export function mainSiteLink(id) {
  const [dir, file] = id.split('/');
  const base = stripNum(dir);
  const page = file === 'index' ? '' : '/' + stripNum(file.replace(/\.md$/, ''));
  return `http://localhost:9452/docs/${base}${page}`;
}

/* ---------- 围栏解析 ---------- */
function parseFences(body) {
  const fences = [];
  const lines = body.split(/\r?\n/);
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(/^```(\w*)(.*)$/);
    if (m) {
      const lang = m[1] || '';
      const meta = (m[2] || '').trim();
      const buf = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++; // 跳过收尾 ```
      fences.push({ lang, meta, code: buf.join('\n'), tag: `\nXQFENCE${fences.length}QFX\n` });
      out.push(fences[fences.length - 1].tag);
      continue;
    }
    out.push(lines[i]);
    i++;
  }
  return { text: out.join('\n'), fences };
}

/* ---------- ::: 提示块 → 引用块（5 处使用，够用即可） ---------- */
function foldAdmonitions(body) {
  const lines = body.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const open = lines[i].match(/^:::(\w+)(?:\[(.*)\])?\s*$/);
    if (open) {
      const title = open[2] || { note: '注', tip: '小技巧', warning: '注意', info: '说明', caution: '小心' }[open[1]] || '提示';
      out.push(`> **${title}**`);
      i++;
      while (i < lines.length && !/^:::\s*$/.test(lines[i])) { out.push('> ' + lines[i]); i++; }
      continue;
    }
    out.push(lines[i]);
  }
  return out.join('\n');
}

/* ---------- quiz 源码 → 卡片 HTML ---------- */
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function renderQuizCard(code) {
  const lines = code.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const qLines = [];
  const opts = [];
  const expl = [];
  let okIdx = -1;
  for (const l of lines) {
    if (l.startsWith('- ')) {
      const ok = /\[\*\]\s*$/.test(l);
      if (ok) okIdx = opts.length;
      opts.push(l.slice(2).replace(/\s*\[\*\]\s*$/, ''));
    } else if (l.startsWith('?')) expl.push(l.replace(/^[\s?]+/, ''));
    else qLines.push(l);
  }
  // 答案不落明文：仅以混淆 key 标注正确项下标（本地趣味功能，不做判题存档）
  const qk = Buffer.from(String(okIdx)).toString('base64');
  const optHtml = opts.map((o) => `<button class="mlq-opt">${escapeHtml(o)}</button>`).join('');
  return `<div class="ml-card ml-quiz" data-mlq data-qk="${qk}">
  <div class="ml-card-tag">随堂测验</div>
  <div class="ml-q">${qLines.map(escapeHtml).join('<br>')}</div>
  <div class="ml-opts">${optHtml}</div>
  ${expl.length ? `<div class="ml-expl" hidden>✦ ${expl.map(escapeHtml).join(' ')}</div>` : ''}
</div>`;
}

function renderExerciseCard(code, id) {
  const title = (code.match(/^#\s*@title:\s*(.+)$/m) || [])[1];
  const checks = [...code.matchAll(/^#\s*@check:[ \t]*(.*)$/gm)].map((m) => m[1]);
  const hint = (code.match(/^#\s*@hint:\s*(.+)$/m) || [])[1];
  const init = code.split(/\r?\n/).filter((l) => !/^#\s*@/.test(l)).join('\n');
  // 浮窗判题数据：代码与 @check/@hint 打包进 data-*（encodeURIComponent 防属性注入）
  const exPayload = encodeURIComponent(JSON.stringify({ title: title || '', check: checks, hint: hint || '' }));
  return `<div class="ml-card ml-exercise">
  <div class="ml-card-head"><span class="ml-card-tag">判题练习</span><span class="ml-card-title">${escapeHtml(title || '')}</span><button type="button" class="ml-runbtn" data-mlpy="${encodeURIComponent(init.trim())}" data-mlpyex="${exPayload}" data-mlt="${escapeHtml(title || '')}">▶ 在浮窗作答</button></div>
  <p class="ml-card-note">判题式练习：改代码直到输出与期望逐行一致。点击按钮在本页浮窗作答，或<a href="${mainSiteLink(id)}" class="ml-gomain" target="_blank" rel="noopener">到主站浮窗作答 ↗</a></p>
  <pre class="ml-code"><code>${escapeHtml(init.trim())}</code></pre>
  ${hint ? `<details class="ml-hint"><summary>卡住了？看提示</summary><p>${escapeHtml(hint)}</p></details>` : ''}
</div>`;
}

function renderPythonCard(code, fenceMeta, id) {
  const title = (fenceMeta.match(/title="([^"]+)"/) || [])[1] || '';
  return `<div class="ml-card ml-python">
  <div class="ml-card-head"><span class="ml-card-tag">Python</span>${title ? `<span class="ml-card-title">${escapeHtml(title)}</span>` : ''}<button type="button" class="ml-runbtn" data-mlpy="${encodeURIComponent(code)}" data-mlt="${escapeHtml(title)}">▶ 浮窗运行</button><a href="${mainSiteLink(id)}" class="ml-gomain" target="_blank" rel="noopener">主站 ↗</a></div>
  <pre class="ml-code"><code>${escapeHtml(code)}</code></pre>
</div>`;
}

/* viz 与 lab 共用同一张占位卡：独立阅读前端是「静态为主」的定位，
   重交互组件一律引导到主站玩，卡片负责把组件名和标题交代清楚。 */
function renderVizCard(code, id, lang = 'viz') {
  let t = '', type = '', specAttr = '';
  try {
    const j = JSON.parse(code);
    t = j.title || ''; type = j.type || '';
    // 完整 spec 交给皮肤前端渲染交互组件（ui/*/viz.js 支持的类型就地可玩）
    specAttr = ` data-viz="${encodeURIComponent(code)}"`;
  } catch { /* 非法 JSON 就只当占位 */ }
  const tag = lang === 'lab' ? 'lab 互动实验' : 'viz 互动图';
  return `<div class="ml-card ml-viz"${specAttr}>
  <div class="ml-card-head"><span class="ml-card-tag">${tag}</span>${type ? `<span class="ml-card-type">${escapeHtml(type)}</span>` : ''}${t ? `<span class="ml-card-title">${escapeHtml(t)}</span>` : ''}<a href="${mainSiteLink(id)}" class="ml-gomain" target="_blank" rel="noopener">到主站玩这个组件 ↗</a></div>
  <div class="ml-viz-ph">［ 交互式可视化 ］</div>
</div>`;
}

/* ---------- 主渲染 ---------- */
let seq = 0;
export function renderMarkdown(id, dir, bodySrc, pageTitle = '') {
  // dropH1 改为按内容判断：正文首个 H1 文本等于页面标题时才去掉（章首页 H1 与 fm.title 常不同，须保留）
  seq++;
  let body = foldAdmonitions(bodySrc);
  const { text: fencedText, fences } = parseFences(body);

  // 数学段保护：先 $$ 显示公式，再行内 $
  const texStore = [];
  let work = fencedText.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
    texStore.push({ tex, disp: true });
    return `XQTEXD${seq}_${texStore.length - 1}QFX`;
  });
  work = work.replace(/\$([^$\n]+?)\$/g, (_, tex) => {
    texStore.push({ tex, disp: false });
    return `XQTEXI${seq}_${texStore.length - 1}QFX`;
  });

  let html = marked.parse(work, { async: false });

  // 显示公式 token 可能在 <p> 内独行，无需特殊处理
  html = html.replace(/XQTEX([DI])(\d+)_(\d+)QFX/g, (_, kind, sq, idx) => {
    const item = texStore[Number(idx)];
    if (!item) return '';
    try {
      return katex.renderToString(item.tex, { displayMode: kind === 'D', strict: false, output: 'html', throwOnError: false });
    } catch {
      return '<code>' + escapeHtml('$' + item.tex + '$') + '</code>';
    }
  });

  // 围栏 token → 卡片
  html = html.replace(/<p>\s*XQFENCE(\d+)QFX\s*<\/p>/g, (_, n) => {
    const f = fences[Number(n)];
    if (!f) return '';
    switch (f.lang) {
      case 'quiz': return renderQuizCard(f.code);
      case 'exercise': return renderExerciseCard(f.code, id);
      case 'python': return renderPythonCard(f.code, f.meta, id);
      case 'viz': return renderVizCard(f.code, id, 'viz');
      case 'lab': return renderVizCard(f.code, id, 'lab');
      default:
        return `<pre class="ml-code plain lang-${escapeHtml(f.lang)}"><code>${escapeHtml(f.code)}</code></pre>`;
    }
  });
  // 兜底：不在 <p> 里的围栏 token
  html = html.replace(/XQFENCE(\d+)QFX/g, (_, n) => {
    const f = fences[Number(n)];
    if (!f) return '';
    return f.lang === 'python' ? renderPythonCard(f.code, f.meta, id)
      : `<pre class="ml-code plain"><code>${escapeHtml(f.code)}</code></pre>`;
  });

  // 相对 .md 链接 → hash 路由
  html = html.replace(/href="([^"#h][^"]*?)\.md(#[^"]*)?"/g, (_, href, hash) => {
    // 解析相对路径（相对本章目录）
    const parts = (dir + '/' + href).split('/');
    const stack = [];
    for (const p of parts) {
      if (p === '.' || p === '') continue;
      if (p === '..') stack.pop();
      else stack.push(p);
    }
    const file = stack.pop(); // "10-letters"
    const targetDir = stack.join('/');
    if (file === 'index' || file === undefined) {
      return `href="#/chap/${targetDir}"`;
    }
    return `href="#/read/${targetDir}/${file}"`;
  });

  // 正文首行 H1 文本与页面标题相同时去掉（页面头部已展示标题）
  const h1 = html.match(/^<h1[^>]*>([\s\S]*?)<\/h1>\s*/);
  if (h1 && pageTitle && h1[1].replace(/<[^>]+>/g, '').trim() === pageTitle) {
    html = html.slice(h1[0].length);
  }

  return html;
}
