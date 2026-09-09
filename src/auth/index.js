/* ============================================================
 * 数学阶梯 · 账号体系（校验在服务端，前端只管登录态）
 *
 * 设计定位：静态站 + 一台私有服务器（可选）。
 * - 不开放公开注册：账号由站方在服务器上用
 *   `node server/sync-server.mjs --add-user <用户名> <显示名> <密码>` 开通，
 *   账号库只留在服务器的数据目录里（server/data/accounts.json，不入库、不进 bundle）。
 * - 校验走 POST /api/login（见 loginRemote）。**前端不再 import accounts.json**，
 *   账号库一个字节都不打进 bundle——这是本次最大的安全收益：
 *   打开 DevTools 也抄不走任何账号哈希或明文。
 *   前端不再保留任何能校验密码的代码（那套已于 2026-09-04 删除），
 *   也不做本地校验兜底：连不上服务器就是**不登录**，一切按游客处理。
 * - 登录失败只有一句「用户名或密码不对」：不区分「没这个账号」与「密码错」
 *   （服务端两条路径跑同样的哈希，账号不存在时走诱饵 salt），杜绝枚举账号名单。
 * - 服务器连不上是另一种情况：不是登录失败，提示「已切换到本地模式」并留在登录页。
 * - 登录态存 localStorage `ml-auth`：{ u, name, token, at }。
 *   老格式（没有 token）也算已登录，只是不能云同步。
 * - 受登录门禁的能力：论文 PDF 的**本站归档副本**下载、学习进度的记录与管理
 *   （ml-progress / ml-exercises）。未登录用户可正常浏览全部课程内容、打开文献
 *   页面，PDF 下载按钮会指向原始出处（不暴露本站归档路径）；登录后同一按钮改为
 *   从 static/papers/ 取本地副本。
 * - 注意：这套门禁是「产品级权限入口」而非安全边界；真正的机密文件应放在
 *   未公开的存储位置，链接只发给已授权者。
 * ============================================================ */

/* 同步服务地址由 docusaurus.config.js 的 customFields.syncApi 给出（默认 /api），
   构建时可用环境变量 ML_SYNC_API 覆盖（服务独立部署到别的域名/端口时用）。
   这里读的是 Docusaurus 生成的那份配置，与运行时页面用的是同一个值。 */
import siteConfig from '@generated/docusaurus.config';

export const AUTH_KEY = 'ml-auth';

/* 登录态变化事件：论文卡片的「本地下载/原站下载」按钮监听它实时换脸，
   不必等路由切换重新扫描。 */
export const AUTH_EVENT = 'ml-auth-changed';

function notifyAuthChange() {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(AUTH_EVENT));
  } catch {
    /* 极老浏览器没有 CustomEvent 构造器：退化成不通知，页面刷新即生效 */
  }
}

/* 这里原先有一整套本地校验（sha256Hex / hashPassword / userIndex / safeEqual /
   verifyAccount / 诱饵 salt）。2026-09-04 账号库迁到服务端后已整体删除：
   前端一旦还留着「能校验密码」的代码，将来就会被顺手复活成本地兜底，
   而账号库已经不在 bundle 里了，那套代码既无用又是不确定性的温床。
   服务端有自己的一份同算法实现（server/sync-server.mjs），站方的
   scripts/add-user.mjs 也自带一份，都不依赖这里。 */

/* ============================================================
 * 远端登录（2026-09-04 新增）
 *
 * 账号库在服务器上，前端只负责把用户名密码递过去、把令牌收下来。
 * 三种结果必须分清：
 *   - 用户名或密码不对 → 一句通用提示（服务端对「没这个账号」也返回同一个错，
 *     前端绝不能再细分）；
 *   - 服务端限流 → 用服务端给的秒数冷却；
 *   - 连不上服务器 → 不是「登录失败」，是「没有服务器可问」，登录页会切本地模式。
 * 任何网络异常都在这里吞掉，绝不让异常冒到 UI 上去。
 * ============================================================ */

/** 云同步接口的基址（默认同源 /api，由 nginx 反代到本机的 Node 服务）。 */
export function syncApiBase() {
  const cf = (siteConfig && siteConfig.customFields) || {};
  return String(cf.syncApi || '/api').replace(/\/+$/, '');
}

/**
 * 向服务端换取令牌。
 * 返回：{ ok: true, user, name, token }
 *     | { ok: false, reason: 'bad' | 'ratelimited' | 'nobackend', retryAfter? }
 */
export async function loginRemote(user, pass) {
  if (typeof window === 'undefined') return { ok: false, reason: 'nobackend' };
  const clean = String(user || '').trim();
  try {
    const res = await fetch(syncApiBase() + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: clean, pass: String(pass || '') }),
    });
    const json = await res.json().catch(() => null);
    /* 回的不是 JSON（nginx 的 404 页、反代的错误页）＝这儿没有同步服务 */
    if (!json || typeof json !== 'object') return { ok: false, reason: 'nobackend' };
    if (res.status === 429) {
      return { ok: false, reason: 'ratelimited', retryAfter: Number(json.retryAfter) || 30 };
    }
    if (res.status === 200 && json.ok && json.token) {
      return {
        ok: true,
        user: String(json.user || clean.toLowerCase()),
        name: String(json.name || clean),
        token: String(json.token),
      };
    }
    return { ok: false, reason: 'bad' };
  } catch {
    /* 连不上 / 断网 / 超时 */
    return { ok: false, reason: 'nobackend' };
  }
}

