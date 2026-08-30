---
title: 第 23 章 · 偏微分方程入门
description: 从局部变化到空间演化：波动、热传导、扩散与分离变量。
volume: 2
layer: L9
track:
  - analysis-change
stage: research-elective
difficulty: 5
---

# 偏微分方程入门

偏微分方程描述同时随时间和空间变化的量。弦的波动、热量扩散、污染物传播和图像平滑背后都有同一类思想：局部变化率之间的约束。

本章你会学到：

1. [从 ODE 到 PDE](./10-from-ode-to-pde.md)——一根长绳被抖动一下，鼓包会向远处跑；
2. [通量与守恒律](./20-flux-conservation.md)——一段河道里的水不会凭空出现；
3. [初值与边界条件](./30-initial-boundary-data.md)——同样一根金属杆，一头泡在冰水里、两头绝热、首尾相连，命运完全不同；
4. [一维热方程](./40-heat-equation-1d.md)——把一滴热水滴进冷水，最初边界分明，随后峰变矮、范围变宽，最后几乎分不出你我；
5. [差分与稳定性](./50-finite-difference-heat.md)——屏幕上没有无限细的金属杆，只有一格一格的温度值；
6. [CFL 与显式格式稳定性](./55-cfl-stability.md)——风一分钟吹过一个格子，你的程序却两分钟才更新一次；
7. [对流方程与特征线](./60-convective-characteristics.md)——染料团顺流而下：热方程把峰抹平，河水只把峰搬走，搬走的规律藏在一族斜线里；
8. [激波：特征线相交之后](./65-nonlinear-shocks.md)——流速就是 u 自己：跑得快的追上慢的，特征线相撞，海浪在浅滩卷翻；
9. [波动方程：弦的横振动](./70-wave-equation.md)——拨一下吉他弦，凸包分裂成两个各奔一方：把弦切成小段问牛顿定律，答案自己冒出来；
10. [达朗贝尔解与初始形状](./75-dalembert-solution.md)——初始形状加初速度，定下弦此后一生的舞姿：一个不需要级数的闭式解；
11. [热核：一点热量如何摊开](./78-heat-kernel.md)——一瞬间的点热源摊成高斯钟形：变矮必然变宽，面积永远是一。
12. [分离变量：把时间和空间拆开算](./90-separation-of-variables.md)——赌一把 u=X(x)T(t)，PDE 就裂成两个 ODE；
13. [特征函数与边界：模态是被筛出来的](./100-eigenfunction-boundary.md)——冰水、棉花、半开半闭，三种夹具筛出三套模态；
14. [Fourier 合成：把任意初值拆成模态](./110-fourier-pde-synthesis.md)——方台阶也能解：投影、各自衰减、再加回来；
15. [Laplace 与 Poisson：直接问稳态长什么样](./120-laplace-poisson.md)——不再追时间，一格一格把终点"摸"出来；
16. [二维热扩散项目：涂一笔，看它自己摊开](./130-heat-2d-project.md)——四个邻居把安全线从 1/2 收紧到 1/4；
17. [PDE 分类与方法地图](./140-pde-classifier-map.md)——一个判别式分出三家，五把钥匙各配一把锁。

## 前置回望

上一章的 ODE 只沿时间轴演化，PDE 让空间坐标也进入约束：热方程右端那块 Laplacian 正是多元偏导的组合，守恒律则是“变化率”思想在空间里的会计版本。“用步长逼近连续”的数值经验在本章升级为时空网格。

## 生产状态

第五批回填（分离变量 → 特征函数与边界 → Fourier 合成 → Laplace/Poisson → 二维热扩散项目 → 方法地图）落地后，**10–140 共十七门正式课全部齐线**：均配专属 viz、Python 实验和判题练习。本轮新增六个专属渲染器 `separation-mode` / `eigen-boundary` / `fourier-pde-synth` / `laplace-relax` / `heat2d-paint` / `pde-classifier`。

## 实战挑战 · 缸体出炉：从牛顿冷却到差分体检

经典工程估算情境（牛顿冷却定律由牛顿于 1701 年提出；差分格式的稳定性分析见本章 [50 课](./50-finite-difference-heat.md)）。

铸造车间刚出炉的铝合金缸体整体温度 90 度，车间恒温 20 度。工程师用两件工具给它做冷却预报。

**第一件工具：牛顿冷却定律**——把缸体看成一颗均匀的土豆，降温速率正比于温差：

$$T' = -k\,(T-20)$$

实测出炉后 10 分钟缸体降到了 60 度。已知 $\ln\frac{7}{4}\approx0.5596$、$\ln 7\approx1.9459$。

**(a)** 求冷却率 $k$（单位：每分钟）；

**(b)** 再过多少分钟缸体降到 30 度（大约能安全手摸的量级）？

