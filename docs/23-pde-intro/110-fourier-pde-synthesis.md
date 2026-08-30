---
title: Fourier 合成：把任意初值拆成模态
lesson_id: pde/fourier-pde-synthesis
prereqs:
  - pde/eigenfunction-boundary
  - fourier/coefficients
volume: 2
layer: L9
track:
  - analysis-change
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - modal-superposition
  - fourier-sine-coefficient
  - high-mode-damping
applications:
  - heat-conduction
  - image-smoothing
exits:
  - engineering
---

# Fourier 合成：把任意初值拆成模态

## 1. 从一个场景开始

一根铜杆，两端插在冰水里。现在不是给它一个规规矩矩的正弦形状，而是把中间三分之一（$x$ 从 $0.35$ 到 $0.65$）整体加热到 1 度，其余部分保持 0 度——一个方方正正的台阶。

前两课给出的模态全是光滑的正弦，没有一个是方的。可物理规律不许我们挑食：**任何**初始形状都得能解。第 16 章那套"把信号投影到正交基上"的工具，此刻正好接上——只不过这次的基不是任意谐波，而是被边界筛出来的那一族特征函数。

## 2. 直觉解释

三句话讲清整套流程：

1. **拆**：把初始形状 $f(x)$ 投影到每个特征函数上，得到一串系数 $b_n$。系数就是"这个模态占了多少份量"。
2. **各走各的**：第 $n$ 号模态带着自己的衰减率 $e^{-k\lambda_nt}$ 独自演化，谁也不干扰谁——因为方程是线性的。
3. **合**：把所有演化后的模态加回来，就是任意时刻的解。

其中最反直觉的是第 2 步的后果。$\lambda_n\propto n^2$，于是高编号模态的寿命按 $1/n^2$ 缩短。方波台阶的尖角恰恰由大量高编号模态堆出来——**所以最先消失的一定是尖角**。热方程是一位不知疲倦的打磨工：它先把所有棱角磨圆，再慢慢把大轮廓摊平。

## 3. 正式定义

两端固定的热方程，初值 $f(x)$ 的求解公式：

$$u(x,t)=\sum_{n=1}^{\infty} b_n\,\sin\frac{n\pi x}{L}\;e^{-k\left(\frac{n\pi}{L}\right)^2t}, \qquad b_n=\frac{2}{L}\int_0^L f(x)\,\sin\frac{n\pi x}{L}\,dx.$$

| 符号 | 名称 | 含义 |
| --- | --- | --- |
| $b_n$ | 第 $n$ 号模态的系数 | 初始形状在特征函数上的投影长度 |
| $\sin\frac{n\pi x}{L}$ | 第 $n$ 号特征函数 | 空间形状，由边界筛出 |
| $e^{-k\lambda_nt}$ | 第 $n$ 号衰减因子 | 时间演化，$\lambda_n=(n\pi/L)^2$ |
| $\sum$ | 叠加 | 线性方程允许把解逐项相加 |

系数公式的来历就是正交性：$\int_0^L \sin\frac{m\pi x}{L}\sin\frac{n\pi x}{L}dx=\frac{L}{2}\delta_{mn}$。把初值等式两边同乘 $\sin\frac{n\pi x}{L}$ 再积分，右边只剩第 $n$ 项，于是解出 $b_n$。

## 4. 分步例题

**例 1**：方台阶 $f(x)=1$（$0.35<x<0.65$），取 $L=1$，算前三个系数。

1. $b_n=2\int_{0.35}^{0.65}\sin(n\pi x)\,dx=\dfrac{2}{n\pi}\left[\cos(0.35n\pi)-\cos(0.65n\pi)\right]$；
2. $n=1$：$b_1=\frac{2}{\pi}\left[\cos(0.35\pi)-\cos(0.65\pi)\right]=\frac{2}{\pi}\times0.9080\approx0.578$；
3. $n=2$：两个余弦值相等（对称位置），$b_2=0$；
4. $n=3$：$b_3=\frac{2}{3\pi}\left[\cos(1.05\pi)-\cos(1.95\pi)\right]=\frac{2}{3\pi}\times(-1.9754)\approx-0.419$。

$b_2=0$ 不是巧合：这个台阶关于中点 $x=0.5$ 左右对称，而 $\sin(2\pi x)$ 关于中点是反对称的，投影自然为零。**对称性提前告诉你哪些系数必为零**，这是手算时最省力的检查。

**例 2**：看高编号模态怎么"先死"。取 $k=0.1$，三个时刻的前三号幅度：

1. $t=0$：$0.578,\ 0,\ -0.419$；
2. $t=0.1$：$0.524,\ 0,\ -0.172$——第一号还剩九成，第三号只剩四成；
3. $t=0.5$：$0.353,\ 0,\ -0.005$——第一号还剩六成，第三号基本归零。

