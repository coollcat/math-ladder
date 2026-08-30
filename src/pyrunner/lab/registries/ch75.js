/* 第 75 章（机电、电机与嵌入式）组件注册表：键为 lab 围栏里的 type，值为该组件的动态 import。

   注意：箭头函数里的路径必须是字面量，webpack 靠静态分析分包。 */
export default {
  'mechatronics-intro': () => import('../components/mechatronics-intro.js'),
  'dc-motor': () => import('../components/dc-motor.js'),
  'motor-model': () => import('../components/motor-model.js'),
  'bldc-commutation': () => import('../components/bldc-commutation.js'),
  'stepper-microstep': () => import('../components/stepper-microstep.js'),
  'pwm-hbridge': () => import('../components/pwm-hbridge.js'),
  'encoder-speed': () => import('../components/encoder-speed.js'),
  'sensor-conditioning': () => import('../components/sensor-conditioning.js'),
  'pid-discrete': () => import('../components/pid-discrete.js'),
  'control-timing': () => import('../components/control-timing.js'),
  'rtos-task': () => import('../components/rtos-task.js'),
  'fsm-embedded': () => import('../components/fsm-embedded.js'),
  'bus-protocols': () => import('../components/bus-protocols.js'),
  'decoupling-pdn': () => import('../components/decoupling-pdn.js'),
  'emc-design': () => import('../components/emc-design.js'),
  'design-closure': () => import('../components/design-closure.js'),
};
