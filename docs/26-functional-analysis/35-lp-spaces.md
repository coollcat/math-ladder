---
title: Lp 空间：可积函数的家
lesson_id: functional-analysis/lp-spaces
prereqs:
  - functional-analysis/norm-completion
  - functional-analysis/banach-spaces
  - measure-lebesgue/lebesgue-integral
volume: 2
layer: L8
track:
  - analysis-change
stage: research-elective
difficulty: 5
introduces_concepts:
  - lp-space
  - square-integrable
applications:
  - signal-energy
  - probability-density
exits:
  - research
  - data-ai
---

# Lp 空间：可积函数的家

## 1. 开场钩子

上一课的误区里出现过一句话：“连续函数在 $L_1$ 尺子下可能收敛到不连续函数”——可那把 $L_1$ 尺子量函数到底量的是什么？[第 25 章](../25-measure-lebesgue/60-probability-as-measure.md)结尾承诺过：“$L^p$ 空间登场，傅里叶分析获得完整的家”。本课兑现承诺：给 $p$ 次可积的函数正式安家——$L^p$ 家族，以及其中最重要的成员 $L^2$（平方可积），它即将是下一课 Hilbert 空间的正版住户。

## 2. 直觉解释

[范数课](./20-norm-completion.md)给有限维向量发过三把尺子：$L_1$ 看总偏差、$L_2$ 看能量、$L_\infty$ 看峰值。现在把同一套尺子搬到函数身上——把函数在每一点的取值想成无穷多个坐标分量：

- $\lVert f\rVert_1$：曲线与横轴围出的**总面积**（总偏差多少）；
- $\lVert f\rVert_2$：曲线的**总能量**（先平方再积分再开方）；
- $\lVert f\rVert_\infty$：曲线的**最高峰**（最大偏差）。

三把尺子量同一个函数，答案可以天差地别：一根又窄又高的针，$L_\infty$ 尺子下是巨人，$L_1$ 尺子下却是侏儒。所以“可积”从来不是一句话，而是按尺子发的不同户口：$L^1$、$L^2$、$L^\infty$ 是三个不同的家，一个函数可能在这家有户籍、在另一家被除名。

## 3. 正式定义

设 $\Omega$ 是可测区域，$1 \le p < \infty$，定义

$$L^p(\Omega) = \Big\lbrace f \;:\; \int_\Omega \lvert f\rvert^p\,d\mu < \infty \Big \rbrace, \qquad \lVert f\rVert_p = \Big( \int_\Omega \lvert f\rvert^p\,d\mu \Big)^{1/p}$$

以及 $p = \infty$ 的极限情形 $\lVert f\rVert_\infty = \operatorname{ess\,sup}\lvert f\rvert$（本质峰值：挖掉零测集后的最小上界）。序列版记作 $\ell^p = \lbrace x : \sum \lvert x_i\rvert^p < \infty \rbrace$，$\lVert x\rVert_p = (\sum \lvert x_i\rvert^p)^{1/p}$。

| 空间 | 尺子量什么 | 谁住在里面 |
| --- | --- | --- |
| $L^1$ | 总面积（积分绝对值） | 可积的信号、密度 |
| $L^2$ | 能量（平方可积） | 傅里叶分析、量子波函数、下一课的 Hilbert 正版住户 |
| $L^\infty$ | 峰值 | 有界函数、控制论的“绝不超限” |

两点户口章程：其一，$\lVert f\rVert_p = 0$ 只说明 $f$ 在零测集外为零——所以 $L^p$ 里“差一个零测集”的函数算同一户（第 27 章等价关系课的原话在这里落地）；其二，三角不等式（Minkowski 不等式）保证 $L^p$ 是赋范空间，而完备性让它成为 Banach 空间——[Banach 课](./30-banach-spaces.md)的“没有洞的地板”函数版也有。

## 4. 分步例题

**例 1**：函数 $f(x) = \dfrac{1}{\sqrt{x}}$ 在 $(0, 1]$ 上的户口。

1. $L^1$ 审查：$\displaystyle\int_0^1 x^{-1/2}\,dx = \Big[2\sqrt{x}\Big]_0^1 = 2$，有限——$L^1$ 有户籍；
2. $L^2$ 审查：$\displaystyle\int_0^1 x^{-1}\,dx = \ln 1 - \lim_{a\to 0^+} \ln a = \infty$，发散——$L^2$ 除名；
3. 结论：同一个函数，$L^1$ 收留、$L^2$ 拒收。奇点在 0 附近的“脾气”（$x^{-1/2}$ 比可积的 $x^{-1/2+\varepsilon}$ 陡多少）决定一切，尺子不同，判决不同。

**例 2**：离散信号 $x = (3, -4, 12)$ 的三种长度（范数课的老朋友，回炉对账）。

