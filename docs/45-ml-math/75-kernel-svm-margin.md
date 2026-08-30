---
title: 核技巧与 SVM 大间隔
lesson_id: ml-math/kernel-svm-margin
prereqs:
  - ml-math/logistic-regression
  - optimization/convexity
volume: 5
layer: L10
track:
  - information-learning
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - max-margin
  - support-vector
  - kernel-trick
applications:
  - document-classification
  - bioinformatics-screening
exits:
  - data-ai
---

# 核技巧与 SVM 大间隔

## 1. 从一个场景开始

同一批肿瘤样本，逻辑回归说"这个 $p=0.52$， borderline"；临床主任只问一句："这条分界线，离两边最危险的样本有多远？"——他想要的是**余量**：万一明天来一个测量噪声稍大的新样本，分类会不会立刻翻脸？

支持向量机（SVM）把这个问题变成几何承诺：不画随便一条能分开的线，专挑**与两类最近样本都保持最大距离**的那条。而它真正的魔法在后手——借助一个叫核技巧的代数戏法，直线秒变曲面，还不用多算一个特征。

## 2. 直觉解释

先看"最宽走廊"。把分隔线想象成一条街，街道要尽量宽敞，两边的最近房屋（临界样本）卡在人行道边缘。**街道的宽度由几栋最贴边的房子决定**——其他样本站得再远也插不上话。这几栋定宽度的房子就叫**支持向量**。

再看第二个画面：同心圆戒指摊在桌面上（内圈、外圈两组点），一把直尺怎么摆都切不开——尺子是直线，戒指是曲线围栏。可是如果我凭空多看一个维度呢？给每个点记录它到圆心的距离平方，两组点瞬间在"高度"上分了层。**换个视角站高一层，低维的死结往往是高维的一刀。**

这两幅图拼起来就是本章的故事：低维切不开 → 手工或自动地站到高维 → 在那里找最宽走廊。唯一的问题是：显式构造高维特征可能贵到天文数字，得想办法绕开——这就是核技巧登场的理由。

## 3. 正式定义

设训练样本 $(x_i,y_i)$，$y_i\in\lbrace-1,1\rbrace$。线性 SVM 寻找满足 $y_i(w\cdot x_i+b)\ge 1$（全体）且间隔最大的参数：

$$\max_{w,b}\ \frac{2}{\lVert w\rVert}\quad\Leftrightarrow\quad\min_{w,b}\ \frac12\lVert w\rVert^2\ \text{s.t.}\ y_i(w\cdot x_i+b)\ge1$$

| 符号 | 含义 |
| --- | --- |
| $\lvert \gamma\rvert=\dfrac{2}{\lVert w\rVert}$ | 走廊宽度：越小的 $\lVert w\rVert$ 给出越宽的街 |
| 支持向量 | 恰好踩在线 $y_i(w\cdot x_i+b)=1$ 上的临界样本 |
| 凸二次规划 | 目标凸、约束线性，局部最优即全局（第 43 章的老朋友） |

它的对偶形式（第 43 章 40 号课的手艺）才是主角：

$$\max_{\alpha}\ \sum_i \alpha_i-\frac12\sum_i\sum_j \alpha_i\alpha_j y_i y_j\,\langle x_i,x_j\rangle$$

盯住最后一项：整个对偶问题里数据**只以内积 $\langle x_i,x_j\rangle$ 的身份出现**。既然如此，想在高维特征空间里玩同样的游戏，只需给出那里的内积——根本不必真把点搬过去。定义核函数 $K(u,v)=\langle\phi(u),\phi(v)\rangle$（$\phi$ 是升维映射），用 $K$ 替换全部内积即可。多项式核 $K(u,v)=(\langle u,v\rangle+c)^d$ 一言不合就把二维平面抬进百万维；只要 $K$ 满足合法性条件（Mercer 定理，见选读），隐含的高维空间真实存在。

## 4. 分步例题

**例**：一维打分世界里，负类样本在 $s=-2$、正类在 $s=2$。两位候选裁判：

1. 裁判甲把边界立在 $t=0$：两侧余量各 2；
2. 裁判乙立在同侧偏一点的 $t=1$：左余量 3、右余量只剩 1；
3. SVM 的评判标准是**最坏一侧**的余量（木桶短板）：甲的短板 2、乙的短板 1，甲胜出；
4. 结论抽象成一句话：最优边界永远卡在中点—— maximizing 距离最近的敌人；
5. 推广到多维后这仍是那个二次规划；而一维的中点直觉，就是"支持向量夹出走廊"的最简版本。

