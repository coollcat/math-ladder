/* Web Audio 引擎 —— 卷六音频/语音章（68–69）的公共音频后端。
   设计要点：
   - 所有出声组件共用一条 master 增益，避免页面里多个组件叠音爆音。
   - 浏览器自动播放策略要求 AudioContext 在用户手势里创建/恢复，
     故 createEngine() 必须在 click 回调中调用（core.audioShell 已保证）。
   - 每个引擎实例自持全部节点，close() 一次性断开并关闭上下文。 */

const AC = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;

function makeNoiseBuffer(ctx, seconds, kind = 'white') {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  if (kind === 'pink') {
    /* Paul Kellet 的粉红噪声近似：多级一阶滤波叠加 */
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i += 1) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  } else {
    for (let i = 0; i < len; i += 1) d[i] = Math.random() * 2 - 1;
  }
  return buf;
}

/* 合成脉冲响应：指数衰减噪声，用于卷积混响。
   predelay 之后接衰减尾巴，reverse=true 时包络反向（反向混响效果）。 */
function makeImpulse(ctx, { seconds = 2, decay = 3, predelay = 0, reverse = false } = {}) {
  const sr = ctx.sampleRate;
  const len = Math.max(1, Math.floor(sr * seconds));
  const pre = Math.floor(sr * predelay);
  const buf = ctx.createBuffer(2, len + pre, sr);
  for (let c = 0; c < 2; c += 1) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i += 1) {
      const t = i / len;
      const env = Math.pow(1 - t, decay);
      const shaped = reverse ? Math.pow(t, decay) : env;
      d[i + pre] = (Math.random() * 2 - 1) * shaped;
    }
  }
  return buf;
}

/* 把若干节点串成链路：a -> b -> c，返回末端 */
function chain(...nodes) {
  for (let i = 0; i < nodes.length - 1; i += 1) nodes[i].connect(nodes[i + 1]);
  return nodes[nodes.length - 1];
}

