/* EEG 伪迹成分移除：展示“原始混合 → 估计一个成分 → 沿混合方向减回去”。

   契约：
   { "type": "eeg-ica-cleaner", "blink": 1.8 }

   这是透明的教学沙盘：混合向量先由课文给出，真实 ICA 要从数据统计地估它。
   画面重点不是把 ICA 神化成“自动找到脑区”，而是看清成分选择、投影和逆变换。 */

import {
  buildSliders, mergeSpec, buildReadout,
  label, polyline, fmt, clamp, clearBg,
} from '../core.js';
import { makeStage } from './algebra-stage.js';

const FS = 128;
const N = 384;
const BASE = [
  { name: 'blink', label: '眨眼强度', min: 0, max: 3, step: 0.1, value: 1.8 },
];
const CH = ['Fp1', 'Fp2', 'Oz'];
const MIX = [0.92, 0.64, 0.16];

function pulse(t) {
  const a = Math.exp(-(((t - 0.72) / 0.075) ** 2));
  const b = Math.exp(-(((t - 1.92) / 0.085) ** 2));
  return a + 0.82 * b;
}

function makeData(blinkAmp) {
  const brain = CH.map(() => new Float64Array(N));
  const raw = CH.map(() => new Float64Array(N));
  const comp = new Float64Array(N);
  const clean = CH.map(() => new Float64Array(N));
  const norm = MIX.reduce((s, v) => s + v * v, 0);
  for (let n = 0; n < N; n += 1) {
    const t = n / FS;
    brain[0][n] = 0.35 * Math.sin(2 * Math.PI * 10 * t + 0.1) + 0.11 * Math.sin(2 * Math.PI * 21 * t);
    brain[1][n] = 0.32 * Math.sin(2 * Math.PI * 10 * t + 0.35) + 0.10 * Math.sin(2 * Math.PI * 18 * t);
    brain[2][n] = 0.78 * Math.sin(2 * Math.PI * 10 * t + 0.8) + 0.08 * Math.sin(2 * Math.PI * 24 * t);
    const b = blinkAmp * pulse(t);
    MIX.forEach((a, ch) => {
      raw[ch][n] = brain[ch][n] + a * b;
      comp[n] += a * raw[ch][n];
    });
  }
  for (let n = 0; n < N; n += 1) comp[n] /= norm;
  MIX.forEach((a, ch) => {
    for (let n = 0; n < N; n += 1) clean[ch][n] = raw[ch][n] - a * comp[n];
  });
  return { brain, raw, comp, clean };
}

function rmsAtPulse(sig) {
  let sum = 0;
  let count = 0;
  for (let n = 0; n < N; n += 1) {
    const t = n / FS;
    if ((t > 0.6 && t < 0.85) || (t > 1.78 && t < 2.08)) {
      sum += sig[n] * sig[n];
      count += 1;
    }
  }
  return Math.sqrt(sum / Math.max(count, 1));
}

export default function render(host, spec) {
  const sliders = buildSliders(
    { sliders: mergeSpec(BASE, spec) },
    () => st.redraw(),
  );
  const ro = buildReadout({
    '眨眼段 RMS': '—',
    'α 段相关性': '—',
    '处理结论': '—',
  });
  host.appendChild(ro.box);

  const st = makeStage(host, {
    height: 360,
    aspect: null,
    scenes: [
      {
        caption: '第一幕：三路 EEG 同时记录。眨眼在额区 Fp1/Fp2 最强，却也会漏到枕区 Oz；它和 α 在时域上叠在一起。',
        dur: 3.6,
      },
      {
        caption: '第二幕：空间混合把同一眨眼源按不同权重送到各电极。ICA 要找的是一个统计独立方向；这里为了让过程透明，直接显示课文给定的混合向量。',
        dur: 4.2,
      },
      {
        caption: '第三幕：把估计成分投影回每个通道，再从原信号中减去。真正处理时，成分是不是眨眼要结合地形图、时程与事件锁定人工核验。',
        dur: 4.4,
      },
      {
        caption: '第四幕：比较处理前后的眨眼段与 α 段。干净不等于“看起来更平滑”：若把与 α 重叠的脑源一起删掉，波形会变漂亮，科学信息却丢了。',
        dur: 4.2,
      },
    ],
    draw({ ctx, W, H, C, i }) {
      clearBg(ctx, W, H, C);
      const amp = clamp(sliders.state.blink, 0, 3);
      const data = makeData(amp);
      const left = 38;
      const right = W - 12;
      const top = 30;
      const traceH = 44;
      const rowGap = 12;
      const X = (n) => left + (n / (N - 1)) * (right - left);
      const drawTrace = (sig, y, color, title, alpha) => {
        const mid = y + traceH / 2;
        const sc = traceH * 0.42 / Math.max(...Array.from(sig, Math.abs), 0.1);
        ctx.save();
        ctx.globalAlpha = alpha === undefined ? 1 : alpha;
        ctx.strokeStyle = C.grid;
        ctx.beginPath();
        ctx.moveTo(left, mid);
        ctx.lineTo(right, mid);
        ctx.stroke();
        polyline(
          ctx,
          Array.from(sig, (v, n) => [X(n), mid - v * sc]),
          color,
          1.4,
        );
        ctx.restore();
        label(ctx, title, 8, mid + 4, C.fg, { size: 10.5, weight: 700 });
      };

      const stage2 = i >= 1;
      const stage3 = i >= 2;
      const sourceSets = stage3 ? data.clean : data.raw;
      sourceSets.forEach((sig, ch) => {
        const y = top + ch * (traceH + rowGap);
        drawTrace(
          sig,
          y,
          ch === 2 ? C.named('green') : C.named('blue'),
          CH[ch],
          stage3 ? 0.95 : 1,
        );
      });

      if (stage2) {
        const y = top + 3 * (traceH + rowGap) + 4;
        drawTrace(
          data.comp,
          y,
          C.named('orange'),
          'ICA 候选',
          0.9,
        );
        label(
          ctx,
          '候选成分 ≈ 眨眼源；真实 ICA 不提供“这是眨眼”的标签',
          right,
          y - 4,
          C.axis,
          { size: 9.5, align: 'right' },
        );
      }

      const rawRms = rmsAtPulse(data.raw[0]);
      const cleanRms = rmsAtPulse(data.clean[0]);
      const corrBrain = pearson(data.brain[2], data.clean[2]);
      ro.set(
        '眨眼段 RMS',
        stage3 ? fmt(rawRms, 2) + ' → ' + fmt(cleanRms, 2) : '原始 ' + fmt(rawRms, 2),
      );
      ro.set('α 段相关性', stage3 ? fmt(corrBrain, 3) : '处理后再核对');
      ro.set('处理结论', stage3 ? '伪迹大幅下降；还要核对脑节律未被误删' : '尚未逆变换');

      label(
        ctx,
        stage3
          ? 'clean = raw − a(aᵀraw)/(aᵀa)'
          : 'raw = brain + a·blink',
        left,
        H - 12,
        C.axis,
        { size: 10.5, weight: 600 },
      );
    },
  });

  return { slidersBox: sliders.box, destroy: st.stop };
}

function pearson(a, b) {
  const n = Math.min(a.length, b.length);
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i += 1) {
    ma += a[i];
    mb += b[i];
  }
  ma /= n;
  mb /= n;
  let cov = 0;
  let va = 0;
  let vb = 0;
  for (let i = 0; i < n; i += 1) {
    const da = a[i] - ma;
    const db = b[i] - mb;
    cov += da * db;
    va += da * da;
    vb += db * db;
  }
  return cov / Math.sqrt((va || 1) * (vb || 1));
}
