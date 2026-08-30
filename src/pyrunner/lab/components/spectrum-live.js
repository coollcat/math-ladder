/* 实时频谱：上半屏看波形（时间域），下半屏看频谱（频率域）。
   这是「音色 = 频谱形状」这一命题的直证教具——改波形、改谐波，频谱当场变。 */
import {
  themeColors, setupCanvas, audioShell, buildSliders, buildSegmented,
  buildReadout, rafLoop, label, polyline, fmt,
} from '../core.js';

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    wave: spec.wave || 'sine',
    freq: spec.freq ?? 220,
    level: spec.level ?? 1,
  };

  const cv = setupCanvas(host, 300);
  const seg = buildSegmented(
    [
      { label: '正弦', value: 'sine' },
      { label: '方波', value: 'square' },
      { label: '锯齿', value: 'sawtooth' },
      { label: '三角', value: 'triangle' },
    ],
    s.wave,
    (v) => {
      s.wave = v;
      if (tone) tone.setType(v);
    },
  );
  host.appendChild(seg);

  const ro = buildReadout({ 基频: '—', 峰值: '—', 电平: '—' });
  host.appendChild(ro.box);

  let tone = null;
  let analyser = null;
  let loop = null;

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    const topH = H * 0.38;
    const botY = topH + 18;
    const botH = H - botY - 22;

    /* 分割线 */
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, topH + 9);
    ctx.lineTo(W, topH + 9);
    ctx.stroke();
    label(ctx, '时间域：波形', 8, 14, C.fg, { size: 11 });
    label(ctx, '频率域：频谱（对数频率轴）', 8, botY - 6, C.fg, { size: 11 });

    if (!analyser) {
      label(ctx, '点「▶ 播放」开始实时分析', W / 2, H / 2, C.fg, { align: 'center', size: 12 });
      return;
    }

    /* --- 时间域 --- */
    const wave = analyser.waveform();
    const pts = [];
    const stride = Math.max(1, Math.floor(wave.length / W));
    for (let i = 0, x = 0; i < wave.length; i += stride, x += 1) {
      pts.push([x, topH / 2 - wave[i] * (topH / 2) * 0.9]);
    }
    ctx.strokeStyle = C.grid;
    ctx.beginPath();
    ctx.moveTo(0, topH / 2);
    ctx.lineTo(W, topH / 2);
    ctx.stroke();
    polyline(ctx, pts, C.accent, 1.8);

    /* --- 频率域：对数频率轴，20 Hz – 20 kHz --- */
    const db = analyser.spectrumDb();
    const nyq = 24000;
    const fMin = 20;
    const DB_MIN = -100;
    const DB_MAX = 0;
    const bars = [];
    for (let x = 0; x < W; x += 1) {
      const f = fMin * (nyq / fMin) ** (x / W);
      const bin = Math.round((f * analyser.fftSize) / 48000);
      const v = bin >= 0 && bin < db.length ? db[bin] : DB_MIN;
      const t = (Math.max(DB_MIN, Math.min(DB_MAX, v)) - DB_MIN) / (DB_MAX - DB_MIN);
      bars.push([x + 0.5, botY + botH - t * botH]);
    }
    /* 频率网格：100 / 1k / 10k */
    ctx.strokeStyle = C.grid;
    [100, 1000, 10000].forEach((f) => {
      const x = (Math.log(f / fMin) / Math.log(nyq / fMin)) * W;
      ctx.beginPath();
      ctx.moveTo(x, botY);
      ctx.lineTo(x, botY + botH);
      ctx.stroke();
      label(ctx, f >= 1000 ? f / 1000 + 'k' : String(f), x + 3, botY + botH + 13, C.fg, { size: 10 });
    });
    ctx.fillStyle = C.accent2;
    ctx.beginPath();
    ctx.moveTo(0, botY + botH);
    bars.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.lineTo(W, botY + botH);
    ctx.closePath();
    ctx.fill();

    /* 读数 */
    let peakBin = 0;
    for (let k = 1; k < db.length; k += 1) if (db[k] > db[peakBin]) peakBin = k;
    ro.set('基频', fmt(s.freq, 0) + ' Hz');
    ro.set('峰值', fmt((peakBin * 48000) / analyser.fftSize, 0) + ' Hz');
    const lv = analyser.levelDb();
    ro.set('电平', isFinite(lv) ? fmt(lv, 1) + ' dBFS' : '静音');
  }

  const shell = audioShell(host, (eng, api) => {
    tone = eng.tone({ type: s.wave, freq: s.freq, gain: 0.3 * s.level });
    analyser = eng.analyser({ fftSize: 4096, input: tone.gain });
    api.hint.textContent = '实时分析已启动';
    loop = rafLoop(host, draw);
    return () => {
      if (loop) loop.stop();
      loop = null;
      analyser = null;
      tone = null;
      draw();
    };
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'freq', label: '基频', min: 55, max: 1760, step: 1, value: s.freq },
        { name: 'level', label: '音量', min: 0, max: 1.5, step: 0.05, value: s.level },
      ],
    },
    (st) => {
      s.freq = st.freq;
      s.level = st.level;
      if (tone) {
        tone.setFreq(s.freq);
        tone.setGain(0.3 * s.level);
      }
      if (!loop) draw();
    },
  );

  draw();
  cv.redraw = draw;

  return {
    slidersBox: sliders.box,
    destroy() {
      shell.stop();
      if (loop) loop.stop();
    },
  };
}
