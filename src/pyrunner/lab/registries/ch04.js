/* 第 4 章（代数）分册注册表：3Blue1Brown 式「分幕动画演示」组件。
   与 ch68–ch75 同构——键是 lab 围栏里的 type，值是动态 import。
   路径必须是字面量，webpack 靠静态分析分包。 */
export default {
  'algebra-complete-square': () => import('../components/algebra-complete-square.js'),
  'algebra-zero-hunt': () => import('../components/algebra-zero-hunt.js'),
  'algebra-intersection': () => import('../components/algebra-intersection.js'),
  'algebra-dots-to-curve': () => import('../components/algebra-dots-to-curve.js'),
  'algebra-sign-scan': () => import('../components/algebra-sign-scan.js'),
};
