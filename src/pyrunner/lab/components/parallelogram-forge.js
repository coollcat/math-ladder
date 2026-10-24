/* =========================================================================
 * lab 组件：parallelogram-forge —— 四张身份证，拖歪一条边就一起作废
 * -------------------------------------------------------------------------
 * 用法（第 5 章《平行四边形》动手实验）：
 *
 *   ```lab
 *   {
 *     "type": "parallelogram-forge",
 *     "title": "拖 D 点：四盏灯同时亮，才叫平行四边形",
 *     "a": [-1.7, -1.1],
 *     "b": [1.3, -1.1],
 *     "c": [0.7, 1.3]
 *   }
 *   ```
 *
 * 字段（都可省）：
 *   a / b / c   三个固定顶点 [x, y]，默认 A(-1.7,-1.1)、B(1.3,-1.1)、C(0.7,1.3)
 *   d           自由顶点 [x, y]，默认 = A + C − B（正好是平行四边形）
 *   height      画布高度，默认 460
 *
 * 演示什么：性质与判定是一面镜子的两面。四盏灯分别盯住四条发证条件——
 *   两组对边分别平行 / 两组对边分别相等 / 一组对边平行且相等 / 对角线互相平分。
 *   拖 D 的时候它们要么齐亮、要么齐灭；而「只量对角相等就想发证」的那种
 *   半亮半灭，才是判定的陷阱（等腰梯形就是标本）。
 *
 * 交互（完美教具五问）：
 *   1. 动手量：D 点是唯一自由度，直接拖——它就是四边形「会动的那一处」。
 *   2. 即时后果：四盏灯、四个内角、对角线交点 M 与四段长度一帧内全部重算。
 *   3. 读数：判定结论 + 依据 + ∠A/∠C、∠B/∠D、AM·MC / BM·MD、内角和，
 *      与正文 §3 的性质判定表逐行对得上（内角和恒为 360°，与拖到哪儿无关）。
 *   4. 啊哈预设：「拖歪一点」把 D 推离原位（四盏灯齐灭、∠A ≠ ∠C、两个中点裂开）；
 *      「吸附回去」一键复原。
 *   5. 默认状态即课文例题：D = A + C − B 给出的正是平行四边形，四盏灯全绿。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildReadout, buildToolbar, mkBtn,
  label, fmt, clamp, clearBg,
} from '../core.js';

const V = (x, y) => ({ x, y });
const sub = (p, q) => ({ x: p.x - q.x, y: p.y - q.y });
const add = (p, q) => ({ x: p.x + q.x, y: p.y + q.y });
const mul = (p, k) => ({ x: p.x * k, y: p.y * k });
const norm = (p) => Math.hypot(p.x, p.y);
const cross = (u, v) => u.x * v.y - u.y * v.x;
const mid = (p, q) => V((p.x + q.x) / 2, (p.y + q.y) / 2);

/* 平行 / 等长 / 重合的判据都用相对量，免得屏幕上量到小数点后四位才算数 */
const PAR_TOL = 0.012;
const LEN_TOL = 0.035;
const SAME_TOL = 0.04;

/* 浮点残差别写成 1.57e-16：读数栏只认人眼能判断的数 */
const zeroish = (v) => (Math.abs(v) < 5e-3 ? '0.00' : fmt(v, 2));

function isPar(u, v) {
  const den = norm(u) * norm(v);
  return den > 1e-9 && Math.abs(cross(u, v)) / den < PAR_TOL;
}

/* 内角：从顶点 p 出发的两条边之间的夹角（度） */
function angleAt(p, q1, q2) {
  const a1 = Math.atan2(q1.y - p.y, q1.x - p.x);
  const a2 = Math.atan2(q2.y - p.y, q2.x - p.x);
  let d = Math.abs(a1 - a2);
  if (d > Math.PI) d = Math.PI * 2 - d;
  return (d * 180) / Math.PI;
}

