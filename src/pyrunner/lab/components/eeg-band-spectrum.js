/* EEG 读谱台：同一段合成脑电在时域、频域和伪迹模式之间联动。

   契约：
   { "type": "eeg-band-spectrum", "alpha": 10, "artifact": "line", "window": "hann" }

   关键教学边界：30 Hz 以上不是“没有脑活动”。这里同时放入 γ、肌电、工频
   与眨眼，逼读者用形态、频带位置和环境线索联合判断。 */

import {
  buildSliders, mergeSpec, buildSegmented, buildReadout,
  label, polyline, fmt, clamp, clearBg,
} from '../core.js';
import { rfft, WINDOWS } from '../engines/dsp.js';
import { makeStage } from './algebra-stage.js';

const FS = 256;
const N = 512;
const BASE = [
  { name: 'alpha', label: 'α 峰值频率', min: 6, max: 13, step: 0.25, value: 10 },
];

const BANDS = [
  { name: 'δ', from: 1, to: 4, color: 'gray' },
  { name: 'θ', from: 4, to: 8, color: 'purple' },
  { name: 'α', from: 8, to: 13, color: 'green' },
  { name: 'β', from: 13, to: 30, color: 'blue' },
  { name: 'γ', from: 30, to: 80, color: 'orange' },
];

function deterministicNoise(n) {
  return ((n * 37) % 23 - 11) / 54;
}

function blinkPulse(t) {
  const a = Math.exp(-(((t - 0.55) / 0.055) ** 2));
  const b = Math.exp(-(((t - 1.45) / 0.07) ** 2));
  return 2.1 * a + 1.4 * b;
}

function emgAt(t) {
  return (
    0.24 * Math.sin(2 * Math.PI * 42 * t + 0.3)
    + 0.19 * Math.sin(2 * Math.PI * 57 * t + 1.1)
    + 0.15 * Math.sin(2 * Math.PI * 73 * t + 0.2)
  );
}

function buildSignal(alpha, artifact) {
  const x = new Float64Array(N);
  for (let n = 0; n < N; n += 1) {
    const t = n / FS;
    let v = Math.sin(2 * Math.PI * alpha * t);
    v += 0.34 * Math.sin(2 * Math.PI * 6 * t + 0.8);
    v += 0.22 * Math.sin(2 * Math.PI * 20 * t + 0.2);
    v += 0.12 * Math.sin(2 * Math.PI * 41 * t + 1.4);
    v += deterministicNoise(n);
    if (artifact === 'line') {
      v += 0.85 * Math.sin(2 * Math.PI * 50 * t);
      v += 0.28 * Math.sin(2 * Math.PI * 100 * t);
    } else if (artifact === 'emg') {
      v += emgAt(t);
    } else if (artifact === 'blink') {
      v += blinkPulse(t);
    }
    x[n] = v;
  }
  return x;
}

