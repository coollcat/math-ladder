---
title: 从牛顿到拉格朗日
lesson_id: ode/newton-to-lagrange
prereqs:
  - ode/vibration-resonance
  - multivariable/partial-gradient
volume: 2
layer: L9
track:
  - analysis-change
  - scientific-computing
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - generalized-coordinates
  - lagrangian
applications:
  - robotics
exits:
  - engineering
---

# 从牛顿到拉格朗日

## 1. 从一个场景开始

机器人实验室要让一条双关节机械臂沿桌面画出圆弧。用牛顿第二定律硬算？你得到关节 $O_1$ 画受力图：重力、电机扭矩、还有杆 $B$ 通过关节施来的**未知反作用力**；再去关节 $O_2$ 又冒出一组反力。这些约束力互相牵扯，六七个未知数挤成联立方程，解出来只为让它们**当场抵消**——监工全程在场，却一分钱工资都不进总账。拉格朗日的做法只有两句台词：写动能，写势能，做减法，剩下的微分照章办事。约束力从头到尾没有出现过。这一课就把这套"给工程师松绑"的机器拆开看。

## 2. 直觉解释

牛顿法的辛苦有一个明确的来源：他用**笛卡尔坐标**记账，而系统真正想去的地方少得多。单摆在空间里有横纵两个变量 $(x,y)$，却被绳长条件 $x^2+y^2=l^2$ 死死拴住——真正自由的只有一个方向：角度 $\theta$。

像 $\theta$ 这样"个数恰好等于自由度"的自变量，叫**广义坐标**。选定它之后：

- 绳子张力这类约束力永远沿着被冻结的方向做功为零；
- 它们因此在最终方程里集体隐身——不是被消掉，而是**压根不许进门**。

视角换成能量则是第二步解放。力和加速度都是矢量，要在图上分分合合；动能与势能却是**标量**，只管加减不管方向。矢量世界里的"受力分析五步曲"，到这里压缩成"加加减减两行诗"。

## 3. 正式定义

设系统的自由度为 $n$，选定广义坐标 $q_1,\dots,q_n$：

| 符号 | 含义 |
| --- | --- |
| $T$ | 动能：各部件的 $\tfrac12 m v^2$（或转动件 $\tfrac12 I\omega^2$）总和 |
| $V$ | 势能：只依赖位置的那部分储备（如重力项） |
| $L=T-V$ | **拉格朗日函数**：动势之差 |
| $q_k,\ \dot q_k$ | 第 $k$ 个广义坐标与其变化率 |

对每个 $q_k$ 执行同一条流水线（**欧拉–拉格朗日方程**）：

$$\frac{d}{dt}\Big(\frac{\partial L}{\partial\dot q_k}\Big)-\frac{\partial L}{\partial q_k}=0.$$

操作心法只有四拍：$\dfrac{\partial L}{\partial \dot q_k}$ 攒出第 $k$ 方向的"动量"，$d/dt$ 问它的变化率；$\dfrac{\partial L}{\partial q}$ 量出位形改变的倾向；两者相减为零，就是"惯性收支平衡"。每个自由度一套动作，照抄即可。本章给出的是这条流水线的**应用速通版**；它为什么成立——能量积分如何等价于对一切微小试运行的比较——的严格演出在[变分法选讲：Euler-Lagrange 与最速降线](../26-functional-analysis/95-calculus-of-variations.md)完成，两课各自守界、互不重复。

## 4. 分步例题

**例题 · 单摆方程自动出炉**。摆长 $l$、质量集中摆锤 $m$、广义坐标取摆角 $\theta$（偏离竖直向下方向）。

1. 攒动能：摆锤速率 $v=l\dot\theta$，故 $T=\tfrac12m(l\dot\theta)^2=\tfrac12ml^2\dot\theta^2$；
2. 记势能：以最低点为零点，高度抬升 $l(1-\cos\theta)$，故 $V=mgl(1-\cos\theta)$；
3. 写差：$L=T-V=\tfrac12ml^2\dot\theta^2-mgl(1-\cos\theta)$；
4. 执行流水线：$\dfrac{\partial L}{\partial\dot\theta}=ml^2\dot\theta$，对时求导得 $ml^2\ddot\theta$；$\dfrac{\partial L}{\partial\theta}=-mgl\sin\theta$；代入方程整理：

$$\ddot\theta+\frac{g}{l}\sin\theta=0.$$

