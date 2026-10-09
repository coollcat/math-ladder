/* =========================================================================
 * lab 组件公共底座：3Blue1Brown 式「分幕动画舞台」（第 4 章代数专用）
 * -------------------------------------------------------------------------
 * 用法（组件文件顶部 import，不单独注册）：
 *
 *   import { makeStage } from './algebra-stage.js';
 *
 *   export default function render(host, spec) {
 *     const st = makeStage(host, {
 *       height: 360, aspect: 4 / 3,
 *       scenes: [
 *         { caption: '第 1 幕：画一个边长 x 的正方形', dur: 3 },
 *         { caption: '第 2 幕：右边贴上一条窄臂', dur: 3 },
 *       ],
 *     });
 *     // 每帧重绘：i 是当前幕号，t 是 0..1 的缓动后进度（easeInOutCubic）
 *     function draw() {
 *       const C = themeColors();
 *       const { ctx, W, H } = st.cv;
 *       st.eachScene((i, t) => { ... });
 *     }
 *     draw();
 *     return { destroy: st.stop };
 *   }
 *
 * 约定：
 *   - 颜色一律经 themeColors()，跟随明暗主题，禁止硬编码。
 *   - opts.onScene(i) 在每次换幕时回调，组件用它重置拖拽态；
 *   - 场景切换 / 滑块变化时组件自己决定重画什么；舞台只负责
 *     「时间线 → 幕号 + 进度」，不碰业务绘制。
 *   - reduced-motion 用户不自动播放，直接给终态（t = 1）。
 *   - 离屏（滚出视口）自动暂停播放循环，回滚视口不自动续播。
 * ========================================================================= */

import { themeColors, setupCanvas, el, mkBtn, onScreen } from '../core.js';

/* 与 3Blue1Brown 一致的缓动：起步慢、中段快、收尾稳 */
const easeInOutCubic = (t) => {
  const u = Math.min(Math.max(t, 0), 1);
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
};

