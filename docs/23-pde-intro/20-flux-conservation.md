---
title: 通量与守恒律
lesson_id: pde/flux-conservation
prereqs:
  - pde/from-ode-to-pde
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
  - flux
  - conservation-law
applications:
  - pollutant-transport
  - traffic-flow
exits:
  - engineering
---

# 通量与守恒律

## 1. 从一个场景开始

一段河道里的水不会凭空出现。想知道水量增减，只要盯住两端：左端流入多少，右端流出多少。这个“单位时间穿过截面的量”，就是通量。

## 2. 直觉解释

设 $u(x,t)$ 是管道中的密度，$q(x,t)$ 是通量。通量为正表示物质向右穿过截面，为负表示向左。

一小段区间里总量的变化率等于“流入减流出”。如果中间还有源或汇，再加上一项。这就是所有守恒律的共同骨架。

## 3. 正式定义

在一维区间 $\lbrace a<x<b\rbrace$ 上，总量是：

$$U(t)=\int_a^b u(x,t)\,dx.$$

积分守恒律写作：

$$\frac{dU}{dt}=q(a,t)-q(b,t)+\int_a^b s(x,t)\,dx.$$

若处处光滑，可化为微分形式：

$$u_t+q_x=s.$$

没有源汇时就是 $u_t+q_x=0$。线性对流取 $q=cu$，立刻回到上一课的 $u_t+cu_x=0$。

## 4. 分步例题

设 $q(x,t)=x^2$，区间是 $\lbrace 0<x<1\rbrace$，暂无源汇。

1. 左端流入率 $q(0)=0$；
2. 右端流出率 $q(1)=1$；
3. 区间总量的变化率为 $0-1=-1$；
4. 所以内部存储量每秒减少 1。

## 5. 动手实验

### 实验 1：可拖的通量盒

```viz
{
  "type": "flux-box",
  "title": "流入减流出决定存量",
  "left": [0.28, 0.65],
  "right": [0.72, -0.25],
  "storage": 1,
  "source": 0
}
```

拖动两个紫色把手：横向改变取样位置，纵向改变通量大小。蓝色盒子的高度就是存储量；它会随净流入自动涨落。

### 实验 2：加入源项

```viz
{
  "type": "flux-box",
  "title": "有源的守恒律",
  "left": [0.28, 0.25],
  "right": [0.72, 0.45],
  "storage": 0.8,
  "source": 0.5
}
```

即使右端流出略多于左端流入，正向源也能补足差额。守恒律不是“永远不变”，而是精确记账。

### 实验 3：离散记账

```python title="用有限差分算边界通量"
h = 0.01
x_left = 0.1
x_right = 0.9

# 定义一个示例通量函数 q(x)=x*x
def q(x):
    return x * x

q_in = q(x_left)
q_out = q(x_right)
net = q_in - q_out
print(round(q_in, 3))
print(round(q_out, 3))
print(round(net, 3))
```

输出 `0.01`、`0.81`、`-0.8`。负号说明这一段内部的总量正在减少。

## 6. 练习

```exercise
# @title: 练习：修正区间的净变化
# @check: 0.01
# @check: 0.81
# @check: -0.8
# @hint: 存量的变化率等于左端流入减去右端流出，不要把两项相加。
def q(x):
    return x * x

q_in = q(0.1)
q_out = q(0.9)
net = q_in + q_out
print(round(q_in, 3))
print(round(q_out, 3))
print(round(net, 3))
```

<details>
<summary>点开查看逐步解答</summary>

守恒律要求：

```python
def q(x):
    return x * x

q_in = q(0.1)
q_out = q(0.9)
net = q_in - q_out
print(round(q_in, 3))
print(round(q_out, 3))
print(round(net, 3))
```

代入得：

```text
q_in=0.01
q_out=0.81
net=0.01-0.81=-0.80
```

负号不是错误；它表示这段区间正在失去物质。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为通量就是密度。密度是“这里有多少”，通量是“每单位时间穿过多少”。

**误区二**：你以为流出应该加进存量。流出带走物质，所以要减。

**误区三**：你以为有源就不算守恒律。它仍是守恒式，只是在账本里多记一项源汇。

:::

## 8. 快问快答

```quiz
一维守恒律中 q(b)-q(a) 通常表示什么？
- 区间内部新增的物质
- 单位时间净流出区间的量 [*]
- 区间内密度的平均值
? 右端流出减左端流入；存量变化则相反，等于流入减流出。
```

## 9. 选读：从积分到微分形式

<details>
<summary>选读 · 让区间缩短</summary>

对

$$\int_a^b u_t\,dx=q(a)-q(b)=-\int_a^b q_x\,dx.$$

当区间任意选取且函数光滑时，被积函数必须逐点相等，因此 $u_t=-q_x$。这就是 $u_t+q_x=0$。

</details>

## 10. 下一站

有了通量账本还不够。要让方程唯一指向一个未来，还需要说明起点形状和两端规则：初值与边界条件。

→ [初值与边界条件](./30-initial-boundary-data.md)