async function createEngine(opts = {}) {
  if (!AC) throw new Error('此浏览器不支持 Web Audio');
  const ctx = new AC({ latencyHint: opts.latencyHint || 'interactive' });

  const master = ctx.createGain();
  master.gain.value = opts.gain === undefined ? 0.25 : opts.gain;
  /* 软限幅兜底：多个组件同时响时防止削波 */
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -6;
  limiter.knee.value = 6;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.25;
  chain(master, limiter, ctx.destination);

  const alive = new Set();

  const api = {
    ctx,
    master,
    sampleRate: ctx.sampleRate,

    async resume() {
      if (ctx.state === 'suspended') await ctx.resume();
      return ctx.state;
    },
    close() {
      alive.forEach((n) => {
        try { n.stop ? n.stop() : n.disconnect(); } catch (e) { void e; }
      });
      alive.clear();
      try { master.disconnect(); } catch (e) { void e; }
      try { limiter.disconnect(); } catch (e) { void e; }
      try { ctx.close(); } catch (e) { void e; }
    },
    setMasterGain(v) {
      master.gain.value = v;
    },

    /* 持续音：返回可实时改频率/音量的句柄 */
    tone({ type = 'sine', freq = 440, gain = 0.5, detune = 0 } = {}) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = detune;
      g.gain.value = gain;
      chain(osc, g, master);
      osc.start();
      alive.add(osc);
      return {
        node: osc,
        gain: g,
        setFreq(f, when = 0.02) {
          osc.frequency.setTargetAtTime(f, ctx.currentTime, when);
        },
        setType(t) { osc.type = t; },
        setGain(v, when = 0.02) {
          g.gain.setTargetAtTime(v, ctx.currentTime, when);
        },
        stop() {
          try { osc.stop(); } catch (e) { void e; }
          try { osc.disconnect(); } catch (e) { void e; }
          alive.delete(osc);
        },
      };
    },

    /* 加法合成：一组谐波各自独立音量，共用一条输出 */
    harmonics({ partials = [1], base = 220, type = 'sine', gain = 0.4 } = {}) {
      const out = ctx.createGain();
      out.gain.value = gain;
      out.connect(master);
      const voices = partials.map((mult, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.value = base * (typeof mult === 'object' ? mult.m : mult);
        /* 振幅按 1/n 衰减是自然乐器的常见形态，作为初值 */
        g.gain.value = typeof mult === 'object' ? (mult.a === undefined ? 1 / (i + 1) : mult.a) : 1 / (i + 1);
        chain(osc, g, out);
        osc.start();
        alive.add(osc);
        return { osc, g, mult: typeof mult === 'object' ? mult.m : mult };
      });
      return {
        out,
        voices,
        setBase(f) {
          voices.forEach((v) => {
            v.osc.frequency.setTargetAtTime(f * v.mult, ctx.currentTime, 0.02);
          });
        },
        setAmps(arr) {
          voices.forEach((v, i) => {
            v.g.gain.setTargetAtTime(arr[i] === undefined ? 0 : arr[i], ctx.currentTime, 0.02);
          });
        },
        setType(t) {
          voices.forEach((v) => { v.osc.type = t; });
        },
        setGain(v) {
          out.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
        },
        stop() {
          voices.forEach((v) => {
            try { v.osc.stop(); } catch (e) { void e; }
            try { v.osc.disconnect(); } catch (e) { void e; }
            alive.delete(v.osc);
          });
          try { out.disconnect(); } catch (e) { void e; }
        },
      };
    },

    /* 噪声源（白/粉），loop 循环播放 */
    noise({ kind = 'white', seconds = 2, gain = 0.3 } = {}) {
      const src = ctx.createBufferSource();
      src.buffer = makeNoiseBuffer(ctx, seconds, kind);
      src.loop = true;
      const g = ctx.createGain();
      g.gain.value = gain;
      chain(src, g, master);
      src.start();
      alive.add(src);
      return {
        node: src,
        gain: g,
        setGain(v) { g.gain.setTargetAtTime(v, ctx.currentTime, 0.02); },
        stop() {
          try { src.stop(); } catch (e) { void e; }
          try { src.disconnect(); } catch (e) { void e; }
          alive.delete(src);
        },
      };
    },

    biquad({ type = 'lowpass', freq = 1000, Q = 1, gain = 0 } = {}) {
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = Q;
      f.gain.value = gain;
      return f;
    },

    /* 梳状/延迟：延迟线 + 反馈 + 反馈内低通（模拟衰减） */
    delay({ time = 0.2, feedback = 0.4, wet = 0.5, damp = 6000 } = {}) {
      const input = ctx.createGain();
      const d = ctx.createDelay(1.5);
      const fb = ctx.createGain();
      const lp = ctx.createBiquadFilter();
      const wetG = ctx.createGain();
      const dryG = ctx.createGain();
      d.delayTime.value = time;
      fb.gain.value = feedback;
      lp.type = 'lowpass';
      lp.frequency.value = damp;
      wetG.gain.value = wet;
      dryG.gain.value = 1 - wet;
      chain(input, d, lp, fb, d);
      chain(input, dryG, master);
      chain(d, wetG, master);
      return {
        input,
        setTime(t) { d.delayTime.setTargetAtTime(t, ctx.currentTime, 0.02); },
        setFeedback(v) { fb.gain.setTargetAtTime(v, ctx.currentTime, 0.02); },
        setWet(v) {
          wetG.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
          dryG.gain.setTargetAtTime(1 - v, ctx.currentTime, 0.02);
        },
        setDamp(f) { lp.frequency.setTargetAtTime(f, ctx.currentTime, 0.02); },
      };
    },

    /* 卷积混响：脉冲响应由 makeImpulse 合成 */
    reverb({ seconds = 2, decay = 3, predelay = 0, reverse = false, wet = 0.5 } = {}) {
      const input = ctx.createGain();
      const conv = ctx.createConvolver();
      const wetG = ctx.createGain();
      const dryG = ctx.createGain();
      conv.buffer = makeImpulse(ctx, { seconds, decay, predelay, reverse });
      wetG.gain.value = wet;
      dryG.gain.value = 1 - wet;
      chain(input, conv, wetG, master);
      chain(input, dryG, master);
      return {
        input,
        conv,
        setWet(v) {
          wetG.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
          dryG.gain.setTargetAtTime(1 - v, ctx.currentTime, 0.02);
        },
        rebuild(o) {
          conv.buffer = makeImpulse(ctx, { seconds, decay, predelay, reverse, ...o });
        },
      };
    },

    compressor({ threshold = -24, ratio = 4, knee = 12, attack = 0.01, release = 0.25 } = {}) {
      const c = ctx.createDynamicsCompressor();
      c.threshold.value = threshold;
      c.ratio.value = ratio;
      c.knee.value = knee;
      c.attack.value = attack;
      c.release.value = release;
      return {
        node: c,
        set(k, v) {
          if (k in c) c[k].setTargetAtTime(v, ctx.currentTime, 0.02);
        },
        /* 实时增益衰减量（dB，负值），用于画压缩曲线 */
        reduction: () => c.reduction,
      };
    },

    panner({ pan = 0 } = {}) {
      if (ctx.createStereoPanner) {
        const p = ctx.createStereoPanner();
        p.pan.value = pan;
        return { node: p, set(v) { p.pan.setTargetAtTime(v, ctx.currentTime, 0.02); } };
      }
      const p = ctx.createPanner();
      p.panningModel = 'equalpower';
      p.setPosition(pan, 0, 1 - Math.abs(pan));
      return {
        node: p,
        set(v) {
          p.setPosition(v, 0, 1 - Math.abs(v));
        },
      };
    },

    analyser({ fftSize = 2048, smoothing = 0.8, input = null } = {}) {
      const a = ctx.createAnalyser();
      a.fftSize = fftSize;
      a.smoothingTimeConstant = smoothing;
      if (input) input.connect(a);
      const freq = new Float32Array(a.frequencyBinCount);
      const time = new Float32Array(a.fftSize);
      return {
        node: a,
        fftSize,
        binCount: a.frequencyBinCount,
        /* 频谱（dB）。返回数组与 frequencyBinCount 等长 */
        spectrumDb() {
          a.getFloatFrequencyData(freq);
          return freq;
        },
        /* 时域波形（[-1,1]） */
        waveform() {
          a.getFloatTimeDomainData(time);
          return time;
        },
        /* 第 k 个 bin 的中心频率 */
        binHz: (k) => (k * ctx.sampleRate) / a.fftSize,
        /* 简易 RMS 电平（dBFS） */
        levelDb() {
          a.getFloatTimeDomainData(time);
          let s = 0;
          for (let i = 0; i < time.length; i += 1) s += time[i] * time[i];
          const rms = Math.sqrt(s / time.length);
          return rms > 1e-7 ? 20 * Math.log10(rms) : -Infinity;
        },
      };
    },

    /* 离线渲染：一次性算出一段音频的波形（不发声），用于画包络/响度对比 */
    async offline({ seconds = 1, sampleRate = 44100, build }) {
      const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!OC) throw new Error('此浏览器不支持离线渲染');
      const oc = new OC(1, Math.ceil(seconds * sampleRate), sampleRate);
      build(oc, oc.destination);
      const buf = await oc.startRendering();
      return buf.getChannelData(0);
    },

    makeImpulse: (o) => makeImpulse(ctx, o),
    makeNoiseBuffer: (s, k) => makeNoiseBuffer(ctx, s, k),
  };

  await api.resume();
  return api;
}

export { createEngine, makeImpulse, makeNoiseBuffer, chain };
