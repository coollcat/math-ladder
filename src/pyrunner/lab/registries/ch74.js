/* 第 74 章组件注册表：键为 lab 围栏里的 type，值为该组件的动态 import。
   新增组件时在这里加一行，并在 components/ 下建同名文件。

   注意：箭头函数里的路径必须是字面量，webpack 靠静态分析分包。 */
export default {
  'source-filter': () => import('../components/source-filter.js'),
  'frame-window': () => import('../components/frame-window.js'),
  'spectrogram-lab': () => import('../components/spectrogram-lab.js'),
  'mel-filterbank': () => import('../components/mel-filterbank.js'),
  'mfcc-lab': () => import('../components/mfcc-lab.js'),
  'pitch-detect': () => import('../components/pitch-detect.js'),
  'vad-lab': () => import('../components/vad-lab.js'),
  'lpc-lab': () => import('../components/lpc-lab.js'),
  'vocoder-lab': () => import('../components/vocoder-lab.js'),
  'masking-lab': () => import('../components/masking-lab.js'),
  'audio-codec-lab': () => import('../components/audio-codec-lab.js'),
  'wake-word-lab': () => import('../components/wake-word-lab.js'),
  'asr-overview': () => import('../components/asr-overview.js'),
  'tts-overview': () => import('../components/tts-overview.js'),
};
