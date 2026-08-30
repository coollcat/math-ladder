---
title: 一致连续：ε 不许看位置
lesson_id: real-analysis/uniform-continuity
prereqs:
  - real-analysis/epsilon-delta-continuity
  - real-analysis/monotone-bw
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
  - uniform-continuity
applications:
  - numerical-stability
  - error-control
exits:
  - research
  - engineering
---

# 一致连续：ε 不许看位置

## 1. 从一个场景开始

$\epsilon$-$\delta$ 连续性检查是**逐点服务**的：同一个输出公差 $\epsilon$，在平缓处 $\delta=0.5$ 也许够用，挪到陡峭处就得再收窄。每一点都雇得起自己的 $\delta$——这不等于整条区间雇得起一把**通用 $\delta$ 尺**。若全域真的共用一把尺，函数就叫**一致连续**。它与[单调有界必收敛与 Bolzano-Weierstrass](./25-monotone-bw.md) 一样，是"把逐点承诺升级为整体承诺"的工程；也和 40 号课的一字之差亲戚遥相呼应——那边管一列函数（$N$ 不许看 $x$），这边管单个函数（$\delta$ 不许看点）。

## 2. 直觉解释

三个选手，三种性格：

- $x^2$ 在 $\mathbb R$ 上：越远越陡。同一个 $\epsilon$，需要的 $\delta$ 随位置越收越窄，且**窄得没有下限**——每点都连续，全域却没有通用尺。这就是"连续但不一致连续"。
- $\left|x\right|$ 在 $\mathbb R$ 上：坡度处处是 1。$\delta=\epsilon$ 一把尺量遍无界区间——无界不妨碍一致连续。
- $\frac1x$ 在 $(0,1)$ 上：上一课的选读见过它在 0 附近输出爆表；换一个更普遍的视角——哪怕输出处处有限，靠近 0 处需要的 $\delta$ 仍按 $\epsilon x^2$ 塌缩到零。

决定性因素不是区间长不长、函数有没有界，而是：**同一 $\epsilon$ 需要的 $\delta$，会不会随位置漂移到没有下限**。

## 3. 正式定义

$f$ 在集合 $D$ 上一致连续，当且仅当：

$$\forall \epsilon>0,\ \exists \delta>0,\ \forall x,y\in D:\ \left|x-y\right|<\delta \Rightarrow \left|f(x)-f(y)\right|<\epsilon.$$

| 对象 | 连续（逐点） | 一致连续（全域） |
| --- | --- | --- |
| 先给定 | $\epsilon$ 与观察点 $a$ | 只给 $\epsilon$ |
| 后寻找 | 依赖 $a$ 的 $\delta(a)$ | 与位置无关的统一 $\delta$ |
| 失败形态 | 某点极限断裂 | $\delta$ 随位置塌缩、无下限 |

顺手登记一个速判工具：若存在常数 $L$ 使 $\left|f(x)-f(y)\right| \le L\left|x-y\right|$ 对全域成立（Lipschitz 条件），则 $\delta=\epsilon/L$ 立刻通用——一致连续一票通过。

## 4. 分步例题

**例 1 · $\left|x\right|$ 在 $\mathbb R$ 上一致连续。**

1. 用三角不等式推论：$\left|\left|x\right|-\left|y\right|\right| \le \left|x-y\right|$；
2. Lipschitz 常数 $L=1$；
3. 取 $\delta=\epsilon$：全域通用，一票通过。

**例 2 · $x^2$ 在 $[0,1]$ 上一致连续。**

1. 分解：$\left|x^2-y^2\right| = \left|x+y\right|\cdot\left|x-y\right|$；
2. 在 $[0,1]$ 上 $\left|x+y\right| \le 2$，故 $\left|x^2-y^2\right| \le 2\left|x-y\right|$；
3. 取 $\delta=\epsilon/2$——同一函数，区间一换就配上了通用尺。

**例 3 · $x^2$ 在 $\mathbb R$ 上不一致连续。**

1. 取 $\epsilon=1$，任给候选 $\delta>0$；
2. 取 $x=\frac1\delta$，$y=x+\frac\delta2$：两点相距半个 $\delta$，够近；
3. 计算：$\left|y^2-x^2\right| = (x+y)\cdot\frac\delta2 = \left(\frac{2}{\delta}+\frac\delta2\right)\cdot\frac\delta2 = 1+\frac{\delta^2}{4} > 1 = \epsilon$；
4. 无论 $\delta$ 多小都能抓到违例——通用尺不存在。数值对账：$\delta=0.1$ 时在 $x=10$ 处 $\left|10.05^2-10^2\right| = 1.0025 > 1$，恰好演出第 3 步。

## 5. 动手实验

### 实验 1：探针搬位置，看 δ 缩水

```viz
{
  "type": "epsilon-delta-probe",
  "title": "在 x^2 上拖动中心点：同一个 epsilon，delta 随位置缩水",
  "expr": "x^2",
  "a": 10,
  "limit": 100,
  "epsilon": 0.5,
  "xmin": 0,
  "xmax": 40
}
```

把中心点从 $a=10$ 挪向 $a=20$：橙色输入半径肉眼可见地减半。理论上 $\delta(\epsilon,a)\approx\frac{\epsilon}{2a}$——$a$ 翻倍，$\delta$ 腰斩，永远缩、没有下限。这就是"不一致"的现场。

### 实验 2：坡度对照图

```viz
{
  "type": "plot",
  "title": "x^2 越远越陡，abs(x) 坡度恒定",
  "expr": "x^2",
  "expr2": "abs(x)",
  "label": "x^2",
  "label2": "abs(x)",
  "xmin": 0,
  "xmax": 5
}
```

