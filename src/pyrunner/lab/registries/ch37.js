/* 第 37 章（随机过程）分册：PageRank 幂迭代、样本路径叠加、泊松到达、
   平稳性体检、鞅的三本账、GARCH 波动聚集。
   键是 lab 围栏里的 type，值是动态 import（必须字面量）。 */
export default {
  'stoch-pagerank-iter': () => import('../components/stoch-pagerank-iter.js'),
  'stoch-path-ensemble': () => import('../components/stoch-path-ensemble.js'),
  'stoch-poisson-arrivals': () => import('../components/stoch-poisson-arrivals.js'),
  'stoch-stationary-audit': () => import('../components/stoch-stationary-audit.js'),
  'stoch-martingale-book': () => import('../components/stoch-martingale-book.js'),
  'stoch-garch-cluster': () => import('../components/stoch-garch-cluster.js'),
};