## 5. 动手实验

### 实验 1：走廊宽窄随手调

两条平行线之间的地带就是可用的"安全走廊"，中央的真正分界线位于两者正中。拖动半宽 $g$（法向距离），体会"间隔预算"如何被两侧陡峭度吃掉。

```viz
{
  "type": "plot",
  "title": "同一条分界线，两种走廊预算",
  "expr": "-a*x+b-g*sqrt(1+a*a)",
  "expr2": "-a*x+b+g*sqrt(1+a*a)",
  "label": "margin low",
  "label2": "margin high",
  "xmin": -3,
  "xmax": 3,
  "sliders": [
    { "name": "a", "min": 0.2, "max": 2, "step": 0.1, "value": 0.8 },
    { "name": "b", "min": -2, "max": 2, "step": 0.1, "value": 0 },
    { "name": "g", "min": 0, "max": 1.5, "step": 0.05, "value": 0.4 }
  ]
}
```

$g$ 是每侧的净空，斜率 $a$ 越大同样净空在纵向上张口越大——图中纵横比提醒你：间隔按法向距离计算，所以系数里有 $\sqrt{1+a^2}$ 这个修正因子。大间隔不是"更宽松的及格线"，而是把最脆弱样本的翻案成本抬高。

### 实验 2：手工升维前后，可分性对比

```python title="同心圆问题：加一个特征 z=x^2+y^2，死结变一刀"
import matplotlib.pyplot as plt

x_list = [0.5, -0.6, 0.1, -0.3, 0.4, 2.0, 0.0, -1.9, 1.4, -1.5, 1.3]
y_list = [0.0, 0.1, -0.7, -0.3, 0.4, 0.0, 2.1, 0.3, 1.4, -1.4, -1.2]
labels = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1]     # 0=内圈组，1=外圈组

def count_errors(threshold):
    return sum(1 for i in range(len(labels)) if (feats[i] >= threshold) != bool(labels[i]))

feats = x_list                                  # 阶段一：只有原始横坐标可用
print("横坐标一刀：errors =", count_errors(0.95))

zs = [x * x + y * y for x, y in zip(x_list, y_list)]   # zip：按位置配对遍历
gap_low = max(zs[:5])                            # 内圈的最高峰
gap_high = min(zs[5:])                           # 外圈的最低谷
threshold = (gap_low + gap_high) / 2             # 夹缝正中设阈

feats = zs                                       # 阶段二：站上高度维度
print(f"z 一刀（阈 {threshold:.3f}）：errors =", count_errors(threshold))

colors = ["tomato" if v == 0 else "royalblue" for v in labels]
plt.scatter(x_list, y_list, c=colors)            # 左：原始平面，戒指套戒指
plt.xlabel("x"); plt.ylabel("y")
plt.figure()
plt.scatter([v * v for v in x_list], [v * v for v in y_list], c=colors)
plt.xlabel("x^2"); plt.ylabel("y^2")             # 右：平方视图，红蓝各自抱团
plt.grid(True)
```

实测读数：横坐标那一刀最多能救回一半仍要错 3 个；换成 $z$ 后夹缝区间 $[0.50,\ 3.13]$ 宽敞得可以开车——阈值 $1.815$ 上设卡，零误差。右图是这场魔术的底片：所谓升维，不过是换了幅让差距显形的坐标系。散点布局超出 plot 组件的函数曲线语法，所以这里动用了 matplotlib 的自由度——组件金字塔的下一层不是退而求其次，而是各司其职。

### 快问快答

```quiz
对偶表达式里如果换成多项式核 K(ui,uj)=(ui·uj+1)^2，等价于在哪里分类？
- 还在原来的二维平面，只是换了条弯一点儿的线
- 在一个由二阶单项式撑起的高维空间里做线性分类 [*]
- 数据会自动变多
? 展开后出现的 ui^2、uj^2、交叉项正是高维特征的内积——维度暴涨但计算原地不动，这就是"甩掉坐标"的含义。
```

:::warning[常见误区]

