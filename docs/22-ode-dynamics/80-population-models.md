---
title: SIR 与 Lotka-Volterra：相互作用的种群建模
lesson_id: ode/population-models
prereqs:
  - ode/phase-portraits
  - ode/euler-runge-kutta
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
  - sir-compartment-model
  - lotka-volterra-system
  - basic-reproduction-number
applications:
  - epidemiology
  - population-dynamics
exits:
  - scientific-computing
  - data-ai
---

# SIR 与 Lotka-Volterra：相互作用的种群建模

## 1. 从一个场景开始

一座十万人的城市报告了几十例传染病确诊。防疫指挥官要回答两个问题：这次疫情会不会失控？要不要立刻把学校关掉？直觉给不出答案，[上一课](./70-chaos-bifurcation.md)的单物种 logistic 也给不出——疫情的关键恰恰在于人与人的**相互作用**：健康人遇到感染者才会被传染。把人群切成几个 compartment（仓室）数清楚流水账，答案自己会浮出来。同样的故事换一套角色：草原上的狐狸与兔子，也互相改写对方的明天。

## 2. 直觉解释

先看传染病。把城市想成三个水桶：**易感者桶 S**、**感染者桶 I**、**移除者桶 R**（痊愈或去世，不再参与传播）。水不会凭空流动，只有两条管道：

- S 到 I 的管道流量 ∝ 两只桶的人数相乘——相遇才传染，人数越多碰面越频繁；
- I 到 R 的管道流量 ∝ 感染者本身——每个病人每天以固定比例康复退场。

再看捕食关系。兔子独居草场会指数繁殖；狐狸没有兔吃会饿死。把它们放在一起，多了一条双向通道：狐狸逮到兔子（速率 ∝ 兔×狐），换来更多小狐狸。于是两队此消彼长，谁也不能把谁赶尽杀绝——轨迹只能围着某个中间平衡打转。

两类模型的共同底层：**数量按比例流进流出，比例系数依赖当前存量**。这正是非线性方程组的主场——线性叠加失效，必须请相图上场（回扣 [相图与线性化](./40-phase-portraits.md)），用 [Euler 法与 Runge-Kutta](./60-euler-runge-kutta.md) 把轨道一步步算出来。

## 3. 正式定义

**SIR 模型**（总人口归一化 $S+I+R=1$）：

$$\frac{dS}{dt}=-\beta SI,\qquad \frac{dI}{dt}=\beta SI-\gamma I,\qquad \frac{dR}{dt}=\gamma I.$$

$\beta$ 是单位时间的有效传播强度，$\gamma$ 是康复率。称

$$R_0=\frac{\beta}{\gamma}$$

为**基本再生数**：一个病人在全易感人群中平均传染的人数。$I$ 的符号由 $\beta S-\gamma$ 决定，因此门槛是阈值

$$S^\ast=\frac{\gamma}{\beta}=\frac{1}{R_0}:$$

初始 $S_0>S^\ast$（等价于 $R_0>1$）疫情先扬后抑，否则自行熄灭。全部人口患病也不会人人中招——疫情烧过一遍后必有剩余易感者（黑洞效应），这在第 5 节的账本里看得清清楚楚。

**Lotka-Volterra 捕食模型**：设 $x(t)$ 猎物密度、$y(t)$ 捕食者密度，

$$\frac{dx}{dt}=\alpha x-\delta xy,\qquad \frac{dy}{dt}=\eta xy-qy.$$

$\alpha$ 是猎物自繁殖率，$\delta$ 是相遇转化率，$\eta$ 是捕获收益换算率，$q$ 是捕食者饿死率（记号可依教材不同而调整，含义一一对应）。系统唯一的正平衡点是把两条导数同时置零：

$$\left(\frac{q}{\eta},\ \frac{\alpha}{\delta}\right).$$

在该点做线性化会得到纯虚特征值（trace $=0$）——中心型平衡点，周围轨道一圈圈闭合，这就是著名的"捕食者-猎物振荡"。

## 4. 分步例题

设某种流感 $\beta=0.3$、$\gamma=0.2$（单位：每周），初期 $S_0=0.98$、$I_0=0.02$。判断疫情走势：

1. 算再生数：$R_0=\beta/\gamma=0.3/0.2=1.5$，大于 1，警报成立；
2. 算阈值：$S^\ast=\gamma/\beta=0.2/0.3\approx0.667$，即约三分之二的人口是失控线；
3. 比较起点：$S_0=0.98>S^\ast$，感染者增速 $dI/dt=I(\beta S-\gamma)$ 开局为正，疫情爬升；
4. 见顶条件：疫情不是被"药"压下去的，而是易感者烧薄——当 $S$ 恰好跌破 $S^\ast$ 的瞬间，新增感染恰好抵消康复，感染数到达峰值后转为回落；
5. 后续落点：定量算出最终规模需要解隐式方程（本课交给他日统计课），下一节先用数值模拟把它端出来。