绳子张力一次也没露面。小角度时 $\sin\theta\approx\theta$，立刻退回本章熟悉的线性振动；大摆角的逐帧求解交给前面 [Euler 法与 Runge-Kutta](./60-euler-runge-kutta.md) 的机器，刚性问题另有 [刚性方程](./62-stiff-equations.md) 的对策。

## 5. 动手实验

网页组件库里还没有为力学摆定制的交互件，这里交给浮窗 Python 双管齐下：先把相图画出来亲眼看"同一个方程、三种命运"，再用能量哨兵盯梢数值求解的质量。

### 实验 1 · 相图上的三张人生答卷

```python title="单摆相图：摆动、临界与旋转"
import math                                  # 提供 sin/cos/sqrt/pi
import matplotlib.pyplot as plt              # 绘图库

g, l = 10.0, 1.0                             # 重力加速度与摆长

# 三条初始条件：(初始角, 初始角速度)
seeds = [(0.6, 0.0), (2.2, 0.0), (0.0, 9.5)]
labels = ["A 小幅摆", "B 大摆铃", "C 旋转"]
results = []                                     # 收集 (名字, 十秒后末角)

for (th0, om0), name in zip(seeds, labels):  # zip 把两组配对并行送入循环
    th, om = th0, om0
    xs, ys = [], []                          # 分别记录角度与角速度轨迹
    for k in range(10000):                   # 半隐式欧拉推进 10 秒
        alpha = -(g / l) * math.sin(th)
        om = om + alpha * 0.001              # 先更新角速度
        th = th + om * 0.001                 # 再用新速度推进角度
        xs.append(th)                        # append 把样本接到列表尾
        ys.append(om)
    results.append((name, round(th, 3)))     # 登记十秒后的末角
    plt.plot(xs, ys, linewidth=0.8, label=name)

plt.xlabel("theta")
plt.ylabel("omega")
plt.legend()
plt.title("同一方程的三种运行方式")
plt.show()                                   # 渲染画布

for name, th_end in results:                 # 独立汇报三条轨道的结局
    print(name, "十秒后末角 =", th_end)
```

解读画面：A 的轨道是闭合的小环，打印的末角约 $0.53$ 弧度、净转圈数为 **0**；B 的能量足以甩到大偏角却**翻不过顶点**，被困在 $\pm125°$ 之间往复（末角 $-2.18$ 表明它又一次贴到摆幅边缘调头）；C 的起点角速度够快，一路向右扫过周期带，**十秒转过约 13 圈**。三种结局写进同一个方程，裁判只需初始能量一张牌。

### 实验 2 · 能量哨兵巡检

```python title="数值解要配一把能量尺"
import math                                  # sin/cos

g, l = 10.0, 1.0
dt, steps = 0.001, 10000                     # 步长与总步数：共 10 秒
th, om = math.pi / 2, 0.0                    # 从水平位置静止释放
E_ref = g * l                                # 全部初始能量都在势能账上

for k in range(steps):
    alpha = -(g / l) * math.sin(th)
    om = om + alpha * dt                     # 先速度后角度
    th = th + om * dt
    if k % 2000 == 1999:                     # 每满 2 秒报一次账
        kinetic = 0.5 * (l * om) ** 2        # 动能 = 0.5*m*v^2 的单位质量版
        potential = g * l * (1 - math.cos(th))
        drift = (kinetic + potential - E_ref) / E_ref * 100
        print("t =", round((k + 1) * dt, 1), "s, 能量偏差", round(drift, 3), "%")
```

十秒内五次报数的偏差全部落在 $\pm0.15\%$ 以内，而且**正负交错**而不是单向溜号——这是半隐式欧拉的招牌美德：长期能量有界抖动。若把更新顺序反过来（先角度后速度），偏差会开始单调爬坡；数值方法的细节有时决定结论的可信度。

## 6. 常见误区

:::warning[常见误区]
- **你以为 $L$ 该是 $V-T$ 或者 $T+V$，其实差号才是灵魂**：$L=T-V$ 让"爱动的部分加分、越稳越吃亏"，方程才能读成"动量的积累回应位形的牵引"；写成哈密顿量的 $T+V$ 是另一门语言（正则形式），别在这里串场。
- **你以为选定了广义坐标就万事大吉，其实还要确认个数恰好等于自由度**：平面双杆臂取两个关节角正好；再多记一个笛卡尔坐标会凭空造出一个"假自由度"，流水线立刻输出一条错误的方程。
- **你以为拉格朗日法和牛顿法算出的物理不同，其实它们恒等**：同一系统两条路线必得同一方程，差别只在劳动量与出错面。约束越多、几何越拧巴，拉格朗日的优势越大；单粒子自由落体这种场景反而绕远路。
:::

