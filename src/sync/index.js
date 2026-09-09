/* =========================================================================
 * 云同步（可选增强）
 * -------------------------------------------------------------------------
 * 为什么叫「可选增强」：站点本身是纯静态的，同步服务（server/sync-server.mjs）
 * 可能压根没部署。所以这里每一条失败路径都只做一件事——**降级**：后端没起、
 * 断网、令牌过期、数据太大，统统不报错、不弹窗、不打断学习，本地那份
 * localStorage 永远是能用的。
 *
 * 同步什么：学习进度 / 练习通过记录 / 续学位置 / 数学笔记本 / 代码仓库，
 * 按账号（localStorage 的命名空间）隔离，跟「数据」面板里搬来搬去的是同一份。
 *
 * 不做实时协同、不弹冲突框：冲突按云端同步规范的 §3.2 合并规则自动吞掉
 * （已学标记取并集、笔记本按本子取新的、代码按内容去重），用户不需要做选择。
 * 这份规则服务端也实现了一份，两边必须一致——改这里要同步改服务端。
 *
 * 依赖方向：本模块 import auth / progress / notebook / repo，
 * 反过来它们只 dispatch 一个 'ml-data-dirty' 事件，不认识本模块，避免成环。
 * ========================================================================= */

import { getAuth, syncApiBase, dropToken, AUTH_EVENT } from '../auth';
import { progressNS, readSpace, writeSpace } from '../learning/progress';

/* 同步状态变化事件：登录页与「数据」面板监听它实时刷新状态行 */
export const SYNC_EVENT = 'ml-sync-changed';

/* 数据变更事件：三个数据模块只管 dispatch，本模块是唯一的监听方
   （让它们 import 本模块会成环：progress ← notebook/repo ← sync） */
const DIRTY_EVENT = 'ml-data-dirty';

const MAX_BOOKS = 20; /* 与 notebook.js 的 MAX_BOOKS 保持一致 */
const MAX_ITEMS = 200; /* 与 repo.js 的 MAX_ITEMS 保持一致 */

const DEBOUNCE_MS = 2000; /* 改一处进度就发一次请求太浪费，攒 2 秒一起发 */
const RETRY_MS = 30000; /* 失败后至少隔这么久再自动试一次，别刷屏 */
const TIMEOUT_MS = 15000; /* 单次请求超时：卡住的请求不能一直挂着占用状态 */

/* 云端版本号与「还有改动没推上去」的标记按账号分开存。
   键名刻意不带冒号：progress.js 的 listSpaces 靠 ml-xxx:<ns> 认空间，
   带冒号会被当成多出一个空间。 */
const STATE_KEY = 'ml-sync-state';

let state = 'off'; /* off | ok | syncing | error | nobackend */
let lastAt = 0; /* 上次成功同步的时刻 */
let error = ''; /* 失败原因（给用户看的一句话） */
let cloudAt = 0; /* 上次拿到的云端版本号，PUT 时当 base 传给服务端判并发 */
let pendingPush = false; /* 本地有改动还没推成功 */
let nextTryAt = 0; /* 失败冷却：这之前不自动重试 */
let debounceTimer = null;
let retryTimer = null;
let inflight = false;
let queued = null;
let applying = false; /* 正在把云端结果写回本地：这期间的数据变更不算「本地改动」 */
let booted = false;
let lastUser = '';

/* ---------- 状态 ---------- */

function emit() {
  if (typeof document === 'undefined') return;
  try {
    document.dispatchEvent(new Event(SYNC_EVENT));
  } catch {
    /* 极老浏览器没有 Event 构造器：退化成不通知，下次查询时自然是最新的 */
  }
}

function setState(next, msg) {
  const err = msg || '';
  if (state === next && error === err) return;
  state = next;
  error = err;
  emit();
}

/**
 * 当前同步状态。UI 只关心这三个字段。
 * state: 'off' 未登录/没有令牌 | 'ok' 已同步 | 'syncing' 正在同步
 *        | 'error' 失败（有改动没同步） | 'nobackend' 连不上后端
 */
export function syncStatus() {
  return { state, lastAt, error };
}

/** 订阅状态变化，返回取消订阅函数。 */
export function onSyncChange(cb) {
  if (typeof document === 'undefined') return () => {};
  const handler = () => {
    try {
      cb(syncStatus());
    } catch {
      /* 订阅方自己炸了不该拖垮同步 */
    }
  };
  document.addEventListener(SYNC_EVENT, handler);
  return () => document.removeEventListener(SYNC_EVENT, handler);
}

