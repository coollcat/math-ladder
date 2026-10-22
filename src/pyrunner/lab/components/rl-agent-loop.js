/* =========================================================================
 * lab 组件：rl-agent-loop —— 感知-动作闭环：一个时间步里到底发生了什么
 * -------------------------------------------------------------------------
 * 用法（第 50 章 Agent、Environment、State、Action 与 Reward）：
 *
 *   { "type": "rl-agent-loop", "title": "感知-动作闭环", "pLeft": 0.3 }
 *
 * 字段（都可省）：
 *   pLeft   「左」臂的成功概率 0..1，默认 0.3（右臂固定 1 − pLeft）
 *   seed    随机种子，默认 20
 *   height  画布高度，默认 470
 *
 * 演示什么：把一步拆成四个动作，逐个点亮：
 *   ① 观察 state → ② agent 选动作 → ③ environment 转移并给奖励 → ④ 回填新状态
 *   · 单步：按顺序点亮这四盏灯，并真的跑一次伯努利抽奖；
 *   · 连续：自动一步步跑，环形箭头循环流动；
 *   · 重置：清空累计奖励与记录。
 * 右栏按时间倒序列出刚才几步的 (s, a, r, s′)，强调 s′ 就是下一步的 s——
 * 闭环之所以是闭环，是因为上一格的「结果」变成下一格的「输入」。
 * 取舍：状态只有一个「待选择」，动作两选一，奖励 0/1；先把循环的骨架看清，
 * 状态转移概率的细节留给 MDP 那一课。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, mergeSpec, buildToolbar, buildReadout,
  mkBtn, label, arrow, clamp, fmt, clearBg, onScreen, mulberry32,
} from '../core.js';
import { fillRound, chip, caption, colorRGBA, strokeRound, dot } from './rl-common.js';

const BASE = [
  { name: 'pLeft', label: '左臂成功率', min: 0, max: 1, step: 0.05, value: 0.3 },
];

const PHASES = [
  { id: 0, name: '① 观察 state', detail: 'environment 把状态交给 agent（这里只有一个「待选择」）' },
  { id: 1, name: '② agent 选动作', detail: 'agent 按自己的策略在动作集里挑一个（左 / 右）' },
  { id: 2, name: '③ environment 转移 + 给奖励', detail: '环境按自己的概率规则抽奖，返回 r 与 s′' },
  { id: 3, name: '④ s′ 变成下一步的 state', detail: '闭环合上：结果就是下一轮的输入' },
];

export default function render(host, spec) {
  const H = clamp(spec.height || 470, 340, 900);
  let pLeft = clamp(typeof spec.pLeft === 'number' ? spec.pLeft : 0.3, 0, 1);
  const seed = Math.round(typeof spec.seed === 'number' ? spec.seed : 20);
  let rng = mulberry32(seed);

  let phase = -1;              /* -1 = 空闲；0..3 = 正在点亮的环节 */
  let cur = { s: '待选择', a: '—', r: 0, ns: '待选择' };
  let log = [];
  let total = 0;
  let t = 0;
  let playing = false;
  let acc = 0;
  let pulse = 0;
  let stats = { L: { n: 0, w: 0 }, R: { n: 0, w: 0 } };

  const reduced = !!(window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const cv = setupCanvas(host, H);
  const sliders = buildSliders({ sliders: mergeSpec(BASE, spec) }, (st) => {
    pLeft = st.pLeft;
    hardReset();
  });

  const ro = buildReadout({
    '当前环节': '未开始',
    '这一步的 s / a': '—',
    'r / s′': '—',
    '累计奖励': '0',
    '左 / 右 胜率（实测）': '— / —',
  });
  host.appendChild(ro.box);

  const bStep = mkBtn('走一步 ▶');
  const bPlay = mkBtn(reduced ? '减少动效' : '连续');
  const bReset = mkBtn('重置');
  bPlay.disabled = reduced;
  host.appendChild(buildToolbar(bStep, bPlay, bReset));

  const hint = document.createElement('div');
  hint.className = 'ml-lab__hint';
  hint.textContent = '每点一次「走一步」，四个环节按顺序亮一遍：注意最后一步把 s′ 交回给 state。';
  host.appendChild(hint);

  function pOf(a) { return a === '左' ? pLeft : 1 - pLeft; }

  function oneStep() {
    const a = rng() < 0.5 ? '左' : '右';
    const win = rng() < pOf(a);
    const r = win ? 1 : 0;
    cur = { s: '待选择', a, r, ns: '待选择' };
    const key = a === '左' ? 'L' : 'R';
    stats[key].n += 1;
    stats[key].w += r;
    total += r;
    t += 1;
    log.unshift({ t, a, r, p: pOf(a) });
    if (log.length > 7) log.pop();
    pulse = 1;
    syncReadout();
  }

  /* 四拍动画：0→1→2→3 点亮，然后回到 idle */
  let beat = 0;
  function tickBeat(dt) {
    if (phase < 0) return;
    beat += dt;
    const period = reduced ? 0.12 : 0.34;
    while (beat >= period && phase >= 0) {
      beat -= period;
      phase += 1;
      if (phase > 3) { phase = -1; beat = 0; }
    }
  }

  let raf = null;
  let lastT = 0;
  let visible = true;
  function needLoop() { return phase >= 0 || playing || pulse > 0; }
  function ensure() {
    if (raf == null && visible && host.isConnected) { lastT = 0; raf = requestAnimationFrame(tick); }
  }
  function tick(now) {
    raf = null;
    const dt = lastT ? Math.min((now - lastT) / 1000, 0.05) : 1 / 60;
    lastT = now;
    if (pulse > 0) pulse = Math.max(0, pulse - dt * 1.6);
    tickBeat(dt);
    if (playing && phase < 0) {
      acc += dt;
      if (acc >= 0.25) { acc = 0; oneStep(); phase = 0; beat = 0; }
    }
    draw();
    if (needLoop()) raf = requestAnimationFrame(tick);
  }
  onScreen(host, (v) => {
    visible = v;
    if (!v && raf != null) { cancelAnimationFrame(raf); raf = null; } else if (v && needLoop()) ensure();
  });

  function startStep() {
    if (phase >= 0) return;
    oneStep();
    phase = 0;
    beat = 0;
    ensure();
    draw();
    syncReadout();
  }

  function hardReset() {
    phase = -1;
    cur = { s: '待选择', a: '—', r: 0, ns: '待选择' };
    log = [];
    total = 0;
    t = 0;
    playing = false;
    pulse = 0;
    beat = 0;
    acc = 0;
    stats = { L: { n: 0, w: 0 }, R: { n: 0, w: 0 } };
    rng = mulberry32(seed);
    syncPlay();
    syncReadout();
    draw();
  }
  function syncPlay() { bPlay.textContent = reduced ? '减少动效' : (playing ? '暂停' : '连续'); }

  bStep.addEventListener('click', () => { playing = false; syncPlay(); startStep(); });
  bPlay.addEventListener('click', () => {
    if (reduced) return;
    playing = !playing;
    acc = 0;
    syncPlay();
    ensure();
  });
  bReset.addEventListener('click', () => hardReset());

  function syncReadout() {
    ro.set('当前环节', phase < 0 ? (t ? '一步已走完' : '未开始') : PHASES[phase].name);
    ro.set('这一步的 s / a', t ? cur.s + ' / ' + cur.a : '—');
    ro.set('r / s′', t ? String(cur.r) + ' / ' + cur.ns : '—');
    ro.set('累计奖励', String(total) + (t ? '（' + t + ' 步，平均 ' + fmt(total / t, 2) + '）' : ''));
    const rate = (k) => (stats[k].n ? Math.round((stats[k].w / stats[k].n) * 100) + '%（' + stats[k].n + ' 次）' : '—');
    ro.set('左 / 右 胜率（实测）', rate('L') + ' / ' + rate('R'));
  }

  /* ---- 绘制 ---- */
  const geo = { W: 0, Hh: 0 };

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const Hh = cv.H;
    clearBg(ctx, W, Hh, C);
    geo.W = W;
    geo.Hh = Hh;

    label(ctx, '一步 = 四个环节；环境转移由 environment 完成，agent 只能控制动作',
      14, 20, C.fg, { size: 12.5, weight: 700 });
    label(ctx, '左臂成功率 ' + fmt(pLeft, 2) + '　右臂成功率 ' + fmt(1 - pLeft, 2)
      + '　（右臂 = 1 − 左臂，两臂必有一臂更值得拉）',
      14, 38, C.axis, { size: 10.5 });

    const wide = W >= 640;
    const ax = wide ? 22 : 22;
    const ay = 66;
    const aw = wide ? Math.min(W * 0.34, 250) : Math.min(W - 44, 300);
    const ah = 96;
    const ex = wide ? W - aw - 22 : 22;
    const ey = wide ? ay : ay + ah + 74;
    const ew = aw;
    const eh = ah;

    /* 两个方块 */
    drawBox(ctx, C, ax, ay, aw, ah, 'agent（做决定的程序）',
      phase === 1 ? '正在选动作：' + (cur.a === '—' ? '…' : cur.a) : '策略 → 动作', phase === 1);
    drawBox(ctx, C, ex, ey, ew, eh, 'environment（规则与随机性）',
      phase === 2 ? '正在抽样：第 ' + t + ' 步' : '状态 + 动作 → 下一状态与奖励', phase === 2);

    /* 两条箭头：action（上/右）与 state,reward（下/左） */
    const midY = ay + ah / 2;
    if (wide) {
      const x0 = ax + aw;
      const x1 = ex;
      arrow(ctx, x0 + 4, midY - 14, x1 - 4, midY - 14,
        phase === 1 ? C.named('orange') : colorRGBA(C.axis, 0.7), phase === 1 ? 3 : 1.8, 9);
      label(ctx, 'action  a', (x0 + x1) / 2, midY - 22, phase === 1 ? C.named('orange') : C.axis,
        { size: 10.5, align: 'center', weight: 700 });
      arrow(ctx, x1 - 4, midY + 16, x0 + 4, midY + 16,
        phase >= 2 ? C.named('green') : colorRGBA(C.axis, 0.7), phase >= 2 ? 3 : 1.8, 9);
      label(ctx, 'state  s′　reward  r', (x0 + x1) / 2, midY + 34, phase >= 2 ? C.named('green') : C.axis,
        { size: 10.5, align: 'center', weight: 700 });
    } else {
      arrow(ctx, ax + aw / 2 + 20, ay + ah + 4, ax + aw / 2 + 20, ey - 4,
        phase === 1 ? C.named('orange') : colorRGBA(C.axis, 0.7), phase === 1 ? 3 : 1.8, 9);
      label(ctx, 'action a', ax + aw / 2 + 26, (ay + ah + ey) / 2 + 4,
        phase === 1 ? C.named('orange') : C.axis, { size: 10, weight: 700 });
      arrow(ctx, ax + aw / 2 - 30, ey - 4, ax + aw / 2 - 30, ay + ah + 4,
        phase >= 2 ? C.named('green') : colorRGBA(C.axis, 0.7), phase >= 2 ? 3 : 1.8, 9);
      label(ctx, 's′ / r', ax + aw / 2 - 36, (ay + ah + ey) / 2 + 4,
        phase >= 2 ? C.named('green') : C.axis, { size: 10, align: 'right', weight: 700 });
    }

    /* 当前 s / a / r / s′ 的中转站 */
    const cx0 = wide ? ax + aw + 10 : 22;
    const cy0 = wide ? 190 : ey + eh + 26;
    const cw = wide ? Math.max(ex - (ax + aw) - 20, 150) : W - 44;
    if (wide && cw > 120) {
      fillRound(ctx, cx0, cy0, cw, 96, 8, colorRGBA(C.fg, C.dark ? 0.05 : 0.03, [28, 30, 33]));
      caption(ctx, '这一步的四个量', cx0 + 8, cy0 + 16, C);
      const rows = [
        ['s =', cur.s], ['a =', cur.a],
        ['r =', t ? String(cur.r) : '—'], ['s′ =', cur.ns],
      ];
      rows.forEach((row, i) => {
        label(ctx, row[0], cx0 + 10, cy0 + 36 + i * 15, C.axis, { size: 10 });
        label(ctx, String(row[1]), cx0 + 34, cy0 + 36 + i * 15, C.fg, { size: 10.5, weight: 600 });
      });
    }

    /* 四盏灯 */
    const ly = wide ? 300 : cy0 + 104;
    drawPhases(ctx, C, 14, ly, W - 28);

    /* 记录表 */
    const ry = wide ? ly + 116 : ly + 116;
    drawLog(ctx, C, 14, ry, W - 28);
    void Hh;
  }

  function drawBox(ctx, C, x, y, w, h, title, sub, active) {
    fillRound(ctx, x, y, w, h, 10, active ? colorRGBA(C.accent, C.dark ? 0.26 : 0.15) : colorRGBA(C.fg, C.dark ? 0.06 : 0.035, [28, 30, 33]));
    strokeRound(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 10, active ? C.accent : C.grid, active ? 2 : 1);
    label(ctx, title, x + 12, y + 24, C.fg, { size: 12, weight: 700 });
    const words = String(sub);
    label(ctx, words, x + 12, y + 48, C.axis, { size: 10 });
    if (active && phase === 2) {
      label(ctx, '伯努利抽奖：p = ' + fmt(cur.a === '左' ? pLeft : (cur.a === '右' ? 1 - pLeft : 0.5), 2),
        x + 12, y + 68, C.named('teal'), { size: 10, weight: 600 });
    }
    if (active && phase === 1) {
      label(ctx, '动作集 {左, 右}', x + 12, y + 68, C.named('orange'), { size: 10, weight: 600 });
    }
  }

  function drawPhases(ctx, C, x, y, w) {
    caption(ctx, '一个时间步的四个环节（点亮 = 正在发生）', x, y, C);
    const n = PHASES.length;
    const gap = 10;
    const cw = (w - gap * (n - 1)) / n;
    PHASES.forEach((p, i) => {
      const px = x + i * (cw + gap);
      const active = phase === i;
      const done = phase > i || (phase < 0 && t > 0);
      fillRound(ctx, px, y + 10, cw, 56, 7,
        active ? colorRGBA(C.accent, C.dark ? 0.3 : 0.18)
          : (done ? colorRGBA(C.named('green'), 0.14) : colorRGBA(C.fg, C.dark ? 0.05 : 0.03, [28, 30, 33])));
      strokeRound(ctx, px + 0.5, y + 10.5, cw - 1, 55, 7, active ? C.accent : C.grid, active ? 1.8 : 1);
      label(ctx, p.name, px + 7, y + 30, active ? C.fg : C.axis, { size: 10, weight: active ? 700 : 600 });
      /* 说明折行：按宽度粗切 */
      const maxCh = Math.max(8, Math.floor(cw / 11));
      const words = p.detail;
      let rest = words;
      let line = 0;
      while (rest && line < 2) {
        const cut = rest.length > maxCh ? maxCh : rest.length;
        label(ctx, rest.slice(0, cut), px + 7, y + 46 + line * 12, C.axis, { size: 9 });
        rest = rest.slice(cut);
        line += 1;
      }
      if (i < n - 1) {
        arrow(ctx, px + cw + 1, y + 38, px + cw + gap - 1, y + 38, C.axis, 1.2, 5);
      }
    });
    /* 闭环：最后一盏灯回到第一盏 */
    if (phase === 3) {
      ctx.save();
      ctx.strokeStyle = C.named('green');
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x + w - 4, y + 66);
      ctx.lineTo(x + w - 4, y + 84);
      ctx.lineTo(x + 4, y + 84);
      ctx.lineTo(x + 4, y + 66);
      ctx.stroke();
      ctx.restore();
      label(ctx, 's′ → 下一步的 s：闭环合上', x + w / 2, y + 80, C.named('green'),
        { size: 9.5, align: 'center', weight: 600 });
    }
  }

  function drawLog(ctx, C, x, y, w) {
    caption(ctx, '最近的几步（倒序）', x, y, C);
    if (!log.length) {
      label(ctx, '还没有步。点「走一步 ▶」：先观察、再选动作、环境抽奖、结果回填。', x, y + 20, C.fg, { size: 10.5 });
      return;
    }
    const rowH = 17;
    fillRound(ctx, x, y + 8, w, Math.min(log.length, 7) * rowH + 12, 7,
      colorRGBA(C.fg, C.dark ? 0.05 : 0.03, [28, 30, 33]));
    log.slice(0, 7).forEach((it, i) => {
      const yy = y + 26 + i * rowH;
      label(ctx, 't=' + it.t, x + 10, yy, C.axis, { size: 10 });
      label(ctx, 'a=' + it.a, x + 54, yy, C.fg, { size: 10, weight: 600 });
      label(ctx, 'r=' + it.r, x + 108, yy, it.r ? C.named('green') : C.axis, { size: 10 });
      label(ctx, 'p(a 中奖)=' + fmt(it.p, 2), x + 152, yy, C.axis, { size: 10 });
      if (it.r) dot(ctx, x + w - 16, yy - 3, 2.4, C.named('green'));
    });
    if (pulse > 0.02) {
      chip(ctx, '刚记下一步', x + w - 60, y + 16, C, { size: 9, padX: 4, height: 14,
        fill: colorRGBA(C.named('green'), 0.22) });
    }
  }

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
