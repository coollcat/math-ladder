/* =========================================================================
 * cat-compose-exit —— 组合性三出口的现场（第 67 章 · 应用出口）
 * -------------------------------------------------------------------------
 * mode="contract"（类型系统出口）
 *   四个工位各登记一张「进什么、出什么」的合同。点两个相邻工位可对调顺序，
 *   机器逐站握手：进料形态与合同对不上，当场停工并报出是哪一站、期望什么、
 *   实际拿到什么。默认顺序严丝合缝；对调任意两项立刻断链——这就是编译器
 *   红色波浪线的心跳。另外给一个「偷偷换实现」按钮：合同不变、实现换了，
 *   握手照样通过——接口合同的执法范围只到形态。
 *
 * mode="fold"（函数式出口）
 *   同一台归并引擎，换一个工位就从「拼字符串」变「点货」。右侧把结合律
 *   的两副括号摆出来：((a·b)·c)·d 与 a·(b·(c·d))，逐步展开每一拍
 *   当前累计值，两列最后必须相同。这才是「拆成任意两段分别缓存」的底气。
 *
 * mode="residual"（机器学习出口）
 *   一条前馈主干串起若干层，插一处残差短路边。逐步核：(1) 每个节点仍是
 *   良定函数；(2) 短路加回后主干层数不变；(3) 去掉某一层的参数，图的
 *   合法性不受影响（只是数值变了）。要点是「接线后依然是合法复合」。
 *
 * 契约（```lab 围栏里的 JSON，字段均可省）：
 *   { "type": "cat-compose-exit", "mode": "contract" }
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, label, arrow, clamp,
  buildSegmented, buildToolbar, buildReadout, mkBtn, clearBg,
} from '../core.js';

/* ---------- contract 模式的工位名册（形状合同） ---------- */
const STATIONS = {
  _tokenize: { label: '分词', in: 'text', out: 'tokens' },
  _embed: { label: '向量化', in: 'tokens', out: 'vectors' },
  _softmax: { label: '归一化', in: 'vectors', out: 'probs' },
  _argmax: { label: '取判决', in: 'probs', out: 'label' },
};
const DEFAULT_FLOW = ['_tokenize', '_embed', '_softmax', '_argmax'];

/* 换实现：同一张合同、不同的内部做法。合同世界里它们可以互换。 */
const ALT_IMPL = {
  _tokenize: { label: '分词（换实现）', in: 'text', out: 'tokens' },
};

const SHAPE_CN = {
  text: '原文',
  tokens: '词条',
  vectors: '向量',
  probs: '概率分布',
  label: '终审结果',
};

/* ---------- fold 模式的数据 ---------- */
const WORDS = ['deep', 'learning', 'meets', 'category'];

function foldLeft(items, step, start) {
  let acc = start;
  const trace = [start];
  items.forEach((it) => {
    acc = step(acc, it);
    trace.push(acc);
  });
  return { value: acc, trace };
}

const joinDash = (state, word) => (state === '' ? word : state + '-' + word);
const countOne = (state, word) => state + 1;

