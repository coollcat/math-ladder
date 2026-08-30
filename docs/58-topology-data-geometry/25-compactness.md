---
title: 紧致性直觉
lesson_id: tdg/compactness
prereqs:
  - tdg/connectedness
volume: 5
layer: L8
track:
  - geometry-space
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - compactness
applications:
  - optimization-search
exits:
  - engineering
---

# 紧致性直觉

## 1. 开场钩子

在一张无限长的地图上找最低点，你可能一直往远处走却发现更低的谷。若地图是有界闭区域，搜索范围就“跑不掉”；这种跑不掉的性质就是紧致性的实用版本。

## 2. 直觉解释

在欧氏空间里，闭且有界是最容易使用的紧致直觉。闭意味着极限点没有被挖掉，有界意味着整体装进一个大盒子。

更拓扑的说法是有限子覆盖：无论用多少开集去罩住空间，总能挑出有限个仍然罩住全部。这保证许多“无限问题”能压缩成有限检查。

## 3. 正式定义

设 $\mathcal U$ 是 $X$ 的一族开集。若 $X\subset\bigcup_{U\in\mathcal U}U$，称其为开覆盖。若每个开覆盖都有有限子族仍覆盖 $X$，则称 $X$ 紧致。

Heine-Borel 定理说：$\mathbb R^n$ 的子集紧致当且仅当有界且闭。例如 $[0,1]$ 紧致；$(0,1]$ 有界但不闭，不紧致；$[0,\infty)$ 闭但有界失败，也不紧致。

## 4. 分步例题

考虑函数 $f(x)=x^2$。

1. 在 $[-2,2]$ 上，最大值和最小值都存在，分别是 4 和 0；
2. 在 $(-2,2)$ 上，最小值不存在，因为 0 被挖掉；
3. 在 $(-\infty,\infty)$ 上，没有最大值，因为 $x$ 可无限增大；
4. 前两种失败分别对应“不闭”和“无界”，而 $[-2,2]$ 闭且有界，因此紧致。

## 5. 动手实验

```viz
{
  "type": "plot",
  "title": "抛物线谷底位置的移动示意",
  "expr": "(x - a) ^ 2 + b",
  "xmin": -3,
  "xmax": 3,
  "sliders": [
    { "name": "a", "min": -2.5, "max": 2.5, "step": 0.05, "value": 0 },
    { "name": "b", "min": 0, "max": 2, "step": 0.1, "value": 0 }
  ]
}
```

把谷底中心 $a$ 拖到接近但不在端点的位置时，闭区间仍有最低点。想象把谷底移到 $x=0$ 并挖掉 0，开区间就只剩“越来越低”而没有最低。

```python title="在有界网格上近似搜索"
low = -2.0
high = 2.0
steps = 41
best_x = low          # best_x：当前最好样本的位置
best_y = None         # None 表示还没有值

for k in range(steps):
    x = low + (high - low) * k / (steps - 1)
    y = (x - 0.3) ** 2 + 0.1
    if best_y is None or y < best_y:
        best_y = y
        best_x = x

print(best_x, best_y)
```

网格搜索只能近似极值，但紧致闭区间保证真实极值不会被无限逃逸或缺失极限点吞掉。

## 6. 练习

```exercise
# @title: 练习：筛选紧致区间
# @check: compact
# @check: not compact
# @check: not compact
# @hint: 在实数轴上依次检查两个条件：是否有界？端点和极限点是否都在集合内？
regions = {
    "closed_box": "closed and bounded",
    "open_end": "bounded but open",
    "half_line": "closed but unbounded",
}

labels = {
    "closed_box": "unknown",
    "open_end": "unknown",
    "half_line": "unknown",
}

for name in labels:
    print(labels[name])
```

<details>
<summary>点开查看逐步解答</summary>

`[-2,2]` 闭且有界，标签为 `compact`。`[-2,2)` 不含右端点，不闭。`[0,inf)` 无界。注意这段示意代码只是记录答案表；标准 Python 不能直接写半开区间数学记号，正式实现可用条件函数：

```python
labels = {
    "closed_box": "compact",
    "open_end": "not compact",
    "half_line": "not compact",
}
for name in labels:
    print(labels[name])
```

判题只要求三行输出顺序正确。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为紧致就是很小。单位闭区间不大，但无穷远直线不紧致；关键是有限子覆盖，不是视觉大小。

**误区二**：你以为有界就够了。$(0,1)$ 有界却不闭，极值可能缺失。

**误区三**：你以为所有度量空间都用闭且有界判断。Heine-Borel 只对欧氏空间成立，一般度量空间还要补完备性与全有界。

:::

## 8. 选读：为什么连续函数保紧致

<details>
<summary>选读 · 极值定理的地基</summary>

若 $f:X\to\mathbb R$ 连续且 $X$ 紧致，则像 $f(X)$ 也是紧致的实数子集，因此有界且闭，必有最大值和最小值。这就是闭区间上连续函数极值定理的拓扑核心。

优化算法常假设可行域紧致或至少水平集紧致；否则即使目标值单调下降，也可能没有可达到的最优解。

</details>

## 9. 下一站

紧致控制“跑不掉”，但还不保证不同点能被邻域分开。下一站讨论 Hausdorff 条件。

→ [Hausdorff 与分离条件选讲](./30-hausdorff.md)
