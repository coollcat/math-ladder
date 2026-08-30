---
title: 初值与边界条件
lesson_id: pde/initial-boundary-data
prereqs:
  - pde/flux-conservation
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
  - initial-condition
  - boundary-condition
applications:
  - heat-insulation
  - structural-vibration
exits:
  - engineering
---

# 初值与边界条件

## 1. 从一个场景开始

同样一根金属杆，一头泡在冰水里、两头绝热、首尾相连，命运完全不同。方程给出规则，初值给出出发形状，边界条件告诉它世界在哪里结束以及如何结束。

## 2. 直觉解释

PDE 描述每一小块如何变化，但只靠它无法选出唯一的未来。你还要提供两类数据：

- 初值：$t=0$ 时整条曲线 $u(x,0)=f(x)$；
- 边界值：空间区域边缘上 $u$ 或它的导数如何表现。

固定边界像两端钉住的琴弦；绝热边界像不让热量离开的保温层；周期边界像一条闭合成环的轨道。

## 3. 正式定义

常见一维边界条件如下。

| 名称 | 公式 | 直觉 |
| --- | --- | --- |
| Dirichlet | $u(0,t)=g_0(t)$ | 直接规定边界值 |
| Neumann | $u_x(0,t)=h_0(t)$ | 规定边界法向变化率 |
| 周期 | $u(0,t)=u(L,t)$ | 区域首尾相连 |

热传导问题中，Dirichlet 边界像恒温 reservoir；零 Neumann 条件 $u_x=0$ 表示没有热流穿过边界。初值与边界合起来叫定解条件。

## 4. 分步例题

设杆长 $L=1$，初始温度为：

$$f(x)=\sin(\pi x).$$

1. 初值规定 $u(x,0)=\sin(\pi x)$；
2. 若两端恒为 0，则 $u(0,t)=u(1,t)=0$；
3. 若两端绝热，则 $u_x(0,t)=u_x(1,t)=0$；
4. 同一初值配不同边界，后续演化不同。

## 5. 动手实验

### 实验 1：捏出初值并切换边界

```viz
{
  "type": "boundary-lab",
  "title": "同一条初值曲线的三种端点规则",
  "mode": "fixed",
  "diffusivity": 0.8,
  "nodes": [[0.08, 0], [0.25, 0.85], [0.48, 0.15], [0.72, 0.65], [0.92, 0]]
}
```

上方紫点可以横向调整位置、纵向调整温度。播放后观察下方热图：固定端贴住外部约束，绝热端不漏热，周期端让两侧互相影响。

### 实验 2：比较两种端点

```viz
{
  "type": "boundary-lab",
  "title": "绝热端保留更多热量",
  "mode": "insulated",
  "diffusivity": 0.6,
  "nodes": [[0.08, 0], [0.30, 0.95], [0.60, 0.20], [0.92, 0]]
}
```

把模式在固定与绝热之间切换。固定端像连接冷库；绝热端只允许内部重新分配，不允许热量穿过端点。

### 实验 3：程序里应用边界

```python title="三种端点的一步规则"
n = 6
u = [0, 0.4, 0.8, 0.5, 0.2, 0]
mode = "fixed"

# 列表切片 u[1:-1] 取出除首尾外的内部点
interior_sum = sum(u[1:-1])
interior_sum = round(interior_sum, 3)
if mode == "fixed":
    u[0] = 0
    u[n - 1] = 0
elif mode == "insulated":
    u[0] = u[1]
    u[n - 1] = u[n - 2]
else:
    u[0] = u[n - 2]
    u[n - 1] = u[1]

print(interior_sum)
print(u)
```

输出 `1.9` 和 `[0, 0.4, 0.8, 0.5, 0.2, 0]`。真实演化会更新内部点，而边界规则决定端点如何改写。

## 6. 练习

```exercise
# @title: 练习：改成绝热边界
# @check: [0.4, 0.4, 0.8, 0.5, 0.2, 0.2]
# @hint: 绝热不是令端点为 0，而是让端点复制相邻内侧值。
n = 6
u = [0, 0.4, 0.8, 0.5, 0.2, 0]

u[0] = 0
u[n - 1] = 0
print(u)
```

<details>
<summary>点开查看逐步解答</summary>

零通量边界要求端点斜率为零，离散版常用：

```python
n = 6
u = [0, 0.4, 0.8, 0.5, 0.2, 0]

u[0] = u[1]
u[n - 1] = u[n - 2]
print(u)
```

所以结果为 `[0.4, 0.4, 0.8, 0.5, 0.2, 0.2]`。端点不再是 0，而是被内侧“顶”上来。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为 PDE 本身自带唯一解。缺少合适初值或边界时，可能有无穷多个解。

**误区二**：你以为绝热边界就是温度为零。绝热对应零通量，通常近似为端点导数为零。

**误区三**：你以为周期边界只是重复数据。它还要求导数等量也匹配，否则接缝处会产生人为折角。

:::

## 8. 快问快答

```quiz
绝热边界的直观要求是什么？
- 端点温度一定是 0
- 端点温度最高
- 没有热量穿过端点 [*]
? 一维零通量常用 u_x=0 近似，而不是直接规定温度为 0。
```

## 9. 选读：适定性

<details>
<summary>选读 · 解是否存在、唯一且稳定</summary>

一个好的定解问题希望满足三件事：存在解、只有一个解、数据的小变化只引起解的小变化。这叫适定性（ODE 侧的对应合同见[解的存在与唯一](../22-ode-dynamics/15-existence-uniqueness.md)）。热方程配初值和合适边界是经典例子；倒着求解热方程则会放大误差，因而不适定。

</details>

## 10. 下一站

现在可以把规则完整化：一维热方程描述热量如何从高处流向低处，并把这些条件变成看得见的扩散。

→ [一维热方程](./40-heat-equation-1d.md)
