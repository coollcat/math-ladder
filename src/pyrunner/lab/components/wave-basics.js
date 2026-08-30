/* 声波可视化：把「空气压强波」画成会疏密变化的粒子带，并可同步发声。
   一个正弦波既是时间上的压强起伏，也是空间上的疏密分布——声学第一课的教具。 */
import {
  themeColors, setupCanvas, anim, audioShell, buildSliders, label, clamp, fmt,
} from '../core.js';

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    freq: spec.freq ?? 3,      // 画面里出现几个完整波（示意值）
    amp: spec.amp ?? 0.8,      // 振幅：决定疏密对比强度
    speed: spec.speed ?? 1,    // 传播速度倍率
  };
  let phase = 0;
  let tone = null;

  const cv = setupCanvas(host, 260);

  const ROWS = 5;
  const COLS = 96;

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    const midY = H / 2;
    const ampPx = H * 0.3 * s.amp;

    ctx.strokeStyle = C.grid;
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(W, midY);
    ctx.stroke();
    ctx.setLineDash([]);

    /* 波形：压强随位置的分布 */
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i <= W; i += 1) {
      const y = midY - Math.sin(2 * Math.PI * s.freq * (i / W) + phase) * ampPx;
      if (i === 0) ctx.moveTo(i, y); else ctx.lineTo(i, y);
    }
    ctx.stroke();

    /* 粒子带：位移正比于波形，粒子自然在高压处挤、低压处散 */
    ctx.fillStyle = C.accent2;
    ctx.globalAlpha = 0.55;
    for (let r = 0; r < ROWS; r += 1) {
      const rowY = midY - ampPx + (r / (ROWS - 1)) * 2 * ampPx;
      for (let c = 0; c < COLS; c += 1) {
        const x0 = (c / (COLS - 1)) * W;
        const shift = Math.sin(2 * Math.PI * s.freq * (x0 / W) + phase) * ampPx * 0.45;
        ctx.beginPath();
        ctx.arc(clamp(x0 - shift, 0, W), rowY - shift * 0.25, 1.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    /* 波长标尺 */
    const px = W / s.freq;
    const y0 = H - 18;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(8, y0);
    ctx.lineTo(8 + px, y0);
    ctx.moveTo(8, y0 - 5);
    ctx.lineTo(8, y0 + 5);
    ctx.moveTo(8 + px, y0 - 5);
    ctx.lineTo(8 + px, y0 + 5);
    ctx.stroke();
    label(ctx, '一个波长 λ', 8 + px / 2, y0 - 8, C.fg, { align: 'center', size: 11 });
    label(ctx, '密（高压）', W - 8, 18, C.accent, { align: 'right', size: 11 });
    label(ctx, '疏（低压）', W - 8, 34, C.accent2, { align: 'right', size: 11 });
  }

  /* 发声：把示意频率线性映射到可听区 110–880 Hz */
  const audibleHz = () => 110 + ((s.freq - 1) / 7) * 770;

  const shell = audioShell(host, (eng, api) => {
    tone = eng.tone({ type: 'sine', freq: audibleHz(), gain: 0 });
    tone.setGain(0.3 * s.amp);
    api.hint.textContent = `同步发声 ${fmt(audibleHz(), 0)} Hz`;
    return () => {
      tone.stop();
      tone = null;
    };
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'freq', label: '频率（画面波数）', min: 1, max: 8, step: 0.1, value: s.freq },
        { name: 'amp', label: '振幅', min: 0.1, max: 1, step: 0.05, value: s.amp },
        { name: 'speed', label: '传播速度', min: 0, max: 3, step: 0.1, value: s.speed },
      ],
    },
    (st) => {
      s.freq = st.freq;
      s.amp = st.amp;
      s.speed = st.speed;
      if (tone) {
        tone.setFreq(audibleHz());
        tone.setGain(0.3 * s.amp);
      }
      draw();
    },
  );

  const controls = anim(host, {
    onTick(dt) {
      phase += dt * s.speed * Math.PI * 1.2;
      draw();
    },
    onReset() {
      phase = 0;
      draw();
    },
  });

  draw();
  cv.redraw = draw;

  return {
    slidersBox: sliders.box,
    destroy() {
      controls.stop();
      shell.stop();
    },
  };
}