蓝线（$x^2$）越走越陡——割线斜率 $x+y$ 无上限；橙线（$\left|x\right|$）坡度恒为 1——这就是例 1 的 $L=1$。坡度有没有上限，决定了通用 $\delta$ 存不存在。

### 实验 3：Python 扫描割线斜率

```python title="[0,1] 上斜率有上限，扫到 [0,50] 就没了"
def worst_slope(x0, x1, step):
    worst = 0.0
    n = int((x1 - x0) / step)            # int：把区间长度折成采样份数
    for k in range(n):
        x = x0 + k * step
        y = x + step
        s = abs(y * y - x * x) / (y - x)  # 这一小段的割线斜率绝对值
        worst = max(worst, s)             # max：留下最陡纪录
    return worst

print(round(worst_slope(0, 1, 0.01), 4))    # [0,1] 上最陡约 1.99：天花板 2
print(round(worst_slope(0, 50, 0.01), 4))   # [0,50] 上最陡约 99.99：越扫越高

epsilon = 1.0
delta = 0.1
x = 10.0
y = x + delta / 2                           # 两点只相距半个 delta
jump = abs(y * y - x * x)
print(round(jump, 4))
print("no uniform delta" if jump >= epsilon else "delta still works")
```

输出 `1.99`、`99.99`、`1.0025`、`no uniform delta`。$[0,1]$ 上最陡割线不到 2——把 $\delta$ 取 $\epsilon/2$ 就全域安全；扫到 $[0,50]$，最陡纪录翻了 50 倍还在涨——同一把 $\delta=0.1$ 的尺子在 $x=10$ 处已经失效。

## 6. 练习

```exercise
# @title: 练习：从最陡割线反推统一的 delta
# @check: 1.99
# @check: 0.0503
# @check: uniform
# @hint: 越陡的坡需要的 delta 越小——统一的 delta 应该用 epsilon 除以最陡斜率，不是乘
epsilon = 0.1

worst = 0.0
for i in range(1, 100):
    x = i / 100                    # [0,1] 上的采样点
    y = x + 0.01                   # 它的邻居
    slope = abs(y * y - x * x) / abs(y - x)   # 这一小段的割线斜率
    worst = max(worst, slope)

delta = epsilon * worst            # ← 方向反了：斜率越陡，delta 该越小
print(round(worst, 4))
print(round(delta, 4))
print("uniform" if delta < epsilon else "leaked")
```

<details>
<summary>点开查看逐步解答</summary>

扫描本身是对的：$[0,1]$ 上最陡割线出现在 $x=0.99$ 处，$\dfrac{1^2-0.99^2}{0.01}=1.99$。错在反推方向——斜率越陡，$\delta$ 必须越小，所以是**除**不是乘：

```python
delta = epsilon / worst
```

$\dfrac{0.1}{1.99} \approx 0.0503 < 0.1$，判 `uniform`。对照理论：例 2 用 Lipschitz 上限 2 给出保守值 $\delta=\epsilon/2=0.05$；扫描实测上限 1.99，反推出 0.0503 略宽——理论给"必安全"的保守额度，扫描找"实测够用"的额度，两者方向一致。
</details>

## 7. 常见误区

::::warning[常见误区]

**误区一**：容易把"每点都连续"当成"全域共用一把 $\delta$"。$x^2$ 在 $\mathbb R$ 上每点都连续，但 $\delta$ 随位置塌缩、没有下限——逐点合格，整体不合格。

**误区二**：容易以为无界区间必不一致连续。$\left|x\right|$ 在整个 $\mathbb R$ 上一致连续（$\delta=\epsilon$ 通用）——决定性的是坡度有没有上限，不是区间长不长。

**误区三**：容易把一致连续与一致收敛混为一谈。一字之差，对象不同：一致收敛说的是一**列**函数逼近极限函数（$N$ 不许看 $x$，40 号课）；一致连续说的是**一个**函数在定义域上的连续承诺（$\delta$ 不许看点，本课）。

::::

## 8. 快问快答

```quiz
判断一个函数在整条定义域上是否一致连续，关键检查什么？
- 每个点是否都能找到自己的 delta
- 同一个 epsilon 对应的 delta 是否有全域通用的取法 [*]
- 函数是否严格递增
? 每点都有自己的 delta 只说明连续；一致连续要求这些 delta 不会随位置塌缩到零——存在与位置无关的统一取法。
```

## 9. 选读：闭区间上的连续必一致连续

<details>
<summary>选读 · Cantor 定理，与 Bolzano-Weierstrass 的会师</summary>

闭区间上连续的函数必一致连续（Cantor 定理）。证明骨架与[单调有界必收敛与 Bolzano-Weierstrass](./25-monotone-bw.md) 同款：反设不存在统一 $\delta$，就能对每个 $n$ 抓到一对点 $x_n,y_n$，距离小于 $\frac1n$ 而函数值差至少某个固定 $\epsilon_0$。$x_n$ 有界，Bolzano-Weierstrass 抽出收敛子列 $x_{n_k}\to c$；$y_{n_k}$ 被 $\frac1{n_k}$ 的距离拽着贴向 $c$。$c$ 处的连续性给出一个邻域，子列尾部全落进去，函数值差必小于 $\epsilon_0$——与构造矛盾。

另一个方向的收束：40 号课的"一致收敛"（$N$ 不依赖 $x$）与本课的"一致连续"（$\delta$ 不依赖点）是同一个语法在两个对象上的重演——把"逐点成立"升级为"全体共用一套常数"，代价与回报完全同构：更强的前提，换来可以整体交换的结论。

</details>

## 10. 下一站

连续的"全区通用版"检查完毕。下一课把"局部导数"与"整体增量"接成一座桥——中值定理；洛必达法则是它顺路捎回的礼物。

→ [中值定理与洛必达法则](./35-mean-value-lhopital.md)
