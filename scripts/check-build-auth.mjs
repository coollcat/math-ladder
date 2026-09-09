#!/usr/bin/env node
/* 打包自检：出包前确认三件「错了在服务器上看不出来」的事。
 *
 * 静态站没有后端，下面这些东西必须真的编进产物，否则问题只会暴露在线上：
 *   1. 账号指纹（lookupSalt + 每个账号的索引）在产物里 —— 没出现就是账号系统没进包；
 *   2. 产物里搜不到任何明文用户名 —— 搜得到说明账号名单在裸奔；
 *   3. 数据面板（备份 / 还原 / 空间搬家）在产物里 —— 它是动态 import 的，
 *      chunk 没分出来时页面不报错、只是「点了没反应」，最难查；而它正是
 *      用户换设备带走进度、笔记本、代码的唯一出口。
 *
 * 用法： node scripts/check-build-auth.mjs [build 目录]
 * 退出码： 0 = 通过（可能有警告）  1 = 有硬错误（没打进去 / 明文泄漏）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(scriptDir, '..');
const buildDir = path.resolve(process.argv[2] || path.join(projectRoot, 'build'));
const accountsFile = path.join(projectRoot, 'src', 'data', 'accounts.json');
/* 云同步上线后，真正的账号库搬到服务端了；src/data 那份变成没人再写的遗留文件。
   要防的是「服务端账号库漏进产物」，所以云同步模式下必须读服务端那份。 */
const serverAccountsFile = path.join(projectRoot, 'server', 'data', 'accounts.json');
const indexFile = path.join(scriptDir, 'accounts-index.json');

const SCAN_EXT = new Set(['.js', '.mjs', '.html', '.css']);
const SKIP_DIRS = new Set(['papers', 'fonts', 'img', 'assets\\fonts', 'assets/fonts']);
const MAX_FILE = 24 * 1024 * 1024; /* 单文件超过 24MB 不扫（正常 bundle 不会这么大） */

let errors = 0;
let warns = 0;

function fail(msg) {
  errors++;
  console.log(`  ✗ ${msg}`);
}

function warn(msg) {
  warns++;
  console.log(`  ⚠ ${msg}`);
}

function ok(msg) {
  console.log(`  ✔ ${msg}`);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/* ---------- 收集待扫文件 ---------- */
function collect(dir, out = []) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      collect(p, out);
    } else if (e.isFile() && SCAN_EXT.has(path.extname(e.name))) {
      let size = 0;
      try {
        size = fs.statSync(p).size;
      } catch {
        continue;
      }
      if (size <= MAX_FILE) out.push(p);
    }
  }
  return out;
}

/* 在文件里找 needle（纯字符串），返回命中处上下文（最多 3 段） */
function occurrences(file, needle, limit = 3) {
  const hits = [];
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return hits;
  }
  let at = text.indexOf(needle);
  while (at >= 0 && hits.length < limit) {
    hits.push(text.slice(Math.max(0, at - 45), at + needle.length + 45).replace(/\s+/g, ' '));
    at = text.indexOf(needle, at + needle.length);
  }
  return hits;
}

/* ---------- 账号库到底还在不在前端？ ----------
 * 两种部署形态，这一项的判据是**反的**：
 *   · 纯静态（账号打进 bundle）：账号指纹必须出现在产物里，没出现就是没打进去；
 *   · 云同步（账号库搬到服务端，前端不再 import accounts.json）：
 *     产物里一旦出现账号 salt / 哈希，就是泄漏，必须报错。
 * 判据看源码里还有没有 import，而不是靠命令行开关记，免得两边记岔了。 */
/* 只认「真的把它 import 进来了」的写法，不认注释里提到这个文件名。
   裸字符串匹配会冤枉人：下个人在注释里写一句「账号库已迁到服务端，见 src/data/accounts.json」
   就会被判成纯静态模式 → 反过来要求产物里必须有账号指纹 → 硬失败。
   匹配三种写法：import … from '…accounts.json' / import('…accounts.json') / require('…accounts.json') */
