#!/usr/bin/env node
/* ============================================================
 * 数学阶梯 · 云同步服务（零第三方依赖，只用 node:http / fs / crypto / path）
 *
 * 定位：后端是**可选的增强**。nginx 托管静态产物，/api/* 反代到本服务；
 * 服务挂了站点照样能学，只是同步不了——所以这里所有失败都只返回状态码，
 * 不做任何「必须成功」的假设。
 *
 * 用法：
 *   node server/sync-server.mjs --port 8787 --data ./server/data
 *   node server/sync-server.mjs --add-user <用户名> <显示名> <密码>
 *   node server/sync-server.mjs --add-user <用户名> <密码>       # 显示名缺省=用户名
 *   node server/sync-server.mjs --list-users
 *   node server/sync-server.mjs --remove-user <用户名>
 *
 * 环境变量（命令行参数优先）：ML_SYNC_PORT / ML_SYNC_DATA / ML_SYNC_HOST
 *
 * 安全口径（与 src/auth/index.js、scripts/add-user.mjs 严格一致）：
 *   密码哈希 hash = sha256(salt + ':' + password)，salt 为 8 字节随机 hex。
 *   账号不存在时也要跑一次**等价开销**的哈希（诱饵 salt），并且不提前 return，
 *   让「没这个账号」与「密码错」在耗时上分不出来。
 *   服务端账号文件存**明文 user**（该文件不随站点分发，明文便于 CLI 维护）。
 * ============================================================ */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/* ---------------- 常量 ---------------- */

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; /* 令牌 30 天，每次成功请求顺延 */
const TOKEN_BYTES = 32; /* 32 字节 → 64 位 hex */
const MAX_STORE_BYTES = 4 * 1024 * 1024; /* 单账号数据上限 4 MB，超出 413 */
const MAX_BODY_BYTES = MAX_STORE_BYTES + 1024 * 1024; /* 请求体硬上限，超出直接 413（不读完不占内存） */
const MAX_JSON_BYTES = 256 * 1024; /* 登录这类小包的上限 */

const FAIL_LIMIT = 5; /* 连续失败到这个数开始冷却 */
const FAIL_BASE_MS = 30 * 1000; /* 首次冷却 30 秒，之后每次翻倍 */
const FAIL_MAX_MS = 15 * 60 * 1000; /* 封顶 15 分钟 */

const HIT_WINDOW_MS = 60 * 1000; /* 通用限流窗口（防刷接口，与登录冷却是两套） */
const HIT_LIMIT = 120; /* 每 IP 每分钟最多 120 次 /api 请求 */

const MAX_BOOKS = 20; /* 与前端 MAX_BOOKS 一致 */
const MAX_ITEMS = 200; /* 与前端 MAX_ITEMS 一致 */

/* 用户名白名单：落盘路径直接由它拼出来，收紧这一条就是防路径穿越的全部防线 */
const USER_RE = /^[a-z0-9_-]{2,32}$/;

/* ---------------- 小工具 ---------------- */

function randHex(n) {
  return crypto.randomBytes(n).toString('hex');
}

function passHash(salt, password) {
  return crypto.createHash('sha256').update(salt + ':' + password, 'utf8').digest('hex');
}

function canonUser(user) {
  return String(user == null ? '' : user).trim().toLowerCase();
}

/* 定长比较：不提前 return，避免「第一个不同字符的位置」被计时差测出来 */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function nowStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/* 日志：不记密码、不记 token、不记 body */
function log(method, urlPath, status, ms) {
  console.log(`[${nowStr()}] ${method} ${urlPath} ${status} ${ms}ms`);
}

/* ---------------- 合并规则（§3.2，服务端权威实现，前端照抄同一套） ----------------
 * 总原则：任何一条数据结构不对 → **丢弃该字段、保留另一边**，绝不整包报错。
 * 五个字段各自独立判定，坏一边不影响另一边。 */

/* progress / exercises：按键取并集，同一键 true 与 false 冲突时 true 赢
 * （已学 / 已通过的记录不会被另一端抹掉）。 */
function mergeFlags(a, b) {
  const okA = isPlainObject(a);
  const okB = isPlainObject(b);
  if (!okA && !okB) return {};
  const A = okA ? a : {};
  const B = okB ? b : {};
  const out = {};
  for (const k of Object.keys(A)) out[k] = A[k];
  for (const k of Object.keys(B)) {
    if (out[k] === true || B[k] === true) out[k] = true;
    else if (!(k in out)) out[k] = B[k];
  }
  return out;
}

