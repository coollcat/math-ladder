/* =========================================================================
 * 知识图谱 · 章簇详图（/chapters）
 * -------------------------------------------------------------------------
 * /graph 是「一章一颗圆点」，这一页是「一章一个簇」：章是簇心，本章每一门课
 * 绕它排开，课级先修线（章内 + 跨章）都在。两张图共用同一套分层骨架——
 * 环分配与环内顺序都出自 ringLayout.chapterModel()，所以同一章的「第几环」
 * 在这里和在 /graph 永远一致。
 *
 * 为什么需要这一页：同心环能让人一眼看出「整门学问从圆心长出去」，但 78 颗
 * 圆点看不出**每一章到底讲了什么、章内怎么连**。这一页补的就是那段细节：
 * 1029 颗课点全在图上，圆心那一簇是第 0 章「Python 工具箱」。
 *
 * 三档细节 + 反向缩放（这是本页唯一的「技巧」，改之前先读）：
 *   整张图铺开是 1778×1778 用户单位，一屏放不下，一缩放文字就会跟着糊。
 *   所以**文字全部做反向缩放**：标签挂在一个 data-lx/data-ly 的 <g> 上，
 *   缩放时只改它的 scale(1/k)，文字在屏幕上永远是 12px，滚到哪都读得清。
 *   于是细节分档不再靠字号，只靠「露不露」：
 *     k < 0.62（远）—— 只留环带 + 章簇圆盘 + 卷色，章名/章号一律收起
 *                       （78 个标签挤在 620px 里必然叠成一团）；
 *     k ≥ 0.62（近）—— 章名 + 章号出场；课点一直是画的（远了就是纹理）。
 *   反向缩放只跑在 rAF 里、只写 transform，不进 React 状态——悬停/缩放都不
 *   重建 1029 个课点的 DOM（同 KnowledgeGraphTree 的做法）。
 *
 * 悬停/选中全走直接 DOM 改 class，不进 React；只有「点选某一章」才重建一次
 * （要新画那一章的课名标签与课级连线）。
 * ========================================================================= */

import React from 'react';
import Link from '@docusaurus/Link';
import { useHistory } from '@docusaurus/router';
import { NODES, EDGES, DEPTH } from './full-graph-data.js';
import { allChapterGroups } from './data.js';
import { clusterLayout, chapterEdgePath, curve, ringDiffLabel } from './clusterLayout.js';

/* ---- 缩放区间与细节阈值 ----
 * MIN_K 取 0.18 而不是「看着差不多」的 0.24：窄屏（430px）舞台上算出来的全览比例是
 * 0.219，卡在 0.24 会让「全览」按钮也装不下整张图——按钮承诺了全览就得真全览。
 * 上限 2.4 差不多是「一章的簇铺满一屏」的程度，再大没信息增量。 */
const MIN_K = 0.18;
const MAX_K = 2.4;
const NEAR_K = 0.62; /* ≥ 这一档才露章名/章号 */
const DOT_R = 2.6; /* 与 clusterLayout.CC.dotR 一致 */

/* ---- 入场动画 ----
 * 挂在 svg 根的 is-enter 上：只做透明度错峰 + 描边生长，**不碰 transform/几何**——
 * 验收脚本用 getBoundingClientRect 量「全览装得下」，动画若改 transform 会在
 * 半程量到假尺寸。ENTER_MS 要盖住最长的 delay+duration（环 6 ≈ 0.12+6×0.11+0.55 ≈ 1.3s）。
 * 到点后摘掉 is-enter：body 在点选/开关时会整个重建，不摘的话每点一章整张图重播一遍入场。 */
const ENTER_MS = 1500;

/* ---- 布局：模块级算一次（纯函数，不依赖 DOM） ---- */
function buildModel() {
  const flat = [];
  allChapterGroups().forEach((g, vi) => g.chapters.forEach((c) => flat.push({ ...c, vi })));
  return clusterLayout(NODES, EDGES, DEPTH, flat);
}
const L = buildModel();

/** 卷下标（0 起）→ 卷色变量。名字必须与 home.css 里 .ml-cc 作用域的 --cc-v1…7 对上
 *  （对不上时 color-mix 拿不到值，整盘 fill 会静默退化成初始值黑色——踩过一次）。 */
const volColor = (vi) => `var(--cc-v${(vi ?? 0) + 1})`;

