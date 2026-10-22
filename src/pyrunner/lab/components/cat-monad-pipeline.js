/* =========================================================================
 * cat-monad-pipeline —— unit / bind 的分支谱系与三条法律（第 67 章 · Monad）
 * -------------------------------------------------------------------------
 * 列表 Monad 的传送带：每一步都是一台「一变多」的工序，bind 负责拆箱、
 * 逐个加工、把成品拍扁摆齐。屏幕上四个区块从上到下就是流水线的四拍：
 *
 *   ① 装箱：unit(种子) = [种子]
 *   ② 第一道工序 f：每颗种子长成一族候补
 *   ③ bind 拍扁：把一族一族的成品压回一层
 *   ④ 第二道工序 g：再长一轮，再拍扁
 *
 * 下方是三条法律的实时核对台：
 *   左单位律  bind(unit(x), f) 与 f(x) 逐项相同
 *   右单位律  bind(m, unit) 与 m 逐项相同
 *   结合律    bind(bind(m, f), g) 与 bind(m, x ↦ bind(f(x), g)) 逐项相同
 * 三条各配一盏灯：真的逐项相等才点绿。改滑块（工序参数）三条灯会重算——
 * 「换参数也好使」正是法律该有的样子；而把「结合律」的分组按钮切错
 * （示例里给了一个真实会破的错分组），灯当场变红，说明法律不是摆设。
 *
 * 契约（```lab 围栏里的 JSON，字段均可省）：
 *   { "type": "cat-monad-pipeline", "seed": 3, "a": 10, "b": 2 }
 * ========================================================================= */

import {
  themeColors, setupCanvas, label, clamp, buildReadout,
  buildToolbar, buildSliders, mkBtn, clearBg, mergeSpec,
} from '../core.js';

/* 列表 Monad 的三件套。写成纯函数，法律核对直接调它们。 */
const unit = (v) => [v];
function bind(boxed, f) {
  const out = [];
  boxed.forEach((item) => {
    const produced = f(item);
    if (!Array.isArray(produced)) return;   /* 容错：工序没按合同交货就跳过，不抛错 */
    produced.forEach((piece) => { out.push(piece); });
  });
  return out;
}

const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