/**
 * 给 UI 用的同步状态——**状态判定与文案的唯一出处，调用方只管呈现**。
 *
 * 纪律：调用方（登录页、「数据」面板）不许自己再写一遍 if/文案/时间格式化。
 * 抄一份的代价是两处文案必然漂移（2026-09-04 就发生过：登录页与面板各写了一份，
 * 连 ago() 都是两份）。要改文案就改这里。
 *
 * where：'page'（默认，登录页之类，可以指路）/ 'panel'（就在「数据」面板内部，
 *   ——在面板里说「去右下角的数据面板」等于让用户找自己已经打开的东西，
 *   所以面板内一律不指路，只说上下文无关的话）。
 *
 * 返回 { tone, text, action?, state, error }，或者 null —— null 表示
 * 「这一行不用显示」。
 * tone 用于挑样式：'ok' 已同步 / 'warn' 有改动没同步 / 'muted' 其余。
 * state 与 error 一并带出来，调用方不必再调一次 syncStatus()。
 */
export function syncHint(where) {
  const auth = getAuth();
  const st = syncStatus();
  const inPanel = where === 'panel';
  if (!auth || !auth.u) {
    return {
      tone: 'muted',
      state: st.state,
      error: '',
      text: inPanel ? '登录后可云同步。现在数据只存在这台浏览器。' : '登录后可云同步（现在数据只存在这台浏览器）',
    };
  }
  if (!auth.token) {
    return {
      tone: 'muted',
      state: st.state,
      error: '',
      text: inPanel
        ? '这个账号只在本地生效，云同步没连上：数据只存在这台浏览器。'
        : '这个账号只在本地生效：数据只存在这台浏览器，换设备请用右下角「数据」导出备份。',
    };
  }
  if (st.state === 'syncing') return { tone: 'muted', state: st.state, error: '', text: '正在同步…' };
  if (st.state === 'ok') {
    return { tone: 'ok', state: st.state, error: '', text: `云端已同步 · ${ago(st.lastAt)}`, action: '立即同步' };
  }
  if (st.state === 'error' || (st.state === 'nobackend' && st.lastAt > 0)) {
    /* 之前同步过、这次连不上 → 真离线，值得告诉用户（并带上原因） */
    return {
      tone: 'warn',
      state: st.state,
      error: st.error,
      text: '有改动没同步（离线模式，数据只在这台浏览器）',
      action: '重试',
    };
  }
  /* 从没连上过后端：站点多半没部署同步服务，静默降级，这一行不显示 */
  return null;
}

function ago(ts) {
  const d = Date.now() - Number(ts || 0);
  if (!Number.isFinite(d) || d < 60000) return '刚刚';
  const min = Math.floor(d / 60000);
  if (min < 60) return `${min} 分钟前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} 小时前`;
  return `${Math.floor(h / 24)} 天前`;
}

/* ---------- 版本号与「还有改动」的持久化 ---------- */

function stateSlot() {
  const a = getAuth();
  return (a && a.u) || 'guest';
}

function readStore() {
  if (typeof window === 'undefined') return {};
  try {
    const v = JSON.parse(window.localStorage.getItem(STATE_KEY) || 'null');
    const byUser = v && typeof v === 'object' ? v.byUser : null;
    return byUser && typeof byUser === 'object' ? byUser : {};
  } catch {
    return {};
  }
}

function persistState() {
  if (typeof window === 'undefined') return;
  try {
    const all = readStore();
    all[stateSlot()] = { cloudAt, pendingPush, lastAt };
    window.localStorage.setItem(STATE_KEY, JSON.stringify({ v: 1, byUser: all }));
  } catch {
    /* 隐私模式写不进去：最多是下次全量重拉一遍，不影响使用 */
  }
}

function restoreState() {
  const s = readStore()[stateSlot()];
  cloudAt = s ? Number(s.cloudAt) || 0 : 0;
  pendingPush = s ? !!s.pendingPush : false;
  lastAt = s ? Number(s.lastAt) || 0 : 0;
}

/** 已登录且拿得到令牌 —— 只有这种情况下才谈得上同步。 */
function enabled() {
  if (typeof window === 'undefined') return false;
  const a = getAuth();
  return !!(a && a.u && a.token);
}

/* ---------- 本地数据读写 ---------- */

function currentNS() {
  return progressNS().slice(1); /* ':guest' → 'guest' */
}

/** 笔记本与代码仓库按需动态 import：这两个模块加起来几十 KB，
 *  没登录、没后端的时候不该拖慢首屏。 */
