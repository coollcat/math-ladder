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

/* 视口裁剪余量（屏幕像素）：视口四周多留这么多才算「在视野内」。
 * 留够余量，位移补间途中的节点不会被提前判成出界而突然消失。 */
const CULL_PAD = 600;

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
  /* 着色状态镜像：选中/悬停/搜索命中/入场（直接 DOM 路径读它，不触发渲染） */
  const stRef = React.useRef({ s: null, h: null, hits: null, grown: false });
  /* 视口裁剪状态：1 = 已用 display:none 摘出渲染树 */
  const cullRef = React.useRef({
    node: new Uint8Array(0), edge: new Uint8Array(0), tedge: new Uint8Array(0),
  });
  /* 悬停下标的镜像（事件委托里先比对再决定是否 setState） */
  const hotRef = React.useRef(-1);
  /* 平移/缩放的 rAF 合帧句柄 */
  const rafRef = React.useRef(0);

  /* =======================================================================
   * 直接 DOM：单元素绘制 + 视口裁剪
   * -----------------------------------------------------------------------
   * 性能（2026-09-02）：单元模式 805 颗胶囊 / 1125 条边一次性铺在几千像素见方的
   * 画布上，而默认视野只覆盖其中一小块。原来每次重绘都要为**全树**生成绘制指令，
   * 每次点击要动 2000 个元素。按视口裁剪后：
   *   ① 重绘只为可见元素生成绘制指令——屏外元素 display:none；
   *   ② display:none 上的 transition / animation 一并停掉：入场描画、
   *      位移补间、边的 d 补间不再为屏外元素空转（最贵的一处）；
   *   ③ 位置与着色的写入跳过被裁元素，回到视野时再补写。
   * 所有函数只读 ref + D/L，故整个对象在模式不变时是稳定引用。
   * ===================================================================== */
  const ops = React.useMemo(() => {
    const PW = D.pillW;
    const PH = D.pillH;
    const EDG = D.edges;
    const TED = D.useAgg;

    /* 选中判属集合按 sel 缓存：一次点击内上千次判属不必反复建 Set */
    let visCache = null;
    let visKey = -2;
    const visibleOf = (s) => {
      if (s == null) return null;
      if (visKey !== s) { visKey = s; visCache = buildVisible(L, s); }
      return visCache;
    };

    const clsNode = (i, s, h, hits, vis) => {
      let cls = 'ml-fg__node';
      if (s != null && vis) {
        if (!vis.has(i)) cls += ' is-off';
        else if (i === s) cls += ' is-hot';
        else if (L.anc[s][i]) cls += ' is-up';
        else cls += ' is-down';
      } else if (hits) {
        if (hits.has(i)) cls += ' is-search';
      } else if (h != null) {
        if (i === h) cls += ' is-hot';
        else if (L.anc[h][i]) cls += ' is-up';
        else if (L.desc[h][i]) cls += ' is-down';
      }
      return cls;
    };

    const clsEdge = (k, s, h, vis, grown) => {
      const a = EDG[k][0];
      const b = EDG[k][1];
      let cls = 'ml-tr__edge' + (L.trunk.has(k) ? '' : ' ml-tr__edge--branch');
      if (s != null && vis) {
        if (!vis.has(a) || !vis.has(b)) cls += ' is-off';
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
      return grown ? cls + ' is-in' : cls;
    };

    const clsTEdge = (k, s, h, vis, grown) => {
      const a = TED[k][0];
      const b = TED[k][1];
      let cls = 'ml-tr__tedge';
      if (s != null && vis && (!vis.has(a) || !vis.has(b))) cls += ' is-off';
      else if (h != null && (L.anc[h][a] || L.desc[h][a] || L.anc[h][b] || L.desc[h][b])) cls += ' is-up';
      return grown ? cls + ' is-in' : cls;
    };

    /* ---- 位置写入（被裁元素跳过，回视野时补写） ---- */
    const writePos = (i) => {
      const p = curPosRef.current[i];
      elsRef.current.pos[i].style.transform = `translate(${p.x - PW / 2}px, ${p.y - PH / 2}px)`;
    };
    const writeEdge = (k) => {
      const p = curPosRef.current;
      elsRef.current.edge[k].setAttribute('d', edgePath(p[EDG[k][0]], p[EDG[k][1]], PH, D.sag, D.sagCap));
    };
    const writeTEdge = (k) => {
      const p = curPosRef.current;
      elsRef.current.tedge[k].setAttribute('d', tedgePath(p[TED[k][0]], p[TED[k][1]], PW, D.sag, D.sagCap));
    };

    /* ---- 着色写入 ---- */
    const paintNode = (i) => {
      const el = elsRef.current.node[i];
      if (!el) return;
      const { s, h, hits } = stRef.current;
      setCls(el, clsNode(i, s, h, hits, visibleOf(s)));
    };
    const paintEdge = (k) => {
      const el = elsRef.current.edge[k];
      if (!el) return;
      const { s, h, grown } = stRef.current;
      setCls(el, clsEdge(k, s, h, visibleOf(s), grown));
    };
    const paintTEdge = (k) => {
      const el = elsRef.current.tedge[k];
      if (!el) return;
      const { s, h, grown } = stRef.current;
      setCls(el, clsTEdge(k, s, h, visibleOf(s), grown));
    };
    const paintReveal = (i) => {
      const el = elsRef.current.reveal[i];
      if (el) setCls(el, 'ml-tr__reveal' + (stRef.current.grown ? ' is-in' : ''));
    };

    let prevPos = null;
    let graceT = 0;
    const applyPositions = (pos) => {
      prevPos = curPosRef.current;
      curPosRef.current = pos;
      /* 位移补间（.ml-tr__pos 0.55s）期间，裁剪窗口取「旧位置 ∪ 新位置」：
         否则正在飞向屏外的胶囊会被立刻 display:none，看起来像凭空消失。 */
      graceT = Date.now() + 700;
      const els = elsRef.current;
      const c = cullRef.current;
      for (let i = 0; i < els.pos.length; i++) if (!c.node[i]) writePos(i);
      for (let k = 0; k < els.edge.length; k++) if (!c.edge[k]) writeEdge(k);
      for (let k = 0; k < els.tedge.length; k++) if (!c.tedge[k]) writeTEdge(k);
    };

    const paintAll = () => {
      const els = elsRef.current;
      const c = cullRef.current;
      const { s, h, hits, grown } = stRef.current;
      const vis = visibleOf(s);
      for (let i = 0; i < els.node.length; i++) {
        if (!c.node[i]) setCls(els.node[i], clsNode(i, s, h, hits, vis));
      }
      for (let k = 0; k < els.edge.length; k++) {
        if (!c.edge[k]) setCls(els.edge[k], clsEdge(k, s, h, vis, grown));
      }
      for (let k = 0; k < els.tedge.length; k++) {
        if (!c.tedge[k]) setCls(els.tedge[k], clsTEdge(k, s, h, vis, grown));
      }
      const rc = 'ml-tr__reveal' + (grown ? ' is-in' : '');
      for (let i = 0; i < els.reveal.length; i++) setCls(els.reveal[i], rc);
    };

    /* ---- 视口裁剪 ----
     * 元素坐标 → 屏幕：sx = v.x + ex * k，反解出可视区间；
     * 边的包围盒取两端点 ± 下垂余量（同层弧线最深 sagCap）。 */
    const updateCull = () => {
      const vp = vpRef.current;
      const els = elsRef.current;
      const c = cullRef.current;
      if (!vp || els.pos.length !== c.node.length) return;
      const v = view.current;
      const pos = curPosRef.current;
      const k = v.k;
      const pad = CULL_PAD / k;
      const x0 = -v.x / k - pad;
      const x1 = (vp.clientWidth - v.x) / k + pad;
      const y0 = -v.y / k - pad;
      const y1 = (vp.clientHeight - v.y) / k + pad;
      const hw = PW / 2 + 6;
      const hh = PH / 2 + 6;
      const sagPad = D.sagCap + PH / 2 + 8;
      /* 补间宽限期内：旧位置还在窗口里就不裁 */
      const old = (Date.now() < graceT && prevPos && prevPos.length === pos.length) ? prevPos : null;

      const nodeOut = (p) => {
        const ex = p.x - L.minX;
        return (ex + hw < x0 || ex - hw > x1 || p.y + hh < y0 || p.y - hh > y1) ? 1 : 0;
      };

      for (let i = 0; i < c.node.length; i++) {
        let hid = nodeOut(pos[i]);
        if (hid && old) hid = nodeOut(old[i]);
        if (c.node[i] === hid) continue;
        c.node[i] = hid;
        const el = els.pos[i];
        if (hid) el.style.display = 'none';
        else { el.style.display = ''; writePos(i); paintNode(i); paintReveal(i); }
      }
      /* 边的包围盒：两端点围起来的矩形，纵向再放宽一个下垂量（同层弧线最深 sagCap） */
      const edgeOut = (p, ia, ib) => {
        const pa = p[ia];
        const pb = p[ib];
        const ax = pa.x - L.minX;
        const bx = pb.x - L.minX;
        return (
          Math.max(ax, bx) + 8 < x0 || Math.min(ax, bx) - 8 > x1
          || Math.max(pa.y, pb.y) + sagPad < y0 || Math.min(pa.y, pb.y) - 8 > y1
        ) ? 1 : 0;
      };
      const cullList = (flags, pair, list, write, repaint) => {
        for (let k2 = 0; k2 < flags.length; k2++) {
          let hid = edgeOut(pos, pair[k2][0], pair[k2][1]);
          if (hid && old) hid = edgeOut(old, pair[k2][0], pair[k2][1]);
          if (flags[k2] === hid) continue;
          flags[k2] = hid;
          const el = list[k2];
          if (hid) el.style.display = 'none';
          else { el.style.display = ''; write(k2); repaint(k2); }
        }
      };
      cullList(c.edge, EDG, els.edge, writeEdge, paintEdge);
      cullList(c.tedge, TED, els.tedge, writeTEdge, paintTEdge);
    };

    return { applyPositions, paintAll, updateCull };
  }, [D, L]);

  /* ---- 坐标有两套，混用就会「点了不居中」 ----
   *   世界坐标：布局算出来的 p.x / p.y，x 以 0 为中轴，所以 L.minX 是负数；
   *   元素坐标：SVG 的 viewBox="minX 0 width height" 把世界坐标平移成
   *             [0, width] × [0, height]，画布的 CSS transform 作用在这一层。
   * 换算：元素 x = 世界 x − L.minX；元素 y = 世界 y（viewBox 的 y 起点是 0）。
   * 选中后 shiftPositions 给的 bounds 是**世界坐标**，必须先 toElem 再算中心，
   * 否则整块内容会偏出去 |L.minX| × k 像素——单元模式 minX ≈ −2500，一偏就飞了。 */
  const toElem = React.useCallback(
    (b) =>
      b
        ? { minX: b.minX - L.minX, maxX: b.maxX - L.minX, minY: b.minY, maxY: b.maxY }
        : { minX: 0, maxX: L.width, minY: 0, maxY: L.height },
    [L],
  );

  /* ---- 视图变换 ----
   * useBOverride：传入则用它的边界，否则选中态下用 boundsRef（选中子树）；
   * opts.center：世界坐标点，给了就把它摆到视口正中，否则按内容边界居中；
   * opts.noClamp：不把内容压回视口内（fitSel / jumpTo 用）——选中的连通路径
   *   常常比视口大，这时让它四周均匀溢出才是「居中」；拖动/缩放仍然要夹住，
   *   不然用户一拖就把画布甩没了。
   * 夹取的上界是 `pad − e.minX * k` 而不是 pad：内容在元素坐标里未必从 0 开始。 */
  const applyView = React.useCallback(
    (useBOverride, opts) => {
      const vp = vpRef.current;
      const canvas = canvasRef.current;
      if (!vp || !canvas) return;
      const v = view.current;
      const useB =
        useBOverride !== undefined ? useBOverride : selRef.current != null ? boundsRef.current : null;
      const e = toElem(useB);
      const W = (e.maxX - e.minX) * v.k;
      const H = (e.maxY - e.minY) * v.k;
      const vw = vp.clientWidth;
      const vh = vp.clientHeight;
      const pad = 24;
      const noClamp = !!(opts && opts.noClamp);
      const c = opts && opts.center;
      const cx = c ? c.x - L.minX : (e.minX + e.maxX) / 2;
      const cy = c ? c.y : (e.minY + e.maxY) / 2;
      if (W <= vw - pad * 2 || noClamp) {
        v.x = vw / 2 - cx * v.k;
      } else {
        v.x = Math.min(Math.max(v.x, vw - pad - e.maxX * v.k), pad - e.minX * v.k);
      }
      if (H <= vh - pad * 2 || noClamp) {
        v.y = vh / 2 - cy * v.k;
      } else {
        v.y = Math.min(Math.max(v.y, vh - pad - e.maxY * v.k), pad - e.minY * v.k);
      }
      canvas.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.k})`;
      canvas.style.visibility = 'visible';
    },
    [L, toElem],
  );

  /* 变换落盘 + 重算裁剪，成对调用（缩放/定位/拖动后视野变了，裁剪窗口随之变）。
   * scheduleView 把一帧内的多次 pointermove / wheel 合并成一次写入。 */
  const paintView = React.useCallback((b, opts) => {
    applyView(b, opts);
    ops.updateCull();
  }, [applyView, ops]);

  const scheduleView = React.useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      paintView();
    });
  }, [paintView]);

  const zoomAt = React.useCallback((px, py, factor, defer) => {
    const v = view.current;
    const k2 = Math.min(MAX_K, Math.max(MIN_K, v.k * factor));
    if (k2 === v.k) return;
    v.x = px - ((px - v.x) * k2) / v.k;
    v.y = py - ((py - v.y) * k2) / v.k;
    v.k = k2;
    if (defer) scheduleView();
    else paintView();
  }, [paintView, scheduleView]);

  const focusRoot = React.useCallback(() => {
    const vp = vpRef.current;
    if (!vp) return;
    view.current.k = 1;
    view.current.x = vp.clientWidth / 2 + L.minX * view.current.k;
    view.current.y = 16;
    paintView();
  }, [paintView, L]);

  const fitAll = React.useCallback(() => {
    const vp = vpRef.current;
    if (!vp) return;
    const k = Math.min(vp.clientWidth / L.width, vp.clientHeight / L.height, 1);
    view.current.k = Math.max(0.08, k);
    view.current.x = (vp.clientWidth - L.width * view.current.k) / 2;
    view.current.y = (vp.clientHeight - L.height * view.current.k) / 2;
    paintView();
  }, [paintView, L]);

  /* 选中后缩放到选中内容的实际边界（boundsRef 由选中 effect 维护） */
  const fitSel = React.useCallback(() => {
    const vp = vpRef.current;
    const b = boundsRef.current;
    if (!vp || !b) return;
    const pad = 40;
    const fitK = Math.min(
      (vp.clientWidth - pad * 2) / b.width,
      (vp.clientHeight - pad * 2) / b.height,
      1.5,
    );
    /* 缩放下限 0.42：连通路径常常纵贯全树，一路缩到 0.16 连字都看不清了。
       宁可只显示局部、也要保住「选中的那个正好在中间」——
       想看整树另有「全览」按钮，想看局部就滚轮。 */
    const k = Math.max(0.42, fitK);
    view.current.k = k;
    const fits =
      b.width * k <= vp.clientWidth - pad * 2 && b.height * k <= vp.clientHeight - pad * 2;
    /* 装得下 → 整块连通路径居中；装不下 → 把选中节点自己摆到视口中心 */
    const p = selRef.current != null ? curPosRef.current[selRef.current] : null;
    paintView(b, { center: fits || !p ? null : p, noClamp: true });
  }, [paintView]);

  /* ---- 直接 DOM：高亮着色（悬停/选中/搜索/入场） ----
   * 只写状态镜像再调用 ops.paintAll；被视口裁掉的元素不写（回视野时补写）。 */
  const paint = React.useCallback((s, h, hitsSet, isGrown) => {
    stRef.current = { s, h, hits: hitsSet, grown: isGrown };
    ops.paintAll();
  }, [ops]);

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
                  data-i={i}
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
    /* 缓存复位，强制重刷一次 class；裁剪状态与 display 一并复位
       （React 可能复用同一批 DOM 节点，残留的 display:none 会让新树缺块） */
    [...els.pos, ...els.node, ...els.edge, ...els.tedge, ...els.reveal].forEach((el) => { el.__cls = undefined; });
    [...els.pos, ...els.edge, ...els.tedge].forEach((el) => { el.style.display = ''; });
    cullRef.current = {
      node: new Uint8Array(els.pos.length),
      edge: new Uint8Array(els.edge.length),
      tedge: new Uint8Array(els.tedge.length),
    };
    /* 模式刚切换时 curPos 可能是上一模式的数组（长度不符），回退到本模式原始位置 */
    const cur = curPosRef.current && curPosRef.current.length === N ? curPosRef.current : L.pos;
    curPosRef.current = cur;
    ops.applyPositions(cur);
    paint(selRef.current != null && selRef.current < N ? selRef.current : null, null, null, false);
    ops.updateCull();
  }, [svgTree, ops, paint, L, N]);

  /* [2] 选中变化：镜像 ref → 位移 → 动态边界 → fit */
  React.useEffect(() => {
    selRef.current = selS;
    const vis = selS == null ? null : buildVisible(L, selS);
    const { pos, bounds } = shiftPositions(L, vis);
    boundsRef.current = bounds;
    ops.applyPositions(pos);
    ops.updateCull();
    const timers = [];
    if (selS != null && bounds) timers.push(setTimeout(() => fitSel(), 80));
    /* 位移补间（0.55s）走完后再收紧一次裁剪窗口 */
    timers.push(setTimeout(() => ops.updateCull(), 760));
    return () => timers.forEach(clearTimeout);
  }, [selS, L, toolMode, ops, fitSel]);

  /* [3] 悬停/选中/搜索/入场：重刷高亮（直接 DOM，不触发 SVG 重渲染） */
  React.useEffect(() => {
    paint(selS, hotS, selS == null ? hits : null, grown);
  }, [selS, hotS, hits, grown, paint]);

  /* fnRef 永远指向最新一轮闭包（供挂载期事件监听器调用） */
  React.useEffect(() => {
    fnRef.current = { applyView, paintView, scheduleView, zoomAt, focusRoot, ops };
  });

  /* 卸载时收掉未执行的合帧 */
  React.useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

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
      fnRef.current.paintView();
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
        if (pinchDist > 0 && d > 0) fnRef.current.zoomAt(mid.x, mid.y, d / pinchDist, true);
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
      fnRef.current.scheduleView();
    };
    const onUp = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchDist = 0;
      if (e.pointerId === dragRef.current.id) dragRef.current.id = -1;
      vp.classList.remove('is-grabbing');
    };
    /* 滚轮/捏合会一帧来好几个事件：合到 rAF 里只写一次 transform + 裁剪 */
    const onWheel = (e) => {
      e.preventDefault();
      const rect = vp.getBoundingClientRect();
      fnRef.current.zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-e.deltaY * 0.0016), true);
    };
    const onDbl = (e) => {
      const rect = vp.getBoundingClientRect();
      fnRef.current.zoomAt(e.clientX - rect.left, e.clientY - rect.top, 1.5);
    };
    const onResize = () => fnRef.current.paintView();
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
    hotRef.current = -1;
    setQ('');
    setToolMode(false);
    setGrown(false);
    curPosRef.current = D.L.pos;
    const t = setTimeout(() => setGrown(true), 30);
    return () => clearTimeout(t);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [mode]);

  /* ---- 节点交互：事件委托 ----
   * 原先每个胶囊挂 4 个 React 事件 props（单元模式 805×4 = 3220 个闭包，
   * 且 React 的 mouseenter/leave 要为每个节点走一遍合成事件路径）。
   * 改成在 svg 根上挂 4 个原生监听器，用 data-i 反查下标；
   * 悬停先比 hotRef，没换节点就不 setState。 */
  React.useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const idxOf = (t) => {
      const g = t && t.closest ? t.closest('.ml-fg__node') : null;
      if (!g) return -1;
      const i = Number(g.dataset.i);
      return Number.isNaN(i) ? -1 : i;
    };
    const toggle = (i) => {
      if (selRef.current === i) setSel(null);
      else jumpToRef.current(i);
    };
    const onClick = (e) => {
      if (dragRef.current.moved) return;
      const i = idxOf(e.target);
      /* 空白（svg 本身）＝取消聚焦 */
      if (i < 0) {
        if (e.target === e.currentTarget) setSel(null);
        return;
      }
      toggle(i);
    };
    const onOver = (e) => {
      const i = idxOf(e.target);
      /* 只在「进入胶囊」时更新，与原先的 onMouseEnter 口径一致：
         移到空白处仍保留上一条信息面板，离开整个视口才清除。 */
      if (i < 0 || i === hotRef.current) return;
      hotRef.current = i;
      setHot(i);
    };
    const onFocusIn = (e) => {
      const i = idxOf(e.target);
      if (i < 0 || i === hotRef.current) return;
      hotRef.current = i;
      setHot(i);
    };
    const onKey = (e) => {
      if (e.key !== 'Enter') return;
      const i = idxOf(e.target);
      if (i < 0) return;
      toggle(i);
    };
    svg.addEventListener('click', onClick);
    svg.addEventListener('mouseover', onOver);
    svg.addEventListener('focusin', onFocusIn);
    svg.addEventListener('keydown', onKey);
    return () => {
      svg.removeEventListener('click', onClick);
      svg.removeEventListener('mouseover', onOver);
      svg.removeEventListener('focusin', onFocusIn);
      svg.removeEventListener('keydown', onKey);
    };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [D]);

  /* 跳转定位：先按筛选后的位置直接平移缩放（不等 React），随后 setSel 触发位移/高亮 */
  const jumpTo = React.useCallback(
    (i, targetK) => {
      const vis = buildVisible(L, i);
      /* 注意要用**位移后**的坐标：筛选会把各层重新居中，节点位置会变 */
      const { pos, bounds: sb } = shiftPositions(L, vis);
      if (vpRef.current && sb) {
        /* 先把点中的这个摆到视口正中（不等 React），随后 setSel 触发的
           effect 会用 fitSel 再精确居中一次；两次走同一套换算。 */
        view.current.k = targetK != null ? Math.max(view.current.k, targetK) : view.current.k;
        paintView(sb, { center: pos[i], noClamp: true });
      }
      setSel(i);
      setHot(null);
      hotRef.current = -1;
    },
    [L, paintView],
  );
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

      <div
        className="ml-tr__viewport"
        ref={vpRef}
        onMouseLeave={() => { hotRef.current = -1; setHot(null); }}
      >
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