/* last（续学位置）：at 大的那条赢；一边为 null 就用另一边 */
function mergeLast(a, b) {
  const okA = isPlainObject(a);
  const okB = isPlainObject(b);
  if (!okA && !okB) return null;
  if (!okA) return b;
  if (!okB) return a;
  return num(b.at) > num(a.at) ? b : a;
}

/* notebook：以**本子**为粒度合并。
 *   - 先按 id 匹配；id 不同但 title 相同的视为同一本（兼容老数据）；
 *   - 同一本取 at 较新的**整本覆盖**（at 缺失按 0 算）；
 *   - 两边各有对方没有的本子都保留；
 *   - 本子上限 20，按 at 从新到旧保留。 */
function mergeNotebook(a, b) {
  const okA = isPlainObject(a) && Array.isArray(a.books);
  const okB = isPlainObject(b) && Array.isArray(b.books);
  if (!okA && !okB) return null;
  if (!okA) return b;
  if (!okB) return a;

  const listA = a.books.filter(isPlainObject);
  const listB = b.books.filter(isPlainObject);
  const usedB = new Set();
  const out = [];

  for (const ba of listA) {
    let idx = -1;
    const ida = typeof ba.id === 'string' && ba.id ? ba.id : '';
    if (ida) idx = listB.findIndex((bb, i) => !usedB.has(i) && typeof bb.id === 'string' && bb.id === ida);
    if (idx < 0) {
      const ta = typeof ba.title === 'string' ? ba.title : '';
      if (ta) idx = listB.findIndex((bb, i) => !usedB.has(i) && typeof bb.title === 'string' && bb.title === ta);
    }
    if (idx >= 0) {
      usedB.add(idx);
      out.push(num(listB[idx].at) > num(ba.at) ? listB[idx] : ba);
    } else {
      out.push(ba);
    }
  }
  for (let i = 0; i < listB.length; i++) if (!usedB.has(i)) out.push(listB[i]);

  out.sort((x, y) => num(y.at) - num(x.at));
  return { v: num(a.v) || num(b.v) || 1, books: out.slice(0, MAX_BOOKS) };
}

/* repo：按 **code 内容**去重（与前端现有一致），同内容保留 at 新的；
 * 没有 code 的条目退化为按 id 去重（既无 code 又无 id 的原样保留，不参与去重），
 * 宁可少去重也不能把用户存的东西凭空吞掉。上限 200。 */
function mergeRepo(a, b) {
  const okA = isPlainObject(a) && Array.isArray(a.items);
  const okB = isPlainObject(b) && Array.isArray(b.items);
  if (!okA && !okB) return null;
  if (!okA) return b;
  if (!okB) return a;

  const out = [];
  const slotByCode = new Map(); /* code → out 里的下标 */
  const slotById = new Map(); /* id   → out 里的下标 */

  const take = (it) => {
    if (!isPlainObject(it)) return;
    const code = typeof it.code === 'string' ? it.code : null;
    const id = typeof it.id === 'string' && it.id ? it.id : null;
    const slot = code ? slotByCode : id ? slotById : null;
    const key = code || id;
    if (!slot) {
      out.push(it);
      return;
    }
    if (!slot.has(key)) {
      slot.set(key, out.length);
      out.push(it);
      return;
    }
    const i = slot.get(key);
    if (num(it.at) > num(out[i].at)) out[i] = it;
  };

  for (const it of a.items) take(it);
  for (const it of b.items) take(it);

  out.sort((x, y) => num(y.at) - num(x.at));
  return { v: num(a.v) || num(b.v) || 1, items: out.slice(0, MAX_ITEMS) };
}

/* merge(local, remote) → merged。两边对称：所有字段的取舍规则都不依赖左右顺序。 */
export function mergeBundles(local, remote) {
  const A = isPlainObject(local) ? local : {};
  const B = isPlainObject(remote) ? remote : {};
  return {
    progress: mergeFlags(A.progress, B.progress),
    exercises: mergeFlags(A.exercises, B.exercises),
    last: mergeLast(A.last, B.last),
    notebook: mergeNotebook(A.notebook, B.notebook),
    repo: mergeRepo(A.repo, B.repo),
  };
}

/* ---------------- 存储层 ---------------- */

function readJson(file, fallback) {
  try {
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    return j && typeof j === 'object' ? j : fallback;
  } catch {
    return fallback;
  }
}

