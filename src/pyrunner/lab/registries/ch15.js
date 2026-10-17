/* 第 15 章（级数与泰勒）分册注册表：泰勒展开的逐阶对账组件。
   与 ch68–ch75 同构——键是 lab 围栏里的 type，值是动态 import。
   路径必须是字面量，webpack 靠静态分析分包。 */
export default {
  'taylor-ladder': () => import('../components/taylor-ladder.js'),
};