const ACCOUNTS_IMPORT_RE =
  /from\s+['"][^'"]*accounts\.json['"]|import\(\s*['"][^'"]*accounts\.json['"]|require\(\s*['"][^'"]*accounts\.json['"]/;

function frontEndHasAccounts() {
  let hit = false;
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules') continue;
        walk(p);
      } else if (/\.(js|jsx|ts|tsx|mjs)$/.test(e.name)) {
        try {
          if (ACCOUNTS_IMPORT_RE.test(fs.readFileSync(p, 'utf8'))) hit = true;
        } catch {
          /* 读不动就跳过 */
        }
      }
    }
  };
  try {
    walk(path.join(projectRoot, 'src'));
  } catch {
    /* src 不在（只给了 build 目录跑）：按「账号在前端」处理，保守报错 */
    return true;
  }
  return hit;
}

/* ---------- 主流程 ---------- */

console.log('产物自检：' + buildDir);

if (!fs.existsSync(buildDir)) {
  console.log(`  ✗ 找不到构建产物 ${buildDir}，先跑构建`);
  process.exit(1);
}

const inFrontEnd = frontEndHasAccounts();
/* 读哪份账号库：云同步模式优先服务端那份（真身），读不到再退回 src/data 那份 */
let accountsPath = accountsFile;
if (!inFrontEnd && fs.existsSync(serverAccountsFile)) accountsPath = serverAccountsFile;
console.log(`  账号库位置：${inFrontEnd ? '前端 bundle（纯静态模式）' : '服务端（云同步模式）'}`);
console.log(`  账号库文件：${path.relative(projectRoot, accountsPath)}`);

const db = readJson(accountsPath);
if (inFrontEnd) {
  if (!db) {
    console.log(`  ✗ 读不出账号库 ${accountsPath}`);
    process.exit(1);
  }
  if (Array.isArray(db)) {
    console.log('  ✗ 账号库还是旧格式（明文用户名数组），先跑： node scripts/add-user.mjs --migrate');
    process.exit(1);
  }
} else if (!db) {
  warn(`云同步模式下没找到服务端账号库 ${path.relative(projectRoot, serverAccountsFile)}，跳过账号相关检查`);
}

const users = (!Array.isArray(db) && db && db.users) || [];
const index = readJson(indexFile) || {};
const names = Object.keys(index);

const files = collect(buildDir);
if (!files.length) {
  console.log('  ✗ 产物里没有可扫的 js/html/css 文件');
  process.exit(1);
}
console.log(`  扫描 ${files.length} 个文件，账号 ${users.length} 个，台账里有 ${names.length} 个名字`);

/* 1. 账号相关：两种形态判据相反，理由见 frontEndHasAccounts 的注释 */
if (inFrontEnd) {
  let fingerprint = false;
  for (const f of files) {
    if (occurrences(f, db.lookupSalt, 1).length) {
      fingerprint = true;
      break;
    }
  }
  if (fingerprint) ok('账号系统已打进产物（在 bundle 里找到账号库指纹）');
  else fail('产物里找不到账号库指纹 —— 账号系统没进包，登录后谁都登不进去');

  if (users.length) {
    let found = 0;
    for (const a of users) {
      let hit = false;
      for (const f of files) {
        if (occurrences(f, a.u, 1).length) {
          hit = true;
          break;
        }
      }
      if (hit) found += 1;
    }
    if (found === users.length) ok(`${users.length} 个账号的索引全部在产物里（前端与 node 的哈希口径一致）`);
    else fail(`${users.length} 个账号里只有 ${found} 个的索引能在产物中找到，多半是哈希口径不一致`);
  } else {
    warn('账号库是空的 —— 站点打包出来谁都登不进去（确定不要账号就忽略）');
  }
} else if (db) {
  const leaks = [];
  for (const a of users) {
    for (const val of [a.salt, a.hash]) {
      if (!val || String(val).length < 12) continue;
      let hit = false;
      for (const f of files) {
        if (occurrences(f, val, 1).length) {
          leaks.push(`${String(val).slice(0, 8)}… 出现在 ${path.relative(buildDir, f)}`);
          hit = true;
          break;
        }
      }
      if (hit) break;
    }
  }
  if (leaks.length) fail(`账号库已经搬到服务端了，产物里却还能搜到账号数据：${leaks.join('；')}`);
  else ok('账号库没进产物（账号在服务端，bundle 里零账号数据）');
}