## 5. 动手实验

### 实验 1：拖动项数 N，看尖角怎么被磨掉

```viz
{
  "type": "fourier-pde-synth",
  "title": "Fourier 合成：初始形状 / N 项截断 / 各模态衰减后的解",
  "shape": "square",
  "N": 3,
  "k": 0.1
}
```

灰虚线是初始的方台阶，蓝线是 $N$ 项正弦截断（$N$ 越大越贴住台阶，但跳跃处始终有约 9% 的过冲——第 16 章的 Gibbs 现象在这里再次露面），橙线是各模态按自己的速率衰减之后的解。按播放：尖角最先塌陷，大鼓包最后才慢慢摊平。

### 实验 2：系数谱，以及 Gibbs 过冲的读数

```python title="打印前六个系数，并分别量「远离跳跃处」与「跳跃处」的误差"
import math

def f(x):                                  # 初始形状：0.35 到 0.65 之间是 1，其余是 0
    return 1.0 if 0.35 < x < 0.65 else 0.0

def coeff(n):                              # 数值积分：把 [0,1] 切成 M 片取中点求和
    s = 0.0
    M = 2000
    for i in range(M):
        x = (i + 0.5) / M
        s = s + f(x) * math.sin(n * math.pi * x)
    return 2.0 * s / M

for n in range(1, 7):                      # 打印前六个系数
    print(n, round(coeff(n), 4))

def trunc(x, N):                           # N 项截断在 x 处的取值
    s = 0.0
    for n in range(1, N + 1):
        s = s + coeff(n) * math.sin(n * math.pi * x)
    return s

for N in [1, 3, 9, 25]:                    # 四个截断深度的对比
    far = 0.0                              # 远离跳跃的区段 [0.75, 1] 上的最大误差
    for i in range(201):
        x = 0.75 + 0.25 * i / 200
        diff = abs(f(x) - trunc(x, N))     # abs 取绝对值
        if diff > far:
            far = diff
    peak = 0.0                             # 跳跃点右侧邻域 [0.35, 0.45] 的峰值
    for i in range(101):
        x = 0.35 + 0.10 * i / 100
        if trunc(x, N) > peak:
            peak = trunc(x, N)
    print(N, round(far, 3), round(peak, 3))
```

第一部分是系数谱：`1 0.578`、`2 0.0`、`3 -0.4192`、`4 0.0`、`5 0.1801`、`6 0.0`——偶数号全部为零（对称性），奇数号绝对值递减但减得不快。

第二部分每行是 `N / 远离跳跃处的误差 / 跳跃处的峰值`：`1 0.409 0.571`、`3 0.167 0.944`、`9 0.124 1.039`、`25 0.025 1.103`。左边那列一路降到 0.025（$N$ 越大越贴合），右边那列却一路升到 1.103——**台阶只有 1 高，截断却冲到了 1.10**。这 10% 的越界就是第 16 章见过的 Gibbs 过冲：它不会随 $N$ 消失，只会越挤越窄地赖在跳跃点旁边。

### 实验 3：三个时刻的模态幅度表

```python title="高编号模态按 1/n² 的寿命差迅速掉队"
import math

k = 0.1                                    # 热扩散率

def coeff(n):
    s = 0.0
    M = 2000
    for i in range(M):
        x = (i + 0.5) / M
        s = s + (1.0 if 0.35 < x < 0.65 else 0.0) * math.sin(n * math.pi * x)
    return 2.0 * s / M

for t in [0.0, 0.1, 0.5]:                  # 三个时刻
    amps = []
    for n in range(1, 4):
        decay = math.exp(-k * (n * math.pi) ** 2 * t)   # 第 n 号模态的衰减因子
        amps.append(round(coeff(n) * decay, 4))         # append 追加到列表尾部
    print(t, amps)
```

输出 `0.0 [0.578, 0.0, -0.4192]`、`0.1 [0.5237, 0.0, -0.1724]`、`0.5 [0.3529, 0.0, -0.0049]`。到 $t=0.5$，第一号还剩六成，第三号已经只剩千分之五——**细节先死，轮廓后死**。图像模糊、音效变闷、热量摊平，背后都是同一条规律。

## 6. 练习

```exercise
# @title: 练习：给方台阶算前三个系数
# @check: [0.578, 0.0, -0.419]
# @hint: 正交归一系数是 2/L（L=1 时就是 2），别写成 1/L；取样点取小区间的中点 (i+0.5)/M。
import math

def f(x):
    return 1.0 if 0.35 < x < 0.65 else 0.0

def coeff(n):
    s = 0.0
    M = 2000
    for i in range(M):
        x = (i + 0.5) / M
        s = s + f(x) * math.sin(n * math.pi * x)
    return s / M                           # ← 有错：系数应是 2*s/M，这里漏了因子 2

out = []
for n in range(1, 4):
    out.append(round(coeff(n), 3))
print(out)
```

