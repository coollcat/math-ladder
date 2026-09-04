/* =========================================================================
 * Pyodide 运行时缓存（Service Worker）
 * -------------------------------------------------------------------------
 * 干什么的：把 Python 运行时的那几个大件（pyodide.asm.wasm ~9MB、
 * python_stdlib.zip ~6MB、pyodide.asm.js、包 whl…）第一次下载后存进
 * Cache Storage，之后直接从本地取，不再重复下载。
 *
 * 为什么必须靠 SW：Pyodide 内部是直接用 fetch/XHR 去 CDN 拉这些文件的，
 * 页面里没法塞一个自定义的 fetch 进去；而 Cache API 只有 Service Worker
 * 能在「不改动请求发起方」的前提下拦截并回源。本来指望 CDN 的
 * Cache-Control 长缓存，实测仍会反复回源，所以自己兜一层。
 *
 * 安全边界：**只**拦截三个 Pyodide CDN 域名下的静态资源后缀，
 * 其余请求一律不调 respondWith（走浏览器默认行为）。站点自身的文件
 * 完全不受影响，不会出现「改了页面刷新不出来」这类 SW 经典事故。
 *
 * 升级：缓存名 CACHE 里的版本号一改，旧缓存整包作废（activate 里清理）。
 * ========================================================================= */

var CACHE = 'ml-pyodide-v1';

/* 与 src/pyrunner/enhancer.js 的 PYODIDE_CDNS 保持一致 */
var HOSTS = ['registry.npmmirror.com', 'cdn.jsdelivr.net', 'gcore.jsdelivr.net'];

/* 只缓存这些后缀：wasm/zip/js/json/data/whl/so 之类，别的一律放过 */
var EXT = /\.(wasm|js|mjs|zip|json|data|txt|whl|so|tar|gz)$/i;

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys.map(function (k) {
            return k === CACHE ? null : caches.delete(k);
          }),
        );
      })
      .then(function () {
        return self.clients.claim();
      }),
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }
  if (HOSTS.indexOf(url.hostname) < 0) return;
  if (!EXT.test(url.pathname)) return;

  event.respondWith(
    (async function () {
      var cache = await caches.open(CACHE);
      var hit = await cache.match(req);
      if (hit) return hit;
      var resp = await fetch(req);
      try {
        /* opaque（no-cors，比如 <script> 标签拉的 pyodide.js）也能存，
           只是读不到状态码；存失败（配额满）不影响本次使用。 */
        if (resp && (resp.ok || resp.type === 'opaque' || resp.status === 0)) {
          cache.put(req, resp.clone());
        }
      } catch (e) {
        /* 忽略：缓存只是加速手段，写不进去照样能用 */
      }
      return resp;
    })(),
  );
});