这套判断完全不需要知道曲线长什么样——这正是阈值定理的威力：一支纸笔就能预判封城的必要性。

## 5. 动手实验

### 实验 1：一城疫情的六十天流水账

```python title="SIR 三桶水量表：无干预下的六十天"
import matplotlib.pyplot as plt               # 绘图库，负责画感染水位线

b = 0.4                                       # 传播强度 beta
g = 0.2                                       # 康复率 gamma（注意 R0 = b/g = 2）
h = 0.02                                      # 步长：一天切成五十份，每 0.02 天
s, i, r = 0.99, 0.01, 0.0                     # 三个仓室的初始水位

i_max, t_peak = i, 0.0                        # 登记峰值及其出现时刻
snaps = []                                    # 每隔四天存一帧快照
i_hist = [i]                                  # 感染水位逐步登记（含起点）

for k in range(1, 3001):                      # 3000 步 = 60 天
    ds = -b * s * i                           # 易感桶只出不进
    di = b * s * i - g * i                    # 感染桶两头都有管子
    dr = g * i                                # 移除桶只进不出
    s += h * ds
    i += h * di
    r += h * dr
    i_hist.append(i)
    if i > i_max:                             # 顺手登记新峰值
        i_max, t_peak = i, k * h
    if k % 200 == 0:                          # 200 步 = 4 天，取一帧
        snaps.append((round(k * h, 2), round(s, 2), round(i, 2)))

print("四天一帧的快照 =", snaps)
print("峰值 I =", round(i_max, 4), "出现在第", round(t_peak, 1), "天")

plt.plot([k * h for k in range(3001)], i_hist, label="I infected")
plt.xlabel("days")
plt.ylabel("population share")
plt.legend()
plt.title("感染水位冲顶后自行退潮")
plt.show()
```

运行后：快照表显示易感者 $S$ 从 0.97、0.92 一路跌到 0.56 再滑向 0.22；感染者水位在第约 21.9 天冲到峰顶 $I\approx15.9\%$；六十天后累计感染 $R\approx79.3\%$，仍有约两成人从未被感染。对照第四节的手算结论：见顶位置不在"零感染"，而在阈值线附近——流行病是被"燃料耗尽"浇灭的。

### 实验 2：狐狸与兔子的圆舞曲

```python title="Lotka-Volterra 相轨线：RK4 上阵"
import math                                   # 提供 math.log 记能量账
import matplotlib.pyplot as plt               # 绘图库

a_, d_, n_, q_ = 1.0, 0.5, 0.5, 1.0           # alpha, delta, eta, q 四个生态参数
h, steps = 0.005, 8000                        # RK4 小步长跑四十个时间单位

def f(p):
    x, y = p                                  # 元组解包拿当前位置
    return [a_ * x - d_ * x * y, n_ * x * y - q_ * y]   # 返回两只导数

def energy(p):
    x, y = p
    return d_ * x - q_ * math.log(x) + n_ * y - a_ * math.log(y)   # 守恒量 V

state = [3.0, 1.0]                            # 起点：三只兔子一份狐狸
v0 = energy(state)
orbit_x, orbit_y = [], []                     # 记录相轨线

for k in range(steps):                        # 经典 RK4 四段斜率加权
    k1 = f(state)
    k2 = f([state[j] + h / 2 * k1[j] for j in range(2)])
    k3 = f([state[j] + h / 2 * k2[j] for j in range(2)])
    k4 = f([state[j] + h * k3[j] for j in range(2)])
    state = [state[j] + h / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]) for j in range(2)]
    orbit_x.append(state[0])
    orbit_y.append(state[1])

print("平衡点 =", (q_ / n_, a_ / d_))          # 中心 (2,2)
print("终点 =", [round(v, 3) for v in state])
print("能量漂移 =", abs(energy(state) - v0))

plt.plot(orbit_x, orbit_y, linewidth=0.8)     # 相平面里的闭合跑道
plt.xlabel("prey")
plt.ylabel("predator")
plt.title("围绕中心平衡点的圆舞曲")
plt.show()
```

四千来步之后兔子狐狸回到出发点身旁，"能量"$V=\delta x-q\ln x+\eta y-a\ln y$ 的漂移小于百万分之一——这颗人造卫星稳稳贴着自己的跑道。轨迹是一圈闭环：兔子多起来（横轴向右）喂肥狐狸（纵轴上行）→ 狐狸吃垮兔子（往左）→ 狐狸挨饿（往下）→ 循环重启。对比第一课 logistic 的单物种版本：相互作用没有让世界更乱，反而锁出了优雅的秩序。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为感染人数只会一直涨。$dI/dt$ 里藏着 $-\gamma I$ 这条退场管道；当 $S$ 跌破阈值 $S^\ast$，涨势自动翻转为退潮，峰值无需任何人工干预就会到来。