/* 原子写：临时文件 + rename。进程被 kill 时不会留下半个文件。 */
function writeJsonAtomic(file, obj, pretty) {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(file)}.${process.pid}.tmp`);
  const text = (pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj)) + '\n';
  fs.writeFileSync(tmp, text, 'utf8');
  fs.renameSync(tmp, file);
  try {
    fs.chmodSync(file, 0o600); /* 账号/令牌含哈希，POSIX 上收紧权限；Windows 忽略 */
  } catch {
    /* Windows 上 chmod 无意义，忽略 */
  }
}

/* 用户名 → 数据文件。多重校验：白名单 + 解析后的路径必须仍在 store/ 里。 */
function storePathFor(user, storeDir) {
  if (!USER_RE.test(user)) throw new Error('bad-user-name');
  const file = path.join(storeDir, `${user}.json`);
  const resolved = path.resolve(file);
  const base = path.resolve(storeDir);
  if (path.dirname(resolved) !== base || path.basename(resolved) !== `${user}.json`) {
    throw new Error('bad-user-name');
  }
  return file;
}

function loadStore(user, storeDir) {
  let file;
  try {
    file = storePathFor(user, storeDir);
  } catch {
    return { at: 0, data: null };
  }
  try {
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!isPlainObject(j)) return { at: 0, data: null };
    return { at: num(j.at), data: j.data == null ? null : j.data };
  } catch {
    return { at: 0, data: null }; /* 文件不存在或坏了都当作「这个账号还没数据」 */
  }
}

function saveStore(user, storeDir, at, data) {
  const file = storePathFor(user, storeDir);
  fs.mkdirSync(storeDir, { recursive: true });
  const tmp = path.join(storeDir, `.${user}.${process.pid}.${randHex(4)}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify({ at, data }) + '\n', 'utf8');
  fs.renameSync(tmp, file);
}

/* ---------------- 账号管理（子命令，走完直接退出） ---------------- */

function accountsPath(dataDir) {
  return path.join(dataDir, 'accounts.json');
}

function loadAccounts(dataDir) {
  const db = readJson(accountsPath(dataDir), null);
  if (!db || !Array.isArray(db.users)) {
    return { decoySalt: randHex(8), users: [] };
  }
  if (typeof db.decoySalt !== 'string' || !db.decoySalt) db.decoySalt = randHex(8);
  db.users = db.users.filter((a) => isPlainObject(a) && typeof a.user === 'string');
  return db;
}

function cmdAddUser(dataDir, args) {
  if (args.length < 2) {
    console.error('用法：node server/sync-server.mjs --add-user <用户名> <显示名> <密码>');
    console.error('      node server/sync-server.mjs --add-user <用户名> <密码>   （显示名缺省为用户名）');
    process.exit(1);
  }
  /* 参数既可以 <用户> <显示名> <密码>，也可以 <用户> <密码> */
  const user = canonUser(args[0]);
  const name = args.length >= 3 ? String(args[1]).trim() : String(args[0]).trim();
  const password = args.length >= 3 ? args[2] : args[1];

  if (!USER_RE.test(user)) {
    console.error('✗ 用户名限 2-32 位，只允许小写字母、数字、下划线、连字符');
    process.exit(1);
  }
  if (typeof password !== 'string' || password.length < 6) {
    console.error('✗ 密码至少 6 位');
    process.exit(1);
  }

  const db = loadAccounts(dataDir);
  const salt = randHex(8);
  const hash = passHash(salt, password);
  const today = new Date().toISOString().slice(0, 10);
  const existing = db.users.find((a) => a.user === user);
  if (existing) {
    existing.salt = salt;
    existing.hash = hash;
    existing.updatedAt = today;
    console.log(`✔ 已重置账号 ${user} 的密码（显示名：${name}）`);
    existing.name = name || user;
  } else {
    db.users.push({ user, name: name || user, salt, hash, createdAt: today });
    console.log(`✔ 已开通账号 ${user}（显示名：${name || user}）`);
  }
  writeJsonAtomic(accountsPath(dataDir), db, true);
  console.log(`· 账号库：${accountsPath(dataDir)}`);
}

function cmdListUsers(dataDir) {
  const db = loadAccounts(dataDir);
  if (!db.users.length) {
    console.log('（当前没有任何账号）');
    return;
  }
  console.log(`共 ${db.users.length} 个账号：`);
  for (const a of db.users) {
    const size = (() => {
      try {
        return `${(fs.statSync(storePathFor(a.user, path.join(dataDir, 'store'))).size / 1024).toFixed(1)} KB`;
      } catch {
        return '无数据';
      }
    })();
    console.log(
      `  ${String(a.user).padEnd(20)} ${String(a.name || '').padEnd(16)} 建于 ${a.createdAt || '?'}${a.updatedAt ? ' 改于 ' + a.updatedAt : ''}  数据 ${size}`,
    );
  }
}

