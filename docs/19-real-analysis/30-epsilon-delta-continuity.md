---
title: 函数极限与连续性
lesson_id: real-analysis/epsilon-delta-continuity
prereqs:
  - real-analysis/cauchy-sequences
volume: 2
layer: L8
track:
  - analysis-change
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - epsilon-delta
applications:
  - numerical-stability
  - error-control
exits:
  - research
  - engineering
---

# 函数极限与连续性

## 1. 从一个场景开始

“想多近有多近”还不够严格：谁先给定？允许多远？epsilon-delta 语言的规则是——先给出输出误差 $\epsilon$，再寻找输入半径 $\delta$。

## 2. 直觉解释

要证

$$\lim_{x\to a}f(x)=L,$$

就要对每个 $\epsilon>0$ 找到 $\delta>0$，使得：

$$0<|x-a|<\delta\Rightarrow |f(x)-L|<\epsilon.$$

若函数在 $a$ 处有定义且 $L=f(a)$，则称 $f$ 在 $a$ 连续。

## 3. 正式定义

| 量 | 控制对象 |
| --- | --- |
| $\epsilon$ | 输出值 $f(x)$ 与 $L$ 的距离 |
| $\delta$ | 输入值 $x$ 与 $a$ 的距离 |
| $0<\lvert x-a\rvert$ | 极限不看 $a$ 本身 |
| 连续 | 极限值等于函数值 |

$\delta$ 不唯一。找到一个可行半径后，任何更小的正半径也可行。

## 4. 分步例题

取

$$f(x)=\frac{x^2-4}{x-2},\qquad a=2,\qquad L=4.$$

1. 当 $x\ne2$ 时，$f(x)=x+2$；
2. $\lvert f(x)-4\rvert=\lvert x-2\rvert$；
3. 要让它小于 $\epsilon$，取 $\delta=\epsilon$；
4. 因此极限为 4；
5. 若补充定义 $f(2)=4$，函数在 2 连续。

## 5. 动手实验

### 实验 1：epsilon-delta 探针

```viz
{
  "type": "epsilon-delta-probe",
  "title": "自动寻找 delta",
  "expr": "(x^2-4)/(x-2)",
  "a": 2,
  "limit": 4,
  "epsilon": 0.5
}
```

缩小 $\epsilon$，观察橙色输入半径同步变小。拖动中心点，检查其他位置的连续性。

### 实验 2：图像对照

```viz
{
  "type": "plot",
  "title": "可去间断点：f(x)=x+2",
  "expr": "(x^2-4)/(x-2)",
  "xmin": 0,
  "xmax": 4
}
```

图像缺一个点，但附近高度被 4 牢牢控制。这正是可去间断点。

### 实验 3：Python 检查 delta

```python title="验证 delta=epsilon"
def f(x):
    return (x * x - 4) / (x - 2)

epsilon = 0.5
delta = epsilon
worst = 0.0
for k in range(1, 1000):
    x = 2 - delta + 2 * delta * k / 1000
    if x == 2:
        continue  # continue：跳过本轮循环，直接进入下一个 k
    error = abs(f(x) - 4)
    worst = max(worst, error)

print(round(worst, 4))
print("valid" if worst < epsilon else "invalid")
```

输出 `0.499` 和 `valid`。

## 6. 练习

```exercise
# @title: 练习：修正 delta
# @check: 0.5
# @check: valid
# @hint: 对这个函数，|f(x)-4|=|x-2|，所以 delta 可以取 epsilon。
def f(x):
    return (x * x - 4) / (x - 2)

epsilon = 0.5
delta = epsilon ** 2
worst = 0.0
for k in range(1, 1000):
    x = 2 - delta + 2 * delta * k / 1000
    if x == 2:
        continue  # continue：跳过本轮循环，直接进入下一个 k
    worst = max(worst, abs(f(x) - 4))

print(round(delta, 3))
print("valid" if worst < epsilon else "invalid")
```

<details>
<summary>点开查看逐步解答</summary>

因为化简后 $f(x)=x+2$，所以：

```text
|f(x)-4|=|x-2|
```

要小于 $\epsilon$，可取：

```python
def f(x):
    return (x * x - 4) / (x - 2)

epsilon = 0.5
delta = epsilon
worst = 0.0
for k in range(1, 1000):
    x = 2 - delta + 2 * delta * k / 1000
    if x != 2:
        worst = max(worst, abs(f(x) - 4))

print(round(delta, 3))
print("valid" if worst < epsilon else "invalid")
```

当 $\epsilon=0.5$ 时，$\delta=0.5$。数值扫描的最大误差小于 0.5。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：容易颠倒顺序，先找 $\delta$ 再给 $\epsilon$。定义是任意 $\epsilon$ 先出现，然后找可行 $\delta$。

**误区二**：容易以为 $\delta$ 必须是最大值。定义只要求存在一个可行半径。

**误区三**：容易默认函数值必须存在。极限只看 $x$ 附近的点，不看 $a$ 本身。

:::

## 8. 快问快答

```quiz
f 在 a 连续等价于什么？
- f(a) 存在
- 极限存在
- 极限存在且等于 f(a) [*]
? 连续要把“附近的归宿”和“这一点的值”接上，缺一不可。
```

## 9. 选读：不一致的例子

<details>
<summary>选读 · 为什么 $1/x$ 在 0 附近麻烦</summary>

考虑 $f(x)=1/x$。无论把 $x$ 控制在离 0 多近，只要允许 $x$ 取很小的正数，$f(x)$ 就会非常大。因此不存在能保证 $|f(x)-L|<1$ 的 $\delta$。这不是找不到精确 $L$，而是输出本身无法被有限带罩住。“一致”的完整正形在下一课：哪怕输出处处有限，$\delta$ 仍可能随位置塌缩到没有下限——见 [一致连续：ε 不许看位置](./32-uniform-continuity.md)。

</details>

## 10. 下一站

单点的连续可靠，不代表整条区间雇得起一把通用 $\delta$ 尺。下一课先给“一致”立正形：同一个 $\epsilon$，能否不看位置、全域通用。看完它，再去比较函数列的逐点收敛与一致收敛。

→ [一致连续：ε 不许看位置](./32-uniform-continuity.md)
