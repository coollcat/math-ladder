/* 第 29 章（图论）分册：判题之外的可视化——着色、MST、拓扑序、强连通。
   键是 lab 围栏里的 type，值是动态 import（必须字面量，webpack 靠静态分析分包）。 */
export default {
  'gt-path-walk': () => import('../components/gt-path-walk.js'),
  'gt-trees': () => import('../components/gt-trees.js'),
  'gt-mst-kruskal': () => import('../components/gt-mst-kruskal.js'),
  'gt-topo-kahn': () => import('../components/gt-topo-kahn.js'),
  'gt-scc-collapse': () => import('../components/gt-scc-collapse.js'),
  'gt-coloring': () => import('../components/gt-coloring.js'),
  'gt-method-map': () => import('../components/gt-method-map.js'),
};
