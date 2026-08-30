---
title: 递推与特征方程
lesson_id: combinatorics/recurrence-characteristic
prereqs:
  - combinatorics/permutations-combinations
  - sequences/fibonacci
volume: 3
layer: L4
track:
  - discrete-computing
stage: university-core
difficulty: 3
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - linear-recurrence
  - characteristic-equation
applications:
  - staircase-planning
  - population-models
exits:
  - research
---

# 递推与特征方程

## 1. 从一个场景开始

楼梯有 10 级，你每次跨 1 级或 2 级。问：共有多少种上楼姿势？

直接数会晕。聪明做法是盯住**最后一步**：到达第 $n$ 级之前，你必然站在第 $n-1$ 级（再跨 1）或第 $n-2$ 级（再跨 2）。于是

$$f(n) = f(n-1) + f(n-2)$$

——斐波那契的亲戚现身了。但递推只给"滚雪球"的算法：想知道 $f(100)$ 得滚 99 步。数学家的野心更大：**一步到位的通项公式**。特征方程就是那台把雪球熔铸成公式的机器。

## 2. 直觉解释

第 8 章见过等比数列 $g(n) = r^n$ 的爆发力。现在反着问：什么样的递推会被等比数列满足？

把试探解 $f(n) = r^n$ 代入 $f(n) = f(n-1) + f(n-2)$：

$$r^n = r^{n-1} + r^{n-2} \quad\Longrightarrow\quad r^2 = r + 1$$

——递推关系瞬间变成了一个二次方程！它叫**特征方程**。解出根 $r_1, r_2$，通解就是两条等比流的叠加：

$$f(n) = A \cdot r_1^n + B \cdot r_2^n$$

常数 $A, B$ 由初始条件（前两项）唯一确定。整个流程像侦探破案：猜出嫌疑人类型（等比）、审讯出姓名（解方程）、用案发时在场证明（初值）锁定真凶。

## 3. 正式定义

**二阶线性常系数递推**：

$$f(n) = p\, f(n-1) + q\, f(n-2) \qquad (p, q \text{ 为常数})$$

其**特征方程**为

$$r^2 = p\, r + q$$

| 判别式 | 根的情形 | 通解 |
| --- | --- | --- |
| $\Delta > 0$ | 两不同实根 $r_1 \ne r_2$ | $A r_1^n + B r_2^n$ |
| $\Delta = 0$ | 重根 $r$ | $(A + Bn)\, r^n$ |
| $\Delta < 0$ | 共轭复根 | 振荡型（卷一欧拉公式可处理） |

对斐波那契型 $r^2 = r + 1$：$r = \dfrac{1 \pm \sqrt{5}}{2}$，黄金比例 $\varphi = \frac{1+\sqrt5}{2} \approx 1.618$ 与 $\psi = \frac{1-\sqrt5}{2} \approx -0.618$。因为 $|\psi| < 1$，第二股流迅速枯萎——**斐波那契长期看就是黄金比例的等比数列**。

## 4. 分步例题

爬楼问题的 $f(1)=1,\ f(2)=2$，求通项并验证 $f(10)$。

1. 特征方程同为 $r^2 = r+1$，根 $\varphi \approx 1.618$、$\psi \approx -0.618$；
2. 通解 $f(n) = A\varphi^n + B\psi^n$；代入初值：
   $A\varphi + B\psi = 1$，$A\varphi^2 + B\psi^2 = 2$；
3. 解方程组时可直接利用“爬楼数列就是右移一位的标准斐波那契数列”：
   $f(n)=F(n+1)$。把标准斐波那契通项中的 $n$ 换成 $n+1$，得
   $A = \frac{\varphi}{\sqrt5} \approx 0.7236$、$B = -\frac{\psi}{\sqrt5} \approx 0.2764$。
   代回原方程组也能核验：$A\varphi+B\psi=1$，$A\varphi^2+B\psi^2=2$；
4. 由于 $\psi^n$ 指数衰减，$f(n)$ 就是“最邻近整数”：算主项 $A\varphi^n$ 后四舍五入即可；
5. 验证：主项 $A\varphi^{10}=\frac{\varphi^{11}}{\sqrt5}\approx88.9978$，
   小修正项 $B\psi^{10}\approx0.0022$，完整式恰好给出 $f(10)=89$，与逐项递推一致 ✓。

## 5. 动手实验

### 实验 1（python）：相邻项比值悄悄靠向谁

```python title="爬楼数列的比值收敛于黄金比例"
import math

steps = [0] * 12          # [0]*12：复制十二个零当储物格，下标 1~11 有用
steps[1] = 1
steps[2] = 2              # 两级楼梯：一次跨两步，或者 1+1 分两步
for n in range(3, 12):    # range(3,12)：n 取 3 到 11
    steps[n] = steps[n - 1] + steps[n - 2]

phi = (1 + math.sqrt(5)) / 2      # 黄金比例 φ ≈ 1.618
psi = (1 - math.sqrt(5)) / 2     # 另一特征根 ψ ≈ -0.618
A = phi / math.sqrt(5)           # 初值 f(1)=1, f(2)=2 对应的系数
B = -psi / math.sqrt(5)

print(steps[10])                  # 十级楼梯的总方案数
print(A * phi + B * psi)          # 用第一个初值核验系数；浮点会留下微小误差
print(round(A * phi ** 10))       # round(x)：四舍五入取最邻近整数

for n in range(3, 12):
    ratio = steps[n] / steps[n - 1]
    print(str(n) + ": " + str(round(ratio, 6)) + " vs φ=" + str(round(phi, 6)))
    # round(x, 6)：保留六位小数
```

