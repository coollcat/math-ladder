#!/usr/bin/env node
/* 账号管理工具（仅限站方本地使用）——「注册统一由本地 agent 处理」的落地。
 *
 * 用法：
 *   node scripts/add-user.mjs <用户名> <显示名> <密码>   # 开通 / 重置密码
 *   node scripts/add-user.mjs <用户名> <密码>            # 同上，显示名缺省为用户名
 *   node scripts/add-user.mjs --list                     # 列出账号（读本地明文台账）
 *   node scripts/add-user.mjs --check <用户名>           # 查这个用户名是否已开通
 *   node scripts/add-user.mjs --remove <用户名>           # 删除账号
 *   node scripts/add-user.mjs --migrate                  # 旧格式账号库一键迁移
 *   node scripts/add-user.mjs --rotate-salt              # 换用户名索引盐（防离线枚举）
 *
 * 两个哈希口径，与 src/auth/index.js 严格一致（node:crypto 与前端自实现已做过一致性测试）：
 *   账号索引 u   = sha256(lookupSalt + ':' + 用户名小写)
 *   密码哈希 hash = sha256(salt + ':' + password)
 *
 * 账号库 src/data/accounts.json **不存明文用户名**（2026-09-04 起）：
 * 明文名单只落在 scripts/accounts-index.json（本地台账，已加 .gitignore，
 * 不随构建进 bundle），站方 --list 看得到，访客从 bundle 里抄不到。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(scriptDir, '..');
const accountsFile = path.join(projectRoot, 'src', 'data', 'accounts.json');
const indexFile = path.join(scriptDir, 'accounts-index.json');

const DEFAULT_DECOY_SALT = '3f9c1a7e5b28d064';

function randHex(n) {
  return crypto.randomBytes(n).toString('hex');
}

function userIndex(lookupSalt, user) {
  return crypto
    .createHash('sha256')
    .update(lookupSalt + ':' + String(user || '').trim().toLowerCase(), 'utf8')
    .digest('hex');
}

function passHash(salt, password) {
  return crypto.createHash('sha256').update(salt + ':' + password, 'utf8').digest('hex');
}

function canonUser(user) {
  return String(user || '').trim().toLowerCase();
}

/* ---------- 账号库读写 ---------- */

function loadDb() {
  let raw = null;
  try {
    raw = JSON.parse(fs.readFileSync(accountsFile, 'utf8'));
  } catch {
    return null; /* 文件不存在或坏了：当作空库 */
  }
  if (!Array.isArray(raw)) return raw;

  /* 旧格式（[{user, name, salt, hash, createdAt}]）→ 新格式（{lookupSalt, decoySalt, users:[{u,...}]}）。
     明文用户名顺手挪进本地台账，账号库本身只留索引。 */
  const lookupSalt = randHex(8);
  const db = { lookupSalt, decoySalt: randHex(8), users: [] };
  const index = loadIndex();
  for (const a of raw) {
    if (!a || !a.user) continue;
    db.users.push({
      u: userIndex(lookupSalt, a.user),
      salt: a.salt,
      hash: a.hash,
      createdAt: a.createdAt || new Date().toISOString().slice(0, 10),
    });
    const key = canonUser(a.user);
    index[key] = { name: a.name || a.user, createdAt: a.createdAt || new Date().toISOString().slice(0, 10) };
  }
  saveIndex(index);
  console.log(`· 检测到旧格式账号库，已转索引格式（${db.users.length} 个账号；明文名单挪进 scripts/accounts-index.json）`);
  saveDb(db);
  return db;
}

function saveDb(db) {
  fs.mkdirSync(path.dirname(accountsFile), { recursive: true });
  /* 原子写：先写临时文件再改名，中断不会留下截断的账号库 */
  const tmp = accountsFile + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, accountsFile);
}

function emptyDb() {
  return { lookupSalt: randHex(8), decoySalt: randHex(8), users: [] };
}

/* ---------- 本地明文台账（站方自己看，gitignored，不进 bundle） ---------- */

function loadIndex() {
  try {
    const j = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
    return j && typeof j === 'object' ? j : {};
  } catch {
    return {};
  }
}

function saveIndex(index) {
  fs.writeFileSync(indexFile, JSON.stringify(index, null, 2) + '\n', 'utf8');
}

/* ---------- 操作 ---------- */

function upsert(user, name, password) {
  const cu = canonUser(user);
  if (!/^[a-z0-9_-]{2,32}$/.test(cu)) {
    console.error('✗ 用户名限 2-32 位，只允许字母、数字、下划线、连字符');
    process.exit(1);
  }
  if (!password || password.length < 6) {
    console.error('✗ 密码至少 6 位');
    process.exit(1);
  }
  const db = loadDb() || emptyDb();
  const key = userIndex(db.lookupSalt, cu);
  const salt = randHex(8);
  const hash = passHash(salt, password);
  const today = new Date().toISOString().slice(0, 10);
  const existing = db.users.find((a) => a.u === key);
  if (existing) {
    existing.salt = salt;
    existing.hash = hash;
    existing.updatedAt = today;
    console.log(`✔ 已重置账号 ${cu} 的密码`);
  } else {
    db.users.push({ u: key, salt, hash, createdAt: today });
    console.log(`✔ 已开通账号 ${cu}`);
  }
  saveDb(db);

  const index = loadIndex();
  index[cu] = { name: name || index[cu]?.name || user.trim(), createdAt: index[cu]?.createdAt || today, updatedAt: today };
  saveIndex(index);
}

