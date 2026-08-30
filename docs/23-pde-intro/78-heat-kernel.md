---
title: 热核：一点热量如何摊开
lesson_id: pde/heat-kernel
prereqs:
  - pde/heat-equation-1d
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
  - heat-kernel
  - fundamental-solution
applications:
  - heat-conduction
  - pollutant-diffusion
exits:
  - engineering
---

# 热核：一点热量如何摊开

## 1. 从一个场景开始

一根无限长的细铜杆，室温处处均匀。某个瞬间，烙铁在中点碰了一下——一股定量的热量被塞进一个点。此后每分每秒，这口热量摊成什么形状？40 课的模态解管的是正弦形状怎么原地衰减；点热源问得更刁，而它的答案出奇地漂亮：一颗会摊开的高斯钟形，公式短得能写在名片上。

## 2. 直觉解释

先猜三件事。其一，热量守恒：杆上总热量既不增也不减，钟形摊多开，面积都恒定。其二，中心最先降温：峰顶最尖、弯曲最强，按 40 课的判据"时间变化率正比于弯曲程度"，最尖处掉得最快。其三，答案左右对称：点源对称，方程也对称，温度分布只能以中点为轴。

三件事拼出一幅图：不断变矮变宽、面积纹丝不动的高斯钟形。时间拖得越久它越扁；往回倒带，它缩成一根无限细的针——那口热量最初藏身的"点"。钟形本身有个名字：热核。

## 3. 正式定义

取热扩散率 $k=1$，热方程与"一点热量"初值写作：

$$u_t = u_{xx}, \qquad u(x,0)=\delta(x).$$

| 符号 | 名称 | 含义 |
| --- | --- | --- |
| $\delta$ | 点源初值 | 理想化的针：全部热量集中在 $x=0$ 一点 |
| $G(x,t)$ | 热核 | 点源初值的解，时刻 $t$ 的温度分布 |
| $4t$ | 宽度因子 | 钟形宽度按 $\sqrt{t}$ 增长 |
| $2\sqrt{\pi t}$ | 峰高分母 | 峰高 $1/(2\sqrt{\pi t})$ 按 $1/\sqrt{t}$ 变矮 |

热核的显式公式：

$$G(x,t)=\frac{e^{-x^2/(4t)}}{2\sqrt{\pi t}}, \qquad t>0.$$

它最硬的性质是面积守恒：对任意 $t$，曲线下面积恒等于 $1$——热量一分没丢，只是摊开了。若热扩散率是一般的 $k$，把公式里的 $t$ 换成 $kt$ 即可。

## 4. 分步例题

**例 1**：算 $G(1,\ 0.5)$。

1. 指数：$-\dfrac{x^2}{4t} = -\dfrac{1}{2}$；
2. 峰高分母：$2\sqrt{\pi t} = 2\sqrt{1.5708} \approx 2.507$；
3. 代入：$G(1,0.5) = \dfrac{e^{-0.5}}{2.507} \approx \dfrac{0.6065}{2.507} \approx 0.242$。

**例 2**：峰高序列 $G(0,t) = \dfrac{1}{2\sqrt{\pi t}}$。

1. $t=0.25$ 时峰高 $0.564$；$t=1$ 时 $0.282$；$t=4$ 时 $0.141$；
2. 时间每翻 4 倍，峰高恰好减半（因为 $\sqrt{4}=2$）；
3. 对照 40 课模态解 $e^{-k\pi^2t}\sin(\pi x)$：模态原地不动地衰减、形状保持；热核边摊开边变矮——同一种抹平，两种姿势。

## 5. 动手实验

### 实验 1：拖动时间看钟形摊开

```viz
{
  "type": "plot",
  "title": "热核 G(x,t) 滑块 t 当时间（橙色虚线是 t=0.1 的旧影）",
  "expr": "exp(-x*x/(4*t))/(2*sqrt(pi*t))",
  "expr2": "exp(-x*x/(4*0.1))/(2*sqrt(pi*0.1))",
  "xmin": -6, "xmax": 6,
  "sliders": [
    { "name": "t", "min": 0.1, "max": 3, "step": 0.01, "value": 0.5 }
  ]
}
```

拖动 $t$：蓝钟形变矮、变宽，橙色虚线是它 $t=0.1$ 时的旧影。盯住钟形与横轴之间围出的面积——无论拖到哪，它都是 $1$。变矮不是热量消失，是摊宽的代价。

### 实验 2：峰高与面积的守恒读数

```python title="三个时刻：峰高变矮，面积恒为 1"
import math

def kernel(x, t):    # def 定义函数：热核在位置 x、时刻 t 的取值
    return math.exp(-x * x / (4 * t)) / (2 * math.sqrt(math.pi * t))

def area(t):         # 梯形法算曲线下面积：把 [-20, 20] 切 2000 片
    n = 2000
    dx = 40.0 / n
    total = 0.0
    for i in range(n + 1):
        yi = kernel(-20.0 + i * dx, t)
        if i == 0 or i == n:            # 两端各算半片
            total = total + yi * dx / 2
        else:
            total = total + yi * dx
    return total

for t in [0.25, 1.0, 4.0]:        # 依次检查三个时刻
    print(round(kernel(0.0, t), 3))   # 峰高读数
    print(round(area(t), 3))          # 面积读数：守恒检查
```

输出 `0.564`、`1.0`、`0.282`、`1.0`、`0.141`、`1.0`。峰高按 $1/\sqrt{t}$ 一路走低，面积读数三连 `1.0`——热量账本分毫不差。

### 实验 3：逐点验算 G_t = G_xx