export default function render(host, spec) {
  let artifact = ['none', 'line', 'emg', 'blink'].includes(spec.artifact)
    ? spec.artifact
    : 'line';
  let windowName = ['rect', 'hann'].includes(spec.window) ? spec.window : 'hann';
  const sliders = buildSliders(
    { sliders: mergeSpec(BASE, spec) },
    () => st.redraw(),
  );

  const artifactSeg = buildSegmented(
    [
      { label: '干净', value: 'none' },
      { label: '工频', value: 'line' },
      { label: '肌电', value: 'emg' },
      { label: '眨眼', value: 'blink' },
    ],
    artifact,
    (v) => {
      artifact = v;
      st.redraw();
    },
  );
  host.appendChild(artifactSeg);
  const windowSeg = buildSegmented(
    [
      { label: '矩形窗', value: 'rect' },
      { label: 'Hann 窗', value: 'hann' },
    ],
    windowName,
    (v) => {
      windowName = v;
      st.redraw();
    },
  );
  host.appendChild(windowSeg);
  const ro = buildReadout({
    '主峰': '—',
    'α / β 能量': '—',
    '30 Hz 以上可见峰': '—',
  });
  host.appendChild(ro.box);

  const st = makeStage(host, {
    height: 360,
    aspect: null,
    scenes: [
      {
        caption: '第一幕：时域里只看到一条抖动的线。α、工频和肌电都叠在一起，单靠眼睛很难分账。',
        dur: 3.2,
      },
      {
        caption: '第二幕：做 DFT 后，频段有了位置。先认 δ/θ/α/β/γ，再看峰落在哪一段，而不是按“高不高”猜身份。',
        dur: 3.8,
      },
      {
        caption: '第三幕：拖动 α 频率，峰在 8–13 Hz 内移动；同时注意 41 Hz 的 γ 成分——30 Hz 以上仍然可以有脑活动。',
        dur: 4.0,
      },
      {
        caption: '第四幕：切换工频、肌电和眨眼。50 Hz 的窄线、高频毛刺和低频大鼓包来自不同机制；频率、形态、通道分布和环境线索要一起看。',
        dur: 4.6,
      },
      {
        caption: '第五幕：切矩形窗与 Hann 窗。泄漏不是“算错了”，而是有限窗口把一根理想谱线抹宽；换窗是在主瓣和旁瓣之间谈判。',
        dur: 4.2,
      },
    ],
    draw({ ctx, W, H, C, i }) {
      clearBg(ctx, W, H, C);
      const alpha = clamp(sliders.state.alpha, 6, 13);
      const raw = buildSignal(alpha, artifact);
      const win = WINDOWS[windowName](N);
      const xw = new Float64Array(N);
      for (let n = 0; n < N; n += 1) xw[n] = raw[n] * win[n];
      const specRes = rfft(xw);
      const nyq = FS / 2;
      const maxF = 80;
      const bins = Math.floor((maxF / nyq) * (specRes.mag.length - 1));
      let peakK = 1;
      for (let k = 2; k <= bins; k += 1) {
        if (specRes.mag[k] > specRes.mag[peakK]) peakK = k;
      }
      const peakF = (peakK * FS) / N;
      const alphaEnergy = energyInBand(specRes.mag, 8, 13);
      const betaEnergy = energyInBand(specRes.mag, 13, 30);
      let highPeak = 0;
      let highK = 1;
      for (let k = Math.ceil((30 * N) / FS); k <= bins; k += 1) {
        if (specRes.mag[k] > highPeak) {
          highPeak = specRes.mag[k];
          highK = k;
        }
      }

      /* 上半：时域。 */
      const topY = 30;
      const waveH = 110;
      const padX = 12;
      let lo = Infinity;
      let hi = -Infinity;
      for (const v of raw) {
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
      const mid = topY + waveH / 2;
      const amp = (waveH * 0.42) / (Math.max(Math.abs(lo), Math.abs(hi)) || 1);
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(padX, mid);
      ctx.lineTo(W - padX, mid);
      ctx.stroke();
      polyline(
        ctx,
        Array.from(raw, (v, n) => [
          padX + (n / (N - 1)) * (W - padX * 2),
          mid - v * amp,
        ]),
        C.accent,
        1.5,
      );
      label(ctx, '时域：2 秒 EEG', padX, 16, C.fg, { size: 12, weight: 700 });
      label(ctx, 'α=' + fmt(alpha, 2) + ' Hz · ' + artifactLabel(artifact), W - padX, 16, C.axis, {
        size: 10.5,
        align: 'right',
      });

      /* 下半：频谱与频段背景。 */
      const specY = topY + waveH + 42;
      const specH = H - specY - 38;
      const left = 34;
      const right = W - 12;
      const fx = (f) => left + (f / maxF) * (right - left);
      const maxMag = Math.max(...specRes.mag.slice(0, bins + 1), 0.02);
      const fy = (v) => specY + specH - (v / (maxMag * 1.08)) * specH;

      if (i >= 1) {
        BANDS.forEach((band) => {
          if (band.from >= maxF) return;
          const x0 = fx(band.from);
          const x1 = fx(Math.min(band.to, maxF));
          ctx.save();
          ctx.globalAlpha = 0.10;
          ctx.fillStyle = C.named(band.color);
          ctx.fillRect(x0, specY, x1 - x0, specH);
          ctx.restore();
          if (x1 - x0 > 24) {
            label(ctx, band.name, (x0 + x1) / 2, specY + 13, C.named(band.color), {
              size: 10,
              weight: 700,
              align: 'center',
            });
          }
        });
        ctx.strokeStyle = C.axis;
        ctx.beginPath();
        ctx.moveTo(left, specY + specH);
        ctx.lineTo(right, specY + specH);
        ctx.stroke();
        polyline(
          ctx,
          Array.from({ length: bins + 1 }, (_, k) => [fx((k * FS) / N), fy(specRes.mag[k])]),
          C.accent2,
          1.8,
        );

        [0, 10, 20, 30, 40, 50, 60, 70, 80].forEach((f) => {
          label(ctx, String(f), fx(f), specY + specH + 14, C.axis, {
            size: 9,
            align: 'center',
          });
        });
        label(ctx, 'Hz', right, specY + specH + 14, C.axis, { size: 9, align: 'right' });
        if (peakK > 0) {
          const px = fx(peakF);
          const py = fy(specRes.mag[peakK]);
          ctx.fillStyle = C.named('red');
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fill();
          label(ctx, fmt(peakF, 1) + ' Hz', px + 6, py - 4, C.named('red'), {
            size: 10,
            weight: 700,
          });
        }
      } else {
        ctx.save();
        ctx.strokeStyle = C.grid;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(left, specY, right - left, specH);
        ctx.restore();
        label(ctx, '下一幕：做一次 DFT，把同一条曲线拆成频率分账', left + 10, specY + specH / 2, C.axis, {
          size: 11,
          weight: 600,
        });
      }

      /* 用读数主动提醒 30 Hz 以上可能有脑活动。 */
      ro.set('主峰', i >= 1 ? fmt(peakF, 2) + ' Hz' : '下一幕揭晓');
      ro.set(
        'α / β 能量',
        i >= 1 ? fmt(Math.sqrt(alphaEnergy), 2) + ' / ' + fmt(Math.sqrt(betaEnergy), 2) : '下一幕揭晓',
      );
      ro.set(
        '30 Hz 以上可见峰',
        i < 1
          ? '下一幕揭晓'
          : highPeak > 0
            ? fmt((highK * FS) / N, 1) + ' Hz（可能是 γ / EMG / 工频）'
            : '无',
      );
    },
  });

  return { slidersBox: sliders.box, destroy: st.stop };
}

function energyInBand(mag, lo, hi) {
  let e = 0;
  const k0 = Math.max(1, Math.ceil((lo * N) / FS));
  const k1 = Math.min(mag.length - 1, Math.floor((hi * N) / FS));
  for (let k = k0; k <= k1; k += 1) e += mag[k] * mag[k];
  return e;
}

function artifactLabel(a) {
  if (a === 'line') return '加了 50/100 Hz 工频';
  if (a === 'emg') return '加了高频肌电';
  if (a === 'blink') return '加了额区眨眼';
  return '无额外伪迹';
}