function remove(user) {
  const db = loadDb();
  if (!db) {
    console.log('（账号库是空的，没什么可删）');
    return;
  }
  const cu = canonUser(user);
  const key = userIndex(db.lookupSalt, cu);
  const before = db.users.length;
  db.users = db.users.filter((a) => a.u !== key);
  if (db.users.length === before) {
    console.log(`· 账号库里没有 ${cu}（无需删除）`);
  } else {
    saveDb(db);
    console.log(`✔ 已删除账号 ${cu}`);
  }
  const index = loadIndex();
  if (index[cu]) {
    delete index[cu];
    saveIndex(index);
  }
}

function list() {
  const db = loadDb();
  const users = (db && db.users) || [];
  const index = loadIndex();
  if (!users.length) {
    console.log('（当前没有任何账号）');
    return;
  }
  const byIndex = new Map();
  for (const k of Object.keys(index)) byIndex.set(userIndex(db.lookupSalt, k), k);
  console.log(`共 ${users.length} 个账号：`);
  for (const a of users) {
    const name = byIndex.get(a.u);
    const show = name ? `${name.padEnd(20)} ${String(index[name].name || '').padEnd(20)}` : `<台账缺名> ${a.u.slice(0, 12)}…`.padEnd(41);
    console.log(`  ${show} 建于 ${a.createdAt}${a.updatedAt ? ' 改于 ' + a.updatedAt : ''}`);
  }
  if (!Object.keys(index).length) {
    console.log('  （提示：scripts/accounts-index.json 是空的，只能列出索引；它是本地明文台账，不入库）');
  }
}

function check(user) {
  const db = loadDb();
  const cu = canonUser(user);
  const hit = ((db && db.users) || []).some((a) => a.u === userIndex(db.lookupSalt, cu));
  console.log(hit ? `✔ ${cu} 已开通` : `✗ ${cu} 未开通`);
}

/* 换掉用户名索引盐并重算全部索引：需要台账里有完整的明文名单 */
function rotateSalt() {
  const db = loadDb();
  if (!db || !db.users.length) {
    console.log('（账号库是空的，无需轮换）');
    return;
  }
  const index = loadIndex();
  if (!Object.keys(index).length) {
    console.error('✗ 台账 scripts/accounts-index.json 是空的，无法重算索引（账号库只存索引，没有明文就推不出来）');
    process.exit(1);
  }
  const oldSalt = db.lookupSalt;
  const newSalt = randHex(8);
  const byOld = new Map();
  for (const k of Object.keys(index)) byOld.set(userIndex(oldSalt, k), k);
  let missed = 0;
  for (const a of db.users) {
    const name = byOld.get(a.u);
    if (!name) {
      missed++;
      continue;
    }
    a.u = userIndex(newSalt, name);
  }
  db.lookupSalt = newSalt;
  db.decoySalt = randHex(8);
  saveDb(db);
  console.log(`✔ 已轮换用户名索引盐（${db.users.length - missed} 个账号重算）`);
  if (missed) console.log(`  ⚠ ${missed} 个账号在台账里找不到名字，索引没动，请核对后重跑`);
}

/* ---------- 命令行 ---------- */

const args = process.argv.slice(2);

function usage() {
  console.log('用法：node scripts/add-user.mjs <用户名> [显示名] <密码>');
  console.log('      node scripts/add-user.mjs --list');
  console.log('      node scripts/add-user.mjs --check <用户名>');
  console.log('      node scripts/add-user.mjs --remove <用户名>');
  console.log('      node scripts/add-user.mjs --migrate');
  console.log('      node scripts/add-user.mjs --rotate-salt');
}

if (!args.length || args[0] === '--help' || args[0] === '-h') {
  usage();
  process.exit(args.length ? 0 : 1);
} else if (args[0] === '--list') {
  list();
} else if (args[0] === '--check') {
  if (!args[1]) {
    usage();
    process.exit(1);
  }
  check(args[1]);
} else if (args[0] === '--remove') {
  if (!args[1]) {
    usage();
    process.exit(1);
  }
  remove(args[1]);
} else if (args[0] === '--migrate') {
  const db = loadDb();
  console.log(`✔ 账号库已是索引格式：${((db && db.users) || []).length} 个账号，未存任何明文用户名`);
} else if (args[0] === '--rotate-salt') {
  rotateSalt();
} else if (args[0].startsWith('-')) {
  console.error(`✗ 未知参数：${args[0]}`);
  usage();
  process.exit(1);
} else if (args.length >= 3) {
  upsert(args[0], args[1], args[2]);
} else if (args.length === 2) {
  upsert(args[0], args[0], args[1]);
} else {
  usage();
  process.exit(1);
}
