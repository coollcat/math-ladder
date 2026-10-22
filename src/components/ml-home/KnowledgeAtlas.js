import React from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { NODES, DEPTH } from './full-graph-data.js';
import { buildAtlas, chainOf, ancestorsOf, descendantsOf, searchChapters } from './atlasModel';
import { DONE, READY, CURRENT, STATE_CLASS, STATE_NAME, INDEX_BY_ID, tally } from './learnState';
import useLearnState from './useLearnState';

/* =========================================================================
 * 知识图谱 /graph ·「阶梯版图」（2026-10 重做，替换同心环）
 * -------------------------------------------------------------------------
 * 一张矩阵：列 = 层级（地基→前沿，口径来自 ringLayout.chapterModel），
 * 行 = 七卷。一章一张卡，卡里每个小方格是一门课，按读者进度着色。
 * 整张图天然是一道阶梯——卷一压在左下，卷五卷六卷七堆在右边。
 *
 * 读图分工（与首页章级树、/tree 课程家谱错开）：
 *   · 首页：章与章「一代代」怎么托起（依赖结构）；
 *   · /graph：全站版图——每章在哪个领域、多高的台阶、我走到哪儿了；
 *   · /tree：单门课的来路与去向（课级家谱）。
 *
 * 交互：
 *   · 平时不画任何连线（77 章 312 条边画全就是一团毛线）；
 *   · 悬停 / 键盘聚焦一章：直接先修卡变绿、直接后续卡变橙，并只画这几条线；
 *     「全部来路」档再把祖先 / 后代闭包整片点亮；
 *   · 点击 = 钉住，右侧面板给出最长先修链、先修 / 后续、本章课表。
 *     **课表从服务器拉 static/graph-chapters/NN.json**（断网 / 404 在面板里可见），
 *     缓存只做会话内去重；
 *   · Esc / 点版图空白处取消钉住。
 * 连线坐标在挂载后量 DOM 算（卡片尺寸随视口流动），ResizeObserver 触发重量。
 * ========================================================================= */

const ATLAS = buildAtlas();
const { model: M, cells: CELLS, volumes: VOLS, levels: LEVELS, edgeW: EDGE_W } = ATLAS;
const TOTAL = M.chapters.reduce((s, c) => s + c.count, 0);
const volVar = (vi) => `var(--ml-vol${vi + 1})`;
const treeHref = (id) => `/tree?l=${encodeURIComponent(id)}`;
const useIsoLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

/* ---- 连线几何：按两张卡的相对位置选锚边 ---- */
function linkPath(S, T) {
  const dx = T.cx - S.cx;
  if (Math.abs(dx) < Math.min(S.w, T.w) * 0.5) {
    /* 同一列：从右侧绕出去再回来 */
    const x = Math.max(S.r, T.r);
    const bulge = 22 + Math.min(36, Math.abs(T.cy - S.cy) * 0.12);
    return `M ${S.r} ${S.cy} C ${x + bulge} ${S.cy}, ${x + bulge} ${T.cy}, ${T.r} ${T.cy}`;
  }
  const sx = dx > 0 ? S.r : S.l;
  const tx = dx > 0 ? T.l : T.r;
  const k = (tx - sx) * 0.5;
  return `M ${sx} ${S.cy} C ${sx + k} ${S.cy}, ${tx - k} ${T.cy}, ${tx} ${T.cy}`;
}

const strokeOf = (w) => 1.3 + Math.min(2.4, Math.log2(Math.max(1, w)) * 0.75);

/* ---- 章卡 ---- */
const Tile = React.memo(function Tile({ n, cls, state, onHot, onPick, setRef }) {
  const c = M.byN.get(n);
  const t = state ? tally(c.lessons, state) : null;
  return (
    <div
      ref={(el) => setRef(n, el)}
      role="button"
      tabIndex={0}
      className={cls}
      style={{ '--vol': volVar(c.vi) }}
      data-ch={n}
      aria-label={`第 ${n} 章 ${c.title}，${c.count} 课${t ? `，已学 ${t.done}` : ''}`}
      onMouseEnter={() => onHot(n)}
      onMouseLeave={() => onHot(null)}
      onFocus={() => onHot(n)}
      onBlur={() => onHot(null)}
      onClick={() => onPick(n)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPick(n);
        }
      }}
    >
      <span className="ml-atlas__thead">
        <span className="ml-atlas__tnum">{n}</span>
        <span className="ml-atlas__tname" title={c.title}>
          {c.short}
        </span>
      </span>
      <span className="ml-atlas__waffle" aria-hidden="true">
        {c.lessons.map((i) => (
          <i key={i} className={state ? STATE_CLASS[state[i]] : ''} title={NODES[i].title} />
        ))}
        <span className="ml-atlas__tcount">{t && t.done ? `${t.done}/${c.count}` : c.count}</span>
      </span>
      <span className="ml-atlas__tlevel">{LEVELS[c.ring].name}</span>
    </div>
  );
});

