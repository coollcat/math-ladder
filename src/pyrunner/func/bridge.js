/* =========================================================================
 * 看见函数 ⇄ Python 的「总线」（window.__mlFnHub）
 * -------------------------------------------------------------------------
 * 三方在这里碰头：
 *   工作区   每个 createWorkspace 实例登记自己（页面上的、课文 lab 里的、浮窗内嵌的）；
 *   Python   浮窗里的 see() / seen() 通过 Pyodide 的 js 模块调 push() / pull()；
 *   浮窗     运行前 beginSink(out)、运行后 endSink()：本页没有工作区时，
 *            see() 画出来的图就内嵌进这次运行的输出区。
 *
 * 送到哪一个工作区：页面上**最近一次被点过/聚焦过**的那个；都没碰过就取文档里第一个。
 * Python 函数（不是字符串）的采样走反方向：工作区调 samplePy()，同步进 Pyodide
 * 让 numpy 一次算完一整排点（Pyodide 跑在主线程上，所以这一调用是同步的）。
 *
 * 本文件很轻，不静态引入 workspace.js（那是一整套画布 + 分析内核），
 * 浮窗所在的每个页面都会加载它。
 * ========================================================================= */

function createHub() {
  const list = [];
  let last = null;
  let sink = null;
  let sinkWs = null;
  let pending = [];
  let preloading = null;

  function alive(a) {
    return a && a.el && a.el.isConnected;
  }

  function pick(includeInline) {
    const cands = list.filter((a) => (includeInline ? (alive(a) || pending.some((p) => p.api === a)) : (!a.inline && alive(a))));
    if (!cands.length) return null;
    if (last && cands.indexOf(last) >= 0) return last;
    return cands[0];
  }

  const hub = {
    version: 2,
    wsModule: null,
    pySample: null,

    register(api) {
      if (list.indexOf(api) < 0) list.push(api);
    },
    unregister(api) {
      const i = list.indexOf(api);
      if (i >= 0) list.splice(i, 1);
      if (last === api) last = null;
      if (sinkWs === api) sinkWs = null;
    },
    touch(api) {
      last = api;
    },
    /** 页面上有没有（非内嵌的）工作区 */
    hasPageWorkspace() {
      return !!pick(false);
    },

    /** 预热工作区模块：内嵌显示时要**同步**建实例（seen() 紧跟着 see() 也要拿得到） */
    preload() {
      if (hub.wsModule || preloading) return preloading;
      preloading = import('./workspace.js')
        .then((m) => {
          hub.wsModule = m;
          return m;
        })
        .catch(() => {
          preloading = null;
        });
      return preloading;
    },

    /* ---------- 浮窗运行期 ---------- */
    beginSink(out) {
      /* 上一次运行内嵌的工作区：输出区一清空它们就脱离了文档，这里顺手拆掉 */
      list.filter((a) => a.inline && !alive(a)).forEach((a) => {
        try { a.destroy(); } catch (e) { void e; }
      });
      sink = out || null;
      sinkWs = null;
      pending = [];
    },
    endSink() {
      const out = sink;
      const hosts = pending;
      sink = null;
      sinkWs = null;
      pending = [];
      if (!out || !out.isConnected) return;
      hosts.forEach((p) => {
        out.appendChild(p.host);
        out.classList.add('py-runner__out--visible');
        if (p.api && p.api.relayout) p.api.relayout();
      });
    },

    /* ---------- Python → 工作区 ---------- */
    push(json) {
      let spec;
      try {
        spec = JSON.parse(String(json));
      } catch (e) {
        void e;
        return 'error:数据格式不对';
      }
      const target = pick(false);
      if (target) {
        try {
          target.applySpec(spec);
          last = target;
          if (target.reveal) target.reveal();
          return 'page';
        } catch (e) {
          return 'error:' + ((e && e.message) || e);
        }
      }
      if (sink) {
        try {
          if (sinkWs) {
            sinkWs.applySpec(spec);
            return 'inline';
          }
          if (!hub.wsModule) {
            hub.preload();
            return 'error:看见函数模块还在加载，稍等一两秒再运行一次';
          }
          const host = document.createElement('div');
          host.className = 'ml-console__fn';
          const api = hub.wsModule.createWorkspace(host, {
            inline: true,
            presets: false,
            keypad: false,
            height: 300,
            spec,
          });
          if (api.specError) {
            const err = api.specError;
            api.destroy();
            throw err;
          }
          sinkWs = api;
          last = api;
          pending.push({ host, api });
          return 'inline';
        } catch (e) {
          return 'error:' + ((e && e.message) || e);
        }
      }
      if ((spec.funcs || []).some((f) => f && f.py)) {
        return 'error:本页没有「看见函数」工作区。Python 函数只能在 Py 浮窗里运行时内嵌显示，' +
          '或者打开 /function 页面再运行';
      }
      try {
        window.open(shareUrl(spec), '_blank', 'noopener');
        return 'tab';
      } catch (e) {
        return 'error:' + ((e && e.message) || e);
      }
    },

    /* ---------- 工作区 → Python ---------- */
    pull() {
      const target = pick(true);
      if (!target) return '';
      try {
        return JSON.stringify(target.snapshot());
      } catch (e) {
        void e;
        return '';
      }
    },

    /** 工作区调：让 Python 函数在一排点上求值。返回 Float64Array；Python 不在场返回 null */
    samplePy(id, req) {
      if (typeof hub.pySample !== 'function') return null;
      try {
        const s = hub.pySample(id, JSON.stringify(req));
        if (typeof s !== 'string' || !s) return null;
        const parts = s.split(',');
        const out = new Float64Array(parts.length);
        for (let i = 0; i < parts.length; i += 1) out[i] = parseFloat(parts[i]);
        return out;
      } catch (e) {
        void e;
        return null;
      }
    },
  };
  return hub;
}

/** 取（必要时建）全站唯一的总线。热更新后沿用 window 上那一份，登记表不丢 */
export function getHub() {
  if (typeof window === 'undefined') return null;
  const cur = window.__mlFnHub;
  if (cur && cur.version === 2) return cur;
  const hub = createHub();
  window.__mlFnHub = hub;
  return hub;
}

/** 把一份 spec 编进 /function 页面的链接（?s=…），分享和新开标签页都用它 */
export function shareUrl(spec) {
  const base = (typeof window !== 'undefined' && window.location ? window.location.origin : '') + '/function';
  return base + '?s=' + encodeURIComponent(JSON.stringify(spec));
}

/** 从当前页面地址里读出 spec：?s=<json> 或简写 ?f=sin(x)&f=x^2&m=3d */
export function readUrlSpec() {
  if (typeof window === 'undefined' || !window.location) return null;
  let q;
  try {
    q = new URLSearchParams(window.location.search);
  } catch (e) {
    void e;
    return null;
  }
  const s = q.get('s');
  if (s) {
    try {
      const spec = JSON.parse(s);
      if (spec && Array.isArray(spec.funcs) && spec.funcs.length) return spec;
    } catch (e) {
      void e;
    }
  }
  const fs = q.getAll('f').filter(Boolean);
  if (!fs.length) return null;
  const spec = { funcs: fs.slice(0, 6).map((src) => ({ src })) };
  const m = q.get('m');
  if (m === '3d' || m === '2d') spec.mode = m;
  return spec;
}