function cmdRemoveUser(dataDir, user) {
  if (!user) {
    console.error('用法：node server/sync-server.mjs --remove-user <用户名>');
    process.exit(1);
  }
  const cu = canonUser(user);
  const db = loadAccounts(dataDir);
  const before = db.users.length;
  db.users = db.users.filter((a) => a.user !== cu);
  if (db.users.length === before) {
    console.log(`· 账号库里没有 ${cu}（无需删除）`);
  } else {
    writeJsonAtomic(accountsPath(dataDir), db, true);
    console.log(`✔ 已删除账号 ${cu}`);
  }
  /* 令牌一起清掉；**数据文件刻意留着不删**——删账号不该顺手把用户的学习记录带走，
     要清理由维护者自己动手，路径打印出来。 */
  const tokensFile = path.join(dataDir, 'tokens.json');
  const tokens = readJson(tokensFile, {});
  let revoked = 0;
  for (const t of Object.keys(tokens)) {
    if (tokens[t] && tokens[t].user === cu) {
      delete tokens[t];
      revoked++;
    }
  }
  if (revoked) writeJsonAtomic(tokensFile, tokens, true);
  console.log(`· 已吊销 ${revoked} 个令牌`);
  try {
    const f = storePathFor(cu, path.join(dataDir, 'store'));
    if (fs.existsSync(f)) console.log(`· 数据文件保留未删：${f}`);
  } catch {
    /* 用户名不合法，本来就没有数据文件 */
  }
}

/* ---------------- 老账号平移（一次性迁移命令） ----------------
 * 站点此前是纯静态部署，账号库在 src/data/accounts.json（只存索引 u 与 salt/hash，
 * 不存明文用户名；明文名单在 scripts/accounts-index.json 的本地台账里）。
 * 账号库搬到服务端之后，这份旧库就成了唯一的凭据来源——不把它平移过来，
 * 老账号在服务端一个都登不进去，只能全员重设密码。
 *
 * 用法：node server/sync-server.mjs --import-accounts <旧 accounts.json> [--names <台账 json>] [--force]
 *
 * 关键点：**salt 与 hash 原样搬运**（哈希口径两侧一致：sha256(salt + ':' + 密码)），
 * 所以老密码一个都不用改。明文用户名靠台账反推：对台账里每个名字算
 * sha256(旧 lookupSalt + ':' + 名字)，与旧库条目的 u 配对；台账里查不到的条目
 * 跳过并列出来，绝不瞎猜。 */

function cmdImportAccounts(dataDir, rest) {
  const file = rest[0];
  let namesFile = null;
  let force = false;
  for (let i = 1; i < rest.length; i++) {
    if (rest[i] === '--names') {
      namesFile = rest[++i] || null;
    } else if (rest[i] === '--force') {
      force = true;
    } else {
      console.error(`✗ 不认识的参数：${rest[i]}`);
      process.exit(1);
    }
  }
  if (!file) {
    console.error('用法：node server/sync-server.mjs --import-accounts <旧 accounts.json> [--names <台账 json>] [--force]');
    console.error('      --names 指向本地明文台账（如 scripts/accounts-index.json），没有它只能按索引跳过');
    process.exit(1);
  }

  const legacy = readJson(path.resolve(process.cwd(), file), null);
  if (!legacy || !Array.isArray(legacy.users)) {
    console.error(`✗ 旧账号库读不出来（或不是 {users:[...]} 结构）：${file}`);
    process.exit(1);
  }
  const legacySalt = typeof legacy.lookupSalt === 'string' ? legacy.lookupSalt : '';
  if (!legacySalt) {
    console.error('✗ 旧账号库缺 lookupSalt —— 无法用台账反推明文用户名');
    process.exit(1);
  }

  const names = namesFile ? readJson(path.resolve(process.cwd(), namesFile), null) : null;
  const nameByKey = new Map();
  if (names && typeof names === 'object') {
    for (const k of Object.keys(names)) {
      const cu = canonUser(k);
      const idx = crypto.createHash('sha256').update(legacySalt + ':' + cu, 'utf8').digest('hex');
      nameByKey.set(idx, { user: cu, name: (names[k] && names[k].name) || cu, createdAt: (names[k] && names[k].createdAt) || '' });
    }
  } else if (namesFile) {
    console.error(`⚠ 明文台账读不出来：${namesFile} —— 所有条目都会因查不到名字而被跳过`);
  } else {
    console.log('· 未提供 --names 台账：只能按索引匹配，所有旧条目都会被跳过（它们没有明文用户名）');
  }

  const db = loadAccounts(dataDir);
  const today = new Date().toISOString().slice(0, 10);
  const imported = [];
  const skippedNoName = [];
  const skippedExists = [];

  for (const old of legacy.users) {
    if (!isPlainObject(old) || typeof old.u !== 'string' || typeof old.salt !== 'string' || typeof old.hash !== 'string') {
      skippedNoName.push('<结构不完整的条目>');
      continue;
    }
    const who = nameByKey.get(old.u);
    if (!who) {
      skippedNoName.push(old.u.slice(0, 12) + '…（台账里没有对应名字）');
      continue;
    }
    if (!USER_RE.test(who.user)) {
      skippedNoName.push(`${who.user}（用户名不合法）`);
      continue;
    }
    const existing = db.users.find((a) => a.user === who.user);
    if (existing) {
      if (force) {
        existing.salt = old.salt;
        existing.hash = old.hash;
        existing.name = who.name || existing.name;
        existing.updatedAt = today;
        imported.push(`${who.user}（覆盖）`);
      } else {
        skippedExists.push(who.user);
      }
      continue;
    }
    db.users.push({
      user: who.user,
      name: who.name || who.user,
      salt: old.salt,
      hash: old.hash,
      createdAt: old.createdAt || who.createdAt || today,
    });
    imported.push(who.user);
  }

  if (imported.length) {
    writeJsonAtomic(accountsPath(dataDir), db, true);
    console.log(`✔ 平移完成：${imported.length} 个账号 → ${accountsPath(dataDir)}`);
    console.log(`  ${imported.join('、')}`);
    console.log('· salt 与 hash 是原样搬运的，老密码不用改。');
  } else {
    console.log('· 没有可平移的账号。');
  }
  if (skippedExists.length) console.log(`· 已存在跳过 ${skippedExists.length} 个：${skippedExists.join('、')}（要覆盖加 --force）`);
  if (skippedNoName.length) console.log(`⚠ 台账查不到名字而跳过 ${skippedNoName.length} 个：${skippedNoName.join('、')}`);
}

