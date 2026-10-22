import React from 'react';
import Link from '@docusaurus/Link';
import { useHistory, useLocation } from '@docusaurus/router';
import { NODES, DEPTH, CHAPTER_INFO } from './full-graph-data.js';
import {
  buildLineage,
  suggestNext,
  pathToFocus,
  searchLessons,
  CARD_W,
  CARD_H,
} from './lineageLayout';
import { DONE, READY, CURRENT, STATE_CLASS, STATE_NAME, INDEX_BY_ID, INDEX_BY_TO, tally } from './learnState';
import { readLast } from '../../learning/progress';
import useLearnState from './useLearnState';

/* =========================================================================
 * 知识树 /tree ·「课程家谱」（2026-10 重做，替换整棵 1000+ 节点的块布局树）
 * -------------------------------------------------------------------------
 * 一次只看一门课：左边是它站在谁的肩上（先修，逐层往前），右边是它解锁了
 * 哪些课（后续）。窗口之外的更早根基按章折叠成一列「根基卡」，只报数。
 * 布局全在 lineageLayout.js（纯函数，node 可测），这里只管画和交互：
 *   · 单击任意卡 = 以它为中心重排（卡片平移过去，地址栏 ?l=课程id 可分享、可后退）；
 *   · 悬停一张卡：点亮它与本课之间的那几条路径；
 *   · 先修 / 后续层数可加减；有学习记录时显示「根基已学几门、下一步先补哪门」；
 *   · ≤620px 改成分层列表（不画连线，手机上横向画布不好用）。
 * 默认焦点：地址栏 ?l= → 上次停留的课 → 加法与交换律。
 * ========================================================================= */

const HEAD = 34; /* 画布顶部给列标题留的高度 */
const CH = new Map(CHAPTER_INFO.map((c) => [c.n, c]));
const volVar = (ch) => `var(--ml-vol${(CH.get(ch)?.volume || 1)})`;
const ROOT_ID = 'arithmetic/addition';

function colLabel(col) {
  if (col === 0) return '本课';
  if (col === -1) return '直接先修';
  if (col === 1) return '直接后续';
  return col < 0 ? `往前第 ${-col} 层` : `往后第 ${col} 层`;
}

function useNarrow() {
  const [narrow, setNarrow] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(max-width: 620px)');
    const up = () => setNarrow(mq.matches);
    up();
    mq.addEventListener ? mq.addEventListener('change', up) : mq.addListener(up);
    return () => (mq.removeEventListener ? mq.removeEventListener('change', up) : mq.removeListener(up));
  }, []);
  return narrow;
}

function defaultFocus() {
  const last = readLast();
  if (last && last.path) {
    const i = INDEX_BY_TO.get(String(last.path).replace(/\/+$/, ''));
    if (i != null) return i;
  }
  return INDEX_BY_ID.get(ROOT_ID) ?? 0;
}

const STATE_ICON = ['', '○', '●', '✓'];

/* ---- 课卡 ---- */
function LessonCard({ i, x, y, focus, cls, onFocusLesson, onHot }) {
  const n = NODES[i];
  const ch = CH.get(n.ch);
  const style = { transform: `translate(${x}px, ${y}px)`, width: CARD_W, height: CARD_H, '--vol': volVar(n.ch) };
  const inner = (
    <>
      <span className="ml-lin__cch">
        <b>{n.ch}</b>
        {ch ? ch.short : ''}
      </span>
      <span className="ml-lin__ctitle">{n.title}</span>
      <span className="ml-lin__cstate" aria-hidden="true" />
    </>
  );
  if (focus) {
    return (
      <div className={cls} style={style} data-i={i} title={n.title} onMouseEnter={() => onHot(null)}>
        {inner}
      </div>
    );
  }
  return (
    <button
      type="button"
      className={cls}
      style={style}
      data-i={i}
      title={`${n.title}\n单击：以它为中心`}
      onClick={() => onFocusLesson(i)}
      onMouseEnter={() => onHot(i)}
      onMouseLeave={() => onHot(null)}
      onFocus={() => onHot(i)}
      onBlur={() => onHot(null)}
    >
      {inner}
    </button>
  );
}

