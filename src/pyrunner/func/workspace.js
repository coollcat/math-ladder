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
 *
 * 2026-10 扩展（详见 UNIT_GUIDES/see-function.md「多形态与 Python 联动」）：
 *   · 一个输入框能写的不只 y = f(x)：极坐标、参数曲线、隐函数（平面），
 *     参数曲面、空间曲线、球坐标（立体）——判别在 forms.js；
 *   · 平面与立体各有一份函数表和参数表，切模式互不干扰；立体最多叠 3 个对象；
 *   · 与浮窗 Python 双向互通：工具栏「→ Python」把当前式子译成 numpy / sympy 代码送过去，
 *     浮窗里 see(...) 把式子或 Python 函数画回来，seen() 取回此刻的函数（总线见 bridge.js）。
 * ========================================================================= */

import { build } from './expr.js';
import { texToText, isLatex, countPlaceholders } from './latex.js';
import * as A from './analyze.js';
import * as F from './forms.js';
import { pyName, toNumpy, toSympy, numpyScript, sympyScript } from './topy.js';
import { getHub, shareUrl } from './bridge.js';
import { createPlot, themeColors } from './plot.js';
import { createSurface } from './surface.js';
import { buildKeypad, nextPlaceholder } from './keypad.js';
import { getKatex } from '../mathout';
import { openInConsole } from '../enhancer';

const MAX_FUNCS = 6;

/* 立体最多叠 3 个对象（曲面 + 曲面上的一条路径，或两张相交的面）。
   所有面片与线段在 surface.js 里统一按深度排序，叠起来遮挡关系大体正确；
   两张面真正互相穿插的那条交线附近，画家算法仍可能排错一两格——这是不用 WebGL 的代价 */
const MAX_FUNCS_3D = 3;

/* 每种形态在卡片上的称呼（自变量写在名字后面，读起来就是 f₁(x) =、r₁(θ) =） */
const KIND_ARGS = {
  fx: '(x) =', py: '(x) =', polar: '(θ) =', param2: '(t) =', implicit: '：',
  fxy: '(x, y) =', psurf: '(u, v) =', curve3: '(t) =', sph: '(θ, φ) =',
};
const KIND_LABEL = {
  fx: '函数', py: 'Python 函数', polar: '极坐标', param2: '参数曲线', implicit: '隐函数',
  fxy: '曲面', psurf: '参数曲面', curve3: '空间曲线', sph: '球坐标',
};

/* 「＋ 加一条」的形态模板：点哪个就新开一张卡，里面填好一个能直接看的例子 */
const TEMPLATES = {
  '2d': [
    { kind: 'fx', label: '函数 y = f(x)', src: 'x^2/4 - 1' },
    { kind: 'polar', label: '极坐标 r(θ)', src: 'r = 1 + cos(θ)' },
    { kind: 'param2', label: '参数曲线', src: '(cos(3*t), sin(2*t))' },
    { kind: 'implicit', label: '隐函数 F = 0', src: 'x^2 + y^2 = 4' },
  ],
  '3d': [
    { kind: 'fxy', label: '曲面 z = f(x,y)', src: 'x^2 - y^2' },
    { kind: 'psurf', label: '参数曲面', src: '(cos(u)*sin(v), sin(u)*sin(v), cos(v))', ranges: { u: ['0', '2π'], v: ['0', 'π'] } },
    { kind: 'curve3', label: '空间曲线', src: '(cos(t), sin(t), t/6)' },
    { kind: 'sph', label: '球坐标 r(θ,φ)', src: 'r = 1 + 0.2*sin(5*θ)*sin(φ)' },
  ],
};

/* 开场就能点的例子：每一个都对应一种「值得看见」的形状。
   funcs 里可以是字符串，也可以是 { src, ranges }（参数的取值范围，写法同卡片上的范围框） */
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
  /* ---- 不是 y = f(x) 的平面曲线 ---- */
  { name: '心形线', funcs: ['r = 1 + cos(θ)'], view: [-1, 2.5] },
  { name: '玫瑰线', funcs: ['r = cos(k*θ)'], params: { k: 3 }, view: [-1.5, 1.5] },
  { name: '阿基米德螺线', funcs: [{ src: 'r = θ/2', ranges: { theta: ['0', '6π'] } }], view: [-10, 10] },
  { name: '李萨如图形', funcs: ['(sin(a*t), sin(b*t))'], params: { a: 3, b: 2 }, view: [-1.5, 1.5] },
  { name: '摆线', funcs: [{ src: '(t - sin(t), 1 - cos(t))', ranges: { t: ['0', '4π'] } }], view: [-1, 13] },
  { name: '圆与直线', funcs: ['x^2 + y^2 = 4', 'y = x/2 + 1'], view: [-4, 4] },
  { name: '心形方程', funcs: ['(x^2 + y^2 - 1)^3 = x^2*y^3'], view: [-1.8, 1.8] },
  { name: '双曲线族', funcs: ['x^2 - y^2 = c'], params: { c: 1 }, view: [-5, 5] },
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
  /* ---- 参数曲面 / 空间曲线 / 球坐标：按真实比例画 ---- */
  { name: '球面', funcs: ['r = 1'], mode: '3d' },
  { name: '环面', funcs: ['((2 + cos(v))*cos(u), (2 + cos(v))*sin(u), sin(v))'], mode: '3d' },
  {
    name: '莫比乌斯带',
    funcs: [{
      src: '((1 + v/2*cos(u/2))*cos(u), (1 + v/2*cos(u/2))*sin(u), v/2*sin(u/2))',
      ranges: { u: ['0', '2π'], v: ['-1', '1'] },
    }],
    mode: '3d',
  },
  { name: '螺旋线', funcs: [{ src: '(cos(t), sin(t), t/6)', ranges: { t: ['0', '6π'] } }], mode: '3d' },
  { name: '球谐花瓣', funcs: ['r = 1 + 0.3*sin(4*θ)*sin(φ)^2'], mode: '3d' },
  {
    name: '曲面上的路径',
    funcs: ['x^2 - y^2', { src: '(2*cos(t), 2*sin(t), 4*cos(2*t))', ranges: { t: ['0', '2π'] } }],
    domain: 3,
  },
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

/** 范围框里的一个端点：'2π'、'-1'、'pi/2' 都行（同一套算式内核），参数取当前值；算不出给 NaN */
function evalConst(text, P) {
  const s = String(text === undefined || text === null ? '' : text).trim();
  if (!s) return NaN;
  try {
    const c = build(F.normalizeText(isLatex(s) ? texToText(s) : s), { vars: [] });
    const v = c.fn(P || {});
    return typeof v === 'number' && Number.isFinite(v) ? v : NaN;
  } catch (e) {
    void e;
    return NaN;
  }
}

/** 预设 / Python 送来的一条：统一成 { src, ranges, py } */
function normItem(it) {
  if (typeof it === 'string') return { src: it, ranges: null, py: null };
  const o = it || {};
  return { src: String(o.src || ''), ranges: o.ranges || null, py: o.py || null };
}

/** 去掉两端 0.5% 后的有限值范围（tan 一类冲向无穷的采样不该决定视野） */
function quantRange(arrs) {
  const v = [];
  arrs.forEach((a) => {
    for (let i = 0; i < a.length; i += 1) if (Number.isFinite(a[i])) v.push(a[i]);
  });
  if (v.length < 2) return null;
  v.sort((p, q) => p - q);
  const cut = Math.floor(v.length * 0.005);
  return [v[cut], v[v.length - 1 - cut]];
}

