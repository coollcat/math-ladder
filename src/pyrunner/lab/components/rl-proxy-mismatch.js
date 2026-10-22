/* =========================================================================
 * lab 组件：rl-proxy-mismatch —— 代理奖励与真实目标的错位
 * -------------------------------------------------------------------------
 * 用法（第 50 章 奖励设计与奖励 hacking）：
 *
 *   { "type": "rl-proxy-mismatch", "title": "代理分 vs 真实效用", "wViolation": 0.01 }
 *
 * 字段（都可省）：
 *   wViolation  代理分里对违规的惩罚系数 0..0.5，默认 0.01
 *   wQuality    真实效用里对质量的权重 0..1，默认 1.0（点击权重固定 0.2）
 *   height      画布高度，默认 520
 *
 * 演示什么：四条候选策略（点得多少、质量好坏、违不违规）并排。
 *   · 左图：代理分（训练真正在最大化的那个数）；
 *   · 右图：真实效用（人真正在意的那个数）；
 *   · 中间一条连线把「代理分第一」与「效用第一」各自的冠军连起来。
 *     两者不是同一个策略时，连线会交叉成一把剪刀——那就是 specification
 *     gaming 的形状。
 *   · 拖两个滑块：惩罚系数一升，代理分的排序会变，冠军可能从「极端」跳回
 *     「平衡」；连线随之解开。
 *   · 「升级成约束 MDP」按钮：把违规当成硬约束（超标直接判负），
 *     演示「约束」与「加权」两种写法的差别。
 * 取舍：数字来自本章 Python 实验里那张候选表，但滑块可调权重，所以课文里
 * 不要写成「固定输出某个数」。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, mergeSpec, buildToolbar, buildReadout,
  mkBtn, label, clamp, fmt, clearBg, setSliderRow,
} from '../core.js';
import { fillRound, caption, colorRGBA, strokeRound, chip, dashedLine, dot } from './rl-common.js';

const BASE = [
  { name: 'wViolation', label: '违规惩罚系数', min: 0, max: 0.5, step: 0.01, value: 0.01 },
  { name: 'wQuality', label: '质量权重', min: 0, max: 1, step: 0.05, value: 1 },
];

/* 名称、点击率、停留质量、违规率 —— 与课文 Python 实验同一张表 */
const CAND = [
  { name: '朴素', clicks: 0.90, quality: 0.20, violation: 0.30 },
  { name: '平衡', clicks: 0.65, quality: 0.80, violation: 0.02 },
  { name: '保守', clicks: 0.35, quality: 0.85, violation: 0.00 },
  { name: '极端', clicks: 1.00, quality: 0.05, violation: 0.60 },
];