export default function LessonLineage() {
  const location = useLocation();
  const history = useHistory();
  const ls = useLearnState();
  const state = ls && ls.hasData ? ls.state : null;
  const narrow = useNarrow();

  const fallback = React.useMemo(defaultFocus, []);
  const focus = React.useMemo(() => {
    const id = new URLSearchParams(location.search).get('l');
    const i = id ? INDEX_BY_ID.get(id) : undefined;
    return i ?? fallback;
  }, [location.search, fallback]);

  const [back, setBack] = React.useState(3);
  const [fwd, setFwd] = React.useState(2);
  const [dimDone, setDimDone] = React.useState(false);
  const [hot, setHot] = React.useState(null);

  const lin = React.useMemo(() => buildLineage(focus, { back, fwd }), [focus, back, fwd]);
  const lit = React.useMemo(() => (hot != null && lin.shown.has(hot) ? pathToFocus(lin, hot) : null), [hot, lin]);

  const goTo = React.useCallback(
    (i) => {
      setHot(null);
      history.push({ pathname: location.pathname, search: `?l=${encodeURIComponent(NODES[i].id)}` });
    },
    [history, location.pathname],
  );

  /* 换焦点后把本课卡滚到视口中央 */
  const scrollRef = React.useRef(null);
  React.useEffect(() => {
    const sc = scrollRef.current;
    const p = lin.pos.get(focus);
    if (!sc || !p) return;
    const left = p.x + CARD_W / 2 - sc.clientWidth / 2;
    const top = p.y + HEAD + CARD_H / 2 - sc.clientHeight / 2;
    sc.scrollTo({ left: Math.max(0, left), top: Math.max(0, top), behavior: 'smooth' });
  }, [lin, focus, narrow]);

  const cardClass = (i) => {
    let s = 'ml-lin__card';
    if (i === focus) s += ' is-focus';
    if (state) s += ' ' + STATE_CLASS[state[i]];
    if (dimDone && state && state[i] === DONE && i !== focus) s += ' is-faded';
    if (lit) s += lit.has(i) ? ' is-lit' : ' is-dim';
    return s;
  };

  /* ---- 摘要：根基进度与下一步 ---- */
  const ancList = React.useMemo(() => [...lin.ancAll], [lin]);
  const ancT = state ? tally(ancList, state) : null;
  const next = state ? suggestNext(lin, state, READY, CURRENT) : [];
  const nextOthers = next.filter((i) => i !== focus);
  const n = NODES[focus];
  const ch = CH.get(n.ch);

  return (
    <div className="ml-lin">
      <div className="ml-lin__bar">
        <LessonSearch onPick={goTo} />
        <Stepper label="先修" value={back} max={Math.max(1, lin.maxBack)} onChange={setBack} />
        <Stepper label="后续" value={fwd} max={Math.max(1, lin.maxFwd)} onChange={setFwd} />
        {state ? (
          <label className="ml-gp-check">
            <input type="checkbox" checked={dimDone} onChange={(e) => setDimDone(e.target.checked)} />
            淡化已学
          </label>
        ) : null}
        {ls && ls.current >= 0 && ls.current !== focus ? (
          <button type="button" className="ml-gp-btn ml-gp-btn--ghost" onClick={() => goTo(ls.current)}>
            回到上次的课
          </button>
        ) : null}
      </div>

      <section className="ml-lin__hero" style={{ '--vol': volVar(n.ch) }}>
        <div className="ml-lin__heromain">
          <p className="ml-gp-kicker">
            第 {n.ch} 章 · {ch ? ch.title : ''}
            {state ? <span className={`ml-lin__badge ${STATE_CLASS[state[focus]]}`}>{STATE_NAME[state[focus]]}</span> : null}
          </p>
          <p role="heading" aria-level="2" className="ml-lin__title">{n.title}</p>
          <p className="ml-lin__facts">
            站在 <b>{lin.ancAll.size}</b> 门课的肩上{ancT ? `（已学 ${ancT.done}）` : ''} · 最长来路 {DEPTH[focus]} 步 ·
            往后解锁 <b>{lin.descAll.size}</b> 门
          </p>
        </div>
        <div className="ml-lin__heroside">
          <Link className="ml-gp-btn ml-gp-btn--primary" to={n.to}>
            进入这一课 →
          </Link>
          <Link className="ml-gp-btn" to={`/graph?ch=${n.ch}`}>
            在版图里看本章
          </Link>
        </div>
        {state ? (
          <div className="ml-lin__next">
            {next.length === 0 ? (
              <span>这一课和它的全部根基都已学完。</span>
            ) : nextOthers.length === 0 ? (
              <span>
                先修已经齐了，<Link to={n.to}>可以开学</Link>。
              </span>
            ) : (
              <>
                <span>要学到这里，先补最底下的砖：</span>
                {nextOthers.map((i) => (
                  <button key={i} type="button" className="ml-gp-chip is-next" onClick={() => goTo(i)}>
                    {NODES[i].title}
                  </button>
                ))}
              </>
            )}
          </div>
        ) : null}
      </section>

      {narrow ? (
        <LineageList lin={lin} state={state} goTo={goTo} cardClass={cardClass} />
      ) : (
        <div className="ml-lin__frame">
          {lin.beyond.length ? (
            <Roots lin={lin} state={state} goTo={goTo} canMore={back < lin.maxBack} onMore={() => setBack((b) => b + 1)} />
          ) : null}
          <div className="ml-lin__scroll" ref={scrollRef}>
            <div className="ml-lin__stage" style={{ width: lin.width, height: lin.height + HEAD }}>
              {lin.columns.map((c) => (
                <div key={c.col} className={`ml-lin__colhead${c.col === 0 ? ' is-focus' : ''}`} style={{ left: c.x, width: CARD_W }}>
                  {colLabel(c.col)}
                  {c.col !== 0 ? <small>{c.count}</small> : null}
                </div>
              ))}
              <svg className="ml-lin__edges" width={lin.width} height={lin.height} style={{ top: HEAD }} aria-hidden="true">
                {lin.edges.map((e) => {
                  const on = lit && lit.has(e.a) && lit.has(e.b);
                  const side = lin.pos.get(e.b).col <= 0 ? 'up' : 'down';
                  return (
                    <path
                      key={`${e.a}-${e.b}`}
                      d={e.d}
                      className={`ml-lin__edge is-${side}${on ? ' is-lit' : ''}${lit && !on ? ' is-dim' : ''}`}
                    />
                  );
                })}
              </svg>
              {lin.nodes.map((p) => (
                <LessonCard
                  key={p.i}
                  i={p.i}
                  x={p.x}
                  y={p.y + HEAD}
                  focus={p.i === focus}
                  cls={cardClass(p.i)}
                  onFocusLesson={goTo}
                  onHot={setHot}
                />
              ))}
              {lin.more.map((m) => (
                <div
                  key={`more${m.col}`}
                  className="ml-lin__more"
                  style={{ transform: `translate(${m.x}px, ${m.y + HEAD}px)`, width: CARD_W, height: CARD_H }}
                  title={m.lessons.map((i) => NODES[i].title).join('\n')}
                >
                  还有 {m.count} 门…
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <p className="ml-lin__foot">
        <span>
          <i className="ml-gp-line is-up" /> 先修线
        </span>
        <span>
          <i className="ml-gp-line is-down" /> 后续线
        </span>
        <span>单击任意一门课，图就以它为中心重排；浏览器的后退键可以回到上一门。</span>
      </p>
    </div>
  );
}

/* ---- 「更早的根基」：窗口之外的祖先按章折叠 ---- */
function Roots({ lin, state, goTo, canMore, onMore }) {
  const total = lin.beyond.reduce((s, b) => s + b.lessons.length, 0);
  return (
    <aside className="ml-lin__roots" aria-label="更早的根基">
      <p className="ml-lin__rootshead">
        更早的根基
        <small>{total} 门</small>
      </p>
      <ul>
        {lin.beyond.map((b) => {
          const c = CH.get(b.ch);
          const t = state ? tally(b.lessons, state) : null;
          /* 点根基卡：跳到这一组里最靠后（离本课最近）的那门课 */
          const last = b.lessons.reduce((m, i) => (DEPTH[i] > DEPTH[m] ? i : m), b.lessons[0]);
          return (
            <li key={b.ch} style={{ '--vol': volVar(b.ch) }}>
              <button
                type="button"
                onClick={() => goTo(last)}
                title={b.lessons.map((i) => NODES[i].title).join('\n')}
              >
                <span className="ml-lin__rootn">{b.ch}</span>
                <span className="ml-lin__roott">{c ? c.short : `第 ${b.ch} 章`}</span>
                <span className="ml-lin__rootc">{t ? `${t.done}/${t.total}` : b.lessons.length}</span>
                {t ? (
                  <span className="ml-lin__rootbar" aria-hidden="true">
                    <span style={{ width: `${(t.done / t.total) * 100}%` }} />
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      {canMore ? (
        <button type="button" className="ml-gp-btn ml-gp-btn--ghost ml-lin__rootsmore" onClick={onMore}>
          ← 再往前展开一层
        </button>
      ) : null}
    </aside>
  );
}

/* ---- 窄屏：分层列表 ---- */
function LineageList({ lin, state, goTo, cardClass }) {
  const groups = new Map();
  lin.nodes.forEach((p) => {
    if (!groups.has(p.col)) groups.set(p.col, []);
    groups.get(p.col).push(p.i);
  });
  const cols = [...groups.keys()].sort((a, b) => a - b);
  return (
    <div className="ml-lin__list">
      {lin.beyond.length ? (
        <details className="ml-lin__lgroup">
          <summary>更早的根基 · {lin.beyond.reduce((s, b) => s + b.lessons.length, 0)} 门</summary>
          <ul>
            {lin.beyond.map((b) => (
              <li key={b.ch}>
                第 {b.ch} 章 {CH.get(b.ch)?.short} · {b.lessons.length} 门
                {state ? `（已学 ${tally(b.lessons, state).done}）` : ''}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {cols.map((c) => (
        <div key={c} className={`ml-lin__lgroup${c === 0 ? ' is-focus' : ''}`}>
          <p role="heading" aria-level="4" className="ml-lin__lh">{colLabel(c)}</p>
          <ul>
            {groups.get(c).map((i) => (
              <li key={i}>
                {c === 0 ? (
                  <span className={cardClass(i)} style={{ '--vol': volVar(NODES[i].ch) }}>
                    <span className="ml-lin__ctitle">{NODES[i].title}</span>
                  </span>
                ) : (
                  <button type="button" className={cardClass(i)} style={{ '--vol': volVar(NODES[i].ch) }} onClick={() => goTo(i)}>
                    <span className="ml-lin__cch">
                      <b>{NODES[i].ch}</b>
                      {CH.get(NODES[i].ch)?.short}
                    </span>
                    <span className="ml-lin__ctitle">{NODES[i].title}</span>
                    {state ? <span className="ml-lin__lstate">{STATE_ICON[state[i]]}</span> : null}
                  </button>
                )}
              </li>
            ))}
            {lin.more.filter((m) => m.col === c).map((m) => (
              <li key="more" className="ml-lin__lmore">
                还有 {m.count} 门…
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Stepper({ label, value, max, onChange }) {
  return (
    <span className="ml-gp-stepper" role="group" aria-label={`${label}层数`}>
      <button type="button" aria-label={`${label}少一层`} disabled={value <= 1} onClick={() => onChange(Math.max(1, value - 1))}>
        −
      </button>
      <span>
        {label} <b>{Math.min(value, max)}</b> 步内
      </span>
      <button type="button" aria-label={`${label}多一层`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        +
      </button>
    </span>
  );
}

/* ---- 课名搜索：下拉候选，↑↓ 选、回车跳 ---- */
function LessonSearch({ onPick }) {
  const [q, setQ] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [k, setK] = React.useState(0);
  const hits = React.useMemo(() => searchLessons(q, 8), [q]);
  const pick = (i) => {
    onPick(i);
    setQ('');
    setOpen(false);
  };
  return (
    <div className="ml-gp-search ml-lin__search">
      <span className="ml-gp-search__icon" aria-hidden="true">⌕</span>
      <input
        type="search"
        value={q}
        placeholder="跳到任意一门课：勾股 / 欧拉 / 注意力"
        aria-label="搜索课程"
        aria-expanded={open && hits.length > 0}
        role="combobox"
        aria-controls="ml-lin-hits"
        onChange={(e) => {
          setQ(e.target.value);
          setK(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setK((x) => Math.min(hits.length - 1, x + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setK((x) => Math.max(0, x - 1));
          } else if (e.key === 'Enter' && hits[k] != null) {
            pick(hits[k]);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {open && hits.length ? (
        <ul className="ml-lin__hits" id="ml-lin-hits" role="listbox">
          {hits.map((i, j) => (
            <li key={i} role="option" aria-selected={j === k}>
              <button
                type="button"
                className={j === k ? 'is-active' : ''}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(i);
                }}
                style={{ '--vol': volVar(NODES[i].ch) }}
              >
                <span>{NODES[i].title}</span>
                <small>
                  {NODES[i].ch} · {CH.get(NODES[i].ch)?.short}
                </small>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
