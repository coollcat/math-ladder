---
title: 贝叶斯线性回归
lesson_id: bayesian/linear-regression
prereqs:
  - bayesian/continuous-updating
volume: 4
layer: L5
track:
  - probability-statistics
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - conjugate-prior-normal
  - posterior-predictive
  - credible-interval
applications:
  - uncertainty-quantification
  - bayesian-prediction
  - model-comparison
exits:
  - data-ai
---

# 贝叶斯线性回归

## 1. 从一个场景开始

你用最小二乘拟合了一条回归线 $\hat{y}=3.2+1.7x$。老板问:"这条线有多可信?$x=10$ 时 $y$ 最可能在什么范围?" 频率派会给你一个置信区间和预测区间,但那套"重复抽样"的解释总让人心里不踏实。贝叶斯派的回答更直白:**参数本身就是一个随机变量**,后验分布直接告诉你"参数在哪个范围最可信",预测区间从后验自然流出。

## 2. 直觉解释

频率派线性回归:数据 $y=X\beta+\epsilon$,最小二乘给一个点估计 $\hat{\beta}$,再加上假设检验和置信区间。

贝叶斯线性回归换一副眼镜:

- **先验**:在看数据之前,你对参数 $\beta$ 有一个信念--"大概在 0 附近"→ 用正态先验 $p(\beta)=N(\mu_0,\Sigma_0)$;
- **似然**:数据 $y|X,\beta\sim N(X\beta,\sigma^2I)$(和频率派一样);
- **后验**:先验 × 似然 → 后验 $p(\beta|y,X)$。正态先验 + 正态似然 = 正态后验--**共轭**让一切有解析解。

后验不是一个点,而是一整个分布--均值是"最佳估计",方差是"不确定程度"。预测新数据时,把后验里的所有可能参数加权平均,得到的预测区间自然比频率派更宽也更诚实。

## 3. 正式定义

**模型**:

$$y = X\beta + \epsilon, \quad \epsilon \sim N(0, \sigma^2 I)$$

**先验**($\sigma^2$ 已知时):

$$\beta \sim N(\mu_0, \Sigma_0)$$

**后验**(共轭更新):

$$\beta \mid y,X \sim N(\mu_n, \Sigma_n)$$

其中:

$$\Sigma_n = \left(\Sigma_0^{-1} + \frac{1}{\sigma^2}X^TX\right)^{-1}$$

$$\mu_n = \Sigma_n\left(\Sigma_0^{-1}\mu_0 + \frac{1}{\sigma^2}X^Ty\right)$$

**符号说明**:

| 符号 | 含义 |
| --- | --- |
| $y$ | $n\times1$ 响应向量 |
| $X$ | $n\times p$ 设计矩阵(含截距列) |
| $\beta$ | $p\times1$ 参数向量 |
| $\sigma^2$ | 噪声方差 |
| $\mu_0,\Sigma_0$ | 先验均值和协方差 |
| $\mu_n,\Sigma_n$ | 后验均值和协方差 |

**后验预测分布**:对新输入 $x^*$,

$$y^* \mid y,X,x^* \sim N\left(x^{*T}\mu_n,\ \sigma^2 + x^{*T}\Sigma_n x^*\right)$$

注意方差有两项:$\sigma^2$ 是噪声(不可约),$x^{*T}\Sigma_n x^*$ 是参数不确定性(可随数据减少)。

## 4. 分步例题

**例**:$y=2x+1+\epsilon$,$\sigma=0.5$,3 个数据点 $(1,3.1),(2,5.2),(3,6.8)$。

设先验 $\beta\sim N(0, 10^2I)$(弱信息先验)。

1. $X=\begin{pmatrix}1&1\\1&2\\1&3\end{pmatrix}$,$y=(3.1,5.2,6.8)^T$;
2. $\Sigma_n^{-1}=\Sigma_0^{-1}+\frac{1}{\sigma^2}X^TX\approx\begin{pmatrix}12.01&24\\24&56.01\end{pmatrix}$;
3. $\Sigma_n\approx\begin{pmatrix}0.579&-0.248\\-0.248&0.124\end{pmatrix}$;
4. $\mu_n=\Sigma_n\cdot\frac{1}{\sigma^2}X^Ty\approx(0.004, 2.57)^T$。

后验斜率约 2.57(真实值 2),截距约 0(真实值 1)--数据量少时先验仍有影响。

## 5. 动手实验

### 实验 1(viz):先验 vs 后验

