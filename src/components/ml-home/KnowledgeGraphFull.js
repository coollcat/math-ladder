import React from 'react';
import { useHistory } from '@docusaurus/router';
import { NODES, EDGES, USE_AGG, DEPTH } from './full-graph-data';
import { CHAPTERS } from './data';
import { fitText } from './pillText';

const TOOL_COUNT = new Set(USE_AGG.flatMap(([, , tools]) => tools)).size;
const GUTTER = 88;
const PILL_W = 148;
const PILL_H = 28;
const STEP = 158;
const BAND_H = 48;
const TOP = 16;

const UNIQUE_CHAPTERS = [...new Set(NODES.map((node) => node.ch))].sort((a, b) => a - b);
const ROW_BY_CH = new Map(UNIQUE_CHAPTERS.map((chapter, row) => [chapter, row]));
const CHAPTER_INFO = new Map(CHAPTERS.map((chapter) => [Number(chapter.n), chapter]));
const CH_ROWS = UNIQUE_CHAPTERS.map((chapter) => {
  const info = CHAPTER_INFO.get(chapter);
  return { chapter, row: ROW_BY_CH.get(chapter), name: info ? info.short : `${chapter} 章` };
});

function layout() {
  const byCh = new Map();
  NODES.forEach((n, i) => {
    if (!byCh.has(n.ch)) byCh.set(n.ch, []);
    byCh.get(n.ch).push(i);
  });
  const out = NODES.map((n, i) => ({
    cx: GUTTER + byCh.get(n.ch).indexOf(i) * STEP + PILL_W / 2,
    cy: TOP + ROW_BY_CH.get(n.ch) * BAND_H + BAND_H / 2,
  }));
  return {
    pos: out,
    width: GUTTER + Math.max(...[...byCh.values()].map(r => r.length)) * STEP + 12,
    height: TOP + UNIQUE_CHAPTERS.length * BAND_H,
  };
}

function longestChain(sel, parents) {
  if (sel == null) return [];
  const chain = [sel];
  let cur = sel;
  while (true) {
    const ps = (parents[cur] || []).filter((p) => DEPTH[p] === DEPTH[cur] - 1);
    if (!ps.length) break;
    cur = ps[0];
    chain.unshift(cur);
  }
  return chain;
}

/* 闭包生长：沿 map 从 start 走到全部可达节点 */
function grow(start, map) {
  const s = new Set([start]);
  const st = [start];
  while (st.length) {
    const v = st.pop();
    for (const w of map[v]) if (!s.has(w)) { s.add(w); st.push(w); }
  }
  return s;
}

