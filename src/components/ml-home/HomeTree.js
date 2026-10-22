import React from 'react';
import Link from '@docusaurus/Link';
import { useHistory } from '@docusaurus/router';
import { buildHomeTree, chainTo, closureOf, focusLayout, focusEdgePath } from './homeTreeLayout';
import { VOLUMES } from './data';
import { fitText } from './pillText';
import { readProgress, onProgressChange } from '../../learning/progress';

/* =========================================================================
 * 首页 · 章级知识树（2026-10 重做，见 UNIT_GUIDES/site-ui.md「首页章级知识树 v3」）
 * -------------------------------------------------------------------------
 * 一行 = 一代：第 n 代的章，从根（算术四则）出发至少要先走完 n 步先修。
 * 布局全在 homeTreeLayout.js（传递约简 + 重心排序 + 保序回归定位 + 长边绕站），
 * 这里只管画和交互：
 *   · 悬停 / 键盘聚焦 = 预览血缘（朱砂 = 先修，墨蓝 = 托起，粗线 = 最长先修链）；
 *   · 点击 = 钉住，右侧面板给出最长先修链、直接先修 / 托起（带课级边条数）、本章课表；
 *   · 双击、面板按钮或 Shift+Enter 进入本章；方向键沿主父 / 子章 / 同代左右走；Esc 清除；
 *   · 搜章名、按卷高亮、骨架 / 全部依赖切换、缩放（按钮或 Ctrl+滚轮）、拖动平移；
 *   · 有学习记录时叠「我的进度」：每章底边一条进度线，先修都过半的未学完章标「可学」小红点。
 * ========================================================================= */

let TREE = null;
/* 布局约 50ms：整页只算一次（模块级缓存），路由来回切换不重算 */
function getTree() {
  if (!TREE) TREE = buildHomeTree();
  return TREE;
}

const SETTLE_MS = 3400;
const READY_RATIO = 0.6;
const PANEL_OVERLAY_MQ = '(min-width: 997px)';
/* 浮层面板占掉的宽度（含边距）。钉住一章时画布右侧补这么宽的空白，最右边的章也能拖出来 */
const PANEL_W = 340;
const volVar = (v) => `var(--ml-vol${v + 1})`;
const edgeWidth = (w) => 1 + Math.min(2.2, Math.log2(w) * 0.55);

function useProgress() {
  const [prog, setProg] = React.useState(null);
  React.useEffect(() => {
    const update = () => {
      try {
        setProg(readProgress());
      } catch (e) {
        void e;
        setProg({});
      }
    };
    update();
    return onProgressChange(update);
  }, []);
  return prog;
}

