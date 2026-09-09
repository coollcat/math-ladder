/* 第 73 章组件注册表：键为 lab 围栏里的 type，值为该组件的动态 import。
   新增组件时在这里加一行，并在 components/ 下建同名文件。

   注意：箭头函数里的路径必须是字面量，webpack 靠静态分析分包。 */
export default {
  'wave-basics': () => import('../components/wave-basics.js'),
  'spectrum-live': () => import('../components/spectrum-live.js'),
  'tone-sweep': () => import('../components/tone-sweep.js'),
  'db-meter': () => import('../components/db-meter.js'),
  'loudness-contour': () => import('../components/loudness-contour.js'),
  'beats-audio': () => import('../components/beats-audio.js'),
  'adsr-shaper': () => import('../components/adsr-shaper.js'),
  'harmonic-builder': () => import('../components/harmonic-builder.js'),
  'eq-sweep': () => import('../components/eq-sweep.js'),
  'room-modes': () => import('../components/room-modes.js'),
  'convolution-reverb': () => import('../components/convolution-reverb.js'),
  'delay-comb': () => import('../components/delay-comb.js'),
  'compressor-lab': () => import('../components/compressor-lab.js'),
  'panning-binaural': () => import('../components/panning-binaural.js'),
};
