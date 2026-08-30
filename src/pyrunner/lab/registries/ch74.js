/* 第 74 章（机械工程）组件注册表：键为 lab 围栏里的 type，值为该组件的动态 import。
   新增组件时在这里加一行，并在 components/ 下建同名文件。

   注意：箭头函数里的路径必须是字面量，webpack 靠静态分析分包。 */
export default {
  'statics-balance': () => import('../components/statics-balance.js'),
  'free-body': () => import('../components/free-body.js'),
  'truss-lab': () => import('../components/truss-lab.js'),
  'stress-strain': () => import('../components/stress-strain.js'),
  'material-curve': () => import('../components/material-curve.js'),
  'beam-diagram': () => import('../components/beam-diagram.js'),
  'beam-deflection': () => import('../components/beam-deflection.js'),
  'buckling-lab': () => import('../components/buckling-lab.js'),
  'torsion-shaft': () => import('../components/torsion-shaft.js'),
  'fatigue-sn': () => import('../components/fatigue-sn.js'),
  'tolerance-stack': () => import('../components/tolerance-stack.js'),
  'mechanism-dof': () => import('../components/mechanism-dof.js'),
  'four-bar': () => import('../components/four-bar.js'),
  'cam-follower': () => import('../components/cam-follower.js'),
  'gear-train': () => import('../components/gear-train.js'),
  'belt-chain': () => import('../components/belt-chain.js'),
  'vibration-isolation': () => import('../components/vibration-isolation.js'),
  'fem-intro': () => import('../components/fem-intro.js'),
};
