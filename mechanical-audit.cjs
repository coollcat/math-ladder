const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (
    entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]
  ));
}

function fences(text) {
  const lines = text.split(/\r?\n/);
  const result = [];
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^```([a-zA-Z0-9_-]+)(?:\s+(.*))?$/);
    if (!match) continue;
    const end = lines.indexOf('```', i + 1);
    if (end < 0) break;
    result.push({ lang: match[1], meta: match[2] || '', code: lines.slice(i + 1, end).join('\n'), line: i + 1 });
    i = end;
  }
  return result;
}

function routeFor(file) {
  const parts = path.relative('docs', file).replace(/\.md$/, '').split(/[\\/]/);
  const stripped = parts.map((part) => (part === 'index' ? '' : part.replace(/^\d+-/, ''))).filter(Boolean);
  return `/docs/${stripped.join('/')}`;
}

const markdown = walk('docs').filter((file) => file.endsWith('.md') && path.basename(file) !== 'COMPONENT_SPEC.md');
const problems = [];
const warnings = []; // 预警级：打印但不作为失败依据

/* ---------- viz type 白名单（RENDERERS 键集合） ----------
   从 src/pyrunner/viz.js 尾部 type→renderer 映射表用正则抠取全部键，
   同时覆盖带引号（'eigen-direction'）与不带引号（elimination）两种形式；
   不手工抄列表，渲染器增删后闸门自动跟随，杜绝审计误报/漏报组件名。
   提取失败（源码缺失或结构漂移）时降级为跳过 type 白名单校验并打 [warn]。 */
function extractVizTypes(vizPath) {
  let src = '';
  try {
    src = fs.readFileSync(vizPath, 'utf8');
  } catch (error) {
    void error;
    return null;
  }
  const block = src.match(/const RENDERERS = \{([\s\S]*?)\n\}/);
  if (!block) return null;
  return new Set(
    [...block[1].matchAll(/(^|\n)\s*(?:([A-Za-z_]\w*)|['"]([^'"]+)['"])\s*:/g)].map(
      (m) => m[2] || m[3],
    ),
  );
}

const VIZ_TYPES = extractVizTypes(path.join('src', 'pyrunner', 'viz.js'));
if (!VIZ_TYPES || !VIZ_TYPES.size) {
  warnings.push('src/pyrunner/viz.js 的 RENDERERS 键集合提取失败，本轮回避 viz type 白名单校验（检查源文件是否被重构）');
}
let sourceH2 = 0;
let builtH2 = 0;
let pythonBlocks = 0;
let vizBlocks = 0;

