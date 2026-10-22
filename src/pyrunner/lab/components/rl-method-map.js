/* =========================================================================
 * lab 组件：rl-method-map —— 值函数 / 策略 / 模型三条路线怎么分叉
 * -------------------------------------------------------------------------
 * 用法（第 50 章 方法地图）：
 *
 *   { "type": "rl-method-map", "title": "方法地图：三条路线" }
 *
 * 字段（都可省）：
 *   need       任务特征（逗号分隔）：tabular / continuous / model / offline，
 *              默认 "tabular,model"
 *   height     画布高度，默认 520
 *
 * 演示什么：一张「问题特征 → 需要的量 → 方法家族」的三段式地图。
 *   三条主路线：
 *   · 值函数路线（表格 Q / 价值迭代 / DQN）——先学「哪一步值多少」；
 *   · 策略路线（REINFORCE / PPO）——直接调动作概率；
 *   · 模型路线（规划 / MPC / Dyna）——先学环境再在里面推演。
 *   点左侧的特征标签可以点亮/取消：地图会实时高亮「这些特征下更该走哪条线」，
 *   并把不再可行的分支画成灰虚线（例如连续动作让表格 Q 失效）。
 * 读数给出当前特征组合对应的推荐家族、以及被排除项与原因。
 * 取舍：这是一张「选择地图」，不是算法实现；它把本章前面各课的结论汇总成
 * 一张可点的图，避免学生学完一串算法却不知道该挑哪个。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildToolbar, buildReadout, mkBtn, label, clamp, fmt, clearBg,
} from '../core.js';
import { fillRound, caption, colorRGBA, strokeRound, chip, dot } from './rl-common.js';

const FEATURES = [
  { id: 'tabular', label: '状态能列成表', hint: '状态数很小，可以直接用表存 V/Q' },
  { id: 'continuous', label: '连续 / 高维动作', hint: '动作无法枚举，不能对动作取 max' },
  { id: 'model', label: '知道环境模型', hint: 'P 与 R 已知，可以在脑内推演' },
  { id: 'offline', label: '只有离线日志', hint: '不能自己采数据，只能从固定数据集学' },
  { id: 'sparse', label: '奖励很稀疏', hint: '很少拿到非零奖励，探索与 bootstrap 都要设计' },
];

const ROUTES = [
  {
    id: 'value',
    name: '值函数路线',
    color: 'teal',
    what: '先学 V(s) 或 Q(s,a)，再让策略 = argmax',
    members: ['价值迭代 / 策略迭代（模型已知）', '表格 Q-learning（可以试错）', 'DQN（状态大、动作离散）'],
    y: 0,
  },
  {
    id: 'policy',
    name: '策略路线',
    color: 'orange',
    what: '直接参数化 π(a|s)，按回报的梯度调它',
    members: ['REINFORCE（最朴素）', 'Actor-Critic / GAE（降方差）', 'PPO / TRPO（限制步长）'],
    y: 1,
  },
  {
    id: 'model',
    name: '模型路线',
    color: 'purple',
    what: '先学或已知 P、R，在模型里做规划',
    members: ['已知模型：动态规划 / 规划', 'Dyna：真实经验 + 模型想象', 'MPC：每步滚动优化'],
    y: 2,
  },
];

export default function render(host, spec) {
  const H = clamp(spec.height || 520, 360, 940);
  const parse = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean)
    .filter((x) => FEATURES.some((f) => f.id === x));
  let on = new Set(parse(spec.need === undefined ? 'tabular,model' : spec.need));
  let hover = null;
  let playing = false;
  let t = 0;

  const cv = setupCanvas(host, H);
  const ro = buildReadout({
    '当前特征': '—',
    '推荐主线': '—',
    '还可以考虑': '—',
    '被排除': '—',
    '一句话': '—',
  });
  host.appendChild(ro.box);

  const bDemo = mkBtn('切换典型组合');
  const bClear = mkBtn('全部清空');
  const bAll = mkBtn('全部点亮');
  host.appendChild(buildToolbar(bDemo, bClear, bAll));

  const hint = document.createElement('div');
  hint.className = 'ml-lab__hint';
  hint.textContent = '点左边的特征开关：地图会实时判断哪条路线还走得通、哪条被排除，以及排除的理由。';
  host.appendChild(hint);

  const COMBOS = [
    ['tabular', 'model'],
    ['continuous'],
    ['offline'],
    ['tabular', 'sparse'],
    ['continuous', 'model'],
    [],
  ];
  let comboIdx = 0;

  bDemo.addEventListener('click', () => {
    comboIdx = (comboIdx + 1) % COMBOS.length;
    on = new Set(COMBOS[comboIdx]);
    syncReadout();
    draw();
  });
  bClear.addEventListener('click', () => { on = new Set(); syncReadout(); draw(); });
  bAll.addEventListener('click', () => { on = new Set(FEATURES.map((f) => f.id)); syncReadout(); draw(); });

  /* ---- 判断规则（写在一处，读数和图共用） ---- */
  function verdict() {
    const has = (k) => on.has(k);
    const out = { value: { ok: true, why: '' }, policy: { ok: true, why: '' }, model: { ok: true, why: '' } };
    if (has('continuous')) {
      out.value.ok = false;
      out.value.why = '连续动作不能对 a 取 max：表格 Q 与 DQN 都要枚举动作';
    }
    if (!has('tabular') && !has('continuous')) {
      out.value.why = '状态大时值函数要函数近似（DQN），仍是这条线';
    }
    if (!has('model')) {
      out.model.ok = false;
      out.model.why = '模型未知：只能在 Dyna / 学到的模型里勉强用，不是纯规划';
      if (has('offline')) out.model.why = '模型未知且不能采数据：规划所需的转移核没有来源';
    }
    if (has('offline')) {
      out.policy.ok = false;
      out.policy.why = '离线数据下 on-policy 策略梯度不可用（要新数据）；得走 offline RL / 重要性修正';
    }
    return out;
  }

  function recommend() {
    const v = verdict();
    const okRoutes = ROUTES.filter((r) => v[r.id].ok).map((r) => r.name);
    const main = okRoutes[0] || '没有现成主线';
    const rest = okRoutes.slice(1);
    const bad = ROUTES.filter((r) => !v[r.id].ok).map((r) => r.name + '（' + v[r.id].why + '）');
    return { main, rest, bad, v };
  }

  function syncReadout() {
    const { main, rest, bad } = recommend();
    const names = FEATURES.filter((f) => on.has(f.id)).map((f) => f.label);
    ro.set('当前特征', names.length ? names.join('、') : '（未选）');
    ro.set('推荐主线', on.size ? main : '先选一个特征');
    ro.set('还可以考虑', rest.length ? rest.join('、') : '—');
    ro.set('被排除', bad.length ? bad.join('；') : '没有排除项');
    ro.set('一句话', on.has('continuous') ? '连续动作 → 策略路线或 actor-critic'
      : on.has('model') ? '模型已知 → 先在模型里规划，最省样本'
        : on.has('offline') ? '只有日志 → 先看离线 RL 的分布外风险'
          : '状态小又能试错 → 表格法往往最快最透明');
  }

  /* 点特征开关 / 点路线卡片 */
  cv.canvas.addEventListener('pointerdown', (ev) => {
    const rect = cv.canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (cv.canvas._W / (rect.width || 1));
    const y = (ev.clientY - rect.top) * (cv.canvas._H / (rect.height || 1));
    const f = geo.feats.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    if (f) {
      if (on.has(f.id)) on.delete(f.id); else on.add(f.id);
      syncReadout();
      draw();
    }
  });

  const geo = { feats: [] };

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const Hh = cv.H;
    clearBg(ctx, W, Hh, C);
    t += 0.01;

    label(ctx, '方法地图：先看任务长什么样，再挑路线', 14, 20, C.fg, { size: 12.5, weight: 700 });
    label(ctx, '三条主线不是互斥的：actor-critic 就是「值函数帮策略降方差」；Dyna 是「模型帮值函数省样本」。',
      14, 38, C.axis, { size: 10.5 });

    const wide = W >= 700;
    const pad = 14;

    /* 左：特征开关 */
    geo.feats = [];
    caption(ctx, '任务特征（点一下开关）', pad, 66, C);
    const fw = wide ? Math.min(W * 0.28, 210) : W - pad * 2;
    FEATURES.forEach((f, i) => {
      const x = pad;
      const y = 76 + i * 34;
      if (!wide && i > 2) return;
      geo.feats.push({ id: f.id, x, y, w: fw, h: 28 });
      const isOn = on.has(f.id);
      fillRound(ctx, x, y, fw, 28, 6,
        isOn ? colorRGBA(C.accent, C.dark ? 0.26 : 0.16) : colorRGBA(C.fg, C.dark ? 0.05 : 0.03, [28, 30, 33]));
      strokeRound(ctx, x + 0.5, y + 0.5, fw - 1, 27, 6, isOn ? C.accent : C.grid, isOn ? 1.8 : 1);
      dot(ctx, x + 13, y + 14, 4, isOn ? C.accent : colorRGBA(C.axis, 0.6));
      label(ctx, f.label, x + 24, y + 18, isOn ? C.fg : C.axis, { size: 10.5, weight: isOn ? 700 : 400 });
    });

    /* 右：三条路线 */
    const v = verdict();
    const rx = wide ? pad + fw + 26 : pad;
    const ry = wide ? 66 : 76 + 3 * 34 + 16;
    const rw = wide ? W - rx - pad : W - pad * 2;
    caption(ctx, '三条路线 + 各自的工具箱', rx, ry, C);
    ROUTES.forEach((r, i) => {
      const y = ry + 12 + i * 96;
      const ok = v[r.id].ok;
      const col = C.named(r.color);
      fillRound(ctx, rx, y, rw, 84, 8,
        ok ? colorRGBA(col, C.dark ? 0.16 : 0.09) : colorRGBA(C.fg, C.dark ? 0.04 : 0.025));
      strokeRound(ctx, rx + 0.5, y + 0.5, rw - 1, 83, 8, ok ? colorRGBA(col, 0.65) : C.grid, ok ? 1.6 : 1);
      label(ctx, r.name, rx + 10, y + 18, ok ? C.fg : C.axis, { size: 11.5, weight: 700 });
      label(ctx, ok ? r.what : '此路不通：' + v[r.id].why, rx + 10, y + 34, ok ? col : C.named('red'),
        { size: 9.8 });
      r.members.forEach((m, j) => {
        label(ctx, (ok ? '· ' : '× ') + m, rx + 16, y + 50 + j * 12, ok ? C.axis : colorRGBA(C.axis, 0.55),
          { size: 9.2 });
      });
      if (ok) {
        chip(ctx, '可选', rx + rw - 30, y + 12, C, { size: 8.5, padX: 4, height: 13,
          fill: colorRGBA(col, 0.24) });
      }
      /* 连到左侧特征的细线（示意「由特征决定」） */
      if (wide) {
        ctx.save();
        ctx.strokeStyle = ok ? colorRGBA(col, 0.4) : colorRGBA(C.axis, 0.25);
        ctx.lineWidth = 1;
        ctx.setLineDash(ok ? [] : [3, 4]);
        ctx.beginPath();
        ctx.moveTo(pad + fw, 90 + (i % 3) * 34);
        ctx.lineTo(rx, y + 42);
        ctx.stroke();
        ctx.restore();
      }
      void i;
    });

    /* 底部结论 */
    const by = ry + 12 + ROUTES.length * 96 + 4;
    if (by < Hh - 24) {
      const rec = recommend();
      fillRound(ctx, pad, by, W - pad * 2, 30, 6, colorRGBA(C.accent, C.dark ? 0.14 : 0.08));
      label(ctx, on.size
        ? '当前特征下更该走：' + rec.main + (rec.rest.length ? '（也可以：' + rec.rest.join('、') + '）' : '')
          + (rec.bad.length ? '　排除 ' + rec.bad.length + ' 条' : '')
        : '先在上面点亮至少一个特征。',
      pad + 9, by + 19, C.fg, { size: 10.5, weight: 600 });
    }
    if (!wide) {
      label(ctx, '屏幕较窄时只显示前三个特征；换宽屏可以看到完整的五条。', pad, Hh - 8, C.axis, { size: 9 });
    }
    void playing;
    void t;
    void fmt;
  }

  syncReadout();
  draw();
  cv.redraw = draw;

  return {
    slidersBox: document.createElement('div'),
    destroy() { cv.redraw = null; },
  };
}
