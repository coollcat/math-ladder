---
title: RLHF 概览
lesson_id: rl/rlhf-overview
prereqs:
  - rl/reward-hacking
volume: 5
layer: L11
track:
  - optimization-control
stage: research-elective
difficulty: 5
introduces_import: []
introduces_concepts:
  - preference-data
  - reward-model
applications:
  - assistant-alignment
  - content-safety
exits:
  - data-ai
---

# RLHF 概览

## 1. 开场钩子

“更有帮助”很难写成一条公式。于是先请人对模型回答做比较：A 比 B 更好。用这些偏好训练奖励模型，再用强化学习优化它，这就是 RLHF。

## 2. 直觉解释

RLHF 常见三步：

1. 收集同一提示下的多个回答；
2. 人标注哪个更好，形成偏好对；
3. 训练奖励模型给回答打分；
4. 用 PPO 等算法优化生成策略，使偏好分数升高，同时约束不偏离原语言模型。

人类反馈不是绝对真理：标注不一致、人口偏差、可被讨好性都会进入奖励模型。

## 3. 正式定义

给定偏好数据 $(y_w\succ y_l\mid x)$，Bradley-Terry 模型假设：

$$P(y_w\succ y_l\mid x)=\sigma(r_\phi(x,y_w)-r_\phi(x,y_l)).$$

其中 $\sigma$ 是 logistic 函数，$r_\phi$ 是奖励模型。策略优化目标常包含 KL 罚：

$$\max_\pi\mathbb E[r_\phi(x,y)]-\beta\,\mathrm{KL}(\pi\Vert\pi_0).$$

$\beta$ 控制“变得更有帮助”和“不像原模型”之间的平衡。

## 4. 分步例题

两个回答：

1. 回答 A 直接给出推导但略长；
2. 回答 B 只说“正确”却很短；
3. 标注者选 A；
4. 奖励模型学习让 $r(A)$ 高于 $r(B)$；
5. 若只优化该分数，模型可能学会冗长讨好，因此需要 KL 和持续评估。

## 5. 动手实验

下面用教学规模的小样本训练一个线性偏好分数，并检查它在保留样本上的方向是否正确。

```python title="两特征偏好模型的梯度上升"
import random  # 打乱训练顺序

random.seed(210)                    # 固定随机种子
MAX_EPOCHS = 200                    # 最大训练轮数
LEARNING_RATE = 0.08                # 学习率

# 每个样本是 (x_w, x_l)，特征为 [有帮助程度, 长度]；人偏好第一个。
preference_pairs = [
    ([2.0, 4.0], [0.2, 0.5]),
    ([1.5, 1.0], [0.8, 3.0]),
    ([2.5, 2.0], [1.0, 4.0]),
    ([0.9, 0.2], [0.1, 0.1]),
]

weights = [0.0, 0.0]                # weights 是线性奖励模型的参数

def dot(a, b):                      # a,b 是等长数值列表
    return sum(ai * bi for ai, bi in zip(a, b))

def sigmoid(z):                     # sigmoid 把任意实数压到 0..1
    return 1 / (1 + pow(2.718281828459045, -z))

for epoch in range(MAX_EPOCHS):
    random.shuffle(preference_pairs)   # 就地打乱列表顺序
    total_correct = 0
    for better, worse in preference_pairs:
        margin = dot(weights, better) - dot(weights, worse)
        predicted = sigmoid(margin)
        if predicted > 0.5:
            total_correct += 1
        grad_scale = LEARNING_RATE * (1 - predicted)   # 简化正样本梯度
        for j in range(2):
            weights[j] += grad_scale * (better[j] - worse[j])
    if epoch in [0, MAX_EPOCHS - 1]:
        print("epoch", epoch + 1,
              "weights", [round(w, 4) for w in weights],
              "train accuracy", round(total_correct / len(preference_pairs), 3))
```

:::warning[常见误区]

- 你以为 RLHF 就是监督学习模仿人类答案，它优化的是比较信号导出的奖励。
- 你以为奖励分越高越好，分数可能被风格、长度或讨好性利用。
- 你以为 KL 只是技术项，它防止策略为了奖励而灾难性地偏离原分布。

:::

## 6. 练习

```exercise
# @title: 判断偏好概率方向
# @check: 更可能被偏好
# @hint: 分数差距越大，Bradley-Terry 模型给出的胜率越高。
r_better = 2.5
r_worse = 0.8
verdict = "不确定"
# 学生应判断 r_better > r_worse 时应输出什么
print(verdict)
```

<details><summary>点开查看逐步解答</summary>

$r(y_w)>r(y_l)$ 时差值为正，sigmoid 后概率大于 0.5，所以更可能被偏好。可用条件语句设置 `verdict="更可能被偏好"`。

</details>

## 7. 选读边界

RLHF 的奖励模型只是人类偏好的有损压缩。在线迭代、多样标注者建模、不确定性估计和红队评估都是缓解过拟合单一评分函数的方法。

## 8. 下一站

如果不先训练显式奖励模型，能不能直接从偏好里优化策略？这就是 DPO 的思想入口。

→ [220 · DPO 思想预告](./220-dpo-preview.md)
