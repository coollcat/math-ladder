/* 第 77 章组件注册表：键为 lab 围栏里的 type，值为该组件的动态 import。
   新增组件时在这里加一行，并在 components/ 下建同名文件。

   注意：箭头函数里的路径必须是字面量，webpack 靠静态分析分包。

   补记（卷七施工期）：同 ch76，registry.js 先引用了分册，文件当时还没建。 */
export default {
  'ham-action-angle': () => import('../components/ham-action-angle.js'),
  'ham-field': () => import('../components/ham-field.js'),
  'ham-legendre': () => import('../components/ham-legendre.js'),
  'ham-liouville': () => import('../components/ham-liouville.js'),
  'ham-phase-flow': () => import('../components/ham-phase-flow.js'),
  'ham-poisson': () => import('../components/ham-poisson.js'),
  'ham-symmetry': () => import('../components/ham-symmetry.js'),
  'ham-symplectic': () => import('../components/ham-symplectic.js'),
};
