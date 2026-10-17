/* 第 61 章（数字信号处理）分册：EEG 读谱等频谱工程组件。 */
export default {
  'eeg-band-spectrum': () => import('../components/eeg-band-spectrum.js'),
  'eeg-ica-cleaner': () => import('../components/eeg-ica-cleaner.js'),
  'convolution-workbench': () => import('../components/convolution-workbench.js'),
  'fft-butterfly': () => import('../components/fft-butterfly.js'),
};
