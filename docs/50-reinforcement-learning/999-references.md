---
title: 强化学习 · 参考资料
description: 第 50 章涉及的核心论文、原著与延伸阅读一览。
volume: 5
layer: L11
track:
  - optimization-control
stage: research-elective
difficulty: 5
---

# 强化学习 · 参考资料

本章涉及的核心论文、原著与延伸阅读，按课程推进顺序整理。

文献页面对所有人开放；带归档副本的条目，未登录点「原站下载」前往出处，登录后点「本地下载」直接取本站副本。

```paper
# @title: Reinforcement Learning: An Introduction（第 2 版）
# @authors: Richard Sutton, Andrew Barto
# @year: 2018
# @venue: MIT Press（作者官网免费全本）
# @tag: 教材
# @desc: 强化学习的标准教材：MDP、动态规划、TD 学习到策略梯度的完整路线。
# @page: http://incompleteideas.net/book/the-book-2nd.html
# @pdf64: aHR0cDovL2luY29tcGxldGVpZGVhcy5uZXQvYm9vay9STGJvb2syMDIwLnBkZg==
# @local64: L3BhcGVycy9STGJvb2syMDIwLWY5ZTZiOTg3LnBkZg==
# @lsize: 69.7 MB
```

```paper
# @title: Q-learning（Q 学习）
# @authors: Chris Watkins
# @year: 1989
# @venue: Learning from Delayed Rewards（博士论文）
# @tag: 论文
# @desc: 离策略 TD 学习：不依赖环境模型也能收敛到最优值函数。
# @page: https://en.wikipedia.org/wiki/Q-learning
```

```paper
# @title: Playing Atari with Deep Reinforcement Learning（DQN）
# @authors: Mnih 等（DeepMind）
# @year: 2013
# @venue: arXiv:1312.5602
# @tag: 论文
# @desc: 卷积网络 + 经验回放：从像素直接学打游戏。
# @page: https://arxiv.org/abs/1312.5602
# @pdf64: aHR0cHM6Ly9hcnhpdi5vcmcvcGRmLzEzMTIuNTYwMg==
# @local64: L3BhcGVycy8xMzEyLjU2MDIucGRm
# @lsize: 0.5 MB
```

```paper
# @title: Proximal Policy Optimization Algorithms（PPO）
# @authors: John Schulman 等（OpenAI）
# @year: 2017
# @venue: arXiv:1707.06347
# @tag: 论文
# @desc: 用截断替代复杂约束：简单稳健的策略梯度，RLHF 时代的功臣。
# @page: https://arxiv.org/abs/1707.06347
# @pdf64: aHR0cHM6Ly9hcnhpdi5vcmcvcGRmLzE3MDcuMDYzNDc=
# @local64: L3BhcGVycy8xNzA3LjA2MzQ3LnBkZg==
# @lsize: 2.8 MB
```

```paper
# @title: AlphaGo
# @authors: David Silver 等（DeepMind）
# @year: 2016
# @venue: Nature 529
# @tag: 论文
# @desc: 蒙特卡洛树搜索 + 深度网络 + 自我对弈：围棋被攻克的技术报告。
# @page: https://en.wikipedia.org/wiki/AlphaGo
```

```paper
# @title: Direct Preference Optimization（DPO）
# @authors: Rafael Rafailov 等（斯坦福）
# @year: 2023
# @venue: arXiv:2305.18290 (NeurIPS 2023)
# @tag: 论文
# @desc: 证明语言模型自己就是隐式奖励模型：偏好对齐省掉 RL 的复杂管线。
# @page: https://arxiv.org/abs/2305.18290
# @pdf64: aHR0cHM6Ly9hcnhpdi5vcmcvcGRmLzIzMDUuMTgyOTA=
# @local64: L3BhcGVycy8yMzA1LjE4MjkwLnBkZg==
# @lsize: 1.2 MB
```
