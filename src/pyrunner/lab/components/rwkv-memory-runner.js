/* RWKV / SSM 记忆赛跑：完整 KV 表、固定衰减状态与内容门控状态同台比较。

   契约：
   { "type": "rwkv-memory-runner", "decay": 0.82, "boost": 2.4 }

   这不是在假装“RWKV 等于某个标量漏桶”。画面只抽出一个共同问题：状态固定
   时，历史如何被压缩、哪些信息可能丢；随后用 boost 展示 token shift/gating
   为什么重要。 */

import {
  themeColors, buildSliders, mergeSpec, buildReadout,
  label, fmt, clamp, clearBg,
} from '../core.js';
import { makeStage } from './algebra-stage.js';

const BASE = [
  { name: 'decay', label: '每步保留率 a', min: 0.35, max: 0.99, step: 0.01, value: 0.82 },
  { name: 'boost', label: '关键 token 保留加成', min: 0, max: 5, step: 0.1, value: 2.4 },
];

const TOKENS = [
  { word: '合同', exact: '合同' },
  { word: '金额', exact: '42 万', key: true },
  { word: '日期', exact: '周五' },
  { word: '甲方', exact: '甲公司' },
  { word: '最终', exact: '最终' },
  { word: '确认', exact: '确认' },
];

function normalizedWeights(decay, boost, rwkv) {
  const n = TOKENS.length;
  const raw = TOKENS.map((tok, idx) => {
    const age = n - 1 - idx;
    const gate = rwkv && tok.key ? 1 + boost : 1;
    return decay ** age * gate;
  });
  const sum = raw.reduce((a, b) => a + b, 0) || 1;
  return raw.map((v) => v / sum);
}

