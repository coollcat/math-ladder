/* =========================================================================
 * 学习进度 / 续学位置：统一存储层（不含图谱数据，可安全打进主包）
 * -------------------------------------------------------------------------
 * 三份数据都按「命名空间」分空间存放，登录前进游客空间、登录后进账号空间，
 * 同一浏览器多账号互不混淆：
 *   ml-progress:<ns>   学完标记 { '/docs/xxx/yyy': true }
 *   ml-exercises:<ns>  练习通过记录（enhancer 判题写入）
 *   ml-last:<ns>       { path, at } 最近一次停留的课程页（「继续学习」的锚点）
 *
 * 本模块刻意不 import full-graph-data（222KB 图谱）：enhancer 会在每个页面
 * 调用 recordVisit，一旦把图谱打进主包，所有页面都要多下 200KB。
 * 需要「路径 → 课程标题」的场合请import src/components/ml-home/LearningEntry.js，
 * 它只被首页引用。
 * ========================================================================= */

import { getAuth } from '../auth';

export const PROGRESS_KEY = 'ml-progress';
export const EXERCISE_KEY = 'ml-exercises';
export const LAST_KEY = 'ml-last';
export const CHANGE_EVENT = 'ml-progress-changed';

/* 数据有改动（云同步监听它）。本模块只管 dispatch，刻意不 import sync：
   笔记本、代码仓库都要用它，sync 又要 import 它们仨，反向引用会成环。 */
export const DATA_DIRTY_EVENT = 'ml-data-dirty';

/* 旧版（2026-08 之前）用的是不带命名空间的统一 key，首扫时迁移到游客空间一次 */
const LEGACY_KEYS = [PROGRESS_KEY, EXERCISE_KEY, LAST_KEY];

export function progressNS() {
  const a = typeof window !== 'undefined' ? getAuth() : null;
  return a && a.u ? ':' + a.u : ':guest';
}

export function nsKey(base) {
  return base + progressNS();
}

function readJSON(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = JSON.parse(window.localStorage.getItem(key) || 'null');
    return v == null ? fallback : v;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 隐私模式写不进去：本次会话内仍生效，只是不跨会话记忆 */
  }
}

let migrated = false;
export function migrateLegacy() {
  if (migrated || typeof window === 'undefined') return;
  migrated = true;
  for (const base of LEGACY_KEYS) {
    let old = null;
    try {
      old = window.localStorage.getItem(base);
    } catch {
      old = null;
    }
    if (old == null) continue;
    if (window.localStorage.getItem(nsKey(base)) == null) {
      try {
        window.localStorage.setItem(nsKey(base), old);
      } catch {
        /* 配额满：放弃迁移，不阻断 */
      }
    }
    try {
      window.localStorage.removeItem(base);
    } catch {
      /* 同上 */
    }
  }
}

export function readProgress() {
  migrateLegacy();
  const v = readJSON(nsKey(PROGRESS_KEY), {});
  return v && typeof v === 'object' ? v : {};
}

export function writeProgress(map) {
  writeJSON(nsKey(PROGRESS_KEY), map);
  notifyDataDirty();
}

export function isDone(path) {
  return !!readProgress()[path];
}

/** 标记/取消标记一门课；返回新的完成态。 */
export function toggleDone(path) {
  const store = readProgress();
  store[path] = !store[path];
  writeProgress(store);
  notifyProgressChange();
  return !!store[path];
}

export function doneCount() {
  const s = readProgress();
  return Object.keys(s).filter((k) => s[k]).length;
}

/** 记录「我正停在这一课」。只在课程页（/docs/...）调用。 */
export function recordVisit(path) {
  if (typeof window === 'undefined') return;
  if (!path || !/^\/docs\/.+/.test(path)) return;
  const cur = readLast();
  const clean = path.replace(/\/+$/, '');
  if (cur && cur.path === clean) return; /* 同页重复写入没必要（路由切换会反复触发） */
  writeJSON(nsKey(LAST_KEY), { path: clean, at: Date.now() });
  notifyDataDirty();
}

export function readLast() {
  migrateLegacy();
  const v = readJSON(nsKey(LAST_KEY), null);
  if (!v || typeof v !== 'object' || typeof v.path !== 'string') return null;
  return v;
}

export function clearLast() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(nsKey(LAST_KEY));
  } catch {
    /* 忽略 */
  }
  notifyDataDirty();
}