```python title="中心差分验证热核满足热方程"
import math

def kernel(x, t):
    return math.exp(-x * x / (4 * t)) / (2 * math.sqrt(math.pi * t))

x = 0.8         # 位置
t = 1.2         # 时刻
h = 0.0001      # 差分步长

g_t = (kernel(x, t + h) - kernel(x, t - h)) / (2 * h)      # 时间方向的中心差分
g_xx = (kernel(x + h, t) - 2 * kernel(x, t) + kernel(x - h, t)) / (h * h)   # 空间二阶差分
print(round(g_t, 4))
print(round(g_xx, 4))
print(round(g_t - g_xx, 4) + 0.0)   # 两者之差，应为 0
```

输出 `-0.0689`、`-0.0689`、`0.0`。热核不是画出来好看的钟形，它逐点满足热方程——选读里把这组导数亲手配平。

## 6. 练习

```exercise
# @title: 练习：给热核算一笔面积账
# @check: 0.242
# @check: 1.0
# @hint: 峰高是 1 除以 2*sqrt(pi*t)；指数分母是 4*t。面积算出来不是 1，就说明公式还没写对。
import math
t = 0.5         # 时刻
x = 1.0         # 位置

pref = 2 * math.sqrt(math.pi * t)        # ← 有错一：2*sqrt(pi*t) 是分母，峰高是 1 除以它
u = pref * math.exp(-x * x / (2 * t))    # ← 有错二：指数分母是 4*t，不是 2*t
print(round(u, 3))

# 数值积分：[-6, 6] 切 1200 片，逐片累加曲高乘宽
n = 1200        # 切片数
dx = 12.0 / n   # 每片宽度
total = 0.0
for i in range(n + 1):
    xi = -6.0 + i * dx
    yi = 2 * math.sqrt(math.pi * t) * math.exp(-xi * xi / (2 * t))   # ← 错随上：公式一起改
    if i == 0 or i == n:
        total = total + yi * dx / 2
    else:
        total = total + yi * dx
print(round(total, 3))
```

<details>
<summary>点开查看逐步解答</summary>

修正后的面积账：

```python
import math
t = 0.5
x = 1.0

pref = 1 / (2 * math.sqrt(math.pi * t))
u = pref * math.exp(-x * x / (4 * t))
print(round(u, 3))     # 0.242

n = 1200
dx = 12.0 / n
total = 0.0
for i in range(n + 1):
    xi = -6.0 + i * dx
    yi = math.exp(-xi * xi / (4 * t)) / (2 * math.sqrt(math.pi * t))
    if i == 0 or i == n:
        total = total + yi * dx / 2
    else:
        total = total + yi * dx
print(round(total, 3))   # 1.0
```

```text
u = exp(-0.5)/(2*sqrt(pi*0.5)) = 0.6065/2.5066 = 0.242
total = 1.0：[-6,6] 已装下整个钟形（窗外尾部不到十亿分之二）
```

点值对了还不够——面积读数是公式的体检仪：错一个常数，它立刻翻脸。

</details>

## 7. 常见误区

::::warning[常见误区]

**误区一**：你以为时间一长热量就"摊没了"。峰高趋零的同时宽度按 $\sqrt{t}$ 增长，面积始终是 $1$——守恒由公式亲自担保。

**误区二**：你以为指数里的 $4$ 是随手写的。把 $G$ 代回 $u_t = u_{xx}$ 逐项配平（见选读），正是这个 $4$ 让时间项与空间项严丝合缝。

**误区三**：你以为热核只会摊"一个点"。任意初值都能切成无穷多个小点源，各自摊开再相加——这套"点源叠加"图景的正式兑现，要等 Fourier 合成的工具（该课在章节排期中）。

::::

## 8. 快问快答

```quiz
时间 t 拖大时，热核的峰高和宽度分别怎么变？
- 峰变矮，宽度变宽 [*]
- 峰变高，宽度变窄
- 两者都不变
? 峰高按 1/(2*sqrt(pi*t)) 变矮，宽度按 sqrt(t) 变宽，面积始终是 1。
```

```quiz
任意时刻给热核曲线下方量面积，读数是多少？
- 随 t 变大
- 恒等于 1 [*]
- 随 t 变小
? 热量守恒：点源塞进多少，钟形里就永远有多少，摊开不改变总量。
```

## 9. 选读：分母里的 4 从哪来

<details>
<summary>选读 · 把 G 代回热方程亲手配平</summary>

记 $G = e^{-x^2/(4t)}/(2\sqrt{\pi t})$，对 $t$ 求偏导：

$$G_t = G\cdot\left(\frac{x^2}{4t^2} - \frac{1}{2t}\right).$$

再对 $x$ 求两次偏导：

$$G_x = G\cdot\left(-\frac{x}{2t}\right), \qquad G_{xx} = G\cdot\left(\frac{x^2}{4t^2} - \frac{1}{2t}\right).$$

两个结果完全相同：$G_t = G_{xx}$。配平的关键正是指数分母里的 $4t$——若写成 $2t$ 或 $t$，时间项与空间项就差出一个因子。顺带一提：$t \to 0^+$ 时 $G$ 在原点之外处处为零、峰高冲天而面积恒 $1$，这正是 $\delta$ 函数的雏形。

</details>

## 10. 下一站

热核把"一点热量"的演化写成了闭式，可一般初值与边界条件（两端固定的弦、绝热的杆）怎么系统地求解？下一课换一条路：**分离变量法**——把 PDE 拆成一组 ODE，让边界条件先说话（该课在章节排期中，正文即将上线）。