/* ---------------- 限流 ---------------- */

const failState = new Map(); /* ip → { n, until } */
const hitState = new Map(); /* ip → number[]（请求时间戳） */

/* 登录冷却剩余毫秒（0 = 可以再试） */
function cooldownLeft(ip) {
  const f = failState.get(ip);
  return f ? Math.max(0, f.until - Date.now()) : 0;
}

/* 记一次登录失败，返回新的冷却毫秒 */
function noteFailure(ip) {
  const f = failState.get(ip) || { n: 0, until: 0 };
  f.n += 1;
  if (f.n >= FAIL_LIMIT) {
    const step = Math.min(FAIL_BASE_MS * 2 ** (f.n - FAIL_LIMIT), FAIL_MAX_MS);
    f.until = Date.now() + step;
  }
  failState.set(ip, f);
  return Math.max(0, f.until - Date.now());
}

function clearFailures(ip) {
  failState.delete(ip);
}

/* 通用接口限流：防刷。返回剩余冷却秒数（0 = 放行） */
function noteHit(ip) {
  const now = Date.now();
  let arr = (hitState.get(ip) || []).filter((t) => now - t < HIT_WINDOW_MS);
  if (arr.length >= HIT_LIMIT) {
    hitState.set(ip, arr);
    return Math.max(1, Math.ceil((HIT_WINDOW_MS - (now - arr[0])) / 1000));
  }
  arr.push(now);
  hitState.set(ip, arr);
  return 0;
}

/* ---------------- 命令行 ---------------- */

function usage() {
  console.log('数学阶梯 · 云同步服务（零第三方依赖）');
  console.log('');
  console.log('  启动服务：');
  console.log('    node server/sync-server.mjs [--port 8787] [--data ./server/data] [--host 127.0.0.1] [--no-cors]');
  console.log('');
  console.log('  账号管理（走完直接退出，不启服务）：');
  console.log('    node server/sync-server.mjs --add-user <用户名> <显示名> <密码>');
  console.log('    node server/sync-server.mjs --list-users');
  console.log('    node server/sync-server.mjs --remove-user <用户名>');
  console.log('');
  console.log('  老账号平移（纯静态时代的账号库 → 服务端，老密码不用改）：');
  console.log('    node server/sync-server.mjs --import-accounts src/data/accounts.json --names scripts/accounts-index.json');
  console.log('');
  console.log('  环境变量：ML_SYNC_PORT / ML_SYNC_DATA / ML_SYNC_HOST（命令行参数优先）');
}

const COMMANDS = ['--add-user', '--list-users', '--remove-user', '--import-accounts', '--help', '-h'];
const VALUE_OPTS = new Set(['--port', '--host', '--data']);

