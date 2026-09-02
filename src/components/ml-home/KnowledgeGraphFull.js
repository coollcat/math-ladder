/* =========================================================================
 * 知识图谱（/graph）：全站「泳道图」
 * -------------------------------------------------------------------------
 * 这张图画的是全站课程的**章级**依赖网络（按章节走，一颗胶囊就是一章）：
 *   泳道（横向一行）＝ 一卷（六卷；某卷还没开课就整条不画），
 *                      一卷章多就往下折多行，续行左侧只标「卷五（续）」；
 *                      每行放几章按容器宽度自适应，宽屏多放、窄屏少放，不横向滚动
 *   胶囊（一颗）    ＝ 一章（71 颗，胶囊左侧数字是章号，文字是章的 short）
 *   实线连线        ＝ 章级聚合先修边（复用 treeLayout 的 aggregateChapters：
 *                      把课级先修边折叠到章，跨章才保留并去重）
 *   虚线连线        ＝ 章级工具血缘边（把 USE_AGG 的课级工具流折叠到章、工具名合并去重），
 *                      由工具条上的「工具血缘层」开关控制显隐
 * 左侧泳道标签两行：上排「难度 N」（＝该卷所有课程的平均先修深度取整），
 *                   下排「卷一 · 数学地基」。
 *
 * 交互：搜索即时高亮 + 回车逐个定位；点胶囊只留与它连通的路径并自动重排；
 *       悬停看祖先（绿）/ 后代（橙）链；下方信息面板可进入本章；支持全屏。
 * 所有样式复用 src/css/home.css 里现成的 ml-fg__* / ml-tr__mode 类，不新增 CSS。
 *
 * 文案纪律：先修深度是度量不是编号 —— 只写「难度 N」「先修深度 N」，绝不写「第 N 层」；
 *           左侧标签不写课数。
 * ========================================================================= */

import React from 'react';
import { useHistory } from '@docusaurus/router';
import { NODES, EDGES, USE_AGG, DEPTH } from './full-graph-data';
import { allChapterGroups } from './data';
import { aggregateChapters } from './treeLayout';
import { fitText } from './pillText';

/* ---- 画布常量 ---- */
const GUTTER = 88; // 左侧标签栏宽
const PILL_W = 148; // 章胶囊宽
const PILL_H = 28; // 章胶囊高
const STEP = 158; // 水平步距
const BAND_H = 48; // 泳道高
const TOP = 16; // 顶部留白
const PAD_R = 24; // 右侧留白
const PAD_B = 20; // 底部留白
const PER_ROW_DEF = 6; // 还没量到容器宽度时的默认每行章数（首屏 / 服务端渲染用）

/* =========================================================================
 * 一、模块级数据（整站一份，加载时算一次）
 * ========================================================================= */

function buildData() {
  /* 卷（泳道）：allChapterGroups() 已按六卷分好，空卷直接丢掉 */
  const groups = allChapterGroups().filter((g) => g.chapters && g.chapters.length > 0);

  /* 章清单：摊平成一维，并记住每章落在第几条泳道 */
  const chapters = [];
  groups.forEach((g, bi) => {
    g.chapters.forEach((c) => chapters.push({ ...c, band: bi }));
  });
  const idxOfCh = new Map(chapters.map((c, i) => [c.n, i]));

  /* 章级先修边：直接复用 treeLayout 的聚合，不自己重写 */
  const chEdges = aggregateChapters(NODES, EDGES, chapters).edges;

  /* 章级工具血缘：把课级 USE_AGG 对折到章，工具名合并去重 */
  const toolMap = new Map();
  USE_AGG.forEach(([a, b, tools]) => {
    const A = NODES[a].ch;
    const B = NODES[b].ch;
    if (A === B || !idxOfCh.has(A) || !idxOfCh.has(B)) return;
    const key = `${A}>${B}`;
    if (!toolMap.has(key)) {
      toolMap.set(key, { a: idxOfCh.get(A), b: idxOfCh.get(B), tools: [] });
    }
    const entry = toolMap.get(key);
    tools.forEach((t) => {
      if (!entry.tools.includes(t)) entry.tools.push(t);
    });
  });
  const chToolEdges = [...toolMap.values()];

  /* 难度：章难度 = 该章课程的平均先修深度；卷难度 = 该卷课程的平均先修深度 */
  const chSum = new Map();
  const chNum = new Map();
  NODES.forEach((n, i) => {
    chSum.set(n.ch, (chSum.get(n.ch) || 0) + DEPTH[i]);
    chNum.set(n.ch, (chNum.get(n.ch) || 0) + 1);
  });
  const chDiff = new Map();
  chSum.forEach((s, ch) => chDiff.set(ch, Math.round(s / chNum.get(ch))));
  const volSum = groups.map(() => 0);
  const volNum = groups.map(() => 0);
  chapters.forEach((c) => {
    volSum[c.band] += chSum.get(c.n) || 0;
    volNum[c.band] += chNum.get(c.n) || 0;
  });
  const volDiff = volSum.map((s, i) => (volNum[i] ? Math.round(s / volNum[i]) : 0));

  /* 邻接表：章级前驱 / 后继 */
  const pred = chapters.map(() => []);
  const succ = chapters.map(() => []);
  chEdges.forEach(([a, b]) => {
    pred[b].push(a);
    succ[a].push(b);
  });

  return { groups, chapters, chEdges, chToolEdges, chDiff, volDiff, pred, succ };
}

