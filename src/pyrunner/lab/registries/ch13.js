/* 第 13 章（导数）分册注册表：扰动流水线与隐函数约束点组件。
   与 ch68–ch75 同构——键是 lab 围栏里的 type，值是动态 import。
   路径必须是字面量，webpack 靠静态分析分包。 */
export default {
  'chain-rule-pipeline': () => import('../components/chain-rule-pipeline.js'),
};
