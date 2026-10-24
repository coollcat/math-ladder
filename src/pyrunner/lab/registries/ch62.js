/* 第 62 章（通信系统）分册：同一比特串贯穿码型、载波、星座、
   眼图、匹配滤波、同步与跳频的通信工作台。
   注：按本轮任务边界未修改 lab/registry.js；总表接线由该文件 owner 处理。 */
export default {
  'eye-matched-filter': () => import('../components/eye-matched-filter.js'),
  'hamming-syndrome': () => import('../components/hamming-syndrome.js'),
};