/** 圆心簇（第 0 章）没有环号，单独给个说法，别让后端面板读出「第 0 环」。 */
const ringTextOf = (c) =>
  c.ring < 0 ? '圆心（工具底座，不参与先修分层）' : `第 ${c.ring + 1} 环 · ${L.rings[c.ring].name} · ${ringDiffLabel(L.rings[c.ring])}`;

export default function ChapterClusterGraph() {
  const history = useHistory();
  const [hot, setHot] = React.useState(null);
  const [picked, setPicked] = React.useState(null);
  const [q, setQ] = React.useState('');
  const [names, setNames] = React.useState(true); /* 章名开关 */
  const [weak, setWeak] = React.useState(false); /* 单课支撑的交叉引用 */
  const [dots, setDots] = React.useState(true); /* 课点显隐 */
  const [outline, setOutline] = React.useState(true);
  const [zoomPct, setZoomPct] = React.useState(100);
  const [enter, setEnter] = React.useState(true); /* 入场动画只播首次，见 ENTER_MS 注释 */

  const svgRef = React.useRef(null);
  const gRef = React.useRef(null);
  const tipRef = React.useRef(null);
  const view = React.useRef({ x: 0, y: 0, k: 0.4 });
  const drag = React.useRef({ on: false, sx: 0, sy: 0, vx: 0, vy: 0, moved: false });
  const raf = React.useRef(0);

  /* 焦点：点选优先于悬停（鼠标移开后面板还留着刚点的那一章） */
  const focus = picked ?? hot;

  /* 窄屏默认收起目录（画布优先） */
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(max-width: 996px)').matches) setOutline(false);
  }, []);

  /* 入场动画到点后摘 is-enter（SSR 下 setTimeout 不跑，摘不摘都到不了客户端动画） */
  React.useEffect(() => {
    if (!enter) return undefined;
    const t = window.setTimeout(() => setEnter(false), ENTER_MS);
    return () => window.clearTimeout(t);
  }, [enter]);

  /* ---- 视图：平移缩放 + 文字反向缩放 ---- */
  const applyView = React.useCallback((updatePct) => {
    const g = gRef.current;
    if (!g) return;
    const v = view.current;
    g.setAttribute('transform', `translate(${v.x} ${v.y}) scale(${v.k})`);
    /* 反向缩放：所有标签在屏幕上保持 12px 左右，缩放时只改这一个属性。
       clamp 到 [0.5, 3]：放太大时标签不至于缩成蚂蚁，放太小时也不至于糊满屏。 */
    const s = Math.min(3, Math.max(0.5, 1 / v.k));
    g.querySelectorAll('[data-lx]').forEach((el) => {
      el.setAttribute('transform', `translate(${el.dataset.lx} ${el.dataset.ly}) scale(${s})`);
    });
    g.classList.toggle('is-far', v.k < NEAR_K);
    const tip = tipRef.current;
    if (tip) tip.setAttribute('data-k', String(v.k));
    if (updatePct) setZoomPct(Math.round(v.k * 100));
  }, []);

  const scheduleView = React.useCallback(() => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      applyView(true);
    });
  }, [applyView]);

  /** 以给定用户坐标为不动点缩放 */
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
      else applyView(true);
    },
    [applyView, scheduleView],
  );

  /* 全览：按舞台短边算出「整张图正好塞满」的比例 */
  const fitView = React.useCallback(
    (silent) => {
      const svg = svgRef.current;
      const v = view.current;
      v.x = 0;
      v.y = 0;
      v.k = 1;
      if (svg) {
        const r = svg.getBoundingClientRect();
        const s = Math.min(r.width, r.height) / L.size;
        if (s > 0) v.k = Math.min(MAX_K, Math.max(MIN_K, s * 0.98));
      }
      applyView(true);
      if (!silent) setZoomPct(Math.round(v.k * 100));
    },
    [applyView],
  );

  /* 100%：一屏看内圈三环，字最清楚 */
  const resetView = React.useCallback(() => {
    view.current = { x: 0, y: 0, k: 1 };
    applyView(true);
  }, [applyView]);

  /** 把某一簇摆到视口正中 */
  const centerOn = React.useCallback(
    (n, k) => {
      const c = L.clusters.get(n);
      if (!c) return;
      const v = view.current;
      v.k = Math.min(MAX_K, Math.max(MIN_K, k || v.k));
      v.x = -c.x * v.k;
      v.y = -c.y * v.k;
      applyView(true);
    },
    [applyView],
  );

  React.useEffect(() => () => {
    if (raf.current) cancelAnimationFrame(raf.current);
  }, []);

  /* ---- 拖拽 + 滚轮缩放（监听器只挂一次，内部全走 ref 拿最新闭包） ---- */
  React.useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;

    /* 屏幕坐标 → 用户坐标。viewBox 是正方形而元素宽高比不是，
       preserveAspectRatio 会按短边缩放并居中，换算必须带上这层缩放与偏移。 */
    const toUser = (ev) => {
      const r = svg.getBoundingClientRect();
      const s = Math.min(r.width, r.height) / L.size;
      if (!s) return { x: 0, y: 0 };
      const offX = (r.width - L.size * s) / 2;
      const offY = (r.height - L.size * s) / 2;
      return {
        x: (ev.clientX - r.left - offX) / s - L.size / 2,
        y: (ev.clientY - r.top - offY) / s - L.size / 2,
      };
    };

    const onDown = (e) => {
      drag.current = { on: true, sx: e.clientX, sy: e.clientY, vx: view.current.x, vy: view.current.y, moved: false };
      try {
        svg.setPointerCapture(e.pointerId);
      } catch {
        /* 老浏览器不支持指针捕获：退化成普通拖拽 */
      }
    };
    const onMove = (e) => {
      const d = drag.current;
      if (!d.on) return;
      const r = svg.getBoundingClientRect();
      const s = Math.min(r.width, r.height) / L.size || 1;
      const dx = (e.clientX - d.sx) / s;
      const dy = (e.clientY - d.sy) / s;
      if (Math.abs(dx) + Math.abs(dy) > 2) d.moved = true;
      /* 平移夹取：内容边界不许被甩出视口（甩没了只能刷新页面） */
      const lim = (L.size / 2) * Math.max(0.6, view.current.k);
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
      zoomAt(p.x, p.y, 1.7);
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

  /* 首次挂载：全览 */
  React.useEffect(() => {
    fitView();
    const onResize = () => applyView(false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [fitView, applyView]);

  /* ---- 课点悬停提示：不进 React，直接改那个 <g> ---- */
  React.useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const hide = () => {
      const tip = tipRef.current;
      if (tip) tip.style.display = 'none';
    };
    const onOver = (e) => {
      const dot = e.target && e.target.closest ? e.target.closest('.ml-cc__dot') : null;
      hide();
      if (!dot || !tipRef.current) return;
      const i = Number(dot.dataset.i);
      const node = NODES[i];
      if (!node) return;
      const cx = Number(dot.getAttribute('cx'));
      const cy = Number(dot.getAttribute('cy'));
      const tip = tipRef.current;
      const text = tip.querySelector('.ml-cc__tiptext');
      const bg = tip.querySelector('.ml-cc__tipbg');
      text.textContent = `${node.ch} 章 · ${node.title}`;
      tip.style.display = '';
      /* 挂在圆点正上方：data-lx/ly 一交给 applyView 那套反向缩放，缩放时位置自动跟手 */
      tip.setAttribute('data-lx', String(cx));
      tip.setAttribute('data-ly', String(cy - 16));
      const k = Number(tip.getAttribute('data-k')) || view.current.k;
      tip.setAttribute('transform', `translate(${cx} ${cy - 16}) scale(${Math.min(3, Math.max(0.5, 1 / k))})`);
      const box = text.getBBox();
      bg.setAttribute('x', String(box.x - 7));
      bg.setAttribute('y', String(box.y - 4));
      bg.setAttribute('width', String(box.width + 14));
      bg.setAttribute('height', String(box.height + 8));
      bg.setAttribute('rx', '4');
    };
    svg.addEventListener('pointerover', onOver);
    svg.addEventListener('pointerout', hide);
    return () => {
      svg.removeEventListener('pointerover', onOver);
      svg.removeEventListener('pointerout', hide);
    };
  }, []);

  /* ---- 搜索：章名 + 课名都搜（读者记得住的往往是一门课） ---- */
  const ql = q.trim().toLowerCase();
  const hits = React.useMemo(() => {
    if (!ql) return null;
    const set = new Set();
    const lessons = new Map();
    let count = 0;
    L.clusters.forEach((c) => {
      const byName =
        c.title.toLowerCase().includes(ql) ||
        c.short.toLowerCase().includes(ql) ||
        String(c.n) === ql ||
        String(c.n).padStart(2, '0') === ql;
      const hit = c.lessons.map((l) => NODES[l.i]).filter((l) => String(l.title).toLowerCase().includes(ql));
      if (byName || hit.length) {
        set.add(c.n);
        count += 1;
        if (hit.length) lessons.set(c.n, hit.slice(0, 6));
      }
    });
    return count ? { set, lessons, count } : null;
  }, [ql]);

  /* ---- 焦点关系（先修 = 绿、托起 = 橙），与 /graph 同一套语义色 ----
   * 注意这里用**全部**章级边，不用只有 ≥2 门课支撑的强边：下面的面板把这一章的
   * 先修/托起**全列出来**，高亮就得跟面板一一对上。原先只认强边，于是点了某一章
   * 会出现「面板写着先修（3），画布上却一个绿簇都没有」这种自相矛盾（50 章正是如此，
   * 它的 3 条先修全是单课支撑的弱边）。线画不画是 weak 开关的事，关系本身不因为是
   * 单课引用就不存在。 */
  const rel = React.useMemo(() => {
    if (focus == null) return null;
    const up = new Set();
    const down = new Set();
    L.chapterEdges.forEach((e) => {
      if (e.a === focus) down.add(e.b);
      if (e.b === focus) up.add(e.a);
    });
    return { up, down };
  }, [focus]);

  /* ---- 画布内容：只在「内容真的变了」时重建（悬停不进这里） ---- */
  const body = React.useMemo(() => {
    const hitSet = hits ? hits.set : null;
    const edges = weak ? L.chapterEdges : L.strongEdges;
    return (
      <>
        {/* 环带：环线 + 环号水印（水印画在簇的底层，被压住也没关系） */}
        <g className="ml-cc__rings">
          {L.rings.map((ring, ri) => (
            <React.Fragment key={ring.ri}>
              <circle className="ml-cc__ring" r={ring.ringR} />
              <text className="ml-cc__ringnum" y={-ring.ringR + 30} textAnchor="middle">
                {ri + 1}
              </text>
            </React.Fragment>
          ))}
        </g>

        {/* 章级先修线（默认只画强先修） */}
        <g className="ml-cc__edges">
          {edges.map((e) => (
            <path
              key={`${e.a}-${e.b}`}
              className={'ml-cc__edge' + (e.strong ? '' : ' is-weak')}
              d={chapterEdgePath(L, e)}
              data-a={e.a}
              data-b={e.b}
              pathLength={1}
            />
          ))}
        </g>

        {/* 点选某一章时，把这一章的课级连线全画出来（章内短弧 + 跨章长弧） */}
        {picked != null &&
          (() => {
            const c = L.clusters.get(picked);
            if (!c) return null;
            const paths = [];
            const seen = new Set();
            c.lessons.forEach(({ i }) => {
              const A = L.lessonPos.get(i);
              if (!A) return;
              [...L.up[i], ...L.down[i]].forEach((j) => {
                const key = i < j ? `${i}-${j}` : `${j}-${i}`;
                if (seen.has(key)) return;
                seen.add(key);
                const B = L.lessonPos.get(j);
                if (!B) return;
                const inside = B.ch === c.n;
                paths.push(
                  <path
                    key={key}
                    className={'ml-cc__ledge' + (inside ? ' is-in' : '')}
                    d={curve(A.x, A.y, B.x, B.y, inside ? 0 : 30)}
                  />,
                );
              });
            });
            return <g className="ml-cc__ledges">{paths}</g>;
          })()}

        {/* 章簇 */}
        <g className="ml-cc__clusters">
          {[...L.clusters.values()].map((c) => {
            const color = volColor(c.vi);
            return (
              <g
                key={c.n}
                className={'ml-cc__cluster' + (hitSet && hitSet.has(c.n) ? ' is-hit' : '')}
                data-ch={c.n}
                style={{ '--cc-ri': String((c.ring ?? -1) + 1) }}
                onMouseEnter={() => setHot(c.n)}
                onMouseLeave={() => setHot(null)}
                onClick={() => {
                  setPicked(c.n);
                  centerOn(c.n, Math.max(view.current.k, 1.1));
                }}
              >
                <title>{`第 ${c.n} 章 · ${c.title}（${c.count} 门课）`}</title>
                <circle className="ml-cc__disc" cx={c.x} cy={c.y} r={c.cr} style={{ '--cc-c': color }} />
                <circle className="ml-cc__hub" cx={c.x} cy={c.y} r={c.hubR} style={{ '--cc-c': color }} />
                <text
                  className="ml-cc__num"
                  x={c.x}
                  y={c.y + c.hubR * 0.36}
                  textAnchor="middle"
                  style={{ fontSize: `${Math.max(10, c.hubR * 0.92).toFixed(1)}px`, '--cc-c': color }}
                >
                  {c.n}
                </text>
                {dots && (
                  <g className="ml-cc__dots">
                    {c.lessons.map((l) => (
                      <circle
                        key={l.i}
                        className="ml-cc__dot"
                        cx={l.x}
                        cy={l.y}
                        r={DOT_R}
                        data-i={l.i}
                        style={{ '--cc-c': color }}
                      />
                    ))}
                  </g>
                )}
                {names && (
                  <g className="ml-cc__labelbox ml-cc__labelbox--name" data-lx={c.x} data-ly={c.labelY}>
                    <text className="ml-cc__label" textAnchor="middle">
                      {c.short}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>

        {/* 课点悬停提示（内容与位置在 DOM 里改） */}
        <g className="ml-cc__tip" ref={tipRef} style={{ display: 'none' }} data-k="1">
          <rect className="ml-cc__tipbg" />
          <text className="ml-cc__tiptext" textAnchor="middle" />
        </g>
      </>
    );
  }, [weak, dots, names, picked, hits, centerOn]);

  /* 重建后要重新贴一次视图（标签的反向缩放属性 React 管不到） */
  React.useEffect(() => {
    applyView(false);
  }, [body, applyView]);

  /* ---- 高亮：直接改 class，不重建 DOM ----
   * 必须排在 body 之后：body 一换（切弱边、关课点、点选另一章）就是一批全新的
   * 元素，class 得重新贴一遍，所以 deps 里带上 body。 */
  React.useEffect(() => {
    const g = gRef.current;
    if (!g) return;
    g.querySelectorAll('.is-hot,.is-up,.is-down,.is-off').forEach((el) => {
      el.classList.remove('is-hot', 'is-up', 'is-down', 'is-off');
    });
    if (focus == null) return;
    const { up, down } = rel || { up: new Set(), down: new Set() };
    g.querySelectorAll('.ml-cc__cluster').forEach((el) => {
      const n = Number(el.dataset.ch);
      if (n === focus) el.classList.add('is-hot');
      else if (up.has(n)) el.classList.add('is-up');
      else if (down.has(n)) el.classList.add('is-down');
      else el.classList.add('is-off');
    });
    g.querySelectorAll('.ml-cc__edge').forEach((el) => {
      const a = Number(el.dataset.a);
      const b = Number(el.dataset.b);
      if (b === focus) el.classList.add('is-up');
      else if (a === focus) el.classList.add('is-down');
      else el.classList.add('is-off');
    });
  }, [focus, rel, body]);

  const focusCluster = focus != null ? L.clusters.get(focus) : null;
  const relOf = (n) => {
    const up = [];
    const down = [];
    L.chapterEdges.forEach((e) => {
      if (e.b === n) up.push(e.a);
      if (e.a === n) down.push(e.b);
    });
    return { up: up.sort((a, b) => a - b), down: down.sort((a, b) => a - b) };
  };
  const nameOf = (n) => {
    const c = L.clusters.get(n);
    return c ? c.short : `${n} 章`;
  };

  return (
    <div className="ml-cc">
      <div className="ml-cc__bar">
        <input
          className="ml-cc__search"
          type="search"
          value={q}
          placeholder="搜索章节或课程：傅里叶 / 吉布斯 / 卡尔曼…"
          aria-label="搜索章节或课程"
          onChange={(e) => setQ(e.target.value)}
        />
        <label className="ml-cc__chip" title="章名标签（缩得太小时会自动收起，免得叠成一团）">
          <input type="checkbox" checked={names} onChange={(e) => setNames(e.target.checked)} /> 章名
        </label>
        <label className="ml-cc__chip" title="1029 颗课点：一颗＝一门课。关掉只看章簇结构">
          <input type="checkbox" checked={dots} onChange={(e) => setDots(e.target.checked)} /> 课点
        </label>
        <label className="ml-cc__chip" title="单课支撑的交叉引用（234 条），默认隐藏——它们不是层级关系">
          <input type="checkbox" checked={weak} onChange={(e) => setWeak(e.target.checked)} /> 交叉引用
        </label>
        <button
          type="button"
          className={'ml-cc__chip ml-cc__chip--btn' + (outline ? ' is-on' : '')}
          onClick={() => setOutline((v) => !v)}
          aria-pressed={outline}
        >
          目录
        </button>
        {(picked != null || ql) && (
          <button
            type="button"
            className="button button--sm button--secondary"
            onClick={() => {
              setPicked(null);
              setHot(null);
              setQ('');
              fitView();
            }}
          >
            显示全部
          </button>
        )}
        <span className="ml-cc__meta">
          {ql
            ? hits
              ? `${hits.count} 章命中（含课名）`
              : '无结果'
            : `${L.clusters.size} 章 · ${L.lessonCount} 门课 · 章级边 ${L.chapterEdges.length} 条（强 ${L.strongEdges.length}）`}
        </span>
      </div>

      <div className={'ml-cc__layout' + (outline ? ' has-outline' : '')}>
        <div className="ml-cc__stage">
          <svg
            ref={svgRef}
            className={'ml-cc__svg' + (enter ? ' is-enter' : '')}
            viewBox={`${-L.size / 2} ${-L.size / 2} ${L.size} ${L.size}`}
            role="img"
            aria-label={`章簇详图：${L.clusters.size} 章、${L.lessonCount} 门课，每章一簇`}
            onClick={(e) => {
              if (e.target.closest('.ml-cc__cluster')) return;
              setPicked(null);
            }}
          >
            <g ref={gRef} transform="translate(0 0) scale(1)">
              {body}
            </g>
          </svg>

          <div className="ml-cc__ctrls">
            <button type="button" title="放大（+）" onClick={() => zoomAt(0, 0, 1.35)}>
              ＋
            </button>
            <button type="button" title="缩小（−）" onClick={() => zoomAt(0, 0, 1 / 1.35)}>
              －
            </button>
            <button type="button" title="全览：整张图塞进一屏" onClick={() => fitView()}>
              ⌂
            </button>
            <button type="button" title="100%：一屏看内圈，字最清楚" onClick={resetView}>
              1:1
            </button>
            <span className="ml-cc__zoom">{zoomPct}%</span>
          </div>

          <p className="ml-cc__hint">
            <strong>一个圆盘＝一章</strong>，盘里的<strong>每一颗小点＝一门课</strong>（从朝外那个方向起、按课程顺序绕一圈）。
            <strong>半径＝层级</strong>（与知识图谱同一个第几环），<strong>颜色＝所属卷</strong>，圆心那一簇是第 0 章 Python 工具箱。
            悬停看先修（绿）与托起（橙），<strong>点一下某一章</strong>就把它的课级连线全画出来并把课表列到下面；
            拖动平移、滚轮缩放，缩到 62% 以下章名会自动收起（免得 78 个标签叠成一团）。
          </p>
        </div>

        {/* ---------- 目录侧栏：78 个圆盘不是导航界面，这份清单才是 ---------- */}
        {outline && (
          <nav className="ml-cc__outline" aria-label="章节目录（按环分组）">
            {L.center && (
              <div className="ml-cc__ogroup">
                <div className="ml-cc__ohead">
                  <i className="ml-cc__ringno">●</i>
                  <span className="ml-cc__oname">圆心 · 工具底座</span>
                </div>
                <ul className="ml-cc__olist">
                  <li>
                    <button
                      type="button"
                      className={'ml-cc__oitem' + (focus === L.center.n ? ' is-on' : '') + (hits && hits.set.has(L.center.n) ? ' is-hit' : '')}
                      onMouseEnter={() => setHot(L.center.n)}
                      onMouseLeave={() => setHot(null)}
                      onClick={() => {
                        setPicked(L.center.n);
                        centerOn(L.center.n, Math.max(view.current.k, 1.1));
                      }}
                    >
                      <span className="ml-cc__onum">{String(L.center.n).padStart(2, '0')}</span>
                      <span className="ml-cc__otitle">{L.center.short}</span>
                      <span className="ml-cc__ocount">{L.center.count}</span>
                    </button>
                  </li>
                </ul>
              </div>
            )}
            {L.rings.map((ring) => (
              <div key={ring.ri} className="ml-cc__ogroup">
                <div className="ml-cc__ohead">
                  <i className="ml-cc__ringno">{ring.ri + 1}</i>
                  <span className="ml-cc__oname">{ring.name}</span>
                  <span className="ml-cc__odiff">{ringDiffLabel(ring)}</span>
                </div>
                <ul className="ml-cc__olist">
                  {ring.members.map((m) => {
                    const on = focus === m.n;
                    const hit = hits && hits.set.has(m.n);
                    return (
                      <li key={m.n}>
                        <button
                          type="button"
                          className={'ml-cc__oitem' + (on ? ' is-on' : '') + (hit ? ' is-hit' : '')}
                          onMouseEnter={() => setHot(m.n)}
                          onMouseLeave={() => setHot(null)}
                          onClick={() => {
                            setPicked(m.n);
                            centerOn(m.n, Math.max(view.current.k, 1.1));
                          }}
                        >
                          <span className="ml-cc__onum">{String(m.n).padStart(2, '0')}</span>
                          <span className="ml-cc__otitle">{m.short}</span>
                          <span className="ml-cc__ocount">{m.count}</span>
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

      {/* ---------- 卷色图例 ---------- */}
      <div className="ml-cc__legend">
        <span className="ml-cc__legend-lead">颜色＝所属卷：</span>
        {allChapterGroups().map((g, i) => (
          <span key={g.n} className="ml-cc__lgitem">
            <i className="ml-cc__swatch" style={{ '--cc-c': volColor(i) }} />
            {g.n} {g.title}
            <em>{g.chapters.length} 章</em>
          </span>
        ))}
      </div>

      {/* ---------- 面板：选中/悬停那一章的详情 ---------- */}
      {focusCluster && (
        <div className="ml-cc__panel">
          <div className="ml-cc__phead">
            <h3>
              第 {focusCluster.n} 章 · {focusCluster.title}
            </h3>
            <p className="ml-cc__pmeta">
              {focusCluster.count} 门课 ·{' '}
              {focusCluster.ring < 0 ? ringTextOf(focusCluster) : `${ringTextOf(focusCluster)} · 难度 ${focusCluster.diff}`}
            </p>
          </div>

          <div className="ml-cc__pcols">
            <div className="ml-cc__pcol">
              <h4>先修（{relOf(focusCluster.n).up.length}）</h4>
              {relOf(focusCluster.n).up.length ? (
                <ul className="ml-cc__plist">
                  {relOf(focusCluster.n).up.map((n) => (
                    <li key={n}>
                      <button
                        type="button"
                        onClick={() => {
                          setPicked(n);
                          centerOn(n);
                        }}
                      >
                        <i className="ml-cc__onum">{String(n).padStart(2, '0')}</i> {nameOf(n)}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="ml-cc__pempty">没有（这一章是起点）</p>
              )}
            </div>
            <div className="ml-cc__pcol">
              <h4>托起（{relOf(focusCluster.n).down.length}）</h4>
              {relOf(focusCluster.n).down.length ? (
                <ul className="ml-cc__plist">
                  {relOf(focusCluster.n).down.map((n) => (
                    <li key={n}>
                      <button
                        type="button"
                        onClick={() => {
                          setPicked(n);
                          centerOn(n);
                        }}
                      >
                        <i className="ml-cc__onum">{String(n).padStart(2, '0')}</i> {nameOf(n)}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="ml-cc__pempty">没有（这一章是前沿）</p>
              )}
            </div>
          </div>

          <h4 className="ml-cc__ph4">本章课程（{focusCluster.count}）</h4>
          <ol className="ml-cc__plist ml-cc__plist--lessons">
            {focusCluster.lessons.map(({ i }) => (
              <li key={i}>
                <Link to={NODES[i].to}>{NODES[i].title}</Link>
              </li>
            ))}
          </ol>

          <div className="ml-cc__pactions">
            <button type="button" className="button button--sm button--primary" onClick={() => history.push(focusCluster.to)}>
              进入本章 →
            </button>
            {picked != null && (
              <button type="button" className="button button--sm button--secondary" onClick={() => setPicked(null)}>
                取消锁定
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
