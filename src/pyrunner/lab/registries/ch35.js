/* 第 35 章（编码理论）分册：Hamming 距离球、最近邻译码、校验矩阵、噪声信道。
   键是 lab 围栏里的 type，值是动态 import（必须字面量）。 */
export default {
  'code-hamming-sphere': () => import('../components/code-hamming-sphere.js'),
  'code-nearest-neighbor': () => import('../components/code-nearest-neighbor.js'),
  'code-linear-codebook': () => import('../components/code-linear-codebook.js'),
  'code-generator-parity': () => import('../components/code-generator-parity.js'),
  'code-hamming74-syndrome': () => import('../components/code-hamming74-syndrome.js'),
  'code-distance-sphere': () => import('../components/code-distance-sphere.js'),
  'code-conv-trellis': () => import('../components/code-conv-trellis.js'),
  'code-ldpc-tanner': () => import('../components/code-ldpc-tanner.js'),
  'code-method-map': () => import('../components/code-method-map.js'),
};
