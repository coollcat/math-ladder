#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const listMode = args.includes('--list');
const docsRootOverride = args.find((a) => !a.startsWith('--'));
const docsRoot = path.resolve(docsRootOverride || path.join(scriptDir, '..', 'docs'));

const TRACKED_BUILTINS = ['abs', 'sum', 'min', 'max', 'round', 'pow', 'divmod'];
const REGISTRY = {
  volume: new Set(['1', '2', '3', '4', '5']),
  layer: new Set(['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11']),
  track: new Set([
    'algebra-structure',
    'analysis-change',
    'discrete-computing',
    'geometry-space',
    'probability-statistics',
    'information-learning',
    'optimization-control',
    'scientific-computing',
  ]),
  stage: new Set(['primary-intuition', 'secondary-tool', 'university-core', 'research-elective']),
};

/* ---------- viz / quiz / exercise 结构校验 ---------- */

const vizSrc = (() => {
  try {
    return fs.readFileSync(path.join(scriptDir, '..', 'src', 'pyrunner', 'viz.js'), 'utf8');
  } catch {
    return '';
  }
})();
const rv = vizSrc.match(/const RENDERERS = \{([\s\S]*?)\n\}/);
const VIZ_TYPES = new Set(
  rv
    ? [...rv[1].matchAll(/(^|\n)\s*(?:([A-Za-z_]\w*)|['"]([^'"]+)['"]):/g)].map(
        (m) => m[2] || m[3],
      )
    : [],
);

/* 表达式编译器：直接从 viz.js 抠出同一段源码求值，保证两侧永不漂移。
   2026-08-28 加：历史上 10 处 viz 块因 -x^2 / Unicode 减号在页面上渲染成错误卡，
   而 validate 与 build 全绿放行，属典型校验盲区。这里在构建闸门就试编译一遍。 */
const vizExpr = (() => {
  const start = vizSrc.indexOf('const EXPR_FUNCS');
  const end = vizSrc.indexOf('function showSpecError');
  if (start < 0 || end < 0) return null;
  try {
    /* eslint-disable-next-line no-new-func */
    return new Function(vizSrc.slice(start, end) + '\nreturn { compileExpr };')();
  } catch {
    return null;
  }
})();

/* 各渲染器实际允许的入参不同（['x'] / ['t','y'] / ['u','v'] / ['n'] …），
   闸门只拦语法错误，不做变量白名单收紧，故取并集避免误报。 */
const VIZ_EXPR_KEYS = ['expr', 'expr2', 'fx', 'fy', 'p', 'q'];
const VIZ_EXPR_VARS = ['x', 'y', 't', 'u', 'v', 'n'];

