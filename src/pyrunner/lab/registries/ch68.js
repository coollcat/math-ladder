/* 第 68 章组件注册表：键为 lab 围栏里的 type，值为该组件的动态 import。
   新增组件时在这里加一行，并在 components/ 下建同名文件。

   注意：箭头函数里的路径必须是字面量，webpack 靠静态分析分包。 */
export default {
  'wave-basics': () => import('../components/wave-basics.js'),
  'spectrum-live': () => import('../components/spectrum-live.js'),
};
