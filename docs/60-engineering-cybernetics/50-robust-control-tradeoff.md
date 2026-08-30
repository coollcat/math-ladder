---
title: 鲁棒控制的权衡
lesson_id: engineering-cybernetics/robust-control-tradeoff
prereqs:
  - engineering-cybernetics/sensitivity-function
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
  - robust-margin
  - performance-robustness-tradeoff
applications:
  - reusable-launcher
  - grid-inverter-control
exits:
  - engineering
---

# 鲁棒控制的权衡

## 1. 开场钩子

可回收火箭从稠密大气进入真空，质量、气动力和执行器效率都在变。控制器如果只对名义模型最快，飞行条件稍变就可能失稳；鲁棒控制主动牺牲一部分速度，换取所有允许偏差下仍可用。

## 2. 直觉解释

鲁棒性不是“更强”，而是“在集合内都不失败”。设计者先声明不确定性集合：参数漂移范围、未建模滞后、传感器噪声和执行器限幅。然后检查最坏工况，而不是平均工况。

三个目标互相拉扯：

1. 快速跟踪要求高带宽；
2. 抗扰动要求低灵敏度；
3. 抗不确定要求留裕度和降噪声。

## 3. 正式表述

设名义回路为 $L_0$，乘性不确定性写成：

$$L(s)=L_0(s)\bigl(1+W_m(s)\Delta(s)\bigr),\qquad |\Delta|\le1.$$

$W_m$ 描述各频率的不确定幅度。粗略的小增益检查要求：

$$|T(j\omega)|<\frac{1}{|W_m(j\omega)|}.$$

$T$ 是补灵敏度。这个条件保守但有用：它给出可验证的充分边界。

## 4. 分步例题

设增益可能在 $0.8$ 到 $1.25$ 倍间漂移。

1. 名义增益为 1；
2. 低频相对误差不超过 25%；
3. 若设计要求 $|T|<4$，该慢漂移满足必要余量；
4. 但相位滞后可能另增风险，不能只用增益判断；
5. 最终还要在最坏角点做仿真，例如 $0.8$ 与 $1.25$ 各跑一遍。

## 5. 动手实验

### 实验 1：参数角点的有界扫描

```python title="增益与时间常数的最坏响应"
# sliders: target=1.0 [-1:1:0.1], horizon=20 [5:40:1]
gain_values = [0.80, 1.00, 1.25]       # 允许的增益角点
tau_values = [0.80, 1.00, 1.30]        # 允许的时间常数角点
h = 0.05                               # 步长：固定仿真间隔
end_time = horizon * h                 # 时间终点由滑块控制
max_steps = int(end_time / h)
results = []

for gain in gain_values:
    for tau in tau_values:
        state = 0.0                    # 初始被控量
        for step in range(max_steps):
            control = gain * (target - state) / tau   # 一阶闭环控制律
            state = state + h * control               # 有界 Euler 更新
        results.append(abs(target - state))

worst_error = max(results)
mean_error = sum(results) / len(results)
print(f"终点时间={end_time:.2f}s")
print(f"平均终态误差={mean_error:.4f}")
print(f"最坏终态误差={worst_error:.4f}")
```

把目标拖到极端值或延长终点时间，观察平均表现和最坏表现的差别。鲁棒设计看的是后者。

### 实验 2：带宽与裕度的静态折中

```viz
{
  "type": "plot",
  "title": "带宽提高后未建模滞后项上升",
  "expr": "bandwidth*x/sqrt(1+(x*bandwidth)**2)",
  "xmin": 0,
  "xmax": 3,
  "sliders": [
    { "name": "bandwidth", "min": 0.2, "max": 3, "step": 0.1, "value": 1 }
  ]
}
```

滑块代表设计带宽。带宽越高，中频动作越快，但对未建模相位滞后的暴露也越大。

## 6. 练习

```exercise
# @title: 练习：找出最坏角点误差
# @check: 0.250
# @check: 0.8
# @hint: 对比例控制，稳态误差大约 target/(1+gain)；增益最小的角点误差最大。
targets = [0.45]
gains = [1.25, 0.8]
errors = []
for target in targets:
    for gain in gains:
        errors.append(target - gain)   # 错：把增益从目标里减掉，量纲混乱
print(f"{max(errors):.3f}")
print(gains[0])
```

<details>
<summary>点开查看逐步解答</summary>

初始代码把分子写成 `target-gain`，量纲混乱。正确公式是 $e/(1+g)$；最大误差来自最小增益角点 $0.8$，第二个输出应报告这个最坏角点。

</details>

## 7. 常见误区

**误区一**：你以为鲁棒就是保守到不动。好的鲁棒设计明确放弃哪些性能，保留哪些硬边界。

**误区二**：你以为蒙特卡洛样本多就能覆盖一切。连续不确定集合需要角点、结构和物理约束辅助证明。

**误区三**：你以为延迟只是慢。纯滞后直接消耗相位裕度，常常比增益误差更危险。

## 8. 选读：H 无穷思想

<details>
<summary>选读 · 最坏频率加权</summary>

H 无穷方法寻找使某个加权闭环函数峰值最小的控制器，相当于问“最坏频率、最坏扰动下能压多好”。它不消除权衡，而是把权衡写成可优化的数学问题。

</details>

## 9. 快问快答

```quiz
鲁棒控制的首要对象是什么？
- 单一名义工况的平均最优
- 一组声明过的不确定工况都能保持安全 [*]
- 完全取消所有建模误差
? 鲁棒性总是相对不确定性集合而言；集合变了，结论也要重新验证。
```

## 10. 下一站

单个回路讲完后，系统规模变大。下一课讨论如何分解大系统并协调子系统。

→ [大系统分解与协调](./55-large-system-decomposition.md)
