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
import { createSurface } from './surface.js';
import { buildKeypad, nextPlaceholder } from './keypad.js';
import { getKatex } from '../mathout';

const MAX_FUNCS = 6;

/* 3D 只画第一条曲线：两个曲面互相穿插时画家算法排不对顺序，
   叠在一起反而看不清，不如只留一条 */
const MAX_FUNCS_3D = 1;

/* 开场就能点的例子：每一个都对应一种「值得看见」的形状 */
const PRESETS2D = [
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

/* 3D 的例子。domain 是 xy 平面的半边长（域 = [-domain, domain]²），
   每个形状合适的域差得远：马鞍面 4 就够，涟漪要到 10 才铺得开几个波 */
const PRESETS3D = [
  { name: '马鞍面', funcs: ['x*y'], domain: 4 },
  { name: '抛物面', funcs: ['x^2+y^2'], domain: 3 },
  { name: '高斯钟', funcs: ['exp(-x^2-y^2)'], domain: 3 },
  { name: '波浪', funcs: ['sin(x)*cos(y)'], domain: 6 },
  { name: '涟漪', funcs: ['sin(sqrt(x^2+y^2))'], domain: 10 },
  { name: '3D 抽样函数', funcs: ['sin(sqrt(x^2+y^2))/sqrt(x^2+y^2)'], domain: 12 },
  { name: '交叉涟漪', funcs: ['sin(x*y)'], domain: 4 },
  { name: '尖谷', funcs: ['abs(x)+abs(y)'], domain: 4 },
  { name: '双曲抛物', funcs: ['(x^2-y^2)/4'], domain: 4 },
  { name: '调高度', funcs: ['a*(x^2+b*y^2)'], params: { a: 1, b: -1 }, domain: 3 },
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
  function debounced(...args) {
    clearTimeout(t);
    t = setTimeout(() => {
      t = null;
      fn.apply(null, args);
    }, ms);
  }
  debounced.cancel = () => {
    if (t !== null) {
      clearTimeout(t);
      t = null;
    }
  };
  return debounced;
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
    mode: o.mode === '3d' ? '3d' : '2d',
    domain: o.domain || 4,   /* 3D 的 xy 域半边长 */
    params2d: null,      /* 离开平面模式时留一份参数快照，回来不丢旋钮值 */
    show: {
      grid: true,
      zeros: o.zeros !== false,
      extrema: o.extrema !== false,
    },
    show3: {
      wire: true,
      box: true,
      extrema: true,
    },
  };

  /* 自变量表：2D 只有 x，3D 是 z = f(x, y) */
  const vars = () => (state.mode === '3d' ? ['x', 'y'] : ['x']);
  const activeFuncs = () => (state.mode === '3d'
    ? state.funcs.slice(0, MAX_FUNCS_3D)
    : state.funcs);

  if (state.mode === '2d') state.params2d = Object.assign({}, state.params);

  /* 切模式不再截断 state.funcs：3D 只画并只展示第一条，其余曲线留在数组里，
     切回平面时原样恢复。 */
  function enterMode(v) {
    const next = v === '3d' ? '3d' : '2d';
    if (state.mode === next) return false;
    state.funcs.forEach(cancelParseTimer);
    if (state.mode === '2d' && next === '3d') {
      state.params2d = Object.assign({}, state.params);
    } else if (state.mode === '3d' && next === '2d') {
      /* 先拿回 2D 的参数快照，再用 3D 里改过的同名参数覆盖，
         这样 y 这类只在 2D 存在的参数不会丢，a/b 的 3D 调整也能带回来。 */
      state.params = Object.assign({}, state.params2d || {}, state.params);
    }
    state.mode = next;
    const active = activeFuncs();
    if (!active.some((fu) => fu.id === state.activeId)) {
      state.activeId = active[0] ? active[0].id : null;
    }
    return true;
  }

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

  /* 预设条是「给第一次来的人引路」用的，嵌进课文时通常关掉（课文自带上下文）。
     2D / 3D 各有一套例子，切模式时整条重画。 */
  let presetBox = null;
  if (o.presets !== false) {
    presetBox = el('div', 'ml-fn__presets');
    presetBox.appendChild(el('div', 'ml-fn__subhead', '试试这些'));
  }
  function renderPresets() {
    if (!presetBox) return;
    const old = presetBox.querySelector('.ml-fn__presetrow');
    if (old) old.remove();
    const row = el('div', 'ml-fn__presetrow');
    (state.mode === '3d' ? PRESETS3D : PRESETS2D).forEach((p) => {
      const b = el('button', 'ml-fn__chip', p.name);
      b.type = 'button';
      b.addEventListener('click', () => applyPreset(p));
      row.appendChild(b);
    });
    presetBox.appendChild(row);
  }

  /* 键盘在课文里默认收起：占地方，且课文通常只演示一个给定式子 */
  const keypadHost = el('div', 'ml-fn__keypadhost' + (o.keypad === false ? ' is-off' : ''));
  left.append(cardBox, addRow);
  if (presetBox) left.appendChild(presetBox);
  left.appendChild(keypadHost);

  /* 窄屏时把画布紧跟在输入卡后面，再把预设与符号键盘挪到性质面板之后。
     这样手机上写完式子不用先滚过 50 个符号键才能看见图。
     这里真的移动 DOM 节点，而不是只用 CSS order，键盘 Tab 顺序也跟着一致。 */
  const compactMq = window.matchMedia ? window.matchMedia('(max-width: 1100px)') : null;
  let compactLayout = null;
  function syncCompactLayout() {
    if (!compactMq) return;
    const next = compactMq.matches;
    if (next === compactLayout) return;
    compactLayout = next;
    if (next) {
      left.append(cardBox, addRow);
      right.after(keypadHost);
      if (presetBox) right.after(presetBox);
    } else {
      left.append(cardBox, addRow);
      if (presetBox) left.appendChild(presetBox);
      left.appendChild(keypadHost);
    }
  }
  if (compactMq && compactMq.addEventListener) compactMq.addEventListener('change', syncCompactLayout);
  else if (compactMq && compactMq.addListener) compactMq.addListener(syncCompactLayout);

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

  /* 画布高度：课文里写 height 就用；没写就交给 CSS（.ml-fn__plot 的
     440/360/300 响应式高度）——别在这里抢着给默认值，否则 CSS 变窄了
     画布还是 420，底部会被 plothost 的 overflow:hidden 切掉一截。 */
  const initialView = o.view
    ? { x0: o.view[0], x1: o.view[1], y0: -6, y1: 6 }
    : { x0: -12, x1: 12, y0: -3, y1: 3 };
  const plot = createPlot(plotHost, {
    height: o.height,
    view: initialView,
    onReset: () => reset2dView(),
  });

  /* 3D 曲面与 2D 画布同处一个坑里，谁在场上谁显示——
     换来的是两套交互不用互相迁就，切模式时也不用重建 DOM */
  const surfaceHost = el('div', 'ml-fn__surfhost is-off');
  plotHost.appendChild(surfaceHost);
  const surface = createSurface(surfaceHost, { height: o.height });
  const plotWrap = plot.el;

  function reset2dView() {
    plot.setView(initialView, true);
    state.area = null;
    plot.setSelection(null);
    refreshPlot();
    scheduleRecompute();
  }

  /* ---------- 工具栏 ---------- */

  function mkToggle(label, title, get, set, after) {
    const b = el('button', 'ml-fn__btn ml-fn__btn--toggle', label);
    b.type = 'button';
    b.title = title;
    const sync = () => {
      const on = !!get();
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    };
    b.addEventListener('click', () => {
      const next = !get();
      set(next);
      sync();
      if (after) after(next);
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
  tbReset.addEventListener('click', () => reset2dView());

  const tGrid = mkToggle('网格', '显示坐标网格', () => state.show.grid, (v) => { state.show.grid = v; });
  const tZero = mkToggle('零点', '标出与 x 轴的交点', () => state.show.zeros,
    (v) => { state.show.zeros = v; }, (v) => { if (v) scheduleRecompute(); });
  const tExtr = mkToggle('极值', '标出极大值与极小值', () => state.show.extrema,
    (v) => { state.show.extrema = v; }, (v) => { if (v) scheduleRecompute(); });
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

  /* 2D 那组：定视野、标零点极值、量面积 */
  const tb2d = el('div', 'ml-fn__tbgroup');
  tb2d.append(tbFit, tbZoomIn, tbZoomOut, tbReset,
    el('span', 'ml-fn__tsep'), tGrid.b, tZero.b, tExtr.b, tArea.b);

  /* 3D 那组：换视角、开关参照物、调域的大小 */
  const tb3d = el('div', 'ml-fn__tbgroup');
  const mkView = (label, title, a, e) => {
    const b = el('button', 'ml-fn__btn', label);
    b.type = 'button';
    b.title = title;
    b.addEventListener('click', () => surface.setAngles(a, e));
    return b;
  };
  const tWire = mkToggle('网格线', '在曲面上画格线，起伏看得更清楚',
    () => state.show3.wire, (v) => { state.show3.wire = v; });
  const tBox = mkToggle('参照框', '画底面网格与包围盒，给高度一个参照',
    () => state.show3.box, (v) => { state.show3.box = v; });
  const tExtr3 = mkToggle('极值', '标出曲面上的局部最高与最低',
    () => state.show3.extrema !== false, (v) => { state.show3.extrema = v; });

  const domainRow = el('div', 'ml-fn__domain');
  const domainRange = document.createElement('input');
  domainRange.type = 'range';
  domainRange.min = '0.5';
  domainRange.max = '20';
  domainRange.step = '0.5';
  domainRange.value = String(state.domain);
  domainRange.setAttribute('aria-label', '三维曲面的定义域半边长');
  const domainVal = el('span', 'ml-fn__paramval', '±' + state.domain);
  domainRange.addEventListener('input', () => {
    state.domain = parseFloat(domainRange.value);
    domainVal.textContent = '±' + state.domain;
    scheduleRecompute(false);
  });
  domainRange.addEventListener('change', () => scheduleRecompute());
  const domainLab = el('span', 'ml-fn__domainlab', '域');
  domainLab.title = 'xy 平面上取多大的方块来画（± 这个值）';
  domainRow.append(domainLab, domainRange, domainVal);

  /* 高度夸张：z 方向的放大倍数。曲面起伏往往比 xy 跨度小一个量级，
     不夸张就是一张平板——这是 zScale 唯一的入口，改式子/改域都不动它 */
  const zRow = el('div', 'ml-fn__domain');
  const zScaleRange = document.createElement('input');
  zScaleRange.type = 'range';
  zScaleRange.min = '0.1';
  zScaleRange.max = '2.5';
  zScaleRange.step = '0.05';
  zScaleRange.value = String(surface.zScale);
  zScaleRange.setAttribute('aria-label', '曲面高度夸张倍数');
  const zScaleVal = el('span', 'ml-fn__paramval', '×' + fmtNum(surface.zScale, 2));
  zScaleRange.addEventListener('input', () => {
    const v = parseFloat(zScaleRange.value);
    zScaleVal.textContent = '×' + fmtNum(v, 2);
    surface.setZScale(v);
  });
  const zScaleLab = el('span', 'ml-fn__domainlab', '高度');
  zScaleLab.title = '把 z 方向拉高或压扁（高度夸张）。起伏太扁看不见就拉高，想看真实比例就压到 ×0.25 附近';
  zRow.append(zScaleLab, zScaleRange, zScaleVal);

  tb3d.append(
    mkView('等轴', '回到默认视角', -0.9, 0.52),
    mkView('俯视', '从正上方往下看，形状像等高线图', 0, Math.PI / 2 - 0.02),
    mkView('平视', '压低到几乎水平，侧看起伏', 0, 0.03),
    el('span', 'ml-fn__tsep'), tWire.b, tBox.b, tExtr3.b,
    el('span', 'ml-fn__tsep'), domainRow, zRow);

  /* 模式切换：2D 与 3D 的自变量表不同（后者多一个 y），
     切过去必须把所有式子按新的自变量表重新编译一遍 */
  const modeSeg = el('div', 'ml-fn__seg');
  modeSeg.setAttribute('aria-label', '平面或立体模式');
  const modeBtns = [
    { v: '2d', label: '平面 y = f(x)' },
    { v: '3d', label: '立体 z = f(x, y)' },
  ].map((m) => {
    const b = el('button', 'ml-fn__segbtn', m.label);
    b.type = 'button';
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => setMode(m.v));
    modeSeg.appendChild(b);
    return { b, v: m.v };
  });

  toolbar.append(modeSeg, tb2d, tb3d);

  function setMode(v) {
    if (!enterMode(v)) return;
    syncMode();
    renderPresets();
    renderCards();
    refreshAll(false);
    recompute();
  }

  function syncMode() {
    const d3 = state.mode === '3d';
    modeBtns.forEach((x) => {
      const on = state.mode === x.v;
      x.b.classList.toggle('is-on', on);
      x.b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    tb2d.classList.toggle('is-off', d3);
    tb3d.classList.toggle('is-off', !d3);
    plotWrap.classList.toggle('is-off', d3);
    surfaceHost.classList.toggle('is-off', !d3);
    btnAdd.classList.toggle('is-off', d3);
    if (d3) surface.draw();
    else plot.draw();
  }

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
      parseTimer: null,
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
    /* 3D 里式子是 z = f(x, y)，卡片标题得跟着变，否则会以为 y 是参数 */
    const argTxt = state.mode === '3d' ? '(x, y) =' : '(x) =';
    const fLabel = 'f' + subDigits(index + 1);
    const name = el('span', 'ml-fn__fname', fLabel + argTxt);

    const btns = el('div', 'ml-fn__cardbtns');
    const bEye = el('button', 'ml-fn__icon', '◉');
    bEye.type = 'button';
    bEye.title = '显示 / 隐藏这条曲线';
    bEye.setAttribute('aria-label', '显示或隐藏 ' + fLabel);
    const bDeriv = el('button', 'ml-fn__icon', 'f′');
    bDeriv.type = 'button';
    bDeriv.title = '同时画出它的导函数（虚线）';
    bDeriv.setAttribute('aria-label', '显示或隐藏 ' + fLabel + ' 的导函数');
    const bDel = el('button', 'ml-fn__icon', '×');
    bDel.type = 'button';
    bDel.title = '删掉这条';
    bDel.setAttribute('aria-label', '删除 ' + fLabel);
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
    input.setAttribute('aria-label', fLabel + ' 的表达式');

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
      cancelParseTimer(fu);
      state.funcs = state.funcs.filter((x) => x.id !== fu.id);
      if (state.activeId === fu.id) {
        state.activeId = state.funcs[0] ? state.funcs[0].id : null;
      }
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
    /* 只给当前模式真正会用的卡片保留 DOM 引用；3D 下其余曲线的旧 inputs
       如果不清掉，符号键盘可能往已经移除的输入框里插字。 */
    state.funcs.forEach((fu) => { fu.inputs = null; });
    cardBox.innerHTML = '';
    const list = activeFuncs();
    list.forEach((fu, i) => cardBox.appendChild(buildCard(fu, i)));
    if (state.mode === '3d' && state.funcs.length > MAX_FUNCS_3D) {
      cardBox.appendChild(el('div', 'ml-fn__note',
        '立体模式只画第一条曲面；其余曲线和参数会保留，切回平面后恢复。'));
    }
    btnAdd.disabled = state.mode !== '3d' && state.funcs.length >= MAX_FUNCS;
    syncActive();
    list.forEach(syncCard);
    list.forEach(paintPreview);
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

  let previewToken = 0;
  function paintPreview(fu) {
    if (!fu.inputs) return;
    const box = fu.inputs.preview;
    const raw = fu.src.trim();
    /* 没改过的式子不重渲（把渲染键记在节点上，卡片重建后自然失效） */
    if (box.dataset.painted === raw) return;
    box.dataset.painted = raw;
    const token = String(++previewToken);
    box.dataset.paintToken = token;
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
        /* KaTeX 是异步加载的：慢网络下旧式子的渲染结果不能盖掉新式子。 */
        if (box.dataset.paintToken !== token || !box.isConnected) return;
        try {
          box.innerHTML = katex.renderToString(tex, { displayMode: true, throwOnError: true });
          box.classList.remove('is-error');
        } catch (e2) {
          box.className = 'ml-fn__preview is-error';
          box.textContent = '公式写错了：' + (e2 && e2.message ? e2.message : e2);
        }
      })
      .catch(() => {
        if (box.dataset.paintToken !== token || !box.isConnected) return;
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
      /* 自变量表跟着模式走：3D 下 y 是自变量，2D 下它只是个可调参数 */
      fu.compiled = build(src, { vars: vars() });
      fu.error = null;
      fu.tex = fu.compiled.tex;
    } catch (e) {
      fu.compiled = null;
      fu.error = (e && e.message) || String(e);
      fu.tex = '';
    }
  }

  function collectParams(list) {
    const set = new Set();
    list.forEach((fu) => {
      if (fu.compiled) fu.compiled.params.forEach((p) => set.add(p));
    });
    return Array.from(set).sort();
  }

  function allParams() { return collectParams(state.funcs); }
  function visibleParams() { return collectParams(activeFuncs()); }

  /* ---------- 参数滑块 ---------- */

  function syncParams() {
    const names = allParams();
    const keep = new Set(names);
    /* 3D 只展示第一条的参数，但 2D 其余曲线的参数值要留着。 */
    if (state.mode === '3d' && state.params2d) {
      Object.keys(state.params2d).forEach((p) => keep.add(p));
    }
    /* 新出现的参数给个默认值 1，消失的清掉，免得滑块越攒越多 */
    keep.forEach((p) => {
      if (!(p in state.params)) state.params[p] = 1;
    });
    Object.keys(state.params).forEach((p) => {
      if (!keep.has(p)) delete state.params[p];
    });

    const shown = visibleParams();
    paramBox.innerHTML = '';
    if (!shown.length) {
      paramBox.classList.add('is-empty');
      return;
    }
    paramBox.classList.remove('is-empty');
    paramBox.appendChild(el('div', 'ml-fn__subhead', '参数（拖动看形变）'));
    const grid = el('div', 'ml-fn__paramgrid');
    shown.forEach((p) => {
      const row = el('div', 'ml-fn__param');
      const lab = el('span', 'ml-fn__paramname', '');
      lab.textContent = p;
      const range = document.createElement('input');
      range.type = 'range';
      range.min = '-10';
      range.max = '10';
      range.step = '0.05';
      range.value = String(state.params[p]);
      range.setAttribute('aria-label', '参数 ' + p + ' 的值');
      const val = el('span', 'ml-fn__paramval', fmtNum(state.params[p], 2));
      const commit = (value, live) => {
        state.params[p] = value;
        if (state.mode === '2d' && state.params2d) state.params2d[p] = value;
        range.value = String(value);
        val.textContent = fmtNum(value, 2);
        scheduleRecompute(!live);
      };
      range.addEventListener('input', () => {
        commit(parseFloat(range.value), true);
      });
      range.addEventListener('change', () => scheduleRecompute());
      const dbl = el('button', 'ml-fn__icon', '×2');
      dbl.type = 'button';
      dbl.title = '翻一倍，看曲线怎么被拉扯';
      dbl.setAttribute('aria-label', '把参数 ' + p + ' 翻倍');
      dbl.addEventListener('click', () => {
        commit(Math.max(-10, Math.min(10, state.params[p] * 2)), false);
      });
      row.append(lab, range, val, dbl);
      grid.appendChild(row);
    });
    paramBox.appendChild(grid);
  }

  /* 名字渲染成希腊字母（参数是 theta 就显示 θ）。
     渲染键记在节点 dataset 上：渲过的名字直接跳过，参数拖动不重跑 KaTeX。 */
  function paintParamNames() {
    paramBox.querySelectorAll('.ml-fn__paramname').forEach((node) => {
      const name = node.textContent;
      if (node.dataset.painted === name) return;
      getKatex()
        .then((katex) => {
          const tex = /^[A-Za-z][A-Za-z0-9]*$/.test(name) ? '\\' + name : name;
          try {
            node.innerHTML = katex.renderToString(tex, { throwOnError: true });
            node.dataset.painted = name;
          } catch (e) {
            void e; /* 不是已知命令就留着原名 */
          }
        })
        .catch(() => {});
    });
  }

  /* ---------- 重算 ---------- */

  let rafId = null;
  let wantInfo = false;
  function scheduleRecompute(withInfo) {
    if (withInfo !== false) wantInfo = true;
    if (rafId != null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      const full = wantInfo;
      wantInfo = false;
      recompute(full);
    });
  }

  function recompute(withInfo) {
    if (state.mode === '3d') {
      recompute3(withInfo);
      return;
    }
    /* withInfo === false 只出现在拖滑块的连续帧：这时用均匀采样先保住手感，
       松手（change）后再做自适应细分与两两交点。 */
    const live = withInfo === false;
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
        refine: !live,
      });
      r.f = f;
      fu.result = r;
    });

    /* 交点：两两求一次，只在此刻可见的曲线之间。拖动参数时先跳过，
       松手后再补上；否则 6 条曲线要跑 15 组 400 点网格，是拖动的最大头。 */
    state.crosses = [];
    if (!live) {
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
    }

    refreshPlot();
    if (withInfo !== false) refreshInfo();
  }

  /* ---------- 3D 重算 ---------- */

  /* 曲面网格分辨率。40×40 = 1600 个面片，静止时一帧画得完；
     拖动时 surface 内部会跳格降到 1/4，帧率才跟得上。 */
  const GRID_N = 40;

  function recompute3(withInfo) {
    const d = Math.max(0.05, state.domain);
    state.funcs.forEach((fu, index) => {
      if (index >= MAX_FUNCS_3D || !fu.compiled || !fu.visible) {
        fu.result3 = null;
        return;
      }
      const f = A.makeFn(fu.compiled, state.params);
      const g = A.grid2(f, -d, d, -d, d, GRID_N, GRID_N);
      /* 补可去奇点：sin(√(x²+y²))/√(x²+y²) 在原点正是 0/0 */
      const healed = A.healGrid2(g);
      const r = A.zRange(g.z);
      fu.result3 = {
        f,
        g,
        zlo: r.lo,
        zhi: r.hi,
        /* 一个有限值都没有（如 ln(x²+y²-100) 域只有 3）：别拿
           默认的 [-1,1] 假装有高度，让读数明说「算不出来」 */
        empty: !!r.empty,
        healed,
        extrema: A.extrema2(g, 8),
      };
    });
    refreshPlot();
    if (withInfo !== false) refreshInfo();
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
    if (state.mode === '3d') {
      refreshPlot3();
      return;
    }
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

  /* ---------- 3D 画图 ---------- */

  /* 当前 3D 曲面与悬停读数。refreshPlot3 每次更新，onHover 只读 */
  let curFu3 = null;
  let cur3 = null;
  let hover3 = null;

  function refreshPlot3() {
    /* 只画第一条：两个曲面互相穿插时画家算法排不对顺序，叠着反而是添乱 */
    const fu = state.funcs.find((x) => x.result3);
    if (!fu) {
      curFu3 = null;
      cur3 = null;
      hover3 = null;
      surface.setData({ mesh: null, marks: [] });
      paintReadout3();
      return;
    }
    const r = fu.result3;
    curFu3 = fu;
    cur3 = r;
    const marks = state.show3.extrema === false ? [] : (r.extrema || []).map((e) => ({
      x: e.x,
      y: e.y,
      z: e.z,
      color: e.type === 'max' ? '#d1483f' : '#2f8f5b',
      label: (e.type === 'max' ? '极大 ' : '极小 ') + fmtNum(e.z, 3),
    }));
    surface.setData({
      mesh: r.g,
      zlo: r.zlo,
      zhi: r.zhi,
      marks,
      wire: state.show3.wire,
      box: state.show3.box,
      /* 悬停探针的求值函数：surface 只管几何，z 值由这边给 */
      at: r.f,
    });
    paintReadout3();
  }

  function paintReadout3() {
    readRow.innerHTML = '';
    if (!curFu3 || !cur3) {
      readRow.appendChild(el('span', 'ml-fn__hint',
        '拖动旋转 · 滚轮缩放 · 双击回到默认视角'));
      return;
    }
    if (cur3.empty) {
      readRow.appendChild(el('span', 'ml-fn__hint',
        '这块区域里一个值都算不出来——检查式子，或把「域」调大试试'));
      return;
    }
    const item = el('span', 'ml-fn__lgitem');
    const dot = el('span', 'ml-fn__dot');
    dot.style.background = colorOf(curFu3);
    item.append(dot, el('span', 'ml-fn__lgname', 'f(x, y)'));
    item.appendChild(el('span', 'ml-fn__lgval',
      ' ∈ [' + fmtNum(cur3.zlo, 3) + ', ' + fmtNum(cur3.zhi, 3) + ']'));
    readRow.appendChild(item);
    if (hover3) {
      readRow.appendChild(el('span', 'ml-fn__hoverx',
        'f(' + fmtNum(hover3.x, 3) + ', ' + fmtNum(hover3.y, 3) + ') = ' + fmtNum(hover3.z)));
    } else {
      readRow.appendChild(el('span', 'ml-fn__hint',
        '拖动旋转 · 滚轮缩放 · 双击回到默认视角 · 光标放在画布上可读出任一点的值'));
    }
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
    if (state.mode === '3d') {
      refreshInfo3();
      return;
    }
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

      /* 采样比视野宽 20%，读数必须先裁回真正看得见的那一段，
         否则性质面板会报出屏幕外的零点/极值。 */
      const zeros = r.zeros.filter((z) => z.x >= v.x0 && z.x <= v.x1);
      const extrema = r.extrema.filter((e) => e.x >= v.x0 && e.x <= v.x1);

      /* 零点 */
      put('零点', zeros.length
        ? zeros.slice(0, 6).map((z) => fmtNum(z.x, 4)).join('，') +
          (zeros.length > 6 ? ' …' : '')
        : '视野内没有', zeros.length ? '' : 'is-mute');

      /* 极值 */
      const ex = extrema.slice(0, 4);
      put('极值', ex.length
        ? ex.map((e) => (e.type === 'max' ? '极大 ' : '极小 ') +
            fmtNum(e.y, 4) + ' @ ' + fmtNum(e.x, 3)).join('；')
        : '视野内没有', ex.length ? '' : 'is-mute');

      /* 单调 */
      const eps = 1e-9 * Math.max(1, Math.abs(v.x1 - v.x0));
      const mono = (r.mono || [])
        .map((m) => ({
          dir: m.dir,
          x0: Math.max(m.x0, v.x0),
          x1: Math.min(m.x1, v.x1),
        }))
        .filter((m) => m.x1 - m.x0 > eps);
      put('单调', mono.length
        ? mono.map((m) => '[' + fmtNum(m.x0, 2) + ', ' + fmtNum(m.x1, 2) + '] ' +
            (m.dir === 'up' ? '↗' : '↘')).join('  ')
        : '—', mono.length ? '' : 'is-mute');

      /* 定义域（视野内算得出来的部分） */
      const dom = r.segs
        .map(([i0, i1]) => [
          Math.max(r.xs[i0], v.x0),
          Math.min(r.xs[i1], v.x1),
        ])
        .filter(([a, b]) => b - a > eps);
      const coversAll = dom.length === 1 &&
        dom[0][0] <= v.x0 + eps && dom[0][1] >= v.x1 - eps;
      let domText = '视野内没有';
      if (dom.length) {
        domText = coversAll
          ? '整段都有'
          : dom.map(([a, b]) => '[' + fmtNum(a, 2) + ', ' + fmtNum(b, 2) + ']').join(' ∪ ');
      }
      put('有定义', domText, dom.length && !coversAll ? '' : 'is-mute');

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
    if (vis.length === 1 && vis[0].result && v.x0 < 0 && v.x1 > 0) {
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
    const crosses = (state.crosses || []).filter((p) => p.x >= v.x0 && p.x <= v.x1);
    if (crosses.length) {
      const list = crosses.slice(0, 8);
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

  /* ---------- 3D 性质面板 ---------- */

  function refreshInfo3() {
    infoBox.innerHTML = '';
    const fu = state.funcs[0];
    if (!fu || !fu.compiled) {
      infoBox.classList.add('is-empty');
      return;
    }
    infoBox.classList.remove('is-empty');
    infoBox.appendChild(el('div', 'ml-fn__subhead', '长相'));

    const sec = el('div', 'ml-fn__infosec');
    const head = el('div', 'ml-fn__infohead');
    const dot = el('span', 'ml-fn__dot');
    dot.style.background = colorOf(fu);
    head.append(dot, el('span', 'ml-fn__infoname', 'z = f(x, y)'));
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
    sec.appendChild(head);

    const r = fu.result3;
    if (!r) {
      sec.appendChild(el('div', 'ml-fn__note', '（已隐藏）'));
      infoBox.appendChild(sec);
      return;
    }

    const grid = el('div', 'ml-fn__kv');
    const put = (k, val, cls) => {
      const item = el('div', 'ml-fn__kvitem' + (cls ? ' ' + cls : ''));
      item.append(el('span', 'ml-fn__k', k), el('span', 'ml-fn__v', val));
      grid.appendChild(item);
    };

    put('高度范围',
      r.empty ? '这块区域里算不出值' : '[' + fmtNum(r.zlo, 4) + ', ' + fmtNum(r.zhi, 4) + ']',
      r.empty ? 'is-mute' : '');
    put('中心高度', fmtNum(r.f(0, 0), 6));

    const ex = r.extrema || [];
    put('极大值', ex.filter((e) => e.type === 'max').slice(0, 4)
      .map((e) => fmtNum(e.z, 4) + ' @(' + fmtNum(e.x, 2) + ', ' + fmtNum(e.y, 2) + ')').join('；')
      || '视野内没有', ex.some((e) => e.type === 'max') ? '' : 'is-mute');
    put('极小值', ex.filter((e) => e.type === 'min').slice(0, 4)
      .map((e) => fmtNum(e.z, 4) + ' @(' + fmtNum(e.x, 2) + ', ' + fmtNum(e.y, 2) + ')').join('；')
      || '视野内没有', ex.some((e) => e.type === 'min') ? '' : 'is-mute');

    /* 补了多少个算不出来的点，说一声，免得用户以为图本来就是那样 */
    if (r.healed > 0) {
      infoBox.appendChild(el('div', 'ml-fn__note',
        '有 ' + r.healed + ' 个格子原本算不出来（多半是可去奇点），已按周围的高度补上。'));
    }
    sec.appendChild(grid);
    infoBox.appendChild(sec);

    /* 提示还有空位没填 */
    if (isLatex(fu.src) && countPlaceholders(fu.src) > 0) {
      infoBox.appendChild(el('div', 'ml-fn__note is-warn',
        '还有 ' + countPlaceholders(fu.src) + ' 个空位没填，先按 1 算着，填完再看。'));
    }
  }

  /* ---------- 串联 ---------- */

  /* 防抖必须按函数分开：全组件共用一个计时器时，快速连续编辑多条曲线，
     前一条的解析会被后一条取消，只有最后一条真正编译。 */
  function cancelParseTimer(fu) {
    if (fu && fu.parseTimer != null) {
      clearTimeout(fu.parseTimer);
      fu.parseTimer = null;
    }
  }

  function scheduleParse(fu) {
    cancelParseTimer(fu);
    fu.parseTimer = setTimeout(() => {
      fu.parseTimer = null;
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
  }

  const scheduleRecomputeDebounced = debounce(() => recompute(), 120);

  plot.onView(() => scheduleRecomputeDebounced());
  /* 鼠标每秒能发一百多个 move，读数 DOM 没必要每个事件都重搭一次；
     合并到一帧一次，画布上的探针仍然由画布自己按 rAF 跟进。 */
  let hover2Raf = 0;
  let hover2Value = null;
  function scheduleReadout(h) {
    hover2Value = h;
    if (hover2Raf) return;
    hover2Raf = requestAnimationFrame(() => {
      hover2Raf = 0;
      paintReadout(hover2Value);
    });
  }
  plot.onHover(scheduleReadout);
  /* 3D 的悬停读数：surface 反解出 (x,y) 并用 at 求出 z，这里只剩展示 */
  let hover3Raf = 0;
  surface.onHover((h) => {
    hover3 = h;
    if (hover3Raf) return;
    hover3Raf = requestAnimationFrame(() => {
      hover3Raf = 0;
      paintReadout3();
    });
  });
  plot.onSelect((r, done) => {
    state.area = r ? [Math.min(r[0], r[1]), Math.max(r[0], r[1])] : null;
    /* refreshPlot 照跑（填充区域要跟着选区走），但它排的重绘会与画布
       自己那一次合并成同一帧，所以不再是一帧画两遍。
       真正贵的是性质面板——重建整棵 DOM 加每条曲线一次 KaTeX——
       那个等松手（done）再算，拖的时候看选区和填充就够了。 */
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
    /* 预设自己带模式：点 3D 的例子就切到立体，反之切回平面 */
    const presetMode = p.domain !== undefined ? '3d' : '2d';
    const modeChanged = enterMode(presetMode);
    if (modeChanged) {
      syncMode();
      renderPresets();
    }
    if (p.domain !== undefined) {
      state.domain = p.domain;
      domainRange.value = String(p.domain);
      domainVal.textContent = '±' + p.domain;
    }
    state.funcs = p.funcs.map((src, i) => makeFunc(src, i));
    state.params = Object.assign({}, p.params || {});
    state.params2d = presetMode === '2d' ? Object.assign({}, state.params) : null;
    state.area = null;
    state.areaMode = false;
    plot.setDragMode('pan');
    plot.setSelection(null);
    tArea.sync();
    if (p.view) plot.setView({ x0: p.view[0], x1: p.view[1] }, true);
    renderCards();
    state.activeId = state.funcs[0].id;
    syncActive();
    refreshAll(false);
    if (presetMode === '2d') state.params2d = Object.assign({}, state.params);
    computeAndFit();
  }

  function refreshAll(schedule) {
    activeFuncs().forEach((fu) => {
      cancelParseTimer(fu);
      parseOne(fu);
    });
    syncParams();
    paintParamNames();
    if (schedule !== false) scheduleRecompute();
  }

  function computeAndFit() {
    recompute();
    if (state.mode === '2d') {
      plot.fitY(0.12);
      recompute();
    }
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
  renderPresets();
  syncMode();
  syncCompactLayout();
  if (o.view) plot.setView({ x0: o.view[0], x1: o.view[1] }, true);
  refreshAll(false);
  computeAndFit();

  return {
    el: root,
    /** 外部换式子用（嵌进课文时方便）。第二参数可以是 [x0,x1] 或 {view, mode, domain} */
    setFuncs(list, opts) {
      const op = Array.isArray(opts) ? { view: opts } : (opts || {});
      if (op.mode && op.mode !== state.mode) {
        enterMode(op.mode);
        syncMode();
        renderPresets();
      }
      if (op.domain !== undefined) state.domain = op.domain;
      const cap = state.mode === '3d' ? MAX_FUNCS_3D : MAX_FUNCS;
      state.funcs = (list || []).slice(0, cap).map((src, i) => makeFunc(src, i));
      if (op.view) plot.setView({ x0: op.view[0], x1: op.view[1] }, true);
      renderCards();
      state.activeId = state.funcs[0] ? state.funcs[0].id : null;
      syncActive();
      refreshAll(false);
      state.params2d = state.mode === '2d' ? Object.assign({}, state.params) : null;
      computeAndFit();
    },
    getView() { return plot.view; },
    destroy() {
      state.funcs.forEach(cancelParseTimer);
      scheduleRecomputeDebounced.cancel();
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (hover2Raf) {
        cancelAnimationFrame(hover2Raf);
        hover2Raf = 0;
      }
      if (hover3Raf) {
        cancelAnimationFrame(hover3Raf);
        hover3Raf = 0;
      }
      if (compactMq && compactMq.removeEventListener) {
        compactMq.removeEventListener('change', syncCompactLayout);
      } else if (compactMq && compactMq.removeListener) {
        compactMq.removeListener(syncCompactLayout);
      }
      plot.destroy();
      /* 曲面也在场：漏了它，它的 ResizeObserver 与 MutationObserver
         会一直挂着，工作区早就拆了它还在监听 documentElement */
      surface.destroy();
      if (root.parentNode) root.parentNode.removeChild(root);
    },
  };
}

export { PRESETS2D, PRESETS3D };
export default createWorkspace;