export default function render(host, spec) {
  const sliders = buildSliders(
    { sliders: mergeSpec(BASE, spec) },
    () => st.redraw(),
  );
  const ro = buildReadout({
    '固定状态质量': '—',
    '关键 token 权重': '—',
    '精确检索': '—',
  });
  host.appendChild(ro.box);

  const st = makeStage(host, {
    height: 360,
    aspect: null,
    scenes: [
      {
        caption: '第一幕：六个 token 依次进入。现在问一个很久以后才需要的问题：第 2 个 token“金额”到底是多少？',
        dur: 3.2,
      },
      {
        caption: '第二幕：注意力保存完整 Key/Value 档案。每个历史 token 都还能被新查询精确定位，代价是 cache 随长度线性增长、配对计算随历史增长。',
        dur: 4.0,
      },
      {
        caption: '第三幕：固定状态只留一份摘要。每步乘 a 再混入新信息，越老的内容越淡；计算便宜，但精确细节可能已经被压掉。',
        dur: 4.0,
      },
      {
        caption: '第四幕：RWKV 的关键不是“只会按固定比例漏水”。token shift 与内容门控可以让重要信息获得更高保留权重，再通过可并行训练的重写保留效率。',
        dur: 4.4,
      },
      {
        caption: '第五幕：固定状态不是免费午餐。它擅长携带“总体语境”，不保证精确检索；混合架构把少量注意力层与线性循环层拼接，正是在两种能力之间折中。',
        dur: 4.0,
      },
    ],
    draw({ ctx, W, H, C, i, t }) {
      const TC = themeColors();
      clearBg(ctx, W, H, C);
      const decay = clamp(sliders.state.decay, 0.35, 0.99);
      const boost = clamp(sliders.state.boost, 0, 5);
      const fixed = normalizedWeights(decay, boost, false);
      const rwkv = normalizedWeights(decay, boost, true);

      const topY = 30;
      const cardW = Math.min(70, (W - 28) / TOKENS.length - 6);
      const step = (W - 28) / TOKENS.length;
      const barTop = 102;
      const rowH = 24;

      label(ctx, '历史 token', 14, 18, C.fg, { size: 12, weight: 700 });
      TOKENS.forEach((tok, idx) => {
        const x = 14 + idx * step + (step - cardW) / 2;
        const active = i <= 0 ? 0.35 + 0.65 * t : 1;
        ctx.save();
        ctx.globalAlpha = active;
        ctx.fillStyle = tok.key ? C.named('orange') : C.named('blue');
        ctx.fillRect(x, topY, cardW, 38);
        ctx.strokeStyle = C.bg;
        ctx.strokeRect(x, topY, cardW, 38);
        ctx.restore();
        label(ctx, tok.word, x + cardW / 2, topY + 24, C.bg, {
          size: 11,
          weight: 700,
          align: 'center',
        });
      });

      /* 三种记忆视图。 */
      const groups = [
        {
          title: '完整 KV：每个 token 留一张精确卡',
          values: TOKENS.map(() => 1 / TOKENS.length),
          color: 'green',
          show: 1,
          note: '任意旧 token 都可回查',
        },
        {
          title: '固定衰减状态：越老越淡',
          values: fixed,
          color: 'purple',
          show: 2,
          note: '总成本 O(T)，细节有损',
        },
        {
          title: 'RWKV 风格：衰减 × 内容门控',
          values: rwkv,
          color: 'orange',
          show: 3,
          note: '重要 token 可被保留得更久',
        },
      ];

      groups.forEach((g, gi) => {
        if (i < g.show) return;
        const y0 = barTop + gi * 76;
        label(ctx, g.title, 14, y0, C.named(g.color), { size: 11, weight: 700 });
        label(ctx, g.note, W - 14, y0, C.axis, { size: 9.5, align: 'right' });
        TOKENS.forEach((tok, idx) => {
          const x = 14 + idx * step + 4;
          const bw = step - 8;
          const v = g.values[idx];
          const max = Math.max(...g.values);
          const h = 24 * (v / max);
          ctx.fillStyle = C.soft;
          ctx.fillRect(x, y0 + 12, bw, 28);
          ctx.fillStyle = C.named(tok.key ? 'orange' : g.color);
          ctx.fillRect(x, y0 + 12 + (28 - h), bw, h);
          if (bw > 28) {
            label(ctx, fmt(v, 2), x + bw / 2, y0 + 54, C.axis, {
              size: 8.5,
              align: 'center',
            });
          }
        });
      });

      /* 精确问题：金额是多少？ */
      const qy = H - 82;
      const keyWeightFixed = fixed[1];
      const keyWeightRwkv = rwkv[1];
      ctx.save();
      ctx.fillStyle = C.soft;
      ctx.fillRect(14, qy, W - 28, 58);
      ctx.strokeStyle = C.grid;
      ctx.strokeRect(14, qy, W - 28, 58);
      ctx.restore();
      label(ctx, '查询：合同金额 = ?', 24, qy + 21, C.fg, { size: 12, weight: 700 });
      label(
        ctx,
        i >= 4
          ? '完整 KV：可精确取回“42 万”'
          : '看权重：关键 token 在固定状态里还剩多少？',
        24,
        qy + 43,
        i >= 4 ? C.named('green') : C.axis,
        { size: 10.5 },
      );
      const pctFixed = Math.round(keyWeightFixed * 100);
      const pctRwkv = Math.round(keyWeightRwkv * 100);
      label(ctx, '固定 ' + pctFixed + '%', W - 154, qy + 22, C.named('purple'), {
        size: 10.5,
        weight: 700,
      });
      label(ctx, '门控 ' + pctRwkv + '%', W - 72, qy + 22, C.named('orange'), {
        size: 10.5,
        weight: 700,
      });
      label(ctx, '权重 ≠ 可读文本；精确检索仍需完整 KV', W - 14, qy + 44, C.axis, {
        size: 9.5,
        align: 'right',
      });

      ro.set('固定状态质量', fmt(decay, 2) + '^age');
      ro.set(
        '关键 token 权重',
        i >= 2 ? Math.round(keyWeightFixed * 100) + '% → ' + Math.round(keyWeightRwkv * 100) + '%' : '下一幕比较',
      );
      ro.set('精确检索', i >= 1 ? '完整 KV：可' : '—');
    },
  });

  return { slidersBox: sliders.box, destroy: st.stop };
}
