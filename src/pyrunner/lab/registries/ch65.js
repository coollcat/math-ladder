/* 第 65 章（机器人运动数学）分册：A* 搜索现场、SLAM 后端与前端、
   力控手感台、模仿学习漂移走廊、可微地图、VLA 词元台。 */
export default {
  'astar-frontier': () => import('../components/astar-frontier.js'),
  'rob-pose-graph-icp': () => import('../components/rob-pose-graph-icp.js'),
  'rob-vslam-triangulate': () => import('../components/rob-vslam-triangulate.js'),
  'rob-impedance-hand': () => import('../components/rob-impedance-hand.js'),
  'rob-bc-drift': () => import('../components/rob-bc-drift.js'),
  'rob-splat-online': () => import('../components/rob-splat-online.js'),
  'rob-vla-tokens': () => import('../components/rob-vla-tokens.js'),
};
