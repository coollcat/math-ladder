/* 第 73 章组件注册表：键为 lab 围栏里的 type，值为该组件的动态 import。
   新增组件时在这里加一行，并在 components/ 下建同名文件。
   路径必须是静态字面量，webpack 靠它做分包。 */
export default {
  'program-lifecycle': () => import('../components/program-lifecycle.js'),
  'process-thread': () => import('../components/process-thread.js'),
  'scheduler-lab': () => import('../components/scheduler-lab.js'),
  'deadlock-lab': () => import('../components/deadlock-lab.js'),
  'paging-lab': () => import('../components/paging-lab.js'),
  'filesystem-lab': () => import('../components/filesystem-lab.js'),
  'lexer-parser': () => import('../components/lexer-parser.js'),
  'ir-optimize': () => import('../components/ir-optimize.js'),
  'relational-algebra': () => import('../components/relational-algebra.js'),
  'btree-lab': () => import('../components/btree-lab.js'),
  'transaction-acid': () => import('../components/transaction-acid.js'),
  'network-layers': () => import('../components/network-layers.js'),
  'tcp-congestion': () => import('../components/tcp-congestion.js'),
  'routing-lab': () => import('../components/routing-lab.js'),
  'consensus-lab': () => import('../components/consensus-lab.js'),
};
