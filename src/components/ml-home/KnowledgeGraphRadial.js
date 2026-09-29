/* =========================================================================
 * 知识图谱（/graph）：同心环「阶梯星系」v3
 * -------------------------------------------------------------------------
 * 2026-09-29 二次重构。v2 已经把「层级」做成半径、把「分支」做成颜色，
 * 但**环名与环的成员是两回事**：环按固定难度阈值切（≤10 / ≤16 / …），
 * 于是实测有 32 条章级先修边是「外层托着内层」——读者按环读，读到的是
 * 「谁跟谁差不多难」，读不出「谁托着谁」。
 *
 * v3 把两件事分开，各归各的：
 *   ① **环 = 层级**，算法在 ringLayout.js（难度分位分类 + 强先修边单调上修）。
 *      结果是每环章数相近、难度区间单调递增、且**没有一条强先修边朝内**。
 *      于是「基础在圆心、高级在外围」不再是排版效果，而是数据本身的位置。
 *   ② **颜色 = 卷**，同色的章在环上连成一段弧，一眼看出这一环里哪段属于哪个领域。
 *
 * 为了让「层级关系清晰、导航顺畅」，交互上做了五件事：
 *   1. **先修链面包屑**：选中任意一章，面板里给出「地基 → … → 本章」的完整来路，
 *      每一节都可点——这是从中心往外走的一条现成台阶，不用自己去连线里找。
 *   2. **目录侧栏**：74 颗圆点不是导航界面，右侧按环分组的章清单才是。
 *      两侧悬停/选中互相同步，点一下就把画布居中对齐。
 *   3. **高亮只给「一跳 + 一条链」**：直接先修（绿）、直接托起（橙）、
 *      以及从地基到本章的主链（加粗流动）。完整上下游闭包默认关——
 *      实测闭包平均 37 章、最大 73 章，一悬停整张图全亮，等于没有高亮。
 *   4. **键盘走得动**：方向键按空间方向在章之间移动，回车锁定，Esc 清空，
 *      `/` 聚焦搜索，回车逐条定位。
 *   5. **连线分强弱**：默认只画强先修（≥2 门课支撑的章级关系，74 条）；
 *      单课交叉引用 219 条默认隐藏，可一键放出——它们不是层级，是引用。
 * ========================================================================= */

import React from 'react';
import { useHistory } from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { NODES, EDGES, DEPTH } from './full-graph-data.js';
import { allChapterGroups } from './data.js';
import { chapterModel, layoutRings, closure, chainTo } from './ringLayout.js';

/* ---- 模块级：整站一份，加载时算一次（纯函数，不依赖 DOM） ---- */
function buildModel() {
  const flat = [];
  allChapterGroups().forEach((g, vi) => {
    g.chapters.forEach((c) => flat.push({ ...c, vi }));
  });
  const model = chapterModel(NODES, EDGES, DEPTH, flat);
  const geo = layoutRings(model);
  return { model, geo };
}

const G = buildModel();
const { model: M, geo } = G;

/* 七卷七色（引到 .ml-rg 作用域的 CSS 变量上，暗色模式另有覆盖） */
const VOL_COLORS = ['--rg-v1', '--rg-v2', '--rg-v3', '--rg-v4', '--rg-v5', '--rg-v6', '--rg-v7'];

const MIN_K = 0.55;
const MAX_K = 4;

/* 连线朝圆心弯：控制点取两端中点的 65% 处（向 0,0 拉），
   于是所有线都朝中心凹，读起来就是「从地基长出去」。 */
function edgePath(A, B) {
  const mx = (A.x + B.x) * 0.5;
  const my = (A.y + B.y) * 0.5;
  return `M ${A.x} ${A.y} Q ${mx * 0.65} ${my * 0.65}, ${B.x} ${B.y}`;
}

function dotR(count) {
  return Math.max(7, Math.min(16, 5.5 + Math.sqrt(count || 1) * 1.5));
}

/** 章名标签：每环能写几个字由几何算出来（见 ringLayout.js 的 labelBudget），
 *  超出就截断加省略号——最内环只放得下 4 字，外圈能放到 8 字以上。 */
function shortLabel(s, budget) {
  const t = String(s || '');
  const b = Math.max(3, budget || 6);
  return t.length > b ? `${t.slice(0, b)}…` : t;
}

/** 标签落点：优先摆在圆点「朝外」的那一侧；靠近上下两端时改摆上下，
 *  否则文字会横着压住同环的邻居。 */
function labelPlacement(p, r) {
  const cos = Math.cos(p.angle);
  const sin = Math.sin(p.angle);
  const off = r + 7;
  if (Math.abs(cos) >= 0.42) {
    return { x: p.x + Math.sign(cos) * off, y: p.y + 4, anchor: cos >= 0 ? 'start' : 'end' };
  }
  return {
    x: p.x,
    y: p.y + (sin >= 0 ? off + 7 : -off + 3),
    anchor: 'middle',
  };
}

