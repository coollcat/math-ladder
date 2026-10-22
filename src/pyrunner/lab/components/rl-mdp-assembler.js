/* =========================================================================
 * lab 组件：rl-mdp-assembler —— 五元组的可交互装配
 * -------------------------------------------------------------------------
 * 用法（第 50 章 MDP 五元组）：
 *
 *   { "type": "rl-mdp-assembler", "title": "五元组装配", "gamma": 0.9 }
 *
 * 字段（都可省）：
 *   gamma   折扣因子 0.5..0.99，默认 0.9（装配成功后由它算折扣回报）
 *   height  画布高度，默认 540
 *
 * 演示什么：把 M=(S, A, P, R, γ) 摊成五张卡片，点卡片可以「装/拆」。
 *   · 五件齐全：下方跑一个两格仓库的采样回合，逐步列出转移与折扣回报，
 *     并给出「这一回合的 G」——可见 γ 怎么把远期奖励折小。
 *   · 缺哪件：立刻说出缺它的后果（缺 R 就没有优化目标，缺 P 就只能采样，
 *     缺 γ 就无从比较无穷期回报…），而不是笼统报错。
 * 状态机：点卡片切换装/拆；「重置」恢复五件齐全；γ 由滑块控制。
 * 取舍：用最小的库存 MDP 做演示，转移表与奖励表就写死在代码里并在屏幕上
 * 摊开——学生看到的是「五件东西如何各司其职」，不是算法。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, mergeSpec, buildToolbar, buildReadout,
  mkBtn, label, clamp, fmt, clearBg, onScreen, mulberry32,
} from '../core.js';
import { fillRound, caption, colorRGBA, strokeRound, chip, dot } from './rl-common.js';

const BASE = [
  { name: 'gamma', label: '折扣因子 γ', min: 0.5, max: 0.99, step: 0.01, value: 0.9 },
];

const PARTS = [
  { id: 'S', sym: 'S', name: '状态集', what: '库存为 0 / 1 / 2', miss: '没有状态，就没有价值表的行——V(s) 无从谈起，转移核也不知道从哪儿出发。' },
  { id: 'A', sym: 'A', name: '动作集', what: '补货 0 件 / 1 件 / 2 件', miss: '没有动作，策略就没有可选项，Q 表没有列——决策退化成「观察」。' },
  { id: 'P', sym: 'P', name: '转移核', what: '补货后需求 0/1/2 等概率', miss: '不知道 P：只能从数据里采（模型无关方法），动态规划这一步就断了。' },
  { id: 'R', sym: 'R', name: '奖励函数', what: '−补货成本 − 缺货罚分', miss: '没有奖励就没有优化目标：所有策略「一样好」，学习失去方向。' },
  { id: 'γ', sym: 'γ', name: '折扣因子', what: '未来奖励折算到现在', miss: '没有 γ，无穷期回报可能发散，两个策略的总分都成了 +∞，无法比较。' },
];

export default function render(host, spec) {
  const H = clamp(spec.height || 540, 380, 940);
  let gamma = clamp(typeof spec.gamma === 'number' ? spec.gamma : 0.9, 0.5, 0.99);
  let on = { S: true, A: true, P: true, R: true, 'γ': true };
  let rng = mulberry32(50);
  let episode = [];
  let G = 0;
  let playing = false;
  let acc = 0;
  let t = 0;
  let selected = 'S';

  const reduced = !!(window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const cv = setupCanvas(host, H);
  const sliders = buildSliders({ sliders: mergeSpec(BASE, spec) }, (st) => {
    gamma = st.gamma;
    resetEpisode();
    syncReadout();
    draw();
  });

  const ro = buildReadout({
    '已装入': '5 / 5',
    '状态': '可以开始',
    '本回合步数': '0',
    '本回合折扣回报 G': '—',
    '策略': '固定规则：不满就补',
  });
  host.appendChild(ro.box);

  const bRun = mkBtn('跑一回合 ▶');
  const bPlay = mkBtn(reduced ? '减少动效' : '播放');
  const bReset = mkBtn('重置装配');
  bPlay.disabled = reduced;
  host.appendChild(buildToolbar(bRun, bPlay, bReset));

  const hint = document.createElement('div');
  hint.className = 'ml-lab__hint';
  hint.textContent = '点上面任意一张卡片可以「拆掉」它，看缺了这件东西会坏在哪里；再点一次装回去。';
  host.appendChild(hint);

  function allOn() { return PARTS.every((p) => on[p.id]); }

  /* ---- 两格库存 MDP 的一回合 ---- */
  function resetEpisode() {
    episode = [];
    G = 0;
    t = 0;
    rng = mulberry32(50);
  }

  function stepOnce() {
    if (!allOn()) return;
    if (episode.length >= 10) { playing = false; syncPlay(); return; }
    const stock = episode.length ? episode[episode.length - 1].next : 1;
    /* 固定策略：不满仓就补，补到满 */
    const order = stock < 2 ? 2 - stock : 0;
    const afterOrder = Math.min(2, stock + order);
    const demand = Math.floor(rng() * 3);
    const next = Math.max(0, afterOrder - demand);
    const reward = -order - (next === 0 ? 2 : 0);
    episode.push({ stock, order, afterOrder, demand, next, reward });
    G += Math.pow(gamma, episode.length - 1) * reward;
    t += 1;
    syncReadout();
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
      while (acc >= 0.5 && playing) {
        acc -= 0.5;
        stepOnce();
        if (episode.length >= 10) { playing = false; syncPlay(); }
      }
    }
    draw();
    if (playing) raf = requestAnimationFrame(tick);
  }
  onScreen(host, (v) => {
    visible = v;
    if (!v && raf != null) { cancelAnimationFrame(raf); raf = null; } else if (v && playing) ensure();
  });

  function syncPlay() { bPlay.textContent = reduced ? '减少动效' : (playing ? '暂停' : '播放'); }

  bRun.addEventListener('click', () => {
    playing = false;
    syncPlay();
    if (!allOn()) return;
    if (episode.length >= 10) resetEpisode();
    for (let i = 0; i < 4 && episode.length < 10; i += 1) stepOnce();
    draw();
    syncReadout();
  });
  bPlay.addEventListener('click', () => {
    if (reduced || !allOn()) return;
    if (episode.length >= 10) resetEpisode();
    playing = !playing;
    acc = 0;
    syncPlay();
    ensure();
  });
  bReset.addEventListener('click', () => {
    PARTS.forEach((p) => { on[p.id] = true; });
    selected = 'S';
    playing = false;
    resetEpisode();
    syncPlay();
    syncReadout();
    draw();
  });

  /* 点卡片 = 装/拆 */
  cv.canvas.addEventListener('pointerdown', (ev) => {
    const rect = cv.canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (cv.canvas._W / (rect.width || 1));
    const y = (ev.clientY - rect.top) * (cv.canvas._H / (rect.height || 1));
    const hit = geo.cards.find((c) => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h);
    if (!hit) return;
    selected = hit.id;
    on[hit.id] = !on[hit.id];
    if (!allOn()) { playing = false; resetEpisode(); syncPlay(); }
    syncReadout();
    draw();
  });

  function syncReadout() {
    const cnt = PARTS.filter((p) => on[p.id]).length;
    ro.set('已装入', cnt + ' / 5');
    ro.set('状态', allOn() ? '完整 MDP，可以跑' : '不是合法 MDP：' + PARTS.filter((p) => !on[p.id]).map((p) => p.name).join('、') + ' 缺失');
    ro.set('本回合步数', String(episode.length) + ' / 10');
    ro.set('本回合折扣回报 G', episode.length ? fmt(G, 3) : '—');
  }

  /* ---- 绘制 ---- */
  const geo = { cards: [] };

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const Hh = cv.H;
    clearBg(ctx, W, Hh, C);

    label(ctx, 'M = (S, A, P, R, γ)：五件各管一件事，缺一件就断一环',
      14, 20, C.fg, { size: 12.5, weight: 700 });
    label(ctx, '点卡片 = 装上 / 拆掉　当前 γ = ' + fmt(gamma, 2)
      + '　演示环境：两格仓库（库存 0/1/2，需求 0/1/2 等概率，补货 1 件花 1 分，缺货罚 2 分）',
      14, 38, C.axis, { size: 10.5 });

    /* 卡片 */
    geo.cards = [];
    const wide = W >= 720;
    const cols = wide ? 5 : 2;
    const pad = 14;
    const gap = 8;
    const cw = (W - pad * 2 - gap * (cols - 1)) / cols;
    const ch = 88;
    PARTS.forEach((p, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const x = pad + c * (cw + gap);
      const y = 52 + r * (ch + gap);
      geo.cards.push({ id: p.id, x, y, w: cw, h: ch });
      const isOn = on[p.id];
      const isSel = selected === p.id;
      fillRound(ctx, x, y, cw, ch, 9,
        isOn ? colorRGBA(C.accent, C.dark ? 0.22 : 0.13) : colorRGBA(C.named('red'), 0.10));
      strokeRound(ctx, x + 0.5, y + 0.5, cw - 1, ch - 1, 9,
        isOn ? (isSel ? C.fg : C.accent) : C.named('red'), isSel ? 2 : 1.2);
      label(ctx, p.sym + '  ' + p.name, x + 9, y + 20, isOn ? C.fg : C.named('red'),
        { size: 11.5, weight: 700 });
      label(ctx, isOn ? p.what : '已拆掉', x + 9, y + 38, C.axis, { size: 9.5 });
      if (!isOn) {
        const words = p.miss;
        const maxCh = Math.max(9, Math.floor((cw - 18) / 10.4));
        let rest = words;
        let line = 0;
        while (rest && line < 3) {
          const cut = rest.length > maxCh ? maxCh : rest.length;
          label(ctx, rest.slice(0, cut), x + 9, y + 54 + line * 12, C.named('red'), { size: 9.2 });
          rest = rest.slice(cut);
          line += 1;
        }
      } else {
        chip(ctx, '✓ 已装入', x + cw - 32, y + 12, C, { size: 8.5, padX: 4, height: 13,
          fill: colorRGBA(C.named('green'), 0.22), color: C.named('green') });
      }
    });

    const afterCards = 52 + Math.ceil(PARTS.length / cols) * (ch + gap) + 6;

    /* 转移表（只有 P 在才有意义） */
    const ty = afterCards + 6;
    drawTable(ctx, C, W, ty);

    /* 回合记录 */
    const ry = ty + 92;
    drawEpisode(ctx, C, W, ry);

    /* 底部结论 */
    const by = Math.min(ry + 108, Hh - 34);
    const cnt = PARTS.filter((p) => on[p.id]).length;
    fillRound(ctx, pad, by - 8, W - pad * 2, 26, 6,
      colorRGBA(cnt === 5 ? C.named('green') : C.named('red'), 0.12));
    label(ctx, cnt === 5
      ? '五件齐全：这就是一个 Markov 决策过程。下一步（回报与折扣）才有意义。'
      : '缺 ' + (5 - cnt) + ' 件：此时它还不是 MDP——先把缺的那件补上。',
    pad + 9, by + 9, C.fg, { size: 10.5, weight: 600 });
    void Hh;
    void dot;
  }

  function drawTable(ctx, C, W, y) {
    const pad = 14;
    caption(ctx, '模型摊开看：P（需求等概率）与 R（成本 − 缺货罚）', pad, y, C);
    if (!on.P || !on.R) {
      label(ctx, on.P ? 'R 已拆掉：这张表的右列没有意义——没有奖励，转移再清楚也不知道该往哪走。'
        : 'P 已拆掉：不知道需求分布，这张转移表就只剩历史经验（要采样估计）。',
      pad + 4, y + 20, C.named('red'), { size: 10.5 });
      return;
    }
    const rows = [
      ['补 0 件（满仓）', '需求 0/1/2：→2, →1, →0', 'r = 0 / 0 / −2'],
      ['补 1 件', '→2, →2, →1', 'r = −1 / −1 / −1'],
      ['补 2 件（空仓）', '→2, →1, →0', 'r = −2 / −2 / −4'],
    ];
    const rowH = 17;
    fillRound(ctx, pad, y + 6, W - pad * 2, rows.length * rowH + 10, 7,
      colorRGBA(C.fg, C.dark ? 0.05 : 0.03, [28, 30, 33]));
    rows.forEach((row, i) => {
      const yy = y + 22 + i * rowH;
      label(ctx, row[0], pad + 8, yy, C.fg, { size: 10, weight: 600 });
      label(ctx, row[1], pad + 118, yy, C.axis, { size: 10 });
      label(ctx, row[2], pad + 300, yy, C.axis, { size: 10 });
    });
  }

  function drawEpisode(ctx, C, W, y) {
    const pad = 14;
    caption(ctx, '一回合的记录：γ 只在算 G 的时候出现，不进转移也不进奖励', pad, y, C);
    if (!allOn()) {
      label(ctx, '装配不完整，不生成回合。', pad + 4, y + 20, C.axis, { size: 10.5 });
      return;
    }
    if (!episode.length) {
      label(ctx, '点「跑一回合 ▶」：每步 = 补货 → 需求抽样 → 结算奖励。', pad + 4, y + 20, C.fg, { size: 10.5 });
      return;
    }
    const rowH = Math.min(18, 150 / episode.length);
    episode.forEach((it, i) => {
      const yy = y + 18 + i * rowH;
      const w = Math.pow(gamma, i);
      label(ctx, 't=' + i, pad + 4, yy, C.axis, { size: 9.5 });
      label(ctx, '库存 ' + it.stock + ' → 补 ' + it.order + ' → ' + it.afterOrder
        + ' → 需求 ' + it.demand + ' → ' + it.next, pad + 40, yy, C.fg, { size: 10 });
      label(ctx, 'r = ' + fmt(it.reward, 0), pad + 300, yy, it.reward < 0 ? C.named('red') : C.named('green'),
        { size: 10, weight: 600 });
      label(ctx, 'γ^' + i + ' = ' + fmt(w, 3) + '　折后 ' + fmt(w * it.reward, 3),
        pad + 360, yy, C.axis, { size: 9.5 });
    });
    const last = y + 18 + episode.length * rowH;
    label(ctx, 'G = Σ γ^t · r_t = ' + fmt(G, 3) + '　（γ = ' + fmt(gamma, 2)
      + '：越靠后的奖励被折得越小）', pad + 4, last + 10, C.named('teal'), { size: 10.5, weight: 700 });
  }

  resetEpisode();
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