function extractInteractiveFences(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let cur = null;
  lines.forEach((line, i) => {
    if (cur === null) {
      const m = line.match(/^(`{3,})\s*(viz|quiz|exercise)\s*$/);
      if (m) cur = { lang: m[2], fence: m[1], line: i + 1, code: [] };
    } else if (new RegExp('^' + cur.fence + '{1,}' + '\\s*$').test(line)) {
      out.push(cur);
      cur = null;
    } else {
      cur.code.push({ line: i + 1, text: line });
    }
  });
  if (cur) out.push({ ...cur, unclosed: true });
  return out;
}

const errors = [];
const warns = [];

function parseFrontMatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const lines = m[1].split(/\r?\n/);
  const data = {};
  let curKey = null;
  for (const line of lines) {
    const bullet = line.match(/^\s*-\s*(.+)$/);
    if (bullet && curKey && Array.isArray(data[curKey])) {
      data[curKey].push(bullet[1].trim());
      continue;
    }
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (kv) {
      const [, key, raw] = kv;
      const val = raw.trim();
      curKey = key;
      const inline = val.match(/^\[(.*)\]$/);
      if (inline) {
        data[key] = inline[1]
          ? inline[1]
              .split(',')
              .map((s) => s.trim().replace(/^["']|["']$/g, ''))
              .filter(Boolean)
          : [];
        curKey = null;
      } else if (val === '') {
        data[key] = [];
      } else {
        data[key] = val.replace(/^["']|["']$/g, '');
        curKey = null;
      }
    }
  }
  return data;
}

function maskCode(lines) {
  const out = [];
  let triple = null;
  for (const line of lines) {
    let res = '';
    let i = 0;
    if (triple) {
      const end = line.indexOf(triple);
      if (end === -1) {
        out.push('');
        continue;
      }
      i = end + triple.length;
      triple = null;
    }
    let quote = null;
    let broken = false;
    while (i < line.length) {
      const ch = line[i];
      if (quote) {
        if (ch === '\\') {
          i += 2;
          continue;
        }
        if (ch === quote) quote = null;
        i += 1;
        continue;
      }
      if (ch === '#') {
        broken = true;
        break;
      }
      if (ch === '"' || ch === "'") {
        const tq = line.slice(i, i + 3);
        if (tq === '"""' || tq === "'''") {
          triple = tq;
          broken = true;
          break;
        }
        quote = ch;
        res += ch;
        i += 1;
        continue;
      }
      res += ch;
      i += 1;
    }
    void broken;
    out.push(res);
  }
  return out;
}

function extractPyBlocks(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let cur = null;
  let curFence = null;
  lines.forEach((line, i) => {
    if (cur === null) {
      const open = line.match(/^(`{3,})\s*(python3?|exercise)\b/);
      if (open) {
        cur = { code: [] };
        curFence = open[1];
      }
    } else if (new RegExp('^' + curFence + '{1,}\\s*$').test(line)) {
      blocks.push(cur);
      cur = null;
      curFence = null;
    } else {
      cur.code.push({ line: i + 1, text: line });
    }
  });
  return blocks;
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

const mdFiles = collectLessons(docsRoot)
  .map((f) => path.relative(docsRoot, f))
  .filter((rel) => path.basename(rel) !== 'COMPONENT_SPEC.md');

const lessons = mdFiles.map((rel) => {
  const normRel = rel.split(path.sep).join('/');
  const text = fs.readFileSync(path.join(docsRoot, rel), 'utf8').replace(/^\uFEFF/, '');
  const fm = parseFrontMatter(text);
  const noExt = normRel.replace(/\.mdx?$/, '');
  const parts = noExt.split('/');
  const lastSeg = parts[parts.length - 1];
  const stripped = lastSeg === 'index' ? '' : lastSeg.replace(/^\d+-/, '');
  const autoId = (parts.length > 1 ? parts.slice(0, -1).join('/') + '/' : '') + stripped;
  const dirName = parts.length > 1 ? parts[parts.length - 2] : '';
  const base = parts[parts.length - 1];
  const chNum = dirName.match(/^(\d+)/)
    ? parseInt(dirName.match(/^(\d+)/)[1], 10)
    : base === 'index.md'
      ? -2
      : -1;
  const fNum =
    base === 'index.md' ? -1 : base.match(/^(\d+)/) ? parseInt(base.match(/^(\d+)/)[1], 10) : 0;
  return {
    rel: normRel,
    fm,
    text,
    id: typeof fm?.lesson_id === 'string' ? fm.lesson_id : autoId,
    order: { chNum, fNum },
    prereqs: Array.isArray(fm?.prereqs) ? fm.prereqs : [],
    introMath: Array.isArray(fm?.introduces_math)
      ? fm.introduces_math.filter((s) => s.startsWith('math.'))
      : [],
    introBuiltin: Array.isArray(fm?.introduces_builtin) ? fm.introduces_builtin : [],
    introImport: Array.isArray(fm?.introduces_import) ? fm.introduces_import : [],
    volume: fm?.volume,
    layer: fm?.layer,
    track: Array.isArray(fm?.track) ? fm.track : [],
    stage: fm?.stage,
    difficulty: fm?.difficulty,
  };
}).filter((L) => L.fm?.draft !== true && L.fm?.draft !== 'true');

lessons.sort(
  (a, b) => a.order.chNum - b.order.chNum || a.order.fNum - b.order.fNum || a.rel.localeCompare(b.rel),
);

const registryMath = new Map();
const registryBuiltin = new Map();
const registryImport = new Map();

function expandRoot(r) {
  const parts = r.split('.');
  return parts.map((_, i) => parts.slice(0, i + 1).join('.'));
}
let errCountBefore = errors.length;

const metadataPioneerCount = lessons.filter((L) =>
  L.order.chNum >= 18 && (L.volume != null || L.layer != null || L.track.length > 0),
).length;
const enforceNewMetadata = metadataPioneerCount >= 2;

if (!listMode) {
  const idSet = new Map();
  for (const L of lessons) {
    if (!L.fm) errors.push(`${L.rel}: 缺少 front matter`);
    if (!L.fm?.title) errors.push(`${L.rel}: front matter 缺少 title`);
    if (idSet.has(L.id)) errors.push(`${L.rel}: 课程 id "${L.id}" 与 ${idSet.get(L.id)} 重复`);
    else idSet.set(L.id, L.rel);
  }

  const resolvePrereq = (ref) =>
    lessons.find((L) => L.id === ref || L.id.endsWith('/' + ref));

  for (const L of lessons) {
    for (const p of L.prereqs) {
      const target = resolvePrereq(p);
      if (!target) {
        errors.push(`${L.rel}: prereqs 引用了不存在的课程 "${p}"`);
        continue;
      }
      const cmp = target.order.chNum - L.order.chNum || target.order.fNum - L.order.fNum;
      if (cmp >= 0 && target.id !== L.id) {
        errors.push(`${L.rel}: prereq "${p}" (${target.rel}) 排在本课之后或同位——依赖必须先讲`);
      }
    }

    const checkScalar = (field, value) => {
      if (!REGISTRY[field].has(String(value))) {
        errors.push(
          `${L.rel}: 非法 ${field} "${value}"（可用：${[...REGISTRY[field]].join(' / ')}）`,
        );
      }
    };
    if (L.volume != null) checkScalar('volume', L.volume);
    if (L.layer != null) checkScalar('layer', L.layer);
    if (L.track.length) {
      for (const item of L.track) checkScalar('track', item);
    } else if (L.fm && Object.prototype.hasOwnProperty.call(L.fm, 'track')) {
      errors.push(`${L.rel}: track 已声明但不能为空`);
    }
    if (L.stage != null) checkScalar('stage', L.stage);
    if (L.difficulty != null) {
      const n = Number(L.difficulty);
      if (!Number.isInteger(n) || n < 1 || n > 5) {
        errors.push(`${L.rel}: difficulty 必须是 1..5 的整数（当前 "${L.difficulty}"）`);
      }
    }
    if (L.order.chNum >= 18) {
      const missing = [
        ['volume', L.volume],
        ['layer', L.layer],
        ['track', L.track.length ? ['ok'] : null],
      ].filter(([, value]) => value == null).map(([field]) => field);
      for (const field of missing) {
        const message = `${L.rel}: 新课缺少 ${field} 元数据`;
        if (enforceNewMetadata) errors.push(message);
        else warns.push(message + '（过渡期警告）');
      }
    }

    const allowedMath = new Set(registryMath.keys());
    for (const n of L.introMath) allowedMath.add(n);
    const allowedBuiltin = new Set(registryBuiltin.keys());
    for (const n of L.introBuiltin) allowedBuiltin.add(n);
    const allowedImport = new Set(registryImport.keys());
    for (const n of L.introImport) for (const r of expandRoot(n)) allowedImport.add(r);

    for (const block of extractPyBlocks(L.text)) {
      const texts = block.code.map((c) => c.text);
      const lines = block.code.map((c) => c.line);
      const masked = maskCode(texts);

      masked.forEach((lineText, idx) => {
        const lnNo = lines[idx];
        for (const m of lineText.matchAll(/\bmath\.([A-Za-z_]\w*)/g)) {
          const name = 'math.' + m[1];
          if (!allowedMath.has(name)) {
            errors.push(
              `${L.rel}:${lnNo} 使用了 ${name}，但此前课程从未引入。` +
                `请在本课 front matter 写 introduces_math: [${name}] 并在正文先讲清它的来历，或推迟到后面的课程`,
            );
          }
        }
        for (const b of TRACKED_BUILTINS) {
          if (new RegExp(`(?<![\\w.])${b}\\s*\\(`).test(lineText) && !allowedBuiltin.has(b)) {
            errors.push(
              `${L.rel}:${lnNo} 使用了内置函数 ${b}()，但此前没有课程引入过它。` +
                `请在 front matter 写 introduces_builtin: [${b}] 并在正文解释它做了什么`,
            );
          }
        }
        const imp = lineText.match(/^\s*(?:from\s+([A-Za-z_][\w.]*)|import\s+(.+))$/);
        if (imp) {
          const roots = imp[1]
            ? [imp[1]]
            : imp[2].split(',').map((s) => s.trim().split(/\s+as\s+/)[0].trim());
          for (const root of roots.filter(Boolean)) {
            const ok = expandRoot(root).some((r) => allowedImport.has(r));
            if (!ok) {
              errors.push(
                `${L.rel}:${lnNo} import 了 ${root}，但此前课程从未引入过这个库。` +
                  `请在本课或更早课程的 front matter 写 introduces_import（如 [${root}]）并在正文正式介绍它`,
              );
            }
          }
        }
        if (/\binput\s*\(/.test(lineText)) {
          errors.push(`${L.rel}:${lnNo} 浏览器里无法使用 input()，改用变量直接赋值`);
        }
        if (/while\s+True\b/.test(lineText)) {
          warns.push(`${L.rel}:${lnNo} 使用了 while True——浏览器里死循环无法中断，课程代码请避免`);
        }
      });
    }

    for (const f of extractInteractiveFences(L.text)) {
      const at = `${L.rel}:${f.line}`;
      if (f.unclosed) {
        errors.push(`${at} ${f.lang} 围栏未闭合`);
        continue;
      }
      const rawLines = f.code.map((c) => c.text);
      const joinedRaw = rawLines.join('\n');

      if (f.lang === 'viz') {
        const stripped = joinedRaw
          .replace(/^\s*\/\/.*$/gm, '')
          .replace(/,\s*([}\]])/g, '$1');
        let spec = null;
        try {
          spec = JSON.parse(stripped);
        } catch (e) {
          errors.push(`${at} viz 配置不是合法 JSON：${e.message}`);
          continue;
        }
        if (VIZ_TYPES.size && !VIZ_TYPES.has(spec.type)) {
          errors.push(
            `${at} 未知 viz 类型 "${spec.type}"（可用：${[...VIZ_TYPES].join(' / ')}）`,
          );
        }
        for (const s of Array.isArray(spec.sliders) ? spec.sliders : []) {
          for (const k of ['min', 'max', 'step', 'value']) {
            if (typeof s[k] !== 'number') {
              errors.push(`${at} 滑块 ${s.name || '?'} 的 ${k} 必须是数字`);
            }
          }
          if (
            typeof s.min === 'number' &&
            typeof s.max === 'number' &&
            s.min >= s.max
          ) {
            errors.push(`${at} 滑块 ${s.name || '?'} 的 min 必须小于 max`);
          }
        }
        /* 表达式编译闸门：用 viz.js 同一套编译器试编译，拦在构建前 */
        if (vizExpr && vizExpr.compileExpr) {
          const names = (Array.isArray(spec.sliders) ? spec.sliders : [])
            .map((s) => s && s.name)
            .filter((n) => typeof n === 'string');
          const vars = [...new Set([...VIZ_EXPR_VARS, ...names])];
          for (const key of VIZ_EXPR_KEYS) {
            const ex = spec[key];
            if (typeof ex !== 'string' || !ex.trim()) continue;
            try {
              vizExpr.compileExpr(ex, vars);
            } catch (e) {
              errors.push(
                `${at} viz 字段 ${key} 表达式无法编译：${e.message}（表达式：${ex}）`,
              );
            }
          }
        }
      } else if (f.lang === 'quiz') {
        const lines = rawLines.map((l) => l.trim()).filter(Boolean);
        const opts = lines.filter((l) => l.startsWith('-'));
        const marks = opts.filter((l) => /\[\*\]\s*$/.test(l)).length;
        const expl = lines.filter((l) => l.startsWith('?')).length;
        const qline = lines.find((l) => !l.startsWith('-') && !l.startsWith('?'));
        if (!qline) errors.push(`${at} quiz 缺少问题行`);
        if (opts.length < 2) errors.push(`${at} quiz 至少需要两个 "- " 选项`);
        if (marks !== 1)
          errors.push(`${at} quiz 必须恰好一个 "[*]" 正确项（当前 ${marks} 个）`);
        if (expl > 1) errors.push(`${at} quiz "?" 解释行最多一行`);
        const badExpl = rawLines.filter((l) => /^\s*\?\?/.test(l)).length;
        if (badExpl)
          errors.push(
            `${at} quiz 解释行须以单个 "? " 开头（发现 ${badExpl} 行 "??"——范式见 LESSON_TEMPLATE.md，历史 32 章 10 处曾整批漏网）`,
          );
        const dollars = (joinedRaw.match(/\$/g) || []).length;
        if (dollars >= 2 || /\\\(|\\\[/.test(joinedRaw)) {
          errors.push(`${at} quiz 题干禁止 KaTeX 公式（模板规则）`);
        }
      } else {
        const meta = { title: false, check: 0, hint: false };
        const init = [];
        for (const l of rawLines) {
          const m = l.match(/^#\s*@(title|check|hint):\s*(.*)$/);
          if (m) {
            if (m[1] === 'title') meta.title = true;
            else if (m[1] === 'check') meta.check += 1;
            else meta.hint = true;
          } else {
            init.push(l);
          }
        }
        if (!meta.title) errors.push(`${at} exercise 缺少 @title`);
        if (!meta.check) errors.push(`${at} exercise 缺少 @check`);
        if (!meta.hint) errors.push(`${at} exercise 缺少 @hint`);
        if (!init.join('\n').trim()) errors.push(`${at} exercise 初始代码为空`);
      }
    }
    for (const n of L.introMath) if (!registryMath.has(n)) registryMath.set(n, L.rel);
    for (const n of L.introBuiltin) if (!registryBuiltin.has(n)) registryBuiltin.set(n, L.rel);
    for (const n of L.introImport)
      for (const r of expandRoot(n))
        if (!registryImport.has(r)) registryImport.set(r, L.rel);
  }
}

console.log('\n══════════════════════════════════');
console.log(' 数学阶梯 · 课程逻辑闭环校验');
console.log('══════════════════════════════════\n');

if (listMode) {
  for (const L of lessons) {
    const tags = [...L.introMath, ...L.introBuiltin].join(', ');
    console.log(
      `${String(L.order.chNum).padStart(3)} | ${String(L.order.fNum).padStart(3)} | ${L.rel.padEnd(52)} ${tags ? '引入: ' + tags : ''}`,
    );
  }
  console.log('');
}

if (!listMode) {
  /* ---------- 参考资料（999-references）数据/产物一致性检查 ----------
     仅在默认 docsRoot 下执行（自定义目录的调用场景不涉及参考资料闸门）。 */
  if (docsRoot === path.resolve(path.join(scriptDir, '..', 'docs'))) {
    try {
      const refDataFile = path.join(scriptDir, 'references-data.json');
      const refData = JSON.parse(fs.readFileSync(refDataFile, 'utf8'));
      const chapterDirs = fs
        .readdirSync(docsRoot, { withFileTypes: true })
        .filter((d) => d.isDirectory() && /^\d+/.test(d.name))
        .map((d) => d.name);
      for (const dir of chapterDirs) {
        if (!refData[dir]) {
          warns.push(
            `${dir}/: references-data.json 缺少该章条目——请补数据后运行 node scripts/gen-references.mjs`,
          );
        }
      }
      const gen = spawnSync(
        process.execPath,
        [path.join(scriptDir, 'gen-references.mjs'), '--check'],
        { stdio: 'pipe' },
      );
      if (gen.status !== 0) {
        errors.push(
          '999-references.md 落后于 references-data.json——请运行 node scripts/gen-references.mjs 重新生成',
        );
      }
    } catch {
      /* references-data.json 缺失或不可读时跳过（gen-references.mjs 自身会报错） */
    }
  }
}

for (const w of warns) console.log('⚠ ' + w);

if (errors.length) {
  console.log('');
  for (const e of errors) console.log('✗ ' + e);
  console.log(`\n共 ${errors.length} 个断层。构建已阻止。\n`);
  process.exit(1);
}

if (!listMode) {
  console.log(
    `✔ ${lessons.length} 门课顺序与依赖闭环完好 | 登记 math ×${registryMath.size}、builtin ×${registryBuiltin.size}、import ×${registryImport.size}\n`,
  );
}
