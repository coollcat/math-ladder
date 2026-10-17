/* 注意力三幕流水线：查询扫键 → softmax 分账 → 按权重汇总 Value。

   契约：
   { "type": "attention-pipeline", "temperature": 1, "keyScale": 1 }

   专门消除“投影长度就是点积”的误解：点积模式受键长影响，余弦模式只比较
   方向。两种分数都会经过同一套 softmax 与 Value 加权流程。 */

import {
  themeColors, buildSliders, mergeSpec, buildSegmented, buildReadout,
  label, fmt, clamp, arrow, clearBg,
} from '../core.js';
import { makeStage } from './algebra-stage.js';

const BASE = [
  { name: 'temperature', label: '温度 T', min: 0.25, max: 3, step: 0.05, value: 1 },
  { name: 'keyScale', label: '“华为”键长', min: 0.35, max: 2, step: 0.05, value: 1 },
];

const Q = [1, 2];
const TOKENS = [
  { word: '华为', k: [0.5, 2.5], v: [0, 1], color: 'orange' },
  { word: '苹果', k: [2, 1], v: [1, 1], color: 'green' },
];

function scaledKey(idx, scale) {
  const k = TOKENS[idx].k;
  if (idx !== 0) return k.slice();
  const n = Math.hypot(k[0], k[1]) || 1;
  return [k[0] * scale, k[1] * scale];
}

function scoreOf(k, mode) {
  const dot = Q[0] * k[0] + Q[1] * k[1];
  if (mode === 'cos') {
    const nq = Math.hypot(Q[0], Q[1]);
    const nk = Math.hypot(k[0], k[1]) || 1;
    return dot / (nq * nk);
  }
  return dot;
}

function softmax(xs, T) {
  const m = Math.max(...xs);
  const ex = xs.map((x) => Math.exp((x - m) / Math.max(T, 1e-4)));
  const sum = ex.reduce((a, b) => a + b, 0);
  return ex.map((x) => x / sum);
}