export default function KnowledgeGraphFull() {
  const [sel, setSel] = React.useState(null);
  const [toolMode, setToolMode] = React.useState(false);
  const [depthColor, setDepthColor] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [revealed, setRevealed] = React.useState(() => new Set());
  const [fsOk, setFsOk] = React.useState(false);
  const [isFull, setIsFull] = React.useState(false);
  const wrapRef = React.useRef(null);
  const history = useHistory();

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

  const L = React.useMemo(layout, []);

  /* 入场动画：节点按泳道从左到右错峰浮现，连线随目标节点一起描画 */
  React.useEffect(() => {
    const el = document.querySelector('.ml-fg__svg');
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      const s = new Set();
      el.querySelectorAll('[data-rid]').forEach((n) => s.add(n.getAttribute('data-rid')));
      setRevealed(s);
      return undefined;
    }
    const io = new IntersectionObserver((entries) => {
      const ids = entries.filter((en) => en.isIntersecting).map((en) => en.target.getAttribute('data-rid'));
      if (ids.length) setRevealed((prev) => { const s = new Set(prev); ids.forEach((id) => s.add(id)); return s; });
    }, { rootMargin: '0px 0px -6% 0px' });
    el.querySelectorAll('[data-rid]').forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  const revealDelay = React.useMemo(() => {
    const byRow = new Map();
    L.pos.forEach((p, i) => {
      const row = NODES[i].ch;
      if (!byRow.has(row)) byRow.set(row, []);
      byRow.get(row).push(i);
    });
    const out = NODES.map(() => '0s');
    byRow.forEach((list) => {
      [...list]
        .sort((a, b) => L.pos[a].cx - L.pos[b].cx)
        .forEach((i, k) => { out[i] = `${Math.min(k * 0.04, 0.55).toFixed(3)}s`; });
    });
    return out;
  }, [L]);

  const upMap = React.useMemo(() => { const m = NODES.map(() => []); EDGES.forEach(([a, b]) => m[b].push(a)); return m; }, []);
  const downMap = React.useMemo(() => { const m = NODES.map(() => []); EDGES.forEach(([a, b]) => m[a].push(b)); return m; }, []);
  const fan = React.useMemo(() => {
    const inc = new Map();
    const out = new Map();
    EDGES.forEach(([a, b]) => {
      if (!inc.has(b)) inc.set(b, []);
      if (!out.has(a)) out.set(a, []);
      inc.get(b).push(a);
      out.get(a).push(b);
    });
    const off = new Map();
    EDGES.forEach(([a, b]) => {
      const ii = inc.get(b).indexOf(a);
      const oi = out.get(a).indexOf(b);
      const fi = (ii - (inc.get(b).length - 1) / 2) * 10;
      const fo = (oi - (out.get(a).length - 1) / 2) * 10;
      off.set(a + '>' + b, Math.max(-22, Math.min(22, (fi + fo) / 2)));
    });
    return off;
  }, []);

  const closure = React.useMemo(() => {
    if (sel == null) return null;
    return { up: grow(sel, upMap), down: grow(sel, downMap) };
  }, [sel]);

  /* 点击筛选：picked 节点的祖先链+后代链保留，其余隐藏并压实重排 */
  const [picked, setPicked] = React.useState(null);
  const pv = React.useMemo(() => {
    if (picked == null) return null;
    const up = grow(picked, upMap);
    const down = grow(picked, downMap);
    const set = new Set([picked]);
    up.forEach((v) => set.add(v));
    down.forEach((v) => set.add(v));
    return { up, down, set };
  }, [picked, upMap, downMap]);

  const ql = q.trim().toLowerCase();
  const hits = React.useMemo(() => {
    if (!ql) return null;
    return new Set(NODES.map((n, i) => (n.title.toLowerCase().includes(ql) || n.id.includes(ql)) ? i : -1).filter(i => i >= 0));
  }, [ql]);

  /* 筛选模式下的自动重排：每条泳道只保留可见节点，按原顺序向左压实 */
  const L2 = React.useMemo(() => {
    if (!pv) return L;
    const byRow = new Map();
    NODES.forEach((n, i) => {
      if (!pv.set.has(i)) return;
      if (!byRow.has(n.ch)) byRow.set(n.ch, []);
      byRow.get(n.ch).push(i);
    });
    const pos = NODES.map((_, i) => ({ cx: L.pos[i].cx, cy: L.pos[i].cy }));
    let maxX = GUTTER + 4 * STEP;
    byRow.forEach((list) => {
      list.sort((a, b) => L.pos[a].cx - L.pos[b].cx);
      list.forEach((i, k) => {
        pos[i] = { cx: GUTTER + k * STEP + PILL_W / 2, cy: L.pos[i].cy };
      });
      maxX = Math.max(maxX, GUTTER + list.length * STEP + 12);
    });
    return { pos, width: maxX, height: L.height };
  }, [L, pv]);

  const nodeCls = (i) => {
    if (hits && hits.has(i)) return ' is-search';
    if (pv) {
      if (!pv.set.has(i)) return ' is-off';
      if (i === picked) return ' is-hot';
      if (pv.up.has(i)) return ' is-up';
      return ' is-down';
    }
    if (!closure) return depthColor ? ' ' + 'd' + ((DEPTH[i] - 1) % 6 + 1) : '';
    if (i === sel) return ' is-hot';
    if (closure.up.has(i)) return ' is-up';
    if (closure.down.has(i)) return ' is-down';
    return ' is-dim2';
  };

  /* 面板优先展示点选的节点；没有点选时跟随悬停 */
  const focus = picked ?? sel;
  const info = focus == null ? null : (() => {
    const n = NODES[focus];
    const chain = longestChain(focus, upMap);
    const bornNames = n.born;
    const useList = n.uses;
    const usedBy = USE_AGG.filter(([a]) => a === focus).length;
    return { n, chain, bornNames, useList, usedBy };
  })();

  return (
    <div>
      <div className="ml-fg__bar">
        <input
          className="ml-fg__search"
          placeholder="搜索课程：勾股 / 欧拉 / 黎曼…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && hits && hits.size) {
              const first = [...hits][0];
              setPicked(first);
              setSel(first);
            }
          }}
        />
        <label className="ml-fg__chip">
          <input type="checkbox" checked={toolMode} onChange={(e) => setToolMode(e.target.checked)} /> 工具血缘层
        </label>
        <label className="ml-fg__chip">
          <input type="checkbox" checked={depthColor} onChange={(e) => setDepthColor(e.target.checked)} /> 按先修深度着色
        </label>
        {(picked != null || sel != null || ql) && (
          <button
            className="button button--sm button--secondary"
            onClick={() => { setPicked(null); setSel(null); setQ(''); }}
          >
            {picked != null ? '显示全部' : '清除高亮'}
          </button>
        )}
        {fsOk && (
          <button className="button button--sm button--secondary" onClick={toggleFull}>
            ⛶ {isFull ? '退出全屏' : '全屏'}
          </button>
        )}
        <span className="ml-fg__meta">{NODES.length} 课 · 先修 {EDGES.length} 条 · 血缘 {USE_AGG.length} 条 · 最深 {Math.max(...DEPTH)} 层</span>
      </div>

      <div className="ml-fg__wrap" ref={wrapRef}>
        <svg viewBox={`0 0 ${L2.width} ${L2.height}`} style={{ minWidth: L2.width }} className="ml-fg__svg" onClick={() => setPicked(null)}>
          {EDGES.map(([a, b], k) => {
            const A = L2.pos[a]; const B = L2.pos[b];
            let cls = 'ml-fg__edge';
            if (pv) {
              if (!pv.set.has(a) || !pv.set.has(b)) cls += ' is-off';
              else {
                const lu = pv.up.has(a) && pv.up.has(b);
                const ld = pv.down.has(a) && pv.down.has(b);
                if ((lu || ld) && (a === picked || b === picked)) cls += ' is-direct';
                else if (lu) cls += ' is-up';
                else cls += ' is-down';
              }
            } else if (closure) {
              const lu = closure.up.has(a) && closure.up.has(b);
              const ld = closure.down.has(a) && closure.down.has(b);
              if ((lu || ld) && (a === sel || b === sel)) cls += ' is-direct';
              else if (lu) cls += ' is-up';
              else if (ld) cls += ' is-down';
              else cls += ' is-dim2';
            }
            const off = fan.get(a + '>' + b) || 0;
            let d;
            if (A.cy === B.cy) {
              const mid = (A.cx + B.cx) / 2;
              d = `M ${A.cx} ${A.cy + PILL_H / 2} Q ${mid} ${A.cy + PILL_H / 2 + 11}, ${B.cx} ${B.cy - PILL_H / 2}`;
            } else {
              const mx = (A.cx + B.cx) / 2 + off;
              const bow = Math.max(PILL_H / 2 + 5, (B.cy - A.cy) * 0.38);
              d = `M ${A.cx} ${A.cy + PILL_H / 2} C ${mx} ${A.cy + bow}, ${mx} ${B.cy - bow}, ${B.cx} ${B.cy - PILL_H / 2}`;
            }
            return (
              <path
                key={'e' + k}
                data-rid={'e' + k}
                d={d}
                pathLength={1}
                className={cls + (revealed.has('e' + k) ? ' is-in' : '')}
                style={{ '--rvd': revealed.has('e' + k) ? revealDelay[b] : undefined }}
              />
            );
          })}
          {toolMode && USE_AGG.map(([a, b, tools], k) => {
            const A = L2.pos[a]; const B = L2.pos[b];
            let cls = 'ml-fg__tedge';
            if (pv) {
              if (!pv.set.has(a) || !pv.set.has(b)) cls += ' is-off';
              else cls += ' is-up';
            } else if (closure) {
              cls += closure.up.has(a) || closure.up.has(b) || closure.down.has(a) || closure.down.has(b) ? ' is-up' : ' is-dim2';
            }
            const mx = (A.cx + B.cx) / 2;
            const dy = A.cy === B.cy ? 7 : 0;
            const d = A.cy === B.cy
              ? `M ${A.cx} ${A.cy - PILL_H / 2} Q ${mx} ${A.cy - PILL_H / 2 - dy * 2}, ${B.cx} ${B.cy + PILL_H / 2}`
              : `M ${A.cx} ${A.cy} C ${mx} ${A.cy}, ${mx} ${B.cy}, ${B.cx} ${B.cy}`;
            return (
              <path key={'u' + k} d={d} className={cls}>
                <title>{'工具血缘：' + tools.join('、')}</title>
              </path>
            );
          })}
          {CH_ROWS.map(({ chapter, row, name }) => (
            <text key={chapter} x={6} y={TOP + row * BAND_H + BAND_H / 2 + 4} className="ml-fg__band">{name}</text>
          ))}
          {NODES.map((n, i) => {
            const p = L2.pos[i];
            /* 左边让位给深度徽标（两位数更宽），右边让位给工具圆点；标题在剩余区间内居中，超宽自动截断 */
            const padL = DEPTH[i] >= 10 ? 25 : 18;
            const padR = n.born.length ? 20 : 10;
            const label = fitText(n.short, PILL_W - padL - padR);
            const tx = (padL + PILL_W - padR) / 2;
            return (
              <g key={n.id}
                className={'ml-fg__pos ml-fg__node' + nodeCls(i)}
                style={{ transform: `translate(${p.cx - PILL_W / 2}px, ${p.cy - PILL_H / 2}px)` }}
              >
                <g
                  data-rid={'n' + i}
                  className={'ml-fg__rv' + (revealed.has('n' + i) ? ' is-in' : '')}
                  style={{ transitionDelay: revealed.has('n' + i) ? revealDelay[i] : '0s' }}
                  onMouseEnter={() => setSel(i)}
                  onClick={(e) => { e.stopPropagation(); setPicked(picked === i ? null : i); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') setPicked(picked === i ? null : i); }}
                  onFocus={() => setSel(i)}
                  role="button" tabIndex={0}
                >
                  <rect width={PILL_W} height={PILL_H} rx={15} />
                  <text x={10} y={PILL_H / 2 + 4} className="ml-fg__depth">{DEPTH[i]}</text>
                  <text x={tx} y={PILL_H / 2 + 4} textAnchor="middle">{label}</text>
                  {n.born.length > 0 && <circle cx={PILL_W - 9} cy={8} r={3.2} className="ml-fg__tool" />}
                  <title>{`${n.title}\n先修深度第 ${DEPTH[i]} 层${n.born.length ? '\n诞生：' + n.born.join('、') : ''}${n.uses.length ? '\n使用：' + n.uses.join('、') : ''}\n点击只看与它连通的路径，点空白恢复；进课程用下方面板`}</title>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {/* 全屏时工具栏在视口外，提供固定位置的退出钮 */}
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
              <strong>{info.n.title}</strong>
              <button type="button" className="button button--sm button--primary" onClick={() => history.push(info.n.to)}>进入课程 →</button>
              <span className="ml-fg__pill">第 {info.n.ch} 章</span>
              <span className="ml-fg__pill">先修深度第 {DEPTH[focus]} 层</span>
              {info.n.born.length > 0 && <span className="ml-fg__pill ml-fg__pill--born">✦ 诞生 {info.n.born.join('、')}</span>}
            </div>
            <p className="ml-fg__line">
              最长先修链：{info.chain.map((i) => NODES[i].short).join(' → ')}
              　·　后续依赖本课：{downMap[focus].length} 门{info.usedBy > 0 && <>　·　工具被下游使用 {info.usedBy} 处</>}
            </p>
            {info.useList.length > 0 && (
              <p className="ml-fg__line">本课用到的工具：{info.useList.join('、')}<button className="button button--sm button--link" onClick={() => { const t = USE_AGG.find(([a, b]) => b === focus); if (t) setSel(t[0]); }}>看它的出生地 ↑</button></p>
            )}
          </>
        ) : (
          <p className="ml-fg__hint">悬停胶囊：绿=全部先修链，橙=托起的后续；点击胶囊只保留与它连通的路径并自动重排，点空白或「显示全部」恢复；进课程用面板里的按钮。勾选「工具血缘层」显示 {TOOL_COUNT} 个工具的 {USE_AGG.length} 条血缘线。</p>
        )}
      </div>
    </div>
  );
}