export default function render(host, spec) {
  const H = clamp(spec.height || 520, 360, 940);
  let wv = clamp(typeof spec.wViolation === 'number' ? spec.wViolation : 0.01, 0, 0.5);
  let wq = clamp(typeof spec.wQuality === 'number' ? spec.wQuality : 1, 0, 1);
  let hard = !!spec.hardConstraint;
  let maxViol = 0.1;

  const cv = setupCanvas(host, H);
  const sliders = buildSliders({ sliders: mergeSpec(BASE, spec) }, (st) => {
    wv = st.wViolation;
    wq = st.wQuality;
    syncReadout();
    draw();
  });

  const ro = buildReadout({
    '代理分冠军': '—',
    '真实效用冠军': '—',
    '是否错位': '—',
    '差距（效用）': '—',
    '约束界限': '违规率 ≤ 0.10',
  });
  host.appendChild(ro.box);

  const bHard = mkBtn('切换：加权 ↔ 硬约束');
  const bMax = mkBtn('惩罚拉满');
  const bReset = mkBtn('重置');
  host.appendChild(buildToolbar(bHard, bMax, bReset));

  const hint = document.createElement('div');
  hint.className = 'ml-lab__hint';
  hint.textContent = '左边是训练在最大化的数，右边是人真正在意的数。两个冠军不是同一个策略时，连线会拧成剪刀。';
  host.appendChild(hint);

  function proxyOf(c) {
    if (hard && c.violation > maxViol) return -999;       /* 硬约束：直接判负 */
    return c.clicks - wv * c.violation;
  }
  function utilOf(c) {
    return 0.2 * c.clicks + wq * c.quality - 5 * c.violation;
  }

  function rowsNow() {
    return CAND.map((c) => ({ ...c, proxy: proxyOf(c), util: utilOf(c) }));
  }

  function syncReadout() {
    const rows = rowsNow();
    const bp = rows.reduce((a, b) => (b.proxy > a.proxy ? b : a));
    const bu = rows.reduce((a, b) => (b.util > a.util ? b : a));
    ro.set('代理分冠军', bp.name + '（' + fmt(bp.proxy, 3) + '）');
    ro.set('真实效用冠军', bu.name + '（' + fmt(bu.util, 3) + '）');
    ro.set('是否错位', bp.name === bu.name ? '没有：两个冠军一致'
      : '错位：代理分选了「' + bp.name + '」，效用却要「' + bu.name + '」');
    ro.set('差距（效用）', fmt(bu.util - bp.util, 3) + '　（照代理分走，会比最优少这么多效用）');
    ro.set('约束界限', hard ? '硬约束生效：违规率 > ' + fmt(maxViol, 2) + ' 直接判负' : '未启用（违规只按系数扣分）');
  }

  bHard.addEventListener('click', () => { hard = !hard; syncReadout(); draw(); });
  bMax.addEventListener('click', () => {
    wv = 0.5;
    setSliderRow(sliders, 0, wv, 2, 'wViolation');
    syncReadout();
    draw();
  });
  bReset.addEventListener('click', () => {
    wv = 0.01;
    wq = 1;
    hard = false;
    setSliderRow(sliders, 0, wv, 2, 'wViolation');
    setSliderRow(sliders, 1, wq, 2, 'wQuality');
    syncReadout();
    draw();
  });

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const Hh = cv.H;
    clearBg(ctx, W, Hh, C);

    const rows = rowsNow();
    label(ctx, '同一个策略，两个分数：训练在爬左边的山，人想要的是右边那座',
      14, 20, C.fg, { size: 12.5, weight: 700 });
    label(ctx, '代理分 = 点击 − ' + fmt(wv, 2) + '×违规　真实效用 = 0.2×点击 + '
      + fmt(wq, 2) + '×质量 − 5×违规' + (hard ? '　【硬约束：违规 > ' + fmt(maxViol, 2) + ' 判负】' : ''),
    14, 38, C.axis, { size: 10.5 });

    const wide = W >= 660;
    const pad = 14;
    const top = 62;
    const colW = wide ? (W - pad * 2 - 150) / 2 : W - pad * 2;
    const xL = pad;
    const xR = wide ? pad + colW + 150 : pad;
    const yR = wide ? top : top + 250;

    const bp = rows.reduce((a, b) => (b.proxy > a.proxy ? b : a));
    const bu = rows.reduce((a, b) => (b.util > a.util ? b : a));

    /* 两列柱状 */
    const pMax = Math.max(...rows.map((r) => Math.abs(r.proxy)), 0.5);
    const uMax = Math.max(...rows.map((r) => Math.abs(r.util)), 0.5);
    const barH = 34;
    const gap = wide ? 42 : 40;

    drawColumn(ctx, C, xL, top, colW, '代理分（训练目标）', rows, 'proxy', pMax, bp.name,
      C.named('orange'), barH, gap);
    drawColumn(ctx, C, xR, yR, colW, '真实效用（人的目标）', rows, 'util', uMax, bu.name,
      C.named('teal'), barH, gap);

    /* 剪刀连线：两个冠军名字相同则直线，不同则交叉 */
    if (wide) {
      const lx = xL + colW + 10;
      const rx = xR - 10;
      const yOf = (name, col, base) => {
        const i = rows.findIndex((r) => r.name === name);
        return base + 40 + i * gap + barH / 2;
      };
      const yb = top;
      const p1 = yOf(bp.name, 'L', yb);
      const p2 = yOf(bu.name, 'R', yb);
      const mid = (lx + rx) / 2;
      ctx.save();
      ctx.strokeStyle = bp.name === bu.name ? C.named('green') : C.named('red');
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(lx, p1);
      ctx.lineTo(rx, p2);
      ctx.stroke();
      ctx.restore();
      /* 标出交叉点 */
      if (bp.name !== bu.name) {
        const yL = yOf(bu.name, 'L', yb);
        dot(ctx, mid, (p1 + yL) / 2, 3, C.named('red'));
        label(ctx, '错位', mid, Math.min(p1, p2) - 8, C.named('red'), { size: 9.5, align: 'center', weight: 700 });
      }
    }

    /* 表格：把三列原始数字摊开 */
    const ty = (wide ? top : yR + 250) + 180;
    if (ty < Hh - 90) {
      caption(ctx, '候选策略的原始数字（与课文里的实验同一张表）', pad, ty, C);
      const cols = ['策略', '点击率', '质量', '违规率', '代理分', '效用'];
      const colX = [pad + 6, pad + 78, pad + 148, pad + 210, pad + 272, pad + 350];
      cols.forEach((c, i) => label(ctx, c, colX[i], ty + 18, C.axis, { size: 9.5, weight: 700 }));
      rows.forEach((r, i) => {
        const yy = ty + 34 + i * 16;
        const isP = r.name === bp.name;
        const isU = r.name === bu.name;
        label(ctx, r.name, colX[0], yy, C.fg, { size: 10, weight: isP || isU ? 700 : 400 });
        label(ctx, fmt(r.clicks, 2), colX[1], yy, C.axis, { size: 10 });
        label(ctx, fmt(r.quality, 2), colX[2], yy, C.axis, { size: 10 });
        label(ctx, fmt(r.violation, 2), colX[3], yy, r.violation > maxViol ? C.bad : C.axis, { size: 10 });
        label(ctx, fmt(r.proxy, 3), colX[4], yy, isP ? C.named('orange') : C.axis,
          { size: 10, weight: isP ? 700 : 400 });
        label(ctx, fmt(r.util, 3), colX[5], yy, isU ? C.named('teal') : C.axis,
          { size: 10, weight: isU ? 700 : 400 });
      });
      const ny = ty + 34 + rows.length * 16 + 8;
      label(ctx, bp.name === bu.name
        ? '此时代理分与真实目标指向同一个策略：奖励设计是「对齐」的。'
        : '代理分把「' + bp.name + '」推成冠军，但它的违规率是 ' + fmt(bp.violation, 2)
          + '：分数涨了，真实效用反而被违规扣掉。这就是 reward hacking。',
      pad, ny, bp.name === bu.name ? C.named('green') : C.named('red'), { size: 10.5, weight: 600 });
    }

    if (Hh > ty + 130) {
      chip(ctx, '把惩罚系数往上推：代理分的排序会重排——「加权」能缓解错位，但它仍然只是一个数，'
        + '并不能保证违规率真的低于你想要的那条线。',
      pad + 2, Math.min(Hh - 20, ty + 128), C, { size: 9, padX: 5, height: 15, align: 'left' });
    }
    void strokeRound;
    void dashedLine;
  }

  function drawColumn(ctx, C, x, y, w, title, rows, key, maxV, champ, color, barH, gap) {
    label(ctx, title, x, y, C.fg, { size: 11.5, weight: 700 });
    rows.forEach((r, i) => {
      const yy = y + 22 + i * gap;
      const isChamp = r.name === champ;
      const v = r[key];
      const zeroX = x + 78;
      const barMaxW = Math.max(w - 90, 40);
      const bw = (Math.abs(v) / maxV) * barMaxW;
      label(ctx, r.name, x, yy + barH / 2 + 4, isChamp ? C.fg : C.axis,
        { size: 10, weight: isChamp ? 700 : 400 });
      fillRound(ctx, zeroX, yy, Math.max(bw, 2), barH, 4,
        isChamp ? color : colorRGBA(color, 0.42));
      if (isChamp) strokeRound(ctx, zeroX - 1, yy - 1, Math.max(bw, 2) + 2, barH + 2, 5, C.fg, 1.6);
      label(ctx, (v < -100 ? '判负' : fmt(v, 3)), zeroX + Math.max(bw, 2) + 6, yy + barH / 2 + 4,
        isChamp ? C.fg : C.axis, { size: 10, weight: isChamp ? 700 : 400 });
      if (isChamp) {
        chip(ctx, '冠军', x + w - 10, yy + barH / 2, C, { size: 8.5, padX: 4, height: 13,
          fill: colorRGBA(color, 0.25) });
      }
    });
  }

  syncReadout();
  draw();
  cv.redraw = draw;

  return {
    slidersBox: sliders.box,
    destroy() { cv.redraw = null; },
  };
}