function texEscape(s) {
  return String(s).replace(/[\\{}_^#$%&~]/g, (c) => '\\' + c);
}

export function createWorkspace(host, opts) {
  const o = opts || {};
  const onIntro = typeof o.onIntro === 'function' ? o.onIntro : null;
  let uid = 0;

  const startMode = o.mode === '3d' ? '3d' : '2d';
  const state = {
    funcs: [],
    params: Object.assign({}, o.params),
    activeId: null,
    area: null,          /* [a,b] 积分区间 */
    areaMode: false,
    mode: startMode,
    domain: o.domain || 4,   /* 3D 的 xy 域半边长 */
    /* 平面与立体各一份函数表和参数表：切过去再切回来，两边的式子和旋钮都原样还在。
       （此前两边共用一张表，立体只取第一条——平面里的 sin(x) 一切过去就成了一张
       沿 y 不变的瓦楞板，参数也要靠快照来回倒，坑 12 就出在这。） */
    lists: { '2d': [], '3d': [] },
    paramsBy: { '2d': {}, '3d': {} },
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

  state.paramsBy[startMode] = state.params;
  const activeFuncs = () => state.funcs;
  const capOf = (mode) => (mode === '3d' ? MAX_FUNCS_3D : MAX_FUNCS);

  /** 换掉当前模式的函数表（两处引用一起换，别让 lists 里留着旧数组） */
  function setList(list) {
    state.funcs = list;
    state.lists[state.mode] = list;
  }

  /* 换模式不换式子：平面和立体看的是同一批表达式，只是画法不同。
     放不下的（立体上限 3 个）、或者这种形态对面才有的（隐函数只在平面、参数曲面只在立体），
     卡片上会写清楚，不会悄悄不画。 */
  function enterMode(v) {
    const next = v === '3d' ? '3d' : '2d';
    if (state.mode === next) return false;
    state.funcs.forEach(cancelParseTimer);
    state.lists[state.mode] = state.funcs;
    state.paramsBy[state.mode] = state.params;
    const carry = state.funcs.filter((fu) => fu.py || (fu.src || '').trim());
    state.mode = next;
    state.params = state.paramsBy[next] || {};
    state.funcs = carry.length ? carry : [makeFunc(next === '3d' ? 'x*y' : 'sin(x)/x', 0)];
    state.lists[next] = state.funcs;
    const active = activeFuncs();
    if (!active.some((fu) => fu.id === state.activeId)) {
      state.activeId = active[0] ? active[0].id : null;
    }
    return true;
  }

  /* ---------- 骨架 ---------- */

  const root = el('div', 'ml-fn' + (o.inline ? ' ml-fn--inline' : ''));
  const left = el('div', 'ml-fn__left');
  const right = el('div', 'ml-fn__right');
  root.append(left, right);
  host.appendChild(root);

  /* --- 左栏 --- */

  const cardBox = el('div', 'ml-fn__cards');
  const addRow = el('div', 'ml-fn__addrow');
  const btnAdd = el('button', 'ml-fn__btn', '＋ 再叠一条');
  btnAdd.type = 'button';
  btnAdd.title = '新开一张空白卡片（回车也行）';
  /* 形态模板：不知道参数曲线 / 隐函数怎么写的，点一下就有个能看的例子 */
  const kindRow = el('div', 'ml-fn__kindrow');
  addRow.append(btnAdd, kindRow);
  function renderKindRow() {
    kindRow.innerHTML = '';
    TEMPLATES[state.mode].forEach((tp) => {
      const b = el('button', 'ml-fn__kindchip', tp.label);
      b.type = 'button';
      b.title = '加一条' + tp.label + '，例子：' + tp.src;
      b.addEventListener('click', () => addFunc(tp.src, tp.ranges));
      kindRow.appendChild(b);
    });
  }

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
  tbFit.title = '按当前 x 范围重新定 y 的上下界（去掉极大极小后再留白）；' +
    '有极坐标 / 参数曲线 / 隐函数时改成横纵等比例，圆才画得圆';
  tbFit.addEventListener('click', () => {
    fitView();
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

  /* 模式切换：平面与立体的自变量表不同（后者多一个 y），两边各有一份函数表 */
  const modeSeg = el('div', 'ml-fn__seg');
  modeSeg.setAttribute('aria-label', '平面或立体模式');
  const modeBtns = [
    { v: '2d', label: '平面', title: 'y = f(x)、极坐标 r = f(θ)、参数曲线 (x(t), y(t))、隐函数 F(x, y) = 0' },
    { v: '3d', label: '立体', title: 'z = f(x, y)、参数曲面 (x, y, z)(u, v)、空间曲线 (x, y, z)(t)、球坐标 r = f(θ, φ)' },
  ].map((m) => {
    const b = el('button', 'ml-fn__segbtn', m.label);
    b.type = 'button';
    b.title = m.title;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => setMode(m.v));
    modeSeg.appendChild(b);
    return { b, v: m.v };
  });

  /* Python 那组：把当前式子译成代码送进浮窗，或复制一条能还原现场的链接 */
  const tbPy = el('div', 'ml-fn__tbgroup ml-fn__tbpy');
  const mkPy = (label, title, fn) => {
    const b = el('button', 'ml-fn__btn ml-fn__btn--py', label);
    b.type = 'button';
    b.title = title;
    b.addEventListener('click', fn);
    tbPy.appendChild(b);
    return b;
  };
  mkPy('→ Python 作图', '把这里的式子译成 numpy + matplotlib 代码送进 Py 浮窗并运行；参数变成浮窗里的滑块',
    () => sendToPython('num'));
  mkPy('→ sympy 推导', '译成 sympy 代码：求导、积分、极限、驻点（参数曲线给切线斜率与弧长，曲面给梯度与黑塞矩阵）',
    () => sendToPython('sym'));
  if (!o.inline) {
    mkPy('复制链接', '复制一条链接：打开就是现在这几条式子、参数和模式', () => copyShareLink());
  }
  const tbMsg = el('span', 'ml-fn__tbmsg');
  tbMsg.setAttribute('aria-live', 'polite');
  tbPy.appendChild(tbMsg);
  let msgTimer = null;
  function flash(text) {
    tbMsg.textContent = text;
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => { tbMsg.textContent = ''; }, 3600);
  }

  toolbar.append(modeSeg, tb2d, tb3d, tbPy);

  function setMode(v) {
    if (!enterMode(v)) return;
    syncMode();
    renderPresets();
    /* 先按新模式把式子重新编译一遍，再建卡片：标题（f(x) 还是 f(x, y)）与形态徽章都跟着新形态走 */
    refreshAll(false);
    renderCards();
    computeAndFit();
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
    renderKindRow();
    if (d3) surface.draw();
    else plot.draw();
  }

  /* ---------- 函数卡片 ---------- */

  /**
   * 一条函数。form 是 forms.compileForm 的结果（形态 + 编译好的分量）；
   * py 非空时它是浮窗里的 Python 函数（{id, name, nargs, params}），式子框只读。
   * rangeText 是参数的取值范围（原样存文本，'2π' 这种写法要保住，按当前参数现算）。
   */
  function makeFunc(src, colorIndex, extra) {
    uid += 1;
    const e = extra || {};
    const rangeText = {};
    if (e.ranges) {
      Object.keys(e.ranges).forEach((k) => {
        const r = e.ranges[k];
        if (Array.isArray(r) && r.length === 2) rangeText[k] = [String(r[0]), String(r[1])];
      });
    }
    return {
      id: uid,
      src: e.py ? 'py:' + (e.py.name || 'f') : (src || ''),
      form: null,
      error: null,
      tex: '',
      visible: true,
      showDeriv: false,
      colorIndex: colorIndex === undefined ? uid - 1 : colorIndex,
      result: null,
      result3: null,
      inputs: null,
      parseTimer: null,
      rangeText,
      py: e.py || null,
    };
  }

  function colorOf(fu) {
    return themeColors().series(fu.colorIndex);
  }

  const kindOf = (fu) => (fu.form ? fu.form.kind : null);
  const isGraph = (fu) => !!fu.form && F.isGraphKind(fu.form.kind);

  /** 卡片标题：f₁(x) = / f₁(θ) = …；还没解析出形态时按模式给默认的 */
  function cardTitle(fu, index) {
    const k = kindOf(fu) || (state.mode === '3d' ? 'fxy' : 'fx');
    let args = KIND_ARGS[k] || '(x) =';
    if (k === 'py' && fu.py && fu.py.nargs >= 2) args = '(x, y) =';
    return 'f' + subDigits(index + 1) + args;
  }

  /** 这一条的参数范围（数值）：缺省用形态默认值，写坏了也回落到默认值 */
  function rangesOf(fu) {
    const out = {};
    const k = kindOf(fu);
    const spec = k && F.KINDS[k] && F.KINDS[k].ranges;
    if (!spec) return out;
    spec.forEach(([key, , a, b]) => {
      const t = fu.rangeText[key] || [a, b];
      let lo = evalConst(t[0], state.params);
      let hi = evalConst(t[1], state.params);
      if (!Number.isFinite(lo)) lo = evalConst(a);
      if (!Number.isFinite(hi)) hi = evalConst(b);
      out[key] = [lo, hi];
    });
    return out;
  }

  function buildCard(fu, index) {
    const over = state.mode === '3d' && index >= MAX_FUNCS_3D;
    const card = el('div', 'ml-fn__card' + (fu.py ? ' is-py' : '') + (over ? ' is-capped' : ''));
    card.dataset.id = String(fu.id);
    if (over) card.title = '立体里最多同时画 ' + MAX_FUNCS_3D + ' 个对象：这条先收着，切回「平面」就会画出来';

    const head = el('div', 'ml-fn__cardhead');
    const dot = el('span', 'ml-fn__dot');
    dot.style.background = colorOf(fu);
    /* 标题跟着形态走：3D 里是 f(x, y)，极坐标是 f(θ)……否则会以为 y、θ 是参数 */
    const fLabel = 'f' + subDigits(index + 1);
    const name = el('span', 'ml-fn__fname', cardTitle(fu, index));
    const badge = el('span', 'ml-fn__kind', '');

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
    head.append(dot, name, badge, btns);

    const preview = el('div', 'ml-fn__preview');
    preview.title = '点一下回到输入框';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'ml-fn__src';
    input.spellcheck = false;
    input.autocomplete = 'off';
    input.placeholder = state.mode === '3d'
      ? 'x*y · (cos(u), sin(u), v) · (cos(t), sin(t), t/5) · r = 1'
      : 'sin(x)/x · r = 1+cos(θ) · (cos(t), sin(t)) · x^2+y^2=4';
    input.value = fu.py ? fu.py.name + (fu.py.nargs >= 2 ? '(x, y)' : '(x)') + '  ← 浮窗里的 Python 函数' : fu.src;
    input.readOnly = !!fu.py;
    input.setAttribute('aria-label', fLabel + ' 的表达式');

    /* 参数范围：t ∈ [0, 2π] 这类。只有参数式 / 极坐标 / 球坐标才有，解析后按形态重建 */
    const rangeRow = el('div', 'ml-fn__ranges');

    const err = el('div', 'ml-fn__err');

    card.append(head, preview, input, rangeRow, err);

    /* 事件 */
    input.addEventListener('focus', () => {
      state.activeId = fu.id;
      syncActive();
    });
    input.addEventListener('input', () => {
      if (fu.py) return;
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
      setList(state.funcs.filter((x) => x.id !== fu.id));
      if (state.activeId === fu.id) {
        state.activeId = state.funcs[0] ? state.funcs[0].id : null;
      }
      renderCards();
      refreshAll();
    });

    fu.inputs = { card, dot, name, badge, preview, input, rangeRow, err, bEye, bDeriv, bDel, index };
    return card;
  }

  /** 按形态重建范围输入框（形态没变、框已在就不动，免得打字时焦点被抢） */
  function syncRangeRow(fu) {
    if (!fu.inputs) return;
    const row = fu.inputs.rangeRow;
    const k = kindOf(fu);
    const spec = (k && F.KINDS[k] && F.KINDS[k].ranges) || null;
    const key = spec ? k : '';
    if (row.dataset.kind === key) return;
    row.dataset.kind = key;
    row.innerHTML = '';
    row.classList.toggle('is-show', !!spec);
    if (!spec) return;
    spec.forEach(([rk, disp, a, b]) => {
      const cur = fu.rangeText[rk] || [a, b];
      const item = el('label', 'ml-fn__range');
      item.appendChild(el('span', 'ml-fn__rangename', disp + ' ∈ ['));
      const mk = (val, side) => {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'ml-fn__rangeinp';
        inp.value = val;
        inp.spellcheck = false;
        inp.autocomplete = 'off';
        inp.setAttribute('aria-label', disp + (side ? ' 的上界' : ' 的下界'));
        inp.addEventListener('input', () => {
          const t = (fu.rangeText[rk] || [a, b]).slice();
          t[side] = inp.value;
          fu.rangeText[rk] = t;
          const ok = Number.isFinite(evalConst(inp.value, state.params));
          inp.classList.toggle('is-bad', !ok);
          if (ok) scheduleRecompute();
        });
        return inp;
      };
      item.append(mk(cur[0], 0), el('span', 'ml-fn__rangesep', ','), mk(cur[1], 1), el('span', 'ml-fn__rangename', ']'));
      row.appendChild(item);
    });
  }

  /* ₁₂₃ 下标数字 */
  function subDigits(n) {
    const map = '₀₁₂₃₄₅₆₇₈₉';
    return String(n).split('').map((c) => map[+c] || c).join('');
  }

  function renderCards() {
    /* 只给当前模式真正会用的卡片保留 DOM 引用；3D 下其余曲线的旧 inputs
       如果不清掉，符号键盘可能往已经移除的输入框里插字。 */
    Object.keys(state.lists).forEach((m) => state.lists[m].forEach((fu) => { fu.inputs = null; }));
    cardBox.innerHTML = '';
    const list = activeFuncs();
    list.forEach((fu, i) => cardBox.appendChild(buildCard(fu, i)));
    const cap = capOf(state.mode);
    const full = state.funcs.length >= cap;
    btnAdd.disabled = full;
    kindRow.querySelectorAll('button').forEach((b) => { b.disabled = full; });
    if (state.mode === '3d' && state.funcs.length >= MAX_FUNCS_3D) {
      const over = state.funcs.length - MAX_FUNCS_3D;
      cardBox.appendChild(el('div', 'ml-fn__note' + (over > 0 ? ' is-warn' : ''),
        over > 0
          ? '立体最多同时画 ' + MAX_FUNCS_3D + ' 个对象：后面 ' + over + ' 条先收着，切回「平面」就都画。'
          : '立体最多叠 ' + MAX_FUNCS_3D + ' 个对象（再多就互相挡得看不清了）。'));
    }
    syncActive();
    list.forEach(syncCard);
    list.forEach(paintPreview);
  }

  function syncActive() {
    state.funcs.forEach((fu) => {
      if (fu.inputs) fu.inputs.card.classList.toggle('is-active', fu.id === state.activeId);
    });
    notifyIntro();
  }

  function syncCard(fu) {
    if (!fu.inputs) return;
    fu.inputs.card.classList.toggle('is-hidden', !fu.visible);
    fu.inputs.bDeriv.classList.toggle('is-on', fu.showDeriv);
    fu.inputs.bEye.textContent = fu.visible ? '◉' : '○';
    fu.inputs.bDel.disabled = state.funcs.length <= 1;
    fu.inputs.dot.style.background = colorOf(fu);
    /* 导函数只对真函数 y = f(x) 有意义；立体里也不画 */
    fu.inputs.bDeriv.classList.toggle('is-off', state.mode === '3d' || (!!fu.form && !isGraph(fu)));
    fu.inputs.name.textContent = cardTitle(fu, fu.inputs.index);
    const k = kindOf(fu);
    /* 普通函数 / 曲面不挂徽标（最常见，挂了是噪音），其余形态标出来，告诉读者「我认出来了」 */
    const showBadge = k && k !== 'fx' && k !== 'fxy';
    fu.inputs.badge.textContent = showBadge ? KIND_LABEL[k] : '';
    fu.inputs.badge.classList.toggle('is-show', !!showBadge);
    syncErr(fu);
    syncRangeRow(fu);
  }

  function syncErr(fu) {
    if (!fu.inputs) return;
    if (fu.inputs.err.textContent !== (fu.error || '')) fu.inputs.err.textContent = fu.error || '';
    fu.inputs.err.classList.toggle('is-show', !!fu.error);
  }

  /* ---------- 预览 ---------- */

  let previewToken = 0;
  function paintPreview(fu) {
    if (!fu.inputs) return;
    const box = fu.inputs.preview;
    const raw = fu.src.trim();
    /* 没改过的式子不重渲（把渲染键记在节点上，卡片重建后自然失效）。
       键里带上模式：同一句 (cos t, sin t, t) 在平面是错、在立体是空间曲线 */
    const paintKey = state.mode + '|' + raw;
    if (box.dataset.painted === paintKey) return;
    box.dataset.painted = paintKey;
    const token = String(++previewToken);
    box.dataset.paintToken = token;
    if (!raw) {
      box.className = 'ml-fn__preview is-empty';
      box.textContent = '在下面写个式子，或点下面的符号键盘拼一个';
      return;
    }
    let tex;
    try {
      tex = fu.py ? fu.tex || '\\mathtt{python}' : F.displayTex(raw, state.mode);
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

  /**
   * 这条式子在本模式画不了，但在对面能认出来：直接说清「它是哪种形态、该去哪个模式」。
   * 换模式时式子会原样带过去，带不过去的必须有人说话。
   */
  function modeHint(raw, mode) {
    const other = mode === '3d' ? '2d' : '3d';
    let f = null;
    try {
      f = F.compileForm(raw, other);
    } catch (e) {
      return null;
    }
    if (!f) return null;
    const label = (F.KINDS[f.kind] && F.KINDS[f.kind].label) || '式子';
    return other === '3d'
      ? '这是' + label + '，只能在「立体」里画——点上面的「立体」，或把式子改成立体也能认的写法'
      : '这是' + label + '，只能在「平面」里画——点上面的「平面」，或把式子改成平面也能认的写法';
  }

  function parseOne(fu) {
    if (fu.py) {
      /* Python 函数：没有式子可解析，参数就是它带默认值的关键字参数 */
      const n2 = fu.py.nargs >= 2;
      const want2 = state.mode === '3d';
      const params = Object.keys(fu.py.params || {}).sort();
      fu.tex = '\\mathtt{' + texEscape(fu.py.name || 'f') + '}(' + (n2 ? 'x,\\,y' : 'x') + ')';
      if (n2 !== want2) {
        fu.form = null;
        fu.error = n2 ? '这个 Python 函数有两个自变量 (x, y)：切到「立体」看'
          : '这个 Python 函数只有一个自变量：切到「平面」看';
        return;
      }
      fu.form = { kind: 'py', comps: [], params, tex: fu.tex, displayTex: fu.tex };
      fu.error = null;
      return;
    }
    const raw = fu.src.trim();
    if (!raw) {
      fu.form = null;
      fu.error = null;
      fu.tex = '';
      return;
    }
    try {
      /* 形态判别 + 编译都在 forms.js：LaTeX 先翻成算式文本，np.sin、x**2 这类 Python 写法也认。
         自变量表跟着形态走：平面函数里 y 只是个可调参数，隐函数和立体里 y 才是自变量 */
      fu.form = F.compileForm(raw, state.mode);
      fu.error = null;
      fu.tex = fu.form ? fu.form.tex : '';
    } catch (e) {
      fu.form = null;
      fu.error = modeHint(raw, state.mode) || (e && e.message) || String(e);
      fu.tex = '';
    }
  }

  function collectParams(list) {
    const set = new Set();
    list.forEach((fu) => {
      if (fu.form) fu.form.params.forEach((p) => set.add(p));
    });
    return Array.from(set).sort();
  }

  function allParams() { return collectParams(state.funcs); }
  function visibleParams() { return collectParams(activeFuncs()); }

  /* ---------- 参数滑块 ---------- */

  /* 滑块范围：默认 [-10, 10]；Python 送来 a=300 或 eps=0.002 这种值时按量级放大 / 加细，
     否则滑块一碰就跳到 ±10，原值再也拖不回来（此前范围写死）。 */
  const paramMeta = {};
  function metaOf(p) {
    const v = Number(state.params[p]) || 0;
    let m = paramMeta[p];
    if (!m || v < m.min || v > m.max) {
      const R = Math.max(10, Math.pow(10, Math.ceil(Math.log10(Math.abs(v) * 2 || 1))));
      let step = R / 200;
      if (v !== 0 && Math.abs(v) < 0.1) step = Math.min(step, Math.pow(10, Math.floor(Math.log10(Math.abs(v))) - 1));
      m = { min: -R, max: R, step };
      paramMeta[p] = m;
    }
    return m;
  }

  function syncParams() {
    const names = allParams();
    const keep = new Set(names);
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
      const m = metaOf(p);
      const range = document.createElement('input');
      range.type = 'range';
      range.min = String(m.min);
      range.max = String(m.max);
      range.step = String(m.step);
      range.value = String(state.params[p]);
      range.setAttribute('aria-label', '参数 ' + p + ' 的值');
      const val = el('span', 'ml-fn__paramval', fmtNum(state.params[p], 2));
      const commit = (value, live) => {
        state.params[p] = value;
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
        commit(Math.max(m.min, Math.min(m.max, state.params[p] * 2)), false);
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
      fu.result = null;
      if (!fu.form || !fu.visible) return;
      const k = fu.form.kind;
      if (k === 'fx' || k === 'py') {
        const f = k === 'py' ? pyFn1(fu, x0, x1, live) : A.makeFn(fu.form.comps[0], state.params);
        if (!f) return;
        const r = A.analyze(f, x0, x1, {
          zeros: state.show.zeros,
          extrema: state.show.extrema,
          refine: !live,
        });
        r.f = f;
        r.kind = k;
        fu.result = r;
        return;
      }
      fu.result = sampleFree(fu, k, live);
    });
    /* Python 函数的错误是采样时才知道的（浮窗重置过就取不到值），卡片上同步报一声 */
    state.funcs.forEach((fu) => { if (fu.py) syncErr(fu); });

    /* 交点：两两求一次，只在此刻可见的「真函数」之间（参数曲线、隐函数没有 y = f(x) 可减）。
       拖动参数时先跳过，松手后再补上；否则 6 条曲线要跑 15 组 400 点网格，是拖动的最大头。 */
    state.crosses = [];
    if (!live) {
      const vis = state.funcs.filter((fu) => fu.result && fu.result.f);
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

  /* 参数曲面网格：u 方向 56 格、v 方向 32 格（环面、球面的「经线」方向更需要细）；
     拖滑块时减半保手感 */
  const PSURF_NU = 56;
  const PSURF_NV = 32;

  function recompute3(withInfo) {
    const live = withInfo === false;
    const d = Math.max(0.05, state.domain);
    const P = state.params;
    state.funcs.forEach((fu, index) => {
      fu.result3 = null;
      if (index >= MAX_FUNCS_3D || !fu.form || !fu.visible) return;
      const k = fu.form.kind;
      const c = fu.form.comps;
      if (k === 'fxy' || k === 'py') {
        let f;
        let g;
        if (k === 'py') {
          g = pyGrid(fu, d, GRID_N);
          if (!g) return;
          f = gridInterp(g);
        } else {
          f = A.makeFn(c[0], P);
          g = A.grid2(f, -d, d, -d, d, GRID_N, GRID_N);
        }
        /* 补可去奇点：sin(√(x²+y²))/√(x²+y²) 在原点正是 0/0 */
        const healed = A.healGrid2(g);
        const r = A.zRange(g.z);
        fu.result3 = {
          kind: k,
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
        return;
      }
      const R = rangesOf(fu);
      const ev = (comp) => F.evaluator(comp, k, P);
      const nu = live ? PSURF_NU / 2 : PSURF_NU;
      const nv = live ? PSURF_NV / 2 : PSURF_NV;
      if (k === 'psurf' || k === 'sph') {
        const S = k === 'sph'
          ? F.sampleSpherical(ev(c[0]), R.theta[0], R.theta[1], R.phi[0], R.phi[1], nu, nv)
          : F.sampleSurface(ev(c[0]), ev(c[1]), ev(c[2]), R.u[0], R.u[1], R.v[0], R.v[1], nu, nv);
        const box = [F.finiteRange(S.X), F.finiteRange(S.Y), F.finiteRange(S.Z)];
        fu.result3 = {
          kind: k,
          S,
          ranges: R,
          box,
          empty: box.some((b) => !b),
          area: live ? NaN : F.surfaceArea(S),
          volume: !live && k === 'sph' ? sphVolume(ev(c[0]), R) : NaN,
        };
        return;
      }
      if (k === 'curve3') {
        const C = F.sampleCurve3(ev(c[0]), ev(c[1]), ev(c[2]), R.t[0], R.t[1], live ? 500 : 1400);
        const box = [F.finiteRange(C.X), F.finiteRange(C.Y), F.finiteRange(C.Z)];
        fu.result3 = { kind: k, C, ranges: R, box, empty: box.some((b) => !b), len: F.arcLength3(C) };
      }
    });
    state.funcs.forEach((fu) => { if (fu.py) syncErr(fu); });
    refreshPlot();
    if (withInfo !== false) refreshInfo();
  }

  /* ---------- 采样小工具 ---------- */

  /** 球坐标围成的体积 ∭ dV = ∬ r³/3 · sinφ dθ dφ（中点法 120×80，r 有算不出的点就放弃） */
  function sphVolume(fr, R) {
    const [t0, t1] = R.theta;
    const [p0, p1] = R.phi;
    const NT = 120;
    const NP = 80;
    const ht = (t1 - t0) / NT;
    const hp = (p1 - p0) / NP;
    let s = 0;
    for (let i = 0; i < NT; i += 1) {
      const t = t0 + (i + 0.5) * ht;
      for (let j = 0; j < NP; j += 1) {
        const p = p0 + (j + 0.5) * hp;
        const r = fr(t, p);
        if (!Number.isFinite(r)) return NaN;
        s += (r * r * r) / 3 * Math.sin(p);
      }
    }
    return Math.abs(s * ht * hp);
  }

  /** Python 函数在视野上的取值：一次采一整排，之后按表线性插值（分析内核要逐点求值，不能每点都进一次 Python） */
  function pyParamsOf(fu) {
    const out = {};
    Object.keys((fu.py && fu.py.params) || {}).forEach((k) => {
      out[k] = Number.isFinite(state.params[k]) ? state.params[k] : fu.py.params[k];
    });
    return out;
  }

  function pyFn1(fu, x0, x1, live) {
    const hub = getHub();
    const n = live ? 500 : 1600;
    const ys = hub ? hub.samplePy(fu.py.id, { kind: 'x', x0, x1, n, params: pyParamsOf(fu) }) : null;
    if (!ys || ys.length !== n + 1) {
      fu.error = 'Python 函数取不到值了（浮窗重置过、或页面刷新过）：回浮窗再 see() 一次';
      return null;
    }
    fu.error = null;
    const h = (x1 - x0) / n;
    return (x) => {
      const p = (x - x0) / h;
      if (!(p >= 0 && p <= n)) return NaN;
      const i = Math.min(n - 1, Math.floor(p));
      const a = ys[i];
      const b = ys[i + 1];
      if (!Number.isFinite(a) || !Number.isFinite(b)) return p - i < 0.5 ? a : b;
      return a + (b - a) * (p - i);
    };
  }

  function pyGrid(fu, d, N) {
    const hub = getHub();
    const z = hub ? hub.samplePy(fu.py.id, { kind: 'xy', x0: -d, x1: d, y0: -d, y1: d, nx: N, ny: N, params: pyParamsOf(fu) }) : null;
    if (!z || z.length !== (N + 1) * (N + 1)) {
      fu.error = 'Python 函数取不到值了（浮窗重置过、或页面刷新过）：回浮窗再 see() 一次';
      return null;
    }
    fu.error = null;
    const xs = new Float64Array(N + 1);
    const ys = new Float64Array(N + 1);
    for (let i = 0; i <= N; i += 1) {
      xs[i] = -d + (2 * d * i) / N;
      ys[i] = xs[i];
    }
    return { xs, ys, z, nx: N, ny: N };
  }

  /** 网格上的双线性插值（Python 曲面的悬停读数用） */
  function gridInterp(g) {
    const { xs, ys, z, nx, ny } = g;
    const hx = (xs[nx] - xs[0]) / nx;
    const hy = (ys[ny] - ys[0]) / ny;
    return (x, y) => {
      const p = (x - xs[0]) / hx;
      const q = (y - ys[0]) / hy;
      if (!(p >= 0 && p <= nx && q >= 0 && q <= ny)) return NaN;
      const i = Math.min(nx - 1, Math.floor(p));
      const j = Math.min(ny - 1, Math.floor(q));
      const s = p - i;
      const t = q - j;
      const st = ny + 1;
      const v = z[i * st + j] * (1 - s) * (1 - t) + z[(i + 1) * st + j] * s * (1 - t) +
        z[i * st + j + 1] * (1 - s) * t + z[(i + 1) * st + j + 1] * s * t;
      return Number.isFinite(v) ? v : NaN;
    };
  }

  /** 平面上不是 y = f(x) 的那几种：极坐标、参数曲线、隐函数 */
  function sampleFree(fu, k, live) {
    const P = state.params;
    const c = fu.form.comps;
    const ev = (comp) => F.evaluator(comp, k, P);
    const R = rangesOf(fu);
    if (k === 'polar') {
      const fr = ev(c[0]);
      const [a, b] = R.theta;
      const cv = F.samplePolar(fr, a, b, live ? 900 : 2600);
      return { kind: k, xs: cv.xs, ys: cv.ys, segs: cv.segs, curve: cv, fr, range: [a, b] };
    }
    if (k === 'param2') {
      const [a, b] = R.t;
      const cv = F.sampleCurve2(ev(c[0]), ev(c[1]), a, b, live ? 700 : 2200);
      return { kind: k, xs: cv.xs, ys: cv.ys, segs: cv.segs, curve: cv, range: [a, b] };
    }
    if (k === 'implicit') {
      /* 隐函数只能在看得见的那块网格上描：网格比视野宽 8%，平移时边上不至于立刻缺一截 */
      const v = plot.view;
      const px = (v.x1 - v.x0) * 0.08;
      const py = (v.y1 - v.y0) * 0.08;
      const nx = live ? 110 : 240;
      const ny = Math.max(40, Math.round(nx * (plot.height / Math.max(1, plot.width))));
      const cv = F.implicit2(ev(c[0]), v.x0 - px, v.x1 + px, v.y0 - py, v.y1 + py, nx, ny);
      return { kind: k, xs: cv.xs, ys: cv.ys, segs: cv.segs, curve: cv };
    }
    return null;
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

      if (!r.f) {
        /* 极坐标 / 参数曲线 / 隐函数：只画线。它们不是 x 的函数，
           悬停竖线上的读数没有意义（一个 x 可能对着好几个点），noHover 跳过 */
        curves.push({
          xs: r.xs,
          ys: r.ys,
          segs: r.segs,
          color,
          width: fu.id === state.activeId ? 2.8 : 2.1,
          noHover: true,
        });
        /* 参数曲线标出起点（空心）：看得出 t 增大时往哪边走 */
        if (r.kind === 'param2' || r.kind === 'polar') {
          const s0 = r.segs[0];
          if (s0) marks.push({ x: r.xs[s0[0]], y: r.ys[s0[0]], kind: 'zero', color });
        }
        return;
      }

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
            label: (e.type === 'max' ? '极大 ' : '极小 ') + fmtNum(e.y, 3),
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

  /* 当前 3D 场景与悬停读数。refreshPlot3 每次更新，onHover 只读 */
  let scene3 = [];      /* [{fu, r, index}]：此刻画在场上的对象 */
  let hover3 = null;

  /**
   * 立体场景：z = f(x,y) 网格、参数曲面、空间曲线可以叠在一起（最多 3 个）。
   *   · 有 z = f(x,y) 时，xy 包围盒就是「域」，按高度比例画（可夸张）；
   *   · 全是参数曲面 / 曲线时三轴同比例（球要像球），包围盒随对象走；
   *   · 第一张曲面用 viridis 色带（按高度），其余曲面用各自的曲线色，叠在一起分得清。
   */
  function refreshPlot3() {
    scene3 = [];
    state.funcs.forEach((fu, index) => {
      if (fu.result3 && !fu.result3.empty) scene3.push({ fu, r: fu.result3, index });
    });
    hover3 = null;
    if (!scene3.length) {
      surface.setData({ objects: [], marks: [] });
      paintReadout3();
      return;
    }
    const d = Math.max(0.05, state.domain);
    const grids = scene3.filter((s) => s.r.g);
    const objects = [];
    let rampUsed = false;
    scene3.forEach(({ fu, r, index }) => {
      const color = colorOf(fu);
      const label = 'f' + subDigits(index + 1);
      if (r.g) {
        objects.push({ type: 'grid', mesh: r.g, ramp: !rampUsed, color, label });
        rampUsed = true;
      } else if (r.S) {
        objects.push({
          type: 'param', X: r.S.X, Y: r.S.Y, Z: r.S.Z, nu: r.S.nu, nv: r.S.nv, us: r.S.us, vs: r.S.vs,
          ramp: !rampUsed, color, label,
        });
        rampUsed = true;
      } else if (r.C) {
        objects.push({
          type: 'curve', X: r.C.X, Y: r.C.Y, Z: r.C.Z, n: r.C.n, ts: r.C.ts, color, label,
          width: fu.id === state.activeId ? 3 : 2.4,
        });
      }
    });
    const first = grids[0] ? grids[0].r : null;
    const marks = !first || state.show3.extrema === false ? [] : (first.extrema || []).map((e) => ({
      x: e.x,
      y: e.y,
      z: e.z,
      color: e.type === 'max' ? '#d1483f' : '#2f8f5b',
      label: (e.type === 'max' ? '极大 ' : '极小 ') + fmtNum(e.z, 3),
    }));
    let zlo;
    let zhi;
    if (grids.length) {
      /* z 的范围按网格的分位数取（1/(x²+y²) 那种尖峰不该把整张图压扁），曲线 / 参数面一并框进来 */
      zlo = Math.min(...grids.map((s) => s.r.zlo));
      zhi = Math.max(...grids.map((s) => s.r.zhi));
      scene3.forEach(({ r }) => {
        if (r.box && r.box[2]) {
          zlo = Math.min(zlo, r.box[2][0]);
          zhi = Math.max(zhi, r.box[2][1]);
        }
      });
    }
    surface.setData({
      objects,
      zlo,
      zhi,
      bounds: grids.length ? { x0: -d, x1: d, y0: -d, y1: d } : undefined,
      equal: !grids.length,
      marks,
      wire: state.show3.wire,
      box: state.show3.box,
      /* 悬停探针的求值函数：surface 只管几何，z 值由这边给 */
      at: first ? first.f : null,
    });
    paintReadout3();
  }

  function paintReadout3() {
    readRow.innerHTML = '';
    if (!scene3.length) {
      const bad = state.funcs.some((fu) => fu.result3 && fu.result3.empty);
      readRow.appendChild(el('span', 'ml-fn__hint', bad
        ? '这块区域里一个值都算不出来——检查式子，或把「域」/ 参数范围调大试试'
        : '拖动旋转 · 滚轮缩放 · 双击回到默认视角'));
      return;
    }
    const legend = el('div', 'ml-fn__legend');
    scene3.forEach(({ fu, r, index }) => {
      const item = el('span', 'ml-fn__lgitem');
      const dot = el('span', 'ml-fn__dot');
      dot.style.background = colorOf(fu);
      const nm = 'f' + subDigits(index + 1);
      item.append(dot, el('span', 'ml-fn__lgname', r.g ? nm + '(x, y)' : nm + ' ' + KIND_LABEL[r.kind]));
      if (r.g) {
        item.appendChild(el('span', 'ml-fn__lgval',
          ' ∈ [' + fmtNum(r.zlo, 3) + ', ' + fmtNum(r.zhi, 3) + ']'));
      }
      legend.appendChild(item);
    });
    readRow.appendChild(legend);
    if (hover3 && hover3.obj === undefined) {
      readRow.appendChild(el('span', 'ml-fn__hoverx',
        'f(' + fmtNum(hover3.x, 3) + ', ' + fmtNum(hover3.y, 3) + ') = ' + fmtNum(hover3.z)));
    } else if (hover3) {
      /* 参数曲面 / 曲线上的点：报坐标，也报它对应的参数值（u, v 或 t） */
      let par = '';
      if (hover3.t !== undefined) par = '  t = ' + fmtNum(hover3.t, 3);
      else if (hover3.u !== undefined) {
        const sph = scene3[hover3.obj] && scene3[hover3.obj].r.kind === 'sph';
        par = sph ? '  θ = ' + fmtNum(hover3.u, 3) + ', φ = ' + fmtNum(hover3.v, 3)
          : '  u = ' + fmtNum(hover3.u, 3) + ', v = ' + fmtNum(hover3.v, 3);
      }
      readRow.appendChild(el('span', 'ml-fn__hoverx',
        (hover3.label ? hover3.label + ' ' : '') + '(' + fmtNum(hover3.x, 3) + ', ' + fmtNum(hover3.y, 3) + ', ' +
        fmtNum(hover3.z, 3) + ')' + par));
    } else {
      readRow.appendChild(el('span', 'ml-fn__hint',
        '拖动旋转 · 滚轮缩放 · 双击回到默认视角 · 光标放在曲面 / 曲线上可读出坐标'));
    }
  }

  /* ---------- 读数与图例 ---------- */

  function paintReadout(hover) {
    readRow.innerHTML = '';
    const vis = state.funcs.filter((fu) => fu.result || fu.form);
    if (!vis.length) return;

    const legend = el('div', 'ml-fn__legend');
    vis.forEach((fu) => {
      const item = el('span', 'ml-fn__lgitem' + (fu.result ? '' : ' is-off'));
      const dot = el('span', 'ml-fn__dot');
      dot.style.background = colorOf(fu);
      /* 编号跟卡片走（中间有空卡时，第三张仍叫 f₃） */
      const nm = el('span', 'ml-fn__lgname', 'f' + subDigits(state.funcs.indexOf(fu) + 1));
      item.append(dot, nm);
      if (hover && fu.result && fu.result.f) {
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
    const vis = state.funcs.filter((fu) => fu.form);
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

    vis.forEach((fu) => {
      const sec = el('div', 'ml-fn__infosec');
      const head = el('div', 'ml-fn__infohead');
      const dot = el('span', 'ml-fn__dot');
      dot.style.background = colorOf(fu);
      const title = cardTitle(fu, state.funcs.indexOf(fu)).replace(/\s*[=：]$/, '');
      head.append(dot, el('span', 'ml-fn__infoname', title));
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

      if (!r.f) {
        infoFree2(fu, r, put);
        sec.appendChild(grid);
        infoBox.appendChild(sec);
        return;
      }
      if (r.kind === 'py') {
        put('来源', 'Python 函数 ' + (fu.py ? fu.py.name : '') + '：每次重算回浮窗采样 1600 点，读数按表插值', 'is-mute');
      }

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
    if (vis.length === 1 && vis[0].result && vis[0].result.f && v.x0 < 0 && v.x1 > 0) {
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

  /* ---------- 平面「非函数」曲线的性质 ---------- */

  const fmtRange = (r) => '[' + fmtNum(r[0], 3) + ', ' + fmtNum(r[1], 3) + ']';
  const fmtPt = (x, y, z) => '(' + fmtNum(x, 3) + ', ' + fmtNum(y, 3) + (z === undefined ? '' : ', ' + fmtNum(z, 3)) + ')';

  function infoFree2(fu, r, put) {
    const cv = r.curve;
    if (r.kind === 'implicit') {
      put('曲线', r.segs.length ? '视野内描出 ' + r.segs.length + ' 段' : '视野内没有 F = 0 的点', r.segs.length ? '' : 'is-mute');
      put('提示', '只在看得见的范围里描，平移 / 缩放后会重描；隐函数求导 dy/dx = −F_x/F_y 点「→ sympy 推导」', 'is-mute');
      return;
    }
    const nameT = r.kind === 'polar' ? 'θ' : 't';
    put(nameT + ' 的范围', fmtRange(r.range), 'is-mute');
    const L = F.arcLength2(cv);
    put('弧长', Number.isFinite(L) && L > 0 ? '≈ ' + fmtNum(L, 5) : '—', L > 0 ? '' : 'is-mute');
    const closed = F.isClosed(cv);
    if (r.kind === 'polar') {
      const A2 = F.polarArea(r.fr, r.range[0], r.range[1]);
      put('½∫r² dθ', Number.isFinite(A2) ? '≈ ' + fmtNum(A2, 5) + (closed ? '（闭合：就是围成的面积）' : '（扫过的面积）')
        : '这段里有算不出的 r', Number.isFinite(A2) ? '' : 'is-mute');
      const rr = F.finiteRange(cv.rs);
      if (rr) put('r 的范围', fmtRange(rr), 'is-mute');
    } else if (closed) {
      const S = F.shoelace(cv);
      put('围成面积', Number.isFinite(S) ? '≈ ' + fmtNum(Math.abs(S), 5) + (S > 0 ? '（逆时针）' : '（顺时针）') : '—');
    }
    if (cv.segs.length) {
      const i0 = cv.segs[0][0];
      const s1 = cv.segs[cv.segs.length - 1];
      put('起点 → 终点', closed ? fmtPt(cv.xs[i0], cv.ys[i0]) + ' 首尾相接'
        : fmtPt(cv.xs[i0], cv.ys[i0]) + ' → ' + fmtPt(cv.xs[s1[1]], cv.ys[s1[1]]), 'is-mute');
    }
    if (cv.segs.length > 1) put('断开', '有 ' + (cv.segs.length - 1) + ' 处冲向无穷远或无定义，已断开', 'is-mute');
  }

  /* ---------- 3D 性质面板 ---------- */

  function infoHead(fu, index) {
    const sec = el('div', 'ml-fn__infosec');
    const head = el('div', 'ml-fn__infohead');
    const dot = el('span', 'ml-fn__dot');
    dot.style.background = colorOf(fu);
    const k = kindOf(fu);
    const title = k === 'fxy' || k === 'py'
      ? 'z = f' + subDigits(index + 1) + '(x, y)'
      : 'f' + subDigits(index + 1) + ' ' + (KIND_LABEL[k] || '');
    head.append(dot, el('span', 'ml-fn__infoname', title));
    if (fu.tex && !fu.error) {
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
    return { sec, head };
  }

  function refreshInfo3() {
    infoBox.innerHTML = '';
    const list = activeFuncs().filter((fu) => fu.form || fu.error);
    if (!list.length) {
      infoBox.classList.add('is-empty');
      return;
    }
    infoBox.classList.remove('is-empty');
    infoBox.appendChild(el('div', 'ml-fn__subhead', '长相'));

    list.forEach((fu) => {
      const index = state.funcs.indexOf(fu);
      const { sec, head } = infoHead(fu, index);
      if (fu.error) {
        head.appendChild(el('span', 'ml-fn__infobad', fu.error));
        infoBox.appendChild(sec);
        return;
      }
      const r = fu.result3;
      if (!r) {
        head.appendChild(el('span', 'ml-fn__infobad', '（已隐藏）'));
        infoBox.appendChild(sec);
        return;
      }

      const grid = el('div', 'ml-fn__kv');
      const put = (k, val, cls) => {
        const item = el('div', 'ml-fn__kvitem' + (cls ? ' ' + cls : ''));
        item.append(el('span', 'ml-fn__k', k), el('span', 'ml-fn__v', val));
        grid.appendChild(item);
      };

      if (r.g) {
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
        if (r.kind === 'py') put('来源', 'Python 函数：每次重算回浮窗采 41×41 网格', 'is-mute');
        sec.appendChild(grid);
        infoBox.appendChild(sec);
        /* 补了多少个算不出来的点，说一声，免得用户以为图本来就是那样 */
        if (r.healed > 0) {
          infoBox.appendChild(el('div', 'ml-fn__note',
            '有 ' + r.healed + ' 个格子原本算不出来（多半是可去奇点），已按周围的高度补上。'));
        }
        return;
      }

      if (r.empty) {
        put('取值', '这组参数范围里一个点都算不出来', 'is-mute');
      } else if (r.S) {
        const keys = r.kind === 'sph' ? [['theta', 'θ'], ['phi', 'φ']] : [['u', 'u'], ['v', 'v']];
        put('参数范围', keys.map(([k2, d2]) => d2 + ' ∈ ' + fmtRange(r.ranges[k2])).join('，'), 'is-mute');
        put('曲面面积', Number.isFinite(r.area) ? '≈ ' + fmtNum(r.area, 5) : '（松手后计算）',
          Number.isFinite(r.area) ? '' : 'is-mute');
        if (r.kind === 'sph') {
          put('围成体积', Number.isFinite(r.volume) ? '≈ ' + fmtNum(r.volume, 5) + '（∬ r³/3 · sinφ dθ dφ）' : '—',
            Number.isFinite(r.volume) ? '' : 'is-mute');
        }
        put('包围盒', 'x ' + fmtRange(r.box[0]) + '　y ' + fmtRange(r.box[1]) + '　z ' + fmtRange(r.box[2]), 'is-mute');
      } else if (r.C) {
        const C = r.C;
        put('t 的范围', fmtRange(r.ranges.t), 'is-mute');
        put('弧长', '≈ ' + fmtNum(r.len, 5));
        put('起点 → 终点', fmtPt(C.X[0], C.Y[0], C.Z[0]) + ' → ' + fmtPt(C.X[C.n], C.Y[C.n], C.Z[C.n]), 'is-mute');
        put('包围盒', 'x ' + fmtRange(r.box[0]) + '　y ' + fmtRange(r.box[1]) + '　z ' + fmtRange(r.box[2]), 'is-mute');
      }
      sec.appendChild(grid);
      infoBox.appendChild(sec);
    });

    if (scene3.length > 1 && scene3.some((s) => !s.r.C) && scene3.filter((s) => !s.r.C).length > 1) {
      infoBox.appendChild(el('div', 'ml-fn__note',
        '两张面互相穿插时，交线附近的前后遮挡是近似的（画布按面片深度排序，没有逐像素的深度测试）。'));
    }

    /* 提示还有空位没填 */
    list.forEach((fu) => {
      if (!fu.error && isLatex(fu.src) && countPlaceholders(fu.src) > 0) {
        infoBox.appendChild(el('div', 'ml-fn__note is-warn',
          '还有 ' + countPlaceholders(fu.src) + ' 个空位没填，先按 1 算着，填完再看。'));
      }
    });
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
      /* 形态可能变了（sin(x) 改成 r = …）：标题、徽标、范围框跟着换 */
      syncCard(fu);
      notifyIntro();
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

  /** 颜色按「还没人用的最小编号」给：删掉中间一条再加，不会和剩下的撞色 */
  function freeColor(list) {
    const used = new Set(list.map((fu) => fu.colorIndex));
    let ci = 0;
    while (used.has(ci)) ci += 1;
    return ci;
  }

  /** 加一条：src 为空就是空白卡；形态模板会带上例子和参数范围 */
  function addFunc(src, ranges) {
    if (state.funcs.length >= capOf(state.mode)) return;
    const fu = makeFunc(src || '', freeColor(state.funcs), { ranges });
    setList(state.funcs.concat([fu]));
    renderCards();
    state.activeId = fu.id;
    syncActive();
    if (fu.inputs) {
      fu.inputs.input.focus();
      const p = fu.inputs.input.value.length;
      fu.inputs.input.setSelectionRange(p, p);
    }
    if (fu.src.trim()) scheduleParse(fu);
  }

  function setDomain(v) {
    const d = Math.max(0.5, Math.min(20, Number(v) || 4));
    state.domain = d;
    domainRange.value = String(d);
    domainVal.textContent = '±' + d;
  }

  function itemsToFuncs(items, offset) {
    return items.map((it, i) => {
      const n = normItem(it);
      return makeFunc(n.src, (offset || 0) + i, n);
    });
  }

  function applyPreset(p) {
    /* 预设自己带模式：点 3D 的例子就切到立体，反之切回平面 */
    const presetMode = p.mode === '3d' || p.domain !== undefined ? '3d' : '2d';
    const modeChanged = enterMode(presetMode);
    if (modeChanged) {
      syncMode();
      renderPresets();
    }
    if (p.domain !== undefined) setDomain(p.domain);
    state.funcs.forEach(cancelParseTimer);
    setList(itemsToFuncs(p.funcs.slice(0, capOf(state.mode))));
    state.params = Object.assign({}, p.params || {});
    state.paramsBy[state.mode] = state.params;
    state.area = null;
    state.areaMode = false;
    plot.setDragMode('pan');
    plot.setSelection(null);
    tArea.sync();
    if (p.view) plot.setView({ x0: p.view[0], x1: p.view[1] }, true);
    state.activeId = state.funcs[0] ? state.funcs[0].id : null;
    refreshAll(false);
    renderCards();
    syncActive();
    computeAndFit();
  }

  /* ---------- 「此刻这张图」：给页面右上角那块介绍面板供料 ----------
     面板不写死文案：形态、自变量、可调参数、为什么画不出来，都跟着当前这张卡片走。 */
  function introInfo() {
    const fu = state.funcs.find((f) => f.id === state.activeId) || state.funcs[0] || null;
    const form = fu && fu.form ? fu.form : null;
    const kind = form ? form.kind : (fu && fu.py ? 'py' : null);
    const meta = kind && F.KINDS[kind] ? F.KINDS[kind] : null;
    const args = meta
      ? meta.args.slice()
      : (kind === 'py' ? (fu.py && fu.py.nargs >= 2 ? ['x', 'y'] : ['x']) : []);
    return {
      mode: state.mode,
      kind,
      args,
      params: form ? form.params.filter((p) => args.indexOf(p) < 0) : [],
      error: fu ? fu.error || null : null,
      count: state.funcs.length,
      empty: !fu || (!fu.py && !(fu.src || '').trim()),
      domain: state.domain,
    };
  }

  let introKey = '';
  function notifyIntro() {
    if (!onIntro) return;
    const info = introInfo();
    const k = JSON.stringify(info);
    if (k === introKey) return;
    introKey = k;
    onIntro(info);
  }

  function refreshAll(schedule) {
    activeFuncs().forEach((fu) => {
      cancelParseTimer(fu);
      parseOne(fu);
    });
    syncParams();
    paintParamNames();
    notifyIntro();
    if (schedule !== false) scheduleRecompute();
  }

  function computeAndFit() {
    recompute();
    if (state.mode === '2d') {
      fitView();
      recompute();
    }
  }

  /**
   * 定视野。只有 y = f(x) 时沿用老办法：x 不动，按曲线定 y 的上下界；
   * 一旦有极坐标 / 参数曲线 / 隐函数，改成横纵等比例——否则圆被画成椭圆、心形线被压扁。
   *   · 参数曲线、极坐标：按它们自己的采样框住（去掉两端 0.5% 的冲天值），四周留 8%；
   *   · 只有隐函数：它只在看得见的那块描，x 范围保持不动，y 以描出来的部分为中心。
   */
  function fitView() {
    if (state.mode === '3d') return;
    const live = state.funcs.filter((fu) => fu.visible && fu.result);
    const free = live.filter((fu) => !fu.result.f);
    if (!free.length) {
      plot.fitY(0.12);
      return;
    }
    const v = plot.view;
    const traced = free.filter((fu) => fu.result.kind !== 'implicit');
    let xr = traced.length ? quantRange(traced.map((fu) => fu.result.xs)) : null;
    let yr = traced.length ? quantRange(traced.map((fu) => fu.result.ys)) : null;
    if (xr && yr) {
      const px = Math.max((xr[1] - xr[0]) * 0.08, 0.1);
      const py = Math.max((yr[1] - yr[0]) * 0.08, 0.1);
      xr = [xr[0] - px, xr[1] + px];
      yr = [yr[0] - py, yr[1] + py];
    } else {
      xr = [v.x0, v.x1];
      const imp = quantRange(free.map((fu) => fu.result.ys));
      const cy = imp ? (imp[0] + imp[1]) / 2 : 0;
      yr = [cy - 1e-9, cy + 1e-9];
    }
    const W = Math.max(1, plot.width);
    const H = Math.max(1, plot.height);
    const s = Math.max((xr[1] - xr[0]) / W, (yr[1] - yr[0]) / H) || 0.01;
    const cx = (xr[0] + xr[1]) / 2;
    const cy = (yr[0] + yr[1]) / 2;
    plot.setView({ x0: cx - (s * W) / 2, x1: cx + (s * W) / 2, y0: cy - (s * H) / 2, y1: cy + (s * H) / 2 }, true);
  }

  /* ---------- 与 Python / 链接互通 ---------- */

  /**
   * 此刻的快照（格式见 topy.js 文件头）：浮窗 seen() 取的、「→ Python」翻译用的都是它。
   * 只收解析成功的条目；numpy / sympy 两份代码由同一棵 AST 现翻，参数名过 pyName 洗过。
   */
  function snapshot() {
    const v = plot.view;
    const funcs = [];
    state.funcs.forEach((fu, i) => {
      if (!fu.form) return;
      const k = fu.form.kind;
      let args = F.KINDS[k] ? F.KINDS[k].args.slice() : ['x'];
      if (k === 'py') args = fu.py && fu.py.nargs >= 2 ? ['x', 'y'] : ['x'];
      const needs = new Set();
      const numpy = [];
      const sympy = [];
      if (k !== 'py') {
        fu.form.comps.forEach((c) => {
          const r = toNumpy(c.ast);
          r.needs.forEach((n) => needs.add(n));
          numpy.push(r.code);
          sympy.push(toSympy(c.ast));
        });
      }
      const paramNames = fu.form.params.slice();
      const params = {};
      paramNames.forEach((p) => {
        const val = Number(state.params[p]);
        params[k === 'py' ? p : pyName(p)] = Number.isFinite(val) ? val : 1;
      });
      const ranges = rangesOf(fu);
      funcs.push({
        label: 'f' + (i + 1),
        index: funcs.length,
        kind: k,
        kindLabel: KIND_LABEL[k],
        color: colorOf(fu),
        src: fu.py ? '' : fu.src,
        args,
        numpy,
        sympy,
        needs: Array.from(needs),
        ranges,
        py: fu.py ? { id: fu.py.id, name: fu.py.name, nargs: fu.py.nargs } : null,
        params,
        paramNames,
        visible: fu.visible,
      });
    });
    const paramMetaOut = {};
    Object.keys(state.params).forEach((p) => { paramMetaOut[p] = metaOf(p); });
    const ang = surface.getAngles();
    return {
      mode: state.mode,
      view: [v.x0, v.x1, v.y0, v.y1],
      domain: state.domain,
      angles: { az: ang.az, el: ang.el },
      params: Object.assign({}, state.params),
      paramMeta: paramMetaOut,
      funcs,
    };
  }

  /** 「→ Python 作图 / → sympy 推导」：译成代码送进浮窗并直接运行 */
  function sendToPython(kind) {
    const snap = snapshot();
    snap.funcs = snap.funcs.filter((f) => f.visible);
    if (!snap.funcs.length) {
      flash('先写一个能画的式子（隐藏的不送）');
      return;
    }
    const sym = kind === 'sym';
    let res;
    try {
      res = sym ? sympyScript(snap) : numpyScript(snap);
    } catch (e) {
      flash('翻译成 Python 时出错：' + ((e && e.message) || e));
      return;
    }
    let ok = false;
    try {
      ok = openInConsole({
        key: sym ? 'fn-sympy' : 'fn-numpy',
        title: sym ? '看见函数 → sympy 推导' : '看见函数 → numpy 作图',
        source: res.code,
        sliders: res.sliders || [],
        overwrite: true,
        autorun: true,
      });
    } catch (e) {
      void e;
      ok = false;
    }
    flash(ok
      ? (sym ? '已送进 Py 浮窗，正在推导（首次要装 sympy，稍等）' : '已送进 Py 浮窗并运行；参数在浮窗里是滑块')
      : 'Py 浮窗正忙（上一段还在跑），等它跑完再点');
  }

  /** 分享用的 spec：只放能写进链接的（Python 函数活在浮窗里，带不走） */
  function shareSpec() {
    const r4 = (x) => Math.round(x * 1e4) / 1e4;
    const funcs = state.funcs
      .filter((fu) => !fu.py && fu.src.trim())
      .map((fu) => (Object.keys(fu.rangeText).length ? { src: fu.src, ranges: fu.rangeText } : { src: fu.src }));
    const spec = { mode: state.mode, funcs };
    const ps = {};
    Object.keys(state.params).forEach((p) => { ps[p] = r4(state.params[p]); });
    if (Object.keys(ps).length) spec.params = ps;
    if (state.mode === '3d') spec.domain = state.domain;
    else spec.view = [r4(plot.view.x0), r4(plot.view.x1)];
    return spec;
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(() => true, () => legacyCopy(text));
    }
    return Promise.resolve(legacyCopy(text));
  }
  function legacyCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { void e; }
    ta.remove();
    return ok;
  }

  function copyShareLink() {
    const spec = shareSpec();
    if (!spec.funcs.length) {
      flash('没有能放进链接的式子（Python 函数带不走）');
      return;
    }
    const url = shareUrl(spec);
    copyText(url).then((ok) => {
      flash(ok ? '链接已复制：打开就是现在这一屏' : '复制没成功，浏览器不让写剪贴板');
    });
  }

  /**
   * 外部送来一份 spec（Python 的 see()、分享链接、Py 浮窗内嵌）：
   *   { funcs:[字符串 | {src, ranges} | {py:{id,name,nargs,params}}], mode?, view?, domain?,
   *     params?, ranges?, add? }
   * 没写 mode 就猜：Python 函数看自变量个数，字符串交给 forms.guessMode。
   * add=true 叠在已有的后面（满了挤掉最早的），否则整表替换。
   */
  function applySpec(spec) {
    const sp = spec || {};
    const items = (Array.isArray(sp.funcs) ? sp.funcs : []).map(normItem).filter((it) => it.py || it.src.trim());
    if (!items.length) throw new Error('没有可画的式子');
    let mode = sp.mode === '3d' || sp.mode === '2d' ? sp.mode : null;
    if (!mode) {
      const pyItem = items.find((it) => it.py);
      if (pyItem) mode = pyItem.py.nargs >= 2 ? '3d' : '2d';
      else mode = items.some((it) => F.guessMode(it.src) === '3d') ? '3d' : '2d';
    }
    if (enterMode(mode)) {
      syncMode();
      renderPresets();
    }
    if (sp.ranges && typeof sp.ranges === 'object') {
      items.forEach((it) => { it.ranges = Object.assign({}, sp.ranges, it.ranges || {}); });
    }
    const cap = capOf(state.mode);
    state.funcs.forEach(cancelParseTimer);
    let list = sp.add ? state.funcs.filter((fu) => fu.py || fu.src.trim()) : [];
    items.slice(0, cap).forEach((it) => {
      if (list.length >= cap) list = list.slice(1);
      list = list.concat([makeFunc(it.src, freeColor(list), it)]);
    });
    setList(list);
    if (!sp.add) {
      state.params = {};
      state.paramsBy[state.mode] = state.params;
    }
    /* Python 函数带默认值的关键字参数是滑块的初值；see(a=2) 这类显式给的再盖上去 */
    items.forEach((it) => {
      if (!it.py || !it.py.params) return;
      Object.keys(it.py.params).forEach((k) => {
        const val = Number(it.py.params[k]);
        if (Number.isFinite(val) && !(k in state.params)) state.params[k] = val;
      });
    });
    Object.keys(sp.params || {}).forEach((k) => {
      const val = Number(sp.params[k]);
      if (Number.isFinite(val)) state.params[k] = val;
    });
    if (state.mode === '3d' && sp.domain !== undefined) setDomain(sp.domain);
    const hasView = Array.isArray(sp.view) && sp.view.length >= 2 && Number(sp.view[1]) > Number(sp.view[0]);
    if (state.mode === '2d' && hasView) plot.setView({ x0: Number(sp.view[0]), x1: Number(sp.view[1]) }, true);
    state.area = null;
    state.areaMode = false;
    plot.setDragMode('pan');
    plot.setSelection(null);
    tArea.sync();
    renderCards();
    const firstNew = list[list.length - Math.min(items.length, list.length)];
    state.activeId = firstNew ? firstNew.id : (list[0] ? list[0].id : null);
    syncActive();
    refreshAll(false);
    if (sp.add && !hasView) recompute();
    else computeAndFit();
    return true;
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
  setList(itemsToFuncs(initial.slice(0, capOf(state.mode))));
  if (o.domain !== undefined) setDomain(o.domain);
  renderCards();
  renderPresets();
  syncMode();
  syncCompactLayout();
  if (o.view) plot.setView({ x0: o.view[0], x1: o.view[1] }, true);
  refreshAll(false);
  /* 带 spec 启动（分享链接、浮窗内嵌）：直接按 spec 画，不先算一遍默认式子 */
  let specError = null;
  if (o.spec) {
    try {
      applySpec(o.spec);
    } catch (e) {
      specError = e;
      computeAndFit();
    }
  } else {
    computeAndFit();
  }

  /* ---------- 对外接口 ---------- */

  const hub = getHub();
  let relayoutRaf = 0;
  const api = {
    el: root,
    inline: !!o.inline,
    /** 外部换式子用（嵌进课文时方便）。第二参数可以是 [x0,x1] 或 {view, mode, domain} */
    setFuncs(list, opts) {
      const op = Array.isArray(opts) ? { view: opts } : (opts || {});
      if (op.mode && op.mode !== state.mode) {
        enterMode(op.mode);
        syncMode();
        renderPresets();
      }
      if (op.domain !== undefined) setDomain(op.domain);
      state.funcs.forEach(cancelParseTimer);
      setList(itemsToFuncs((list || []).slice(0, capOf(state.mode))));
      if (op.view) plot.setView({ x0: op.view[0], x1: op.view[1] }, true);
      renderCards();
      state.activeId = state.funcs[0] ? state.funcs[0].id : null;
      syncActive();
      refreshAll(false);
      computeAndFit();
    },
    getView() { return plot.view; },
    snapshot,
    applySpec,
    /** 被 Python 画进来以后，把工作区滚进视野（浮窗盖在页面上，用户未必看得见它） */
    reveal() {
      if (!root.isConnected || !root.getBoundingClientRect) return;
      const r = root.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      if (r.bottom < 60 || r.top > vh - 60) {
        try { root.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { void e; }
      }
    },
    /** 节点刚挂进文档（浮窗内嵌）：等画布量完尺寸再定一次视野 */
    relayout() {
      cancelAnimationFrame(relayoutRaf);
      relayoutRaf = requestAnimationFrame(() => {
        relayoutRaf = requestAnimationFrame(() => {
          relayoutRaf = 0;
          if (!root.isConnected) return;
          computeAndFit();
        });
      });
    },
    get specError() { return specError; },
    destroy() {
      if (hub) hub.unregister(api);
      cancelAnimationFrame(relayoutRaf);
      clearTimeout(msgTimer);
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

  /* 登记到总线：浮窗 see() 送到「最近一次被点过 / 聚焦过」的工作区 */
  if (hub) {
    hub.register(api);
    const touch = () => hub.touch(api);
    root.addEventListener('pointerdown', touch, true);
    root.addEventListener('focusin', touch);
  }
  return api;
}

export { PRESETS2D, PRESETS3D };
export default createWorkspace;
