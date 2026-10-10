/* =========================================================================
 * lab 组件：transformer-moe-route —— MoE 门控分诊（3B1B 式分幕演示）
 * -------------------------------------------------------------------------
 * 用法（第 47 章课文 lab 围栏，fence 语言写 lab）：
 *
 *   { "type": "transformer-moe-route", "title": "一个 token 进门之后" }
 *
 * 字段（都可省略，走滑块默认）：
 *   E  专家数（4..16，默认 8）      k  每 token 上岗数（1..4，默认 2）
 *   T  softmax 温度（0.3..3，默认 1）
 *
 * 五幕动画：
 *   1. 一栋专家楼：FFN 被复印成 E 份，一个 token 报到
 *   2. router 打分：每扇门头上弹出一条对口分（logit）
 *   3. TopK 上岗：只有前 k 名开门，门内重新归一化出 g 权重
 *   4. 加权合并：输出 = Σ g_i·Expert_i(x)，箭头汇流
 *   5. 负载均衡：接诊分布 f 与「雨露均沾费」aux——一号独大就罚款
 *
 * 可拖：直接拖任一专家的分数条改它的 logit；拖到一家独大，
 *       看第 5 幕的 aux 罚款怎么涨。滑块 E / k / T 随时改结构。
 * ========================================================================= */

import {
  themeColors, buildSliders, mergeSpec, buildReadout, bindPointer,
  label, fmt, clamp, mulberry32,
} from '../core.js';
import { makeStage } from './algebra-stage.js';

const BASE = [
  { name: 'E', label: '专家数 E', min: 4, max: 16, step: 4, value: 8 },
  { name: 'k', label: '上岗数 k', min: 1, max: 4, step: 1, value: 2 },
  { name: 'T', label: '温度 T', min: 0.3, max: 3, step: 0.1, value: 1 },
];