1. $\ell^1$：$3 + 4 + 12 = 19$；
2. $\ell^2$：$\sqrt{9 + 16 + 144} = 13$；
3. $\ell^\infty$：$\max(3, 4, 12) = 12$；
4. 三把尺子、三个读数——但固定维数下互相控制（一尺小则三尺皆小）；函数版没有这份“控制”，这正是本课存在的理由。

## 5. 动手实验

### 实验 1：尖峰与平缓的同框对照

```viz
{
  "type": "plot",
  "title": "尖峰 f1（高 3）与平缓 f2（宽而矮 1）",
  "expr": "3*exp(-400*x^2)",
  "expr2": "exp(-x^2)",
  "xmin": -3,
  "xmax": 3
}
```

怎么玩：蓝色是“高 3、极窄”的尖峰 $f_1 = 3e^{-400x^2}$，橙色虚线是“宽而缓”的 $f_2 = e^{-x^2}$。用眼睛先猜：哪根曲线的“长度”大？答案取决于你用哪把尺子——下一实验逐点对拍。

### 实验 2（python 滑块）：Lp 排序随 p 翻转

```python title="两根曲线的 Lp 范数对拍"
# sliders: p=2 [1:8:0.5]
import math               # math.exp：指数函数（e 登场课的手艺）

N = 3000                  # 在 [-3, 3] 上切 3000 个样本点
h = 6.0 / N
s1 = 0.0
s2 = 0.0
for i in range(N):
    x = -3.0 + (i + 0.5) * h      # 中点采样
    f1 = 3.0 * math.exp(-400.0 * x * x)   # 尖峰：高 3、极窄
    f2 = math.exp(-x * x)                  # 平缓：宽而矮
    s1 = s1 + abs(f1) ** p * h     # abs：绝对值；累加 |f1|^p
    s2 = s2 + abs(f2) ** p * h

n1 = s1 ** (1.0 / p)   # 开 p 次方根：这才是范数（别忘了量纲）
n2 = s2 ** (1.0 / p)
if n1 > n2:            # if/else：根据两把读数宣布赢家
    winner = "尖峰"
else:
    winner = "平缓"
print(f"p={p}: 尖峰 ||f1||={round(n1, 3)} | 平缓 ||f2||={round(n2, 3)} | 赢家={winner}")
```

怎么玩：$p=1$ 时平缓者大胜（$1.772$ 对 $0.266$——$L^1$ 看总面积，尖峰太窄吃亏）；$p=2$ 时平缓仍领先（$1.120$ 对 $0.751$）；把 $p$ 拖到 $4$，尖峰反超（$1.376$ 对 $0.970$——$L^\infty$ 的方向上，峰值 3 开始当家）。**同一个函数对，换个 $p$ 就换赢家**——“哪个函数更长”这个问题本身依赖尺子。

### 实验 3（python）：L1 尺子下，连续函数的“失踪案”

```python title="sigmoid 逼近阶跃：L1 距离走向 0"
import math               # math.exp：指数函数（e 登场课的手艺）

def l1_dist(n, N):
    # 连续 sigmoid 1/(1+e^(-n(x-0.5))) 与不连续阶跃 H(x) 的 L1 距离；N 是采样块数
    h = 1.0 / N
    total = 0.0
    for i in range(N):
        x = (i + 0.5) * h
        s = 1.0 / (1.0 + math.exp(-n * (x - 0.5)))   # math.exp：指数函数 e 的幂（e 登场那课的手艺）
        if x < 0.5:
            total = total + s * h           # 阶跃左侧：H=0，差为 s
        else:
            total = total + (1.0 - s) * h   # 阶跃右侧：H=1，差为 1−s
    return total

for n in [10, 100, 1000]:
    print(f"n={n}: L1 距离 ≈ {round(l1_dist(n, 4000), 4)}")
```

怎么玩：读数 $0.137 \to 0.014 \to 0.001$，一路归零——连续函数列在 $L^1$ 尺子下越来越近，可它们的“极限”是不连续的阶跃函数。上一课误区一的现象在此完整复现：**连续函数的家在 $L^1$ 尺子下有洞**，补洞后的 $L^p$ 空间必须收编不连续函数（勒贝格可积函数），这正是 25 章勒贝格积分当户口登记处的用途。

## 6. 常见误区

::::warning[常见误区]

**误区一**：你以为 $\lVert f\rVert_p$ 就是 $\int \lvert f\rvert^p$。还差最后一步开 $p$ 次方根——不开根号的“范数”连量纲都不对（$p=2$ 时量纲要开平方）。

**误区二**：你以为一个函数要么“可积”要么“不可积”。可积按尺子发证：$\frac{1}{\sqrt{x}}$ 在 $(0,1]$ 上 $L^1$ 有份、$L^2$ 除名——先问“在哪个 $L^p$”，再谈可积。

