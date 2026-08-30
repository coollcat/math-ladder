import React from 'react';
import { useHistory } from '@docusaurus/router';
import { NODES, EDGES, USE_AGG } from './full-graph-data';
import { allChapterGroups } from './data';
import { fitText } from './pillText';
import { filterCh0, aggregateChapters, layeredLayout, chainOf, popcount } from './treeLayout';

/* =========================================================================
 * 知识树 v2：章节模式 / 单元模式 双版本 + 搜索 + 巨大画布（平移/缩放）
 * -------------------------------------------------------------------------
 * 改动要点（相对旧版）：
 *   1. 排除第 0 章（Python 工具箱）——它不再作为旁支挂根，整章不进树；
 *   2. 双模式：章节（课聚合到章）与 单元（逐课）一键切换；
 *   3. 搜索：实时高亮命中 + 回车跳转循环定位；
 *   4. 排版：分层最长路径 + 重心法交叉消减（treeLayout.js），主干/跨线支撑分层着色；
 *   5. 性能：布局与祖先/后代位图在模块加载时算一次；平移缩放走直接 DOM；
 *      悬停只高亮连通路径、不再整图暗化（减少重绘）。
 * ========================================================================= */

/* ---- 布局参数：单元模式胶囊更大、层级更疏；章节模式更紧凑 ---- */
const LESSON_OPTS = { pillW: 172, pillH: 36, gapX: 188, levelH: 116, topPad: 36 };
const CHAPTER_OPTS = { pillW: 152, pillH: 36, gapX: 168, levelH: 100, topPad: 30 };

const MIN_K = 0.3;
const MAX_K = 2;

/* 模块加载时一次性排除第 0 章 */
const FILTERED = filterCh0(NODES, EDGES, USE_AGG);

/* ---- 构建单元（课）级布局 ---- */
function buildLesson() {
  const nodes = FILTERED.nodes.map((n) => ({
    id: n.id, title: n.title, short: n.short, to: n.to, ch: n.ch,
    born: n.born, uses: n.uses, count: null,
  }));
  const root = nodes.findIndex((n) => n.title.includes('加法与交换律'));
  const L = layeredLayout(nodes.length, FILTERED.edges, root < 0 ? 0 : root, LESSON_OPTS);
  return { nodes, edges: FILTERED.edges, useAgg: FILTERED.useAgg, root, L, pillW: LESSON_OPTS.pillW, pillH: LESSON_OPTS.pillH };
}

/* ---- 构建章节级布局 ---- */
function buildChapter() {
  const chList = allChapterGroups().flatMap((g) => g.chapters).filter((c) => c.n !== 0);
  const agg = aggregateChapters(FILTERED.nodes, FILTERED.edges, chList);
  const nodes = agg.nodes.map((c) => ({
    id: String(c.n), title: c.title, short: c.short, to: c.to, ch: c.n,
    born: [], uses: [], count: c.count,
  }));
  const root = nodes.findIndex((c) => c.ch === 1);
  const L = layeredLayout(nodes.length, agg.edges, root < 0 ? 0 : root, CHAPTER_OPTS);
  return { nodes, edges: agg.edges, useAgg: [], root, L, pillW: CHAPTER_OPTS.pillW, pillH: CHAPTER_OPTS.pillH };
}

const LESSON = buildLesson();
const CHAPTER = buildChapter();

/* 选中节点后：只保留与它连通的节点（祖先 ∪ 后代 ∪ 自身） */
function buildVisible(L, i) {
  const s = new Set([i]);
  const anc = L.anc[i];
  const desc = L.desc[i];
  for (let j = 0; j < L.pos.length; j++) if (anc[j] || desc[j]) s.add(j);
  return s;
}

/* 筛选后逐层重新居中（保持层内相对顺序，整体平移到中轴） */
function shiftPositions(L, visible) {
  if (!visible) return L.pos;
  const byD = new Map();
  L.pos.forEach((_, i) => {
    if (!visible.has(i)) return;
    const d = L.pos[i].lvl;
    if (!byD.has(d)) byD.set(d, []);
    byD.get(d).push(i);
  });
  const out = L.pos.map((p) => ({ ...p }));
  byD.forEach((list) => {
    const xs = list.map((i) => L.pos[i].x);
    const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
    list.forEach((i) => { out[i].x -= mid; });
  });
  return out;
}