```viz
{
  "type": "plot",
  "title": "先验到后验:数据如何收紧信念",
  "expr": "exp(-((x-mu)/sd)^2/2)",
  "xmin": -4,
  "xmax": 6,
  "sliders": [
    { "name": "mu", "min": -2, "max": 5, "step": 0.1, "value": 0 },
    { "name": "sd", "min": 0.2, "max": 5, "step": 0.1, "value": 3 }
  ]
}
```

拖动 $\mu$ 和 $\text{sd}$ 模拟先验到后验的变化:数据会让峰变窄、位置偏移。$\text{sd}=0.3$ 时后验非常确定;$\text{sd}=3$ 时先验几乎没用。

### 实验 2(python):贝叶斯线性回归完整实现

```python title="贝叶斯线性回归:后验 + 预测区间"
import random, math
random.seed(42)

# 生成数据: y = 1 + 2x + noise
n = 20
X_data = [i * 0.5 for i in range(n)]
y_data = [1 + 2 * x + random.gauss(0, 0.5) for x in X_data]

# 设计矩阵 X=[1,x] 和充分统计量
X = [[1, x] for x in X_data]
sigma, prior_var, p = 0.5, 100.0, 2

# X^T X 和 X^T y
XtX = [[sum(X[i][j]*X[i][k] for i in range(n)) for k in range(p)] for j in range(p)]
Xty = [sum(X[i][j]*y_data[i] for i in range(n)) for j in range(p)]

# 后验协方差: Σ_n = (Σ_0^{-1} + X^T X / σ2)^{-1}
A = [[(1/prior_var if i==j else 0) + XtX[i][j]/(sigma**2) for j in range(p)] for i in range(p)]
det = A[0][0]*A[1][1] - A[0][1]*A[1][0]
Sigma_n = [[A[1][1]/det, -A[0][1]/det], [-A[1][0]/det, A[0][0]/det]]

# 后验均值: μ_n = Σ_n · X^T y / σ2 (先验均值=0)
rhs = [Xty[j]/(sigma**2) for j in range(p)]
mu_n = [Sigma_n[0][0]*rhs[0]+Sigma_n[0][1]*rhs[1], Sigma_n[1][0]*rhs[0]+Sigma_n[1][1]*rhs[1]]

print(f"后验截距: {round(mu_n[0],3)} (真值 1), 斜率: {round(mu_n[1],3)} (真值 2)")

# 预测 x*=4
x_star = [1, 4]
y_pred = sum(x_star[j]*mu_n[j] for j in range(p))
pred_var = sigma**2 + sum(x_star[i]*Sigma_n[i][j]*x_star[j] for i in range(p) for j in range(p))
print(f"预测 y*={round(y_pred,2)}, 95%区间=[{round(y_pred-2*math.sqrt(pred_var),2)}, {round(y_pred+2*math.sqrt(pred_var),2)}]")
```

预测区间包含了噪声不确定性($\sigma^2$)和参数不确定性($x^{*T}\Sigma_n x^*$)--双重不确定性让区间比频率派的更宽,但也更诚实。

### 快问快答

```quiz
贝叶斯线性回归的后验预测分布方差包含哪两部分?
- 偏差和方差
- 不可约噪声和参数不确定性 [*]
- 先验方差和似然方差
? 预测方差 = σ2(噪声,数据再多少也消不掉)+ x*^T Σ_n x*(参数不确定性,数据越多越小)。这比频率派预测区间多了一个可解释的来源。
```

```quiz
当先验方差趋向无穷大时,贝叶斯回归的后验均值趋向什么?
- 0
- 最小二乘估计 [*]
- 后验方差
? 先验方差无穷大 = 完全无信息 = 数据说了算。后验均值公式中 Σ_0^{-1}→0,剩下 X^T y / σ2 项,恰好是最小二乘的正规方程。
```

:::warning[常见误区]

**误区一**:"贝叶斯回归和频率派回归结果一样,只是解释不同。" 数据量小时差异巨大:先验会把估计拉向先验均值(正则化效果)。数据量大时确实趋于一致--但预测区间仍然不同(贝叶斯多一项参数不确定性)。

**误区二**:"先验越强越好。" 强先验会把估计锁死在先验偏好的区域。弱信息先验让数据主导,但小样本时后验仍然很宽--诚实的代价。

**误区三**:"贝叶斯回归需要 MCMC。" 当先验和似然都是正态(共轭)时,后验有解析解--本课的公式直接算。只有当噪声方差 $\sigma^2$ 未知、或模型非共轭时才需要 Gibbs/HMC。线性回归是贝叶斯最"便宜"的战场。