function loadDataModules() {
  return Promise.all([
    import('../pyrunner/notebook').catch(() => null),
    import('../pyrunner/repo').catch(() => null),
  ]);
}

async function readLocal() {
  const ns = currentNS();
  const s = readSpace(ns);
  const [nb, rp] = await loadDataModules();
  return {
    progress: s.progress || {},
    exercises: s.exercises || {},
    last: s.last || null,
    notebook: nb ? nb.peekNotebook(ns) : null,
    repo: rp ? rp.peekRepo(ns) : null,
  };
}

/**
 * 把合并结果整体写回本地。
 * applying 这段时间里数据模块 dispatch 出来的变更事件要忽略——那是云端结果落地
 * 引起的，不是用户的新改动，否则会「写完又推、推完又写」来回打转。
 */
async function writeLocal(bundle) {
  const ns = currentNS();
  const [nb, rp] = await loadDataModules();
  applying = true;
  try {
    writeSpace(ns, { progress: bundle.progress, exercises: bundle.exercises, last: bundle.last }, 'replace');
    if (nb) nb.writeNotebook(ns, bundle.notebook, 'replace');
    if (rp) rp.writeRepo(ns, bundle.repo, 'replace');
  } finally {
    /* 放到下一个宏任务再解锁：写回会触发笔记本/仓库面板重绘，
       重绘里的零碎事件不该被算成「用户改了东西」。 */
    setTimeout(() => {
      applying = false;
    }, 0);
  }
}

/* ---------- 合并规则（与服务端逐条对齐，改这里要同步改服务端） ---------- */

