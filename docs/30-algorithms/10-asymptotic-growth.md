---
title: 渐近记号与增长率
lesson_id: algorithms/asymptotic-growth
prereqs:
  - exponents/three-curves
  - exponents/log
  - python-tools/matplotlib
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
  - big-o-notation
  - asymptotic-growth
  - dominant-term
applications:
  - algorithm-scaling-analysis
  - performance-budgeting
exits:
  - engineering
  - research
---

# 渐近记号与增长率

## 1. 从一个场景开始

你写了两个排序程序。程序甲在小数据上快得飞起，程序乙慢吞吞。老板说："下周数据量涨到一千万条。"此刻该信谁？

答案不在今天的计时器里，而在**增长率**里：输入翻倍时，程序的步数翻几倍？这一课给你一套语言——大 O 记号——把"规模变大后会怎样"压缩成一个符号。

## 2. 直觉解释

想象两条赛道：一条选手每步走 $n$ 格，另一条每步走 $n^2$ 格。起点处后者可能领先（常数小），但只要跑道够长，$n^2$ 必然碾压一切低阶选手。

关键直觉有三条：

- **只看最高阶项**：$n^2 + 1000n + 5000$ 在 $n$ 很大时，几乎就是 $n^2$——另外两项成了零头；
- **忽略常数因子**：$3n^2$ 和 $200n^2$ 是同一个量级，换台更快的机器就能抹平；
- **最坏情况说话**：我们关心的是"最惨会怎样"，而不是运气好的那一次。

## 3. 正式定义

设 $f(n)$ 和 $g(n)$ 是输入规模 $n$ 的非负函数。

**大 O（上界）**：若存在常数 $c>0$ 和 $n_0$，使得对所有 $n \ge n_0$ 都有

$$f(n) \le c \cdot g(n)$$

则记 $f(n) = O(g(n))$，读作"f 的增长不超过 g 这个量级"。

**大 Ω（下界）**：反过来，若 $f(n) \ge c \cdot g(n)$ 对足够大的 $n$ 成立，记 $f(n) = \Omega(g(n))$。

**大 Θ（紧贴）**：两者同时成立时记 $f(n) = \Theta(g(n))$——上下界夹住，增长速度同阶。

| 记号 | 一句话 | 例 |
| --- | --- | --- |
| $O(g)$ | 至多这个量级 | 二分查找 $O(\log n)$ |
| $\Omega(g)$ | 至少这个量级 | 比较排序 $\Omega(n\log n)$（本卷第 40 课证明） |
| $\Theta(g)$ | 恰好这个量级 | 逐个点名的线性查找 $\Theta(n)$ |

注意：$O$ 只是上界，说线性查找是 $O(n^{10})$ 在数学上没错，但毫无信息量——工程上默认报一个**贴切**的上界。

## 4. 分步例题

**例**：比较 $T_1(n) = n^2 + 3n + 50$ 与 $T_2(n) = 100\, n \log_2 n + 10n$，谁的后劲足？

1. 提取主项：$T_1$ 的主项是 $n^2$，$T_2$ 的主项是 $100\,n\log_2 n$；
2. 小规模抽查：$n=4$ 时 $T_1 = 16+12+50=78$，$T_2 = 100\times 4\times 2 + 40 = 840$——$T_1$ 快；
3. 大规模再看：$n = 2^{20} = 1048576$ 时，$T_1 \approx 1.10\times 10^{12}$，而 $T_2 \approx 100 \times 2^{20}\times 20 = 2.10\times 10^{9}$——$T_2$ 反超五百倍；
4. 结论：常数 100 只能撑一阵子，$n^2$ 对 $n\log n$ 的阶差终将获胜。渐近分析看的就是这一刻之后的世界。

按每秒十亿次运算折算：$T_1$ 要约 18 分钟，$T_2$ 只要约 2 秒。

## 5. 动手实验

### 实验 1：网页里拖动常数，看反超时刻

曲线甲是 $y = x^2$，曲线乙是 $y = c \cdot x \cdot \log x$。拖动滑块改变常数 $c$：常数越大，乙被压得越久，但在右端总会被甲追上——**阶差不可贿赂**。

```viz
{
  "type": "plot",
  "title": "x^2 与 c·x·log(x) 的赛跑",
  "expr": "x * x",
  "expr2": "c * x * log(x)",
  "xmin": 1,
  "xmax": 64,
  "sliders": [
    { "name": "c", "min": 1, "max": 20, "step": 1, "value": 4 }
  ]
}
```

### 实验 2：同尺度赛跑与关键点探查

四条常见增长曲线进同一场赛跑。拖动“范围”拉长跑道，再移动“探针”读出每个规模下的数值和当前领先者：

```viz
{
  "type": "curverace",
  "range": 6,
  "probe": 4
}
```

把范围从 6 拧到 12：平方曲线很快把其他曲线压成贴地的细线，指数更是直接冲出画面。这就是“同一张图、同一把尺”的价值——局部领先骗得过眼睛，同尺度比较骗不了。

### 实验 3：用计数器实测两种查找

线性查找逐个点名（$\Theta(n)$），二分查找每次砍一半（$O(\log n)$）。数一数各自走了多少步：