function parseArgs(argv) {
  const opts = {
    port: Number(process.env.ML_SYNC_PORT) || 8787,
    host: process.env.ML_SYNC_HOST || '127.0.0.1',
    data: process.env.ML_SYNC_DATA || './server/data',
    cors: true,
    command: null,
    rest: [],
  };
  const rest = [];
  const unknown = [];
  let afterCommand = false;

  /* 全局选项（--port/--host/--data）在子命令**前后**都要认：
     `--add-user u n p --data ./x` 这种写法很自然，扫到子命令就停会丢掉数据目录。 */
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (COMMANDS.includes(a)) {
      opts.command = a === '-h' ? '--help' : a;
      afterCommand = true;
      continue;
    }
    if (a === '--no-cors') {
      opts.cors = false;
      continue;
    }
    if (a === '--cors') {
      opts.cors = true;
      continue;
    }
    const eq = a.indexOf('=');
    const name = eq > 0 ? a.slice(0, eq) : a;
    if (VALUE_OPTS.has(name)) {
      const val = eq > 0 ? a.slice(eq + 1) : argv[++i];
      if (name === '--port') opts.port = Number(val);
      else if (name === '--host') opts.host = String(val);
      else opts.data = String(val);
      continue;
    }
    if (afterCommand) rest.push(a);
    else unknown.push(a);
  }
  opts.rest = rest;

  if (unknown.length) {
    console.error(`✗ 未知参数：${unknown[0]}`);
    usage();
    process.exit(1);
  }
  if (!Number.isFinite(opts.port) || opts.port <= 0 || opts.port > 65535) {
    console.error('✗ 端口号不合法');
    process.exit(1);
  }
  return opts;
}

/* ---------------- 服务主体 ---------------- */