/* 边路径：向下/向上/同层三种曲线（与旧版一致，路径更平滑） */
function edgePath(A, B, pillH) {
  if (A.y === B.y) {
    return `M ${A.x} ${A.y + pillH / 2} Q ${(A.x + B.x) / 2} ${A.y + pillH / 2 + 34}, ${B.x} ${B.y + pillH / 2}`;
  }
  if (B.y < A.y) {
    const y1 = B.y + pillH / 2; const y2 = A.y - pillH / 2; const my = (y1 + y2) / 2;
    return `M ${B.x} ${y1} C ${B.x} ${my}, ${A.x} ${my}, ${A.x} ${y2}`;
  }
  const y1 = A.y + pillH / 2; const y2 = B.y - pillH / 2; const my = (y1 + y2) / 2;
  return `M ${A.x} ${y1} C ${A.x} ${my}, ${B.x} ${my}, ${B.x} ${y2}`;
}

export default function KnowledgeGraphTree() {
  const [mode, setMode] = React.useState('lesson');
  const [sel, setSel] = React.useState(null);
  const [hot, setHot] = React.useState(null);
  const [q, setQ] = React.useState('');
  const [toolMode, setToolMode] = React.useState(false);
  const [grown, setGrown] = React.useState(false);
  const [fsOk, setFsOk] = React.useState(false);
  const [isFull, setIsFull] = React.useState(false);

  const history = useHistory();

  /* 当前模式的布局/数据 */
  const D = mode === 'chapter' ? CHAPTER : LESSON;
  const L = D.L;
  const N = D.nodes.length;
  const PILL_W = D.pillW;
  const PILL_H = D.pillH;

  /* ---- 巨型画布：平移 + 缩放（直接写 transform，绕开 React 渲染） ---- */
  const vpRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const view = React.useRef({ x: 0, y: 0, k: 1 });
  const dragRef = React.useRef({ id: -1, sx: 0, sy: 0, vx: 0, vy: 0, moved: false, captured: false });

  const applyView = React.useCallback(() => {
    const vp = vpRef.current;
    const canvas = canvasRef.current;
    if (!vp || !canvas) return;
    const v = view.current;
    const W = L.width * v.k;
    const H = L.height * v.k;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    const pad = 24;
    if (W <= vw - pad * 2) v.x = (vw - W) / 2;
    else v.x = Math.min(Math.max(v.x, vw - W - pad), pad);
    if (H <= vh - pad * 2) v.y = (vh - H) / 2;
    else v.y = Math.min(Math.max(v.y, vh - H - pad), pad);
    canvas.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.k})`;
    canvas.style.visibility = 'visible';
  }, [L]);

  const zoomAt = React.useCallback((px, py, factor) => {
    const v = view.current;
    const k2 = Math.min(MAX_K, Math.max(MIN_K, v.k * factor));
    if (k2 === v.k) return;
    v.x = px - ((px - v.x) * k2) / v.k;
    v.y = py - ((py - v.y) * k2) / v.k;
    v.k = k2;
    applyView();
  }, [applyView]);

  const focusRoot = React.useCallback(() => {
    const vp = vpRef.current;
    if (!vp) return;
    view.current.k = 1;
    view.current.x = vp.clientWidth / 2 + L.minX * view.current.k;
    view.current.y = 16;
    applyView();
  }, [applyView, L]);

  const fitAll = React.useCallback(() => {
    const vp = vpRef.current;
    if (!vp) return;
    const k = Math.min(vp.clientWidth / L.width, vp.clientHeight / L.height, 1);
    view.current.k = Math.max(0.08, k);
    view.current.x = (vp.clientWidth - L.width * view.current.k) / 2;
    view.current.y = (vp.clientHeight - L.height * view.current.k) / 2;
    applyView();
  }, [applyView, L]);

  /* 全屏 */
  React.useEffect(() => {
    setFsOk(!!(document.fullscreenEnabled || document.webkitFullscreenEnabled));
    const onChg = () => {
      const doc = document;
      setIsFull(!!(doc.fullscreenElement || doc.webkitFullscreenElement));
      applyView();
    };
    document.addEventListener('fullscreenchange', onChg);
    document.addEventListener('webkitfullscreenchange', onChg);
    return () => {
      document.removeEventListener('fullscreenchange', onChg);
      document.removeEventListener('webkitfullscreenchange', onChg);
    };
  }, [applyView]);

  const toggleFull = () => {
    const el = vpRef.current;
    if (!el) return;
    const doc = document;
    const cur = doc.fullscreenElement || doc.webkitFullscreenElement;
    if (cur === el) {
      const exit = doc.exitFullscreen || doc.webkitExitFullscreen;
      if (exit) exit.call(doc);
    } else {
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) req.call(el);
    }
  };

  /* 指针拖拽 + 双指捏合（同旧版：点击与拖拽阈值分离，捕获推迟到拖拽成立） */
  React.useEffect(() => {
    const vp = vpRef.current;
    if (!vp) return undefined;
    const pointers = new Map();
    let pinchDist = 0;

    const onDown = (e) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      }
      dragRef.current.id = e.pointerId;
      dragRef.current.sx = e.clientX;
      dragRef.current.sy = e.clientY;
      dragRef.current.vx = view.current.x;
      dragRef.current.vy = view.current.y;
      dragRef.current.moved = false;
      dragRef.current.captured = false;
    };
    const onMove = (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const rect = vp.getBoundingClientRect();
        const mid = { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top };
        if (pinchDist > 0 && d > 0) zoomAt(mid.x, mid.y, d / pinchDist);
        pinchDist = d;
        dragRef.current.moved = true;
        return;
      }
      if (e.pointerId !== dragRef.current.id) return;
      const dx = e.clientX - dragRef.current.sx;
      const dy = e.clientY - dragRef.current.sy;
      if (Math.abs(dx) + Math.abs(dy) > 5) {
        dragRef.current.moved = true;
        if (!dragRef.current.captured) { vp.setPointerCapture(e.pointerId); dragRef.current.captured = true; }
        vp.classList.add('is-grabbing');
      }
      view.current.x = dragRef.current.vx + dx;
      view.current.y = dragRef.current.vy + dy;
      applyView();
    };
    const onUp = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchDist = 0;
      if (e.pointerId === dragRef.current.id) dragRef.current.id = -1;
      vp.classList.remove('is-grabbing');
    };
    const onWheel = (e) => {
      e.preventDefault();
      const rect = vp.getBoundingClientRect();
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-e.deltaY * 0.0016));
    };
    const onDbl = (e) => {
      const rect = vp.getBoundingClientRect();
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, 1.5);
    };
    vp.addEventListener('pointerdown', onDown);
    vp.addEventListener('pointermove', onMove);
    vp.addEventListener('pointerup', onUp);
    vp.addEventListener('pointercancel', onUp);
    vp.addEventListener('wheel', onWheel, { passive: false });
    vp.addEventListener('dblclick', onDbl);
    window.addEventListener('resize', applyView);
    focusRoot();
    return () => {
      vp.removeEventListener('pointerdown', onDown);
      vp.removeEventListener('pointermove', onMove);
      vp.removeEventListener('pointerup', onUp);
      vp.removeEventListener('pointercancel', onUp);
      vp.removeEventListener('wheel', onWheel);
      vp.removeEventListener('dblclick', onDbl);
      window.removeEventListener('resize', applyView);
    };
  }, [applyView, zoomAt, focusRoot]);

  /* 切换模式：重置选中/悬停/搜索，重播入场动画 */
  React.useEffect(() => {
    setSel(null);
    setHot(null);
    setQ('');
    setToolMode(false);
    setGrown(false);
    const t = setTimeout(() => setGrown(true), 30);
    return () => clearTimeout(t);
  }, [mode]);

  /* 入场逐节点延迟：层级错峰 + 层内从左到右 */
  const revealDelay = React.useMemo(() => {
    const byL = new Map();
    L.pos.forEach((p, i) => {
      if (!byL.has(p.lvl)) byL.set(p.lvl, []);
      byL.get(p.lvl).push(i);
    });
    const out = new Array(N).fill('0s');
    byL.forEach((list) => {
      [...list].sort((a, b) => L.pos[a].x - L.pos[b].x).forEach((i, k) => {
        out[i] = `${Math.min(L.pos[i].lvl * 0.06 + k * 0.018, 1.4).toFixed(3)}s`;
      });
    });
    return out;
  }, [L, N]);

  /* 选中后的连通闭包与重排位置 */
  const visible = React.useMemo(() => (sel == null ? null : buildVisible(L, sel)), [sel, L]);
  const shifted = React.useMemo(() => shiftPositions(L, visible), [L, visible]);

  /* 搜索 */
  const ql = q.trim().toLowerCase();
  const hits = React.useMemo(() => {
    if (!ql) return null;
    const s = new Set();
    D.nodes.forEach((n, i) => {
      if (
        n.title.toLowerCase().includes(ql) ||
        (n.short || '').toLowerCase().includes(ql) ||
        n.id.toLowerCase().includes(ql)
      ) s.add(i);
    });
    return s.size ? s : null;
  }, [ql, D]);
  const hitList = React.useMemo(() => {
    if (!hits) return [];
    return [...hits].sort((a, b) => L.pos[a].lvl - L.pos[b].lvl || L.pos[a].x - L.pos[b].x);
  }, [hits, L]);
  const hitPos = React.useRef(0);
  React.useEffect(() => { hitPos.current = 0; }, [ql]);

  /* 跳转定位：同步算出筛选后的位置，直接平移缩放；随后 setSel 触发 React 重渲染。
     targetK 传入时（搜索定位）把缩放提到至少该档，点击聚焦则保留当前缩放。 */
  const jumpTo = (i, targetK) => {
    const vis = buildVisible(L, i);
    const shiftedNow = shiftPositions(L, vis);
    const p = shiftedNow[i];
    const vp = vpRef.current;
    if (vp && p) {
      const k = targetK != null ? Math.max(view.current.k, targetK) : view.current.k;
      view.current.k = k;
      view.current.x = vp.clientWidth / 2 - (p.x - L.minX) * k;
      view.current.y = Math.max(16, vp.clientHeight / 2 - p.y * k);
      applyView();
    }
    setSel(i);
    setHot(null);
  };

  const onSearchEnter = () => {
    if (!hitList.length) return;
    const i = hitList[hitPos.current % hitList.length];
    hitPos.current += 1;
    jumpTo(i, 1);
  };

  /* 节点/边样式 */
  const edgeCls = (a, b, k) => {
    let cls = 'ml-tr__edge' + (L.trunk.has(k) ? '' : ' ml-tr__edge--branch');
    if (sel != null && visible) {
      if (!visible.has(a) || !visible.has(b)) return cls + ' is-off';
      const lu = L.anc[sel][a] && L.anc[sel][b];
      const ld = L.desc[sel][a] && L.desc[sel][b];
      if ((lu || ld) && (a === sel || b === sel)) cls += ' is-direct';
      else if (lu) cls += ' is-up';
      else cls += ' is-down';
    } else if (hot != null) {
      const lu = L.anc[hot][a] && L.anc[hot][b];
      const ld = L.desc[hot][a] && L.desc[hot][b];
      if ((lu || ld) && (a === hot || b === hot)) cls += ' is-direct';
      else if (lu) cls += ' is-up';
      else if (ld) cls += ' is-down';
    }
    if (grown) cls += ' is-in';
    return cls;
  };

  const nodeCls = (i) => {
    let cls = 'ml-fg__node';
    if (sel != null && visible) {
      if (!visible.has(i)) return cls + ' is-off';
      if (i === sel) return cls + ' is-hot';
      if (L.anc[sel][i]) return cls + ' is-up';
      return cls + ' is-down';
    }
    if (hits) {
      if (hits.has(i)) return cls + ' is-search';
      return cls;
    }
    if (hot != null) {
      if (i === hot) return cls + ' is-hot';
      if (L.anc[hot][i]) return cls + ' is-up';
      if (L.desc[hot][i]) return cls + ' is-down';
      return cls;
    }
    return cls;
  };

  /* 信息面板数据 */
  const info = React.useMemo(() => {
    const focus = sel ?? hot;
    if (focus == null) return null;
    const n = D.nodes[focus];
    return {
      n,
      gen: L.pos[focus].lvl + 1,
      chain: chainOf(focus, L.parent),
      upCount: popcount(L.anc[focus]),
      downCount: popcount(L.desc[focus]),
      directDown: L.succ[focus].length,
    };
  }, [sel, hot, D, L]);

  return (
    <div>
      <div className="ml-fg__bar ml-tr__bar">
        <div className="ml-tr__modes" role="tablist" aria-label="知识树模式">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'chapter'}
            className={'ml-tr__mode' + (mode === 'chapter' ? ' is-on' : '')}
            onClick={() => setMode('chapter')}
          >
            章节模式
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'lesson'}
            className={'ml-tr__mode' + (mode === 'lesson' ? ' is-on' : '')}
            onClick={() => setMode('lesson')}
          >
            单元模式
          </button>
        </div>

        <div className="ml-tr__searchwrap">
          <input
            className="ml-fg__search"
            placeholder={mode === 'chapter' ? '搜索章节：傅里叶 / 线性代数…' : '搜索课程：勾股 / 欧拉 / 黎曼…'}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSearchEnter(); }}
          />
          {ql && (
            <>
              <span className="ml-tr__count">{hits ? `${hitList.length} 项 · 回车定位` : '无结果'}</span>
              <button type="button" className="ml-tr__clear" onClick={() => setQ('')} aria-label="清除搜索">✕</button>
            </>
          )}
        </div>

        {mode === 'lesson' && (
          <label className="ml-fg__chip">
            <input type="checkbox" checked={toolMode} onChange={(e) => setToolMode(e.target.checked)} /> 工具血缘层
          </label>
        )}

        {sel != null && (
          <button type="button" className="button button--sm button--secondary" onClick={() => setSel(null)}>显示全部</button>
        )}

        <span className="ml-fg__meta">
          {N} {mode === 'chapter' ? '章' : '课'} · 先修 {D.edges.length} 条 · 最深 {L.maxL + 1} 层
        </span>
      </div>

      <div className="ml-tr__viewport" ref={vpRef} onMouseLeave={() => setHot(null)}>
        <div className="ml-tr__canvas" ref={canvasRef}>
          <svg
            viewBox={`${L.minX} 0 ${L.width} ${L.height}`}
            width={L.width}
            height={L.height}
            className="ml-tr__svg"
            onClick={(e) => { if (!dragRef.current.moved && e.target === e.currentTarget) setSel(null); }}
          >
            {D.edges.map(([a, b], k) => {
              const A = shifted[a]; const B = shifted[b];
              const d = edgePath(A, B, PILL_H);
              return (
                <path
                  key={'e' + k}
                  d={d}
                  pathLength={1}
                  style={{ '--rvd': revealDelay[b] }}
                  className={edgeCls(a, b, k)}
                />
              );
            })}

            {toolMode && mode === 'lesson' && D.useAgg.map(([a, b, tools], k) => {
              const A = shifted[a]; const B = shifted[b];
              let cls = 'ml-tr__tedge';
              if (sel != null && visible && (!visible.has(a) || !visible.has(b))) cls += ' is-off';
              else if (hot != null) cls += L.anc[hot][a] || L.desc[hot][a] || L.anc[hot][b] || L.desc[hot][b] ? ' is-up' : '';
              if (grown) cls += ' is-in';
              const mx = (A.x + B.x) / 2;
              const d = A.y === B.y
                ? `M ${A.x + PILL_W / 2} ${A.y} Q ${mx} ${A.y + 26}, ${B.x - PILL_W / 2} ${B.y}`
                : `M ${A.x} ${A.y} C ${mx} ${A.y}, ${mx} ${B.y}, ${B.x} ${B.y}`;
              return (
                <path key={'u' + k} d={d} className={cls}>
                  <title>{'工具血缘：' + tools.join('、')}</title>
                </path>
              );
            })}

            {D.nodes.map((n, i) => {
              const p = shifted[i];
              const gen = L.pos[i].lvl + 1;
              const padL = gen >= 10 ? 25 : 18;
              let label;
              let tx;
              let rightBadge;
              if (mode === 'chapter') {
                const cw = String(n.count).length > 1 ? 22 : 14;
                label = fitText(n.short, PILL_W - 16 - cw);
                tx = (16 + PILL_W - cw) / 2;
                rightBadge = (
                  <>
                    <circle cx={PILL_W - 11} cy={PILL_H / 2} r={9.5} className="ml-ht__count-bg" />
                    <text x={PILL_W - 11} y={PILL_H / 2 + 4} textAnchor="middle" className="ml-ht__count">{n.count}</text>
                  </>
                );
              } else {
                const padR = n.born.length ? 20 : 10;
                label = fitText(n.short, PILL_W - padL - padR);
                tx = (padL + PILL_W - padR) / 2;
                rightBadge = n.born.length > 0
                  ? <circle cx={PILL_W - 9} cy={9} r={3.4} className="ml-fg__tool" />
                  : null;
              }
              return (
                <g
                  key={n.id}
                  className="ml-tr__pos"
                  style={{ transform: `translate(${p.x - PILL_W / 2}px, ${p.y - PILL_H / 2}px)` }}
                >
                  <g
                    className={'ml-tr__reveal' + (grown ? ' is-in' : '')}
                    style={{ transitionDelay: grown ? revealDelay[i] : '0s' }}
                  >
                    <g
                      className={nodeCls(i)}
                      onMouseEnter={() => setHot(i)}
                      onFocus={() => setHot(i)}
                      onClick={(e) => { e.stopPropagation(); if (!dragRef.current.moved) (sel === i ? setSel(null) : jumpTo(i)); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') (sel === i ? setSel(null) : jumpTo(i)); }}
                      role="link"
                      tabIndex={0}
                    >
                      <rect width={PILL_W} height={PILL_H} rx={18} />
                      <text x={10} y={PILL_H / 2 + 5} className="ml-fg__depth">{gen}</text>
                      <text x={tx} y={PILL_H / 2 + 5} textAnchor="middle">{label}</text>
                      {rightBadge}
                      <title>{`${n.title}\n第 ${gen} 代 · 先修深度第 ${gen} 层${mode === 'chapter' ? `\n本章 ${n.count} 门课` : ''}${n.born.length ? '\n诞生：' + n.born.join('、') : ''}${n.uses.length ? '\n使用：' + n.uses.join('、') : ''}\n点击聚焦连通路径`}</title>
                    </g>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="ml-tr__ctrls">
          {fsOk && (
            <button type="button" title={isFull ? '退出全屏' : '全屏'} onClick={toggleFull}>
              {isFull ? '⤡' : '⛶'}
            </button>
          )}
          <button type="button" title="放大" onClick={(e) => { const r = e.currentTarget.closest('.ml-tr__viewport').getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, 1.35); }}>＋</button>
          <button type="button" title="缩小" onClick={(e) => { const r = e.currentTarget.closest('.ml-tr__viewport').getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, 1 / 1.35); }}>－</button>
          <button type="button" title="回到树根" onClick={focusRoot}>⌂</button>
          <button type="button" title="鸟瞰全树" onClick={fitAll}>▣</button>
        </div>

        <span className="ml-tr__hint">拖动画布 · 滚轮缩放 · 双击放大 · 悬停看先修链 · 点击聚焦</span>
      </div>

      <div className="ml-tr__legend">
        <i className="ml-tr__legend-line" /> 主干先修
        <i className="ml-tr__legend-line ml-tr__legend-line--branch" /> 跨线支撑
        <i className="ml-tr__legend-line ml-tr__legend-line--up" /> 先修链（绿）
        <i className="ml-tr__legend-line ml-tr__legend-line--down" /> 托起（橙）
      </div>

      <div className={'ml-fg__panel' + (info ? ' is-active' : '')}>
        {info ? (
          <>
            <div className="ml-fg__panel-head">
              <strong>{info.n.title}</strong>
              <button type="button" className="button button--sm button--primary" onClick={() => history.push(info.n.to)}>
                {mode === 'chapter' ? '进入本章 →' : '进入课程 →'}
              </button>
              <span className="ml-fg__pill">第 {info.gen} 代</span>
              {mode === 'lesson' && <span className="ml-fg__pill">第 {info.n.ch} 章</span>}
              {mode === 'chapter' && <span className="ml-fg__pill">{info.n.count} 门课</span>}
              {info.n.born.length > 0 && <span className="ml-fg__pill ml-fg__pill--born">✦ 诞生 {info.n.born.join('、')}</span>}
            </div>
            <p className="ml-fg__line">
              最长先修链：{info.chain.map((i) => D.nodes[i].short).join(' → ')}
            </p>
            <p className="ml-fg__line">
              ↑ 先修 {info.upCount} {mode === 'chapter' ? '章' : '门'}　·　↓ 托起 {info.downCount} {mode === 'chapter' ? '章' : '门'}　·　直接后继 {info.directDown} {mode === 'chapter' ? '章' : '门'}
            </p>
            {info.n.uses.length > 0 && <p className="ml-fg__line">本课用到的工具：{info.n.uses.join('、')}</p>}
          </>
        ) : (
          <p className="ml-fg__hint">
            {mode === 'chapter'
              ? '章节模式把先修线聚合到章：点任一章节只看它的先修与托起；双击或「进入本章」阅读。'
              : '单元模式逐课展开：根是「加法与交换律」，数字徽标＝第几代。悬停看先修链，点击聚焦连通路径，再点恢复。'}
            已排除第 0 章「Python 工具箱」（纯工具/附录，不参与数学先修链）。
          </p>
        )}
      </div>
    </div>
  );
}
