/* 第 71 章（电子电路与电子设计）组件注册表：键为 lab 围栏里的 type，值为该组件的动态 import。
   新增组件时在这里加一行，并在 components/ 下建同名文件。

   注意：箭头函数里的路径必须是字面量，webpack 靠静态分析分包。 */
export default {
  'charge-current': () => import('../components/charge-current.js'),
  'ohm-lab': () => import('../components/ohm-lab.js'),
  'kcl-kvl': () => import('../components/kcl-kvl.js'),
  'divider-thevenin': () => import('../components/divider-thevenin.js'),
  'capacitor-lab': () => import('../components/capacitor-lab.js'),
  'inductor-lab': () => import('../components/inductor-lab.js'),
  'rc-step': () => import('../components/rc-step.js'),
  'rlc-ring': () => import('../components/rlc-ring.js'),
  'impedance-phasor': () => import('../components/impedance-phasor.js'),
  'ac-power': () => import('../components/ac-power.js'),
  'diode-rectifier': () => import('../components/diode-rectifier.js'),
  'transistor-switch': () => import('../components/transistor-switch.js'),
  'opamp-lab': () => import('../components/opamp-lab.js'),
  'active-filter': () => import('../components/active-filter.js'),
  'oscillator-circuit': () => import('../components/oscillator-circuit.js'),
  'power-regulator': () => import('../components/power-regulator.js'),
  'adc-dac': () => import('../components/adc-dac.js'),
  'pcb-flow': () => import('../components/pcb-flow.js'),
};