```python title="统计两种查找的比较次数"
import math

data = list(range(0, 1000000, 3))   # 每 3 个数放一个，共约 33 万个
target = 999987

linear_steps = 0
for item in data:                   # 线性查找：从头到尾逐个比对
    linear_steps = linear_steps + 1
    if item == target:
        break                       # break：立刻跳出循环，不再继续比

low, high = 0, len(data) - 1        # 二分查找的左右边界（下标）
binary_steps = 0
while low <= high:
    binary_steps = binary_steps + 1
    mid = (low + high) // 2         # // 整除：取中间下标
    if data[mid] == target:
        break
    if data[mid] < target:
        low = mid + 1
    else:
        high = mid - 1

print(f"线性查找走了 {linear_steps} 步")
print(f"二分查找走了 {binary_steps} 步")
print(f"log2(330000) 约 {math.log(len(data), 2):.1f}")
```

三十三万条数据，二分只用了不到二十步——这就是 $\log n$ 的力量。你可以把 `target` 改成不存在的数（比如 `2`），看最坏情况下的步数。

### 实验 4：增长率全家福

```python title="四种增长曲线同框"
import math
import matplotlib.pyplot as plt

ns = []
sq = []      # n^2
nlogn = []   # n*log2(n)
lin = []     # n
expo = []    # 2^(n/5)，指数族代表
for k in range(1, 61):
    n = k
    ns.append(n)
    sq.append(n * n)
    nlogn.append(n * math.log(n, 2))
    lin.append(n)
    expo.append(2 ** (n / 5))

plt.plot(ns, sq, label="n^2")
plt.plot(ns, nlogn, label="n*log n")
plt.plot(ns, lin, label="n")
plt.plot(ns, expo, label="2^(n/5)")
plt.legend()
plt.xlabel("input size n")
plt.ylabel("steps")
plt.title("growth race")
```

指数曲线最后直接起飞冲出画面——32 章会告诉你为什么有些问题我们永远等不起。

### 快问快答

```quiz
某算法运行步数是 3n^2 + 999n，它的大 O 是？
- O(n^3)，因为 3n^2 加上很多项变大了
- O(n^2)，最高阶项决定量级 [*]
- O(999n)，999 比 3 大所以取它
? 最高阶项主导长期增长：n 变大后 n^2 远超 999n，常数 3 与低阶项都被 O 定义里的常数 c 吸收。
```

:::warning[常见误区]

**误区一**："大 O 就是精确运行时间。" 它只描述增长量级，不承诺任何具体秒数；同样 $O(n\log n)$ 的两个程序可能差五倍常速。

**误区二**："常数无所谓。" 渐近意义上无所谓；真实工程里 $n$ 若永远只有 20，常数反而是全部。先看数据规模，再谈渐近。

**误区三**："加法里各项都要保留。" $n^2 + n$ 里那个 $n$ 在 $n = 10^6$ 时贡献不足千分之一——主项吃掉一切。

:::

## 6. 练习

**练习 1**：心算判断下列各对函数谁在大 $n$ 时更大：$n\log n$ 对 $n^{1.5}$；$2^n$ 对 $n^{100}$。

<details>
<summary>点开查看逐步解答</summary>

$n^{1.5}$ 更大：$\log n$ 增长慢于任何正幂次 $n^{0.5}$。$2^n$ 更大：指数碾压任意固定幂次 $n^{100}$——第 3 章三种曲线一课的结论在算法世界全面生效。
</details>

**练习 2**：两个算法在 $n=64$ 时各需要多少步？修正下面代码里的两处错误（提示：一处阶数写错，一处轮数不该写死）：

```exercise
# @title: 练习：n=64 时谁更快
# @check: 4096
# @check: 384
# @hint: 算法 A 是两两比较，步数为 n 的平方；算法 B 每轮扫全表、共跑"对折到 1"的轮数——64 反复整除 2，几轮到 1？
n = 64
cost_a = n ** 3                 # ← 算法 A 两两比较，这里阶数写错了

rounds = 8                      # ← 轮数被写死了：64 对折到 1 到底要几轮？
cost_b = n * rounds

print(cost_a)
print(cost_b)
```

**练习 3**：证明风格小练：按定义验证 $f(n) = 5n + 7$ 满足 $f(n) = O(n)$。

<details>
<summary>点开查看逐步解答</summary>

取 $c = 6$、$n_0 = 7$：对 $n \ge 7$，有 $7 \le n$，于是 $5n + 7 \le 5n + n = 6n$。定义中"存在常数"被具体兑现——任何能找到一组合法 $c, n_0$ 的验证都成立。
</details>

## 7. 选读：为什么可以扔掉低阶项

<details>
<summary>选读 · 主项吞噬的低阶项</summary>

设 $f(n) = a_k n^k + a_{k-1} n^{k-1} + \dots + a_0$（$a_k > 0$）。对 $n \ge 1$ 有 $n^{k-1} \le n^k$ 等一系列不等式，于是

$$f(n) \le (a_k + a_{k-1} + \dots + a_0)\, n^k$$

右边是一个常数乘 $n^k$，恰好是大 O 定义的形状——所以多项式函数的量级由最高次数决定。对含 $\log$ 的项同理可证 $n \log n \le n^2$（当 $n \ge 2$），这就是"阶"的排序表：$1 < \log n < n < n\log n < n^2 < 2^n$。

</details>

## 8. 下一站

知道了"多快"，新问题来了："凭什么相信循环算出的答案一定对？"下一课用**循环不变式**给正确性立字据。

→ [循环不变式与正确性](./20-loop-invariants.md)