const DATA = buildData();

/* =========================================================================
 * 二、布局
 * ========================================================================= */

/**
 * 把章按「卷」切成一行行。
 * 各卷的章数差得离谱（卷五 25 章、卷六 4 章），一行一卷的话会拉出一条巨长的泳道
 * 配一堆短泳道，既难看又难比；而写死每行章数又会在窄屏上横向溢出。
 * 所以：每行放 perRow 章（perRow 由容器宽度算出来），放不下的往下折一行，
 * 折出来的行还是同一卷（左侧只标「卷五（续）」）。
 * @param {?Set<number>} visible 只排这些章；传 null 表示全量
 * @param {number} perRow 每行最多几章
 */
function buildRows(visible, perRow) {
  const rows = [];
  DATA.groups.forEach((g, bi) => {
    const list = [];
    DATA.chapters.forEach((c, i) => {
      if (c.band !== bi) return;
      if (visible && !visible.has(i)) return;
      list.push(i);
    });
    /* 整卷都被筛掉了就别占行 */
    if (!list.length) return;
    for (let k = 0; k < list.length; k += perRow) {
      rows.push({ band: bi, cont: k > 0, list: list.slice(k, k + perRow) });
    }
  });
  return rows;
}

/**
 * @param {?Set<number>} visible 只排这些章
 * @param {number} perRow 每行最多几章
 * @param {number} availW 容器可用宽度（px）；画布至少这么宽，免得章少时被拉大变形
 */
function layoutRows(visible, perRow, availW) {
  let rows = buildRows(visible, perRow);
  /* 筛完一行都不剩就退回全量，免得画布塌了 */
  if (!rows.length) rows = buildRows(null, perRow);
  const pos = DATA.chapters.map(() => ({ cx: 0, cy: 0 }));
  let maxCols = 1;
  rows.forEach((r, row) => {
    maxCols = Math.max(maxCols, r.list.length);
    r.list.forEach((ci, k) => {
      pos[ci] = { cx: GUTTER + k * STEP + PILL_W / 2, cy: TOP + row * BAND_H + BAND_H / 2 };
    });
  });
  return {
    pos,
    rows,
    width: Math.max(GUTTER + maxCols * STEP + PAD_R, availW || 0),
    height: TOP + rows.length * BAND_H + PAD_B,
  };
}

/* 首屏 / 服务端渲染用的兜底布局（还没量到宽度） */
const L_DEF = layoutRows(null, PER_ROW_DEF, 0);

/* 连线：同泳道走一段下弧，跨泳道走 C 曲线 */
function edgePath(A, B) {
  if (A.cy === B.cy) {
    const mid = (A.cx + B.cx) / 2;
    return `M ${A.cx} ${A.cy + PILL_H / 2} Q ${mid} ${A.cy + PILL_H / 2 + 11}, ${B.cx} ${B.cy - PILL_H / 2}`;
  }
  const mx = (A.cx + B.cx) / 2;
  const bow = Math.max(PILL_H / 2 + 5, (B.cy - A.cy) * 0.38);
  return `M ${A.cx} ${A.cy + PILL_H / 2} C ${mx} ${A.cy + bow}, ${mx} ${B.cy - bow}, ${B.cx} ${B.cy - PILL_H / 2}`;
}

