#!/usr/bin/env node
/* 账号管理工具（仅限站方本地使用）——「注册统一由本地 agent 处理」的落地。
 *
 * 用法：
 *   node scripts/add-user.mjs <用户名> <显示名> <密码>   # 开通 / 重置密码
 *   node scripts/add-user.mjs --list                     # 列出账号
 *   node scripts/add-user.mjs --remove <用户名>           # 删除账号
 *
 * 哈希口径与 src/auth/index.js 严格一致：sha256(salt + ':' + password)。
 * accounts.json 只存 salt + 哈希，不存明文；文件随构建打进 bundle（私有部署场景可接受）。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const accountsFile = path.join(scriptDir, '..', 'src', 'data', 'accounts.json');

function loadAccounts() {
  try {
    const arr = JSON.parse(fs.readFileSync(accountsFile, 'utf8'));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveAccounts(list) {
  fs.mkdirSync(path.dirname(accountsFile), { recursive: true });
  /* 原子写：先写临时文件再改名，中断不会留下截断的账号库 */
  const tmp = accountsFile + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, accountsFile);
}

function upsert(user, name, password) {
  if (!/^[a-zA-Z0-9_-]{2,32}$/.test(user)) {
    console.error('✗ 用户名限 2-32 位，只允许字母、数字、下划线、连字符');
    process.exit(1);
  }
  if (!password || password.length < 6) {
    console.error('✗ 密码至少 6 位');
    process.exit(1);
  }
  const list = loadAccounts();
  const salt = crypto.randomBytes(8).toString('hex'); // 16 hex chars
  const hash = crypto.createHash('sha256').update(salt + ':' + password, 'utf8').digest('hex');
  const existing = list.find((a) => a.user === user);
  if (existing) {
    existing.name = name || existing.name;
    existing.salt = salt;
    existing.hash = hash;
    existing.updatedAt = new Date().toISOString().slice(0, 10);
    console.log(`✔ 已重置账号 ${user}（显示名：${existing.name}）`);
  } else {
    list.push({
      user,
      name: name || user,
      salt,
      hash,
      createdAt: new Date().toISOString().slice(0, 10),
    });
    console.log(`✔ 已开通账号 ${user}（显示名：${name || user}）`);
  }
  saveAccounts(list);
}

const args = process.argv.slice(2);

if (args[0] === '--list') {
  const list = loadAccounts();
  if (!list.length) {
    console.log('（当前没有任何账号）');
  } else {
    for (const a of list) {
      console.log(`${a.user.padEnd(20)} ${String(a.name).padEnd(20)} 建于 ${a.createdAt}`);
    }
  }
} else if (args[0] === '--remove') {
  const user = args[1];
  const list = loadAccounts().filter((a) => a.user !== user);
  saveAccounts(list);
  console.log(`✔ 已删除账号 ${user}（如存在）`);
} else if (args.length >= 3) {
  upsert(args[0], args[1], args[2]);
} else {
  console.log('用法：node scripts/add-user.mjs <用户名> <显示名> <密码>');
  console.log('      node scripts/add-user.mjs --list');
  console.log('      node scripts/add-user.mjs --remove <用户名>');
  process.exit(args.length ? 1 : 0);
}