export default function render(host, spec) {
  const pt = (name, def) => (
    Array.isArray(spec[name]) && spec[name].length === 2
      ? V(Number(spec[name][0]), Number(spec[name][1]))
      : def
  );
  const A = pt('a', V(-1.7, -1.1));
  const B = pt('b', V(1.3, -1.1));
  const C = pt('c', V(0.7, 1.3));
  const HOME = add(sub(C, B), A);                 /* D 的「平行四边形位置」= A + C − B */
  const D = pt('d', V(HOME.x, HOME.y));           /* 必须另起一个对象，否则拖 D 会改掉 HOME */

  const cv = setupCanvas(host, clamp(spec.height || 460, 360, 900));
  const ro = buildReadout({
    判定: '—', 依据: '—', 对角: '—', 对角线: '—', 内角和: '—',
  });
  host.appendChild(ro.box);

  const bSnap = mkBtn('吸附回平行四边形');
  const bSkew = mkBtn('拖歪一点');
  const bReset = mkBtn('重置');
  host.appendChild(buildToolbar(bSnap, bSkew, bReset));

  /* 视口：由三个固定顶点 + 它们的平行四边形位置定死，拖 D 时画面不跟着挪
     （否则手指在动、坐标系也在动，读数是抓不住的）。 */
  const VIEW = (() => {
    const xs = [A.x, B.x, C.x, HOME.x];
    const ys = [A.y, B.y, C.y, HOME.y];
    const pad = 1.5;
    return {
      x0: Math.min(...xs) - pad,
      x1: Math.max(...xs) + pad,
      y0: Math.min(...ys) - pad,
      y1: Math.max(...ys) + pad,
    };
  })();

  function view() {
    const W = cv.W;
    const H = cv.H;
    const s = Math.min((W - 96) / (VIEW.x1 - VIEW.x0), (H - 112) / (VIEW.y1 - VIEW.y0));
    return {
      s,
      X: (x) => 48 + (x - VIEW.x0) * s + ((W - 96) - (VIEW.x1 - VIEW.x0) * s) / 2,
      Y: (y) => 40 + (VIEW.y1 - y) * s + ((H - 112) - (VIEW.y1 - VIEW.y0) * s) / 2,
    };
  }
  let vw = { s: 60, X: (x) => x, Y: (y) => y };
  /* 画布坐标反解回世界坐标：X/Y 都是仿射映射，直接代数反演 */
  const invX = (x) => VIEW.x0 + (x - vw.X(VIEW.x0)) / (vw.s || 1);
  const invY = (y) => VIEW.y1 - (y - vw.Y(VIEW.y1)) / (vw.s || 1);

  function measure() {
    const AB = sub(B, A);
    const BC = sub(C, B);
    const DC = sub(C, D);
    const AD = sub(D, A);
    const par = isPar(AB, DC) && isPar(BC, AD);
    const eq = Math.abs(norm(AB) - norm(DC)) < LEN_TOL && Math.abs(norm(BC) - norm(AD)) < LEN_TOL;
    const peq = (isPar(AB, DC) && Math.abs(norm(AB) - norm(DC)) < LEN_TOL)
      || (isPar(BC, AD) && Math.abs(norm(BC) - norm(AD)) < LEN_TOL);
    const M1 = mid(A, C);
    const M2 = mid(B, D);
    const bis = norm(sub(M1, M2)) < SAME_TOL;
    const aA = angleAt(A, B, D);
    const aB = angleAt(B, C, A);
    const aC = angleAt(C, D, B);
    const aD = angleAt(D, A, C);
    const diagEq = Math.abs(norm(sub(A, C)) - norm(sub(B, D))) < LEN_TOL;
    /* 等腰梯形标本：一组对边平行、两腰相等、两条对角线也相等，四盏灯却全灭 */
    const trap = !par && ((isPar(AB, DC) && Math.abs(norm(AD) - norm(BC)) < LEN_TOL)
      || (isPar(AD, BC) && Math.abs(norm(AB) - norm(DC)) < LEN_TOL));
    const lights = [
      { key: '两组对边分别平行', on: par, note: '定义本身' },
      { key: '两组对边分别相等', on: eq, note: '量三条边就够' },
      { key: '一组对边平行且相等', on: peq, note: '必须是同一组' },
      { key: '对角线互相平分', on: bis, note: '各被切两半' },
    ];
    return { par, eq, peq, bis, M1, M2, aA, aB, aC, aD, diagEq, trap, lights, AB, DC, AD, BC };
  }

  function draw() {
    const Cc = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, Cc);
    vw = view();
    const m = measure();
    const P = (p) => ({ x: vw.X(p.x), y: vw.Y(p.y) });
    const pA = P(A);
    const pB = P(B);
    const pC = P(C);
    const pD = P(D);

    label(ctx, '拖 D 点：四盏灯一起亮才是平行四边形', 14, 20, Cc.fg, { size: 12, weight: 600 });

    /* 四边形底色 */
    ctx.beginPath();
    ctx.moveTo(pA.x, pA.y);
    ctx.lineTo(pB.x, pB.y);
    ctx.lineTo(pC.x, pC.y);
    ctx.lineTo(pD.x, pD.y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(59,116,214,0.10)';
    ctx.fill();
    ctx.strokeStyle = Cc.accent;
    ctx.lineWidth = 2;
    ctx.stroke();

    /* 对角线 + 两个中点：平分 ⇔ 两点重合 */
    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = Cc.axis;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(pA.x, pA.y);
    ctx.lineTo(pC.x, pC.y);
    ctx.moveTo(pB.x, pB.y);
    ctx.lineTo(pD.x, pD.y);
    ctx.stroke();
    ctx.restore();
    const m1 = P(m.M1);
    const m2 = P(m.M2);
    ctx.beginPath();
    ctx.arc(m1.x, m1.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = m.bis ? Cc.ok : Cc.named('purple');
    ctx.fill();
    if (!m.bis) {
      ctx.beginPath();
      ctx.arc(m2.x, m2.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = Cc.bad;
      ctx.fill();
      label(ctx, 'M₂', m2.x + 8, m2.y - 6, Cc.bad, { size: 10 });
    }
    label(ctx, m.bis ? 'M（两个中点重合 = 互相平分）' : 'M₁', m1.x + 8, m1.y + 14,
      m.bis ? Cc.ok : Cc.named('purple'), { size: 10 });

    /* 顶点与内角 */
    [[pA, 'A', m.aA], [pB, 'B', m.aB], [pC, 'C', m.aC], [pD, 'D', m.aD]].forEach(([p, name, deg]) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, name === 'D' ? 8 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = name === 'D' ? Cc.named('orange') : Cc.fg;
      ctx.fill();
      ctx.strokeStyle = Cc.bg;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      label(ctx, name, p.x + 10, p.y - 8, name === 'D' ? Cc.named('orange') : Cc.fg,
        { size: 12, weight: 700 });
      label(ctx, fmt(deg, 1) + '°', p.x + 10, p.y + 8, Cc.axis, { size: 10 });
    });
    label(ctx, 'D 点可拖', pD.x + 10, pD.y + 22, Cc.named('orange'), { size: 10 });

    /* 四盏判定灯：右侧竖排 */
    const bx = W - 172;
    let by = 56;
    label(ctx, '四条发证条件', bx, by, Cc.fg, { size: 11.5, weight: 700 });
    by += 20;
    m.lights.forEach((it) => {
      ctx.beginPath();
      ctx.arc(bx + 5, by - 4, 5, 0, Math.PI * 2);
      ctx.fillStyle = it.on ? Cc.ok : Cc.bad;
      ctx.fill();
      label(ctx, it.key, bx + 16, by, it.on ? Cc.fg : Cc.axis, { size: 10.5 });
      label(ctx, it.note, bx + 16, by + 13, Cc.grid, { size: 9 });
      by += 34;
    });

    /* 底部结论 */
    const allOn = m.lights.every((l) => l.on);
    const verdict = allOn ? '四盏齐亮 ⇒ 是平行四边形（判定成立）'
      : m.trap ? '等腰梯形：两腰相等、对角线也相等，四盏灯照样全灭'
        : '有灯没亮 ⇒ 它不在这个家族里';
    label(ctx, verdict, 14, H - 14, allOn ? Cc.ok : Cc.bad, { size: 11.5, weight: 700 });

    /* 读数条 */
    const onList = m.lights.filter((l) => l.on).map((l) => l.key);
    ro.set('判定', allOn ? '是平行四边形' : (m.trap ? '等腰梯形（不在家族里）' : '一般四边形（不在家族里）'));
    ro.set('依据', onList.length ? onList.join('、')
      : m.trap ? '四盏灯全灭；但它两腰相等、两对角线也相等——这两条恰恰不是判定条件'
        : '四盏灯全灭：两组对边既不等也不平行');
    ro.set('对角', '∠A=' + fmt(m.aA, 1) + '° / ∠C=' + fmt(m.aC, 1) + '°　∠B=' + fmt(m.aB, 1)
      + '° / ∠D=' + fmt(m.aD, 1) + '°');
    ro.set('对角线', 'AM=' + zeroish(norm(sub(m.M1, A))) + ' MC=' + zeroish(norm(sub(C, m.M1)))
      + '　中点裂开 ' + zeroish(norm(sub(m.M2, m.M1))) + (m.diagEq ? '　两对角线等长' : ''));
    ro.set('内角和', fmt(m.aA + m.aB + m.aC + m.aD, 1) + '°（与拖到哪儿无关）');
  }

  bindPointer(cv.canvas, {
    /* 画布里任意处按下拖动都在挪 D：只有一个自由度，不必先瞄准。 */
    pick() { return 'D'; },
    move(id, x, y) {
      if (id !== 'D') return;
      D.x = clamp(invX(x), -8, 8);
      D.y = clamp(invY(y), -8, 8);
      draw();
    },
  });

  bSnap.addEventListener('click', () => {
    D.x = HOME.x;
    D.y = HOME.y;
    draw();
  });
  bSkew.addEventListener('click', () => {
    /* 等腰梯形：底边 DC 与 AB 同在一条水平线上，但长度不等，两腰关于中轴镜像对称 */
    D.x = A.x - (C.x - B.x);
    D.y = C.y;
    draw();
  });
  bReset.addEventListener('click', () => {
    D.x = HOME.x;
    D.y = HOME.y;
    draw();
  });

  draw();
  cv.redraw = draw;
  return {
    destroy() {
      cv.redraw = null;
    },
  };
}