/* 沿邻接表从 start 走闭包（有环也不会死循环） */
function closureOf(start, adj) {
  const seen = new Set([start]);
  const stack = [start];
  while (stack.length) {
    const v = stack.pop();
    for (const w of adj[v]) {
      if (!seen.has(w)) {
        seen.add(w);
        stack.push(w);
      }
    }
  }
  return seen;
}

/* =========================================================================
 * 三、组件
 * ========================================================================= */

export default function KnowledgeGraphFull() {
  const [sel, setSel] = React.useState(null); // 悬停/聚焦的章
  const [picked, setPicked] = React.useState(null); // 点选筛选的章
  const [q, setQ] = React.useState('');
  const [toolMode, setToolMode] = React.useState(false);
  const [revealed, setRevealed] = React.useState(() => new Set());
  const [fsOk, setFsOk] = React.useState(false);
  const [isFull, setIsFull] = React.useState(false);
  const wrapRef = React.useRef(null);
  const history = useHistory();

  /* 量容器宽度：每行放几章由它决定 —— 宽屏多放、窄屏少放，永远不横向滚动。
     量到之前（首屏 / 服务端渲染的静态 HTML）先按兜底宽度排，此时关掉位置过渡，
     免得 hydrate 后从兜底布局滑到真实布局。 */
  const useIsoEffect = typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;
  const [box, setBox] = React.useState({ w: 0, ready: false });
  useIsoEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const apply = () =>
      setBox((p) => (p.ready && p.w === el.clientWidth ? p : { w: el.clientWidth, ready: true }));
    apply();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', apply);
      return () => window.removeEventListener('resize', apply);
    }
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* 每行章数：扣掉左侧标签栏和右侧留白后，能塞几颗就塞几颗（至少 2） */
  const perRow = React.useMemo(
    () => (box.w ? Math.max(2, Math.floor((box.w - GUTTER - PAD_R) / STEP)) : PER_ROW_DEF),
    [box.w],
  );

  const L_FULL = React.useMemo(() => layoutRows(null, perRow, box.w), [perRow, box.w]);

  /* 全屏 */
  React.useEffect(() => {
    setFsOk(!!(document.fullscreenEnabled || document.webkitFullscreenEnabled));
    const onChg = () => setIsFull(!!(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener('fullscreenchange', onChg);
    document.addEventListener('webkitfullscreenchange', onChg);
    return () => {
      document.removeEventListener('fullscreenchange', onChg);
      document.removeEventListener('webkitfullscreenchange', onChg);
    };
  }, []);

  const toggleFull = () => {
    const el = wrapRef.current;
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

  /* 入场动画：节点/连线滚进视口后才描画 */
  React.useEffect(() => {
    const el = document.querySelector('.ml-fg__svg');
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      const all = new Set();
      el.querySelectorAll('[data-rid]').forEach((n) => all.add(n.getAttribute('data-rid')));
      setRevealed(all);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        const ids = entries.filter((e) => e.isIntersecting).map((e) => e.target.getAttribute('data-rid'));
        if (ids.length) {
          setRevealed((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => next.add(id));
            return next;
          });
        }
      },
      { rootMargin: '0px 0px -6% 0px' },
    );
    el.querySelectorAll('[data-rid]').forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  /* 错峰延迟：按泳道自上而下 + 泳道内从左到右（泳道指折行后的行，不是卷）。
     用兜底布局算，宽度变了也不重算，省得动画被反复打断 */
  const revealDelay = React.useMemo(() => {
    const rowOf = new Map();
    L_DEF.rows.forEach((r, row) => r.list.forEach((ci) => rowOf.set(ci, row)));
    const out = DATA.chapters.map(() => '0s');
    DATA.chapters.forEach((c, i) => {
      const row = rowOf.get(i) ?? 0;
      const col = Math.round((L_DEF.pos[i].cx - GUTTER - PILL_W / 2) / STEP);
      out[i] = `${Math.min(row * 0.05 + col * 0.04, 0.9).toFixed(3)}s`;
    });
    return out;
  }, []);

  /* 搜索命中 */
  const ql = q.trim().toLowerCase();
  const hits = React.useMemo(() => {
    if (!ql) return null;
    return new Set(
      DATA.chapters
        .map((c, i) => (c.title.toLowerCase().includes(ql) || String(c.n) === ql ? i : -1))
        .filter((i) => i >= 0),
    );
  }, [ql]);

  /* 悬停闭包（上下游高亮） */
  const hoverSets = React.useMemo(() => {
    if (sel == null) return null;
    return { up: closureOf(sel, DATA.pred), down: closureOf(sel, DATA.succ) };
  }, [sel]);

  /* 点选筛选：祖先 ∪ 后代 ∪ 自身 */
  const pickedSets = React.useMemo(() => {
    if (picked == null) return null;
    const up = closureOf(picked, DATA.pred);
    const down = closureOf(picked, DATA.succ);
    const set = new Set([picked]);
    up.forEach((v) => set.add(v));
    down.forEach((v) => set.add(v));
    return { up, down, set };
  }, [picked]);

  /* 筛选后按同样的每行章数重排：只留可见的章并向左压实，空掉的行撤掉、剩下的往上靠 */
  const L = React.useMemo(
    () => (pickedSets ? layoutRows(pickedSets.set, perRow, box.w) : L_FULL),
    [pickedSets, perRow, box.w, L_FULL],
  );

  const nodeCls = (i) => {
    if (hits && hits.has(i)) return ' is-search';
    if (pickedSets) {
      if (!pickedSets.set.has(i)) return ' is-off';
      if (i === picked) return ' is-hot';
      if (pickedSets.up.has(i)) return ' is-up';
      return ' is-down';
    }
    if (!hoverSets) return '';
    if (i === sel) return ' is-hot';
    if (hoverSets.up.has(i)) return ' is-up';
    if (hoverSets.down.has(i)) return ' is-down';
    return ' is-dim2';
  };

  /* 信息面板：优先点选，其次悬停 */
  const focus = picked ?? sel;
  const info =
    focus == null
      ? null
      : {
          ch: DATA.chapters[focus],
          diff: DATA.chDiff.get(DATA.chapters[focus].n),
          up: DATA.pred[focus].length,
          down: DATA.succ[focus].length,
        };

  const enterChapter = () => {
    if (info) history.push(info.ch.to);
  };

  return (
    <div>
      <div className="ml-fg__bar">
        <input
          className="ml-fg__search"
          placeholder="搜索章节：微积分 / 概率 / 傅里叶…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || !hits || !hits.size) return;
            const first = [...hits][0];
            setPicked(first);
            setSel(first);
          }}
        />
        <label className="ml-fg__chip">
          <input type="checkbox" checked={toolMode} onChange={(e) => setToolMode(e.target.checked)} /> 工具血缘层
        </label>
        {(picked != null || sel != null || ql) && (
          <button
            className="button button--sm button--secondary"
            onClick={() => {
              setPicked(null);
              setSel(null);
              setQ('');
            }}
          >
            {picked != null ? '显示全部' : '清除高亮'}
          </button>
        )}
        {fsOk && (
          <button className="button button--sm button--secondary" onClick={toggleFull}>
            ⛶ {isFull ? '退出全屏' : '全屏'}
          </button>
        )}
        <span className="ml-fg__meta">
          {`${DATA.groups.length} 卷 · ${DATA.chapters.length} 章 · 章级先修 ${DATA.chEdges.length} 条 · 章级血缘 ${DATA.chToolEdges.length} 条`}
        </span>
      </div>

      <div className="ml-fg__wrap" ref={wrapRef}>
        <svg
          viewBox={`0 0 ${L.width} ${L.height}`}
          style={{ minWidth: L.width }}
          className="ml-fg__svg"
          onClick={() => setPicked(null)}
        >
          {/* 章级先修边 */}
          {DATA.chEdges.map(([a, b], k) => {
            const A = L.pos[a];
            const B = L.pos[b];
            let cls = 'ml-fg__edge';
            if (pickedSets) {
              if (!pickedSets.set.has(a) || !pickedSets.set.has(b)) cls += ' is-off';
              else if (pickedSets.up.has(a) && pickedSets.up.has(b)) cls += ' is-up';
              else cls += ' is-down';
            } else if (hoverSets) {
              if (hoverSets.up.has(a) && hoverSets.up.has(b)) cls += ' is-up';
              else if (hoverSets.down.has(a) && hoverSets.down.has(b)) cls += ' is-down';
              else cls += ' is-dim2';
            }
            return (
              <path
                key={`e${k}`}
                data-rid={`e${k}`}
                d={edgePath(A, B)}
                pathLength={1}
                className={cls + (revealed.has(`e${k}`) ? ' is-in' : '')}
                style={{ '--rvd': revealed.has(`e${k}`) ? revealDelay[b] : undefined }}
              />
            );
          })}

          {/* 章级工具血缘边 */}
          {toolMode &&
            DATA.chToolEdges.map(({ a, b, tools }, k) => {
              const A = L.pos[a];
              const B = L.pos[b];
              let cls = 'ml-fg__tedge';
              if (pickedSets && (!pickedSets.set.has(a) || !pickedSets.set.has(b))) cls += ' is-off';
              return (
                <path key={`t${k}`} d={edgePath(A, B)} className={cls}>
                  <title>{`工具血缘：${tools.join('、')}`}</title>
                </path>
              );
            })}

          {/* 左侧泳道标签：首行上排难度、下排卷名；折行只标「卷五（续）」 */}
          {L.rows.map((r, row) => {
            const cy = TOP + row * BAND_H + BAND_H / 2;
            const g = DATA.groups[r.band];
            return (
              <g key={`band-${r.band}-${row}`}>
                {!r.cont && (
                  <text x={6} y={cy - 2} className="ml-fg__band">{`难度 ${DATA.volDiff[r.band]}`}</text>
                )}
                <text x={6} y={cy + 11} className="ml-fg__bandsub">
                  {r.cont ? `${g.n}（续）` : `${g.n} · ${g.title}`}
                </text>
              </g>
            );
          })}

          {/* 章胶囊 */}
          {DATA.chapters.map((c, i) => {
            const p = L.pos[i];
            const padL = c.n >= 10 ? 25 : 18;
            const label = fitText(c.short, PILL_W - padL - 10);
            return (
              <g
                key={c.id ?? `ch-${c.n}`}
                className={'ml-fg__pos ml-fg__node' + nodeCls(i)}
                style={{
                  transform: `translate(${p.cx - PILL_W / 2}px, ${p.cy - PILL_H / 2}px)`,
                  /* 没量到宽度前不要过渡，否则首屏会滑一下 */
                  transition: box.ready ? undefined : 'none',
                }}
              >
                <g
                  data-rid={`n${i}`}
                  className={'ml-fg__rv' + (revealed.has(`n${i}`) ? ' is-in' : '')}
                  style={{ transitionDelay: revealed.has(`n${i}`) ? revealDelay[i] : '0s' }}
                  onMouseEnter={() => setSel(i)}
                  onFocus={() => setSel(i)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPicked(picked === i ? null : i);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setPicked(picked === i ? null : i);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <rect width={PILL_W} height={PILL_H} rx={15} />
                  <text x={10} y={PILL_H / 2 + 4} className="ml-fg__depth">{c.n}</text>
                  <text x={(padL + PILL_W - 10) / 2} y={PILL_H / 2 + 4} textAnchor="middle">{label}</text>
                  <title>
                    {`${c.title}\n难度 ${DATA.chDiff.get(c.n) ?? '—'}\n点击只看与它连通的章，点空白恢复；进章用下方面板`}
                  </title>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {isFull && (
        <button
          type="button"
          className="button button--sm button--secondary ml-fg__fs-exit"
          onClick={toggleFull}
        >
          ⤡ 退出全屏（Esc）
        </button>
      )}

      <div className={'ml-fg__panel' + (info ? ' is-active' : '')}>
        {info ? (
          <>
            <div className="ml-fg__panel-head">
              <strong>{info.ch.title}</strong>
              <button type="button" className="button button--sm button--primary" onClick={enterChapter}>
                进入本章 →
              </button>
              <span className="ml-fg__pill">{`难度 ${info.diff ?? '—'}`}</span>
              <span className="ml-fg__pill">{`第 ${info.ch.n} 章`}</span>
            </div>
            <p className="ml-fg__line">{`先修章 ${info.up} 章　·　后续章 ${info.down} 章`}</p>
          </>
        ) : (
          <p className="ml-fg__line">
            一条泳道是一卷，一颗胶囊是一章，胶囊上的数字是章号，左侧写的是这一卷的难度（平均先修深度）。
            悬停胶囊：绿=上游先修章，橙=下游后续章；点胶囊只保留与它连通的路径并自动重排，点空白恢复；
            勾「工具血缘层」看工具在章之间的流向。
          </p>
        )}
      </div>
    </div>
  );
}
