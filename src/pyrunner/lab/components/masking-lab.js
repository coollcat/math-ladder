/* =========================================================================
 * lab 组件：masking-lab（心理声学 —— 一个强音怎样把旁边的弱音「吃掉」）
 * -------------------------------------------------------------------------
 * 演示什么
 *   人耳的频域分辨率不是均匀的：内耳基底膜做的是一组**临界频带（Bark）**分析，
 *   落在同一带里的声音会互相干扰。于是当一个强音（掩蔽音 masker）存在时，
 *   它附近的听阈会被整体抬高——抬高后的那条曲线叫**掩蔽阈值**。
 *   本组件画的就是这条曲线：曲线以下的区域，你什么都听不见。
 *
 *   三个必须玩出来的结论：
 *     · 掩蔽是**不对称**的：掩蔽阈值向高频一侧拖得很远（约 -10 dB/Bark），
 *       向低频一侧掉得很快（约 -25 dB/Bark）。所以高频弱音更容易被低频强音
 *       吃掉，反过来则不容易。
 *     · 掩蔽量随掩蔽音强度**超线性**增长：掩蔽音每提高 10 dB，被掩蔽的
 *       范围不只扩大 10 dB，还会变宽。
 *     · 掩蔽阈值永远不低于**绝对听阈 ATH**（安静环境下能听到的最低声压，
 *       1 kHz 附近约 4 dB SPL，两头都要响得多）。这条 U 形曲线决定了
 *       「人耳听不到 20 kHz 附近」和「低频要很响才听得见」。
 *
 * 怎么玩
 *   · 拖橙色三角（掩蔽音）：左右改频率，上下改强度。
 *   · 拖圆点（被掩蔽的探针音）：左右改频率，上下改强度；圆点变红 =
 *     落在掩蔽阈值以下 = 听不见，变绿 = 冒出头 = 听得见。
 *   · 「只听探针」按钮做 A/B：同一个电平，加不加掩蔽音，差别立判。
 *
 * 用法（课文里写 ```lab 围栏）
 *
 *   ```lab
 *   {
 *     "type": "masking-lab",
 *     "title": "把探针音拖到掩蔽阈值以下，它就消失了"
 *   }
 *   ```
 *
 * spec 字段（全部可省，缺省值如下）
 *   maskF   掩蔽音频率（Hz），100–8000，默认 1000
 *   maskL   掩蔽音强度（dB SPL），20–90，默认 65
 *   probeF  探针频率（Hz），100–16000，默认 1400
 *   probeL  探针强度（dB SPL），0–90，默认 40
 *   vol     播放音量，0–0.4，默认 0.2
 *   height  画布高度（像素），默认 360
 *
 * 出声：是。走 core.audioShell（■ 停止 / 离屏自动停），默认音量 0.2。
 * 引擎：仅 audio（两个正弦振荡器）。掩蔽模型是本文件里的解析式，没有现成轮子可复用。
 * 模型口径（写在注释里，免得被人当实测数据）：
 *   Bark 刻度     z(f) = 13·atan(0.00076 f) + 3.5·atan((f/7500)²)
 *   扩展函数      S(Δz) = 15.81 + 7.5(Δz+0.474) − 17.5·√(1+(Δz+0.474)²)   dB
 *                 （Schroeder 的两斜率形式，Δz 为 Bark 距离，S(0)≈0 dB）
 *   绝对听阈 ATH  Terhardt 拟合：3.64(f/1000)^-0.8 − 6.5·e^(−0.6(f/1000−3.3)²)
 *                 + 1e-3·(f/1000)^4   dB SPL
 *   掩蔽阈值      T(f) = max(ATH(f), L_masker + S(z(f) − z(f_masker)))
 *   判定          L_probe > T(f_probe) 判「听得到」，否则「听不到」
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, audioShell, buildSliders, buildSegmented,
  buildReadout, polyline, label, clamp, fmt,
  clearBg,
} from '../core.js';
import {
  bark,
  spread,
  ath,
  dbToAmp,
} from '../engines/dsp.js';

const F_LO = 50;
const F_HI = 16000;
const DB_LO = 0;
const DB_HI = 100;

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    maskF: clamp(spec.maskF ?? 1000, 100, 8000),
    maskL: clamp(spec.maskL ?? 65, 20, 90),
    probeF: clamp(spec.probeF ?? 1400, 100, 16000),
    probeL: clamp(spec.probeL ?? 40, 0, 90),
    vol: spec.vol ?? 0.2,
  };
  let listen = 'both';    // 'both' | 'probe'

  const cv = setupCanvas(host, spec.height || 360);
  host.appendChild(buildSegmented(
    [{ label: '听：掩蔽音 + 探针', value: 'both' }, { label: '只听探针（A/B 对照）', value: 'probe' }],
    listen,
    (v) => {
      listen = v;
      pushAudio();
    },
  ));
  const ro = buildReadout({
    '判定': '—', '余量': '—', '掩蔽抬升': '—', 'Bark 距离': '—', '掩蔽阈值': '—',
  });
  host.appendChild(ro.box);

  const PAD = { l: 36, r: 10, t: 22, b: 28 };
  let geom = null;

  const fx = (f) => {
    const g = geom;
    return g.x0 + ((Math.log(f / F_LO) / Math.log(F_HI / F_LO)) * (g.x1 - g.x0));
  };
  const xf = (x) => {
    const g = geom;
    return F_LO * (F_HI / F_LO) ** (clamp((x - g.x0) / (g.x1 - g.x0), 0, 1));
  };
  const dy = (db) => {
    const g = geom;
    return g.y1 - ((clamp(db, DB_LO, DB_HI) - DB_LO) / (DB_HI - DB_LO)) * (g.y1 - g.y0);
  };
  const yd = (y) => {
    const g = geom;
    return DB_LO + ((g.y1 - clamp(y, g.y0, g.y1)) / (g.y1 - g.y0)) * (DB_HI - DB_LO);
  };

  const threshold = (f) => Math.max(ath(f), s.maskL + spread(bark(f) - bark(s.maskF)));

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    geom = { x0: PAD.l, x1: W - PAD.r, y0: PAD.t, y1: H - PAD.b, W, H };
    clearBg(ctx, W, H, C);

    /* 网格：频率（对数）+ 声压级 */
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    [100, 1000, 10000].forEach((f) => {
      if (f < F_LO || f > F_HI) return;
      const x = fx(f);
      ctx.beginPath();
      ctx.moveTo(x + 0.5, geom.y0);
      ctx.lineTo(x + 0.5, geom.y1);
      ctx.stroke();
      label(ctx, f >= 1000 ? f / 1000 + ' kHz' : f + ' Hz', x, geom.y1 + 14, C.fg, {
        align: 'center', size: 10,
      });
    });
    for (let db = 20; db <= 80; db += 20) {
      const y = dy(db);
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(geom.x0, y + 0.5);
      ctx.lineTo(geom.x1, y + 0.5);
      ctx.stroke();
      label(ctx, db + '', geom.x0 - 5, y + 4, C.fg, { align: 'right', size: 10 });
    }

    /* 听不见的区域：阈值曲线以下 */
    const thr = [];
    const athPts = [];
    for (let px = geom.x0; px <= geom.x1; px += 1) {
      const f = xf(px);
      thr.push([px, dy(threshold(f))]);
      athPts.push([px, dy(ath(f))]);
    }
    ctx.fillStyle = C.soft;
    ctx.beginPath();
    ctx.moveTo(thr[0][0], thr[0][1]);
    thr.forEach((p) => ctx.lineTo(p[0], p[1]));
    ctx.lineTo(geom.x1, geom.y1);
    ctx.lineTo(geom.x0, geom.y1);
    ctx.closePath();
    ctx.fill();

    /* 绝对听阈（虚线） */
    polyline(ctx, athPts, C.axis, 1.2, [5, 4]);
    /* 掩蔽阈值（粗线） */
    polyline(ctx, thr, C.accent, 2.4);
    label(ctx, '橙粗线 = 掩蔽阈值（下方 = 听不见）', geom.x0 + 6, geom.y0 + 14, C.accent, {
      size: 11, weight: 600,
    });
    label(ctx, '灰虚线 = 安静时的绝对听阈 ATH', geom.x0 + 6, geom.y0 + 30, C.fg, { size: 10 });
    label(ctx, 'dB SPL', geom.x0 - 5, geom.y0 - 6, C.fg, { align: 'right', size: 10 });

    /* 掩蔽音：竖线 + 顶部三角 */
    const mx = fx(s.maskF);
    const my = dy(s.maskL);
    ctx.strokeStyle = C.named('purple');
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(mx, geom.y1);
    ctx.lineTo(mx, my);
    ctx.stroke();
    ctx.fillStyle = C.named('purple');
    ctx.beginPath();
    ctx.moveTo(mx, my - 9);
    ctx.lineTo(mx - 7, my + 3);
    ctx.lineTo(mx + 7, my + 3);
    ctx.closePath();
    ctx.fill();
    label(ctx, `掩蔽音 ${fmt(s.maskF, 0)} Hz / ${fmt(s.maskL, 0)} dB`, mx + 9, my - 6, C.named('purple'), {
      size: 10, weight: 600,
    });

    /* 探针：圆点，红=被掩蔽，绿=听得到 */
    const T = threshold(s.probeF);
    const audible = s.probeL > T;
    const pxp = fx(s.probeF);
    const pyp = dy(s.probeL);
    ctx.fillStyle = audible ? C.ok : C.bad;
    ctx.beginPath();
    ctx.arc(pxp, pyp, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.bg;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    label(ctx, `探针 ${fmt(s.probeF, 0)} Hz / ${fmt(s.probeL, 0)} dB`, pxp + 10, pyp + 4, audible ? C.ok : C.bad, {
      size: 10, weight: 600,
    });
    /* 探针到阈值的竖直落差 */
    ctx.strokeStyle = audible ? C.ok : C.bad;
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(pxp, pyp);
    ctx.lineTo(pxp, dy(T));
    ctx.stroke();
    ctx.setLineDash([]);

    /* 读数 */
    const margin = s.probeL - T;
    const dz = bark(s.probeF) - bark(s.maskF);
    ro.set('判定', audible ? '听得到（冒出掩蔽阈值）' : '听不到（被掩蔽）');
    ro.set('余量', `${fmt(margin, 1)} dB（探针强度 − 该频率的掩蔽阈值）`);
    ro.set('掩蔽抬升', `${fmt(T - ath(s.probeF), 1)} dB（掩蔽音把这里的听阈抬高了多少）`);
    ro.set('Bark 距离', `${fmt(dz, 2)} Bark（${dz >= 0 ? '探针在高频一侧，掩蔽拖得远' : '探针在低频一侧，掩蔽衰减快'}）`);
    ro.set('掩蔽阈值', `${fmt(T, 1)} dB SPL @ ${fmt(s.probeF, 0)} Hz`);
  }

  /* ---------- 拖拽：拖三角改掩蔽音，拖圆点（或空白处）改探针 ---------- */
  bindPointer(cv.canvas, {
    pick(x, y) {
      if (!geom) return null;
      const dm = Math.hypot(x - fx(s.maskF), y - dy(s.maskL));
      const dp = Math.hypot(x - fx(s.probeF), y - dy(s.probeL));
      if (dm < 14 && dm <= dp) return 'masker';
      if (dp < 14 || (x >= geom.x0 && x <= geom.x1 && y >= geom.y0 && y <= geom.y1)) return 'probe';
      return null;
    },
    move(id, x, y) {
      if (id === 'masker') {
        s.maskF = clamp(xf(x), 100, 8000);
        s.maskL = clamp(yd(y), 20, 90);
      } else {
        s.probeF = clamp(xf(x), 100, 16000);
        s.probeL = clamp(yd(y), 0, 90);
      }
      syncSliders();
      pushAudio();
      draw();
    },
  });

  function syncSliders() {
    const inps = sl.box.querySelectorAll('input');
    const vals = sl.box.querySelectorAll('.ml-slider__val');
    const put = (i, v, txt) => {
      if (inps[i]) inps[i].value = String(v);
      if (vals[i]) vals[i].textContent = txt;
    };
    put(0, Math.round(s.maskF), String(Math.round(s.maskF)));
    put(1, Math.round(s.maskL), String(Math.round(s.maskL)));
    put(2, Math.round(s.probeF), String(Math.round(s.probeF)));
    put(3, Math.round(s.probeL), String(Math.round(s.probeL)));
    sl.state.maskF = s.maskF;
    sl.state.maskL = s.maskL;
    sl.state.probeF = s.probeF;
    sl.state.probeL = s.probeL;
  }

  /* ---------- 出声：两个正弦，电平按「最响的那个 = 音量」归一 ---------- */
  let masker = null;
  let probe = null;

  function pushAudio() {
    if (!masker || !probe) return;
    masker.setFreq(s.maskF);
    probe.setFreq(s.probeF);
    /* 绝对电平关系要真实还原，否则掩蔽演示就是骗人的：
       以「两者中更响的一个」为参考，保证最响的那个正好是 vol */
    const ref = Math.max(s.maskL, s.probeL);
    const gm = dbToAmp(s.maskL - ref) * s.vol;
    const gp = dbToAmp(s.probeL - ref) * s.vol;
    masker.setGain(listen === 'both' ? gm : 0);
    probe.setGain(gp);
  }

  const shell = audioShell(host, (eng, api) => {
    eng.setMasterGain(0.8);
    masker = eng.tone({ type: 'sine', freq: s.maskF, gain: 0 });
    probe = eng.tone({ type: 'sine', freq: s.probeF, gain: 0 });
    pushAudio();
    api.hint.textContent = `播放中：${fmt(s.maskF, 0)} Hz 掩蔽音 + ${fmt(s.probeF, 0)} Hz 探针（最响的那个 = ${fmt(s.vol, 2)}）`;
    return () => {
      masker = null;
      probe = null;
    };
  });

  const sl = buildSliders(
    {
      sliders: [
        { name: 'maskF', label: '掩蔽音频率', min: 100, max: 8000, step: 10, value: s.maskF, fmt: 0 },
        { name: 'maskL', label: '掩蔽音强度', min: 20, max: 90, step: 1, value: s.maskL, fmt: 0 },
        { name: 'probeF', label: '探针频率', min: 100, max: 16000, step: 10, value: s.probeF, fmt: 0 },
        { name: 'probeL', label: '探针强度', min: 0, max: 90, step: 1, value: s.probeL, fmt: 0 },
        { name: 'vol', label: '音量', min: 0, max: 0.4, step: 0.02, value: s.vol, fmt: 2 },
      ],
    },
    (st) => {
      s.maskF = st.maskF;
      s.maskL = st.maskL;
      s.probeF = st.probeF;
      s.probeL = st.probeL;
      s.vol = st.vol;
      pushAudio();
      draw();
    },
  );

  draw();
  cv.redraw = draw;

  return {
    slidersBox: sl.box,
    destroy() { shell.stop(); },
  };
}