export default function render(host, spec) {
  const safe = spec && typeof spec === 'object' ? spec : {};
  let mode = ['contract', 'fold', 'residual'].indexOf(safe.mode) >= 0 ? safe.mode : 'contract';

  /* contract */
  let flow = DEFAULT_FLOW.slice();
  let selStation = -1;
  let swapped = false;
  let altImpl = false;

  /* fold */
  let foldStep = 0;                 /* 已卷入几件 */
  let foldJob = 'join';             /* join | count */
  let brackets = 'left';            /* left | right */

  /* residual */
  let layersOn = [true, true, true, true];
  let residualOn = true;
  let reveal = 0;

  const ro = buildReadout({
    模式: '—',
    状态: '—',
    断点: '—',
    读数: '—',
    结论: '—',
  });
  host.appendChild(ro.box);

  host.appendChild(buildSegmented(
    [
      { label: '类型合同', value: 'contract' },
      { label: '函数式管道', value: 'fold' },
      { label: '残差接线', value: 'residual' },
    ],
    mode,
    (v) => {
      mode = v;
      selStation = -1;
      sync();
      draw();
    },
  ));

  const bSwap = mkBtn('对调中间两站');
  const bAlt = mkBtn('偷偷换掉分词实现');
  const bStep = mkBtn('单步');
  const bJob = mkBtn('换一个折叠工位');
  const bBracket = mkBtn('切换括号分组');
  const bLayer = mkBtn('抽掉第三层参数');
  const bResid = mkBtn('拆掉残差短路边');
  const bReset = mkBtn('重置');
  host.appendChild(buildToolbar(bSwap, bAlt));
  host.appendChild(buildToolbar(bStep, bJob, bBracket));
  host.appendChild(buildToolbar(bLayer, bResid, bReset));

  const cv = setupCanvas(host, 420);

  /* ---------- contract：逐站握手 ---------- */

  function handshake() {
    const steps = [];
    let cursor = 'text';
    let broken = -1;
    flow.forEach((key, i) => {
      const st = key === '_tokenize' && altImpl ? ALT_IMPL._tokenize : STATIONS[key];
      const ok = st.in === cursor;
      steps.push({ key, st, expectIn: st.in, got: cursor, ok, idx: i });
      if (!ok && broken < 0) broken = i;
      cursor = ok ? st.out : cursor;
    });
    return { steps, broken, final: cursor };
  }

  function drawContract(C) {
    const ctx = cv.ctx;
    const W = geo.W;
    const hs = handshake();

    label(ctx, '每个工位登记一张「进什么 / 出什么」的合同；连得起来才算流水线',
      10, 18, C.fg, { size: 11, weight: 700 });
    label(ctx, '点任一工位再点它右边那一站即可对调顺序（也可以直接按下面的按钮）。',
      10, 34, C.axis, { size: 10 });

    const n = flow.length;
    const laneW = (W - 30) / n;
    const boxH = 56;
    const y0 = 62;

    flow.forEach((key, i) => {
      const st = key === '_tokenize' && altImpl ? ALT_IMPL._tokenize : STATIONS[key];
      const step = hs.steps[i];
      const x = 15 + i * laneW;
      const hot = selStation === i;
      const dead = hs.broken >= 0 && i > hs.broken;

      ctx.save();
      ctx.fillStyle = dead ? C.soft : C.bg;
      ctx.strokeStyle = step.ok ? (hot ? C.accent2 : C.axis) : C.bad;
      ctx.lineWidth = hot ? 2.4 : (step.ok ? 1.4 : 2.2);
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(x + 3, y0, laneW - 8, boxH, 7);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.strokeRect(x + 3, y0, laneW - 8, boxH);
      }
      ctx.restore();

      label(ctx, st.label, x + laneW / 2 - 1, y0 + 20, dead ? C.grid : C.fg,
        { size: 11, align: 'center', weight: 700 });
      label(ctx, '进 ' + SHAPE_CN[st.in] + ' → 出 ' + SHAPE_CN[st.out], x + laneW / 2 - 1, y0 + 38,
        dead ? C.grid : C.axis, { size: 9.5, align: 'center' });
      label(ctx, (i + 1) + '', x + 10, y0 - 6, C.axis, { size: 9 });

      /* 站与站之间的握手标记 */
      if (i < n - 1) {
        const nextStep = hs.steps[i + 1];
        const ax = x + laneW - 4;
        const bx = x + laneW + 4;
        const col = nextStep && nextStep.ok ? C.ok : C.bad;
        arrow(ctx, ax, y0 + boxH / 2, bx + 2, y0 + boxH / 2, col, 1.8, 7);
      }
      /* 进料形态：在盒子左侧标出实际拿到的是什么 */
      const inY = y0 + boxH + 18;
      label(ctx, '拿到：' + SHAPE_CN[step.got], x + laneW / 2 - 1, inY,
        step.ok ? C.ok : C.bad, { size: 10, align: 'center', weight: 600 });
      if (!step.ok) {
        label(ctx, '要求：' + SHAPE_CN[step.expectIn], x + laneW / 2 - 1, inY + 15, C.bad,
          { size: 9.5, align: 'center' });
      }
    });

    /* 结论条 */
    const cy = y0 + boxH + 52;
    if (hs.broken >= 0) {
      const bad = hs.steps[hs.broken];
      label(ctx, '第 ' + (hs.broken + 1) + ' 站停工：' + bad.st.label + ' 要求'
        + SHAPE_CN[bad.expectIn] + '，实际拿到' + SHAPE_CN[bad.got] + '。',
        10, cy, C.bad, { size: 11, weight: 700 });
      label(ctx, '整条链从这一站起全部作废——后面几站不是「算得慢」，而是压根没料可算。',
        10, cy + 18, C.axis, { size: 10 });
    } else {
      label(ctx, '全链握手通过，终点形态：' + SHAPE_CN[hs.final] + '。',
        10, cy, C.ok, { size: 11, weight: 700 });
      label(ctx, altImpl
        ? '分词换过实现了，握手照样通过——合同只执法形态，不管内部怎么干。'
        : '按「偷偷换掉分词实现」：合同不变、实现换了，链条依然通过。',
      10, cy + 18, C.axis, { size: 10 });
    }

    label(ctx, '注意这不是「性能优化」：它拦下的是把中间材料当终审结果这类形态错位，',
      10, geo.H - 26, C.axis, { size: 10 });
    label(ctx, '而这类错误恰恰是「程序跑得通、答案却是错的」那种最贵的一类。',
      10, geo.H - 12, C.axis, { size: 10 });
  }

  /* ---------- fold：结合律的两副括号 ---------- */

  function drawFold(C) {
    const ctx = cv.ctx;
    const W = geo.W;
    const step = foldJob === 'join' ? joinDash : countOne;
    const left = foldLeft(WORDS.slice(0, foldStep), step, foldJob === 'join' ? '' : 0);

    label(ctx, '同一台归并引擎，换一个工位就从「拼字符串」变成「点货」',
      10, 18, C.fg, { size: 11, weight: 700 });

    /* 当前卷到第几件 */
    const y0 = 44;
    label(ctx, '已卷入 ' + foldStep + ' / ' + WORDS.length + ' 件：', 10, y0, C.axis, { size: 10 });
    WORDS.forEach((w, i) => {
      const x = 20 + i * Math.min(96, (W - 60) / WORDS.length);
      const used = i < foldStep;
      ctx.save();
      ctx.fillStyle = used ? C.accent : C.soft;
      ctx.globalAlpha = used ? 0.16 : 0.5;
      ctx.fillRect(x, y0 + 10, 78, 26);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = used ? C.accent : C.grid;
      ctx.strokeRect(x + 0.5, y0 + 10.5, 78, 26);
      ctx.restore();
      label(ctx, w, x + 39, y0 + 28, used ? C.accent : C.axis,
        { size: 10.5, align: 'center', weight: used ? 700 : 400 });
    });

    /* 累计轨迹 */
    const ty = y0 + 62;
    label(ctx, '累计轨迹（每吞一件就刷新一次累计状态）：', 10, ty, C.fg, { size: 10.5, weight: 700 });
    left.trace.forEach((v, i) => {
      const txt = foldJob === 'join' ? (v === '' ? '（空串）' : v) : String(v);
      label(ctx, i === 0 ? '起点 ' + txt : '第 ' + i + ' 件后 ' + txt, 20, ty + 18 + i * 16,
        i === left.trace.length - 1 ? C.accent : C.fg,
        { size: 10, weight: i === left.trace.length - 1 ? 700 : 400 });
    });

    /* 结合律两副括号 */
    const by = geo.H - 132;
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.beginPath();
    ctx.moveTo(10, by - 14);
    ctx.lineTo(W - 10, by - 14);
    ctx.stroke();
    ctx.restore();
    label(ctx, '结合律：括号怎么摆，结果都该一样', 10, by, C.fg, { size: 10.5, weight: 700 });

    const full = foldLeft(WORDS, joinDash, '');
    const leftGroup = foldLeft(WORDS, joinDash, '');
    /* 右边分组：先把 c·d 合成一段，再把 b 接上，再把 a 接上 */
    const seg = foldLeft(WORDS.slice(2), joinDash, '');
    const rightGroup = (() => {
      let acc = WORDS[1] + '-' + seg.value;
      acc = WORDS[0] + '-' + acc;
      return acc;
    })();
    const hotLeft = brackets === 'left';
    label(ctx, (hotLeft ? '▶ ' : '　') + '((a·b)·c)·d = ' + leftGroup.value,
      20, by + 20, hotLeft ? C.accent : C.fg, { size: 10.5, weight: hotLeft ? 700 : 400 });
    label(ctx, (hotLeft ? '　' : '▶ ') + 'a·(b·(c·d)) = ' + rightGroup,
      20, by + 38, hotLeft ? C.fg : C.accent, { size: 10.5, weight: hotLeft ? 400 : 700 });
    label(ctx, '两行逐字相同 —— 所以「拆成任意两段分别缓存」不会改变语义。',
      20, by + 58, C.ok, { size: 10.5, weight: 600 });
    label(ctx, '换成点数工位 (= ' + foldLeft(WORDS, countOne, 0).value
      + ') 也一样：数字加法满足结合律，字符串拼接同样满足——这就是「同一张语法通行证」。',
      20, by + 76, C.axis, { size: 10 });
    label(ctx, '但注意：结合律管的是「怎么分组」，不管「顺序能不能换」——拼接换成交错就未必一样了。',
      20, by + 92, C.axis, { size: 10 });
    void full;
  }

  /* ---------- residual：残差接线 ---------- */

  function drawResidual(C) {
    const ctx = cv.ctx;
    const W = geo.W;
    const names = ['嵌入', '注意力', '前馈', '输出头'];
    const y0 = 66;
    const boxW = Math.min(120, (W - 70) / names.length - 10);
    const gap = (W - 40 - boxW * names.length) / Math.max(1, names.length - 1);

    label(ctx, '前馈主干本身就是一串函数复合；残差是给这条链再添一支平行边',
      10, 18, C.fg, { size: 11, weight: 700 });
    label(ctx, '逐步核：每个节点仍是良定函数 → 短路边汇合后仍是合法复合 → 拆掉一层只是数值变，图不塌。',
      10, 34, C.axis, { size: 10 });

    const xs = names.map((_, i) => 20 + i * (boxW + gap));
    names.forEach((nm, i) => {
      const on = layersOn[i];
      const x = xs[i];
      ctx.save();
      ctx.fillStyle = on ? C.bg : C.soft;
      ctx.strokeStyle = on ? C.axis : C.grid;
      ctx.lineWidth = on ? 1.6 : 1.4;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(x, y0, boxW, 44, 6);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.strokeRect(x, y0, boxW, 44);
      }
      ctx.restore();
      label(ctx, nm, x + boxW / 2, y0 + 20, on ? C.fg : C.grid,
        { size: 10.5, align: 'center', weight: 700 });
      label(ctx, on ? 'f' + (i + 1) : '参数已抽走', x + boxW / 2, y0 + 35,
        on ? C.axis : C.bad, { size: 9.5, align: 'center' });
      if (i < names.length - 1) {
        arrow(ctx, x + boxW + 2, y0 + 22, x + boxW + gap - 4, y0 + 22, C.accent, 1.8, 7);
      }
    });

    /* 残差短路边：从第 1 层入口绕到第 3 层出口 */
    if (residualOn) {
      const ax = xs[0] + boxW / 2;
      const bx = xs[2] + boxW / 2;
      const cy = y0 + 78;
      ctx.save();
      ctx.strokeStyle = C.named('purple');
      ctx.lineWidth = 1.8;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(ax, y0 + 44);
      ctx.lineTo(ax, cy);
      ctx.lineTo(bx, cy);
      ctx.lineTo(bx, y0 + 44);
      ctx.stroke();
      ctx.restore();
      arrow(ctx, bx - 12, cy, bx - 2, cy, C.named('purple'), 1.8, 7);
      label(ctx, '残差短路边：把第 1 层的输入直接加回第 3 层的输出', (ax + bx) / 2, cy + 16,
        C.named('purple'), { size: 10, align: 'center' });
      label(ctx, '+', bx + 8, y0 + 36, C.named('purple'), { size: 15, weight: 700 });
    } else {
      label(ctx, '短路边已拆：图仍是合法复合，只是梯度不得不逐层穿过去。',
        W / 2, y0 + 82, C.axis, { size: 10, align: 'center' });
    }

    /* 逐步核对清单 */
    let ry = y0 + 118;
    const items = [
      { k: '每个节点都是良定函数（有明确的输入输出形状）',
        ok: true, note: '抽掉参数只是把这一层换成恒等或空实现，形态没变' },
      { k: '短路边与主干在同一节点汇合，仍是复合',
        ok: residualOn, note: residualOn ? '两条箭头的落点类型一致，可以直接相加' : '少了这条边，只剩单链' },
      { k: '抽掉任意一层，整图合法性不变',
        ok: true, note: '合法性由接线决定，参数只是数值' },
    ];
    label(ctx, '逐步核对（前 ' + clamp(reveal, 0, items.length) + ' 项已核）：', 10, ry, C.fg,
      { size: 10.5, weight: 700 });
    ry += 18;
    items.forEach((it, i) => {
      const seen = i < reveal;
      label(ctx, (seen ? (it.ok ? '✓ ' : '✗ ') : '· ') + it.k, 20, ry + i * 17,
        !seen ? C.grid : (it.ok ? C.ok : C.bad), { size: 10, weight: seen ? 600 : 400 });
      if (seen) {
        label(ctx, it.note, 30, ry + i * 17 + 14, C.axis, { size: 9.5 });
      }
    });

    label(ctx, '诚实边界：类比不是定理。把模型每一层当函子看能带来架构纪律，',
      10, geo.H - 26, C.axis, { size: 10 });
    label(ctx, '但不自动附带数学意义上的严格交换图——语义边界要标清楚。', 10, geo.H - 12, C.axis,
      { size: 10 });
  }

  /* ---------- 主绘制 ---------- */

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    layout(W, H);
    if (mode === 'contract') drawContract(C);
    else if (mode === 'fold') drawFold(C);
    else drawResidual(C);
  }

  const geo = { W: 0, H: 0 };

  function layout(W, H) {
    geo.W = W;
    geo.H = H;
  }

  /* ---------- 读数 ---------- */

  function sync() {
    ro.set('模式', mode === 'contract' ? '类型合同' : mode === 'fold' ? '函数式管道' : '残差接线');
    if (mode === 'contract') {
      const hs = handshake();
      ro.set('状态', hs.broken >= 0 ? '第 ' + (hs.broken + 1) + ' 站停工' : '全链通过');
      ro.set('断点', hs.broken >= 0 ? hs.steps[hs.broken].st.label : '无');
      ro.set('读数', '终点形态：' + SHAPE_CN[hs.final]);
      ro.set('结论', hs.broken >= 0
        ? '合同错位 = 编译器红色波浪线的灵魂'
        : (altImpl ? '换实现不换合同：接口照常执法' : '四站严丝合缝'));
    } else if (mode === 'fold') {
      const step = foldJob === 'join' ? joinDash : countOne;
      const r = foldLeft(WORDS.slice(0, foldStep), step, foldJob === 'join' ? '' : 0);
      ro.set('状态', '已卷入 ' + foldStep + ' / ' + WORDS.length + ' 件');
      ro.set('断点', '—');
      ro.set('读数', '当前累计：' + (r.value === '' ? '（空串）' : r.value));
      ro.set('结论', '两副括号结果逐字相同：结合律就是缓存与分段调度的许可证');
    } else {
      ro.set('状态', '已核 ' + reveal + ' / 3 项');
      ro.set('断点', residualOn ? '—' : '短路边已拆');
      ro.set('读数', '层：' + layersOn.map((v, i) => (v ? 'f' + (i + 1) : '空')).join(' → '));
      ro.set('结论', '接线决定合法性，参数只决定数值');
    }

    bSwap.disabled = mode !== 'contract';
    bAlt.disabled = mode !== 'contract';
    bStep.disabled = mode !== 'fold' && mode !== 'residual';
    bJob.disabled = mode !== 'fold';
    bBracket.disabled = mode !== 'fold';
    bLayer.disabled = mode !== 'residual';
    bResid.disabled = mode !== 'residual';
  }

  /* ---------- 交互 ---------- */

  bindPointer(cv.canvas, {
    pick(x, y) {
      if (mode !== 'contract') return null;
      const n = flow.length;
      const laneW = (geo.W - 30) / n;
      const y0 = 62;
      if (y < y0 || y > y0 + 56) return null;
      const i = Math.floor((x - 15) / laneW);
      if (i < 0 || i >= n) return null;
      return { kind: 'station', i };
    },
    down(id) {
      if (!id || id.kind !== 'station') return;
      if (selStation >= 0 && Math.abs(selStation - id.i) === 1) {
        const a = Math.min(selStation, id.i);
        const tmp = flow[a];
        flow[a] = flow[a + 1];
        flow[a + 1] = tmp;
        swapped = true;
        selStation = -1;
      } else {
        selStation = id.i;
      }
      sync();
      draw();
    },
  });

  bSwap.addEventListener('click', () => {
    if (flow.length < 3) return;
    const a = 1;
    const tmp = flow[a];
    flow[a] = flow[a + 1];
    flow[a + 1] = tmp;
    swapped = !swapped;
    selStation = -1;
    sync();
    draw();
  });
  bAlt.addEventListener('click', () => {
    altImpl = !altImpl;
    bAlt.textContent = altImpl ? '换回原分词实现' : '偷偷换掉分词实现';
    sync();
    draw();
  });
  bStep.addEventListener('click', () => {
    if (mode === 'fold') {
      foldStep = Math.min(foldStep + 1, WORDS.length);
    } else if (mode === 'residual') {
      reveal = Math.min(reveal + 1, 3);
    }
    sync();
    draw();
  });
  bJob.addEventListener('click', () => {
    foldJob = foldJob === 'join' ? 'count' : 'join';
    foldStep = WORDS.length;
    sync();
    draw();
  });
  bBracket.addEventListener('click', () => {
    brackets = brackets === 'left' ? 'right' : 'left';
    sync();
    draw();
  });
  bLayer.addEventListener('click', () => {
    layersOn[2] = !layersOn[2];
    sync();
    draw();
  });
  bResid.addEventListener('click', () => {
    residualOn = !residualOn;
    bResid.textContent = residualOn ? '拆掉残差短路边' : '装回残差短路边';
    sync();
    draw();
  });
  bReset.addEventListener('click', () => {
    flow = DEFAULT_FLOW.slice();
    selStation = -1;
    swapped = false;
    altImpl = false;
    foldStep = 0;
    foldJob = 'join';
    brackets = 'left';
    layersOn = [true, true, true, true];
    residualOn = true;
    reveal = 0;
    bAlt.textContent = '偷偷换掉分词实现';
    bResid.textContent = '拆掉残差短路边';
    sync();
    draw();
  });

  sync();
  draw();
  cv.redraw = draw;
  return {
    destroy() { cv.redraw = null; },
  };
}
