import React from 'react';
import { useHistory } from '@docusaurus/router';
import { NODES, EDGES, USE_AGG } from './full-graph-data';
import { allChapterGroups } from './data';
import { fitText } from './pillText';
import { filterCh0, aggregateChapters, layeredLayout, blockLayout, chainOf, popcount } from './treeLayout';

/* =========================================================================
 * 知识树 v3：章节模式 / 单元模式 双版本 + 搜索 + 巨大画布（平移/缩放）
 * -------------------------------------------------------------------------
 * 2026-08-31 重构要点：
 *   布局（treeLayout.js）：层内紧凑槽位（零空洞，占用率 100%）+
 *     层间中位数对齐松弛——旧版「继承父 x + 每层独立居中」实测层内
 *     空槽 429 个、占用率仅 65%，是本版要消灭的稀疏问题。
 *   渲染：SVG 结构按模式 useMemo 静态化（805 节点 + 1125 边不再随
 *     悬停/选中整树重渲染）；悬停/选中/搜索高亮与选中位移全部走
 *     直接 DOM（classList / transform / path d，带变更缓存）；
 *     React 只负责工具栏与信息面板。
 * ========================================================================= */

/* ---- 布局参数：单元模式胶囊更大、层级更疏；章节模式更紧凑 ----
 * gapX = 层内槽间距（槽位紧凑排列，相邻胶囊留约 10px 呼吸）；
 * levelH 收窄后一屏可见代数 ~14 层。同层边下垂量 sag 按层高等比缩放。
 * 2026-09-02 整体收一档：805 节点的单元模式原先整树宽约 1.6 万像素，
 * 看着松散；胶囊 150×30→128×26、层距 82→62、章块每行最多 6 个。 */
const LESSON_OPTS = {
  pillW: 128, pillH: 26, gapX: 138, levelH: 62, topPad: 18,
  maxCols: 6, blockGap: 30, rootCh: 1,
};
const CHAPTER_OPTS = { pillW: 112, pillH: 26, gapX: 122, levelH: 54, topPad: 16 };
/* 同层边下垂深度：与 levelH 保持约 0.29 的比例（旧版 34/116） */
const SAG_RATIO = 0.29;

const MIN_K = 0.3;
const MAX_K = 2;

/* 模块加载时一次性排除第 0 章 */
const FILTERED = filterCh0(NODES, EDGES, USE_AGG);

/* ---- 构建单元（课）级布局 ----
 * 章节块布局（blockLayout）：章 DAG 决定约 20 个「带」，每章的课在带内
 * 排成紧凑网格块——同章课程永远收在一个矩形块里，不再被先修链拆到
 * 五六层；块间按章 DAG 重心排序 + 中位数对齐，章内边在块内走短弧线。 */
