/* 第 11 章（线性代数）分册注册表：矩阵接力类交互组件。
   与 ch68–ch75 同构——键是 lab 围栏里的 type，值是动态 import。
   路径必须是字面量，webpack 靠静态分析分包。 */
export default {
  'matrix-relay': () => import('../components/matrix-relay.js'),
};