**误区三**：你以为 $L^2$ 和连续函数空间是一家。$L^2$ 更大：它装得下不连续的阶跃函数（平方可积），连续函数只是它的子集——实验 3 的失踪案正是两者的分界线。

::::

## 7. 练习

**练习 1**：算出信号 `[0.2, -0.8, 0.6, -0.1]` 的 $\ell^2$ 长度（范数课实验 2 的补完）。下面的代码能跑但结果不对，改到通过：

```exercise
# @title: 练习：补完 L2 能量尺
# @check: 1.0247
# @hint: L2 = sqrt(平方和)——先把每个样本平方（负号自然消失）再累加，最后开平方。当前代码既没平方也没开方
samples = [0.2, -0.8, 0.6, -0.1]
total = 0
for s in samples:
    total = total + s        # ← 负数在这里互相抵消了

l2 = total
print(round(l2, 4))
```

**练习 2**：判断 $f(x) = \dfrac{1}{x}$ 在 $[1, \infty)$ 上的 $L^p$ 户口（$p = 1$ 与 $p = 2$）。

<details>
<summary>点开查看逐步解答</summary>

$L^1$：$\displaystyle\int_1^\infty \frac{dx}{x} = \infty$——除名；$L^2$：$\displaystyle\int_1^\infty \frac{dx}{x^2} = 1$——收留。与例 1 恰好相反：例 1 的奇点在**有限点**（0 附近陡），本例的衰减在**无穷远**（尾巴太肥）。$x^{-1}$ 在两头都不是 $L^1$ 的居民，却是 $L^2$ 在无穷远的居民——“奇点搬家，判决也搬”。
</details>

**练习 3**：第 40 课（下一课）将把内积 $\langle f,g\rangle = \int f g\,dx$ 搬进函数空间。用本课语言说明：为什么住户必须是 $L^2$ 的？

<details>
<summary>点开查看逐步解答</summary>

内积要有意义，积分 $\int \lvert fg\rvert$ 必须有限。柯西–施瓦茨不等式（下一课正式登场，这里先借用结论）给出 $\int\lvert fg\rvert \le \lVert f\rVert_2 \lVert g\rVert_2$——只要 $f, g$ 都平方可积，内积必定有限。若 $f$ 只是 $L^1$（比如 $\frac{1}{\sqrt{x}}$），它自己乘自己就是 $x^{-1}$，积分发散——内积当场失灵。所以 $L^2$ 不是随手的偏好，而是“内积不发火”的最低门槛：**平方可积，角度才存在**。
</details>

## 8. 快问快答

```quiz
Lp 空间里“差一个零测集”的两个函数，在户口簿上算几户？
- 两户：函数相等才算同一户
- 一户：范数为 0 不区分零测集差异 [*]
- 不收：零测集上的差异会让范数爆炸
? ||f−g||_p 只看积分，零测集上的差异积分恒为 0——严格说 Lp 的元素是“几乎处处相等”的等价类。第 27 章等价关系课的原话在此落地。
```

## 9. 选读证明

<details>
<summary>选读 · Lp 是 Banach 的三步骨架</summary>

**第一步（三角不等式）**：Minkowski 不等式 $\lVert f+g\rVert_p \le \lVert f\rVert_p + \lVert g\rVert_p$。骨架想法：$\lvert f+g\rvert^p = \lvert f+g\rvert\cdot\lvert f+g\rvert^{p-1} \le \lvert f\rvert\lvert f+g\rvert^{p-1} + \lvert g\rvert\lvert f+g\rvert^{p-1}$，右边逐项用 Hölder 不等式（$\int \lvert uv\rvert \le \lVert u\rVert_p \lVert v\rVert_q$，其中 $\frac1p + \frac1q = 1$——它是柯西–施瓦茨的 $p$ 推广）。

**第二步（正定性）**：$\lVert f\rVert_p = 0 \Rightarrow \int\lvert f\rvert^p = 0 \Rightarrow f$ 几乎处处为零——所以 $L^p$ 的元素取“几乎处处相等”的等价类，正定性才严格成立。

**第三步（完备性）**：任取 $L^p$ 中的 Cauchy 列 $\lbrace f_n \rbrace$，抽子列使 $\lVert f_{n_{k+1}} - f_{n_k}\rVert_p \le 2^{-k}$，则子列几乎处处收敛到某个可测函数 $f$（法图引理控制 $\lVert f_n - f\rVert_p \to 0$）。极限落回 $L^p$——地板没有洞，$L^p$ 是 Banach 空间；特别地 $L^2$ 还带内积，是下一课的 Hilbert 正宫。

</details>

## 10. 下一站

$L^2$ 的住户有了“平方可积”的身份证，函数之间的内积 $\int fg$ 从此合法。下一课给函数空间装上角度：投影、正交与“最近的影子”全线回归。

→ [内积与 Hilbert 空间](./40-inner-product-hilbert.md)