/** 清除当前空间的全部学习数据（进度 / 练习 / 续学位置），不含随手算草稿。 */
export function clearSpace() {
  if (typeof window === 'undefined') return;
  [PROGRESS_KEY, EXERCISE_KEY, LAST_KEY].forEach((base) => {
    try {
      window.localStorage.removeItem(nsKey(base));
    } catch {
      /* 忽略 */
    }
  });
  notifyProgressChange();
  notifyDataDirty();
}

export function notifyProgressChange() {
  if (typeof document === 'undefined') return;
  try {
    document.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* 忽略 */
  }
}

/** 通知「本地数据变了」：云同步收到后攒 2 秒推一次。
 *  没登录 / 没令牌时 sync 那边自己会忽略，这里不必判断。 */
export function notifyDataDirty() {
  if (typeof document === 'undefined') return;
  try {
    document.dispatchEvent(new Event(DATA_DIRTY_EVENT));
  } catch {
    /* 忽略 */
  }
}

/* =========================================================================
 * 跨空间读写：只给备份面板（src/pyrunner/backup.js）用。
 * 上面那些「当前空间」的函数是给页面日常用的，这里刻意做成显式传 ns，
 * 免得搬家时误读到当前空间的数据。
 * ========================================================================= */

/** 扫描 localStorage 里出现过的所有空间名（'guest' 以及各用户名）。
 *  快照键 ml-snapshot:<ns> 不算独立空间，排除掉。 */
export function listSpaces() {
  if (typeof window === 'undefined') return [];
  const out = new Set();
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      const m = k && /^ml-(?!snapshot\b)[a-z-]+:(.+)$/.exec(k);
      if (m) out.add(m[1]);
    }
  } catch {
    /* 隐私模式读不到：当作只有当前空间 */
  }
  return [...out];
}

/** 读某个空间的进度三件套（不会动到当前空间） */
export function readSpace(ns) {
  const suf = ':' + ns;
  return {
    progress: readJSON(PROGRESS_KEY + suf, {}) || {},
    exercises: readJSON(EXERCISE_KEY + suf, {}) || {},
    last: readJSON(LAST_KEY + suf, null),
  };
}

function dropKey(key) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* 忽略 */
  }
}

/**
 * 往某个空间写进度三件套。
 * mode: 'merge' 合并（已学标记取并集、续学位置取更新的）/ 'replace' 整个覆盖。
 */
export function writeSpace(ns, data, mode = 'merge') {
  const suf = ':' + ns;
  const inc = data || {};
  if (mode === 'replace') {
    writeJSON(PROGRESS_KEY + suf, inc.progress || {});
    writeJSON(EXERCISE_KEY + suf, inc.exercises || {});
    if (inc.last) writeJSON(LAST_KEY + suf, inc.last);
    else dropKey(LAST_KEY + suf);
  } else {
    const p = Object.assign({}, readJSON(PROGRESS_KEY + suf, {}), inc.progress || {});
    const e = Object.assign({}, readJSON(EXERCISE_KEY + suf, {}), inc.exercises || {});
    writeJSON(PROGRESS_KEY + suf, p);
    writeJSON(EXERCISE_KEY + suf, e);
    const cur = readJSON(LAST_KEY + suf, null);
    if (inc.last && (!cur || Number(inc.last.at || 0) > Number(cur.at || 0))) {
      writeJSON(LAST_KEY + suf, inc.last);
    }
  }
  notifyProgressChange();
  notifyDataDirty();
}

/** 清空某个空间的进度三件套（搬完家清理源空间用） */
export function clearSpaceNS(ns) {
  const suf = ':' + ns;
  dropKey(PROGRESS_KEY + suf);
  dropKey(EXERCISE_KEY + suf);
  dropKey(LAST_KEY + suf);
  notifyProgressChange();
  notifyDataDirty();
}

/**
 * 订阅进度变化：文末按钮标记、清除数据、登录/登出（换空间）、别的标签页改动
 * 都会触发。返回取消订阅函数。
 */
export function onProgressChange(cb) {
  if (typeof window === 'undefined') return () => {};
  const handler = () => cb();
  document.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener('storage', handler);
  window.addEventListener('ml-auth-changed', handler);
  return () => {
    document.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener('storage', handler);
    window.removeEventListener('ml-auth-changed', handler);
  };
}