export default function render(host, spec) {
  const safe = spec && typeof spec === 'object' ? spec : {};
  let seed = Number.isFinite(safe.seed) ? clamp(safe.seed, 0, 9) : 3;
  let addA = Number.isFinite(safe.a) ? clamp(safe.a, 1, 20) : 10;
  let mulB = Number.isFinite(safe.b) ? clamp(safe.b, 1, 5) : 2;

  /* 「错分组」按钮：把结合律的右侧换成一个真的会破的写法
     （只让第一阶段产出的最后一位续程）——这正是课文练习 1 的病。 */
  let broken = false;

  /* 两道工序：f 一变二，g 一变一 */
  const stepF = (x) => [x, x + addA];
  const stepG = (y) => [y - mulB];

  function stage2(list) { return bind(list, stepF); }
  function stage3(list) { return bind(list, stepG); }

  function rightBroken(m, f, g) {
    /* 错版：第一阶段只留最后一位去跑第二程（漏人） */
    const first = bind(m, f);
    if (!first.length) return [];
    const last = first[first.length - 1];
    return g(last);
  }

  /* ---------- DOM ---------- */

  const ro = buildReadout({
    '种子': '—',
    '第一道工序 f': '—',
    '流水线成品': '—',
    '三条法律': '—',
    '结论': '—',});
  host.appendChild(ro.box);

  /* 三个旋钮：种子、第一道工序的加数、第二道工序的减数。
     备注：滑块改动会重算三条法律——法律该对任意参数成立，这正是它
     区别于「碰巧在某个例子下对」的地方。 */
  const base = [
    { name: 'seed', label: '种子 x', min: 0, max: 9, step: 1, value: seed, fmt: 0 },
    { name: 'addA', label: '工序 f 的加数 a', min: 1, max: 20, step: 1, value: addA, fmt: 0 },
    { name: 'mulB', label: '工序 g 的减数 b', min: 1, max: 5, step: 1, value: mulB, fmt: 0 },
  ];
  const sliders = buildSliders({ sliders: mergeSpec(base, safe) }, () => {
    seed = Math.round(sliders.state.seed);
    addA = Math.round(sliders.state.addA);
    mulB = Math.round(sliders.state.mulB);
    sync();
    draw();
  });

  const bGroup = mkBtn('切换结合律分组');
  const bReset = mkBtn('重置');
  host.appendChild(buildToolbar(bGroup, bReset));

  const cv = setupCanvas(host, 430);
  /* ctx 提到 render 作用域：stageHeader 是与 draw 平级的兄弟函数，拿不到 draw
     函数体里的 const ctx（曾整块抛 ReferenceError → ctx is not defined）。 */
  const ctx = cv.ctx;

  /* ---------- 布局 ---------- */

  const geo = { W: 0, H: 0, stageH: 0, lawsY: 0, narrow: false };

  function layout(W, H) {
    geo.W = W;
    geo.H = H;
    geo.narrow = W < 620;
    geo.stageH = geo.narrow ? 54 : 58;
    geo.lawsY = 34 + geo.stageH * 4 + 12;
  }

  /* 一排胶囊：把一组数画成一行小盒 */
  function pills(ctx, C, values, x, y, color, opts) {
    const o = opts || {};
    const pw = o.pw || 46;
    const gap = 6;
    if (!values.length) {
      label(ctx, '（空）', x, y + 14, C.axis, { size: 10.5 });
      return 0;
    }
    values.forEach((v, i) => {
      const bx = x + i * (pw + gap);
      ctx.save();
      ctx.fillStyle = C.bg;
      ctx.strokeStyle = color;
      ctx.lineWidth = o.lw || 1.5;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(bx, y, pw, 22, 5);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.strokeRect(bx, y, pw, 22);
      }
      ctx.restore();
      label(ctx, String(v), bx + pw / 2, y + 15, color, { size: 11, align: 'center', weight: 600 });
    });
    return values.length * (pw + gap);
  }

  function stageHeader(C, n, title, sub, y) {
    label(ctx, '①②③④'[n] + ' ' + title, 10, y, C.fg, { size: 11, weight: 700 });
    label(ctx, sub, 178, y, C.axis, { size: 10 });
  }

  function draw() {
    const C = themeColors();
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    layout(W, H);

    label(ctx, '列表 Monad 的传送带：装箱 → 一变多 → bind 拍扁 → 再一变多 → 再拍扁',
      10, 18, C.fg, { size: 11.5, weight: 700 });

    const boxed = unit(seed);
    const afterF = stage2(boxed);
    const flat = bind(afterF, (x) => [x]);      /* 等价于拍扁一步 */
    const afterG = stage3(afterF);

    const sh = geo.stageH;
    let y = 34;

    stageHeader(C, 0, '装箱 unit', '裸值先领一只箱子，工序才有活可干', y + 8);
    pills(ctx, C, boxed, 14, y + 16, C.named('blue'));
    y += sh;

    stageHeader(C, 1, '第一道工序 f', '每颗种子变成一族候补：x ↦ [x, x+' + addA + ']', y + 8);
    pills(ctx, C, afterF, 14, y + 16, C.named('green'));
    y += sh;

    stageHeader(C, 2, 'bind 拍扁', '一族一族的成品被压回一层——这就是 join 的日常面孔', y + 8);
    pills(ctx, C, flat, 14, y + 16, C.named('orange'));
    y += sh;

    stageHeader(C, 3, '第二道工序 g', '再长一轮：y ↦ [y − ' + mulB + ']，bind 再拍扁一次', y + 8);
    pills(ctx, C, afterG, 14, y + 16, C.named('purple'));

    /* ---------- 三条法律的灯 ---------- */
    const ly = geo.lawsY;
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(10, ly - 12);
    ctx.lineTo(W - 10, ly - 12);
    ctx.stroke();
    ctx.restore();
    label(ctx, '三条法律的实时核对', 10, ly + 2, C.fg, { size: 11, weight: 700 });

    const m = boxed;
    const leftLaw = same(bind(unit(seed), stepF), stepF(seed));
    const rightLaw = same(bind(m, unit), m);
    const assocL = bind(bind(m, stepF), stepG);
    const assocR = broken
      ? rightBroken(m, stepF, stepG)
      : bind(m, (x) => bind(stepF(x), stepG));
    const assocOk = same(assocL, assocR);

    const rows = [
      {
        name: '左单位律',
        exp: 'bind(unit(x), f) 与 f(x) 逐项相同',
        l: bind(unit(seed), stepF),
        r: stepF(seed),
        ok: leftLaw,
      },
      {
        name: '右单位律',
        exp: 'bind(m, unit) 与 m 逐项相同',
        l: bind(m, unit),
        r: m,
        ok: rightLaw,
      },
      {
        name: '结合律',
        exp: broken
          ? 'bind(bind(m,f),g) 与「只留最后一位续程」的错分组相比'
          : 'bind(bind(m,f),g) 与 bind(m, x↦bind(f(x),g)) 逐项相同',
        l: assocL,
        r: assocR,
        ok: assocOk,
      },
    ];

    let ry = ly + 18;
    const lampR = 7;
    rows.forEach((row) => {
      ctx.save();
      ctx.fillStyle = row.ok ? C.ok : C.bad;
      ctx.beginPath();
      ctx.arc(18, ry - 3, lampR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      label(ctx, row.name, 32, ry, row.ok ? C.ok : C.bad, { size: 11, weight: 700 });
      label(ctx, row.exp, 96, ry, C.axis, { size: 9.5 });
      /* 两侧清单 */
      const lTxt = '[' + row.l.join(', ') + ']';
      const rTxt = '[' + row.r.join(', ') + ']';
      label(ctx, lTxt, 14, ry + 15, C.fg, { size: 10, weight: 600 });
      label(ctx, 'vs', 14 + Math.max(60, lTxt.length * 7), ry + 15, C.axis, { size: 10 });
      label(ctx, rTxt, 14 + Math.max(60, lTxt.length * 7) + 22, ry + 15,
        row.ok ? C.ok : C.bad, { size: 10, weight: 600 });
      ry += geo.narrow ? 40 : 36;
    });

    label(ctx, broken
      ? '错分组只有第一位选手跑完两程，其余候补漏在半路——结合律当场亮红。'
      : '三条全绿：换种子、换工序参数，灯依然全绿——这正是「法律」与「碰巧」的区别。',
      10, ry + 2, broken ? C.bad : C.ok, { size: 10.5, weight: 600 });

    /* 底部提示 */
    const hintY = H - 14;
    label(ctx, '成品 = [' + afterG.join(', ') + ']　（两道工序各一变多，bind 每一拍都把结果压回一层）',
      10, hintY, C.axis, { size: 10 });
  }

  /* ---------- 读数 ---------- */

  function sync() {
    const boxed = unit(seed);
    const afterF = stage2(boxed);
    const afterG = stage3(afterF);
    const assocL = bind(bind(boxed, stepF), stepG);
    const assocR = broken
      ? rightBroken(boxed, stepF, stepG)
      : bind(boxed, (x) => bind(stepF(x), stepG));
    const leftLaw = same(bind(unit(seed), stepF), stepF(seed));
    const rightLaw = same(bind(boxed, unit), boxed);
    const assocOk = same(assocL, assocR);
    const pass = [leftLaw, rightLaw, assocOk].filter(Boolean).length;

    ro.set('种子', String(seed) + '　unit 后 = [' + boxed.join(', ') + ']');
    ro.set('第一道工序 f', '[' + afterF.join(', ') + ']（' + afterF.length + ' 个候补）');
    ro.set('流水线成品', '[' + afterG.join(', ') + ']');
    ro.set('三条法律', pass + ' / 3 通过' + (broken ? '（结合律已被人为改坏）' : ''));
    ro.set('结论', broken
      ? '错分组破坏了结合律：绑定的先后顺序不是随便排的'
      : '法律全数成立：分组方式不影响成品');

    bGroup.textContent = broken ? '换回正确分组' : '切换成错分组';
  }

  /* ---------- 交互 ---------- */

  bGroup.addEventListener('click', () => {
    broken = !broken;
    sync();
    draw();
  });
  bReset.addEventListener('click', () => {
    seed = 3;
    addA = 10;
    mulB = 2;
    broken = false;
    /* 滑块与内部状态必须一起复位，否则下一帧读数与画面会打架 */
    [{ i: 0, v: 3 }, { i: 1, v: 10 }, { i: 2, v: 2 }].forEach(({ i, v }) => {
      const row = sliders.box.children[i];
      if (!row) return;
      const input = row.children[1];
      const val = row.children[2];
      if (input) input.value = String(v);
      if (val) val.textContent = String(v);
    });
    sliders.state.seed = 3;
    sliders.state.addA = 10;
    sliders.state.mulB = 2;
    sync();
    draw();
  });

  sync();
  draw();
  cv.redraw = draw;
  return {
    slidersBox: sliders.box,
    destroy() { cv.redraw = null; },
  };
}