:::

## 6. 练习

**练习 1**:设 $y=3+0.5x+\epsilon$,$\sigma=1$,先验 $\beta\sim N(0,I)$。1 个数据点 $(2,4.5)$。求后验均值。

<details>
<summary>点开查看逐步解答</summary>

$X=(1,2)$,$y=4.5$,$\sigma^2=1$。$\Sigma_0^{-1}=I$。$X^TX=\begin{pmatrix}1&2\\2&4\end{pmatrix}$。$\Sigma_n^{-1}=I+\begin{pmatrix}1&2\\2&4\end{pmatrix}=\begin{pmatrix}2&2\\2&5\end{pmatrix}$。$\det=10-4=6$。$\Sigma_n=\frac{1}{6}\begin{pmatrix}5&-2\\-2&2\end{pmatrix}$。$X^Ty=\begin{pmatrix}4.5\\9\end{pmatrix}$。$\mu_n=\frac{1}{6}\begin{pmatrix}5\times4.5-2\times9\\-2\times4.5+2\times9\end{pmatrix}=\frac{1}{6}\begin{pmatrix}4.5\\9\end{pmatrix}=\begin{pmatrix}0.75\\1.5\end{pmatrix}$。后验截距 0.75,斜率 1.5(真值 3 和 0.5--一个数据点不够,先验把估计拉向 0)。
</details>

**练习 2**:补全预测区间计算--代码能跑但区间不对:

```exercise
# @title: 练习:修复预测区间
# @check: 4.4
# @check: 3.1
# @check: 5.7
# @hint: 预测方差 = σ2 + x*^T Σ_n x*,不是只有 σ2
import math

mu_n = [0.8, 1.2]          # 后验均值
Sigma_n = [[0.05, -0.01], [-0.01, 0.02]]  # 后验协方差
sigma = 0.5                 # 噪声标准差
x_star = [1, 3.0]          # 新输入点

# 预测均值
y_pred = x_star[0]*mu_n[0] + x_star[1]*mu_n[1]

# 预测标准差(bug:只用了噪声,没加参数不确定性)
pred_var = sigma ** 2       # ← 缺少 x*^T Σ_n x* 项
pred_sd = math.sqrt(pred_var)

print(round(y_pred, 1))
print(round(y_pred - 2*pred_sd, 2))
print(round(y_pred + 2*pred_sd, 2))
```

<details>
<summary>点开查看逐步解答</summary>

```python
import math
mu_n = [0.8, 1.2]
Sigma_n = [[0.05, -0.01], [-0.01, 0.02]]
sigma = 0.5
x_star = [1, 3.0]

y_pred = x_star[0]*mu_n[0] + x_star[1]*mu_n[1]

# 预测方差 = σ2 + x*^T Σ_n x*
param_var = sum(x_star[i]*Sigma_n[i][j]*x_star[j] for i in range(2) for j in range(2))
pred_var = sigma ** 2 + param_var
pred_sd = math.sqrt(pred_var)

print(round(y_pred, 1))           # 4.4
print(round(y_pred - 2*pred_sd, 2))  # 3.1
print(round(y_pred + 2*pred_sd, 2))  # 5.7
```
</details>

## 7. 选读:贝叶斯回归与岭回归的等价性

<details>
<summary>选读 · 先验即正则化</summary>

一个优美的对偶关系:贝叶斯线性回归的后验均值,恰好等于岭回归(L2 正则化)的解。

岭回归:$\hat{\beta}_{\text{ridge}}=\arg\min_\beta\|y-X\beta\|^2+\lambda\|\beta\|^2$。

贝叶斯后验均值:$\mu_n=(\Sigma_0^{-1}+\frac{1}{\sigma^2}X^TX)^{-1}\frac{1}{\sigma^2}X^Ty$。当 $\Sigma_0=\tau^2 I$ 时,两边乘 $\sigma^2$ 得 $(X^TX+\frac{\sigma^2}{\tau^2}I)^{-1}X^Ty$,其中 $\lambda=\sigma^2/\tau^2$——这正是岭回归!

L2 正则化 = 正态先验,L1 正则化(Lasso)= Laplace 先验。贝叶斯框架把正则化变成了“先验选择”——一个统一的视角。

</details>

## 8. 下一站

线性回归是最简单的参数模型。当模型结构本身带有条件独立性--变量之间的依赖关系可以用图来表示--就进入了概率图模型的世界。

→ [概率图模型](./95-pgm.md)