<details>
<summary>点开查看逐步解答</summary>

修正版：

```python
import math

def f(x):
    return 1.0 if 0.35 < x < 0.65 else 0.0

def coeff(n):
    s = 0.0
    M = 2000
    for i in range(M):
        x = (i + 0.5) / M
        s = s + f(x) * math.sin(n * math.pi * x)
    return 2.0 * s / M

out = []
for n in range(1, 4):
    out.append(round(coeff(n), 3))
print(out)     # [0.578, 0.0, -0.419]
```

```text
b_n = 2∫_{0.35}^{0.65} sin(nπx) dx = (2/(nπ))·[cos(0.35nπ) − cos(0.65nπ)]
n=1: (2/π)·(0.4540 − (−0.4540)) = 0.578
n=2: 两个余弦相等，差为零 → b₂ = 0
n=3: (2/(3π))·(−0.9877 − 0.9877) = −0.419
```

$b_2=0$ 可以先验地预判：台阶关于中点对称，$\sin(2\pi x)$ 关于中点反对称，一正一负刚好抵消。对称性能提前告诉你一半的系数——手算前先看一眼对称性，能省下不少积分。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为 $N$ 取得越大，截断就越贴合初始形状，误差会一路趋于零。对连续形状确实如此；但只要初值有跳跃，跳跃点附近始终留下约 9% 的过冲（Gibbs 现象），那一点的误差不随 $N$ 消失——好在它随时间被迅速抹平。

**误区二**：你以为系数 $b_n$ 需要每隔一段时间重算一次。不需要：系数只在 $t=0$ 时算一遍，之后的全部演化都由那个 $e^{-k\lambda_nt}$ 因子承担。这正是分离变量最大的实惠。

**误区三**：你以为高编号模态"贡献小所以可以忽略"。在 $t=0$ 时它们撑起了所有尖角细节；忽略它们，得到的解从一开始就过度光滑。要不要保留，取决于你想看多细。

:::

## 8. 快问快答

```quiz
为什么初始形状里越尖锐的棱角消失得越快？
- 棱角由高编号模态堆出，而高编号模态寿命按 n 平方缩短 [*]
- 因为尖锐处的温度本来就低
- 因为热量喜欢往平坦处跑
? λ_n 正比于 n²，衰减因子是 e 的 −kλ_n t 次方。棱角全靠高 n 模态撑着，所以最先被磨平。
```

```quiz
方台阶关于中点左右对称时，哪些系数一定为零？
- 偶数号系数 [*]
- 奇数号系数
- 全部系数
? 关于中点对称的形状，与在中点反对称的 sin(2πx)、sin(4πx)… 做内积时正负抵消，投影为零。
```

## 9. 选读：为什么是正弦而不是别的基

<details>
<summary>选读 · 特征函数基与傅里叶基的关系</summary>

第 16 章用的基是 $\sin(nx)$、$\cos(nx)$，这里用的基是 $\sin\frac{n\pi x}{L}$——看起来只是换了个周期。真正的差别在于**基是谁定的**：

- 傅里叶基是"通用货架"：任何周期信号都能往上面放，周期由人选定。
- 特征函数基是"量体裁衣"：它由微分算子和边界条件共同决定。两端固定得到 $\sin\frac{n\pi x}{L}$，两端绝热得到 $\cos\frac{(n-1)\pi x}{L}$，左固定右绝热得到 $\sin\frac{(n-\frac12)\pi x}{L}$。

两者的共同结构是**正交性 + 完备性**：正交让系数能一个一个独立地解出来，完备保证叠加能还原任意形状。这个结构在一大类问题里反复出现，抽象出来就是 Sturm-Liouville 理论；到了更高维、更复杂几何上，它演变成"谱方法"——用微分算子的特征函数做展开，是当代科学计算的主力工具之一。

顺带一提：第 49 课要讲的"扩散模型逐步加噪去噪"，在频域看正是这条 $e^{-k\lambda_nt}$ 衰减的逆过程——先按 $\lambda_n$ 抹掉高频，再学着把它加回来。

</details>

## 10. 下一站

热方程问的是"温度怎么演化到稳态"；如果我们直接问稳态本身——时间不再变化、$u_t=0$——方程就退化为 Laplace 与 Poisson 方程。下一课用一台松弛迭代器，一格一格把稳态"摸"出来：[Laplace 与 Poisson](./120-laplace-poisson.md)。
