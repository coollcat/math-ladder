/* 第 69 章组件注册表：键为 lab 围栏里的 type，值为该组件的动态 import。
   新增组件时在这里加一行，并在 components/ 下建同名文件。

   注意：箭头函数里的路径必须是字面量，webpack 靠静态分析分包。 */
export default {
  'analog-vs-digital': () => import('../components/analog-vs-digital.js'),
  'logic-gates': () => import('../components/logic-gates.js'),
  'karnaugh': () => import('../components/karnaugh.js'),
  'adder-lab': () => import('../components/adder-lab.js'),
  'mux-decoder': () => import('../components/mux-decoder.js'),
  'latch-flipflop': () => import('../components/latch-flipflop.js'),
  'register-shift': () => import('../components/register-shift.js'),
  'counter-lab': () => import('../components/counter-lab.js'),
  'fsm-lab': () => import('../components/fsm-lab.js'),
  'timing-setup': () => import('../components/timing-setup.js'),
  'twos-complement': () => import('../components/twos-complement.js'),
  'alu-lab': () => import('../components/alu-lab.js'),
  'datapath-single': () => import('../components/datapath-single.js'),
  'isa-decode': () => import('../components/isa-decode.js'),
  'pipeline-hazard': () => import('../components/pipeline-hazard.js'),
  'cache-lab': () => import('../components/cache-lab.js'),
  'bus-interrupt': () => import('../components/bus-interrupt.js'),
};
