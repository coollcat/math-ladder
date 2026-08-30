import React from 'react';
import { useHistory } from '@docusaurus/router';
import { NODES, EDGES } from './full-graph-data';
import { allChapterGroups } from './data';
import { fitText } from './pillText';

/* 章级知识树：把全站课程的先修线聚合到各章上，
   长出一张「从算术长到前沿」的生长图，滚动进入视口时逐层长出。
   点击章节胶囊＝聚焦：只保留与它连通的先修/托起章，其余隐藏，
   可见各层横向重新居中；再点一次、点空白或「显示全部」恢复。双击进入本章。 */

const PILL_W = 148;
const PILL_H = 34;
const GAP_X = PILL_W + 14;
const LEVEL_H = 96;
const TOP_PAD = 26;
/* 生长动画的最大延迟上限，超过后清零逐节点 delay，筛选切换才能即时响应 */
const SETTLE_MS = 3200;

function buildChapterTree() {
  const groups = allChapterGroups();
  const chapters = groups.flatMap((g) => g.chapters);
  const idxOf = new Map(chapters.map((c, i) => [c.n, i]));

  const ces = new Set();
  EDGES.forEach(([a, b]) => {
    const A = NODES[a].ch;
    const B = NODES[b].ch;
    if (A !== B && idxOf.has(A) && idxOf.has(B)) ces.add(A + '>' + B);
  });
  const E = [...ces].map((s) => s.split('>').map(Number));

  /* 根 = 第 1 章「算术四则」（加法交换律的种子）；工具箱/附录不依赖数学课，挂根上当旁支 */
  const ROOT_CH = 1;
  const root = idxOf.get(ROOT_CH);
  const lvl = chapters.map(() => -1);
  lvl[root] = 0;
  const relax = () => {
    let changed = true;
    while (changed) {
      changed = false;
      for (const [A, B] of E) {
        const a = idxOf.get(A);
        const b = idxOf.get(B);
        if (b === root || a === undefined || b === undefined) continue;
        if (lvl[a] >= 0 && lvl[a] + 1 > lvl[b]) { lvl[b] = lvl[a] + 1; changed = true; }
      }
    }
  };
  relax();
  chapters.forEach((c, i) => { if (i !== root && lvl[i] === -1) lvl[i] = 1; });
  relax();

  /* 每章选一个「主父」：取深度恰少一层、且后代最多的先修章（其余边画成分支线） */
  const downCount = (() => {
    const out = chapters.map(() => 0);
    for (let pass = 0; pass < chapters.length; pass++) {
      for (const [A, B] of E) {
        const a = idxOf.get(A);
        const b = idxOf.get(B);
        if (a === undefined || b === undefined) continue;
        out[a] += 1 + out[b];
      }
    }
    return out;
  })();
  const preds = chapters.map(() => []);
  E.forEach(([A, B]) => {
    const a = idxOf.get(A);
    const b = idxOf.get(B);
    if (a !== undefined && b !== undefined) preds[b].push(a);
  });
  const parent = chapters.map(() => -1);
  chapters.forEach((_, i) => {
    if (i === root) return;
    const cand = preds[i].filter((p) => lvl[p] === lvl[i] - 1);
    const pool = cand.length ? cand : (preds[i].length ? [preds[i][0]] : [root]);
    parent[i] = pool.reduce((best, p) => (downCount[p] > downCount[best] ? p : best), pool[0]);
  });

  /* 布局：父下方排布 → 同层挤开 → 层内居中（与知识树页同一套算法） */
  const byL = new Map();
  chapters.forEach((_, i) => {
    if (!byL.has(lvl[i])) byL.set(lvl[i], []);
    byL.get(lvl[i]).push(i);
  });
  const pos = chapters.map(() => null);
  const maxL = Math.max(...lvl);
  for (let l = 0; l <= maxL; l++) {
    const list = byL.get(l) || [];
    list.forEach((ni) => {
      const px = parent[ni] >= 0 && pos[parent[ni]] ? pos[parent[ni]].x : 0;
      pos[ni] = { x: px, y: TOP_PAD + l * LEVEL_H };
    });
    const order = [...list].sort((a, b) => pos[a].x - pos[b].x);
    for (let pass = 0; pass < 3; pass++) {
      for (let k = 1; k < order.length; k++) {
        const prev = pos[order[k - 1]].x;
        if (pos[order[k]].x - prev < GAP_X) pos[order[k]].x = prev + GAP_X;
      }
      for (let k = order.length - 2; k >= 0; k--) {
        const next = pos[order[k + 1]].x;
        if (next - pos[order[k]].x < GAP_X) pos[order[k]].x = next - GAP_X;
      }
    }
    const lx = list.map((ni) => pos[ni].x);
    const mid = (Math.min(...lx) + Math.max(...lx)) / 2;
    list.forEach((ni) => { pos[ni].x -= mid; });
  }

  const xs = pos.map((p) => p.x);
  const minX = Math.min(...xs) - PILL_W / 2 - 8;
  const maxX = Math.max(...xs) + PILL_W / 2 + 8;

  /* 跨章边去重后的展示列表（带主干标记），供渲染与连通闭包共用 */
  const seen = new Set();
  const edges = [];
  E.forEach(([A, B]) => {
    const ia = idxOf.get(A);
    const ib = idxOf.get(B);
    const key = ia + '>' + ib;
    if (ia < 0 || ib < 0 || seen.has(key)) return;
    seen.add(key);
    edges.push({ a: ia, b: ib, trunk: parent[ib] === ia });
  });

  return {
    chapters,
    lvl,
    maxL,
    pos,
    parent,
    root,
    minX,
    width: maxX - minX,
    height: TOP_PAD + maxL * LEVEL_H + PILL_H / 2 + 12,
    edges,
  };
}

