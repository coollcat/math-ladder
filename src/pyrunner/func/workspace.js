/* =========================================================================
 * 工作区 —— 把「输入 → 计算 → 看见」整条链路装起来
 * -------------------------------------------------------------------------
 * 左栏拼式子（符号键盘 + 实时预览），右栏看曲线（画布 + 性质面板）。
 * 一个工作区可以叠最多 6 条曲线，式子里的非 x 标识符自动变成滑块，
 * 拖动就是「看着图形被参数一点点捏变形」。
 *
 * 重算分三档，目的都是让交互不卡：
 *   打字   180ms 防抖后再解析预览；
 *   拖滑块 走 requestAnimationFrame 合并，每帧最多算一次；
 *   拖画布 只拿现有采样重画，等手停下来（120ms）再按新视野重采样。
 * ========================================================================= */

import { build } from './expr.js';
import { texToText, toDisplayTex, isLatex, countPlaceholders } from './latex.js';
import * as A from './analyze.js';
import { createPlot, themeColors } from './plot.js';
import { buildKeypad, nextPlaceholder } from './keypad.js';
import { getKatex } from '../mathout';

const MAX_FUNCS = 6;

/* 开场就能点的例子：每一个都对应一种「值得看见」的形状 */
const PRESETS = [
  { name: '抽样函数', funcs: ['sin(x)/x'], view: [-12, 12] },
  { name: '三次曲线', funcs: ['x^3-3*x'], view: [-4, 4] },
  { name: '高斯钟形', funcs: ['exp(-x^2)'], view: [-4, 4] },
  { name: '渐近线', funcs: ['1/x'], view: [-6, 6] },
  { name: '两线交点', funcs: ['x^2', '2^x'], view: [-2, 5] },
  { name: '调参数', funcs: ['a*sin(b*x)'], params: { a: 1, b: 2 }, view: [-8, 8] },
  { name: '阻尼振动', funcs: ['exp(-0.2*x)*sin(3*x)'], view: [0, 22] },
  { name: '尖点', funcs: ['abs(x)-1'], view: [-5, 5] },
  { name: '对数', funcs: ['ln(x)', 'log(x)'], view: [0.01, 8] },
  { name: '切线的割线', funcs: ['sin(x)', 'x'], view: [-4, 4] },
];

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined && text !== null) n.textContent = text;
  return n;
}

/** 数字读数：整数不带小数点，太大太小走科学计数 */
function fmtNum(v, d) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  if (v === 0) return '0';
  const digits = d === undefined ? 4 : d;
  if (Math.abs(v) >= 1e6 || Math.abs(v) < 1e-4) return v.toExponential(3);
  const r = Math.round(v * 10 ** digits) / 10 ** digits;
  return String(r);
}

function debounce(fn, ms) {
  let t = null;
  return function debounced(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(null, args), ms);
  };
}