for (const file of markdown) {
  const text = fs.readFileSync(file, 'utf8');
  const relative = path.relative('.', file).replace(/\\/g, '/');
  const frontMatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || '';
  if (/^draft:\s*true\s*$/m.test(frontMatter)) continue;
  const h2 = (text.match(/^##\s/gm) || []).length;
  sourceH2 += h2;
  const route = routeFor(file);
  const htmlPath = path.join('build', route, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    problems.push(`${relative}: missing build page ${route}`);
  } else {
    const html = fs.readFileSync(htmlPath, 'utf8');
    const rendered = (html.match(/<h2\b/g) || []).length;
    builtH2 += rendered;
    if (rendered !== h2) problems.push(`${relative}: h2 source=${h2} build=${rendered}`);
  }
  if (/\\[{}]/.test(text)) problems.push(`${relative}: literal escaped brace`);
  const multilineMath = text.split(/\r?\n/).filter((line) => {
    const trimmed = line.trim();
    return trimmed.startsWith('$$') && (trimmed.slice(2).match(/\$\$/g) || []).length === 0;
  });
  if (multilineMath.length) problems.push(`${relative}: multiline display math (${multilineMath.length})`);
  // 缩进式 $$ 预警：目前均未触发 MDX 降级，但集中出现在有序列表里，数量会随写作漂移，统一顶格可彻底规避
  // 注意：围栏状态机只识别 ``` 围栏；~~~ / 四反引号围栏内的 $$ 会被误报（当前全库 0 处，引入时需同步扩展此判断）
  const indentedMath = [];
  let inFence = false;
  const srcLines = text.split(/\r?\n/);
  for (let li = 0; li < srcLines.length; li += 1) {
    if (/^```/.test(srcLines[li])) inFence = !inFence;
    else if (!inFence && /^[ \t]+\$\$/.test(srcLines[li])) indentedMath.push(li + 1);
  }
  if (indentedMath.length) warnings.push(`${relative}: indented display math x${indentedMath.length} (lines ${indentedMath.join(',')})`);
  let lastExerciseChecks = null; // 详解-@check 脱节预警：记住最近一个 exercise 的期望输出
  for (const block of fences(text)) {
    const before = text.split(/\r?\n/).slice(0, block.line - 1);
    const detailsOpen = before.filter((line) => line.trim() === '<details>').length;
    const detailsClose = before.filter((line) => line.trim() === '</details>').length;
    const insideDetails = detailsOpen > detailsClose;
    if (block.lang === 'viz') {
      vizBlocks += 1;
      /* 与 validate.mjs 同口径：先剥行注释与尾逗号（历史宽容写法），再逐块 JSON.parse。
         [error] 解析失败 / spec 非对象 / type 不在 RENDERERS 键集合；[warn] 缺失 type。 */
      const stripped = block.code.replace(/^\s*\/\/.*$/gm, '').replace(/,\s*([}\]])/g, '$1');
      let spec = null;
      try {
        spec = JSON.parse(stripped);
      } catch (error) {
        problems.push(`${relative}:${block.line}: invalid viz JSON ${error.message}`);
        continue;
      }
      if (spec === null || typeof spec !== 'object' || Array.isArray(spec)) {
        problems.push(`${relative}:${block.line}: viz spec 必须是 JSON 对象`);
      } else if (typeof spec.type !== 'string' || !spec.type.trim()) {
        warnings.push(`${relative}:${block.line}: viz 块缺少 type 字段`);
      } else if (VIZ_TYPES && VIZ_TYPES.size && !VIZ_TYPES.has(spec.type)) {
        problems.push(
          `${relative}:${block.line}: 未知 viz 类型 "${spec.type}"（可用键见 src/pyrunner/viz.js 的 RENDERERS）`,
        );
      }
    }
    if (block.lang === 'quiz' && block.code.includes('$')) problems.push(`${relative}:${block.line}: KaTeX in quiz`);
    if (block.lang === 'exercise') {
      lastExerciseChecks = (block.code.match(/^#\s*@check:\s*(.*)$/gm) || [])
        .map((s) => s.replace(/^#\s*@check:\s*/, '').trim())
        .filter(Boolean);
    } else if (block.lang === 'python' && insideDetails && lastExerciseChecks && lastExerciseChecks.length) {
      // 预警级（严格口径，防历史「照抄详解过不了判题」P0 复发）：
      // 仅当详解代码块除注释/空行外的每一行都是 print('字面量') 时才比对——
      // 此时输出与 @check 完全静态可判；含 f-string/计算的动态详解跳过不误报。
      const stmts = block.code
        .split(/\r?\n/)
        .map((l) => l.replace(/#.*$/, '').trim())
        .filter(Boolean);
      const isLiteralPrint = (l) => /^print\(\s*(['"])([^'"]*)\1\s*(?:,\s*(['"])([^'"]*)\3\s*)*\)$/.test(l);
      if (stmts.length && stmts.every(isLiteralPrint)) {
        const hay = stmts.join('\n');
        const missing = lastExerciseChecks.filter((c) => !hay.includes(c));
        if (missing.length === lastExerciseChecks.length) {
          warnings.push(`${relative}:${block.line}: details 详解输出疑似与 @check 脱节（期望：${lastExerciseChecks.join(' | ')}）`);
        }
      }
    }
    if ((block.lang === 'python' || block.lang === 'exercise') && !insideDetails) {
      pythonBlocks += 1;
      if (/^\s*input\s*\(/m.test(block.code)) problems.push(`${relative}:${block.line}: input()`);
      if (/^\s*while\s+True\s*:/m.test(block.code)) problems.push(`${relative}:${block.line}: while True`);
      const compiled = spawnSync('python', ['-I', '-c', "import sys; compile(sys.stdin.read(), '<lesson>', 'exec')"], {
        input: block.code,
        encoding: 'utf8',
      });
      if (compiled.status !== 0) {
        const detail = [compiled.stderr, compiled.stdout].find(Boolean)?.trim() || compiled.error?.message || `status=${compiled.status}`;
        problems.push(`${relative}:${block.line}: Python compile failed: ${detail}`);
      }
    }
  }
}

console.log(`markdown=${markdown.length} sourceH2=${sourceH2} builtH2=${builtH2} pythonBlocks=${pythonBlocks} vizBlocks=${vizBlocks} vizTypes=${VIZ_TYPES ? VIZ_TYPES.size : 0} problems=${problems.length} warnings=${warnings.length}`);
for (const problem of problems) console.log(problem);
for (const warning of warnings) console.log(`[warn] ${warning}`);
process.exit(problems.length ? 1 : 0);