function buildLesson() {
  const nodes = FILTERED.nodes.map((n) => ({
    id: n.id, title: n.title, short: n.short, to: n.to, ch: n.ch,
    born: n.born, uses: n.uses, count: null,
  }));
  const root = nodes.findIndex((n) => n.title.includes('加法与交换律'));
  const L = blockLayout(FILTERED.nodes.map((n) => n.ch), FILTERED.edges, root < 0 ? 0 : root, LESSON_OPTS);
  return { nodes, edges: FILTERED.edges, useAgg: FILTERED.useAgg, root, L, pillW: LESSON_OPTS.pillW, pillH: LESSON_OPTS.pillH, sag: Math.round(LESSON_OPTS.levelH * SAG_RATIO), sagCap: Math.round(LESSON_OPTS.levelH * 0.56) };
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
  return { nodes, edges: agg.edges, useAgg: [], root, L, pillW: CHAPTER_OPTS.pillW, pillH: CHAPTER_OPTS.pillH, sag: Math.round(CHAPTER_OPTS.levelH * SAG_RATIO), sagCap: Math.round(CHAPTER_OPTS.levelH * 0.56) };
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

/* 筛选后逐层重新居中（保持层内相对顺序，整体平移到中轴）
 * 返回 { pos, bounds }：pos 是平移后的坐标数组，bounds 是选中内容的实际边界。 */
function shiftPositions(L, visible) {
  if (!visible) return { pos: L.pos, bounds: null };
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
  const vis = [...visible];
  const xs = vis.map((i) => out[i].x);
  const ys = vis.map((i) => out[i].y);
  const pad = 80;
  const bounds = {
    minX: Math.min(...xs) - pad,
    maxX: Math.max(...xs) + pad,
    minY: Math.min(...ys) - pad,
    maxY: Math.max(...ys) + pad,
  };
  bounds.width = bounds.maxX - bounds.minX;
  bounds.height = bounds.maxY - bounds.minY;
  return { pos: out, bounds };
}

/* 边路径：向下/向上/同层三种曲线。
 * 同层边（章粒度分层后大量出现）下垂深度随水平距离放大——
 * 远距离弧线更深、近距离更浅，弧线互不重叠，封顶 sagCap 防止扎进下一层。 */
function edgePath(A, B, pillH, sag = 24, sagCap = 44) {
  if (A.y === B.y) {
    const s = Math.min(sag + Math.abs(B.x - A.x) * 0.06, sagCap);
    return `M ${A.x} ${A.y + pillH / 2} Q ${(A.x + B.x) / 2} ${A.y + pillH / 2 + s}, ${B.x} ${B.y + pillH / 2}`;
  }
  if (B.y < A.y) {
    const y1 = B.y + pillH / 2; const y2 = A.y - pillH / 2; const my = (y1 + y2) / 2;
    return `M ${B.x} ${y1} C ${B.x} ${my}, ${A.x} ${my}, ${A.x} ${y2}`;
  }
  const y1 = A.y + pillH / 2; const y2 = B.y - pillH / 2; const my = (y1 + y2) / 2;
  return `M ${A.x} ${y1} C ${A.x} ${my}, ${B.x} ${my}, ${B.x} ${y2}`;
}

function tedgePath(A, B, pillW, sag, sagCap = 44) {
  const mx = (A.x + B.x) / 2;
  if (A.y === B.y) {
    const s = Math.min(sag + Math.abs(B.x - A.x) * 0.06, sagCap);
    return `M ${A.x + pillW / 2} ${A.y} Q ${mx} ${A.y + s}, ${B.x - pillW / 2} ${B.y}`;
  }
  return `M ${A.x} ${A.y} C ${mx} ${A.y}, ${mx} ${B.y}, ${B.x} ${B.y}`;
}

/* 带变更缓存的 class 写入：没变就不碰 DOM（避免无谓的样式重算） */
function setCls(el, cls) {
  if (el.__cls !== cls) {
    el.__cls = cls;
    el.setAttribute('class', cls);
  }
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
  const isCh = D === CHAPTER;

  /* 模式切换后的过渡渲染里 sel/hot 可能是上一模式的越界下标——先夹紧再用 */
  const selS = sel != null && sel < N ? sel : null;
  const hotS = hot != null && hot < N ? hot : null;

  /* ---- 巨型画布：平移 + 缩放（直接写 transform，绕开 React 渲染） ---- */
  const vpRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const svgRef = React.useRef(null);
  const view = React.useRef({ x: 0, y: 0, k: 1 });
  const dragRef = React.useRef({ id: -1, sx: 0, sy: 0, vx: 0, vy: 0, moved: false, captured: false });

  /* 直接 DOM 操作用的元素索引与运行时镜像（不进 React 状态） */
  const elsRef = React.useRef({ pos: [], node: [], edge: [], tedge: [], reveal: [] });
  const selRef = React.useRef(null);
  const boundsRef = React.useRef(null);
  const curPosRef = React.useRef(L.pos);
  /* 挂载期事件监听器（[] 依赖）经此 ref 始终调到最新闭包 */
  const fnRef = React.useRef({});

  /* ---- 视图变换：useBOverride 传入时优先，否则按选中态取动态边界 ---- */
  const applyView = React.useCallback((useBOverride) => {
    const vp = vpRef.current;
    const canvas = canvasRef.current;
    if (!vp || !canvas) return;
    const v = view.current;
    const useB = useBOverride !== undefined
      ? useBOverride
      : (selRef.current != null ? boundsRef.current : null);
    const W = (useB ? useB.width : L.width) * v.k;
    const H = (useB ? useB.height : L.height) * v.k;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    const pad = 24;
    if (W <= vw - pad * 2) {
      const cx = useB ? (useB.minX + useB.maxX) / 2 : L.width / 2 + L.minX;
      v.x = vw / 2 - cx * v.k;
    } else {
      v.x = Math.min(Math.max(v.x, vw - W - pad), pad);
    }
    if (H <= vh - pad * 2) {
      v.y = useB ? (vh - H) / 2 : Math.max((vh - H) / 2, 0);
    } else {
      v.y = Math.min(Math.max(v.y, vh - H - pad), pad);
    }
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

  /* 选中后缩放到选中内容的实际边界（boundsRef 由选中 effect 维护） */
  const fitSel = React.useCallback(() => {
    const vp = vpRef.current;
    const b = boundsRef.current;
    if (!vp || !b) return;
    const pad = 40;
    const k = Math.min(
      (vp.clientWidth - pad * 2) / b.width,
      (vp.clientHeight - pad * 2) / b.height,
      1.5,
    );
    view.current.k = Math.max(0.15, k);
    const cx = (b.minX + b.maxX) / 2;
    const cy = (b.minY + b.maxY) / 2;
    view.current.x = vp.clientWidth / 2 - cx * view.current.k;
    view.current.y = vp.clientHeight / 2 - cy * view.current.k;
    applyView();
  }, [applyView]);

  /* ---- 直接 DOM：节点/边定位（选中筛选时整树位移） ---- */
  const applyPositions = React.useCallback((pos) => {
    curPosRef.current = pos;
    const els = elsRef.current;
    const pw = D.pillW;
    const ph = D.pillH;
    for (let i = 0; i < els.pos.length; i++) {
      els.pos[i].style.transform = `translate(${pos[i].x - pw / 2}px, ${pos[i].y - ph / 2}px)`;
    }
    for (let k = 0; k < els.edge.length; k++) {
      const [a, b] = D.edges[k];
      els.edge[k].setAttribute('d', edgePath(pos[a], pos[b], ph, D.sag, D.sagCap));
    }
    for (let k = 0; k < els.tedge.length; k++) {
      const [a, b] = D.useAgg[k];
      els.tedge[k].setAttribute('d', tedgePath(pos[a], pos[b], pw, D.sag, D.sagCap));
    }
  }, [D]);

  /* ---- 直接 DOM：高亮着色（悬停/选中/搜索/入场） ---- */
  const paint = React.useCallback((s, h, hitsSet, isGrown) => {
    const els = elsRef.current;
    if (!els.node.length) return;
    const visible = s != null ? buildVisible(L, s) : null;

    for (let i = 0; i < N; i++) {
      let cls = 'ml-fg__node';
      if (s != null && visible) {
        if (!visible.has(i)) cls += ' is-off';
        else if (i === s) cls += ' is-hot';
        else if (L.anc[s][i]) cls += ' is-up';
        else cls += ' is-down';
      } else if (hitsSet) {
        if (hitsSet.has(i)) cls += ' is-search';
      } else if (h != null) {
        if (i === h) cls += ' is-hot';
        else if (L.anc[h][i]) cls += ' is-up';
        else if (L.desc[h][i]) cls += ' is-down';
      }
      setCls(els.node[i], cls);
    }

    for (let k = 0; k < els.edge.length; k++) {
      const [a, b] = D.edges[k];
      let cls = 'ml-tr__edge' + (L.trunk.has(k) ? '' : ' ml-tr__edge--branch');
      if (s != null && visible) {
        if (!visible.has(a) || !visible.has(b)) cls += ' is-off';
        else {
          const lu = L.anc[s][a] && L.anc[s][b];
          const ld = L.desc[s][a] && L.desc[s][b];
          if ((lu || ld) && (a === s || b === s)) cls += ' is-direct';
          else if (lu) cls += ' is-up';
          else cls += ' is-down';
        }
      } else if (h != null) {
        const lu = L.anc[h][a] && L.anc[h][b];
        const ld = L.desc[h][a] && L.desc[h][b];
        if ((lu || ld) && (a === h || b === h)) cls += ' is-direct';
        else if (lu) cls += ' is-up';
        else if (ld) cls += ' is-down';
      }
      if (isGrown) cls += ' is-in';
      setCls(els.edge[k], cls);
    }

    for (let k = 0; k < els.tedge.length; k++) {
      const [a, b] = D.useAgg[k];
      let cls = 'ml-tr__tedge';
      if (s != null && visible && (!visible.has(a) || !visible.has(b))) cls += ' is-off';
      else if (h != null && (L.anc[h][a] || L.desc[h][a] || L.anc[h][b] || L.desc[h][b])) cls += ' is-up';
      if (isGrown) cls += ' is-in';
      setCls(els.tedge[k], cls);
    }

    const rCls = 'ml-tr__reveal' + (isGrown ? ' is-in' : '');
    for (let i = 0; i < els.reveal.length; i++) setCls(els.reveal[i], rCls);
  }, [D, L, N]);

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

  /* ---- 静态 SVG：仅随 模式/工具层 重建；高亮与位移不经过 React ---- */
  const jumpToRef = React.useRef(null);
  const svgTree = React.useMemo(() => {
    /* 入场逐节点延迟：层级错峰 + 层内从左到右 */
    const revealDelay = new Array(D.nodes.length).fill('0s');
    const byL = new Map();
    L.pos.forEach((p, i) => {
      if (!byL.has(p.lvl)) byL.set(p.lvl, []);
      byL.get(p.lvl).push(i);
    });
    byL.forEach((list) => {
      [...list].sort((a, b) => L.pos[a].x - L.pos[b].x).forEach((i, k) => {
        revealDelay[i] = `${Math.min(L.pos[i].lvl * 0.06 + k * 0.018, 1.4).toFixed(3)}s`;
      });
    });

    return (
      <svg
        ref={svgRef}
        viewBox={`${L.minX} 0 ${L.width} ${L.height}`}
        width={L.width}
        height={L.height}
        className="ml-tr__svg"
        onClick={(e) => { if (!dragRef.current.moved && e.target === e.currentTarget) setSel(null); }}
      >
        {D.edges.map(([a, b], k) => (
          <path
            key={'e' + k}
            d={edgePath(L.pos[a], L.pos[b], D.pillH, D.sag, D.sagCap)}
            pathLength={1}
            style={{ '--rvd': revealDelay[b] }}
            className={'ml-tr__edge' + (L.trunk.has(k) ? '' : ' ml-tr__edge--branch')}
          />
        ))}

        {toolMode && !isCh && D.useAgg.map(([a, b, tools], k) => (
          <path key={'u' + k} d={tedgePath(L.pos[a], L.pos[b], D.pillW, D.sag, D.sagCap)} className="ml-tr__tedge">
            <title>{'工具血缘：' + tools.join('、')}</title>
          </path>
        ))}

        {D.nodes.map((n, i) => {
          const p = L.pos[i];
          const gen = p.lvl + 1;
          const padL = gen >= 10 ? 25 : 18;
          let label;
          let tx;
          let rightBadge;
          if (isCh) {
            const cw = String(n.count).length > 1 ? 22 : 14;
            label = fitText(n.short, D.pillW - 16 - cw);
            tx = (16 + D.pillW - cw) / 2;
            rightBadge = (
              <>
                <circle cx={D.pillW - 11} cy={D.pillH / 2} r={9.5} className="ml-ht__count-bg" />
                <text x={D.pillW - 11} y={D.pillH / 2 + 4} textAnchor="middle" className="ml-ht__count">{n.count}</text>
              </>
            );
          } else {
            const padR = n.born.length ? 20 : 10;
            label = fitText(n.short, D.pillW - padL - padR);
            tx = (padL + D.pillW - padR) / 2;
            rightBadge = n.born.length > 0
              ? <circle cx={D.pillW - 9} cy={9} r={3.4} className="ml-fg__tool" />
              : null;
          }
          return (
            <g
              key={n.id}
              className="ml-tr__pos"
              style={{ transform: `translate(${p.x - D.pillW / 2}px, ${p.y - D.pillH / 2}px)` }}
            >
              <g
                className="ml-tr__reveal"
                style={{ transitionDelay: revealDelay[i] }}
              >
                <g
                  className="ml-fg__node"
                  onMouseEnter={() => setHot(i)}
                  onFocus={() => setHot(i)}
                  onClick={(e) => { e.stopPropagation(); if (!dragRef.current.moved) (selRef.current === i ? setSel(null) : jumpToRef.current(i)); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') (selRef.current === i ? setSel(null) : jumpToRef.current(i)); }}
                  role="link"
                  tabIndex={0}
                >
                  <rect width={D.pillW} height={D.pillH} rx={18} />
                  <text x={10} y={D.pillH / 2 + 5} className="ml-fg__depth">{gen}</text>
                  <text x={tx} y={D.pillH / 2 + 5} textAnchor="middle">{label}</text>
                  {rightBadge}
                  <title>{`${n.title}\n第 ${gen} 代 · 先修深度第 ${gen} 层${isCh ? `\n本章 ${n.count} 门课` : ''}${n.born.length ? '\n诞生：' + n.born.join('、') : ''}${n.uses.length ? '\n使用：' + n.uses.join('、') : ''}\n点击聚焦连通路径`}</title>
                </g>
              </g>
            </g>
          );
        })}
      </svg>
    );
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [D, toolMode]);

  /* [1] DOM 重建后：重建元素索引，恢复当前位置与着色（声明顺序先于其他 effect） */
  React.useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const els = elsRef.current;
    els.pos = Array.from(svg.querySelectorAll('.ml-tr__pos'));
    els.node = Array.from(svg.querySelectorAll('.ml-fg__node'));
    els.edge = Array.from(svg.querySelectorAll('.ml-tr__edge'));
    els.tedge = Array.from(svg.querySelectorAll('.ml-tr__tedge'));
    els.reveal = Array.from(svg.querySelectorAll('.ml-tr__reveal'));
    /* 缓存复位，强制重刷一次 class */
    [...els.pos, ...els.node, ...els.edge, ...els.tedge, ...els.reveal].forEach((el) => { el.__cls = undefined; });
    /* 模式刚切换时 curPos 可能是上一模式的数组（长度不符），回退到本模式原始位置 */
    const cur = curPosRef.current && curPosRef.current.length === N ? curPosRef.current : L.pos;
    curPosRef.current = cur;
    applyPositions(cur);
    paint(selRef.current != null && selRef.current < N ? selRef.current : null, null, null, false);
  }, [svgTree, applyPositions, paint, L, N]);

  /* [2] 选中变化：镜像 ref → 位移 → 动态边界 → fit */
  React.useEffect(() => {
    selRef.current = selS;
    const vis = selS == null ? null : buildVisible(L, selS);
    const { pos, bounds } = shiftPositions(L, vis);
    boundsRef.current = bounds;
    applyPositions(pos);
    if (selS != null && bounds) {
      const t = setTimeout(() => fitSel(), 80);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [selS, L, toolMode, applyPositions, fitSel]);

  /* [3] 悬停/选中/搜索/入场：重刷高亮（直接 DOM，不触发 SVG 重渲染） */
  React.useEffect(() => {
    paint(selS, hotS, selS == null ? hits : null, grown);
  }, [selS, hotS, hits, grown, paint]);

  /* fnRef 永远指向最新一轮闭包（供挂载期事件监听器调用） */
  React.useEffect(() => {
    fnRef.current = { applyView, zoomAt, focusRoot };
  });

  /* 挂载/切模式后定位到根节点 */
  React.useEffect(() => {
    focusRoot();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [D]);

  /* 全屏 */
  React.useEffect(() => {
    setFsOk(!!(document.fullscreenEnabled || document.webkitFullscreenEnabled));
    const onChg = () => {
      const doc = document;
      setIsFull(!!(doc.fullscreenElement || doc.webkitFullscreenElement));
      fnRef.current.applyView();
    };
    document.addEventListener('fullscreenchange', onChg);
    document.addEventListener('webkitfullscreenchange', onChg);
    return () => {
      document.removeEventListener('fullscreenchange', onChg);
      document.removeEventListener('webkitfullscreenchange', onChg);
    };
  }, []);

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

  /* 指针拖拽 + 双指捏合（监听器只挂一次，内部全部走 fnRef 调最新闭包） */
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
        if (pinchDist > 0 && d > 0) fnRef.current.zoomAt(mid.x, mid.y, d / pinchDist);
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
      fnRef.current.applyView();
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
      fnRef.current.zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-e.deltaY * 0.0016));
    };
    const onDbl = (e) => {
      const rect = vp.getBoundingClientRect();
      fnRef.current.zoomAt(e.clientX - rect.left, e.clientY - rect.top, 1.5);
    };
    const onResize = () => fnRef.current.applyView();
    vp.addEventListener('pointerdown', onDown);
    vp.addEventListener('pointermove', onMove);
    vp.addEventListener('pointerup', onUp);
    vp.addEventListener('pointercancel', onUp);
    vp.addEventListener('wheel', onWheel, { passive: false });
    vp.addEventListener('dblclick', onDbl);
    window.addEventListener('resize', onResize);
    return () => {
      vp.removeEventListener('pointerdown', onDown);
      vp.removeEventListener('pointermove', onMove);
      vp.removeEventListener('pointerup', onUp);
      vp.removeEventListener('pointercancel', onUp);
      vp.removeEventListener('wheel', onWheel);
      vp.removeEventListener('dblclick', onDbl);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  /* 切换模式：重置选中/悬停/搜索，重播入场动画 */
  React.useEffect(() => {
    setSel(null);
    setHot(null);
    setQ('');
    setToolMode(false);
    setGrown(false);
    curPosRef.current = D.L.pos;
    const t = setTimeout(() => setGrown(true), 30);
    return () => clearTimeout(t);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [mode]);

  /* 跳转定位：先按筛选后的位置直接平移缩放（不等 React），随后 setSel 触发位移/高亮 */
  const jumpTo = React.useCallback((i, targetK) => {
    const vis = buildVisible(L, i);
    const { bounds: sb } = shiftPositions(L, vis);
    const vp = vpRef.current;
    if (vp && sb) {
      const k = targetK != null ? Math.max(view.current.k, targetK) : view.current.k;
      view.current.k = k;
      const cx = (sb.minX + sb.maxX) / 2;
      const cy = (sb.minY + sb.maxY) / 2;
      view.current.x = vp.clientWidth / 2 - cx * k;
      view.current.y = Math.max(16, vp.clientHeight / 2 - cy * k);
      applyView(sb);
    }
    setSel(i);
    setHot(null);
  }, [L, applyView]);
  React.useEffect(() => { jumpToRef.current = jumpTo; }, [jumpTo]);

  const onSearchEnter = () => {
    if (!hitList.length) return;
    const i = hitList[hitPos.current % hitList.length];
    hitPos.current += 1;
    jumpTo(i, 1);
  };

  /* 信息面板数据 */
  const info = React.useMemo(() => {
    const focus = selS ?? hotS;
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
  }, [selS, hotS, D, L]);

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

        {selS != null && (
          <button type="button" className="button button--sm button--secondary" onClick={() => setSel(null)}>显示全部</button>
        )}

        <span className="ml-fg__meta">
          {N} {mode === 'chapter' ? '章' : '课'} · 先修 {D.edges.length} 条 · 最深 {L.maxL + 1} 层
        </span>
      </div>

      <div className="ml-tr__viewport" ref={vpRef} onMouseLeave={() => setHot(null)}>
        <div className="ml-tr__canvas" ref={canvasRef}>
          {svgTree}
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
