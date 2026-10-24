/* =========================================================================
 * lab 组件：rag-retrieval-board —— RAG 的检索半场：问题落在哪，谁被捞出来
 * -------------------------------------------------------------------------
 * 演示什么：三段文档躺在同一张二维嵌入图里，问题向量由读者亲手拖。
 *   右下角实时排出"谁离问题最近"，前 k 段打上钩——这就是 RAG 第一步的全部。
 *   把问题拖到资料库外面（分布外提问），所有距离一起变成几十上百，
 *   冠军依然会被选出来，但它的"像不像"已经惨不忍睹：检索器永远会给你一个答案，
 *   它不会告诉你"库里没有"。
 *
 * 用法（第 48 章《RAG：先查资料再开口》动手实验）：
 *   { "type": "rag-retrieval-board",
 *     "title": "拖问题向量，看它捞回哪几段",
 *     "hint": "拖橙色的 q；虚线是前 k 名",
 *     "query": [2, 2],
 *     "k": 2 }
 *
 * 字段（都可省）：query 问题初值 / k 取几段（默认 2）/ docs 自定义文档
 *   （[{ label, x, y, text }]）/ height 画布高度（默认 340）。
 *
 * 五问：
 *   1. 动手量：拖问题向量 q —— 它就是"用户换一种问法"这件事的几何版本。
 *   2. 即时后果：排序榜、前 k 名虚线、冠军高亮一帧内全部换。
 *   3. 读数：逐段平方距离排序 + 冠军距离与"第二名/冠军"的比值，
 *      与正文那道例题的 1 / 13 / 5 逐位对得上（q=[2,2] → A 1.00 / C 5.00 / B 13.00）。
 *   4. 啊哈预设：「分布外提问」把 q 拖到 (10, 10)：冠军 A 的距离 113，比库内提问的 1
 *      大了两个量级，可用性靠这个数先亮红灯；「换一种问法」把 q 放到报销方向。
 *   5. 默认状态：q=[2,2]，冠军是年假那段（距离 1），一打开就是正文算过的那一帧。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, setSliderRow, buildToolbar,
  buildReadout, mkBtn, label, polyline, clamp, fmt, clearBg,
} from '../core.js';

/* 与正文例题同一座资料库（§4 那三段，坐标逐字照抄），
   这样 q=[2,2] 时读数 1 / 13 / 5 与课文的三笔算术逐位对得上。 */
const DEFAULT_DOCS = [
  { label: 'A', x: 2, y: 3, text: '年假 15 天' },
  { label: 'B', x: 0, y: 5, text: '报销流程' },
  { label: 'C', x: 4, y: 1, text: '会议室预定' },
];

const d2 = (u, v) => (u[0] - v[0]) ** 2 + (u[1] - v[1]) ** 2;