/* 服务端目录（server/、data/、deploy/）绝不能落进 build/：
   build/ 是公开静态目录，任何人都拼得出 URL 直接下载，账号库与用户数据会整个裸奔。
   两种模式都查 —— 纯静态出包时同样不该有这些东西。 */
for (const d of ['server', 'data', 'deploy']) {
  if (fs.existsSync(path.join(buildDir, d))) {
    fail(`产物里出现了 ${d}/ —— 服务端目录不该在公开静态目录里（build/ 下的文件任何人都能下载）`);
  }
}

/* 3. 明文用户名泄漏检查 */
if (names.length) {
  let leaked = 0;
  for (const name of names) {
    if (name.length < 4) continue; /* 2-3 字符的名字太容易撞上无关代码，跳过 */
    const where = [];
    for (const f of files) {
      const hits = occurrences(f, name, 2);
      if (hits.length) where.push({ f: path.relative(buildDir, f), hits });
      if (where.length >= 2) break;
    }
    if (!where.length) continue;
    leaked++;
    const where_ = where[0];
    /* 长名字几乎不可能撞车 → 硬错误；短名字（admin 这类）可能是无关代码里的同名词 → 警告 + 给上下文自己看 */
    const line = `明文用户名 "${name}" 出现在 ${where_.f}：…${where_.hits[0]}…`;
    if (name.length >= 7) fail(line);
    else warn(`${line}（名字短，可能是无关代码里的同名词，人工确认一下）`);
  }
  if (!leaked) ok(`台账里的 ${names.length} 个用户名在产物中全部搜不到（bundle 里没有账号名单）`);
} else {
  console.log('  · 本地台账 scripts/accounts-index.json 为空，跳过明文泄漏检查');
}

/* 4. 数据面板（备份 / 还原 / 空间搬家）在不在产物里。
   它是 enhancer 里动态 import 的：chunk 没分出来时页面不报错，
   只表现为「右下角第三个圆钮点了没反应」，在本地 dev 下也容易漏看。 */
const NEEDLES = [
  ['math-ladder-backup', '备份文件的格式标识'],
  ['ml-bk-fab', '数据面板圆钮'],
];
const CSS_NEEDLES = ['.ml-backup', '.ml-fab--data'];
const missing = [];
for (const [needle, what] of NEEDLES) {
  let hit = false;
  for (const f of files) {
    if (occurrences(f, needle, 1).length) {
      hit = true;
      break;
    }
  }
  if (!hit) missing.push(`${needle}（${what}）`);
}
for (const needle of CSS_NEEDLES) {
  let hit = false;
  for (const f of files) {
    if (occurrences(f, needle, 1).length) {
      hit = true;
      break;
    }
  }
  if (!hit) missing.push(needle + '（样式）');
}
if (!missing.length) ok('数据面板（备份 / 还原 / 空间搬家）已打进产物');
else fail(`数据面板没进包，产物里搜不到：${missing.join('、')}`);

console.log('');
if (errors) {
  console.log(`自检未通过：${errors} 个硬错误、${warns} 个警告`);
  process.exit(1);
}
console.log(`自检通过${warns ? `（${warns} 个警告，见上）` : ''}`);
process.exit(0);
