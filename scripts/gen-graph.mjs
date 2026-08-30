#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const docsRoot = path.join(scriptDir, '..', 'docs');
const outFile = path.join(scriptDir, '..', 'src', 'components', 'ml-home', 'full-graph-data.js');

const TRACKED_BUILTINS = ['abs', 'sum', 'min', 'max', 'round', 'pow', 'divmod'];

function parseFrontMatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const data = {};
  let key = null;
  for (const line of match[1].split(/\r?\n/)) {
    const bullet = line.match(/^\s*-\s*(.+)$/);
    if (bullet && key && Array.isArray(data[key])) {
      data[key].push(bullet[1].trim());
      continue;
    }
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    key = kv[1];
    const raw = kv[2].trim();
    const inline = raw.match(/^\[(.*)\]$/);
    if (inline) {
      data[key] = inline[1]
        .split(',')
        .map((item) => item.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
      key = null;
    } else if (raw === '') {
      data[key] = [];
    } else {
      data[key] = raw.replace(/^["']|["']$/g, '');
      key = null;
    }
  }
  return data;
}

function maskCode(lines) {
  return lines.map((line) => {
    let quote = null;
    let triple = null;
    let out = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (triple) {
        if (line.slice(i, i + 3) === triple) {
          triple = null;
          i += 2;
        }
        continue;
      }
      if (quote) {
        if (ch === '\\') {
          i++;
          continue;
        }
        if (ch === quote) quote = null;
        continue;
      }
      if (ch === '#') break;
      if (ch === '"' || ch === "'") {
        if (line.slice(i, i + 3) === ch.repeat(3)) {
          triple = ch.repeat(3);
          i += 2;
        } else {
          quote = ch;
        }
        continue;
      }
      out += ch;
    }
    return out;
  });
}

function pythonBlocks(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let fence = null;
  let current = null;
  for (const line of lines) {
    if (!current) {
      const open = line.match(/^(`{3,})\s*(?:python3?|exercise)\b/);
      if (open) {
        fence = open[1];
        current = [];
      }
    } else if (new RegExp('^' + fence + '{1,}\\s*$').test(line)) {
      blocks.push(current);
      current = null;
      fence = null;
    } else {
      current.push(line);
    }
  }
  return blocks;
}

function expandRoot(root) {
  const parts = root.split('.');
  return parts.map((_, i) => parts.slice(0, i + 1).join('.'));
}

function collectLessons(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectLessons(full, out);
    else if (entry.name === 'COMPONENT_SPEC.md') continue;
    else if (/\.mdx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

function shortTitle(title) {
  return title.length > 10 ? title.slice(0, 7) + '…' : title;
}

function collectUses(text, allowed) {
  const uses = new Set();
  for (const block of pythonBlocks(text)) {
    maskCode(block).forEach((line) => {
      for (const match of line.matchAll(/\bmath\.([A-Za-z_]\w*)/g)) {
        const name = 'math.' + match[1];
        if (allowed.has(name)) uses.add(name);
      }
      for (const name of TRACKED_BUILTINS) {
        if (allowed.has(name) && new RegExp(`(?<![\\w.])${name}\\s*\\(`).test(line)) uses.add(name);
      }
      const imported = line.match(/^\s*(?:from\s+([A-Za-z_][\w.]*)|import\s+(.+))$/);
      if (imported) {
        const roots = imported[1]
          ? [imported[1]]
          : imported[2].split(',').map((item) => item.trim().split(/\s+as\s+/)[0].trim());
        roots.filter(Boolean).forEach((root) => {
          if (allowed.has(root)) uses.add(root);
        });
      }
    });
  }
  return [...uses];
}

const files = collectLessons(docsRoot)
  .map((file) => path.relative(docsRoot, file).split(path.sep).join('/'))
  .filter(
    (rel) =>
      rel.includes('/') &&
      !/(^|\/)index\.mdx?$/.test(rel) &&
      !/(^|\/)COMPONENT_SPEC\.md$/.test(rel) &&
      // 17 章是「下一程导读」章：只随卷阅读，不进知识图谱 / 知识树 / 首页统计
      !rel.startsWith('17-') &&
      // 999-references 是每章「参考资料」维护型条目（gen-references.mjs 产物）：同等待遇
      !/(^|\/)999-references\.md$/.test(rel),
  )
  .sort((a, b) => a.localeCompare(b));

const lessons = files.map((rel) => {
  const text = fs.readFileSync(path.join(docsRoot, rel), 'utf8').replace(/^\uFEFF/, '');
  const fm = parseFrontMatter(text);
  const physicalSegments = rel.replace(/\.mdx?$/, '').split('/');
  const segments = physicalSegments.map((segment) => segment.replace(/^\d+-/, ''));
  const base = segments.at(-1);
  const physicalBase = physicalSegments.at(-1);
  const physicalDir = physicalSegments.length > 1 ? physicalSegments.at(-2) : '';
  const stripped = base === 'index' ? '' : base.replace(/^\d+-/, '');
  const autoId = (segments.length > 1 ? segments.slice(0, -1).join('/') + '/' : '') + stripped;
  const id = typeof fm.lesson_id === 'string' ? fm.lesson_id : autoId;
  const chNum = physicalDir.match(/^(\d+)/) ? parseInt(physicalDir.match(/^(\d+)/)[1], 10) : -1;
  const ord = physicalBase === 'index.md'
    ? -1
    : physicalBase.match(/^(\d+)/)
      ? parseInt(physicalBase.match(/^(\d+)/)[1], 10)
      : 0;

  const born = [
    ...(Array.isArray(fm.introduces_math) ? fm.introduces_math : []),
    ...(Array.isArray(fm.introduces_builtin) ? fm.introduces_builtin : []),
    ...(Array.isArray(fm.introduces_import) ? fm.introduces_import : []),
  ];
  const seenBorn = new Set();
  const uniqueBorn = born.filter((tool) => !seenBorn.has(tool) && seenBorn.add(tool));

  return {
    rel,
    draft: fm.draft === true || fm.draft === 'true',
    id,
    ch: chNum,
    ord,
    prereqs: Array.isArray(fm.prereqs) ? fm.prereqs : [],
    title: fm.title || rel,
    short: shortTitle(fm.title || rel),
    to: `/docs/${segments.join('/')}`,
    born: uniqueBorn,
    text,
    uses: [],
  };
}).filter((lesson) => !lesson.draft);

lessons.sort((a, b) => a.ch - b.ch || a.ord - b.ord || a.rel.localeCompare(b.rel));
const availableTools = new Set();
for (const lesson of lessons) {
  lesson.born.forEach((tool) => availableTools.add(tool));
  lesson.uses = collectUses(lesson.text, availableTools);
}

const parents = lessons.map(() => []);
const rawEdges = [];
for (let i = 0; i < lessons.length; i++) {
  for (const ref of lessons[i].prereqs) {
    const parent = lessons.findIndex((lesson) =>
      lesson.id === ref || lesson.id.endsWith('/' + ref),
    );
    if (parent >= 0 && parent !== i) rawEdges.push([parent, i]);
  }
}

function hasAlternativePath(from, to, skippedEdge) {
  const stack = [from];
  const seen = new Set();
  while (stack.length) {
    const current = stack.pop();
    if (current === to) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const [a, b] of rawEdges) {
      if (a === current && !(a === skippedEdge[0] && b === skippedEdge[1])) stack.push(b);
    }
  }
  return false;
}

const edges = rawEdges.filter(([a, b]) => !hasAlternativePath(a, b, [a, b]));
for (const [parent, child] of edges) parents[child].push(parent);

const depth = lessons.map(() => 0);
function calculateDepth(i) {
  if (depth[i]) return depth[i];
  const deps = parents[i];
  depth[i] = deps.length ? Math.max(...deps.map(calculateDepth)) + 1 : 1;
  return depth[i];
}
lessons.forEach((_, i) => calculateDepth(i));

function ancestorsOf(i, cache = new Map()) {
  if (cache.has(i)) return cache.get(i);
  const result = new Set();
  for (const parent of parents[i]) {
    result.add(parent);
    for (const grandparent of ancestorsOf(parent, cache)) result.add(grandparent);
  }
  cache.set(i, result);
  return result;
}

const ancestryCache = new Map();
const flowMap = new Map();
lessons.forEach((lesson, i) => {
  const ancestors = [...ancestorsOf(i, ancestryCache)].sort((a, b) => depth[b] - depth[a]);
  for (const tool of lesson.uses) {
    const birth = ancestors.find((j) => lessons[j].born.includes(tool));
    if (birth == null) continue;
    const key = birth + '>' + i;
    if (!flowMap.has(key)) flowMap.set(key, []);
    flowMap.get(key).push(tool);
  }
});

const nodesJson = JSON.stringify(lessons.map(({ rel, id, ch, ord, title, short, to, born, uses }) => ({
  id, ch, ord, title, short, to, born, uses,
})));
const edgesJson = JSON.stringify(edges);
const useAggJson = JSON.stringify([...flowMap.entries()].map(([key, tools]) => {
  const [a, b] = key.split('>').map(Number);
  return [a, b, tools];
}));
const depthJson = JSON.stringify(depth);

const output = `/* 自动生成：node scripts/gen-graph.mjs。请勿手改。 */
export const NODES = ${nodesJson};
export const EDGES = ${edgesJson};
export const USE_AGG = ${useAggJson};
export const DEPTH = ${depthJson};
`;
fs.writeFileSync(outFile, output.replace(/\}\],/g, '}],\n').replace(/\n/g, '\n'), 'utf8');
console.log(`✔ 已生成 ${path.relative(process.cwd(), outFile)}（${lessons.length} 门课 / ${edges.length} 条先修线）`);