**误区二**：你以为控制疫情必须人人都免疫。“撞见才传播”的机制要求易感者基数够大才点火成功，$R_0=2$ 时只要 $S$ 低过 $50\%$，疫情就转入息灭模式——阈值永远小于 1。

**误区三**：你以为数值算出的螺旋越来越大是生态真相。用朴素欧拉法跑 Lotka-Volterra 会得到一圈比一圈大的假螺旋（离散误差破坏守恒律）；换成小步长 RK4 轨道重新闭合——方法课的价值在此兑现。

:::

## 7. 练习

下面这段代码想回答指挥官的两个问题：基本再生数是多少、以及第一步欧拉更新后疫情是涨是缩。但有两处想当然：判据数字填反了比值，更新感染水位时忘了有人痊愈出院：

```exercise
# @title: 练习：再生数判据与一步更新的双笔账
# @check: 200
# @check: 50
# @check: 899
# @check: 100
# @hint: R0 和阈值互为倒数，别把 β/γ 又写成 γ/β；更新 I 时减去 gamma*i*h 那一笔"出院流水"，疫情才有止境。
s = 0.9            # 当下易感者占比
i = 0.1            # 当下感染者占比
h = 0.02           # 步长（合适的时间小份）
beta = 0.5         # 传播强度
gamma = 0.25       # 康复率

print(round(100 * (gamma / beta)))    # ← 第一处想当然：把比值写反了
s_new = s - h * beta * s * i          # 这一行是对的
i_new = i + h * beta * s * i          # ← 第二处想当然：少了治愈退场的一笔
print(round(1000 * s_new))
print(round(1000 * i_new))
```

<details>
<summary>点开查看逐步解答</summary>

第一问：基本再生数 $R_0=\beta/\gamma=0.5/0.25=2$，放大一百倍后打印 `200`；全人群对应的全员门槛是它的倒数 $S^\ast=\gamma/\beta=0.5$，即 `50`。这两个数分列在失控线的两侧——判据本身就写在符号里。

第二问：感染仓室有进水管也有出水管，正确的一步是：

```python
s_new = s - h * beta * s * i                          # 0.8991 → 放大一千倍 899
i_new = i + h * (beta * s * i - gamma * i)            # 0.1004 → 放大一千倍 100
```

验算：新增感染 $\beta si=0.5\times0.9\times0.1=0.045$，退场 $\gamma i=0.25\times0.1=0.025$；乘上步长后正确解为 $0.1+0.02\times(0.045-0.025)=0.1004$，而漏掉退场的假答案会是 $0.1009$。再对照判据 $S_0=0.9>S^\ast=0.5$，此刻疫情确实仍在上坡；想让它跌，得让易感者消耗到一半以下。

</details>

```quiz
某城监测发现本次流行病的 R0 只有 0.8，防疫决策最合理的依据是？
- 不加干预疫情也会自行熄灭，资源可以优先投给重症 [*]
- 因为仍会出现病例，必须立刻封锁到彻底清零为止
- R0 小于 1 说明检测手段失灵，应当重测
? 新增链路一代比一代窄：R0<1 时每个患者传不满一个人，传播树必然枯萎；阈值定理由此给出"可承受的低烈度共处"选项。
```

## 8. 边界与选读

<details>
<summary>选读 · 为什么 Lotka-Volterra 的轨道一定是闭合的</summary>

猜一个守恒量 $V(x,y)=\delta x-q\ln x+\eta y-a\ln y$，沿轨道求全导数：

$$\frac{dV}{dt}=(\delta x-q)\frac{x'}{x}+(\eta y-a)\frac{y'}{y},$$

代入 $x'=\alpha x-\delta xy,\ y'=\eta xy-qy$ 展开，所有项两两抵消，$dV/dt=0$。轨道被困在一条 $V$ 取常值的封闭曲线上——这就是为什么它既不散架也不坍缩，也只能永远绕圈。这类"人为凑出的守恒量"叫首次积分，是研究二维系统的经典武器；实验 2 的能量账本量的正是它。

</details>

两个模型都是刻意裸化的骨架：真实疫情有潜伏期、再感染、空间迁徙与个体差异（随机版本见第 37 章马尔可夫链）；真实生态有季节、天敌网络与进化压力。参数从数据反推是统计推断的事。本课交付的是"非线性相互作用的语法"——有了相图和阈值这两样工具，更花哨的机制不过是往语法里添词。

## 9. 下一站

至此，本章的确定性故事讲完了：方向场立骨架，相图看全局，欧拉与 RK4 保数值，混沌提醒我们确定规则也会翻脸，种群模型示范相互作用如何被驯服。但如果这世界的骰子成分不可忽略呢？下一站跨入第 37 章 [马尔可夫链：状态与转移](../37-stochastic-processes/10-markov-chain.md)——把"未来只取决于现在"这条规矩保留下来，剩下的全交给概率。