export default function HomeTree() {
  const T = React.useMemo(buildChapterTree, []);
  const wrapRef = React.useRef(null);
  const svgRef = React.useRef(null);
  const [grown, setGrown] = React.useState(false);
  const [settled, setSettled] = React.useState(false);
  const [sel, setSel] = React.useState(null);
  const history = useHistory();

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') { setGrown(true); return undefined; }
    const io = new IntersectionObserver(
      (entries) => entries.some((en) => en.isIntersecting) && setGrown(true),
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* 生长入场用逐节点延迟；动画收尾后清零延迟，之后的聚焦/恢复过渡即时生效 */
  React.useEffect(() => {
    if (!grown) return undefined;
    const t = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(t);
  }, [grown]);

  const replay = () => {
    setSel(null);
    setGrown(false);
    setSettled(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setGrown(true)));
  };

  /* 跨章邻接表：a 是 b 的先修章 */
  const upMap = React.useMemo(() => {
    const m = T.chapters.map(() => []);
    T.edges.forEach(({ a, b }) => m[b].push(a));
    return m;
  }, [T]);
  const downMap = React.useMemo(() => {
    const m = T.chapters.map(() => []);
    T.edges.forEach(({ a, b }) => m[a].push(b));
    return m;
  }, [T]);

  /* 选中章的全部先修（沿箭头向上）与全部托起（向下）闭包 */
  const closure = React.useMemo(() => {
    if (sel == null) return null;
    const grow = (start, map) => {
      const s = new Set([start]);
      const st = [start];
      while (st.length) {
        const v = st.pop();
        for (const w of map[v]) if (!s.has(w)) { s.add(w); st.push(w); }
      }
      return s;
    };
    return { up: grow(sel, upMap), down: grow(sel, downMap) };
  }, [sel, upMap, downMap]);

  /* 点击选中后，只保留与它连通的章节；其余全部隐藏 */
  const visible = React.useMemo(() => {
    if (sel == null || !closure) return null;
    const s = new Set([sel]);
    closure.up.forEach((v) => s.add(v));
    closure.down.forEach((v) => s.add(v));
    return s;
  }, [sel, closure]);

  /* 筛选后可见章节逐层重新居中：保持相对顺序，整体平移到中轴 */
  const shifted = React.useMemo(() => {
    if (!visible) return T.pos;
    const byD = new Map();
    T.chapters.forEach((_, i) => {
      if (!visible.has(i)) return;
      const d = T.lvl[i];
      if (!byD.has(d)) byD.set(d, []);
      byD.get(d).push(i);
    });
    const out = T.pos.map((p) => ({ x: p.x, y: p.y }));
    byD.forEach((list) => {
      const xs = list.map((i) => T.pos[i].x);
      const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
      list.forEach((i) => { out[i].x -= mid; });
    });
    return out;
  }, [visible, T]);

  const delayFor = (lvl, i) => (grown && !settled ? `${(lvl * 0.16 + (i % 9) * 0.035).toFixed(2)}s` : '0s');

  const edgeCls = ({ a, b, trunk }) => {
    let cls = 'ml-ht__edge' + (trunk ? '' : ' ml-ht__edge--branch');
    if (sel != null && visible) {
      if (!visible.has(a) || !visible.has(b)) return cls + ' is-eoff';
      const lu = closure.up.has(a) && closure.up.has(b);
      const ld = closure.down.has(a) && closure.down.has(b);
      if ((lu || ld) && (a === sel || b === sel)) cls += ' is-edirect';
      else if (lu) cls += ' is-eup';
      else cls += ' is-edown';
    }
    return cls;
  };

  const nodeCls = (i) => {
    if (sel == null || !visible) return '';
    if (!visible.has(i)) return ' is-off';
    if (i === sel) return ' is-hot';
    if (closure.up.has(i)) return ' is-up';
    return ' is-down';
  };

  const info = sel == null ? null : {
    n: T.chapters[sel],
    gen: T.lvl[sel] + 1,
    ups: closure.up.size - 1,
    downs: closure.down.size - 1,
  };

  return (
    <div className="ml-ht" ref={wrapRef}>
      <div className="ml-ht__stage">
        <svg
          ref={svgRef}
          viewBox={`${T.minX} 0 ${T.width} ${T.height}`}
          className={'ml-ht__svg' + (grown ? ' is-grown' : '')}
          role="img"
          aria-label="知识树动画：从算术四则开始，逐层生长出整座数学课程网络；点击章节可聚焦它的先修与托起关系"
          onClick={(e) => { if (e.target === svgRef.current) setSel(null); }}
        >
          {T.edges.map((e, k) => {
            const A = shifted[e.a];
            const B = shifted[e.b];
            const y1 = A.y + PILL_H / 2;
            const y2 = B.y - PILL_H / 2;
            const my = (y1 + y2) / 2;
            const d = A.x === B.x
              ? `M ${A.x} ${y1} L ${B.x} ${y2}`
              : `M ${A.x} ${y1} C ${A.x} ${my}, ${B.x} ${my}, ${B.x} ${y2}`;
            return (
              <path
                key={'e' + k}
                d={d}
                pathLength={1}
                className={edgeCls(e)}
                style={{ transitionDelay: delayFor(T.lvl[e.b], e.b) }}
              />
            );
          })}
          {T.chapters.map((c, i) => {
            const p = shifted[i];
            const label = fitText(c.short, PILL_W - 16 - (String(c.count).length > 1 ? 22 : 14));
            return (
              <g
                key={c.n}
                className="ml-ht__node"
                style={{ transform: `translate(${p.x - PILL_W / 2}px, ${p.y - PILL_H / 2}px)` }}
              >
                <g
                  className={'ml-ht__reveal' + (grown ? ' is-in' : '') + nodeCls(i)}
                  style={{ transitionDelay: delayFor(T.lvl[i], i) }}
                  onClick={() => setSel(sel === i ? null : i)}
                  onDoubleClick={() => history.push(c.to)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setSel(sel === i ? null : i); }}
                  role="button"
                  tabIndex={0}
                  aria-pressed={sel === i}
                >
                  <rect width={PILL_W} height={PILL_H} rx={17} />
                  <text x={PILL_W / 2 - 10} y={PILL_H / 2 + 5} textAnchor="middle">{label}</text>
                  <circle cx={PILL_W - 11} cy={PILL_H / 2} r={9.5} className="ml-ht__count-bg" />
                  <text x={PILL_W - 11} y={PILL_H / 2 + 4} textAnchor="middle" className="ml-ht__count">{c.count}</text>
                  <title>{`${c.title} · ${c.count} 门课\n第 ${T.lvl[i] + 1} 代——先修链最长要走 ${T.lvl[i]} 步\n点击聚焦血缘，双击进入本章`}</title>
                </g>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="ml-ht__bar">
        {info ? (
          <div className="ml-ht__info" role="status">
            <span className="ml-ht__legend">
              已聚焦 <strong>{info.n.title}</strong>
              <span className="ml-fg__pill">第 {info.gen} 代</span>
              <span className="ml-fg__pill ml-ht__pill--up">↑ 先修 {info.ups} 章</span>
              <span className="ml-fg__pill ml-ht__pill--down">↓ 托起 {info.downs} 章</span>
            </span>
            <span className="ml-ht__info-btns">
              <button type="button" className="button button--sm button--primary" onClick={() => history.push(info.n.to)}>
                进入本章 →
              </button>
              <button type="button" className="button button--sm button--secondary" onClick={() => setSel(null)}>
                显示全部
              </button>
            </span>
          </div>
        ) : (
          <>
            <span className="ml-ht__legend">
              <i className="ml-ht__dot ml-ht__dot--trunk" /> 主干先修
              <i className="ml-ht__dot ml-ht__dot--branch" /> 跨线支撑
              <span className="ml-ht__count-hint">圆圈数字＝该章课数；点击任意章节，只看它的先修与托起。</span>
            </span>
            <button type="button" className="button button--sm button--secondary" onClick={replay}>
              ↻ 重播生长
            </button>
          </>
        )}
      </div>
    </div>
  );
}