export default function KnowledgeAtlas() {
  const baseUrl = useBaseUrl('/');
  const ls = useLearnState();
  const state = ls && ls.hasData ? ls.state : null; /* 无记录 → 中性配色 */

  const [hot, setHot] = React.useState(null);
  const [picked, setPicked] = React.useState(null);
  const [mode, setMode] = React.useState('direct');
  const [query, setQuery] = React.useState('');
  const [drill, setDrill] = React.useState(null);
  const [lines, setLines] = React.useState(null);
  const [tick, setTick] = React.useState(0);
  const cache = React.useRef(new Map());
  const pickedRef = React.useRef(null);
  const boardRef = React.useRef(null);
  const tileRefs = React.useRef(new Map());

  const focus = hot ?? picked;
  const rel = React.useMemo(() => {
    if (focus == null) return null;
    const c = M.byN.get(focus);
    return {
      pred: new Set(c.pred),
      succ: new Set(c.succ),
      anc: mode === 'all' ? ancestorsOf(ATLAS, focus) : new Set(),
      desc: mode === 'all' ? descendantsOf(ATLAS, focus) : new Set(),
    };
  }, [focus, mode]);
  const q = query.trim();
  const matches = React.useMemo(() => searchChapters(ATLAS, q), [q]);
  const matchSet = React.useMemo(() => new Set(matches), [matches]);

  const setRef = React.useCallback((n, el) => {
    if (el) tileRefs.current.set(n, el);
    else tileRefs.current.delete(n);
  }, []);
  const onHot = React.useCallback((n) => setHot(n), []);
  const onPick = React.useCallback((n) => setPicked((cur) => (cur === n ? null : n)), []);

  /* ---- 课表：钉住一章时从服务器拉本章 JSON ---- */
  React.useEffect(() => {
    pickedRef.current = picked;
    if (picked == null) return;
    const n = picked;
    if (cache.current.has(n)) {
      setDrill({ n, data: cache.current.get(n), err: null });
      return;
    }
    setDrill({ n, data: null, err: null });
    fetch(`${baseUrl}graph-chapters/${String(n).padStart(2, '0')}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        cache.current.set(n, data);
        if (pickedRef.current === n) setDrill({ n, data, err: null });
      })
      .catch((e) => {
        if (pickedRef.current === n) setDrill({ n, data: null, err: String((e && e.message) || e) });
      });
  }, [picked, baseUrl]);

  /* ---- 地址栏 ?ch=N：直达某章（课程家谱页「在版图里看本章」用） ---- */
  React.useEffect(() => {
    const n = Number(new URLSearchParams(window.location.search).get('ch'));
    if (!M.byN.has(n)) return;
    setPicked(n);
    const el = tileRefs.current.get(n);
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' });
  }, []);

  /* ---- Esc 取消 ---- */
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setPicked(null);
      setHot(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  /* ---- 尺寸变化 → 重量连线 ---- */
  React.useEffect(() => {
    const el = boardRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => setTick((t) => t + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ---- 量 DOM 画连线：只画焦点章的直接先修与直接后续 ---- */
  useIsoLayoutEffect(() => {
    const board = boardRef.current;
    if (focus == null || !board) {
      setLines(null);
      return;
    }
    const br = board.getBoundingClientRect();
    const rect = (n) => {
      const el = tileRefs.current.get(n);
      if (!el || !el.offsetParent) return null; /* 窄屏下隐藏的卡不画 */
      const r = el.getBoundingClientRect();
      const l = r.left - br.left;
      const t = r.top - br.top;
      return { l, r: l + r.width, t, b: t + r.height, w: r.width, cx: l + r.width / 2, cy: t + r.height / 2 };
    };
    const F = rect(focus);
    if (!F) {
      setLines(null);
      return;
    }
    const c = M.byN.get(focus);
    const paths = [];
    c.pred.forEach((p) => {
      const S = rect(p);
      if (!S) return;
      const w = EDGE_W.get(`${p}>${focus}`) || 1;
      paths.push({ k: `u${p}`, kind: 'up', d: linkPath(S, F), w, end: [F.l, F.cy] });
    });
    c.succ.forEach((s) => {
      const T = rect(s);
      if (!T) return;
      const w = EDGE_W.get(`${focus}>${s}`) || 1;
      paths.push({ k: `d${s}`, kind: 'down', d: linkPath(F, T), w });
    });
    setLines({ w: br.width, h: br.height, paths });
  }, [focus, tick]);

  const tileClass = (n) => {
    let s = 'ml-atlas__tile';
    if (rel) {
      if (n === focus) s += ' is-focus';
      else if (rel.pred.has(n)) s += ' is-pred';
      else if (rel.succ.has(n)) s += ' is-succ';
      else if (rel.anc.has(n)) s += ' is-anc';
      else if (rel.desc.has(n)) s += ' is-desc';
      else s += ' is-dim';
    } else if (q) {
      s += matchSet.has(n) ? ' is-match' : ' is-dim';
    }
    if (n === picked) s += ' is-picked';
    return s;
  };

  const onSearchKey = (e) => {
    if (e.key === 'Enter' && matches.length) {
      const n = matches[0];
      setPicked(n);
      const el = tileRefs.current.get(n);
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } else if (e.key === 'Escape') {
      setQuery('');
    }
  };

  const nextUp = React.useMemo(() => {
    if (!state) return [];
    const out = [];
    for (let i = 0; i < NODES.length; i++) {
      if (NODES[i].ch !== 0 && (state[i] === READY || state[i] === CURRENT)) out.push(i);
    }
    out.sort((a, b) => (state[b] === CURRENT) - (state[a] === CURRENT) || DEPTH[a] - DEPTH[b] || NODES[a].ch - NODES[b].ch);
    return out.slice(0, 5);
  }, [state]);

  return (
    <div className={'ml-atlas' + (picked != null ? ' has-pick' : '') + (state ? ' has-progress' : '')}>
      <div className="ml-atlas__bar">
        <label className="ml-gp-search">
          <span className="ml-gp-search__icon" aria-hidden="true">⌕</span>
          <input
            type="search"
            value={query}
            placeholder="找一章：傅里叶 / 概率 / 36"
            aria-label="搜索章节"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKey}
          />
          {q ? <span className="ml-gp-search__count">{matches.length} 章</span> : null}
        </label>
        <div className="ml-gp-seg" role="group" aria-label="关系显示范围">
          <button type="button" aria-pressed={mode === 'direct'} onClick={() => setMode('direct')}>
            直接关系
          </button>
          <button type="button" aria-pressed={mode === 'all'} onClick={() => setMode('all')}>
            全部来路与去向
          </button>
        </div>
        <span className="ml-atlas__stat">
          {M.chapters.length} 章 · {TOTAL} 课 · {LEVELS.length} 级台阶
        </span>
      </div>

      <div className="ml-atlas__layout">
        <div className="ml-atlas__scroll">
          <div
            className="ml-atlas__board"
            ref={boardRef}
            onClick={(e) => {
              if (!e.target.closest('.ml-atlas__tile')) setPicked(null);
            }}
          >
            <div className="ml-atlas__row ml-atlas__row--head" aria-hidden="true">
              <div className="ml-atlas__corner">
                <span>领域 ↓</span>
                <span>台阶 →</span>
              </div>
              {LEVELS.map((lv) => (
                <div key={lv.ri} className="ml-atlas__colhead" style={{ '--lv': lv.ri }}>
                  <b>{lv.name}</b>
                  <small>
                    {lv.label} · {lv.count} 章
                  </small>
                </div>
              ))}
            </div>

            {VOLS.map((v) => {
              const t = state ? tally(v.lessons, state) : null;
              return (
                <div key={v.vi} className="ml-atlas__row" style={{ '--vol': volVar(v.vi) }}>
                  <div className="ml-atlas__rowhead">
                    <span className="ml-atlas__voln">{v.n}</span>
                    <span className="ml-atlas__volt">{v.title}</span>
                    <span className="ml-atlas__volm">
                      {v.chapters.length} 章 · {t ? `${t.done}/${t.total}` : `${v.lessons.length} 课`}
                    </span>
                    {t ? (
                      <span className="ml-atlas__volbar" aria-hidden="true">
                        <span style={{ width: `${(t.done / Math.max(1, t.total)) * 100}%` }} />
                      </span>
                    ) : null}
                  </div>
                  {CELLS[v.vi].map((list, ri) => (
                    <div
                      key={ri}
                      className={'ml-atlas__cell' + (list.length ? '' : ' is-empty')}
                      style={{ '--lv': ri }}
                    >
                      {list.map((n) => (
                        <Tile
                          key={n}
                          n={n}
                          cls={tileClass(n)}
                          state={state}
                          onHot={onHot}
                          onPick={onPick}
                          setRef={setRef}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              );
            })}

            {lines ? (
              <svg
                className="ml-atlas__links"
                width={lines.w}
                height={lines.h}
                viewBox={`0 0 ${lines.w} ${lines.h}`}
                aria-hidden="true"
              >
                {lines.paths.map((p) => (
                  <path
                    key={p.k}
                    d={p.d}
                    className={`ml-atlas__link is-${p.kind}${p.w < 2 ? ' is-weak' : ''}`}
                    style={{ strokeWidth: strokeOf(p.w) }}
                  />
                ))}
              </svg>
            ) : null}
          </div>
        </div>

        <aside className="ml-atlas__panel" aria-live="polite">
          {picked != null ? (
            <ChapterPanel
              n={picked}
              state={state}
              drill={drill && drill.n === picked ? drill : null}
              onPick={setPicked}
              onClose={() => setPicked(null)}
            />
          ) : (
            <Overview ls={ls} state={state} nextUp={nextUp} />
          )}
        </aside>
      </div>
    </div>
  );
}

/* ---- 面板：没钉住任何章时 —— 读图说明 + 我的进度 ---- */
function Overview({ ls, state, nextUp }) {
  const cur = ls && ls.current >= 0 ? ls.current : -1;
  return (
    <div className="ml-atlas__pbody">
      <p className="ml-gp-kicker">全站版图</p>
      {state ? (
        <>
          <p role="heading" aria-level="3" className="ml-atlas__ptitle">
            已学 {ls.done} / {TOTAL} 课
          </p>
          <div className="ml-gp-meter" aria-hidden="true">
            <span style={{ width: `${(ls.done / TOTAL) * 100}%` }} />
          </div>
          {cur >= 0 ? (
            <Link className="ml-atlas__resume" to={NODES[cur].to}>
              <small>上次停在</small>
              <b>{NODES[cur].title}</b>
              <span aria-hidden="true">→</span>
            </Link>
          ) : null}
          {nextUp.length ? (
            <>
              <p role="heading" aria-level="4" className="ml-atlas__ph">现在就能学（先修已学完）</p>
              <ul className="ml-gp-lessons">
                {nextUp.map((i) => (
                  <li key={i} className={STATE_CLASS[state[i]]}>
                    <i className="ml-gp-dot" aria-hidden="true" />
                    <Link to={NODES[i].to}>{NODES[i].title}</Link>
                    <Link className="ml-gp-lessons__tree" to={treeHref(NODES[i].id)} title="看这门课的来路与去向">
                      家谱
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      ) : (
        <>
          <p role="heading" aria-level="3" className="ml-atlas__ptitle">一章一张卡，一格一门课</p>
          <ul className="ml-atlas__how">
            <li>
              <b>往右</b>台阶越高：地基 → 主干 → 进阶 → 高等 → 深水 → 前沿；
              <b>往下</b>换领域，一行是一卷。
            </li>
            <li>
              <b>悬停</b>一章，托起它的章变绿、被它托起的章变橙；<b>点击</b>钉住，看课表与来路。
            </li>
            <li>台阶由先修关系算出：一章的强先修永远不在它右边。</li>
          </ul>
          <p className="ml-atlas__hint">在课文页底标记「已学完」后，这张图会点亮你走过的方格，并标出下一步可学的课。</p>
        </>
      )}
      <Legend progress={!!state} />
    </div>
  );
}

function Legend({ progress }) {
  return (
    <div className="ml-gp-legend">
      {progress ? (
        <span className="ml-gp-legend__row">
          {[DONE, CURRENT, READY, 0].map((s) => (
            <span key={s} className="ml-gp-legend__item">
              <i className={`ml-gp-cell ${STATE_CLASS[s]}`} />
              {STATE_NAME[s]}
            </span>
          ))}
        </span>
      ) : null}
      <span className="ml-gp-legend__row">
        <span className="ml-gp-legend__item">
          <i className="ml-gp-line is-up" />
          先修（托起它）
        </span>
        <span className="ml-gp-legend__item">
          <i className="ml-gp-line is-down" />
          后续（它托起）
        </span>
        <span className="ml-gp-legend__item">
          <i className="ml-gp-line is-weak" />
          仅一门课引用
        </span>
      </span>
    </div>
  );
}

/* ---- 面板：钉住一章 ---- */
function ChapterPanel({ n, state, drill, onPick, onClose }) {
  const c = M.byN.get(n);
  const v = VOLS[c.vi];
  const t = state ? tally(c.lessons, state) : null;
  const chain = chainOf(ATLAS, n);
  const anc = ancestorsOf(ATLAS, n).size;
  const desc = descendantsOf(ATLAS, n).size;
  const byW = (list, dir) =>
    list
      .map((m) => ({ m, w: EDGE_W.get(dir === 'up' ? `${m}>${n}` : `${n}>${m}`) || 1 }))
      .sort((a, b) => b.w - a.w || a.m - b.m);
  const firstOpen = state ? c.lessons.find((i) => state[i] !== DONE) : undefined;
  const treeTarget = NODES[firstOpen ?? c.lessons[0]];

  const chip = ({ m, w }, kind) => {
    const o = M.byN.get(m);
    return (
      <button
        key={m}
        type="button"
        className={`ml-gp-chip is-${kind}${w < 2 ? ' is-weak' : ''}`}
        style={{ '--vol': volVar(o.vi) }}
        onClick={() => onPick(m)}
        title={`${o.title} · ${w} 条课级先修`}
      >
        <span className="ml-gp-chip__n">{m}</span>
        {o.short}
        {w > 1 ? <small>×{w}</small> : null}
      </button>
    );
  };

  return (
    <div className="ml-atlas__pbody" style={{ '--vol': volVar(c.vi) }}>
      <button type="button" className="ml-atlas__close" onClick={onClose} aria-label="关闭面板">
        ×
      </button>
      <p className="ml-gp-kicker">
        <span className="ml-atlas__pvol">{v.n} · {v.title}</span> · 第 {n} 章 · {LEVELS[c.ring].name}台阶
      </p>
      <p role="heading" aria-level="3" className="ml-atlas__ptitle">{c.title}</p>
      <div className="ml-gp-meter" aria-hidden="true">
        <span style={{ width: `${t ? (t.done / Math.max(1, t.total)) * 100 : 0}%` }} />
      </div>
      <p className="ml-atlas__pmeta">
        {c.count} 课{t ? ` · 已学 ${t.done}` : ''} · 全部来路 {anc} 章 · 全部去向 {desc} 章
      </p>
      <div className="ml-atlas__actions">
        <Link className="ml-gp-btn ml-gp-btn--primary" to={c.to}>
          进入本章
        </Link>
        <Link className="ml-gp-btn" to={treeHref(treeTarget.id)}>
          {t && firstOpen != null ? '下一课的家谱' : '课程家谱'}
        </Link>
      </div>

      {chain.length > 1 ? (
        <>
          <p role="heading" aria-level="4" className="ml-atlas__ph">从地基走到这里（最长先修链）</p>
          <ol className="ml-atlas__chain">
            {chain.map((m) => {
              const o = M.byN.get(m);
              return (
                <li key={m} style={{ '--vol': volVar(o.vi) }}>
                  {m === n ? (
                    <b>{o.short}</b>
                  ) : (
                    <button type="button" onClick={() => onPick(m)} title={o.title}>
                      {o.short}
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      ) : null}

      {c.pred.length ? (
        <>
          <p role="heading" aria-level="4" className="ml-atlas__ph">直接先修 · {c.pred.length} 章</p>
          <div className="ml-gp-chips">{byW(c.pred, 'up').map((x) => chip(x, 'up'))}</div>
        </>
      ) : null}
      {c.succ.length ? (
        <>
          <p role="heading" aria-level="4" className="ml-atlas__ph">直接后续 · {c.succ.length} 章</p>
          <div className="ml-gp-chips">{byW(c.succ, 'down').map((x) => chip(x, 'down'))}</div>
        </>
      ) : null}

      <p role="heading" aria-level="4" className="ml-atlas__ph">本章课表</p>
      {!drill || (!drill.data && !drill.err) ? (
        <p className="ml-atlas__loading">正在从服务器加载本章课表…</p>
      ) : drill.err ? (
        <p className="ml-atlas__error">
          课表加载失败（{drill.err}）。检查网络，或确认站点部署了 <code>graph-chapters/</code> 目录后再点一次。
        </p>
      ) : (
        <ol className="ml-gp-lessons ml-gp-lessons--numbered">
          {drill.data.lessons.map((l) => {
            const i = INDEX_BY_ID.get(l.id);
            const s = state && i != null ? state[i] : null;
            return (
              <li key={l.id} className={s != null ? STATE_CLASS[s] : ''}>
                <i className="ml-gp-dot" aria-hidden="true" />
                <Link to={l.to}>{l.title}</Link>
                <Link className="ml-gp-lessons__tree" to={treeHref(l.id)} title="看这门课的来路与去向">
                  家谱
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