**误区一**："核技巧是 SVM 专属配件。" 它是对偶表达式只含内积这件事的红利：逻辑回归、PCA 等同样存在核化版本。SVM 只是最早吃到螃蟹的那一批。

**误区二**："间隔最大化一定带来最高准确率。" 大间隔是一种偏向"简单解"的正则化偏好（第 55 课语汇的几何形态）；当类别天然重叠时，宽容软间隔或概率输出反而更合理。

**误区三**："支持向量越多模型越准。" 过多的支持向量往往意味着模型在硬记噪声边界；它们是复杂度信号，不是荣誉勋章。

:::

## 6. 练习

**练习 1**（概念）：用"最宽走廊"的语言解释：为什么删掉一个远离边界的普通训练点，最优分割线纹丝不动？删一个支持向量试试呢？

<details>
<summary>点开查看逐步解答</summary>

远处的住户不影响街道宽度——走廊仍由原来那几个贴边样本顶住，二次规划的解不变；反过来，支持向量是走廊的承重墙，挪走它，最优化立刻重新选址、整条边界搬家。"数据未必都有发言权"正是 SVM 区别于平均主义损失（如平方误差）的身份标识。</details>

**练习 2**（判题）：核函数宣称自己等价于一个六维特征映射。初始代码把多项式核漏了常数项、映射又缺了三行。请修好这两处，用数值对质：

```exercise
# @title: 练习：核函数与显式映射当面对账
# @check: 4.0
# @check: 3.349
# @check: True
# @hint: 多项式核是 (内积 + 1)^2；phi 要补上 √2·x、√2·y 和常数 1 三行才凑齐 (u·v+1)^2 的展开。
def kpoly(u, v):
    return (u[0] * v[0] + u[1] * v[1]) ** 2        # ← 错了：括号里漏了常数项 +1

def phi(u):
    # 手工展开的二阶映射：[x^2, y^2, √2xy, √2x, √2y, 1]
    s2 = 2 ** 0.5                                  # 平方根近似：2 的平方根
    x, y = u
    return [x * x, y * y, s2 * x * y]              # ← 错了：少了后三个分量

a = (0.5, 0.0)
b = (2.0, 0.0)
c = (-1.9, 0.3)
d = (1.3, -1.2)

print(kpoly(a, b))
print(round(kpoly(c, d), 3))

diff = abs(kpoly(a, c) - sum(p * q for p, q in zip(phi(a), phi(c))))   # 显式高维内积
print(diff < 1e-9)
```

修好后三行输出 `4.0`、`3.349`、`True`：同一个二元组，走核的捷径与扛着六个坐标爬山，落点分毫不差——这就是"甩掉坐标"可以做诚实的数学承诺的原因。

**练习 3**：回到实验 2，把所有点的坐标整体放大到原来的三倍（标签与结构都不动），重跑一遍并观察阈值搬到了哪里。哪个结论变了，哪个没变？

<details>
<summary>点开查看逐步解答</summary>

坐标乘 3 后 $z=x^2+y^2$ 放大九倍：内圈最高峰 $0.50\times9=4.50$、外圈最低谷 $3.13\times9\approx28.17$、阈值搬到约 16.34，零误差依旧。变的都是刻度（阈值、区间端点），不变的才是结构（夹缝存在、顺序保持）——可分性是形状问题，不是单位问题。</details>

## 7. 选读：从对偶到 Mercer

<details>
<summary>选读 · 合法核的通行证</summary>

用 $K$ 替换内积后得到的优化问题还能不能对应某个真实高维空间里的超平面？Mercer 定理给出判据：只要 $K$ 对称且任意有限点集上的核矩阵半正定，就存在映射 $\phi$ 使 $K(u,v)=\langle\phi(u),\phi(v)\rangle$。常用通行证：多项式核、RBF 高斯核、sigmoid 核各有适用口味（文本高频稀疏爱线性核，图像团块爱 RBF）。另外别忘了现实中的软垫：允许个别样本越线的软间隔 $C$ 参数把"最宽走廊"与"少蹲监狱"揉成一个折中——纯粹主义在噪声面前活不长。</details>

## 8. 下一站

模型造好了、边界立住了，最后一块拼板是怎么考试：把贵的数据切成几份轮流出题、又该用哪些指标读懂成绩单？收官课来补齐评估的最后工具箱。

→ [交叉验证与常见指标](./85-cross-validation-metrics.md)
