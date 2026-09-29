/* 第 78 章组件注册表：键为 lab 围栏里的 type，值为该组件的动态 import。
   本章是「脑机接口的数学」——脉冲编码、解码、空间滤波、流形几何、
   信息率与闭环刺激，八个组件各管一课。

   注意：箭头函数里的路径必须是字面量，打包器靠静态分析分包。 */
export default {
  'bci-integrate-fire': () => import('../components/bci-integrate-fire.js'),
  'bci-tuning-curve': () => import('../components/bci-tuning-curve.js'),
  'bci-population-vector': () => import('../components/bci-population-vector.js'),
  'bci-kalman-cursor': () => import('../components/bci-kalman-cursor.js'),
  'bci-csp': () => import('../components/bci-csp.js'),
  'bci-spd-manifold': () => import('../components/bci-spd-manifold.js'),
  'bci-mutual-info': () => import('../components/bci-mutual-info.js'),
  'bci-closed-loop': () => import('../components/bci-closed-loop.js'),
};
