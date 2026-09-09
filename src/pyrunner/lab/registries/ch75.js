/* 第 75 章组件注册表：键为 lab 围栏里的 type，值为该组件的动态 import。
   新增组件时在这里加一行，并在 components/ 下建同名文件。

   注意：箭头函数里的路径必须是字面量，webpack 靠静态分析分包。 */
export default {
  'image-pixels': () => import('../components/image-pixels.js'),
  'sampling-quantize': () => import('../components/sampling-quantize.js'),
  'color-space': () => import('../components/color-space.js'),
  'image-conv': () => import('../components/image-conv.js'),
  'edge-detect': () => import('../components/edge-detect.js'),
  'image-fft': () => import('../components/image-fft.js'),
  'dct-block': () => import('../components/dct-block.js'),
  'jpeg-quant': () => import('../components/jpeg-quant.js'),
  'frame-rate': () => import('../components/frame-rate.js'),
  'frame-diff': () => import('../components/frame-diff.js'),
  'motion-estimate': () => import('../components/motion-estimate.js'),
  'inter-predict': () => import('../components/inter-predict.js'),
  'gop-structure': () => import('../components/gop-structure.js'),
  'rate-distortion': () => import('../components/rate-distortion.js'),
};