export default function render(host, spec) {
  let mode = spec.mode === 'cos' ? 'cos' : 'dot';
  const sliders = buildSliders(
    { sliders: mergeSpec(BASE, spec) },
    () => st.redraw(),
  );
  const seg = buildSegmented(
    [
      { label: '点积 q·k', value: 'dot' },
      { label: '余弦 cosθ', value: 'cos' },
    ],
    mode,
    (v) => {
      mode = v;
      st.redraw();
    },
  );
  host.appendChild(seg);
  const ro = buildReadout({
    '匹配分数': '—',
    'attention 权重': '—',
    '输出向量': '—',
  });
  host.appendChild(ro.box);

  const st = makeStage(host, {
    height: 360,
    aspect: null,
    scenes: [
      {
        caption: '第一幕：同一个“它”派出查询 q，两个候选词各自提供键 k。先别急着归一化，先让查询去扫每把键。',
        dur: 3.4,
      },
      {
        caption: '第二幕：点积同时看方向和长度；切到余弦模式，只比较方向。拉长“华为”的键：点积改变，余弦不变。',
        dur: 4.2,
      },
      {
        caption: '第三幕：softmax 把原始分数变成总和为 1 的注意力配比。温度越高，分数差被压平，注意力越分散。',
        dur: 3.8,
      },
      {
        caption: '第四幕：按权重抄录 Value。真正进入下一层的是加权后的向量，不是“注意力百分比”本身。',
        dur: 4.0,
      },
    ],
    draw({ ctx, W, H, C, i, t }) {
      const TC = themeColors();
      clearBg(ctx, W, H, C);
      const keys = TOKENS.map((_, idx) => scaledKey(idx, sliders.state.keyScale));
      const scores = keys.map((k) => scoreOf(k, mode));
      const weights = softmax(scores, sliders.state.temperature);
      const out = [0, 0];
      TOKENS.forEach((tok, idx) => {
        out[0] += weights[idx] * tok.v[0];
        out[1] += weights[idx] * tok.v[1];
      });

      /* 窄屏：三张卡横排、几何与分数条纵向堆叠。并排布局在 375px 下
         会把“Query”和键标签同时裁掉，宁可牺牲装饰也不能牺牲可读性。 */
      if (W < 520) {
        const gap = 6;
        const cw = (W - 24 - gap * 2) / 3;
        const cards = [
          { label: '它 q', color: 'blue' },
          { label: '华为 k', color: 'orange' },
          { label: '苹果 k', color: 'green' },
        ];
        cards.forEach((item, idx) => {
          const x = 12 + idx * (cw + gap);
          ctx.fillStyle = C.named(item.color);
          ctx.fillRect(x, 18, cw, 34);
          ctx.strokeStyle = C.bg;
          ctx.strokeRect(x, 18, cw, 34);
          label(ctx, item.label, x + cw / 2, 40, C.bg, {
            size: 11,
            weight: 700,
            align: 'center',
          });
        });

        const ox = 38;
        const oy = 176;
        const gscale = Math.min((W * 0.42) / 3.4, 68);
        const map = (v) => [ox + v[0] * gscale, oy - v[1] * gscale];
        ctx.strokeStyle = C.grid;
        ctx.beginPath();
        ctx.moveTo(ox, 82);
        ctx.lineTo(ox, oy);
        ctx.lineTo(ox + W * 0.41, oy);
        ctx.stroke();
        const qp = map(Q);
        arrow(ctx, ox, oy, qp[0], qp[1], C.named('blue'), 2.4, 7);
        label(ctx, 'q', qp[0] + 5, qp[1] - 4, C.named('blue'), { size: 10.5, weight: 700 });
        keys.forEach((k, idx) => {
          const kp = map(k);
          const col = C.named(TOKENS[idx].color);
          arrow(ctx, ox, oy, kp[0], kp[1], col, 2, 6);
          label(ctx, 'k' + (idx + 1), kp[0] + 4, kp[1] - 3, col, {
            size: 10,
            weight: 700,
          });
        });
        label(ctx, mode === 'dot' ? '点积 = 键长 × 投影' : '余弦只看方向', 12, 92, C.axis, {
          size: 9.5,
          weight: 600,
        });

        const rx = W * 0.50;
        const rw = W - rx - 12;
        const scoreMax = Math.max(1e-6, ...scores.map((s) => Math.abs(s)));
        label(ctx, i >= 2 ? 'attention 权重' : '匹配分数', rx, 94, C.fg, {
          size: 10,
          weight: 700,
        });
        TOKENS.forEach((tok, idx) => {
          const y = 108 + idx * 42;
          const show = i >= 2 ? weights[idx] : scores[idx] / scoreMax;
          const val = i >= 2 ? weights[idx] : scores[idx];
          ctx.fillStyle = C.soft;
          ctx.fillRect(rx, y, rw, 16);
          ctx.fillStyle = C.named(tok.color);
          ctx.globalAlpha = 0.82;
          ctx.fillRect(rx, y, rw * Math.abs(show), 16);
          ctx.globalAlpha = 1;
          label(ctx, tok.word, rx, y - 3, C.fg, { size: 9.5 });
          label(ctx, fmt(val, 2), rx + rw, y - 3, C.fg, { size: 9.5, align: 'right' });
        });

        const vox = 42;
        const voy = 294;
        ctx.strokeStyle = C.grid;
        ctx.beginPath();
        ctx.moveTo(vox, 232);
        ctx.lineTo(vox, voy);
        ctx.lineTo(vox + 96, voy);
        ctx.stroke();
        label(ctx, 'Value 汇总', 12, 232, C.fg, { size: 10, weight: 700 });
        TOKENS.forEach((tok, idx) => {
          const ex = vox + tok.v[0] * 34;
          const ey = voy - tok.v[1] * 34;
          arrow(ctx, vox, voy, ex, ey, C.named(tok.color), 1.2 + 2 * weights[idx], 5);
        });
        const ox2 = vox + out[0] * 34;
        const oy2 = voy - out[1] * 34;
        arrow(ctx, vox, voy, ox2, oy2, C.named('purple'), 2.8, 8);
        label(ctx, 'output', ox2 + 5, oy2 + 3, C.named('purple'), {
          size: 10,
          weight: 700,
        });
        label(
          ctx,
          mode === 'dot' ? 's = q·k → softmax(s/T) → Σαv' : 's = cosθ → softmax(s/T) → Σαv',
          12,
          H - 13,
          C.axis,
          { size: 9, weight: 600 },
        );
        ro.set('匹配分数', scores.map((v) => fmt(v, 2)).join(' / '));
        ro.set(
          'attention 权重',
          i >= 2 ? weights.map((v) => fmt(v, 3)).join(' / ') : '下一幕再分账',
        );
        ro.set(
          '输出向量',
          i >= 3 ? '(' + fmt(out[0], 3) + ', ' + fmt(out[1], 3) + ')' : '下一幕再汇总',
        );
        return;
      }

      /* 顶部 token / query 卡。 */
      const topY = 24;
      const cardW = Math.min(112, W * 0.22);
      const qx = 18;
      const kx0 = W * 0.45;
      const kStep = Math.min(132, (W - kx0 - 16) / 2);
      const card = (x, y, text, col, active) => {
        ctx.save();
        ctx.globalAlpha = active ? 1 : 0.72;
        ctx.fillStyle = col;
        ctx.fillRect(x, y, cardW, 42);
        ctx.strokeStyle = C.bg;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, cardW, 42);
        ctx.restore();
        label(ctx, text, x + cardW / 2, y + 26, C.bg, {
          size: 12,
          weight: 700,
          align: 'center',
        });
      };
      card(qx, topY, '它 · Query q', C.named('blue'), i >= 0);
      TOKENS.forEach((tok, idx) => {
        card(kx0 + idx * kStep, topY, tok.word + ' · Key', C.named(tok.color), i >= 0);
      });

      /* 查询扫键：第一幕画动态连线。 */
      const qEnd = { x: qx + cardW, y: topY + 21 };
      TOKENS.forEach((_, idx) => {
        const end = { x: kx0 + idx * kStep, y: topY + 21 };
        const p = i > 0 ? 1 : t;
        const ex = qEnd.x + (end.x - qEnd.x) * p;
        const ey = qEnd.y + (end.y - qEnd.y) * p;
        arrow(ctx, qEnd.x, qEnd.y, ex, ey, C.grid, 1.5, 6);
      });

      /* 左侧：q 与两把 k 的几何。 */
      const geoY = 92;
      const geoW = W * 0.45;
      const geoH = 150;
      const ox = 28;
      const oy = geoY + geoH - 24;
      const scale = Math.min((geoW - 54) / 4.2, (geoH - 34) / 4.2);
      const map = (v) => [ox + v[0] * scale, oy - v[1] * scale];
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(ox, geoY + 6);
      ctx.lineTo(ox, oy);
      ctx.lineTo(ox + geoW - 18, oy);
      ctx.stroke();
      const qp = map(Q);
      arrow(ctx, ox, oy, qp[0], qp[1], C.named('blue'), 2.5, 8);
      label(ctx, 'q', qp[0] + 7, qp[1] - 5, C.named('blue'), { size: 12, weight: 700 });

      keys.forEach((k, idx) => {
        const kp = map(k);
        const col = C.named(TOKENS[idx].color);
        arrow(ctx, ox, oy, kp[0], kp[1], col, 2.2, 7);
        label(ctx, 'k' + (idx + 1), kp[0] + 6, kp[1] - 5, col, {
          size: 11,
          weight: 700,
        });
        /* 投影到 key 方向上：视觉上只画“方向匹配”部分。 */
        const vv = k[0] * k[0] + k[1] * k[1] || 1;
        const tt = (Q[0] * k[0] + Q[1] * k[1]) / vv;
        const pp = map([tt * k[0], tt * k[1]]);
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = col;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(qp[0], qp[1]);
        ctx.lineTo(pp[0], pp[1]);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(pp[0], pp[1], 3, 0, Math.PI * 2);
        ctx.fill();
      });
      label(
        ctx,
        mode === 'dot' ? '点积 = 键长 × 投影长度' : '余弦 = 只保留方向匹配',
        ox,
        geoY + 4,
        C.axis,
        { size: 10.5, weight: 600 },
      );

      /* 右侧：分数条与 softmax 权重条。 */
      const rx = W * 0.52;
      const rw = W - rx - 15;
      const scoreY = 102;
      const scoreMax = Math.max(1e-6, ...scores.map((s) => Math.abs(s)));
      label(ctx, i >= 2 ? '权重（总和 = 1）' : '匹配分数', rx, 86, C.fg, {
        size: 11,
        weight: 700,
      });
      TOKENS.forEach((tok, idx) => {
        const y = scoreY + idx * 48;
        const show = i >= 2 ? weights[idx] : scores[idx] / scoreMax;
        const val = i >= 2 ? weights[idx] : scores[idx];
        ctx.fillStyle = C.soft;
        ctx.fillRect(rx, y, rw, 18);
        ctx.fillStyle = C.named(tok.color);
        ctx.globalAlpha = 0.82;
        ctx.fillRect(rx, y, rw * Math.abs(show), 18);
        ctx.globalAlpha = 1;
        label(ctx, tok.word, rx, y - 5, C.fg, { size: 10.5 });
        label(ctx, fmt(val, 3), rx + rw, y - 5, C.fg, {
          size: 10.5,
          align: 'right',
        });
      });

      /* 底部：Value 向量按权重汇总。 */
      const valY = 232;
      const vx = 28;
      const vy = H - 32;
      const vox = vx + 15;
      const voy = valY + 70;
      const vs = 54;
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(vox, valY + 10);
      ctx.lineTo(vox, voy);
      ctx.lineTo(vox + 130, voy);
      ctx.stroke();
      label(ctx, 'Value 空间', vx, valY + 4, C.fg, { size: 11, weight: 700 });
      TOKENS.forEach((tok, idx) => {
        const ex = vox + tok.v[0] * vs;
        const ey = voy - tok.v[1] * vs;
        arrow(ctx, vox, voy, ex, ey, C.named(tok.color), 1.5 + 2 * weights[idx], 7);
      });
      const ox2 = vox + out[0] * vs;
      const oy2 = voy - out[1] * vs;
      arrow(ctx, vox, voy, ox2, oy2, C.named('purple'), 3.2, 9);
      label(ctx, 'output', ox2 + 7, oy2 + 4, C.named('purple'), {
        size: 11,
        weight: 700,
      });

      /* 公式与读数。 */
      const eq = mode === 'dot'
        ? 's_i = q·k_i'
        : 's_i = (q·k_i)/(|q||k_i|)';
      label(ctx, eq + '  →  α = softmax(s/T)  →  Σ α_i v_i', W - 14, H - 12, C.axis, {
        size: 10.5,
        align: 'right',
      });
      ro.set('匹配分数', scores.map((v) => fmt(v, 2)).join(' / '));
      ro.set(
        'attention 权重',
        i >= 2 ? weights.map((v) => fmt(v, 3)).join(' / ') : '下一幕再分账',
      );
      ro.set(
        '输出向量',
        i >= 3 ? '(' + fmt(out[0], 3) + ', ' + fmt(out[1], 3) + ')' : '下一幕再汇总',
      );
    },
  });

  return { slidersBox: sliders.box, destroy: st.stop };
}