/** 通知服务端吊销令牌。失败无所谓：本地照清，顶多让令牌自己过期。 */
export async function logoutRemote() {
  if (typeof window === 'undefined') return;
  const a = getAuth();
  if (!a || !a.token) return;
  try {
    await fetch(syncApiBase() + '/logout', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + a.token },
    });
  } catch {
    /* 服务端不可用：清本地就够，异常不许冒出去 */
  }
}

/** 令牌失效（服务端 401）时只摘掉令牌：人还是登录状态，只是不再同步。 */
export function dropToken() {
  if (typeof window === 'undefined') return;
  const a = getAuth();
  if (!a || !a.token) return;
  setAuth({ u: a.u, name: a.name, at: a.at });
}

/* ---------- 失败节流（防暴力试密码，纯本地、换浏览器即失效） ---------- */

const FAIL_KEY = 'ml-auth-fail';
const FAIL_LIMIT = 5; /* 连续失败到这个数开始冷却 */
const FAIL_BASE_MS = 30000; /* 首次冷却 30 秒，之后每次翻倍 */
const FAIL_MAX_MS = 15 * 60 * 1000; /* 封顶 15 分钟 */

function readFail() {
  if (typeof window === 'undefined') return { n: 0, until: 0 };
  try {
    const f = JSON.parse(window.localStorage.getItem(FAIL_KEY) || 'null');
    return f && typeof f === 'object' ? { n: f.n || 0, until: f.until || 0 } : { n: 0, until: 0 };
  } catch {
    return { n: 0, until: 0 };
  }
}

/* 当前还要冷却多少毫秒（0 = 可以再试） */
export function failCooldown() {
  const f = readFail();
  return Math.max(0, (f.until || 0) - Date.now());
}

/**
 * 记一次登录失败，返回新的剩余冷却毫秒。
 * forcedMs：服务端限流给的毫秒数（429 响应里的 retryAfter）。有它就用它——
 * 服务端是按 IP 记的，比本地这个「换浏览器就失效」的计数器准；
 * 两个值取大的那个，免得服务端说等 5 分钟、本地却只等 30 秒。
 */
export function noteFailure(forcedMs) {
  if (typeof window === 'undefined') return 0;
  const f = readFail();
  const n = (f.n || 0) + 1;
  let until = 0;
  if (n >= FAIL_LIMIT) {
    const step = Math.min(FAIL_BASE_MS * 2 ** (n - FAIL_LIMIT), FAIL_MAX_MS);
    until = Date.now() + step;
  }
  const forced = Number(forcedMs) || 0;
  if (forced > 0) until = Math.max(until, Date.now() + forced);
  try {
    window.localStorage.setItem(FAIL_KEY, JSON.stringify({ n, until }));
  } catch {
    /* 隐私模式下写不进去：退化成不限流 */
  }
  return Math.max(0, until - Date.now());
}

export function clearFailures() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(FAIL_KEY);
  } catch {
    /* 同上 */
  }
}

/* ---------- 登录态 ---------- */

export function getAuth() {
  if (typeof window === 'undefined') return null;
  try {
    const a = JSON.parse(window.localStorage.getItem(AUTH_KEY) || 'null');
    if (a && a.u && typeof a.u === 'string') return a;
    return null;
  } catch {
    return null;
  }
}

export function setAuth(auth) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  notifyAuthChange();
}

export function clearAuth() {
  if (typeof window === 'undefined') return;
  /* 先通知服务端吊销令牌，失败也继续清本地（logoutRemote 内部吞掉所有异常）。
     刻意不 await：登出是个同步的 UI 动作，不能等网络。 */
  try {
    logoutRemote();
  } catch {
    /* 兜底：理论上不会抛 */
  }
  window.localStorage.removeItem(AUTH_KEY);
  notifyAuthChange();
}

/* 供 enhancer / 组件统一使用：是否已登录 */
export function isAuthed() {
  return getAuth() != null;
}

/* 生成跳转登录页的地址，登录成功后回到当前页 */
export function loginUrlFor(currentPath) {
  return '/login?redirect=' + encodeURIComponent(currentPath || '/docs/intro');
}

/* 校验 redirect 参数：只允许站内路径，防 open redirect。
   注意浏览器会把路径里的 `\` 规范化为 `/`，所以 "/\evil.com"
   能绕过 "//" 前缀检查——必须单独拦掉。 */
export function safeRedirect(target) {
  if (
    typeof target === 'string' &&
    target.startsWith('/') &&
    !target.startsWith('//') &&
    !target.startsWith('/\\')
  ) {
    return target;
  }
  return '/';
}

/* 云同步**不在这里**拉起。
   本模块是纯工具层（登录态 + 令牌），不该承担「启动后台任务」这种副作用——
   被 import 就产生副作用是隐式行为，将来谁 import auth 都会顺带拉起同步。
   拉起的地方是站点级入口 src/theme/Root/index.js（每个路由都会走），
   那里用 useEffect + 动态 import 显式 boot，层次清楚，也不进主包。 */
