---
title: 黑箱建模与输入输出关系
lesson_id: engineering-cybernetics/blackbox-input-output
prereqs:
  - engineering-cybernetics/systems-information-regulation
volume: 5
layer: L9
track:
  - optimization-control
  - scientific-computing
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - blackbox-model
  - input-output-gain
applications:
  - spacecraft-ground-test
  - process-industry
exits:
  - engineering
---

# 黑箱建模与输入输出关系

## 1. 开场钩子

地面测试台上的航天部件不允许随便拆开。工程师只能给定电压、温度或指令，再记录响应。看不见内部构造时，输入输出表就是第一张地图。

## 2. 直觉解释

黑箱模型不宣称知道每个内部零件，只承诺：给定输入，预测可测输出。它容易从数据更新，但换工况可能失效，也不能保证内部机理正确。给生产线某工位加人时，节拍未必线性改善，因为瓶颈会移动。

## 3. 正式定义

静态黑箱记作：

$$y=f(u)+\varepsilon.$$

局部增益近似为：

$$G(u)\approx\frac{f(u+\Delta)-f(u-\Delta)}{2\Delta}.$$

$\Delta$ 是探测步长，$\varepsilon$ 是测量误差。若 $G$ 随 $u$ 变化，系统是非线性的。

## 4. 分步例题

设阀门稳态流量为 $f(u)=\dfrac{6u}{1+u}$。

1. $u=0.5$ 时，$y=2$；
2. $u=1.5$ 时，$y=3.6$；
3. 平均割线增益为 $(3.6-2)/1=1.6$；
4. 在 $u=1$ 处导数是 $6/(1+1)^2=1.5$；
5. 小区间平均增益接近局部导数，区间拉远后会失真。

## 5. 动手实验

### 实验 1：拖动工作点读响应

```viz
{
  "type": "plot",
  "title": "阀门开度与稳态流量",
  "expr": "6*x/(1+x)",
  "xmin": 0,
  "xmax": 5,
  "sliders": [
    { "name": "probe", "min": 0.2, "max": 4.8, "step": 0.1, "value": 1 }
  ]
}
```

横轴是输入开度，纵轴是稳态输出。低开度曲线较陡，高开度趋于饱和，这就是典型的饱和型非线性。

### 实验 2：用对称探测估局部增益

```python title="黑箱探针"
# sliders: center=1.0 [0.3:4.0:0.1], delta=0.2 [0.02:0.60:0.02]
def blackbox(u):
    return 6.0 * u / (1.0 + u)

up = blackbox(center + delta)     # 向右探测一次
down = blackbox(center - delta)   # 向左探测一次
gain = (up - down) / (2 * delta)

print(f"探测区间=[{center-delta:.2f}, {center+delta:.2f}]")
print(f"平均输出增益={gain:.3f}")
print(f"中心输出={blackbox(center):.3f}")
```

把中心滑到 4 附近，曲线几乎平了，增益明显变小。真实测试还会叠加噪声，$\Delta$ 太小会被误差淹没。

## 6. 练习

```exercise
# @title: 练习：由三次测量估计割线斜率
# @check: 1.600
# @hint: 割线增益等于输出差除以输入差，不要用相邻两点各自的比例。
def f(u):
    return 6.0 * u / (1.0 + u)

a, b = 0.5, 1.5
slope = (a - b) / (b - a)   # 错：分子用成了输入差，方向也反了
print(f"{slope:.3f}")
```

<details>
<summary>点开查看逐步解答</summary>

正确分子应是 $(f(b)-f(a))=(3.6-2)=1.6$，分母是 $1.0$，所以斜率是 $1.6$。初始代码把分子写成输入差，方向也反了。

</details>

## 7. 概念快问快答

```quiz
黑箱模型最应该被质疑的是什么？
- 图画得不够漂亮
- 换到训练数据之外的工作点是否仍然有效 [*]
- 输入变量名太短
? 黑箱只保证在已观测范围内拟合输入输出关系，机理外推风险最大。
```

## 8. 常见误区

:::warning[常见误区]

**误区一**：你以为黑箱等于无规律。它仍然有明确输入、输出和适用范围。

**误区二**：你以为一次阶跃响应足够。非线性、时变和噪声都需要多工况验证。

**误区三**：你以为拟合好就是理解了系统。预测成功不等于内部机制已被证明。

:::

## 9. 选读：静态与动态黑箱

<details>
<summary>选读 · 记忆效应</summary>

静态模型中当前输出只依赖当前输入；动态系统的输出还依赖过去输入。比如电容电压、热惯性、订单积压都会带来记忆。下一课用“状态”显式保存这些历史影响。

</details>

## 10. 下一站

打开一点黑箱，把可测输出、隐藏状态和扰动分开，是下一课的任务。

→ [状态、观测与扰动](./25-state-observation-disturbance.md)