export default function render(host, spec) {
  const sliders = buildSliders({ sliders: mergeSpec(BASE, spec) }, () => st.redraw());
  const S = () => sliders.state;
  const ro = buildReadout({
    '专家数 E': '—', '上岗 k': '—', '门控 g': '—', 'aux 罚款': '—',
  });

  /* 路由分数：确定性生成（刷新不变），拖拽可改 */
  let scores = [];
  function syncScores() {
    const E = S().E;
    if (scores.length !== E) {
      const r = mulberry32(20241217);
      scores = [];
      for (let i = 0; i < E; i += 1) scores.push(i === 0 ? 3.4 : Math.round(r() * 2.4 * 10) / 10);
    }
  }
  syncScores();

  /* 门控：TopK + 入选者内 softmax（T 缩放 logit） */
  function gating() {
    const { E, k, T } = S();
    const idx = scores.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
    const top = idx.slice(0, Math.min(k, E));
    const exps = top.map((o) => Math.exp(o.v / T));
    const sum = exps.reduce((a, b) => a + b, 0) || 1e-9;
    const gs = {};
    top.forEach((o, j) => { gs[o.i] = exps[j] / sum; });
    return { top, gs };
  }
  /* 接诊比例 f 与 aux 罚款 ∝ Σ f_i·P_i（教学口径：f 取全体 softmax 概率） */
  function balance() {
    const { E, T } = S();
    const exps = scores.map((v) => Math.exp(v / T));
    const sum = exps.reduce((a, b) => a + b, 0) || 1e-9;
    const P = exps.map((v) => v / sum);
    const aux = P.reduce((a, p) => a + p * p, 0);
    return { P, aux, uniform: 1 / E };
  }

  /* 版面：左侧专家楼 + 右侧读数面板（trim 兜底吃掉残余白边） */
  const L = { x0: 0, bw: 0, base: 0, maxh: 0, panelX: 0 };
  function layout(W, H) {
    L.panelX = W - 158;
    L.x0 = 40;
    L.bw = L.panelX - 20 - L.x0;
    L.base = H - 96;
    L.maxh = 150;
  }

  const st = makeStage(host, {
    height: 320,
    aspect: 9 / 16,
    scenes: [
      { caption: '第 1 幕：上一课的 FFN 车间被复印成 E 份，每份一位「专家」——床位随便涨，反正闲人不耗电。', dur: 3.2 },
      { caption: '第 2 幕：token 进门，router 给每位专家打一个「对口分」（logit）。', dur: 3.2 },
      { caption: '第 3 幕：只叫分数最高的 k 位上岗——先淘汰，后排名，g 权重只在幸存者之间分蛋糕。', dur: 3.8 },
      { caption: '第 4 幕：上岗者的产出按对口程度加权合并：MoE(x) = Σ g_i·Expert_i(x)。', dur: 3.6 },
      { caption: '第 5 幕：账本的另一半——接诊分布 f 与「雨露均沾费」aux。全都挤向一号专家，罚款就涨。', dur: 4.2 },
    ],
    draw({ ctx, W, H, C, i, t }) {
      const { E, k, T } = S();
      syncScores();
      layout(W, H);
      const { top, gs } = gating();
      const { P, aux, uniform } = balance();
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, H);
      const appear = (n) => (i > n ? 1 : (i < n ? 0 : t));

      label(ctx, 'E = ' + E + ' 位专家 · 每 token 上岗 k = ' + k + ' · 温度 T = ' + fmt(T, 1), 40, 26, C.fg, { size: 12, weight: 700 });

      /* ---- 专家楼 ---- */
      const slot = L.bw / E;
      const cx = (j) => L.x0 + slot * (j + 0.5);
      const topSet = new Set(top.map((o) => o.i));
      const by = L.base + 4;
      const bh = 40;
      const maxLogit = Math.max(...scores, 0.001);

      ctx.save();
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(L.x0 - 16, by + bh + 42);
      ctx.lineTo(L.panelX - 20, by + bh + 42);
      ctx.stroke();
      ctx.restore();

      for (let j = 0; j < E; j += 1) {
        const inTop = topSet.has(j);
        const dim = i >= 2 && !inTop;
        const bw2 = Math.min(slot * 0.62, 64);
        /* 专家方块 */
        ctx.save();
        ctx.globalAlpha = dim ? 0.22 : 0.95;
        ctx.fillStyle = inTop && i >= 2 ? C.named('green') : C.named('blue');
        ctx.fillRect(cx(j) - bw2 / 2, by, bw2, bh);
        ctx.strokeStyle = C.bg;
        ctx.lineWidth = 2;
        ctx.strokeRect(cx(j) - bw2 / 2, by, bw2, bh);
        ctx.restore();
        label(ctx, 'E' + (j + 1), cx(j), by + bh / 2 + 4, C.bg, { size: Math.min(11, bw2 / 3.4), weight: 700, align: 'center' });

        /* 分数条（幕 2 起生长） */
        const a2 = appear(1);
        if (a2 > 0) {
          const hgt = Math.max((scores[j] / maxLogit) * L.maxh * a2, 2);
          ctx.save();
          ctx.globalAlpha = dim ? 0.25 : 1;
          ctx.fillStyle = inTop && i >= 2 ? C.named('green') : C.accent2;
          ctx.fillRect(cx(j) - bw2 / 2, by - hgt, bw2, hgt);
          ctx.restore();
          if (a2 > 0.8) label(ctx, fmt(scores[j], 1), cx(j), by - hgt - 6, C.fg, { size: 10, align: 'center' });
        }
        /* 门控权重（幕 3 起） */
        const a3 = appear(2);
        if (a3 > 0 && inTop) {
          label(ctx, 'g=' + fmt(gs[j], 2), cx(j), by + bh + 16, C.named('green'), { size: 10.5, weight: 700, align: 'center' });
        }
        /* 接诊比例小条（幕 5 起） */
        const a5 = appear(4);
        if (a5 > 0) {
          const fw = slot * 0.6;
          ctx.save();
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = C.named('purple');
          ctx.fillRect(cx(j) - fw / 2, by + bh + 24, Math.max(fw * P[j], 1), 6);
          ctx.restore();
        }
      }

      /* token 报到点（幕 1 从左侧滑入，之后常驻） */
      const a1 = appear(0);
      if (a1 > 0) {
        const tx = L.x0 - 24 + 24 * a1;
        ctx.beginPath();
        ctx.arc(tx, by + bh / 2, 8, 0, Math.PI * 2);
        ctx.fillStyle = C.named('red');
        ctx.fill();
        ctx.strokeStyle = C.bg;
        ctx.lineWidth = 2;
        ctx.stroke();
        label(ctx, 'token', tx + 12, by + bh / 2 + 4, C.named('red'), { size: 11, weight: 600 });
      }

      /* 幕 4：输出汇流 */
      const a4 = appear(3);
      if (a4 > 0) {
        const ox = L.panelX - 190;
        const oy = by + bh / 2;
        ctx.save();
        ctx.globalAlpha = 0.4 + 0.6 * a4;
        ctx.fillStyle = C.soft;
        ctx.fillRect(ox - 44, oy - 22, 88, 44);
        ctx.strokeStyle = C.fg;
        ctx.strokeRect(ox - 44, oy - 22, 88, 44);
        ctx.restore();
        label(ctx, 'MoE 输出', ox, oy - 30, C.fg, { size: 11, weight: 700, align: 'center' });
        top.forEach((o, j) => {
          const prog = clamp(a4 * 1.4 - j * 0.2, 0, 1);
          const sx = cx(o.i);
          const ex = ox - 44 + 44 * prog;
          ctx.save();
          ctx.globalAlpha = 0.35 + 0.65 * prog;
          ctx.strokeStyle = C.named('green');
          ctx.lineWidth = 1 + 2 * gs[o.i];
          ctx.beginPath();
          ctx.moveTo(sx, by + bh / 2);
          ctx.quadraticCurveTo((sx + ex) / 2, by - 30, ex, oy);
          ctx.stroke();
          ctx.restore();
        });
        label(ctx, 'y = Σ g_i·Expert_i(x)', ox, oy + 38, C.fg, { size: 11.5, weight: 600, align: 'center' });
      }

      /* ---- 右侧读数面板 ---- */
      {
        const px0 = L.panelX;
        const pw = W - px0 - 10;
        ctx.save();
        ctx.fillStyle = C.soft;
        ctx.fillRect(px0, 20, pw, H - 96);
        ctx.strokeStyle = C.grid;
        ctx.strokeRect(px0, 20, pw, H - 96);
        ctx.restore();
        const line = (txt, yy, col, size, weight) => label(ctx, txt, px0 + 10, yy, col || C.fg, { size: size || 11.5, weight: weight || 400 });
        line('路由账单', 40, C.axis, 11);
        line('E = ' + E + '，k = ' + k, 60);
        line('T = ' + fmt(T, 1), 78);
        line('——', 94, C.grid, 11.5);
        const gt = top.map((o) => 'g' + (o.i + 1) + '=' + fmt(gs[o.i], 2)).join('  ');
        line('门控权重', 114, C.axis, 11);
        line(gt, 134, C.named('green'), 11.5, 600);
        line('——', 152, C.grid, 11.5);
        line('接诊比例 f', 172, C.axis, 11);
        line('一号专家拿走 ' + Math.round(P[0] * 100) + '%', 192, P[0] > 0.5 ? C.named('red') : C.named('purple'), 11.5, 600);
        const ratio = clamp((aux - uniform) / Math.max(1 - uniform, 1e-9), 0, 1);
        ctx.save();
        ctx.fillStyle = C.grid;
        ctx.fillRect(px0 + 10, 204, pw - 20, 8);
        ctx.fillStyle = ratio > 0.5 ? C.named('red') : C.named('purple');
        ctx.fillRect(px0 + 10, 204, Math.max((pw - 20) * ratio, 1), 8);
        ctx.restore();
        line('aux ∝ Σf·P = ' + fmt(aux, 3), 232, C.fg, 11, 600);
        line('均衡时最低 ' + fmt(uniform, 3), 250, C.axis, 10.5);
        line('——', 268, C.grid, 11.5);
        line('拖分数条，把一号', 288, C.axis, 10.5);
        line('拖成独大看罚款涨', 303, C.axis, 10.5);
        line('（单 token 演示：f 用 P', 322, C.axis, 10);
        line('   近似，训练按批统计）', 336, C.axis, 10);

        ro.set('专家数 E', String(E));
        ro.set('上岗 k', String(k));
        ro.set('门控 g', gt || '—');
        ro.set('aux 罚款', fmt(aux, 3));
      }
    },
  });

  /* 拖分数条改 logit */
  bindPointer(st.cv.canvas, {
    pick(x0, y0) {
      const E = S().E;
      const slot = L.bw / E;
      const j = Math.floor((x0 - L.x0) / slot);
      if (j < 0 || j >= E) return null;
      if (y0 < 40 || y0 > L.base + 44) return null;
      return 'e' + j;
    },
    move(id, x0, y0) {
      if (!/^e\d+$/.test(id)) return;
      const j = Number(id.slice(1));
      const maxLogit = Math.max(...scores, 0.001);
      const v = ((L.base - y0) / L.maxh) * maxLogit;
      scores[j] = clamp(Math.round(v * 10) / 10, 0, maxLogit + 0.5);
      st.redraw();
    },
  });

  host.appendChild(ro.box);
  return { slidersBox: sliders.box, destroy: st.stop };
}