function startServer(opts) {
  const dataDir = path.resolve(process.cwd(), opts.data);
  const storeDir = path.join(dataDir, 'store');
  const tokensFile = path.join(dataDir, 'tokens.json');

  fs.mkdirSync(storeDir, { recursive: true });

  /* 令牌：{ <token>: { user, exp } }。启动时清掉过期的。 */
  const tokens = readJson(tokensFile, {});
  let expired = 0;
  const now0 = Date.now();
  for (const t of Object.keys(tokens)) {
    const rec = tokens[t];
    if (!isPlainObject(rec) || typeof rec.user !== 'string' || !num(rec.exp) || num(rec.exp) < now0) {
      delete tokens[t];
      expired++;
    }
  }
  if (expired) writeJsonAtomic(tokensFile, tokens, true);

  let tokensDirty = false;
  const flushTokens = () => {
    if (!tokensDirty) return;
    tokensDirty = false;
    writeJsonAtomic(tokensFile, tokens, true);
  };
  /* 续期很频繁（每次成功请求都改 exp），落盘按 30 秒节流，别每请求都写一遍文件 */
  const flushTimer = setInterval(flushTokens, 30 * 1000);
  flushTimer.unref();

  const accounts = loadAccounts(dataDir);

  /* 同一个账号的读-改-写必须串行：两个设备并发 PUT，后一个要看到前一个的结果，
     否则先写进去的那批数据会被整包覆盖掉。 */
  const locks = new Map();
  function withUserLock(user, fn) {
    const prev = locks.get(user) || Promise.resolve();
    const cur = prev.catch(() => {}).then(fn);
    const chain = cur.catch(() => {});
    locks.set(user, chain);
    chain.then(() => {
      if (locks.get(user) === chain) locks.delete(user);
    });
    return cur;
  }

  function send(res, status, obj) {
    const body = JSON.stringify(obj);
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(body, 'utf8'),
      'Cache-Control': 'no-store',
    });
    res.end(body);
  }

  function applyCors(req, res) {
    if (!opts.cors) return;
    const origin = req.headers.origin;
    if (!origin) return;
    /* 回显来源而不是写死 *：带 Authorization 头的跨域请求，* 在老浏览器上不被接受 */
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  /* 读 body：超限时不中断连接（中断了就没法回 413），继续读完但不存 */
  function readBody(req, limit) {
    return new Promise((resolve, reject) => {
      let size = 0;
      let over = false;
      const chunks = [];
      req.on('data', (c) => {
        if (over) return;
        size += c.length;
        if (size > limit) {
          over = true;
          chunks.length = 0;
          return;
        }
        chunks.push(c);
      });
      req.on('end', () => {
        if (over) resolve(null);
        else resolve(Buffer.concat(chunks).toString('utf8'));
      });
      req.on('error', reject);
    });
  }

  function bearer(req) {
    const h = String(req.headers.authorization || '').trim();
    const m = /^Bearer\s+([0-9a-fA-F]+)$/.exec(h);
    return m ? m[1].toLowerCase() : null;
  }

  function tokenUser(token) {
    if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
    const rec = tokens[token];
    if (!isPlainObject(rec) || typeof rec.user !== 'string') return null;
    if (!num(rec.exp) || num(rec.exp) < Date.now()) return null;
    return rec.user;
  }

  /* 取令牌对应的用户；顺延有效期。失败返回 null（由调用方回 401） */
  function requireAuth(req) {
    const token = bearer(req);
    const user = tokenUser(token);
    if (!user) return null;
    tokens[token].exp = Date.now() + TOKEN_TTL_MS;
    tokensDirty = true;
    return user;
  }

  function findAccount(user) {
    let hit = null;
    /* 刻意不提前 break：账号存不存在都要把整个库走完，耗时才对得齐 */
    for (let i = 0; i < accounts.users.length; i++) {
      const a = accounts.users[i];
      if (safeEqual(String(a.user), user)) hit = a;
    }
    return hit;
  }

  async function handleLogin(req, res) {
    const cd = cooldownLeft(req.ip);
    if (cd > 0) {
      return send(res, 429, { ok: false, error: 'too-many', retryAfter: Math.ceil(cd / 1000) });
    }
    const raw = await readBody(req, MAX_JSON_BYTES);
    if (raw === null) return send(res, 413, { ok: false, error: 'too-large' });
    let body = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      noteFailure(req.ip);
      return send(res, 400, { ok: false, error: 'bad-json' });
    }
    const user = canonUser(body.user);
    const pass = typeof body.pass === 'string' ? body.pass : '';

    /* 账号不存在时拿诱饵 salt 跑一次等价哈希，两条失败路径耗时一致 */
    const acct = findAccount(user);
    const got = passHash(acct ? acct.salt : accounts.decoySalt, pass);
    if (!user || !pass || !acct || !safeEqual(got, acct.hash)) {
      noteFailure(req.ip);
      return send(res, 401, { ok: false, error: 'bad-credentials' });
    }
    clearFailures(req.ip);

    const token = randHex(TOKEN_BYTES);
    tokens[token] = { user: acct.user, exp: Date.now() + TOKEN_TTL_MS };
    tokensDirty = true;
    flushTokens(); /* 登录这种低频操作立刻落盘，重启不丢会话 */
    return send(res, 200, { ok: true, token, user: acct.user, name: acct.name || acct.user });
  }

  function handleLogout(req, res) {
    const token = bearer(req);
    if (token && tokens[token]) {
      delete tokens[token];
      tokensDirty = true;
      flushTokens();
    }
    return send(res, 200, { ok: true }); /* 令牌不存在也返回 ok */
  }

  function handleGet(req, res) {
    const user = requireAuth(req);
    if (!user) return send(res, 401, { ok: false, error: 'unauthorized' });
    const rec = loadStore(user, storeDir);
    return send(res, 200, { ok: true, at: rec.at, data: rec.data });
  }

  async function handlePut(req, res) {
    const user = requireAuth(req);
    if (!user) return send(res, 401, { ok: false, error: 'unauthorized' });

    const raw = await readBody(req, MAX_BODY_BYTES);
    if (raw === null) return send(res, 413, { ok: false, error: 'too-large' });
    let body = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      return send(res, 400, { ok: false, error: 'bad-json' });
    }
    if (!isPlainObject(body)) return send(res, 400, { ok: false, error: 'bad-request' });

    const incoming = body.data;
    if (incoming === undefined) return send(res, 400, { ok: false, error: 'bad-request' });

    let result;
    try {
      result = await withUserLock(user, () => {
        const cur = loadStore(user, storeDir);
        const merged = mergeBundles(cur.data, incoming);
        const size = Buffer.byteLength(JSON.stringify(merged), 'utf8');
        if (size > MAX_STORE_BYTES) {
          const e = new Error('too-large');
          e.tooLarge = true;
          throw e;
        }
        /* 版本号严格递增：同一毫秒内的两次写入也要能分出先后 */
        const at = Math.max(Date.now(), cur.at + 1);
        saveStore(user, storeDir, at, merged);
        return { at, data: merged };
      });
    } catch (e) {
      if (e && e.tooLarge) return send(res, 413, { ok: false, error: 'too-large' });
      throw e;
    }
    return send(res, 200, { ok: true, at: result.at, data: result.data });
  }

  /* 取客户端 IP：nginx 反代时看 X-Forwarded-For 的第一跳，否则用 socket 地址。
     只信反代层的头，因为服务默认只监听 127.0.0.1。必须在主处理器开头就算好，
     挂 'request' 监听器的注册顺序晚于 createServer 回调，来不及。 */
  function clientIp(req) {
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff.trim()) return xff.split(',')[0].trim();
    return req.socket.remoteAddress || 'unknown';
  }

  const server = http.createServer((req, res) => {
    const t0 = process.hrtime.bigint();
    req.ip = clientIp(req);
    let urlPath;
    try {
      urlPath = new URL(req.url || '/', 'http://localhost').pathname.replace(/\/+$/, '') || '/';
    } catch {
      urlPath = req.url || '/';
    }
    const method = (req.method || 'GET').toUpperCase();

    /* 记日志：只记方法/路径/状态/耗时，密码与 token 一概不碰 */
    const done = (status) => {
      const ms = Number(process.hrtime.bigint() - t0) / 1e6;
      log(method, urlPath, status, ms.toFixed(0));
    };

    applyCors(req, res);

    if (method === 'OPTIONS') {
      res.writeHead(204, { 'Content-Length': 0 });
      res.end();
      done(204);
      return;
    }

    /* 通用限流（按 IP），登录失败冷却是另一套、更严 */
    const wait = noteHit(req.ip);
    if (wait > 0) {
      done(429);
      send(res, 429, { ok: false, error: 'too-many', retryAfter: wait });
      return;
    }

    const route = `${method} ${urlPath}`;
    const job = (() => {
      switch (route) {
        case 'POST /api/login':
          return handleLogin(req, res);
        case 'POST /api/logout':
          return handleLogout(req, res);
        case 'GET /api/sync':
          return handleGet(req, res);
        case 'PUT /api/sync':
          return handlePut(req, res);
        default:
          return null;
      }
    })();

    if (job === null) {
      done(404);
      send(res, 404, { ok: false, error: 'not-found' });
      return;
    }

    Promise.resolve(job)
      .then((status) => done(status == null ? 200 : status))
      .catch((err) => {
        console.error(`[${nowStr()}] ERROR ${method} ${urlPath} ${err && err.message ? err.message : err}`);
        if (!res.headersSent) {
          done(500);
          send(res, 500, { ok: false, error: 'server-error' });
        } else {
          done(500);
        }
      });
  });

  /* 优雅退出：先把令牌落盘，再关监听 */
  let closing = false;
  const shutdown = (sig) => {
    if (closing) return;
    closing = true;
    console.log(`\n[${nowStr()}] 收到 ${sig}，落盘后退出…`);
    flushTokens();
    clearInterval(flushTimer);
    try {
      server.close(() => process.exit(0));
    } catch {
      process.exit(0);
    }
    /* 兜底：还有连接没断干净也别吊着 */
    setTimeout(() => process.exit(0), 3000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  /* 限流表定期瘦身，免得长期运行把内存撑起来 */
  const gcTimer = setInterval(() => {
    const now = Date.now();
    for (const [ip, f] of failState) if (f.until && f.until + FAIL_MAX_MS < now) failState.delete(ip);
    for (const [ip, arr] of hitState) {
      const kept = arr.filter((t) => now - t < HIT_WINDOW_MS);
      if (kept.length) hitState.set(ip, kept);
      else hitState.delete(ip);
    }
  }, 5 * 60 * 1000);
  gcTimer.unref();

  server.listen(opts.port, opts.host, () => {
    console.log(`· 数学阶梯同步服务已启动：http://${opts.host}:${opts.port}/api`);
    console.log(`· 数据目录：${dataDir}`);
    console.log(`· 账号数：${accounts.users.length}（启动时清掉 ${expired} 个过期令牌）`);
    if (opts.host === '127.0.0.1') console.log('· 只监听本机，由 nginx 反代；需要对外请加 --host 0.0.0.0');
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(`✗ 端口 ${opts.port} 被占用了，换一个：--port 8788`);
      process.exit(1);
    }
    console.error(`✗ 服务出错：${err && err.message ? err.message : err}`);
    process.exit(1);
  });
}

/* ---------------- 入口 ---------------- */

const opts = parseArgs(process.argv.slice(2));
const dataDirArg = path.resolve(process.cwd(), opts.data);

if (opts.command === '--help') {
  usage();
  process.exit(0);
} else if (opts.command === '--add-user') {
  cmdAddUser(dataDirArg, opts.rest);
  process.exit(0);
} else if (opts.command === '--list-users') {
  cmdListUsers(dataDirArg);
  process.exit(0);
} else if (opts.command === '--remove-user') {
  cmdRemoveUser(dataDirArg, canonUser(opts.rest[0]));
  process.exit(0);
} else if (opts.command === '--import-accounts') {
  cmdImportAccounts(dataDirArg, opts.rest);
  process.exit(0);
}

startServer(opts);
