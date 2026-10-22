/* 第 31 章（自动机与形式语言）分册：状态机跑输入带、NFA 平行猜测、子集构造、
   PDA 栈、CFG 推导树、CYK 三角表。
   键是 lab 围栏里的 type，值是动态 import（必须字面量，webpack 靠静态分析分包）。
   画法公用件在 components/aut-graph-base.js，它不注册、只被本章组件 import。 */
export default {
  'aut-fsm-runner': () => import('../components/aut-fsm-runner.js'),
  'aut-nfa-guess': () => import('../components/aut-nfa-guess.js'),
  'aut-subset-build': () => import('../components/aut-subset-build.js'),
  'aut-pda-stack': () => import('../components/aut-pda-stack.js'),
  'aut-cfg-derive': () => import('../components/aut-cfg-derive.js'),
  'aut-cyk-table': () => import('../components/aut-cyk-table.js'),
};
