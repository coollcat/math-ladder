#!/usr/bin/env node
/* UNIT_GUIDES 章号引用审计（低频脚本，对应 OPEN_ITEMS §十一第 4 条）
 *
 * 拦两类病：
 * 1. 「第 N 章」/ 裸「NNN 章」里的 N 不落在 00–67（或该章目录不存在）；
 * 2. 旧号段（VISION §4 重排前的 110/130/…/490）复活——历史上曾因只扫「第 N 章」
 *    而漏掉裸形式，这里两种写法都查。
 *
 * 用法：node scripts/audit-unit-guides.mjs   （发现问题时 exit 1）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const guidesDir = path.join(root, 'UNIT_GUIDES');
const docsDir = path.join(root, 'docs');

/* 现行章号（00–67）以 docs/ 实际目录为准 */
const existingChapters = new Set(
  fs
    .readdirSync(docsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d+/.test(e.name) && !e.name.includes('.'))
    .map((e) => parseInt(e.name, 10)),
);

/* VISION §4 重排前的旧号段 → 现章号（与 OPEN_ITEMS §2.1 映射表保持一致，改一处必改另一处） */
const OLD_TO_NEW = {
  110: 27, 130: 29, 160: 32, 190: 35,
  220: 36, 230: 37, 240: 38, 250: 39, 260: 40, 270: 41, 280: 42,
  300: 43, 310: 44, 320: 45, 330: 46, 340: 47, 360: 49, 370: 50,
  390: 52, 400: 53, 450: 58, 460: 66, 490: 60,
};
const oldNums = Object.keys(OLD_TO_NEW).join('|');

const problems = [];

/* 历史引语豁免： these 行本身在讲「旧号是什么」，复扫时人工确认后登记在此 */
const EXEMPT = [
  /原注的 490\/300\/310 即现第 60\/43\/44 章/, // 52-control 自解释映射注
  /原「220–280 全部是 index 占位骨架」为写作当时快照/, // 45-ml-math 历史引语
  /原「220\/240\/250\/260\/270\/280 与 300\/320 全部是 index 占位骨架」为写作当时快照/, // 54 历史引语
  /原「只有 index 占位骨架」为写作当时快照/, // 45-ml-math 历史引语
  /原「300\/310 只有 index 骨架」为写作当时快照/, // 52-control 历史引语
];

for (const f of fs.readdirSync(guidesDir).filter((f) => f.endsWith('.md'))) {
  const rel = `UNIT_GUIDES/${f}`;
  const lines = fs.readFileSync(path.join(guidesDir, f), 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    const ln = `${rel}:${i + 1}`;
    if (EXEMPT.some((re) => re.test(line))) return;

    /* 1. 「第 N 章」或裸「NNN 章」：章号必须真实存在 */
    for (const m of line.matchAll(/(第\s*)?(\d{1,3})\s*章/g)) {
      const n = parseInt(m[2], 10);
      if (!existingChapters.has(n)) {
        problems.push(`${ln} 引用了不存在的章号「${m[0]}」（docs/ 下无 ${n} 章）`);
      }
    }

    /* 2. 旧号段复活（两种形式都查） */
    for (const m of line.matchAll(new RegExp(`(第\\s*)?(${oldNums})\\s*章`, 'g'))) {
      const old = parseInt(m[2], 10);
      problems.push(
        `${ln} 旧号段复活「${m[0]}」→ 应写第 ${OLD_TO_NEW[old]} 章（历史引语如需保留，请加「写作当时快照」注记并登记 EXEMPT）`,
      );
    }
  });
}

console.log(`UNIT_GUIDES 章号审计：${fs.readdirSync(guidesDir).filter((f) => f.endsWith('.md')).length} 份，问题 ${problems.length} 处`);
for (const p of problems) console.log('✗ ' + p);
process.exit(problems.length ? 1 : 0);