export function createWorkspace(host, opts) {
  const o = opts || {};
  let uid = 0;

  const state = {
    funcs: [],
    params: Object.assign({}, o.params),
    activeId: null,
    area: null,          /* [a,b] 积分区间 */
    areaMode: false,
    show: {
      grid: true,
      zeros: o.zeros !== false,
      extrema: o.extrema !== false,
    },
  };

  /* ---------- 骨架 ---------- */

  const root = el('div', 'ml-fn');
  const left = el('div', 'ml-fn__left');
  const right = el('div', 'ml-fn__right');
  root.append(left, right);
  host.appendChild(root);

  /* --- 左栏 --- */

  const cardBox = el('div', 'ml-fn__cards');
  const addRow = el('div', 'ml-fn__addrow');
  const btnAdd = el('button', 'ml-fn__btn', '＋ 再叠一条曲线');
  btnAdd.type = 'button';
  addRow.appendChild(btnAdd);

  /* 预设条是「给第一次来的人引路」用的，嵌进课文时通常关掉（课文自带上下文） */
  let presetBox = null;
  if (o.presets !== false) {
    presetBox = el('div', 'ml-fn__presets');
    presetBox.appendChild(el('div', 'ml-fn__subhead', '试试这些'));
    const presetRow = el('div', 'ml-fn__presetrow');
    PRESETS.forEach((p) => {
      const b = el('button', 'ml-fn__chip', p.name);
      b.type = 'button';
      b.addEventListener('click', () => applyPreset(p));
      presetRow.appendChild(b);
    });
    presetBox.appendChild(presetRow);
  }

  /* 键盘在课文里默认收起：占地方，且课文通常只演示一个给定式子 */
  const keypadHost = el('div', 'ml-fn__keypadhost' + (o.keypad === false ? ' is-off' : ''));
  left.append(cardBox, addRow);
  if (presetBox) left.appendChild(presetBox);
  left.appendChild(keypadHost);

  /* --- 右栏 --- */

  const toolbar = el('div', 'ml-fn__toolbar');
  right.appendChild(toolbar);

  const plotHost = el('div', 'ml-fn__plothost');
  right.appendChild(plotHost);

  const readRow = el('div', 'ml-fn__readout');
  right.appendChild(readRow);

  const paramBox = el('div', 'ml-fn__params');
  right.appendChild(paramBox);

  const infoBox = el('div', 'ml-fn__info');
  right.appendChild(infoBox);

  const plot = createPlot(plotHost, {
    height: o.height || 420,
    view: o.view ? { x0: o.view[0], x1: o.view[1], y0: -6, y1: 6 } : { x0: -12, x1: 12, y0: -3, y1: 3 },
  });

  /* ---------- 工具栏 ---------- */

  function mkToggle(label, title, get, set) {
    const b = el('button', 'ml-fn__btn ml-fn__btn--toggle', label);
    b.type = 'button';
    b.title = title;
    const sync = () => b.classList.toggle('is-on', !!get());
    b.addEventListener('click', () => {
      set(!get());
      sync();
      refreshPlot();
    });
    sync();
    return { b, sync };
  }

  const tbFit = el('button', 'ml-fn__btn', '适应曲线');
  tbFit.type = 'button';
  tbFit.title = '按当前 x 范围重新定 y 的上下界（去掉极大极小后再留白）';
  tbFit.addEventListener('click', () => {
    plot.fitY(0.12);
    scheduleRecompute();
  });

  const tbZoomIn = el('button', 'ml-fn__btn', '＋');
  const tbZoomOut = el('button', 'ml-fn__btn', '－');
  tbZoomIn.type = 'button';
  tbZoomOut.type = 'button';
  tbZoomIn.title = '放大';
  tbZoomOut.title = '缩小';
  tbZoomIn.addEventListener('click', () => plot.zoomAt(plot.width / 2, plot.height / 2, 0.75));
  tbZoomOut.addEventListener('click', () => plot.zoomAt(plot.width / 2, plot.height / 2, 1 / 0.75));

  const tbReset = el('button', 'ml-fn__btn', '重置视野');
  tbReset.type = 'button';
  tbReset.addEventListener('click', () => {
    plot.setView({ x0: -10, x1: 10 });
    state.area = null;
    plot.setSelection(null);
    refreshPlot();
    scheduleRecompute();
    refreshInfo();
  });

  const tGrid = mkToggle('网格', '显示坐标网格', () => state.show.grid, (v) => { state.show.grid = v; });
  const tZero = mkToggle('零点', '标出与 x 轴的交点', () => state.show.zeros, (v) => { state.show.zeros = v; });
  const tExtr = mkToggle('极值', '标出极大值与极小值', () => state.show.extrema, (v) => { state.show.extrema = v; });
  const tArea = mkToggle('∫ 面积', '在画布上横向拖一段，量出这段的定积分', () => state.areaMode, (v) => {
    state.areaMode = v;
    plot.setDragMode(v ? 'select' : 'pan');
    if (!v) {
      state.area = null;
      plot.setSelection(null);
    } else if (!state.area) {
      const vw = plot.view;
      const mid = (vw.x0 + vw.x1) / 2;
      const half = (vw.x1 - vw.x0) * 0.15;
      state.area = [mid - half, mid + half];
      plot.setSelection(state.area);
    }
  });

  toolbar.append(tbFit, tbZoomIn, tbZoomOut, tbReset,
    el('span', 'ml-fn__tsep'), tGrid.b, tZero.b, tExtr.b, tArea.b);

  /* ---------- 函数卡片 ---------- */

  function makeFunc(src, colorIndex) {
    uid += 1;
    return {
      id: uid,
      src: src || '',
      compiled: null,
      error: null,
      tex: '',
      visible: true,
      showDeriv: false,
      colorIndex: colorIndex === undefined ? uid - 1 : colorIndex,
      result: null,
      inputs: null,
    };
  }

  function colorOf(fu) {
    return themeColors().series(fu.colorIndex);
  }

  function buildCard(fu, index) {
    const card = el('div', 'ml-fn__card');
    card.dataset.id = String(fu.id);

    const head = el('div', 'ml-fn__cardhead');
    const dot = el('span', 'ml-fn__dot');
    dot.style.background = colorOf(fu);
    const name = el('span', 'ml-fn__fname', 'f' + subDigits(index + 1) + '(x) =');

    const btns = el('div', 'ml-fn__cardbtns');
    const bEye = el('button', 'ml-fn__icon', '◉');
    bEye.type = 'button';
    bEye.title = '显示 / 隐藏这条曲线';
    const bDeriv = el('button', 'ml-fn__icon', 'f′');
    bDeriv.type = 'button';
    bDeriv.title = '同时画出它的导函数（虚线）';
    const bDel = el('button', 'ml-fn__icon', '×');
    bDel.type = 'button';
    bDel.title = '删掉这条';
    btns.append(bEye, bDeriv, bDel);
    head.append(dot, name, btns);

    const preview = el('div', 'ml-fn__preview');
    preview.title = '点一下回到输入框';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'ml-fn__src';
    input.spellcheck = false;
    input.autocomplete = 'off';
    input.placeholder = '写个式子，比如 sin(x)/x 或 \\frac{\\sin x}{x}';
    input.value = fu.src;

    const err = el('div', 'ml-fn__err');

    card.append(head, preview, input, err);

    /* 事件 */
    input.addEventListener('focus', () => {
      state.activeId = fu.id;
      syncActive();
    });
    input.addEventListener('input', () => {
      fu.src = input.value;
      state.activeId = fu.id;
      syncActive();
      scheduleParse(fu);
    });
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Tab') {
        /* Tab 在空位之间跳，别让浏览器把焦点抢走 */
        if (nextPlaceholder(input, ev.shiftKey ? -1 : 1)) ev.preventDefault();
      } else if (ev.key === 'Enter') {
        ev.preventDefault();
        addFunc();
      }
    });
    preview.addEventListener('click', () => {
      input.focus();
      const p = input.value.length;
      input.setSelectionRange(p, p);
    });
    bEye.addEventListener('click', () => {
      fu.visible = !fu.visible;
      syncCard(fu);
      refreshPlot();
      refreshInfo();
    });
    bDeriv.addEventListener('click', () => {
      fu.showDeriv = !fu.showDeriv;
      syncCard(fu);
      refreshPlot();
    });
    bDel.addEventListener('click', () => {
      if (state.funcs.length <= 1) return;
      state.funcs = state.funcs.filter((x) => x.id !== fu.id);
      renderCards();
      refreshAll();
    });

    fu.inputs = { card, dot, name, preview, input, err, bEye, bDeriv, bDel };
    return card;
  }

  /* ₁₂₃ 下标数字 */
  function subDigits(n) {
    const map = '₀₁₂₃₄₅₆₇₈₉';
    return String(n).split('').map((c) => map[+c] || c).join('');
  }

  function renderCards() {
    cardBox.innerHTML = '';
    state.funcs.forEach((fu, i) => cardBox.appendChild(buildCard(fu, i)));
    btnAdd.disabled = state.funcs.length >= MAX_FUNCS;
    syncActive();
    state.funcs.forEach(syncCard);
    state.funcs.forEach(paintPreview);
  }

  function syncActive() {
    state.funcs.forEach((fu) => {
      if (fu.inputs) fu.inputs.card.classList.toggle('is-active', fu.id === state.activeId);
    });
  }

  function syncCard(fu) {
    if (!fu.inputs) return;
    fu.inputs.card.classList.toggle('is-hidden', !fu.visible);
    fu.inputs.bDeriv.classList.toggle('is-on', fu.showDeriv);
    fu.inputs.bEye.textContent = fu.visible ? '◉' : '○';
    fu.inputs.bDel.disabled = state.funcs.length <= 1;
    fu.inputs.dot.style.background = colorOf(fu);
  }

  /* ---------- 预览 ---------- */

  function paintPreview(fu) {
    if (!fu.inputs) return;
    const box = fu.inputs.preview;
    const raw = fu.src.trim();
    if (!raw) {
      box.className = 'ml-fn__preview is-empty';
      box.textContent = '在下面写个式子，或点下面的符号键盘拼一个';
      return;
    }
    let tex;
    try {
      tex = toDisplayTex(raw);
    } catch (e) {
      box.className = 'ml-fn__preview is-error';
      box.textContent = e && e.message ? e.message : String(e);
      return;
    }
    box.className = 'ml-fn__preview';
    getKatex()
      .then((katex) => {
        try {
          box.innerHTML = katex.renderToString(tex, { displayMode: true, throwOnError: true });
          box.classList.remove('is-error');
        } catch (e2) {
          box.className = 'ml-fn__preview is-error';
          box.textContent = '公式写错了：' + (e2 && e2.message ? e2.message : e2);
        }
      })
      .catch(() => {
        box.textContent = tex;
      });
  }

  /* ---------- 解析 ---------- */

  function parseOne(fu) {
    const raw = fu.src.trim();
    if (!raw) {
      fu.compiled = null;
      fu.error = null;
      fu.tex = '';
      return;
    }
    try {
      /* LaTeX 写的先翻成算式文本，手打的直接用 */
      const src = isLatex(raw) ? texToText(raw) : raw;
      fu.compiled = build(src);
      fu.error = null;
      fu.tex = fu.compiled.tex;
    } catch (e) {
      fu.compiled = null;
      fu.error = (e && e.message) || String(e);
      fu.tex = '';
    }
  }

  function allParams() {
    const set = new Set();
    state.funcs.forEach((fu) => {
      if (fu.compiled) fu.compiled.params.forEach((p) => set.add(p));
    });
    return Array.from(set).sort();
  }

  /* ---------- 参数滑块 ---------- */

  function syncParams() {
    const names = allParams();
    /* 新出现的参数给个默认值 1，消失的清掉，免得滑块越攒越多 */
    names.forEach((p) => {
      if (!(p in state.params)) state.params[p] = 1;
    });
    Object.keys(state.params).forEach((p) => {
      if (names.indexOf(p) < 0) delete state.params[p];
    });

    paramBox.innerHTML = '';
    if (!names.length) {
      paramBox.classList.add('is-empty');
      return;
    }
    paramBox.classList.remove('is-empty');
    paramBox.appendChild(el('div', 'ml-fn__subhead', '参数（拖动看形变）'));
    const grid = el('div', 'ml-fn__paramgrid');
    names.forEach((p) => {
      const row = el('div', 'ml-fn__param');
      const lab = el('span', 'ml-fn__paramname', '');
      lab.textContent = p;
      const range = document.createElement('input');
      range.type = 'range';
      range.min = '-10';
      range.max = '10';
      range.step = '0.05';
      range.value = String(state.params[p]);
      const val = el('span', 'ml-fn__paramval', fmtNum(state.params[p], 2));
      range.addEventListener('input', () => {
        state.params[p] = parseFloat(range.value);
        val.textContent = fmtNum(state.params[p], 2);
        scheduleRecompute();
      });
      const dbl = el('button', 'ml-fn__icon', '×2');
      dbl.type = 'button';
      dbl.title = '翻一倍，看曲线怎么被拉扯';
      dbl.addEventListener('click', () => {
        state.params[p] = Math.max(-10, Math.min(10, state.params[p] * 2));
        range.value = String(state.params[p]);
        val.textContent = fmtNum(state.params[p], 2);
        scheduleRecompute();
      });
      row.append(lab, range, val, dbl);
      grid.appendChild(row);
    });
    paramBox.appendChild(grid);
  }

  /* 名字渲染成希腊字母（参数是 theta 就显示 θ） */
  function paintParamNames() {
    paramBox.querySelectorAll('.ml-fn__paramname').forEach((node) => {
      const name = node.textContent;
      getKatex()
        .then((katex) => {
          const tex = /^[A-Za-z][A-Za-z0-9]*$/.test(name) ? '\\' + name : name;
          try {
            node.innerHTML = katex.renderToString(tex, { throwOnError: true });
          } catch (e) {
            void e; /* 不是已知命令就留着原名 */
          }
        })
        .catch(() => {});
    });
  }

  /* ---------- 重算 ---------- */

  let rafId = null;
  function scheduleRecompute() {
    if (rafId != null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      recompute();
    });
  }

  function recompute() {
    const v = plot.view;
    /* 采样比视野宽一圈：拖动时先有得画，不用等重新采样 */
    const pad = (v.x1 - v.x0) * 0.2;
    const x0 = v.x0 - pad;
    const x1 = v.x1 + pad;

    state.funcs.forEach((fu) => {
      if (!fu.compiled || !fu.visible) {
        fu.result = null;
        return;
      }
      const f = A.makeFn(fu.compiled, state.params);
      const r = A.analyze(f, x0, x1, {
        zeros: state.show.zeros,
        extrema: state.show.extrema,
      });
      r.f = f;
      fu.result = r;
    });

    /* 交点：两两求一次，只在此刻可见的曲线之间 */
    state.crosses = [];
    const vis = state.funcs.filter((fu) => fu.result);
    for (let i = 0; i < vis.length; i += 1) {
      for (let j = i + 1; j < vis.length; j += 1) {
        const pts = A.intersections(vis[i].result.f, vis[j].result.f, x0, x1);
        pts.forEach((p) => {
          p.a = vis[i];
          p.b = vis[j];
          p.y = vis[i].result.f(p.x);
          state.crosses.push(p);
        });
      }
    }

    refreshPlot();
    refreshInfo();
  }

  /* ---------- 画图 ---------- */

  function sliceRange(xs, ys, a, b) {
    /* 把采样裁到 [a,b] 内，用于填充积分面积 */
    const idx = [];
    for (let i = 0; i < xs.length; i += 1) {
      if (Number.isFinite(ys[i]) && xs[i] >= a && xs[i] <= b) idx.push(i);
    }
    if (idx.length < 2) return null;
    const lo = idx[0];
    const hi = idx[idx.length - 1];
    const subX = xs.slice(lo, hi + 1);
    const subY = ys.slice(lo, hi + 1);
    return { xs: subX, ys: subY, segs: A.segments(subX, subY) };
  }

  function refreshPlot() {
    const curves = [];
    const marks = [];
    const areas = [];
    const C = themeColors();

    state.funcs.forEach((fu) => {
      if (!fu.result) return;
      const color = colorOf(fu);
      const r = fu.result;

      curves.push({
        xs: r.xs,
        ys: r.ys,
        segs: r.segs,
        color,
        width: fu.id === state.activeId ? 2.8 : 2.1,
        at: (x) => r.f(x),
      });

      if (state.show.zeros) {
        r.zeros.forEach((z) => marks.push({ x: z.x, y: 0, kind: 'zero', color }));
      }
      if (state.show.extrema) {
        r.extrema.forEach((e) => {
          marks.push({
            x: e.x,
            y: e.y,
            kind: e.type,
            color,
            label: (e.type === 'max' ? '极大 ' : '极小 ') + fmtNum(e.x, 3),
          });
        });
      }

      if (fu.showDeriv) {
        const d = A.derivative(r.f);
        const s = A.grid(d, r.xs[0], r.xs[r.xs.length - 1], 500);
        curves.push({
          xs: s.xs,
          ys: s.ys,
          segs: A.segments(s.xs, s.ys),
          color,
          width: 1.6,
          dash: [5, 4],
          at: (x) => d(x),
        });
      }

      if (state.areaMode && state.area) {
        const a = Math.min(state.area[0], state.area[1]);
        const b = Math.max(state.area[0], state.area[1]);
        const piece = sliceRange(r.xs, r.ys, a, b);
        if (piece) areas.push({ xs: piece.xs, ys: piece.ys, segs: piece.segs, color });
      }
    });

    (state.crosses || []).forEach((p) => {
      if (!state.show.zeros) return;
      marks.push({ x: p.x, y: p.y, kind: 'cross', color: C.fg });
    });

    plot.setData({ curves, marks, areas, showGrid: state.show.grid });
    paintReadout(null);
  }

  /* ---------- 读数与图例 ---------- */

  function paintReadout(hover) {
    readRow.innerHTML = '';
    const vis = state.funcs.filter((fu) => fu.result || fu.compiled);
    if (!vis.length) return;

    const legend = el('div', 'ml-fn__legend');
    vis.forEach((fu, i) => {
      const item = el('span', 'ml-fn__lgitem' + (fu.result ? '' : ' is-off'));
      const dot = el('span', 'ml-fn__dot');
      dot.style.background = colorOf(fu);
      const nm = el('span', 'ml-fn__lgname', 'f' + subDigits(i + 1));
      item.append(dot, nm);
      if (hover && fu.result) {
        const y = fu.result.f(hover.x);
        if (Number.isFinite(y)) {
          item.appendChild(el('span', 'ml-fn__lgval', ' = ' + fmtNum(y)));
        }
      }
      legend.appendChild(item);
    });
    readRow.appendChild(legend);

    if (hover) {
      const xbox = el('span', 'ml-fn__hoverx', 'x = ' + fmtNum(hover.x, 5));
      readRow.appendChild(xbox);
    } else {
      readRow.appendChild(el('span', 'ml-fn__hint',
        '滚轮缩放 · 拖动平移 · 双击重置 · 开「∫ 面积」后在图上横拖选区间'));
    }
  }

  /* ---------- 性质面板 ---------- */

  function refreshInfo() {
    infoBox.innerHTML = '';
    const vis = state.funcs.filter((fu) => fu.compiled);
    if (!vis.length) {
      infoBox.classList.add('is-empty');
      return;
    }
    infoBox.classList.remove('is-empty');
    infoBox.appendChild(el('div', 'ml-fn__subhead', '长相'));

    const v = plot.view;
    const area = state.areaMode && state.area
      ? [Math.min(state.area[0], state.area[1]), Math.max(state.area[0], state.area[1])]
      : null;

    vis.forEach((fu, i) => {
      const sec = el('div', 'ml-fn__infosec');
      const head = el('div', 'ml-fn__infohead');
      const dot = el('span', 'ml-fn__dot');
      dot.style.background = colorOf(fu);
      head.append(dot, el('span', 'ml-fn__infoname', 'f' + subDigits(i + 1) + '(x)'));
      if (fu.error) {
        head.appendChild(el('span', 'ml-fn__infobad', fu.error));
        sec.appendChild(head);
        infoBox.appendChild(sec);
        return;
      }
      if (fu.tex) {
        const texBox = el('span', 'ml-fn__infotex', '');
        head.appendChild(texBox);
        getKatex()
          .then((katex) => {
            try {
              texBox.innerHTML = katex.renderToString(fu.tex, { throwOnError: false });
            } catch (e) { void e; }
          })
          .catch(() => {});
      }
      if (!fu.result) {
        head.appendChild(el('span', 'ml-fn__infobad', '（已隐藏）'));
        sec.appendChild(head);
        infoBox.appendChild(sec);
        return;
      }
      sec.appendChild(head);

      const r = fu.result;
      const grid = el('div', 'ml-fn__kv');

      const put = (k, val, cls) => {
        const item = el('div', 'ml-fn__kvitem' + (cls ? ' ' + cls : ''));
        item.append(el('span', 'ml-fn__k', k), el('span', 'ml-fn__v', val));
        grid.appendChild(item);
      };

      /* 零点 */
      put('零点', r.zeros.length
        ? r.zeros.slice(0, 6).map((z) => fmtNum(z.x, 4)).join('，') +
          (r.zeros.length > 6 ? ' …' : '')
        : '视野内没有', r.zeros.length ? '' : 'is-mute');

      /* 极值 */
      const ex = r.extrema.slice(0, 4);
      put('极值', ex.length
        ? ex.map((e) => (e.type === 'max' ? '极大 ' : '极小 ') +
            fmtNum(e.y, 4) + ' @ ' + fmtNum(e.x, 3)).join('；')
        : '视野内没有', ex.length ? '' : 'is-mute');

      /* 单调 */
      const mono = (r.mono || []).filter((m) => m.x1 > v.x0 && m.x0 < v.x1);
      put('单调', mono.length
        ? mono.map((m) => '[' + fmtNum(m.x0, 2) + ', ' + fmtNum(m.x1, 2) + '] ' +
            (m.dir === 'up' ? '↗' : '↘')).join('  ')
        : '—', mono.length ? '' : 'is-mute');

      /* 定义域（视野内算得出来的部分） */
      const dom = r.segs.map(([i0, i1]) => [r.xs[i0], r.xs[i1]]);
      put('有定义', dom.length > 1
        ? dom.map(([a, b]) => '[' + fmtNum(a, 2) + ', ' + fmtNum(b, 2) + ']').join(' ∪ ')
        : '整段都有', dom.length > 1 ? '' : 'is-mute');

      /* 积分：有选区就按选区，否则按整个视野 */
      const ia = area ? area[0] : v.x0;
      const ib = area ? area[1] : v.x1;
      const I = A.integrate(r.f, ia, ib);
      put('∫ f dx' + (area ? '（选区）' : '（全视野）'),
        Number.isFinite(I) ? fmtNum(I, 6) : '这段里有算不出的点，跳过',
        Number.isFinite(I) ? '' : 'is-mute');

      /* 导数在两端的走向 */
      const ends = A.endValues(r.f, v.x0, v.x1);
      const trend = [];
      if (ends.left) trend.push('左端 ' + (ends.left.dir === 'up' ? '↗' : ends.left.dir === 'down' ? '↘' : '→'));
      if (ends.right) trend.push('右端 ' + (ends.right.dir === 'up' ? '↗' : ends.right.dir === 'down' ? '↘' : '→'));
      if (trend.length) put('走向', trend.join('　'), 'is-mute');

      sec.appendChild(grid);
      infoBox.appendChild(sec);
    });

    /* 奇偶性单独一行：只在单条曲线时说，多条叠着看就没意思了 */
    if (vis.length === 1 && vis[0].result) {
      const f = vis[0].result.f;
      const p = A.parity(f, Math.min(8, Math.abs(v.x1)));
      if (p) {
        const note = el('div', 'ml-fn__note',
          p === 'odd' ? '这是奇函数：绕原点旋转 180° 后与自身重合。'
            : '这是偶函数：沿 y 轴对折后左右重合。');
        infoBox.appendChild(note);
      }
    }

    /* 交点 */
    if (state.crosses && state.crosses.length) {
      const list = state.crosses.slice(0, 8);
      const box = el('div', 'ml-fn__note');
      box.appendChild(el('strong', null, '交点'));
      box.appendChild(document.createTextNode('　' +
        list.map((p) => '(' + fmtNum(p.x, 4) + ', ' + fmtNum(p.y, 4) + ')').join('，')));
      infoBox.appendChild(box);
    }

    /* 面积区间的数值 */
    if (state.areaMode && state.area) {
      const a = Math.min(state.area[0], state.area[1]);
      const b = Math.max(state.area[0], state.area[1]);
      const box = el('div', 'ml-fn__note is-strong');
      box.textContent = '选区 [' + fmtNum(a, 4) + ', ' + fmtNum(b, 4) + ']　宽度 ' + fmtNum(b - a, 4);
      infoBox.appendChild(box);
    }

    /* 提示还有空位没填 */
    state.funcs.forEach((fu) => {
      if (!fu.error && isLatex(fu.src) && countPlaceholders(fu.src) > 0) {
        infoBox.appendChild(el('div', 'ml-fn__note is-warn',
          '还有 ' + countPlaceholders(fu.src) + ' 个空位没填，先按 1 算着，填完再看。'));
      }
    });
  }

  /* ---------- 串联 ---------- */

  const scheduleParse = debounce((fu) => {
    parseOne(fu);
    paintPreview(fu);
    syncParams();
    paintParamNames();
    if (fu.inputs) {
      fu.inputs.err.textContent = fu.error || '';
      fu.inputs.err.classList.toggle('is-show', !!fu.error);
    }
    scheduleRecompute();
  }, 180);

  const scheduleRecomputeDebounced = debounce(() => recompute(), 120);

  plot.onView(() => scheduleRecomputeDebounced());
  plot.onHover((h) => paintReadout(h));
  plot.onSelect((r, done) => {
    state.area = r ? [Math.min(r[0], r[1]), Math.max(r[0], r[1])] : null;
    refreshPlot();
    if (done) refreshInfo();
  });

  btnAdd.addEventListener('click', () => addFunc());

  function addFunc() {
    if (state.funcs.length >= MAX_FUNCS) return;
    const fu = makeFunc('', state.funcs.length);
    state.funcs.push(fu);
    renderCards();
    state.activeId = fu.id;
    syncActive();
    const last = state.funcs[state.funcs.length - 1];
    if (last.inputs) last.inputs.input.focus();
  }

  function applyPreset(p) {
    state.funcs = p.funcs.map((src, i) => makeFunc(src, i));
    state.params = Object.assign({}, p.params || {});
    state.area = null;
    state.areaMode = false;
    plot.setDragMode('pan');
    plot.setSelection(null);
    tArea.sync();
    if (p.view) plot.setView({ x0: p.view[0], x1: p.view[1] }, true);
    renderCards();
    state.funcs.forEach(parseOne);
    syncParams();
    paintParamNames();
    state.activeId = state.funcs[0].id;
    syncActive();
    recompute();
    plot.fitY(0.12);
    recompute();
  }

  function refreshAll() {
    state.funcs.forEach(parseOne);
    syncParams();
    paintParamNames();
    scheduleRecompute();
  }

  /* 键盘：插到当前激活的那条的输入框里 */
  buildKeypad(keypadHost, () => {
    const fu = state.funcs.find((x) => x.id === state.activeId) || state.funcs[0];
    return fu && fu.inputs ? fu.inputs.input : null;
  }, (ta) => {
    const fu = state.funcs.find((x) => x.inputs && x.inputs.input === ta);
    if (fu) scheduleParse(fu);
  });

  /* ---------- 启动 ---------- */

  const initial = o.funcs && o.funcs.length ? o.funcs : ['sin(x)/x'];
  state.funcs = initial.map((src, i) => makeFunc(src, i));
  renderCards();
  if (o.view) plot.setView({ x0: o.view[0], x1: o.view[1] }, true);
  refreshAll();
  plot.fitY(0.12);
  recompute();

  return {
    el: root,
    /** 外部换式子用（嵌进课文时方便） */
    setFuncs(list, view) {
      state.funcs = (list || []).map((src, i) => makeFunc(src, i));
      if (view) plot.setView({ x0: view[0], x1: view[1] }, true);
      renderCards();
      refreshAll();
      plot.fitY(0.12);
      recompute();
    },
    getView() { return plot.view; },
    destroy() {
      plot.destroy();
      if (root.parentNode) root.parentNode.removeChild(root);
    },
  };
}

export { PRESETS };
export default createWorkspace;