export function makeStage(host, opts = {}) {
  const scenes = opts.scenes || [{ caption: '', dur: 3 }];
  const total = scenes.length;
  const H0 = opts.height || 340;
  const reduced = !!(window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---- DOM 骨架 ---- */
  const box = el('div', 'ml-alg-stage');
  host.appendChild(box);

  const canvasBox = el('div', 'ml-alg-stage__canvas');
  box.appendChild(canvasBox);
  const cv = setupCanvas(canvasBox, H0, { aspect: opts.aspect || 16 / 9 });

  const cap = el('div', 'ml-alg-stage__caption', scenes[0].caption || '');
  box.appendChild(cap);

  const controls = el('div', 'ml-viz__controls');
  box.appendChild(controls);
  const btnPrev = mkBtn('◀ 上一幕');
  const btnPlay = mkBtn(reduced ? '减少动效' : '播放');
  const btnNext = mkBtn('下一幕 ▶');
  const btnReplay = mkBtn('重播');
  btnPlay.disabled = reduced;
  const badge = el('span', 'ml-lab__hint', '');
  controls.append(btnPrev, btnPlay, btnNext, btnReplay, badge);

  const dots = el('div', 'ml-alg-stage__dots');
  box.appendChild(dots);
  const dotEls = scenes.map((s, i) => {
    const d = el('button', 'ml-alg-stage__dot');
    d.type = 'button';
    d.setAttribute('aria-label', '跳到第 ' + (i + 1) + ' 幕');
    d.title = '第 ' + (i + 1) + ' 幕：' + (s.caption || '');
    d.addEventListener('click', () => go(i, true));   /* 跳幕就演，跟 3B1B 的导航一致 */
    dots.appendChild(d);
    return d;
  });

  /* ---- 播放状态 ---- */
  let idx = 0;
  let t = reduced ? 1 : 0;   // 幕内原始进度 0..1
  let playing = false;
  let hold = 0;             // 幕末定格停留秒数
  let visible = true;
  let raf = null;
  let last = 0;
  let destroyed = false;

  function setCaption(i) {
    cap.textContent = scenes[i].caption || '';
    cap.classList.remove('is-fade');
    /* 强制回流，让同一段字幕连点也能重放动画 */
    void cap.offsetWidth;
    cap.classList.add('is-fade');
  }

  function syncChrome() {
    badge.textContent = '第 ' + (idx + 1) + ' / ' + total + ' 幕'
      + (playing ? ' · 播放中' : '');
    dotEls.forEach((d, i) => {
      d.classList.toggle('is-on', i === idx);
      d.classList.toggle('is-past', i < idx);
    });
    btnPlay.textContent = reduced ? '减少动效' : (playing ? '暂停' : '播放');
  }

  function draw() {
    if (destroyed) return;
    const C = themeColors();
    opts.draw({ ctx: cv.ctx, W: cv.W, H: cv.H, C, i: idx, t: easeInOutCubic(t), raw: t });
  }

  cv.redraw = draw;

  function loop(now) {
    raf = null;
    if (destroyed || !playing) return;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
    last = now;
    if (!visible || !host.isConnected) return;
    if (hold > 0) {
      hold -= dt;
      if (hold <= 0) {
        if (idx < total - 1) {
          idx += 1;
          t = 0;
          setCaption(idx);
          if (opts.onScene) opts.onScene(idx);
          syncChrome();
        } else {
          playing = false;
          syncChrome();
          return;
        }
      }
    } else {
      t += dt / (scenes[idx].dur || 3);
      if (t >= 1) {
        t = 1;
        hold = 0.5;
      }
    }
    draw();
    if (playing) raf = requestAnimationFrame(loop);
  }

  function play(v) {
    if (reduced) return;
    playing = v === undefined ? !playing : !!v;
    last = 0;
    /* 停在末幕末尾再按播放：从头重演 */
    if (playing && idx === total - 1 && t >= 1) go(0, true);
    syncChrome();
    if (playing && raf == null) raf = requestAnimationFrame(loop);
  }

  /* 跳到第 i 幕；play=true 立即从该幕开始播放 */
  function go(i, playNow) {
    idx = Math.min(Math.max(i, 0), total - 1);
    t = 0;
    hold = 0;
    setCaption(idx);
    if (opts.onScene) opts.onScene(idx);
    if (playNow && !reduced) {
      playing = true;
      last = 0;
    } else {
      playing = false;
    }
    syncChrome();
    draw();
    if (playing && raf == null) raf = requestAnimationFrame(loop);
  }

  btnPrev.addEventListener('click', () => {
    if (playing && t > 0.12) {
      t = 0;
      draw();
      syncChrome();
    } else {
      go(idx - 1, false);
    }
  });
  btnNext.addEventListener('click', () => {
    if (idx < total - 1) go(idx + 1, playing);
    else {
      playing = false;
      t = 1;
      syncChrome();
      draw();
    }
  });
  btnReplay.addEventListener('click', () => go(0, true));
  btnPlay.addEventListener('click', () => play());

  /* 离屏暂停：回到视口不自动续（避免满屏 raf 打架） */
  onScreen(box, (v) => {
    visible = v;
    last = 0;
    if (!v && raf != null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
    /* 滚回视口时若仍在播放态，把循环接上（否则 raf 已被取消，播放永远停摆） */
    if (v && playing && raf == null && !destroyed) raf = requestAnimationFrame(loop);
  });

  function stop() {
    destroyed = true;
    playing = false;
    if (raf != null) cancelAnimationFrame(raf);
    raf = null;
  }

  syncChrome();
  draw();

  return {
    cv,
    box,
    redraw: draw,
    go,
    play,
    stop,
    next: () => go(idx + 1, playing),
    prev: () => go(idx - 1, playing),
    replay: () => go(0, true),
    get scene() { return idx; },
    get t() { return t; },
    get playing() { return playing; },
  };
}

export { easeInOutCubic };
export default makeStage;