export default function render(host, spec) {
  const docs = (Array.isArray(spec.docs) && spec.docs.length >= 2 ? spec.docs : DEFAULT_DOCS)
    .filter((d) => d && Number.isFinite(Number(d.x)) && Number.isFinite(Number(d.y)))
    .map((d, i) => ({
      label: String(d.label || String.fromCharCode(65 + i)),
      x: Number(d.x),
      y: Number(d.y),
      text: d.text ? String(d.text) : '',
    }));
  const k = clamp(Math.round(Number(spec.k) || 2), 1, Math.min(4, docs.length));
  const q0 = Array.isArray(spec.query) && spec.query.length === 2 ? spec.query.map(Number) : [2, 2];
  const st = { q: [q0[0], q0[1]] };

  const cv = setupCanvas(host, spec.height || 340);
  const ro = buildReadout({
    '检索结果（平方距离升序）': '—',
    '冠军与距离': '—',
    '第二名 / 冠军': '—',
    '离资料库有多远': '—',
  });
  host.appendChild(ro.box);

  /* 世界窗口要给"分布外提问"留出空位，否则 q 拖出去就看不见了 */
  const WIN = { x0: -1.6, x1: 11, y0: -1.2, y1: 10.6 };
  const view = { S: 0, ox: 0, oy: 0, Y: (y) => y };

  function ranked() {
    return docs
      .map((d) => ({ ...d, d: d2(st.q, [d.x, d.y]) }))
      .sort((a, b) => a.d - b.d);
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    const padL = 30;
    const padR = 142;
    const padT = 22;
    const padB = 26;
    const S = Math.min((W - padL - padR) / (WIN.x1 - WIN.x0), (H - padT - padB) / (WIN.y1 - WIN.y0));
    const ox = padL - WIN.x0 * S;
    const X = (x) => ox + x * S;
    const Y = (y) => H - padB - (y - WIN.y0) * S;
    view.S = S;
    view.ox = ox;
    view.Y = Y;

    /* 网格与刻度 */
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = 0; gx <= WIN.x1; gx += 1) {
      ctx.moveTo(X(gx), Y(WIN.y1));
      ctx.lineTo(X(gx), Y(WIN.y0));
    }
    for (let gy = 0; gy <= WIN.y1; gy += 1) {
      ctx.moveTo(X(WIN.x0), Y(gy));
      ctx.lineTo(X(WIN.x1), Y(gy));
    }
    ctx.stroke();
    ctx.restore();
    [0, 5, 10].forEach((v) => {
      if (v <= WIN.x1) label(ctx, String(v), X(v), Y(WIN.y0) + 14, C.grid, { align: 'center', size: 9.5 });
      if (v <= WIN.y1) label(ctx, String(v), X(WIN.x0) - 6, Y(v) + 3, C.grid, { align: 'right', size: 9.5 });
    });

    const rows = ranked();
    const top = rows.slice(0, k);

    /* 前 k 名的连线（虚线） */
    top.forEach((r, i) => {
      ctx.save();
      ctx.strokeStyle = i === 0 ? C.ok : C.accent;
      ctx.globalAlpha = i === 0 ? 0.95 : 0.5;
      ctx.setLineDash(i === 0 ? [6, 4] : [3, 4]);
      ctx.lineWidth = i === 0 ? 2.2 : 1.5;
      ctx.beginPath();
      ctx.moveTo(X(st.q[0]), Y(st.q[1]));
      ctx.lineTo(X(r.x), Y(r.y));
      ctx.stroke();
      ctx.restore();
    });

    /* 文档点 */
    rows.forEach((r) => {
      const isTop = top.indexOf(r) === 0;
      const inTop = top.includes(r);
      ctx.fillStyle = isTop ? C.ok : inTop ? C.accent : C.named('gray');
      ctx.beginPath();
      ctx.arc(X(r.x), Y(r.y), isTop ? 7 : 5.2, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, r.label + ' ' + r.text, X(r.x) + 9, Y(r.y) - 6,
        isTop ? C.ok : C.fg, { size: 10.5, weight: isTop ? 600 : 400 });
      if (inTop) {
        label(ctx, 'd²=' + fmt(r.d, 2), X(r.x) + 9, Y(r.y) + 9, C.named('gray'), { size: 9.5 });
      }
    });

    /* 问题向量：橙色菱形 */
    const qx = X(st.q[0]);
    const qy = Y(st.q[1]);
    ctx.fillStyle = C.accent2;
    ctx.beginPath();
    ctx.moveTo(qx, qy - 9);
    ctx.lineTo(qx + 9, qy);
    ctx.lineTo(qx, qy + 9);
    ctx.lineTo(qx - 9, qy);
    ctx.closePath();
    ctx.fill();
    label(ctx, 'q 问题', qx + 12, qy + 4, C.accent2, { size: 11, weight: 600 });

    /* 右侧排序榜：名字、距离、是否进前 k——与读数重复一遍，但这一份是"看得见"的 */
    const listX = W - padR + 10;
    label(ctx, '检索排序（前 ' + k + ' 名打钩）', listX, padT + 8, C.fg, { size: 10.5 });
    rows.forEach((r, i) => {
      const y = padT + 30 + i * 22;
      const inTop = i < k;
      ctx.fillStyle = inTop ? (i === 0 ? C.ok : C.accent) : C.named('gray');
      ctx.globalAlpha = inTop ? 0.9 : 0.35;
      ctx.fillRect(listX, y - 8, 4, 14);
      ctx.globalAlpha = 1;
      label(ctx, (inTop ? '✔ ' : '　') + r.label + ' ' + r.text, listX + 9, y + 3,
        inTop ? C.fg : C.grid, { size: 10 });
      label(ctx, r.d < 100 ? r.d.toFixed(2) : r.d.toFixed(1), listX + 126, y + 3,
        inTop ? C.fg : C.grid, { size: 10, align: 'right' });
    });

    if (spec.hint) label(ctx, String(spec.hint), padL, H - 6, C.grid, { size: 10 });

    /* ---- 读数 ---- */
    const champ = rows[0];
    const second = rows[1];
    const spread = second ? second.d / Math.max(champ.d, 1e-9) : Infinity;
    /* 库内"挨得最近的两段"之间的距离，是判断"冠军离得算不算近"的现成标尺：
       比它还小 ⇒ 问题几乎就落在某段文档身上。 */
    let innerMin = Infinity;
    for (let i = 0; i < docs.length; i += 1) {
      for (let j = i + 1; j < docs.length; j += 1) {
        innerMin = Math.min(innerMin, d2([docs[i].x, docs[i].y], [docs[j].x, docs[j].y]));
      }
    }

    ro.set('检索结果（平方距离升序）',
      rows.map((r, i) => (i < k ? '✔' : '') + r.label + ' ' + fmt(r.d, 2)).join('　'));
    ro.set('冠军与距离', champ.label + '（' + champ.text + '）d² = ' + champ.d.toFixed(2));
    ro.set('第二名 / 冠军', !Number.isFinite(spread)
      ? '—'
      : champ.d < 1e-9
        ? '冠军撞上了问题本身（d² = 0），比值无意义'
        : spread.toFixed(2) + ' 倍' + (spread > 4
          ? '　← 冠军很干净，亚军追不上'
          : '　← 冠军和亚军咬得很紧，换个编码器就可能翻盘'));
    ro.set('离资料库有多远', champ.d <= innerMin
      ? '冠军比"库内最近的两段"之间还近（d² = ' + champ.d.toFixed(2)
        + ' ≤ ' + innerMin.toFixed(2) + '）：问题真是库里的事'
      : champ.d <= innerMin * 4
        ? '冠军距离 ' + champ.d.toFixed(2) + '，已是"库内最近两段"间距 '
          + innerMin.toFixed(2) + ' 的好几倍：勉强算相关'
        : '问题落在资料库外（冠军 d² = ' + champ.d.toFixed(2) + '，而库内最近两段才隔 '
          + innerMin.toFixed(2) + '）——检索器照样交卷，交的是"最不相关"的那段');
  }

  function toWorld(x, y) {
    if (!(view.S > 0)) return null;
    return [(x - view.ox) / view.S, WIN.y0 + (cv.H - 26 - y) / view.S];
  }

  bindPointer(cv.canvas, {
    pick: () => 'q',
    down: (id, x, y) => {
      const w = toWorld(x, y);
      if (!w) return;
      st.q = [clamp(Math.round(w[0] * 2) / 2, WIN.x0 + 0.5, WIN.x1 - 0.5),
        clamp(Math.round(w[1] * 2) / 2, WIN.y0 + 0.5, WIN.y1 - 0.5)];
      draw();
    },
    move: (id, x, y) => {
      const w = toWorld(x, y);
      if (!w) return;
      st.q = [clamp(Math.round(w[0] * 2) / 2, WIN.x0 + 0.5, WIN.x1 - 0.5),
        clamp(Math.round(w[1] * 2) / 2, WIN.y0 + 0.5, WIN.y1 - 0.5)];
      draw();
    },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'qx', label: '问题 q 的第一维', min: -1, max: 10.5, step: 0.5, value: st.q[0], fmt: 1 },
        { name: 'qy', label: '问题 q 的第二维', min: -1, max: 10.5, step: 0.5, value: st.q[1], fmt: 1 },
      ],
    },
    (state) => { st.q = [state.qx, state.qy]; draw(); },
  );

  const bar = buildToolbar(
    (() => {
      const b = mkBtn('正文那道题 q=[2,2]');
      b.addEventListener('click', () => {
        st.q = [2, 2];
        setSliderRow(sliders, 0, 2, 1, 'qx');
        setSliderRow(sliders, 1, 2, 1, 'qy');
        draw();
      });
      return b;
    })(),
    (() => {
      const b = mkBtn('换一种问法：问报销');
      b.addEventListener('click', () => {
        /* 特意不取 [0,5]（那正好压在文档 B 身上，d² = 0 是个退化帧），
           取 [1,5]：冠军仍是 B，但距离是 1，读者能看到"换个问法排位就换人"。 */
        st.q = [1, 5];
        setSliderRow(sliders, 0, 1, 1, 'qx');
        setSliderRow(sliders, 1, 5, 1, 'qy');
        draw();
      });
      return b;
    })(),
    (() => {
      const b = mkBtn('分布外提问 q=[10,10]');
      b.addEventListener('click', () => {
        st.q = [10, 10];
        setSliderRow(sliders, 0, 10, 1, 'qx');
        setSliderRow(sliders, 1, 10, 1, 'qy');
        draw();
      });
      return b;
    })(),
  );
  host.appendChild(bar);

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() {} };
}