## 7. 练习

机械臂末端装了一根匀质杆当摆臂，要用能量账户预演它抬起时的收支。负责记账的同学漏写了动能公式的零件——请把那一行补齐再交卷：

```exercise
# @title: 补齐摆杆的动能账户
# @check: 27
# @check: 30
# @check: 57
# @hint: 刚体转动的动能不是 I*w，而是带着平方与一半：想一想 1/2*I*w^2 那张经典卡片，其中 w 是角速度的平方前项。
import math                          # math 提供 pi 与 sin

m = 2          # 杆质量（千克）
l = 3          # 杆长（米）
g = 10         # 本章实验取 g=10，便于对照整数
q = math.pi / 2   # 当前摆角 90 度：杆刚抬到水平
qd = 3            # 当前角速度（弧度/秒）

def kinetic(w):                  # 定义函数：传入角速度返回动能
    inertia = m * l ** 2 / 3     # 匀质杆绕端点的转动惯量 I = m*l^2/3
    return inertia * w           # ← 这一行的零件少了

height = (l / 2) * math.sin(q)   # 重心高度：杆中点的抬升量
V = m * g * height               # 势能 = 质量 × g × 高度

T = kinetic(qd)
print(int(T))                    # int() 去掉浮点尾巴方便核对
print(int(V))
print(int(T + V))
```

<details>
<summary>点开查看逐步解答</summary>

核对目标：动能属于"转动的账"，公式是 $\tfrac12I\omega^2$。转动惯量那行没毛病：$I=\dfrac{ml^2}{3}=\dfrac{2\times9}{3}=6$；问题出在调用处把 $\omega^2$ 和前面的 $\tfrac12$ 都丢了。正确写法：

```python
return inertia * w ** 2 / 2      # 动能 = I*w^2/2
```

代入 $w=qd=3$：$T=\dfrac{6\times9}{2}=27$；重心抬升在中点，$V=2\times10\times1.5\times\sin90°=30$；总账 $E=T+V=57$。三个整数正是判题要的答案。这份账户在拉格朗日流程里就是主角：下一步对 $\dot q$ 与 $q$ 各求一次偏导，运动方程就会自己爬出来——能量写得对，方程才立得住。

</details>

```quiz
平面上的三连杆机械臂（三根杆依次铰接，第一根固定在桌面上可以任意旋转），描述它的姿态最少需要几个广义坐标？
- 2 个
- 3 个 [*]
- 6 个
? 平面内每个关节贡献一个独立角度，三根杆三个角度正好；6 个是把三维空间的规则错套进了平面问题。广义坐标的个数等于自由度，不多也不少。
```

## 8. 边界与选读

这台"自动方程机"的甜区是**理想完整约束 + 保守力**的系统。三类情况它会噎住或者需要改装：摩擦空气阻力这类耗散力量需要额外贴一张瑞利阻尼标签；接触碰撞瞬间的不连续过程不适合光滑的 L 语言；滚动不打滑这类"只限速度不许积分成位置"的非完整约束更是出了名的难缠对象。另外，写出的是二阶方程本体，而哈密顿式的"降阶成一阶组"再升级一层去讨论稳定性、守恒律，属于后续理论课的内容。

<details>
<summary>选读 · 为什么约束反力进不了方程</summary>

朴素说法：约束只在"它锁死的方向"上使劲，而广义坐标在那儿根本没有活动余地——锁死方向的力做了零功，自然不上账本。把这层直觉说严格的工具是**虚功**：允许想象一组不真发生、只满足约束的微小位移（虚位移），要求所有约束力在这组位移上做的总功为零（达朗贝尔–拉格朗日原理）。从这里出发把实位移也纳入比较框架，"约束力两两抵消"变成了可操作的证明步骤；继续往前走半步，把"对时间的一族轨迹"整体变分，便抵达泛函极值的 Euler-Lagrange 视角——那条路的全程即本站 26 章的变分法课。

</details>

## 9. 下一站

我们如今拥有了两套书写方程的本事：力的矢量和能量的标量。接下来的剧情则有点惊悚——哪怕方程简单到只是一行递推式，确定的规则也可能翻脸不认人，把相邻的两步推向天壤之别的未来。

→ [混沌：logistic 映射与倍周期分岔](./70-chaos-bifurcation.md)
