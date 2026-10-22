/* 第 50 章（强化学习）分册：网格世界的价值回传 / 策略箭头组件，
   以及本批新增的 15 个课程专属组件（类型名统一 rl- 前缀）。 */
export default {
  'gridworld-value-lab': () => import('../components/gridworld-value-lab.js'),

  /* 序贯决策与反馈延迟：现在吃 vs 以后吃的时间线 */
  'rl-temporal-tradeoff': () => import('../components/rl-temporal-tradeoff.js'),
  /* Agent、Environment、State、Action 与 Reward：感知-动作闭环 */
  'rl-agent-loop': () => import('../components/rl-agent-loop.js'),
  /* Episode 与轨迹：生成 + 回溯 */
  'rl-trajectory-replay': () => import('../components/rl-trajectory-replay.js'),
  /* Markov 性质：两种状态编码的对比 */
  'rl-markov-memory': () => import('../components/rl-markov-memory.js'),
  /* MDP 五元组：可交互装配 */
  'rl-mdp-assembler': () => import('../components/rl-mdp-assembler.js'),
  /* 动作价值 Q：3D 柱状 + V 的加权平均 */
  'rl-q-surface': () => import('../components/rl-q-surface.js'),
  /* 策略迭代：箭头随迭代翻转 */
  'rl-policy-flip': () => import('../components/rl-policy-flip.js'),
  /* TD 学习：自举链 */
  'rl-bootstrap-chain': () => import('../components/rl-bootstrap-chain.js'),
  /* Q-learning：Q 表热力图 + 轨迹 */
  'rl-qtable-heat': () => import('../components/rl-qtable-heat.js'),
  /* 多臂老虎机：regret 曲线 */
  'rl-bandit-regret': () => import('../components/rl-bandit-regret.js'),
  /* Baseline：两堆样本的方差云 */
  'rl-baseline-cloud': () => import('../components/rl-baseline-cloud.js'),
  /* PPO 裁剪：裁剪窗口与梯度归零区 */
  'rl-ppo-clip': () => import('../components/rl-ppo-clip.js'),
  /* 奖励 hacking：代理奖励与真实目标错位 */
  'rl-proxy-mismatch': () => import('../components/rl-proxy-mismatch.js'),
  /* RLHF：偏好 → 奖励模型 → 策略 */
  'rl-rlhf-pipeline': () => import('../components/rl-rlhf-pipeline.js'),
  /* 方法地图：值函数 / 策略 / 模型三条路线 */
  'rl-method-map': () => import('../components/rl-method-map.js'),
};