**第二件工具：一维显式差分体检**。把缸体剖面按 $\Delta x = 0.2$ 切片，热扩散率取 $k_d = 0.4$，格式安全线是 $r = k_d\,\Delta t/\Delta x^2 \le \frac{1}{2}$。工艺科给出两个候选时间步 $\Delta t_1 = 0.04$、$\Delta t_2 = 0.06$，并要求用安全的那一档更新一个高温点（左邻 0.4、中心 0.8、右邻 0.2）。体检脚本藏着三处错误，请修到全部通过：

```exercise
# @title: 实战挑战：给显式热格式做出厂体检
# @check: 0.4
# @check: True
# @check: 0.6
# @check: False
# @check: 0.4
# @hint: r 的定义是 k*dt/(dx*dx)，分母是 dx 的平方；热方程的安全线是 0.5 不是 1；更新公式是加 r 倍的三点差分，别写成减号。
kd = 0.4      # 热扩散率
dx = 0.2      # 空间步长

dt1 = 0.04
r1 = kd * dt1 / dx            # ← 有错一：分母应是 dx*dx
stable1 = r1 <= 0.5
print(round(r1, 3))
print(stable1)

dt2 = 0.06
r2 = kd * dt2 / (dx * dx)
stable2 = r2 <= 1             # ← 有错二：安全线写错了
print(round(r2, 3))
print(stable2)

r = 0.4                        # 用安全档更新高温点
u_left = 0.4
u_center = 0.8
u_right = 0.2
u_new = u_center - r * (u_left - 2 * u_center + u_right)   # ← 有错三：符号反了
print(round(u_new, 3))
```

<details>
<summary>点开查看逐步解答</summary>

**(a)** 通解为 $T(t)=20+70e^{-kt}$。由 $T(10)=60$ 得 $e^{-10k}=\frac{40}{70}=\frac47$，所以

$$k = \frac{1}{10}\ln\frac74 \approx \frac{0.5596}{10} = 0.05596$$

即每分钟约 0.056。

**(b)** 剩余温差要降到 $30-20=10$：$70e^{-kt}=10$ 给出 $e^{kt}=7$，于是

$$t = \frac{\ln 7}{k} \approx \frac{1.9459}{0.05596} \approx 34.8\ \text{分钟}$$

这是从出炉算起的总时间；因此从 10 分钟实测点再等约 `24.8` 分钟。

**差分体检修正版**：

```python
kd = 0.4
dx = 0.2

dt1 = 0.04
r1 = kd * dt1 / (dx * dx)
print(round(r1, 3))     # 0.4
print(r1 <= 0.5)        # True：安全

dt2 = 0.06
r2 = kd * dt2 / (dx * dx)
print(round(r2, 3))     # 0.6
print(r2 <= 0.5)        # False：超线，锯齿警告

r = 0.4
u_left, u_center, u_right = 0.4, 0.8, 0.2
u_new = u_center + r * (u_left - 2 * u_center + u_right)
print(round(u_new, 3))  # 0.4：高点被拉低，但没有翻过头
```

物理哨卡：$\Delta x$ 切得更细时，允许的 $\Delta t$ 按**平方**缩小——加密网格要付出平方级的时间步代价，这是第 50 课误区二的定量版。而牛顿冷却那条指数曲线，其实就是「整块缸体只剩一个格点」时热方程的退化版：两件工具是一件工具的两个分辨率。
</details>

相关课程：[一维热方程](./40-heat-equation-1d.md)、[差分与稳定性](./50-finite-difference-heat.md)、[初值与边界条件](./30-initial-boundary-data.md)。

## 实战挑战 · 热扩散的符号方向

一维热方程显式差分一步：$u_i^{new} = u_i + r\,(u_{i-1} - 2u_i + u_{i+1})$。中间热、两边冷时，热量应该**向外扩散**、中间点降温。下面这题把加号写成了减号，热量反而聚集，修到输出 `0.0`：

```exercise
# @title: 实战挑战：热扩散的符号方向
# @check: 0.0
# @hint: 扩散项 (u[0] - 2*u[1] + u[2]) 是负的，要"加上"它让中间点降温。
u = [0.0, 1.0, 0.0]     # 中间热、两边冷（边界固定 0）
r = 0.5                 # 差分系数
u_new = u[1] - r * (u[0] - 2 * u[1] + u[2])    # ← 问题在这：符号反了
print(round(u_new, 3))
```

<details>
<summary>点开查看逐步解答</summary>

显式格式是**加上**扩散项：

```python
u_new = u[1] + r * (u[0] - 2 * u[1] + u[2])   # 1 + 0.5*(0 - 2 + 0)
print(round(u_new, 3))                        # 0.0
```

改完：扩散项 $u_0 - 2u_1 + u_2 = 0 - 2 + 0 = -2$（负，表示热量流出），加上它得 $1 + 0.5\times(-2) = 0.0$——中间点从 1 降到 0。初始代码写减号，变成 $1 + 1 = 2$，热量不减反增。热方程"高温向低温扩散"的方向，全靠这个正号。

</details>