function isObj(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function isBook(b) {
  return isObj(b) && Array.isArray(b.cells);
}

function isItem(it) {
  return isObj(it) && typeof it.code === 'string';
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * 把任意来路的数据规整成 DataBundle。
 * 返回 null 表示「这一边没有数据」（云端 at=0 / 本地什么都没有）。
 * 结构不对的字段一律按「空」处理，绝不整包报错。
 */
function normalize(raw) {
  if (!isObj(raw)) return null;
  return {
    progress: isObj(raw.progress) ? raw.progress : {},
    exercises: isObj(raw.exercises) ? raw.exercises : {},
    last: isObj(raw.last) && typeof raw.last.path === 'string' ? raw.last : null,
    notebook: isObj(raw.notebook) && Array.isArray(raw.notebook.books)
      ? { v: 1, books: raw.notebook.books.filter(isBook) }
      : null,
    repo: isObj(raw.repo) && Array.isArray(raw.repo.items)
      ? { v: 1, items: raw.repo.items.filter(isItem) }
      : null,
  };
}

const EMPTY = { progress: {}, exercises: {}, last: null, notebook: null, repo: null };

/** 已学/已通过标记取并集；同一键 true 与 false 冲突时 true 赢——
 *  学过的课不会因为另一台设备上的一次误操作被抹掉。 */
function mergeFlags(a, b) {
  const out = {};
  for (const src of [a, b]) {
    if (!isObj(src)) continue;
    /* 用 Object.keys 而不是 for…in：原型链上的脏东西不该被带上云 */
    for (const k of Object.keys(src)) {
      if (out[k] === true) continue;
      out[k] = !!src[k];
    }
  }
  return out;
}

/** 续学位置：at 大的那条赢，一边没有就用另一边。 */
function mergeLast(a, b) {
  if (!isObj(a)) return isObj(b) ? b : null;
  if (!isObj(b)) return a;
  return num(b.at) > num(a.at) ? b : a;
}

function capBooks(books) {
  if (books.length <= MAX_BOOKS) return books;
  return books.slice().sort((x, y) => num(y.at) - num(x.at)).slice(0, MAX_BOOKS);
}

/** 笔记本以「本子」为粒度：id 相同（老数据退而求其次看标题相同）算同一本，
 *  取 at 较新的整本覆盖；两边各自独有的本子都保留。 */
function mergeNotebook(a, b) {
  const A = a && Array.isArray(a.books) ? a.books : null;
  const B = b && Array.isArray(b.books) ? b.books : null;
  if (!A && !B) return null;
  if (!A) return { v: 1, books: capBooks(B.slice()) };
  if (!B) return { v: 1, books: capBooks(A.slice()) };

  const out = [];
  const byId = new Map();
  const byTitle = new Map();
  const keep = (bk) => {
    out.push(bk);
    if (bk.id != null) byId.set(bk.id, bk);
    if (bk.title != null) byTitle.set(bk.title, bk);
  };
  for (const bk of A) keep(bk);
  for (const bk of B) {
    const hit = (bk.id != null && byId.get(bk.id)) || (bk.title != null && byTitle.get(bk.title));
    if (!hit) {
      keep(bk);
      continue;
    }
    if (num(bk.at) > num(hit.at)) {
      out[out.indexOf(hit)] = bk;
      if (bk.id != null) byId.set(bk.id, bk);
      if (bk.title != null) byTitle.set(bk.title, bk);
    }
  }
  return { v: 1, books: capBooks(out) };
}

/** 代码仓库按**代码内容**去重（与面板里的「导入」同一条口径），
 *  同内容保留 at 新的那条。 */
function mergeRepo(a, b) {
  const A = a && Array.isArray(a.items) ? a.items : null;
  const B = b && Array.isArray(b.items) ? b.items : null;
  if (!A && !B) return null;

  const map = new Map();
  for (const it of [...(A || []), ...(B || [])]) {
    if (!isItem(it)) continue;
    const prev = map.get(it.code);
    if (!prev || num(it.at) > num(prev.at)) map.set(it.code, it);
  }
  let items = [...map.values()];
  if (items.length > MAX_ITEMS) {
    items = items.sort((x, y) => num(y.at) - num(x.at)).slice(0, MAX_ITEMS);
  }
  return { v: 1, items };
}

/** merge(local, remote) → merged。导出是为了以后能拿来对拍服务端的结果。 */
export function mergeBundle(local, remote) {
  const A = normalize(local) || EMPTY;
  const B = normalize(remote) || EMPTY;
  return {
    progress: mergeFlags(A.progress, B.progress),
    exercises: mergeFlags(A.exercises, B.exercises),
    last: mergeLast(A.last, B.last),
    notebook: mergeNotebook(A.notebook, B.notebook),
    repo: mergeRepo(A.repo, B.repo),
  };
}

/* ---------- 网络 ---------- */

/**
 * 打一次同步接口。返回值里的 kind 只有两种：
 * - 'nobackend'：连不上、超时、或者回来的不是 JSON（nginx 的 404 页、反代的错误页
 *   都算）——都按「这儿没有同步后端」降级，而不是弹错误吓唬用户；
 * - 'json'：拿到了结构化响应，按 status 与 body 判定。
 */
async function request(path, opts = {}) {
  const auth = getAuth();
  const headers = { 'Content-Type': 'application/json' };
  if (auth && auth.token) headers.Authorization = 'Bearer ' + auth.token;

  let ctrl = null;
  let timer = null;
  if (typeof AbortController !== 'undefined') {
    ctrl = new AbortController();
    timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  }
  try {
    const res = await fetch(syncApiBase() + path, {
      method: opts.method || 'GET',
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: ctrl ? ctrl.signal : undefined,
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (!json || typeof json !== 'object') return { kind: 'nobackend', status: res.status };
    return { kind: 'json', status: res.status, json };
  } catch {
    /* fetch 直接抛（连不上 / 超时 / 断网）：同样是「没有可用的后端」 */
    return { kind: 'nobackend', status: 0 };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/* ---------- 失败处理：一律降级，不抛异常 ---------- */

function scheduleRetry(mode) {
  if (retryTimer) clearTimeout(retryTimer);
  const wait = Math.max(1000, nextTryAt - Date.now());
  retryTimer = setTimeout(() => {
    retryTimer = null;
    if (!enabled()) return;
    if (pendingPush || mode === 'both') runOnce(mode === 'pull' ? 'pull' : 'push');
  }, wait);
}

function onFail(msg) {
  nextTryAt = Date.now() + RETRY_MS;
  pendingPush = true; /* 这次改动没送上去，等后端回来补 */
  persistState();
  setState('error', msg);
  scheduleRetry('push');
  return false;
}

function onNoBackend() {
  nextTryAt = Date.now() + RETRY_MS;
  persistState();
  setState('nobackend');
  /* 静默降级：连不上的时候不打扰用户，但改动还挂着，后端回来后自动补推 */
  scheduleRetry('push');
  return false;
}

/** 令牌失效：只摘掉令牌，保留登录态——用户照样在用这台浏览器里的本地数据，
 *  只是不再同步，下次登录会重新拿一枚。 */
function onUnauthorized() {
  dropToken();
  setState('off');
  return false;
}

/* ---------- 拉 / 推 ---------- */

async function doPull() {
  const r = await request('/sync', { method: 'GET' });
  if (r.kind === 'nobackend') return onNoBackend();
  if (r.status === 401) return onUnauthorized();
  if (r.status === 429) return onFail('同步太频繁，稍后再试');
  if (!r.json.ok) return onFail('拉取云端数据失败');

  cloudAt = num(r.json.at);
  const remote = normalize(r.json.data);
  if (remote) {
    const local = await readLocal();
    await writeLocal(mergeBundle(local, remote));
  }
  persistState();
  return true;
}

async function doPush() {
  const local = await readLocal();
  const r = await request('/sync', { method: 'PUT', body: { base: cloudAt, data: local } });
  if (r.kind === 'nobackend') return onNoBackend();
  if (r.status === 401) return onUnauthorized();
  if (r.status === 413) return onFail('数据太大（单账号 4 MB 上限），云同步已暂停');
  if (r.status === 429) return onFail('同步太频繁，稍后再试');
  if (!r.json.ok) return onFail('推送到云端失败');

  cloudAt = num(r.json.at) || cloudAt;
  /* 服务端是权威：它返回的合并结果直接落盘，多端并发写才不会互相覆盖 */
  const merged = normalize(r.json.data);
  if (merged) await writeLocal(merged);
  persistState();
  return true;
}

async function runOnce(mode) {
  if (typeof window === 'undefined') return;
  if (!enabled()) {
    setState('off');
    return;
  }
  if (inflight) {
    /* 已经在跑：记住这一轮要干什么，跑完接着来（并发写会互相覆盖） */
    queued = queued === 'both' || mode === 'both' ? 'both' : queued || mode;
    return;
  }
  if (Date.now() < nextTryAt) {
    scheduleRetry(mode);
    return;
  }

  inflight = true;
  setState('syncing');
  let ok = true;
  try {
    if (mode !== 'push') ok = (await doPull()) && ok;
    if (mode !== 'pull') ok = (await doPush()) && ok;
  } catch {
    ok = false;
    onFail('同步时出了点问题');
  }
  inflight = false;

  if (ok) {
    lastAt = Date.now();
    nextTryAt = 0;
    if (mode !== 'pull') pendingPush = false;
    persistState();
    setState('ok');
  }

  const next = queued;
  queued = null;
  if (next) runOnce(next);
}

/* ---------- 对外 ---------- */

/** 本地有改动：攒 2 秒再推。数据模块通过 ml-data-dirty 间接调用它。 */
export function push() {
  if (typeof window === 'undefined') return;
  if (applying) return;
  if (!enabled()) {
    setState('off');
    return;
  }
  pendingPush = true;
  persistState();
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    runOnce('push');
  }, DEBOUNCE_MS);
}

/** 数据变更的统一入口（与 push 同义，写出来是给数据模块一个更好懂的名字）。 */
export function markDirty() {
  push();
}

/** 立即拉一次云端（登录后用）。 */
export function pull() {
  if (typeof window === 'undefined') return;
  if (!enabled()) {
    setState('off');
    return;
  }
  runOnce('pull');
}

/** 手动「立即同步」/「重试」：先拉后推，不等防抖也不等冷却。 */
export function syncNow() {
  if (typeof window === 'undefined') return;
  if (!enabled()) {
    setState('off');
    return;
  }
  pendingPush = true;
  persistState();
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  nextTryAt = 0;
  runOnce('both');
}

function onAuthChange() {
  const a = getAuth();
  const u = (a && a.u) || '';
  if (u !== lastUser) {
    /* 换账号：版本号是跟着账号走的，不重置会把 A 的版本号当成 B 的 base */
    lastUser = u;
    restoreState();
  }
  if (!enabled()) {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    setState('off');
    return;
  }
  nextTryAt = 0;
  /* 登录后先拉一次把云端的东西并下来，再推一次把自己的补上去 */
  runOnce('both');
}

/** 挂上监听。幂等：重复调用只会挂一次。 */
export function boot() {
  if (typeof window === 'undefined' || booted) return;
  booted = true;
  restoreState();
  lastUser = (getAuth() && getAuth().u) || '';
  document.addEventListener(DIRTY_EVENT, () => push());
  window.addEventListener(AUTH_EVENT, onAuthChange);
  window.addEventListener('online', () => {
    /* 网络回来了：之前挂着的改动趁这时候补推 */
    nextTryAt = 0;
    if (enabled()) runOnce(pendingPush ? 'both' : 'pull');
  });
  if (enabled()) runOnce(pendingPush ? 'both' : 'pull');
  else setState('off');
}

/* 模块一被加载就把监听挂上：监听挂在 document/window 上，闭包被全局对象持有着，
   之后即使路由切走、页面组件卸载，同步也还在。 */
if (typeof window !== 'undefined') boot();
