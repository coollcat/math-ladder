/* =========================================================================
 * lab 组件：rl-markov-memory —— 「只看位置」与「位置 + 有钥匙」两种状态编码
 * -------------------------------------------------------------------------
 * 用法（第 50 章 Markov 性质）：
 *
 *   { "type": "rl-markov-memory", "title": "两种状态编码的对比" }
 *
 * 字段（都可省）：
 *   steps    每点一次「再跑一批」推进的步数，20..400，默认 80
 *   seed     随机种子，默认 44
 *   height   画布高度，默认 560
 *
 * 演示什么：同一个环境（走廊 0..4，3 号是门；1 号有钥匙；带钥匙才能进门，
 * 进门会消耗钥匙），用两种编码去「记」状态，然后用经验直方图检验 Markov 性：
 *   · 编码 A（只看位置）：桶 = {0,1,2,3,4}
 *   · 编码 B（位置 + 有无钥匙）：桶 = {(0,无),(0,有),…}
 * 每个桶里统计「下一步去了哪」，桶内分布越乱（熵越高），说明这个编码漏掉了
 * 决定未来的信息——历史一旦不同、预测就不同，Markov 性被破坏。
 * 编码 B 的每个桶只有两种可能去向，编码 A 的「位置 2」桶会被钥匙状态搅成
 * 三种，熵明显更高。这就是「补全状态」的动机。
 *   · 再跑一批：继续采样；播放：连续采样；重置：清空计数。
 *   · 不演示价值学习，只做「状态编码是否足够」这一件事。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildToolbar, buildReadout, buildSliders, mergeSpec,
  mkBtn, label, clamp, fmt, clearBg, onScreen, mulberry32,
} from '../core.js';
import { fillRound, caption, colorRGBA, strokeRound, dot, chip } from './rl-common.js';

const BASE = [
  { name: 'steps', label: '每批步数', min: 20, max: 400, step: 20, value: 80 },
];

const NCELL = 5;
const DOOR = 3;
const KEYCELL = 1;

export default function render(host, spec) {
  const H = clamp(spec.height || 560, 380, 940);
  let batch = clamp(Math.round(spec.steps || 80), 20, 400);
  const seed = Math.round(typeof spec.seed === 'number' ? spec.seed : 44);

  /* 真实环境状态：pos + hasKey */
  let pos = 0;
  let hasKey = false;
  let rng = mulberry32(seed);
  let steps = 0;
  let playing = false;
  let acc = 0;
  let trace = [0];
  let lastMove = null;        /* { from, to, bumped } */

  /* 两种编码的计数器：buckets[编码][桶键] = { counts: {nextPos: n}, total } */
  let partial = new Map();
  let full = new Map();

  const reduced = !!(window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const cv = setupCanvas(host, H);
  const sliders = buildSliders({ sliders: mergeSpec(BASE, spec) }, (st) => { batch = Math.round(st.steps); });

  const ro = buildReadout({
    '已采样步数': '0',
    '编码 A 桶数': '0',
    '编码 A 平均熵': '—',
    '编码 B 桶数': '0',
    '编码 B 平均熵': '—',
    '最难预测的桶': '—',
  });
  host.appendChild(ro.box);

  const bStep = mkBtn('再跑一批 ▶');
  const bPlay = mkBtn(reduced ? '减少动效' : '播放');
  const bReset = mkBtn('重置');
  bPlay.disabled = reduced;
  host.appendChild(buildToolbar(bStep, bPlay, bReset));

  const hint = document.createElement('div');
  hint.className = 'ml-lab__hint';
  hint.textContent = '同一段经历，用两种编码各记一本账：桶里「下一步去哪」越混杂，说明这种状态漏掉了信息。';
  host.appendChild(hint);

  /* ---- 环境一步：随机左右走；门要求钥匙，进门消耗钥匙 ---- */
  function envStep() {
    const a = rng() < 0.5 ? -1 : 1;
    let np = clamp(pos + a, 0, NCELL - 1);
    let bumped = false;
    /* 撞门判定要按「跨过 DOOR 这一格」而不是「落在 DOOR 上」：
       格子是 0..4、门在 3，所以 3→4 这一脚是**穿过**门，必须验钥匙；
       而 4→3 只是退回门口，不该再验一次。原写法只拦 np === DOOR，
       于是没钥匙时从 4 往哪走都到不了（4→3 被弹、4→4 原地），pos 永久冻结，
       后面几百步全是同一个状态，课文「多跑几批比较两边」就成了空话。 */
    const crossingDoor = (pos < DOOR && np >= DOOR) || (pos > DOOR && np <= DOOR);
    if (!hasKey && crossingDoor) { np = pos; bumped = true; }
    const keyBefore = hasKey;
    let keyAfter = hasKey;
    if (!bumped) {
      if (np === KEYCELL) keyAfter = true;
      if ((pos < DOOR && np >= DOOR) && keyBefore) keyAfter = false;   /* 穿门消耗钥匙 */
    }
    /* 记账：编码 A 只看 pos，编码 B 看 (pos, hasKey) */
    const keyA = String(pos);
    const keyB = pos + '|' + (hasKey ? '1' : '0');
    const bucketA = partial.get(keyA) || { counts: new Map(), total: 0 };
    const bucketB = full.get(keyB) || { counts: new Map(), total: 0 };
    bucketA.counts.set(np, (bucketA.counts.get(np) || 0) + 1);
    bucketA.total += 1;
    bucketB.counts.set(np, (bucketB.counts.get(np) || 0) + 1);
    bucketB.total += 1;
    partial.set(keyA, bucketA);
    full.set(keyB, bucketB);

    lastMove = { from: pos, to: np, bumped, keyBefore, keyAfter };
    pos = np;
    hasKey = keyAfter;
    /* 4 号格是终点：进门之后钥匙已经用掉，若不让回合结束，智能体会被
       永久锁在 4 号（往回走又要穿门、又没钥匙），几百步全停在同一格，
       两侧的熵都冻住不动。这里把「到达终点」当作回合边界，静默重置，
       记账只记跨越门那一脚，重置本身不算一次转移。 */
    if (pos === NCELL - 1) { pos = 0; hasKey = false; }
    steps += 1;
    trace.push(pos);
    if (trace.length > 40) trace.shift();
  }

  function runBatch(k) {
    for (let i = 0; i < k; i += 1) envStep();
    syncReadout();
  }

  /* ---- 熵 ---- */
  function entropy(bucket) {
    if (!bucket || !bucket.total) return 0;
    let h = 0;
    bucket.counts.forEach((c) => {
      const p = c / bucket.total;
      if (p > 0) h -= p * Math.log2(p);
    });
    return h;
  }
  function avgEntropy(map) {
    if (!map.size) return 0;
    let s = 0;
    map.forEach((b) => { s += entropy(b); });
    return s / map.size;
  }

  let raf = null;
  let lastT = 0;
  let visible = true;
  function ensure() {
    if (raf == null && visible && host.isConnected) { lastT = 0; raf = requestAnimationFrame(tick); }
  }
  function tick(now) {
    raf = null;
    const dt = lastT ? Math.min((now - lastT) / 1000, 0.05) : 1 / 60;
    lastT = now;
    if (playing) {
      acc += dt;
      while (acc >= 0.1 && playing) { acc -= 0.1; runBatch(8); }
    }
    draw();
    if (playing) raf = requestAnimationFrame(tick);
  }
  onScreen(host, (v) => {
    visible = v;
    if (!v && raf != null) { cancelAnimationFrame(raf); raf = null; } else if (v && playing) ensure();
  });

  function hardReset() {
    pos = 0;
    hasKey = false;
    rng = mulberry32(seed);
    steps = 0;
    trace = [0];
    lastMove = null;
    partial = new Map();
    full = new Map();
    playing = false;
    acc = 0;
    syncPlay();
    syncReadout();
    draw();
  }
  function syncPlay() { bPlay.textContent = reduced ? '减少动效' : (playing ? '暂停' : '播放'); }

  bStep.addEventListener('click', () => { playing = false; syncPlay(); runBatch(batch); draw(); });
  bPlay.addEventListener('click', () => {
    if (reduced) return;
    playing = !playing;
    acc = 0;
    syncPlay();
    ensure();
  });
  bReset.addEventListener('click', () => hardReset());

  function syncReadout() {
    ro.set('已采样步数', String(steps));
    ro.set('编码 A 桶数', String(partial.size) + ' / ' + NCELL);
    ro.set('编码 A 平均熵', steps ? fmt(avgEntropy(partial), 3) + ' bit' : '—');
    ro.set('编码 B 桶数', String(full.size) + ' / ' + (NCELL * 2));
    ro.set('编码 B 平均熵', steps ? fmt(avgEntropy(full), 3) + ' bit' : '—');
    let worst = null;
    partial.forEach((b, k) => {
      const h = entropy(b);
      if (!worst || h > worst.h) worst = { k, h, b };
    });
    ro.set('最难预测的桶', !worst ? '—'
      : 'A 的位置 ' + worst.k + '（熵 ' + fmt(worst.h, 2) + ' bit，' + worst.b.total + ' 次）');
  }

  /* ---- 绘制 ---- */
  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const Hh = cv.H;
    clearBg(ctx, W, Hh, C);

    label(ctx, '两种状态编码：只看位置 vs 位置 + 有无钥匙', 14, 20, C.fg, { size: 12.5, weight: 700 });
    label(ctx, '走廊 0..4，3 号是门（要钥匙、进门消耗钥匙），1 号放钥匙；动作随机左右走',
      14, 38, C.axis, { size: 10.5 });

    const wide = W >= 660;
    drawWorld(ctx, C, wide, W);

    const by = wide ? 168 : 292;
    drawBuckets(ctx, C, 14, by, W - 28, wide, Hh);
    void Hh;
  }

  function drawWorld(ctx, C, wide, W) {
    caption(ctx, '真实环境（agent 自己知道有没有钥匙，编码 A 却把它丢了）', 14, 70, C);
    const y = 80;
    const cellW = wide ? Math.min((W - 80) / NCELL - 8, 108) : (W - 60) / NCELL - 8;
    const x0 = wide ? 30 : 20;
    for (let i = 0; i < NCELL; i += 1) {
      const x = x0 + i * (cellW + 8);
      const isDoor = i === DOOR;
      const here = pos === i;
      fillRound(ctx, x, y, cellW, 52, 7,
        isDoor ? colorRGBA(C.bad, 0.14) : (here ? colorRGBA(C.accent, C.dark ? 0.26 : 0.16)
          : colorRGBA(C.fg, C.dark ? 0.05 : 0.03, [28, 30, 33])));
      strokeRound(ctx, x + 0.5, y + 0.5, cellW - 1, 51, 7, here ? C.accent : C.grid, here ? 2 : 1);
      label(ctx, String(i), x + 7, y + 15, C.axis, { size: 9 });
      if (isDoor) label(ctx, hasKey ? '门（有钥匙）' : '门（锁住）', x + cellW / 2, y + 36,
        C.bad, { size: 10, align: 'center', weight: 700 });
      else if (i === KEYCELL) label(ctx, hasKey ? '钥匙（已拿）' : '钥匙', x + cellW / 2, y + 36,
        C.named('amber'), { size: 10.5, align: 'center', weight: 700 });
      if (here) {
        dot(ctx, x + cellW / 2, y + 26, 5, C.named('orange'));
        chip(ctx, 'agent' + (hasKey ? ' +钥匙' : ''), x + cellW / 2, y - 8, C,
          { size: 9, padX: 4, height: 14, fill: colorRGBA(C.named('orange'), 0.24) });
      }
    }
    /* 最近一步 */
    if (lastMove) {
      const txt = lastMove.bumped ? '撞门了：没钥匙，原地不动（这一步没走成）'
        : '位置 ' + lastMove.from + ' → ' + lastMove.to
          + (lastMove.keyBefore && !lastMove.keyAfter && lastMove.to === DOOR ? '（消耗钥匙开了门）' : '')
          + (!lastMove.keyBefore && lastMove.keyAfter ? '（捡到钥匙）' : '');
      label(ctx, txt, x0, y + 70, C.fg, { size: 10.5, weight: 600 });
    }
    /* 轨迹条 */
    if (trace.length > 1) {
      const tw = wide ? Math.min(W - 80, 460) : W - 60;
      const sx = x0;
      const sy = y + 82;
      let prev = null;
      trace.forEach((p, idx) => {
        const px = sx + (idx / Math.max(trace.length - 1, 1)) * tw;
        const py = sy + (p / (NCELL - 1)) * 18;
        if (prev) {
          ctx.save();
          ctx.strokeStyle = colorRGBA(C.axis, 0.5);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(prev[0], prev[1]);
          ctx.lineTo(px, py);
          ctx.stroke();
          ctx.restore();
        }
        prev = [px, py];
      });
      label(ctx, '最近 ' + trace.length + ' 步的停留位置（纵轴 = 位置）', x0, sy + 32, C.axis, { size: 9 });
    }
  }

  function drawBuckets(ctx, C, x, y, w, wide, Hh) {
    const nameB = (k) => {
      const [p, has] = k.split('|');
      return '位置 ' + p + (has === '1' ? ' +钥匙' : ' 无钥匙');
    };
    if (wide) {
      const colW = (w - 24) / 2;
      const h = Math.max(220, Math.min(Hh - y - 16, 320));
      drawOne(ctx, C, x, y, colW, h, '编码 A：只看位置', partial, (k) => '位置 ' + k,
        C.named('orange'), true);
      drawOne(ctx, C, x + colW + 24, y, colW, h, '编码 B：位置 + 有无钥匙', full, nameB,
        C.named('teal'), true);
    } else {
      /* 窄屏：上下叠放两份账本，不省略任何一个编码（否则对比无从谈起） */
      const h = Math.max(132, Math.min((Hh - y - 20) / 2, 190));
      drawOne(ctx, C, x, y, w, h, '编码 A：只看位置', partial, (k) => '位置 ' + k,
        C.named('orange'), false);
      drawOne(ctx, C, x, y + h + 10, w, h, '编码 B：位置 + 有无钥匙', full, nameB,
        C.named('teal'), false);
    }
  }

  function drawOne(ctx, C, x, y, w, h, title, map, nameOf, color, wide) {
    fillRound(ctx, x, y, w, h, 8, colorRGBA(C.fg, C.dark ? 0.05 : 0.03, [28, 30, 33]));
    label(ctx, title, x + 10, y + 18, C.fg, { size: 11.5, weight: 700 });
    const avg = avgEntropy(map);
    label(ctx, '桶数 ' + map.size + '　平均熵 ' + fmt(avg, 2) + ' bit', x + 10, y + 34, color,
      { size: 10, weight: 600 });

    const keys = [...map.keys()].sort();
    if (!keys.length) {
      label(ctx, '还没有样本：点「再跑一批 ▶」开始采样。', x + 10, y + 60, C.axis, { size: 10 });
      return;
    }
    const rowH = Math.min(30, (h - 58) / Math.max(keys.length, 1));
    const barX = x + (wide ? 96 : 84);
    const barW = w - (barX - x) - 12;
    keys.forEach((k, i) => {
      const b = map.get(k);
      const yy = y + 46 + i * rowH;
      label(ctx, nameOf(k), x + 8, yy + 12, C.axis, { size: 9 });
      /* 堆叠条：按下一位置分色 */
      let acc = 0;
      b.counts.forEach((c, np) => {
        const frac = c / b.total;
        const bx = barX + acc * barW;
        const bw = Math.max(frac * barW, 1);
        ctx.save();
        ctx.fillStyle = colorRGBA(color, 0.35 + 0.55 * (np / (NCELL - 1)));
        ctx.fillRect(bx, yy + 3, bw, Math.max(rowH - 10, 8));
        ctx.restore();
        acc += frac;
      });
      const ent = entropy(b);
      label(ctx, 'n=' + b.total + '　H=' + fmt(ent, 2), barX + barW - 4, yy + 12, C.fg,
        { size: 9, align: 'right' });
    });
    /* 图例 */
    label(ctx, '色块 = 下一步去哪个位置（越亮越靠右）', x + 10, y + h - 8, C.axis, { size: 9 });
    void wide;
  }

  /* 先跑一小批，打开就有东西看 */
  runBatch(40);
  syncReadout();
  syncPlay();
  draw();
  cv.redraw = draw;

  return {
    slidersBox: sliders.box,
    destroy() {
      playing = false;
      if (raf != null) cancelAnimationFrame(raf);
      raf = null;
      cv.redraw = null;
    },
  };
}