/** 空间方向导航：在「按方向走」的候选里挑角度偏差最小、距离最近的那一章。 */
function neighborInDirection(fromN, dx, dy) {
  let best = null;
  let bestScore = Infinity;
  for (const c of M.chapters) {
    if (c.n === fromN) continue;
    const p = geo.pos.get(c.n);
    const f = geo.pos.get(fromN);
    const vx = p.x - f.x;
    const vy = p.y - f.y;
    const len = Math.hypot(vx, vy);
    if (len < 1) continue;
    const ux = vx / len;
    const uy = vy / len;
    const dot = ux * dx + uy * dy;
    if (dot < 0.35) continue;
    /* 角度偏差（1 - dot）主导，距离只做次级：读者按方向找的是「同一方位的那一颗」 */
    const score = (1 - dot) * 900 + len;
    if (score < bestScore) {
      bestScore = score;
      best = c.n;
    }
  }
  return best;
}

export default function KnowledgeGraphRadial() {
  const [hot, setHot] = React.useState(null);
  const [picked, setPicked] = React.useState(null);
  const [q, setQ] = React.useState('');
  const [labels, setLabels] = React.useState(true);
  const [weak, setWeak] = React.useState(false);
  const [deep, setDeep] = React.useState(false); /* 完整上下游闭包（默认关） */
  const [volFilter, setVolFilter] = React.useState(null);
  const [ringFilter, setRingFilter] = React.useState(null);
  const [zoomPct, setZoomPct] = React.useState(100);
  const [outline, setOutline] = React.useState(true); /* 目录侧栏（窄屏默认收起） */
  /* 课级钻取（2026-09-29）：{ n, data, err }。
     data 是 static/graph-chapters/NN.json 的内容——**点击时才从服务器 fetch**，
     拿到后本章每门课在图上原位展开成一圈课点。 */
  const [drill, setDrill] = React.useState(null);
  const drillCache = React.useRef(new Map()); /* 本会话内缓存，同一章不重复请求 */
  const history = useHistory();
  const baseUrl = useBaseUrl('/');

  const svgRef = React.useRef(null);
  const gRef = React.useRef(null);
  const view = React.useRef({ x: 0, y: 0, k: 1 });
  const drag = React.useRef({ on: false, sx: 0, sy: 0, vx: 0, vy: 0, moved: false });
  const raf = React.useRef(0);
  const hitPos = React.useRef(0);
  const btnRefs = React.useRef(new Map());

  /* 焦点：点选优先于悬停——鼠标移开后面板还留着刚点的那一章 */
  const focus = picked ?? hot;

  /* 窄屏默认收起目录（画布优先），桌面默认展开 */
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(max-width: 996px)').matches) setOutline(false);
  }, []);

  const applyView = React.useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    const v = view.current;
    g.setAttribute('transform', `translate(${v.x} ${v.y}) scale(${v.k})`);
  }, []);

  const scheduleView = React.useCallback(() => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      applyView();
    });
  }, [applyView]);

  /* 缩放：以 given 用户坐标为不动点 */
  const zoomAt = React.useCallback(
    (ux, uy, factor, defer) => {
      const v = view.current;
      const k2 = Math.min(MAX_K, Math.max(MIN_K, v.k * factor));
      if (k2 === v.k) return;
      v.x = ux - ((ux - v.x) * k2) / v.k;
      v.y = uy - ((uy - v.y) * k2) / v.k;
      v.k = k2;
      setZoomPct(Math.round(k2 * 100));
      if (defer) scheduleView();
      else applyView();
    },
    [applyView, scheduleView],
  );

  const resetView = React.useCallback(() => {
    view.current = { x: 0, y: 0, k: 1 };
    setZoomPct(100);
    applyView();
  }, [applyView]);

  /* 把某一章摆到视口正中 */
  const centerOn = React.useCallback(
    (n, k) => {
      const p = geo.pos.get(n);
      if (!p) return;
      const v = view.current;
      v.k = Math.min(MAX_K, Math.max(MIN_K, k || v.k));
      v.x = -p.x * v.k;
      v.y = -p.y * v.k;
      setZoomPct(Math.round(v.k * 100));
      applyView();
    },
    [applyView],
  );

  React.useEffect(
    () => () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    },
    [],
  );

  /* 指针拖拽 + 滚轮缩放。监听器只挂一次，内部全部走 ref 拿最新闭包 */
  React.useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;

    /* 屏幕坐标 → 用户坐标。viewBox 是正方形，而 SVG 元素的宽高比不是 1，
       默认 preserveAspectRatio="xMidYMid meet" 会按**较短边**缩放并居中——
       换算必须带上这个缩放与偏移，否则滚轮缩放的不动点会偏出去。 */
    const toUser = (ev) => {
      const r = svg.getBoundingClientRect();
      const s = Math.min(r.width, r.height) / geo.size;
      if (!s) return { x: 0, y: 0 };
      const offX = (r.width - geo.size * s) / 2;
      const offY = (r.height - geo.size * s) / 2;
      return {
        x: (ev.clientX - r.left - offX) / s - geo.size / 2,
        y: (ev.clientY - r.top - offY) / s - geo.size / 2,
      };
    };

    const onDown = (e) => {
      drag.current = { on: true, sx: e.clientX, sy: e.clientY, vx: view.current.x, vy: view.current.y, moved: false };
      /* 指针捕获：不捕获的话指针一移出 SVG（拖得快时很常见）就收不到
         pointermove，拖动会中途「断掉」。 */
      try {
        svg.setPointerCapture(e.pointerId);
      } catch {
        /* 老浏览器不支持捕获：退化成原来的行为 */
      }
    };
    const onMove = (e) => {
      const d = drag.current;
      if (!d.on) return;
      const r = svg.getBoundingClientRect();
      const s = Math.min(r.width, r.height) / geo.size || 1;
      const dx = (e.clientX - d.sx) / s;
      const dy = (e.clientY - d.sy) / s;
      if (Math.abs(dx) + Math.abs(dy) > 2) d.moved = true;
      /* 平移夹取：内容边界不许离开视口中心太远，免得一拖就把画布甩没
         （甩没了只能刷新页面——缩放钮和提示都够不着了）。 */
      const half = geo.size / 2;
      const lim = half * Math.max(0.6, view.current.k);
      view.current.x = Math.min(lim, Math.max(-lim, d.vx + dx));
      view.current.y = Math.min(lim, Math.max(-lim, d.vy + dy));
      if (d.moved) svg.classList.add('is-grabbing');
      scheduleView();
    };
    const onUp = (e) => {
      drag.current.on = false;
      svg.classList.remove('is-grabbing');
      try {
        if (e && e.pointerId != null && svg.hasPointerCapture(e.pointerId)) svg.releasePointerCapture(e.pointerId);
      } catch {
        /* 同上 */
      }
    };
    const onWheel = (e) => {
      e.preventDefault();
      const p = toUser(e);
      zoomAt(p.x, p.y, Math.exp(-e.deltaY * 0.0016), true);
    };
    const onDbl = (e) => {
      const p = toUser(e);
      zoomAt(p.x, p.y, 1.6);
    };

    svg.addEventListener('pointerdown', onDown);
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerup', onUp);
    svg.addEventListener('pointercancel', onUp);
    svg.addEventListener('pointerleave', onUp);
    svg.addEventListener('wheel', onWheel, { passive: false });
    svg.addEventListener('dblclick', onDbl);
    return () => {
      svg.removeEventListener('pointerdown', onDown);
      svg.removeEventListener('pointermove', onMove);
      svg.removeEventListener('pointerup', onUp);
      svg.removeEventListener('pointercancel', onUp);
      svg.removeEventListener('pointerleave', onUp);
      svg.removeEventListener('wheel', onWheel);
      svg.removeEventListener('dblclick', onDbl);
    };
  }, [zoomAt, scheduleView]);

  /* ---- 搜索 ----
     除了章名，**也搜课名**：读者记得住的往往是一门课（「达朗贝尔」「吉布斯」），
     只搜章名会给出「无结果」，而那一课明明在站内。命中课的章照样高亮，
     并在目录里标出命中了几课。 */
  const ql = q.trim().toLowerCase();
  const hits = React.useMemo(() => {
    if (!ql) return null;
    const set = new Set();
    const lessons = new Map();
    let count = 0;
    M.chapters.forEach((c) => {
      const byName =
        c.title.toLowerCase().includes(ql) ||
        c.short.toLowerCase().includes(ql) ||
        String(c.n) === ql ||
        String(c.n).padStart(2, '0') === ql;
      const hit = c.lessons
        .map((i) => NODES[i])
        .filter((l) => String(l.title).toLowerCase().includes(ql));
      if (byName || hit.length) {
        set.add(c.n);
        count += 1;
        if (hit.length) lessons.set(c.n, hit.slice(0, 5));
      }
    });
    return set.size ? { set, lessons, count } : null;
  }, [ql]);
  const hitList = React.useMemo(
    () => (hits ? [...hits.set].sort((a, b) => M.byN.get(a).ring - M.byN.get(b).ring || a - b) : []),
    [hits],
  );
  React.useEffect(() => {
    hitPos.current = 0;
  }, [ql]);

  /* ---- 高亮集合 ----
     只给「一跳 + 一条链」：完整闭包实测平均 37 章、最大 73 章（第 1 章的
     下游就是全站），一悬停整张图全亮，等于没有高亮。要看全闭包得显式勾选。 */
  const sets = React.useMemo(() => {
    if (focus == null) return null;
    const chainArr = chainTo(M, focus);
    const chain = new Set(chainArr);
    const chainPairs = new Set();
    for (let i = 1; i < chainArr.length; i++) chainPairs.add(chainArr[i - 1] + '>' + chainArr[i]);
    return {
      chain,
      chainPairs,
      up: deep ? closure(M, focus, 'pred') : new Set(M.byN.get(focus).pred),
      down: deep ? closure(M, focus, 'succ') : new Set(M.byN.get(focus).succ),
    };
  }, [focus, deep]);

  /* ---- 筛选：卷 × 环，两条同时生效（只压暗，不重排） ---- */
  const inScope = React.useCallback(
    (n) => {
      const c = M.byN.get(n);
      if (!c) return true;
      if (volFilter != null && c.vi !== volFilter) return false;
      if (ringFilter != null && c.ring !== ringFilter) return false;
      return true;
    },
    [volFilter, ringFilter],
  );

  const nodeCls = (n) => {
    let cls = 'ml-rg__node';
    if (n === focus) cls += ' is-hot';
    else if (sets) {
      if (sets.chain.has(n)) cls += ' is-chain';
      else if (sets.up.has(n)) cls += ' is-up';
      else if (sets.down.has(n)) cls += ' is-down';
      else cls += ' is-off';
    } else if (hits && hits.set.has(n)) cls += ' is-search';
    else if (hits) cls += ' is-off';
    if (!inScope(n)) cls += ' is-muted';
    /* 已经锁定焦点时，鼠标划过别的章仍要给一点反馈 */
    if (picked != null && n === hot && n !== picked) cls += ' is-hover';
    return cls;
  };

  const edgeCls = (e) => {
    let cls = 'ml-rg__edge' + (e.strong ? '' : ' is-weak');
    if (!e.strong && !weak) cls += ' is-hidden';
    if (!inScope(e.a) || !inScope(e.b)) cls += ' is-off';
    if (sets) {
      if (sets.chainPairs.has(e.a + '>' + e.b)) cls += ' is-chain';
      else if (e.a === focus || e.b === focus) cls += ' is-direct';
      else if (sets.up.has(e.a) && sets.up.has(e.b)) cls += ' is-up';
      else if (sets.down.has(e.a) && sets.down.has(e.b)) cls += ' is-down';
      else cls += ' is-off';
    } else if (hits) {
      cls += hits.set.has(e.a) || hits.set.has(e.b) ? ' is-direct' : ' is-off';
    }
    return cls;
  };

  /* ---- 信息面板 ---- */
  const info = React.useMemo(() => {
    if (focus == null) return null;
    const c = M.byN.get(focus);
    if (!c) return null;
    const chain = chainTo(M, focus).map((n) => M.byN.get(n));
    const lessons = c.lessons.map((i) => NODES[i]).sort((a, b) => a.ord - b.ord);
    /* 强/弱先修分开数：图上默认只画强边（≥2 门课支撑的章级关系），
       面板若只报总入度，读者会去找一条根本不在这张图上的线。 */
    const isStrong = (p, n) => M.edges.some((e) => e.a === p && e.b === n && e.strong);
    return {
      c,
      ring: M.rings[c.ring],
      chain,
      preds: c.pred.map((n) => ({ n, c: M.byN.get(n), strong: isStrong(n, c.n) })),
      succs: c.succ.map((n) => ({ n, c: M.byN.get(n), strong: isStrong(c.n, n) })),
      upAll: closure(M, focus, 'pred').size,
      downAll: closure(M, focus, 'succ').size,
      lessons,
    };
  }, [focus]);

  const volumes = React.useMemo(() => allChapterGroups().map((g, i) => ({ i, n: g.n, title: g.title })), []);

  /* ---- 课级钻取 ----
     点击章 → fetch static/graph-chapters/NN.json → 原位展开本章课点。
     再点同一章 / 点空白 / Esc / 「显示全部」都收起。
     缓存命中时立即用缓存渲染，fetch 只发一次。 */
  const closeDrill = React.useCallback(() => setDrill(null), []);

  const openDrill = React.useCallback(
    (n) => {
      setDrill((cur) => {
        if (cur && cur.n === n) return null; /* 再点同一章 = 收起 */
        return { n, data: drillCache.current.get(n) ?? null, err: null };
      });
      if (drillCache.current.has(n)) return;
      const url = `${baseUrl}graph-chapters/${String(n).padStart(2, '0')}.json`;
      fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((data) => {
          drillCache.current.set(n, data);
          /* 竞态守卫：只写给当前展开的那一章（期间用户可能已切到别章或收起） */
          setDrill((cur) => (cur && cur.n === n ? { n, data, err: null } : cur));
        })
        .catch((e) => {
          setDrill((cur) => (cur && cur.n === n ? { n, data: null, err: String((e && e.message) || e) } : cur));
        });
    },
    [baseUrl],
  );

  const lock = React.useCallback(
    (n) => {
      setPicked((cur) => (cur === n ? null : n));
      setHot(null);
      openDrill(n); /* openDrill 自带「同章再点收起」的开关语义，与 picked 同步 */
    },
    [openDrill],
  );

  const focusAndCenter = React.useCallback(
    (n, k) => {
      setPicked(n);
      setHot(null);
      openDrill(n);
      centerOn(n, k);
      const el = btnRefs.current.get(n);
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    },
    [centerOn, openDrill],
  );

  const onSvgKey = (e) => {
    const cur = focus ?? M.chapters[0].n;
    const map = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (map[e.key]) {
      e.preventDefault();
      const n = neighborInDirection(cur, map[e.key][0], map[e.key][1]);
      if (n != null) {
        setPicked(n);
        setHot(null);
      }
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      if (focus == null) return;
      e.preventDefault();
      lock(focus);
      return;
    }
    if (e.key === 'Escape') {
      setPicked(null);
      setHot(null);
      closeDrill();
      return;
    }
    if (e.key === '+' || e.key === '=') zoomAt(0, 0, 1.3);
    if (e.key === '-' || e.key === '_') zoomAt(0, 0, 1 / 1.3);
    if (e.key === '0') resetView();
  };

  const ringOfChip = (ri) => `第 ${ri + 1} 环 · ${M.rings[ri].name}`;

  return (
    <div className="ml-rg">
      {/* ---------- 工具条 ---------- */}
      <div className="ml-rg__bar">
        <input
          className="ml-rg__search"
          placeholder="搜索章节：傅里叶 / 概率 / 范畴论…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setQ('');
              return;
            }
            if (e.key !== 'Enter' || !hitList.length) return;
            const n = hitList[hitPos.current % hitList.length];
            hitPos.current += 1;
            /* 命中项可能被当前的卷/层筛选挡着：先撤筛选再定位 */
            setVolFilter(null);
            setRingFilter(null);
            focusAndCenter(n, 1.7);
          }}
          aria-label="搜索章节"
        />
        <label className="ml-rg__chip" title="显示/隐藏环上的章名">
          <input type="checkbox" checked={labels} onChange={(e) => setLabels(e.target.checked)} /> 章名
        </label>
        <label className="ml-rg__chip" title="单课支撑的交叉引用（219 条），默认隐藏——它们不是层级关系">
          <input type="checkbox" checked={weak} onChange={(e) => setWeak(e.target.checked)} /> 交叉引用
        </label>
        <label className="ml-rg__chip" title="高亮整条上下游闭包（平均 37 章，会亮一大片）；默认只给直接先修/托起">
          <input type="checkbox" checked={deep} onChange={(e) => setDeep(e.target.checked)} /> 全闭包
        </label>
        <button
          type="button"
          className={'ml-rg__chip ml-rg__chip--btn' + (outline ? ' is-on' : '')}
          onClick={() => setOutline((v) => !v)}
          aria-pressed={outline}
        >
          目录
        </button>
        {(picked != null || ql || volFilter != null || ringFilter != null) && (
          <button
            type="button"
            className="button button--sm button--secondary"
            onClick={() => {
              setPicked(null);
              setHot(null);
              setQ('');
              setVolFilter(null);
              setRingFilter(null);
              closeDrill();
              resetView();
            }}
          >
            显示全部
          </button>
        )}
        <span className="ml-rg__meta">
          {ql
            ? hits
              ? `${hits.count} 章命中（含课名）· 回车逐条定位`
              : '无结果'
            : `${M.chapters.length} 章 · 强先修 ${M.strongEdges.length} 条 · ${M.rings.length} 环`}
        </span>
      </div>

      <div className={'ml-rg__layout' + (outline ? ' has-outline' : '')}>
        {/* ---------- 画布 ---------- */}
        <div className="ml-rg__stage">
          <svg
            ref={svgRef}
            className="ml-rg__svg"
            viewBox={`${-geo.size / 2} ${-geo.size / 2} ${geo.size} ${geo.size}`}
            tabIndex={0}
            role="application"
            aria-label="知识图谱：方向键在章节间移动，回车锁定并展开本章课点，Esc 取消"
            onKeyDown={onSvgKey}
            onClick={(e) => {
              if (drag.current.moved) return;
              if (e.target.closest('.ml-rg__node')) return;
              setPicked(null);
              closeDrill();
            }}
          >
            <g ref={gRef} transform="translate(0 0) scale(1)">
              {/* 环带：交替的极淡底色，让「层」先于「点」被看见 */}
              {M.rings.map((ring, ri) => {
                const rOut = geo.ringR[ri] + (geo.ringR[ri + 1] ? (geo.ringR[ri + 1] - geo.ringR[ri]) / 2 : 46);
                const rIn = ri === 0 ? geo.hubR + 6 : geo.ringR[ri] - (geo.ringR[ri] - geo.ringR[ri - 1]) / 2;
                return (
                  <circle
                    key={`band${ri}`}
                    className={'ml-rg__band' + (ri % 2 ? ' is-alt' : '') + (ringFilter === ri ? ' is-on' : '')}
                    r={(rIn + rOut) / 2}
                    style={{ '--bw': Math.max(4, rOut - rIn) }}
                  />
                );
              })}

              {/* 同心环导轨 */}
              {geo.ringR.map((r, ri) => (
                <circle key={`ring${ri}`} className="ml-rg__ring" r={r} />
              ))}

              {/* 先修连线：朝圆心弯曲 */}
              <g className="ml-rg__edges">
                {M.edges.map((e, k) => (
                  <path
                    key={`e${k}`}
                    d={edgePath(geo.pos.get(e.a), geo.pos.get(e.b))}
                    pathLength={1}
                    className={edgeCls(e)}
                    style={{ '--d': `${Math.min(0.2 + M.byN.get(e.b).ring * 0.08, 0.8)}s` }}
                  />
                ))}
              </g>

              {/* 环标签：写在各环正上方那条空轴上（布局保证那里是空隙） */}
              {M.rings.map((ring, ri) => (
                <g
                  key={`rl${ri}`}
                  className={'ml-rg__ringlabel' + (ringFilter === ri ? ' is-on' : '')}
                  style={{ '--d': `${0.1 + ri * 0.09}s` }}
                >
                  <text y={-geo.ringR[ri] - 8} textAnchor="middle">
                    {`${ring.name} · 难度 ${ring.minDiff}–${ring.maxDiff}`}
                  </text>
                  <text className="ml-rg__ringlabel-sub" y={-geo.ringR[ri] + 6} textAnchor="middle">
                    {`${ring.count} 章 · ${ring.lessons} 课`}
                  </text>
                </g>
              ))}

              {/* 章节点 */}
              {M.chapters.map((c) => {
                const p = geo.pos.get(c.n);
                const lp = labelPlacement(p, dotR(c.count));
                return (
                  <g
                    key={c.n}
                    ref={(el) => {
                      if (el) btnRefs.current.set(c.n, el);
                      else btnRefs.current.delete(c.n);
                    }}
                    className={nodeCls(c.n)}
                    style={{
                      '--d': `${Math.min(c.ring * 0.09 + (c.n % 9) * 0.012, 1.1)}s`,
                      '--vc': `var(${VOL_COLORS[c.vi] || VOL_COLORS[0]})`,
                    }}
                    onMouseEnter={() => setHot(c.n)}
                    onFocus={() => setHot(c.n)}
                    /* 必须成对清掉，否则「悬停态」会永久粘住：
                       ① 鼠标划过后移开，绿/橙高亮与面板卡在最后一颗划过的章上；
                       ② 粘住的 hot 让 focus 恒非空 → 搜索命中的 is-search 分支永远走不到；
                       ③ 键盘 Tab 进来再 Tab 走，同样粘住。
                       只在还是自己时才清，避免「A 的 leave」把刚移入的 B 抹掉。 */
                    onMouseLeave={() => setHot((h) => (h === c.n ? null : h))}
                    onBlur={() => setHot((h) => (h === c.n ? null : h))}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      if (drag.current.moved) return;
                      lock(c.n);
                    }}
                    onDoubleClick={(ev) => {
                      ev.stopPropagation();
                      centerOn(c.n, 2);
                    }}
                    role="button"
                    tabIndex={-1}
                    aria-label={`${c.title}，第 ${c.n} 章，第 ${c.ring + 1} 环，难度 ${c.diff}，${c.count} 门课`}
                  >
                    <circle className="ml-rg__dot" cx={p.x} cy={p.y} r={dotR(c.count)} />
                    {labels && (
                      <text className="ml-rg__label" x={lp.x} y={lp.y} textAnchor={lp.anchor}>
                        {shortLabel(c.short, geo.labelBudget[c.ring])}
                      </text>
                    )}
                    <title>{`${c.title}\n第 ${c.n} 章 · 第 ${c.ring + 1} 环（${M.rings[c.ring].name}）· 难度 ${c.diff} · ${c.count} 门课\n直接先修 ${c.pred.length} 章 · 直接托起 ${c.succ.length} 章\n单击锁定并展开本章课点（课数据从服务器加载），双击居中放大`}</title>
                  </g>
                );
              })}

              {/* 课级钻取（2026-09-29）：点击章后 fetch static/graph-chapters/NN.json，
                  本章每门课绕章点排成一圈小课点，章内先修线画短线。
                  其它章已被焦点逻辑退隐（is-off），课圈是画面上唯一的细节层。 */}
              {drill &&
                drill.data &&
                (() => {
                  const p = geo.pos.get(drill.n);
                  const c = M.byN.get(drill.n);
                  if (!p || !c) return null;
                  const list = drill.data.lessons;
                  const nL = list.length;
                  /* 圈半径：章点半径打底 + 课数开方撑周长，保证 13 课的章也不挤 */
                  const rr = dotR(c.count) + 18 + Math.sqrt(nL) * 2.4;
                  const posOf = (i) => {
                    const ang = -Math.PI / 2 + (nL ? (i / nL) * Math.PI * 2 : 0);
                    return { x: p.x + Math.cos(ang) * rr, y: p.y + Math.sin(ang) * rr, ang };
                  };
                  return (
                    <g className="ml-rg__drill" style={{ '--vc': `var(${VOL_COLORS[c.vi] || VOL_COLORS[0]})` }}>
                      {drill.data.edges.map(([a, b], k) => {
                        const A = posOf(a);
                        const B = posOf(b);
                        return <line key={`de${k}`} className="ml-rg__dedge" x1={A.x} y1={A.y} x2={B.x} y2={B.y} />;
                      })}
                      {list.map((l, i) => {
                        const pt = posOf(i);
                        const cos = Math.cos(pt.ang);
                        const anchor = cos > 0.25 ? 'start' : cos < -0.25 ? 'end' : 'middle';
                        const lx = pt.x + (anchor === 'start' ? 6 : anchor === 'end' ? -6 : 0);
                        const ly = pt.y + (anchor === 'middle' ? (Math.sin(pt.ang) >= 0 ? 11 : -6) : 3.5);
                        return (
                          <g
                            key={l.id}
                            className="ml-rg__ldot"
                            style={{ '--d': `${Math.min(i * 0.018, 0.5)}s` }}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              history.push(l.to);
                            }}
                            role="link"
                            tabIndex={-1}
                            aria-label={l.title}
                          >
                            <circle cx={pt.x} cy={pt.y} r={3.4} />
                            {labels && (
                              <text x={lx} y={ly} textAnchor={anchor}>
                                {shortLabel(l.title, 6)}
                              </text>
                            )}
                            <title>{`${l.title}\n点击进入这一课`}</title>
                          </g>
                        );
                      })}
                      <text className="ml-rg__dcount" x={p.x} y={p.y + rr + 13} textAnchor="middle">
                        {`${drill.data.title} · ${nL} 门课`}
                      </text>
                    </g>
                  );
                })()}

              {/* 钻取加载中：章点外套一圈虚线在流动 */}
              {drill &&
                !drill.data &&
                !drill.err &&
                (() => {
                  const p = geo.pos.get(drill.n);
                  const c = M.byN.get(drill.n);
                  if (!p) return null;
                  return (
                    <circle className="ml-rg__dloading" cx={p.x} cy={p.y} r={(c ? dotR(c.count) : 10) + 18} />
                  );
                })()}

              {/* 圆心枢纽 */}
              <g className="ml-rg__hub">
                <circle r={geo.hubR} />
                <text className="ml-rg__hub-1" y={-6} textAnchor="middle">
                  数学阶梯
                </text>
                <text className="ml-rg__hub-2" y={12} textAnchor="middle">
                  圆心是地基
                </text>
                <text className="ml-rg__hub-2" y={26} textAnchor="middle">
                  往外一层层托起
                </text>
              </g>
            </g>
          </svg>

          <div className="ml-rg__ctrls">
            <button type="button" title="放大（+）" onClick={() => zoomAt(0, 0, 1.35)}>
              ＋
            </button>
            <button type="button" title="缩小（−）" onClick={() => zoomAt(0, 0, 1 / 1.35)}>
              －
            </button>
            <button type="button" title="回到全览（0）" onClick={resetView}>
              ⌂
            </button>
            <span className="ml-rg__zoom">{zoomPct}%</span>
          </div>

          <p className="ml-rg__hint">
            <strong>半径</strong>＝层级（第几环＝爬多高），<strong>颜色</strong>＝所属卷。
            悬停看直接先修（绿）与托起（橙）；<strong>单击任意章</strong>锁定并当场展开这一章的每一门课
            （课数据从服务器按需加载），点课点直接进课，再点章或点空白收起。
            方向键换章、拖动画布、滚轮缩放、双击居中。
          </p>
          {drill && drill.err && (
            <p className="ml-rg__hint ml-rg__hint--err">
              「{M.byN.get(drill.n)?.title}」的课数据加载失败（{drill.err}）——请确认静态服务器托管着
              <code> graph-chapters/ </code>目录，然后重试。
            </p>
          )}
        </div>

        {/* ---------- 目录侧栏：74 颗圆点不是导航界面，这份清单才是 ---------- */}
        {outline && (
          <nav className="ml-rg__outline" aria-label="章节目录（按环分组）">
            {M.rings.map((ring) => (
              <div key={ring.ri} className={'ml-rg__ogroup' + (ringFilter === ring.ri ? ' is-on' : '')}>
                <button
                  type="button"
                  className="ml-rg__ohead"
                  onClick={() => setRingFilter(ringFilter === ring.ri ? null : ring.ri)}
                  title={`只看第 ${ring.ri + 1} 环：${ring.name}（难度 ${ring.minDiff}–${ring.maxDiff}，${ring.count} 章）`}
                >
                  <i className="ml-rg__ringno">{ring.ri + 1}</i>
                  <span className="ml-rg__oname">{ring.name}</span>
                  <em>{`难度 ${ring.minDiff}–${ring.maxDiff} · ${ring.count} 章`}</em>
                </button>
                <ul className="ml-rg__olist">
                  {ring.chapters.map((n) => {
                    const c = M.byN.get(n);
                    const on = focus === n;
                    const hit = hits && hits.set.has(n);
                    const hitLessons = hits && hits.lessons.get(n);
                    return (
                      <li key={n}>
                        <button
                          type="button"
                          className={'ml-rg__oitem' + (on ? ' is-on' : '') + (hit ? ' is-hit' : '')}
                          style={{ '--vc': `var(${VOL_COLORS[c.vi] || VOL_COLORS[0]})` }}
                          onMouseEnter={() => setHot(n)}
                          onMouseLeave={() => setHot((h) => (h === n ? null : h))}
                          onFocus={() => setHot(n)}
                          onBlur={() => setHot((h) => (h === n ? null : h))}
                          onClick={() => focusAndCenter(n, 1.6)}
                          title={
                            hitLessons
                              ? `命中课：${hitLessons.map((l) => l.title).join('、')}`
                              : `${c.title} · ${c.count} 门课`
                          }
                        >
                          <i className="ml-rg__odot" />
                          <span className="ml-rg__onum">{String(n).padStart(2, '0')}</span>
                          <span className="ml-rg__otitle">{c.title}</span>
                          <em>{hitLessons ? `${hitLessons.length} 课命中` : c.count}</em>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        )}
      </div>

      {/* 层级图例：环的名字与章数（环上只标了难度区间，整句写环上必然压住节点） */}
      <div className="ml-rg__rings">
        <span className="ml-rg__rings-lead">由内向外：</span>
        {M.rings.map((ring) => (
          <button
            key={ring.ri}
            type="button"
            className={'ml-rg__ringchip' + (ringFilter === ring.ri ? ' is-on' : '')}
            onClick={() => setRingFilter(ringFilter === ring.ri ? null : ring.ri)}
            title={`只看第 ${ring.ri + 1} 环：${ring.name}（难度 ${ring.minDiff}–${ring.maxDiff}，${ring.count} 章 ${ring.lessons} 课）`}
          >
            <i className="ml-rg__ringno">{ring.ri + 1}</i>
            {ring.name}
            <em>{`难度 ${ring.minDiff}–${ring.maxDiff} · ${ring.count} 章`}</em>
          </button>
        ))}
      </div>

      {/* 卷筛选：点色点只看该卷，再点一次恢复 */}
      <div className="ml-rg__legend">
        {volumes.map((v) => (
          <button
            key={v.n}
            type="button"
            className={
              'ml-rg__vol' + (volFilter === v.i ? ' is-on' : '') + (volFilter != null && volFilter !== v.i ? ' is-off' : '')
            }
            style={{ '--vc': `var(${VOL_COLORS[v.i]})` }}
            onClick={() => setVolFilter(volFilter === v.i ? null : v.i)}
            title={`只看${v.n} · ${v.title}（再点恢复）`}
          >
            <i className="ml-rg__swatch" />
            {`${v.n} · ${v.title}`}
          </button>
        ))}
      </div>

      {/* ---------- 信息面板 ---------- */}
      <div className={'ml-rg__panel' + (info ? ' is-active' : '')}>
        {info ? (
          <>
            <div className="ml-rg__panel-head">
              <strong>{info.c.title}</strong>
              <button type="button" className="button button--sm button--primary" onClick={() => history.push(info.c.to)}>
                进入本章 →
              </button>
              <button
                type="button"
                className="button button--sm button--secondary"
                onClick={() => history.push(info.lessons[0] ? info.lessons[0].to : info.c.to)}
                title="直接打开本章第一节"
              >
                从第一节开始
              </button>
              <span className="ml-rg__pill">{`第 ${info.c.n} 章`}</span>
              <span className="ml-rg__pill">{ringOfChip(info.c.ring)}</span>
              <span className="ml-rg__pill">{`难度 ${info.c.diff}`}</span>
              <span className="ml-rg__pill">{`${info.c.count} 门课`}</span>
            </div>

            {/* 先修链：从地基走到本章的一条现成台阶，每一节都可点 */}
            <div className="ml-rg__chain" aria-label="从地基到本章的先修链">
              <span className="ml-rg__chain-lead">来路</span>
              {info.chain.map((c, i) => (
                <React.Fragment key={c.n}>
                  {i > 0 && <span className="ml-rg__chain-arrow" aria-hidden="true">→</span>}
                  <button
                    type="button"
                    className={'ml-rg__chainchip' + (c.n === info.c.n ? ' is-cur' : '')}
                    style={{ '--vc': `var(${VOL_COLORS[c.vi] || VOL_COLORS[0]})` }}
                    onClick={() => focusAndCenter(c.n, 1.6)}
                    title={`第 ${c.n} 章 · 难度 ${c.diff}（第 ${c.ring + 1} 环）`}
                  >
                    {c.short}
                  </button>
                </React.Fragment>
              ))}
            </div>

            <p className="ml-rg__line">
              {`↑ 直接先修 ${info.preds.length} 章（其中强关系 ${info.preds.filter((x) => x.strong).length} 章）　·　↓ 直接托起 ${info.succs.length} 章　·　全部上游 ${info.upAll} 章 / 下游 ${info.downAll} 章`}
            </p>
            {info.preds.length > 0 && (
              <p className="ml-rg__line ml-rg__line--up">
                先修：
                {info.preds.map(({ n, c, strong }) => (
                  <button
                    key={n}
                    type="button"
                    className={'ml-rg__minichip' + (strong ? '' : ' is-weak')}
                    onClick={() => focusAndCenter(n, 1.6)}
                    title={
                      strong
                        ? `第 ${n} 章 · 难度 ${c.diff} · 这门先修由 ≥2 门课支撑（图上会画线）`
                        : `第 ${n} 章 · 难度 ${c.diff} · 单课交叉引用（勾「交叉引用」才画线）`
                    }
                  >
                    {c.short}
                  </button>
                ))}
              </p>
            )}
            {info.succs.length > 0 && (
              <p className="ml-rg__line ml-rg__line--down">
                托起：
                {info.succs.map(({ n, c, strong }) => (
                  <button
                    key={n}
                    type="button"
                    className={'ml-rg__minichip' + (strong ? '' : ' is-weak')}
                    onClick={() => focusAndCenter(n, 1.6)}
                    title={
                      strong
                        ? `第 ${n} 章 · 难度 ${c.diff} · 由本章强托起（图上会画线）`
                        : `第 ${n} 章 · 难度 ${c.diff} · 单课交叉引用（勾「交叉引用」才画线）`
                    }
                  >
                    {c.short}
                  </button>
                ))}
              </p>
            )}
            {info.preds.length === 0 && (
              <p className="ml-rg__line ml-rg__line--note">
                这一章在章级先修图里没有入边：它是「起点」之一，从这里起步即可。
              </p>
            )}

            <details className="ml-rg__courses">
              <summary>
                {drill && drill.n === focus && drill.data
                  ? `本章 ${drill.data.lessons.length} 门课（已从服务器加载）`
                  : `本章 ${info.c.count} 门课（点开看课表）`}
              </summary>
              <ol>
                {(drill && drill.n === focus && drill.data ? drill.data.lessons : info.lessons).map((l) => (
                  <li key={l.id}>
                    <a href={l.to}>{l.title}</a>
                  </li>
                ))}
              </ol>
            </details>
          </>
        ) : (
          <p className="ml-rg__line">
            圆心是地基（第 1 环），越往外爬得越高，最外一环是前沿。圆点的<strong>大小</strong>＝这一章的课数，
            <strong>颜色</strong>＝所属卷。悬停任意一章看它的直接先修（绿）与托起（橙）；
            单击锁定，面板里会给出「地基 → 本章」的完整来路，每一节都能点着往上走。
          </p>
        )}
      </div>
    </div>
  );
}
