---
title: 灵敏度函数
lesson_id: engineering-cybernetics/sensitivity-function
prereqs:
  - engineering-cybernetics/nyquist-stability-tour
volume: 5
layer: L9
track:
  - optimization-control
  - scientific-computing
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - sensitivity-function
  - complementary-sensitivity
applications:
  - antenna-tracking
  - process-control-tuning
exits:
  - engineering
---

# 灵敏度函数

## 1. 开场钩子

天线跟踪卫星时，风扰会让视轴偏移；但传感器噪声又会通过同一回路进入指令。灵敏度函数就是这本账：它告诉你每个频率压掉多少扰动，又放进多少测量噪声。

## 2. 直觉解释

单位负反馈中，输出对扰动的传递是：

$$S=\frac{1}{1+L}.$$

$|S|$ 小表示扰动被抑制；$|S|$ 大表示系统对该频段敏感。输出对参考的补灵敏度是：

$$T=\frac{L}{1+L}=1-S.$$

低频常希望 $|S|$ 小，高频常希望 $|T|$ 小。两者不能同时在所有频率都小，这就是水床效应。

## 3. 正式定义与裕度关系

Nyquist 曲线上任一点到 $-1$ 的距离是 $|1+L|$，因此：

$$|S|=\frac{1}{\text{dist}(L,-1)}.$$

曲线越靠近临界点，灵敏度峰值 $M_s=\max_\omega|S(j\omega)|$ 越大。工程上常用上限约束，例如 $M_s<2$。

## 4. 分步例题

设某频率处 $L=0.8-0.6j$。

1. $1+L=1.8-0.6j$；
2. 模为 $\sqrt{1.8^2+(-0.6)^2}\approx1.897$；
3. 灵敏度模约为 $1/1.897\approx0.527$；
4. 扰动幅值若为 2，稳态残留约 1.054；
5. 补灵敏度模可由 $|1-S|$ 的复数计算，不能简单用 $1-0.527$。

## 5. 动手实验

### 实验 1：扫频看灵敏度峰

```python title="一阶回路的有限频率扫描"
# sliders: K=2.0 [0.5:6.0:0.1]
frequencies = [0.05, 0.10, 0.20, 0.50, 1.00, 2.00, 5.00] # 频率终点只取到 5
sensitivities = []
for omega in frequencies:
    re = K / (1 + omega * omega)      # 例题回路的实部
    im = -K * omega / (1 + omega * omega)
    denominator = (1 + re) ** 2 + im ** 2
    sensitivities.append((denominator ** -0.5))

worst = max(sensitivities)            # 取峰值，评估最坏频点
print("频率=" + ", ".join(f"{w:.2f}" for w in frequencies))
print("|S|=" + ", ".join(f"{value:.3f}" for value in sensitivities))
print(f"峰值Ms={worst:.3f}")
```

增大增益通常让低频 $|S|$ 变小，但也可能把某个频段的峰推高。改参数时不要只看直流值。

### 实验 2：Nyquist 距离的几何感

```viz
{
  "type": "plot",
  "title": "回路增益越大，单位扰动残留越小",
  "expr": "load/sqrt(1+x*x)",
  "xmin": 0,
  "xmax": 6,
  "sliders": [
    { "name": "load", "min": 0.2, "max": 2, "step": 0.1, "value": 1 }
  ]
}
```

这是简化示意：横轴代表回路强度，纵轴代表残留比例。真实设计还要检查相位滞后处的峰。

## 6. 练习

```exercise
# @title: 练习：计算某频点的灵敏度
# @check: 0.527
# @hint: 先求 |1+L|，再取倒数。
re_l = 0.8
im_l = -0.6
distance_squared = (re_l + 0.6) ** 2 + im_l ** 2
sensitivity = distance_squared * 2
print(round(sensitivity, 3))
```

<details>
<summary>点开查看逐步解答</summary>

$1+L=1.8-0.6j$，距离平方是 $1.8^2+(-0.6)^2=3.60$；开方后约 $1.897$，倒数约 $0.527$。初始代码把距离算成了 $(0.8+0.6)^2$，又用乘 2 代替了取倒数。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为 $T=1-S$ 可以逐点用实数相减。它们是复变函数，等式要在复数意义下理解。

**误区二**：你以为低频性能好就安全。中频 $M_s$ 峰可能才是失稳前兆。

**误区三**：你以为约束越多越好。性能、鲁棒性和执行器能量必须一起权衡。

:::

## 8. 选读：加权灵敏度

<details>
<summary>选读 · 设计指标</summary>

工程中会给不同频段配权重：低频权重强调跟踪和抗扰，高频权重限制噪声和控制量。混合灵敏度设计就是在若干 $S$、$T$ 和控制输入函数之间寻找可行折中，而不是追求单一最优。

</details>

## 9. 快问快答

```quiz
灵敏度峰值 Ms 过大说明什么？
- 所有频率都被强抑制
- 曲线离临界点很近，参数漂移风险高 [*]
- 执行器一定饱和
? Ms 大表示某个频段的误差放大严重，稳定裕度通常不足。
```

## 10. 下一站

下一课把模型误差、执行器饱和和时间延迟加入同一张权衡表，正式讨论鲁棒控制的代价。

→ [鲁棒控制的权衡](./50-robust-control-tradeoff.md)