export default function HomeTree() {
  const T = getTree();
  const G = T.geom;
  const history = useHistory();

  const wrapRef = React.useRef(null);
  const vpRef = React.useRef(null);
  const nodeRefs = React.useRef([]);
  const drag = React.useRef(null);
  const moved = React.useRef(false);
  const userZoomed = React.useRef(false);

  const [grown, setGrown] = React.useState(false);
  const [settled, setSettled] = React.useState(false);
  const [sel, setSel] = React.useState(null);
  const [hover, setHover] = React.useState(null);
  const [mode, setMode] = React.useState('skel');
  const [vol, setVol] = React.useState(null);
  const [q, setQ] = React.useState('');
  const [sugIdx, setSugIdx] = React.useState(0);
  const [scale, setScale] = React.useState(1);
  const [panelOpen, setPanelOpen] = React.useState(true);
  const [showProg, setShowProg] = React.useState(true);
  const [allLessons, setAllLessons] = React.useState(false);
  /* 宽屏时面板浮在地图右上角（像地图应用的地点卡）；窄屏排到地图下面 */
  const [overlay, setOverlay] = React.useState(false);
  /* 往下滚过一截后，没聚焦时的总览卡缩成一枚小签，免得一直压着右侧的章 */
  const [compact, setCompact] = React.useState(false);
  const prog = useProgress();

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(PANEL_OVERLAY_MQ);
    const sync = () => setOverlay(mq.matches);
    sync();
    if (mq.addEventListener) mq.addEventListener('change', sync);
    else if (mq.addListener) mq.addListener(sync);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', sync);
      else if (mq.removeListener) mq.removeListener(sync);
    };
  }, []);

  /* ---------- 入场生长 ---------- */
  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setGrown(true);
      return undefined;
    }
    const io = new IntersectionObserver((ents) => {
      if (ents.some((en) => en.isIntersecting)) setGrown(true);
    }, { threshold: 0.08 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  React.useEffect(() => {
    if (!grown) return undefined;
    const t = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(t);
  }, [grown]);
  const replay = () => {
    setSel(null);
    setHover(null);
    setGrown(false);
    setSettled(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setGrown(true)));
  };

  /* ---------- 缩放：默认铺满视口宽（不小于 0.62，免得字成芝麻） ---------- */
  const fitScale = React.useCallback(() => {
    const vp = vpRef.current;
    if (!vp) return 1;
    return Math.max(0.62, Math.min(1, (vp.clientWidth - 6) / T.width));
  }, [T]);
  React.useEffect(() => {
    const vp = vpRef.current;
    if (!vp) return undefined;
    const apply = () => { if (!userZoomed.current) setScale(fitScale()); };
    apply();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(apply);
    ro.observe(vp);
    return () => ro.disconnect();
  }, [fitScale]);
  const zoomTo = React.useCallback((ns, ax, ay) => {
    const vp = vpRef.current;
    userZoomed.current = true;
    setScale((s) => {
      const next = Math.max(0.4, Math.min(1.8, ns(s)));
      if (vp) {
        const px = ax === undefined ? vp.clientWidth / 2 : ax;
        const py = ay === undefined ? vp.clientHeight / 2 : ay;
        const k = next / s;
        const left = (vp.scrollLeft + px) * k - px;
        const top = (vp.scrollTop + py) * k - py;
        requestAnimationFrame(() => vp.scrollTo(left, top));
      }
      return next;
    });
  }, []);
  /* Ctrl/⌘ + 滚轮缩放：React 的 onWheel 是被动监听，preventDefault 不生效，只能手挂 */
  React.useEffect(() => {
    const vp = vpRef.current;
    if (!vp) return undefined;
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const r = vp.getBoundingClientRect();
      const f = Math.exp(-e.deltaY * 0.0022);
      zoomTo((s) => s * f, e.clientX - r.left, e.clientY - r.top);
    };
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, [zoomTo]);

  /* ---------- 鼠标拖动平移（触屏走原生滚动） ---------- */
  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const vp = vpRef.current;
    drag.current = { x: e.clientX, y: e.clientY, l: vp.scrollLeft, t: vp.scrollTop };
    moved.current = false;
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!moved.current && Math.hypot(dx, dy) < 5) return;
    moved.current = true;
    vpRef.current.scrollTo(d.l - dx, d.t - dy);
  };
  const endDrag = () => { drag.current = null; };

  /* ---------- 把某章滚进视野（避开右侧浮层面板） ---------- */
  const scrollToXY = React.useCallback((x, y, smooth) => {
    const vp = vpRef.current;
    if (!vp) return;
    const areaW = vp.clientWidth - (overlay && panelOpen ? PANEL_W : 0);
    vp.scrollTo({
      left: x - Math.max(120, areaW / 2),
      top: y - vp.clientHeight / 2,
      behavior: smooth === false ? 'auto' : 'smooth',
    });
  }, [overlay, panelOpen]);

  /* 钉住时的坐标为「聚焦重排之后」的位置：重排会把这一支收拢居中，
     所以干脆在这里现算一遍，别等下一帧的 state。 */
  const posIn = React.useCallback((i) => {
    if (i == null) return null;
    const c = T.chapters[i];
    if (!c) return null;
    const cl2 = closureOf(T, i);
    const keep = new Set(cl2.up);
    cl2.down.forEach((x) => keep.add(x));
    return focusLayout(T, keep).pos[i] || c;
  }, [T]);

  const scrollToNode = React.useCallback((i, smooth) => {
    const p = posIn(i);
    if (p) scrollToXY(p.x * scale, p.y * scale, smooth);
  }, [posIn, scrollToXY, scale]);

  const pick = React.useCallback((i, opts) => {
    setSel(i);
    setAllLessons(false);
    /* 钉住 = 隐藏无关章并重排，图会变；把这一章滚到视野中间才跟得上 */
    if (i != null) {
      const p = posIn(i);
      if (p) scrollToXY(p.x * scale, p.y * scale, opts && opts.smooth);
    }
    if (i != null && opts && opts.focus && nodeRefs.current[i]) {
      nodeRefs.current[i].focus({ preventScroll: true });
    }
  }, [posIn, scrollToXY, scale]);

  /* ---------- 派生：聚焦、闭包、进度 ---------- */
  const focus = sel != null ? sel : hover;
  const cl = React.useMemo(() => (focus == null ? null : closureOf(T, focus)), [T, focus]);
  const chain = React.useMemo(() => (focus == null ? [] : chainTo(T, focus)), [T, focus]);
  const chainSet = React.useMemo(() => {
    const s = new Set();
    for (let k = 1; k < chain.length; k += 1) s.add(chain[k - 1] + '>' + chain[k]);
    return s;
  }, [chain]);
  const chainNodes = React.useMemo(() => new Set(chain), [chain]);

  /* 钉住时：留下的 = 这一章 + 全部先修 + 它托起的全部后代；其余隐藏，各代重新居中。
     悬停不动布局（鼠标划过就整张图重排会晕），只是把无关的调淡。 */
  const keep = React.useMemo(() => {
    if (sel == null || !cl) return null;
    const s = new Set(cl.up);
    cl.down.forEach((i) => s.add(i));
    return s;
  }, [sel, cl]);
  const fl = React.useMemo(() => (keep ? focusLayout(T, keep) : null), [T, keep]);
  const drawW = fl ? fl.width : T.width;
  const posOf = (c) => (fl && fl.pos[c.i]) || c;
  const dOf = (e) => (fl ? focusEdgePath(T, fl.pos, e.a, e.b) : e.d);

  const ratio = React.useMemo(() => {
    if (!prog) return null;
    return T.chapters.map((c) => {
      if (!c.lessons.length) return 0;
      let d = 0;
      c.lessons.forEach((l) => { if (prog[l.to]) d += 1; });
      return d / c.lessons.length;
    });
  }, [T, prog]);
  const hasProg = !!ratio && ratio.some((r) => r > 0);
  const progOn = hasProg && showProg;
  const ready = React.useMemo(() => {
    if (!hasProg) return new Set();
    const s = new Set();
    T.chapters.forEach((c) => {
      if (ratio[c.i] >= 1) return;
      if (c.preds.every((p) => ratio[p.i] >= READY_RATIO)) s.add(c.i);
    });
    return s;
  }, [T, ratio, hasProg]);

  /* ---------- 搜索 ---------- */
  const sugs = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const num = /^\d+$/.test(s) ? Number(s) : null;
    return T.chapters
      .filter((c) => (num !== null ? c.n === num : (c.short + ' ' + c.title).toLowerCase().includes(s)))
      .slice(0, 8);
  }, [T, q]);
  const chooseSug = (c) => {
    if (!c) return;
    setQ('');
    setSugIdx(0);
    pick(c.i, { scroll: true });
  };

  /* ---------- 键盘：方向键在图上走 ---------- */
  const neighbor = (i, key) => {
    const c = T.chapters[i];
    const sameLevel = T.chapters.filter((d) => d.lvl === c.lvl).sort((a, b) => a.x - b.x);
    const nearestIn = (l) => {
      const row = T.chapters.filter((d) => d.lvl === l);
      if (!row.length) return null;
      return row.reduce((b, d) => (Math.abs(d.x - c.x) < Math.abs(b.x - c.x) ? d : b), row[0]).i;
    };
    if (key === 'ArrowUp') return c.critPred >= 0 ? c.critPred : nearestIn(c.lvl - 1);
    if (key === 'ArrowDown') {
      const kids = c.succs.filter((s) => T.chapters[s.i].critPred === i);
      return kids.length ? kids[0].i : (c.succs[0] ? c.succs[0].i : nearestIn(c.lvl + 1));
    }
    const k = sameLevel.findIndex((d) => d.i === i);
    if (key === 'ArrowLeft') return k > 0 ? sameLevel[k - 1].i : null;
    if (key === 'ArrowRight') return k + 1 < sameLevel.length ? sameLevel[k + 1].i : null;
    return null;
  };
  const onNodeKey = (e, i) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      history.push(T.chapters[i].to);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pick(sel === i ? null : i);
    } else if (e.key === 'Escape') {
      pick(null);
    } else if (e.key.startsWith('Arrow')) {
      const j = neighbor(i, e.key);
      if (j == null) return;
      e.preventDefault();
      if (sel != null) setSel(j);
      setHover(j);
      if (nodeRefs.current[j]) nodeRefs.current[j].focus({ preventScroll: true });
      scrollToNode(j);
    }
  };

  /* ---------- 画 ---------- */
  const delay = (l, k) => (grown && !settled ? `${(l * 0.1 + (k % 7) * 0.025).toFixed(3)}s` : '0s');
  const baseEdges = mode === 'all' ? T.edges : T.edges.filter((e) => e.red);
  const shownEdges = fl ? baseEdges.filter((e) => fl.pos[e.a] && fl.pos[e.b]) : baseEdges;
  const volDim = (i) => vol != null && T.chapters[i].vol !== vol;

  const hlEdges = [];
  if (cl) {
    T.edges.forEach((e) => {
      const key = e.a + '>' + e.b;
      const onChain = chainSet.has(key);
      if (!onChain && mode !== 'all' && !e.red) return;
      if (onChain) hlEdges.push({ e, cls: 'is-chain', k: 3 });
      else if (cl.up.has(e.a) && cl.up.has(e.b)) hlEdges.push({ e, cls: 'is-up', k: 1 });
      else if (cl.down.has(e.a) && cl.down.has(e.b)) hlEdges.push({ e, cls: 'is-down', k: 2 });
    });
    hlEdges.sort((p, q2) => p.k - q2.k);
  }

  const nodeState = (i) => {
    if (cl) {
      if (i === focus) return ' is-hot';
      if (chainNodes.has(i)) return ' is-chain';
      if (cl.up.has(i)) return ' is-up';
      if (cl.down.has(i)) return ' is-down';
      return fl ? ' is-off' : ' is-dim';
    }
    if (volDim(i)) return ' is-dim';
    return '';
  };

  const fc = focus != null ? T.chapters[focus] : null;
  const volInfo = (v) => VOLUMES[v] || { n: '卷' + (v + 1), title: '' };

  return (
    <div className={'ml-ht' + (grown ? ' is-grown' : '') + (settled ? ' is-settled' : '')} ref={wrapRef}>
      {/* ---------- 工具条 ---------- */}
      <div className="ml-ht__tools">
        <div className="ml-ht__search">
          <input
            type="search"
            value={q}
            placeholder="搜一章：傅里叶、Transformer、13…"
            aria-label="按章名或章号搜索"
            onChange={(e) => { setQ(e.target.value); setSugIdx(0); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSugIdx((k) => Math.min(sugs.length - 1, k + 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setSugIdx((k) => Math.max(0, k - 1)); }
              else if (e.key === 'Enter') { e.preventDefault(); chooseSug(sugs[sugIdx] || sugs[0]); }
              else if (e.key === 'Escape') setQ('');
            }}
          />
          {sugs.length ? (
            <ul className="ml-ht__sugs" role="listbox">
              {sugs.map((c, k) => (
                <li key={c.i} role="option" aria-selected={k === sugIdx}>
                  <button
                    type="button"
                    className={k === sugIdx ? 'is-on' : ''}
                    onMouseDown={(e) => { e.preventDefault(); chooseSug(c); }}
                  >
                    <i style={{ background: volVar(c.vol) }} />
                    <span className="ml-ht__sugn">{String(c.n).padStart(2, '0')}</span>
                    {c.title}
                    <span className="ml-ht__sugl">{c.lvl ? `第 ${c.lvl} 代` : '根'}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="ml-ht__vols" role="group" aria-label="按卷高亮">
          {VOLUMES.map((v, k) => {
            const n = T.chapters.filter((c) => c.vol === k).length;
            if (!n) return null;
            return (
              <button
                key={v.n}
                type="button"
                className={'ml-ht__vol' + (vol === k ? ' is-on' : '')}
                style={{ '--c': volVar(k) }}
                aria-pressed={vol === k}
                title={`${v.n} · ${v.title}（${n} 章）——再点一次取消`}
                onClick={() => { setVol(vol === k ? null : k); pick(null); }}
              >
                <i />{v.n}
              </button>
            );
          })}
        </div>

        <div className="ml-ht__seg" role="group" aria-label="连线密度">
          <button type="button" className={mode === 'skel' ? 'is-on' : ''} aria-pressed={mode === 'skel'}
            title={`只画推不出来的那 ${T.stats.skeleton} 条（A→B 若还能经别章绕到，就省掉）`}
            onClick={() => setMode('skel')}>骨架</button>
          <button type="button" className={mode === 'all' ? 'is-on' : ''} aria-pressed={mode === 'all'}
            title={`全部 ${T.stats.edges} 条章间依赖`} onClick={() => setMode('all')}>全部依赖</button>
        </div>

        {hasProg ? (
          <button type="button" className={'ml-ht__tbtn' + (showProg ? ' is-on' : '')} aria-pressed={showProg}
            onClick={() => setShowProg((v) => !v)} title="每章底边画出已学比例；先修都过半的未学完章标小红点">
            我的进度
          </button>
        ) : null}

        <div className="ml-ht__zoom" role="group" aria-label="缩放">
          <button type="button" onClick={() => zoomTo((s) => s / 1.2)} aria-label="缩小">－</button>
          <button type="button" onClick={() => { userZoomed.current = false; setScale(fitScale()); }} title="铺满宽度">
            {Math.round(scale * 100)}%
          </button>
          <button type="button" onClick={() => zoomTo((s) => s * 1.2)} aria-label="放大">＋</button>
        </div>
        <button type="button" className="ml-ht__tbtn" onClick={replay} title="从根重新长一遍">↻ 重播</button>
      </div>

      {/* ---------- 地图 ---------- */}
      <div className={'ml-ht__map' + (panelOpen ? ' has-panel' : '')}>
        <div
          className="ml-ht__vp"
          ref={vpRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          onScroll={(e) => {
            const down = e.currentTarget.scrollTop > 160;
            setCompact((v) => (v === down ? v : down));
          }}
          onClick={() => {
            /* 章节的点击已 stopPropagation，走到这里的都是点在空白处：拖过就不算点 */
            if (!moved.current) pick(null);
          }}
        >
          <div className="ml-ht__canvas" style={{ paddingRight: overlay && panelOpen && sel != null ? PANEL_W : 0 }}>
          <svg
            className="ml-ht__svg"
            viewBox={`0 0 ${drawW} ${T.height}`}
            width={Math.round(drawW * scale)}
            height={Math.round(T.height * scale)}
            role="group"
            aria-label={`章级知识树：${T.stats.chapters} 章分 ${T.stats.generations} 代，从算术四则一路长到前沿；方向键在章节间移动，回车钉住，Shift+回车进入`}
          >
            {/* 代标尺与横带 */}
            <g className="ml-ht__bands" aria-hidden="true">
              {T.levels.map((L) => (
                <g key={L.l}>
                  <rect
                    x={0}
                    y={L.y - G.ROW / 2}
                    width={drawW}
                    height={G.ROW}
                    className={L.l % 2 ? 'ml-ht__band is-odd' : 'ml-ht__band'}
                  />
                  <text x={G.LEFT - 10} y={L.y + 4} textAnchor="end" className="ml-ht__gen">
                    {L.l === 0 ? '根' : `${L.l} 代`}
                  </text>
                </g>
              ))}
              <line x1={G.LEFT} x2={G.LEFT} y1={8} y2={T.height - 8} className="ml-ht__rule" />
            </g>

            {/* 底层连线 */}
            <g className={'ml-ht__edges' + (cl || vol != null ? ' is-muted' : '')} aria-hidden="true">
              {shownEdges.map((e) => (
                <path
                  key={e.a + '>' + e.b}
                  d={dOf(e)}
                  pathLength={1}
                  className={'ml-ht__e' + (e.red ? '' : ' is-implied') +
                    (vol != null && !cl && (T.chapters[e.a].vol === vol || T.chapters[e.b].vol === vol) ? ' is-vol' : '')}
                  style={{
                    stroke: volVar(T.chapters[e.a].vol),
                    strokeWidth: edgeWidth(e.w),
                    transitionDelay: delay(T.chapters[e.b].lvl, e.b),
                  }}
                />
              ))}
            </g>

            {/* 聚焦时的血缘线，画在最上层 */}
            {cl ? (
              <g className="ml-ht__hl" aria-hidden="true">
                {hlEdges.map(({ e, cls }) => (
                  <path
                    key={'h' + e.a + '>' + e.b}
                    d={dOf(e)}
                    className={'ml-ht__he ' + cls}
                    style={{ strokeWidth: edgeWidth(e.w) + (cls === 'is-chain' ? 1.6 : 0.5) }}
                  />
                ))}
              </g>
            ) : null}

            {/* 章 */}
            <g className="ml-ht__nodes">
              {T.chapters.map((c, k) => {
                const r = ratio ? ratio[c.i] : 0;
                const p = posOf(c);
                const label = fitText(c.short, G.W - 22 - (c.count > 9 ? 13 : 7));
                return (
                  <g
                    key={c.n}
                    ref={(el) => { nodeRefs.current[c.i] = el; }}
                    className={'ml-ht__n' + nodeState(c.i) + (sel === c.i ? ' is-pinned' : '')}
                    transform={`translate(${p.x - G.W / 2} ${p.y - G.H / 2})`}
                    style={{ '--c': volVar(c.vol) }}
                    tabIndex={0}
                    role="button"
                    aria-pressed={sel === c.i}
                    aria-label={`第 ${c.n} 章 ${c.title}，第 ${c.lvl} 代，${c.count} 课`}
                    onMouseEnter={() => setHover(c.i)}
                    onMouseLeave={() => setHover((h) => (h === c.i ? null : h))}
                    onFocus={() => setHover(c.i)}
                    onBlur={() => setHover((h) => (h === c.i ? null : h))}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (moved.current) return;
                      pick(sel === c.i ? null : c.i);
                    }}
                    onDoubleClick={() => history.push(c.to)}
                    onKeyDown={(e) => onNodeKey(e, c.i)}
                  >
                    <g className="ml-ht__reveal" style={{ transitionDelay: delay(c.lvl, k) }}>
                      <rect className="ml-ht__nshadow" x={3} y={3} width={G.W} height={G.H} rx={6} />
                      <rect className="ml-ht__nbox" width={G.W} height={G.H} rx={6} />
                      <path className="ml-ht__nstripe" d={`M6 0 H10 V${G.H} H6 A6 6 0 0 1 0 ${G.H - 6} V6 A6 6 0 0 1 6 0 Z`} />
                      <text x={15} y={G.H / 2 + 4.4} className="ml-ht__nlabel">{label}</text>
                      <text x={G.W - 7} y={G.H / 2 + 4} textAnchor="end" className="ml-ht__ncount">{c.count}</text>
                      {progOn && r > 0 ? (
                        <rect className={'ml-ht__nprog' + (r >= 1 ? ' is-full' : '')} x={10} y={G.H - 3.2}
                          width={Math.max(2, (G.W - 16) * r)} height={2.4} rx={1.2} />
                      ) : null}
                      {progOn && ready.has(c.i) ? <circle className="ml-ht__nready" cx={G.W - 1} cy={1} r={4.2} /> : null}
                      <title>{`第 ${c.n} 章 · ${c.title}\n第 ${c.lvl} 代（至少 ${c.lvl} 步先修）· ${c.count} 课 · 先修 ${c.preds.length} 章 · 直接托起 ${c.succs.length} 章\n点击钉住，双击进入`}</title>
                    </g>
                  </g>
                );
              })}
            </g>
          </svg>
          </div>
        </div>

        {/* ---------- 面板 ---------- */}
        <aside
          className={'ml-ht__panel' + (panelOpen ? '' : ' is-closed') +
            (overlay && compact && !fc && panelOpen ? ' is-mini' : '')}
          aria-live="polite"
        >
          <button type="button" className="ml-ht__pclose" onClick={() => setPanelOpen((v) => !v)}
            aria-expanded={panelOpen} title={panelOpen ? '收起面板，地图全宽' : '展开面板'}>
            {panelOpen ? '收起 ›' : '‹ 面板'}
          </button>
          {panelOpen && overlay && compact && !fc ? (
            <button type="button" className="ml-ht__mini" onClick={() => setCompact(false)}>
              ⓘ 全站地图 · 图例
            </button>
          ) : null}
          {panelOpen && !(overlay && compact && !fc) ? (fc ? (
            <ChapterPanel
              T={T}
              c={fc}
              pinned={sel === fc.i}
              chain={chain}
              cl={cl}
              ratio={ratio}
              prog={prog}
              progOn={progOn}
              volInfo={volInfo(fc.vol)}
              allLessons={allLessons}
              setAllLessons={setAllLessons}
              onPick={(i) => pick(i, { scroll: true })}
              onClear={() => pick(null)}
            />
          ) : (
            <OverviewPanel T={T} ratio={ratio} hasProg={hasProg} ready={ready} onPick={(i) => pick(i, { scroll: true })} />
          )) : null}
        </aside>
      </div>
    </div>
  );
}

function Chip({ T, i, onPick, extra, cls }) {
  const c = T.chapters[i];
  return (
    <button type="button" className={'ml-ht__chip' + (cls ? ' ' + cls : '')} style={{ '--c': volVar(c.vol) }}
      onClick={() => onPick(i)} title={`第 ${c.n} 章 · ${c.title}`}>
      <i />{c.short}{extra ? <small>{extra}</small> : null}
    </button>
  );
}

function OverviewPanel({ T, ratio, hasProg, ready, onPick }) {
  const S = T.stats;
  const doneCh = hasProg ? ratio.filter((r) => r >= 1).length : 0;
  const readyList = hasProg ? [...ready].sort((a, b) => T.chapters[a].lvl - T.chapters[b].lvl).slice(0, 8) : [];
  const deepest = T.chapters.filter((c) => c.lvl === T.maxL);
  return (
    <div className="ml-ht__pbody">
      <div className="ml-ht__kicker">全站地图</div>
      <div className="ml-ht__big">{S.chapters} 章 · {S.lessons} 课</div>
      <p className="ml-ht__p">
        课与课之间 {S.lessonEdges} 条先修线，投到章上是 {S.edges} 条；去掉「绕得过去」的，骨架剩 {S.skeleton} 条。
        从算术四则到最深处要走 <strong>{T.maxL}</strong> 步（{deepest.map((c) => c.short).join('、')}）。
      </p>
      <ul className="ml-ht__how">
        <li><b>一行 = 一代</b>：第 n 代的章，至少要先走完 n 步先修</li>
        <li><b>悬停</b>看血缘，<b>点击</b>钉住，<b>双击</b>进入本章</li>
        <li>线的颜色是出发那章的卷色，粗细是投上来的课级先修条数</li>
      </ul>
      <div className="ml-ht__legend">
        <span><i className="ml-ht__lg is-up" />先修</span>
        <span><i className="ml-ht__lg is-down" />托起</span>
        <span><i className="ml-ht__lg is-chain" />最长先修链</span>
      </div>
      {hasProg ? (
        <div className="ml-ht__psec">
          <div className="ml-ht__ph">我的进度 · 已学完 {doneCh} 章</div>
          {readyList.length ? (
            <>
              <p className="ml-ht__p ml-ht__p--mute">先修都已过半、自己还没学完的章——下一步可以去这里：</p>
              <div className="ml-ht__chips">
                {readyList.map((i) => <Chip key={i} T={T} i={i} onPick={onPick} />)}
              </div>
            </>
          ) : <p className="ml-ht__p ml-ht__p--mute">把正在读的章读完，这里会给出下一步。</p>}
        </div>
      ) : (
        <p className="ml-ht__p ml-ht__p--mute">在课文页底标记「学完」后，这张图会叠上你的进度，并标出下一步可学的章。</p>
      )}
    </div>
  );
}

function ChapterPanel({ T, c, pinned, chain, cl, ratio, prog, progOn, volInfo, allLessons, setAllLessons, onPick, onClear }) {
  const r = ratio ? ratio[c.i] : 0;
  const lessons = allLessons ? c.lessons : c.lessons.slice(0, 8);
  return (
    <div className="ml-ht__pbody">
      <div className="ml-ht__kicker" style={{ '--c': volVar(c.vol) }}>
        <i />{volInfo.n} · {volInfo.title}　第 {String(c.n).padStart(2, '0')} 章
      </div>
      <div className="ml-ht__big">{c.title}</div>
      <div className="ml-ht__meta">
        <span>{c.lvl ? `第 ${c.lvl} 代` : '根 · 第 0 代'}</span>
        <span>{c.count} 课</span>
        <span className="is-up">↑ 先修 {cl.up.size - 1} 章</span>
        <span className="is-down">↓ 托起 {cl.down.size - 1} 章</span>
      </div>
      {progOn ? (
        <div className="ml-ht__pbar" title={`已学 ${Math.round(r * 100)}%`}><i style={{ width: `${Math.round(r * 100)}%` }} /></div>
      ) : null}

      {chain.length > 1 ? (
        <div className="ml-ht__psec">
          <div className="ml-ht__ph">最长先修链 · {chain.length - 1} 步</div>
          <div className="ml-ht__chain">
            {chain.map((i, k) => (
              <React.Fragment key={i}>
                {k ? <span className="ml-ht__arrow">→</span> : null}
                <Chip T={T} i={i} onPick={onPick} cls={i === c.i ? 'is-self' : ''} />
              </React.Fragment>
            ))}
          </div>
        </div>
      ) : (
        <p className="ml-ht__p ml-ht__p--mute">{c.i === T.root ? '这是根：全站的第一步。' : '不依赖任何一章，可以随时翻。'}</p>
      )}

      {c.preds.length ? (
        <div className="ml-ht__psec">
          <div className="ml-ht__ph">直接先修 · {c.preds.length} 章 <small>（数字＝课级先修条数）</small></div>
          <div className="ml-ht__chips">
            {c.preds.slice(0, 10).map((p) => <Chip key={p.i} T={T} i={p.i} onPick={onPick} extra={'×' + p.w} />)}
          </div>
        </div>
      ) : null}
      {c.succs.length ? (
        <div className="ml-ht__psec">
          <div className="ml-ht__ph">直接托起 · {c.succs.length} 章</div>
          <div className="ml-ht__chips">
            {c.succs.slice(0, 10).map((p) => <Chip key={p.i} T={T} i={p.i} onPick={onPick} extra={'×' + p.w} />)}
            {c.succs.length > 10 ? <span className="ml-ht__more">…还有 {c.succs.length - 10} 章</span> : null}
          </div>
        </div>
      ) : null}

      <div className="ml-ht__psec">
        <div className="ml-ht__ph">本章 {c.lessons.length} 课</div>
        <ol className="ml-ht__lessons">
          {lessons.map((l) => (
            <li key={l.to} className={prog && prog[l.to] ? 'is-done' : ''}>
              <Link to={l.to}>{l.title}</Link>
            </li>
          ))}
        </ol>
        {c.lessons.length > 8 ? (
          <button type="button" className="ml-ht__linkbtn" onClick={() => setAllLessons(!allLessons)}>
            {allLessons ? '收起' : `展开全部 ${c.lessons.length} 课`}
          </button>
        ) : null}
      </div>

      <div className="ml-ht__pbtns">
        <Link className="button button--sm button--primary" to={c.to}>进入本章 →</Link>
        {pinned ? (
          <button type="button" className="button button--sm button--secondary" onClick={onClear}>取消钉住</button>
        ) : <span className="ml-ht__hint">点击章节可钉住</span>}
      </div>
    </div>
  );
}