前三行依次输出 `89`、`0.9999999999999999`、`89`：浮点误差正好提醒我们，数值验证要允许极小残差。比值一路 1.5 → 1.667 → 1.6 → … → 1.618034，与 φ 的差距指数级缩小——特征方程预言的“等比化”肉眼可见。

### 实验 2（viz）：递推与等比的赛跑

```viz
{
  "type": "seq",
  "title": "等比数列 r=1.618：斐波那契的骨架",
  "kind": "geom",
  "a1": 1,
  "r": 1.618,
  "n": 9
}
```

这排柱子是纯等比流 $1, 1.618, 2.618, \dots$。把 r 拖到 1.5 再拖回 1.7，感受增长速度对 r 的敏感度——递推数列之所以长得像它，是因为特征根正是那个 r。想看叠加细节的同学，把实验 1 的数列画成折线对比即可。

:::warning[常见误区]

**误区一**：你以为任何递推都能套特征方程。它只服务"常系数线性"这一家；$f(n)=f(n-1)^2$ 或 $f(n)=f(n-1)+n$ 都不姓这个姓（后者要用累加技巧或生成函数）。

**误区二**：你以为初始条件随便设都行。初值决定 $A,B$ 但改变不了 $r$——它们是音量旋钮，不是音符；初值给错一格，整列错到底。

**误区三**：你以为重根情形照抄两个根就行。重根时第二条独立解不是 $r^n$ 而是 $n r^n$；漏掉因子 n 会让方程组无解。
:::

## 6. 练习

```quiz
递推 g(n)=2g(n−1)+3g(n−2) 的特征方程是？
- r 平方 = 2r + 3 [*]
- r = 2 + 3
- r 立方 − 2r − 3 = 0
? 试探解 g(n)=r^n 代入后约掉 r^(n−2)，留下 r²=2r+3。
```

**练习 1**：解递推 $g(1)=1,\ g(2)=5,\ g(n)=2g(n-1)+3g(n-2)$ 的通项。（提示：特征根 3 与 −1。）

<details>
<summary>点开查看逐步解答</summary>

通解 $g(n)=A\cdot 3^n + B\cdot(-1)^n$。代入初值：

$3A - B = 1$（第 1 项），$9A + B = 5$（第 2 项）。

两式相加得 $12A = 6$，即 $A = \tfrac12$；回代第二式得 $B = 5 - \tfrac92 = \tfrac12$。所以

$$g(n) = \frac{3^n + (-1)^n}{2}$$

验证：$g(1) = \tfrac{3-1}{2} = 1$ ✓；$g(2) = \tfrac{9+1}{2} = 5$ ✓；$g(3) = \tfrac{27-1}{2} = 13$，递推式 $2\times5 + 3\times1 = 13$ ✓。
</details>

**练习 2**：爬楼程序的第二格初始值写错了。修好它让第十级输出正确答案：

```exercise
# @title: 十级楼梯的走法
# @check: 89
# @hint: f(2) 数的是“两级台阶”的走法：一次跨两步、或 1+1 分两次，共两种。初始代码把它当成了一种。
steps = [0] * 11     # 下标 0 到 10 共十一个格子
steps[1] = 1
steps[2] = 1         # ← 问题在这：两级台阶其实有两种走法
for n in range(3, 11):
    steps[n] = steps[n - 1] + steps[n - 2]
print(steps[10])
```

修好后输出 `89`。初值差一点，整列全变样（错误版本会输出 55）——这正是"初值是音量旋钮"的现场演示。

## 7. 选读：卡西尼恒等式

<details>
<summary>选读 · 相邻项之间的隐秘合同</summary>

标准斐波那契数列藏着 $F(n-1) F(n+1) - F(n)^2 = (-1)^n$。用矩阵语言一句话证完：递推即 $\begin{pmatrix} F_{n+1} & F_n \end{pmatrix} = \begin{pmatrix} F_n & F_{n-1}\end{pmatrix} Q$，其中 $Q = \begin{pmatrix}1&1\\1&0\end{pmatrix}$，而 $\det Q = -1$，连乘后行列式交替变号。特征方程管"长多快"，行列式管"内在守恒"——同一递推的两副面孔。矩阵快速幂还能让求 $F(10^9)$ 只需 30 步矩阵乘法，算法课会回来收这个伏笔。
</details>

## 8. 下一站

递推家族里还有一位明星：$C(n,k) = C(n-1,k-1) + C(n-1,k)$。它的完整展开图是一整座三角山——下一课登顶杨辉三角，顺路炸开 $(a+b)^n$。

→ [二项式系数与杨辉三角](./60-binomial-pascal.md)
