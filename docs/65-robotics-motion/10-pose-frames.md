---
title: 位姿与坐标系
lesson_id: robotics-motion/pose-frames
prereqs:
  - linalg/matrix
  - trig/radian
volume: 5
layer: L9
track:
  - optimization-control
  - scientific-computing
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - pose
  - frame-transform-chain
applications:
  - robot-arm-control
  - autonomous-driving
exits:
  - robotics-motion/forward-kinematics
---

# 位姿与坐标系：机器人的身份证

## 1. 从一个场景开始

工厂里一台机械臂要去抓桌上的杯子。控制系统开口第一句不是"抓"，而是两个更朴素的问题：**手现在在哪？朝哪个方向？**位置加朝向，合起来叫**位姿**（pose）——机器人的身份证。

麻烦在于：杯子在"桌子坐标系"里有地址，夹爪在"手臂坐标系"里有地址，手臂底座又在"车间坐标系"里有地址。三套门牌号并存，谁来当翻译？齐次矩阵自告奋勇：它本来就是为"平移＋旋转打包"设计的。

## 2. 直觉解释

给每个刚体配一张**坐标贴纸**：原点画在身上，三根轴随身体走。贴纸之间的换算表就是位姿矩阵。

- 世界系（车间）：不动，一切的地基；
- 基座系（机械臂底盘）：相对世界系平移了 1 米、转了个角度；
- 夹爪系（手腕）：相对基座系又移又转。

一张位姿矩阵 $T_{AB}$ 读作"A 系看 B 系"——它把 B 系里的坐标翻译成 A 系的话。要跨两级翻译？把字典**串起来乘**：

$$T_{世界\leftarrow夹爪} = T_{世界\leftarrow基座}\cdot T_{基座\leftarrow夹爪}$$

从右往左念："先出夹爪到基座，再出基座到世界"。矩阵乘法顺序不能乱——先转后移和先移后转落点不同，这是机器人编程第一大坑。

## 3. 正式定义

**位姿矩阵**（齐次变换）：$4\times4$ 矩阵（平面问题用 $3\times3$），分块为

$$T_{AB}=\begin{pmatrix}R_{AB} & t_{AB}\\ 0 & 1\end{pmatrix}$$

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $R_{AB}$ | 旋转块 | $2\times2$ 或 $3\times3$ 正交阵，B 系的轴在 A 系里的方向 |
| $t_{AB}$ | 平移列 | B 系原点在 A 系里的坐标 |
| 下标约定 | — | $T_{AB}$ 把 B 系坐标变到 A 系 |
| 链式法则 | — | $T_{AC}=T_{AB}\cdot T_{BC}$ |

旋转块满足 $R^TR=I$、$\det R=1$——第 11 章"保长度保定向"的老朋友；平面情形就是 $\begin{pmatrix}\cos\theta&-\sin\theta\\ \sin\theta&\cos\theta\end{pmatrix}$。

**逆变换**：$T_{BA}=T_{AB}^{-1}$。纯旋转时 $R^{-1}=R^T$（转置即可）；带平移时求逆有现成公式（选读），但工程里更常直接把链倒着乘一遍。

## 4. 分步例题

**例**：基座系相对世界系：平移 $(1,0)$ 再旋转 $90^\circ$；夹爪系相对基座系：纯平移 $(0.5, 0)$。夹爪尖端在自身系里是 $(0,0)$（原点），求它在世界系的坐标。

1. 写 $T_{世←基}$：旋转块 $90^\circ$ 的 cos=0、sin=1，平移 $(1,0)$：
$$T_{世←基}=\begin{pmatrix}0&-1&1\\1&0&0\\0&0&1\end{pmatrix}$$
2. 写 $T_{基←爪}$：无旋转，平移 $(0.5,0)$：
$$T_{基←爪}=\begin{pmatrix}1&0&0.5\\0&1&0\\0&0&1\end{pmatrix}$$
3. 相乘得链 $T_{世←爪}=T_{世←基}\cdot T_{基←爪}=\begin{pmatrix}0&-1&1\\1&0&0.5\\0&0&1\end{pmatrix}$；
4. 取夹爪原点 $(0,0,1)^T$ 左乘：$(1, 0.5, 1)^T$——夹爪在世界系的地址是 $(1,\ 0.5)$；
5. 几何复查：底座在 $(1,0)$，夹爪沿"被转过 90° 后的 x 方向"伸出 0.5，而原来的 x 轴转向了 y 正方向 → 从 $(1,0)$ 向北挪 0.5 ✓ 两路答案一致。

## 5. 动手实验

线性部分先在网页组件里热身：拖四个滑杆感受旋转块的威力（注意房子永远绕原点转——平移不在这里，这正是齐次矩阵存在的理由）：

```viz
{
  "type": "matrix",
  "title": "位姿的旋转块：绕原点的刚体转动",
  "a": 0,
  "b": -1,
  "c": 1,
  "d": 0
}
```

### 实验 1（python）：手写齐次变换流水线

```python title="3x3 齐次矩阵：构造 · 相乘 · 应用"
import math

def make_T(ang_deg, tx, ty):
    th = math.radians(ang_deg)          # 度转弧度
    c = math.cos(th)
    s = math.sin(th)
    return [[c, -s, tx],
            [s,  c, ty],
            [0,  0,  1]]                # 一行一行写出位姿矩阵

def mul(A, B):                          # 3x3 矩阵乘法：行乘列
    out = []
    for i in range(3):
        row = []
        for j in range(3):
            s = 0
            for k in range(3):
                s = s + A[i][k] * B[k][j]
            row.append(s)
        out.append(row)
    return out

def apply_T(T, p):                      # 把点 p（齐次三元组）送过变换
    v = [p[0], p[1], 1]                 # 补上第三位 1（齐次坐标）
    out = []
    for i in range(3):
        s = 0
        for k in range(3):
            s = s + T[i][k] * v[k]
        out.append(s)
    return out[0], out[1]

T_world_base = make_T(90, 1, 0)
T_base_grip = make_T(0, 0.5, 0)
T_world_grip = mul(T_world_base, T_base_grip)

tip_world = apply_T(T_world_grip, (0, 0))
print(f"夹爪尖端的世界坐标 = ({round(tip_world[0], 6)}, {round(tip_world[1], 6)})")
```

输出 $(1.0, 0.5)$，与手算一致。三个函数各司其职——这套流水线正是所有机器人库 `transform` 模块的雏形。

### 实验 2（python）：顺序敏感！调换乘法次序

```python title="先转后移 vs 先移后转"
def transform(c, s, tx, ty, p):
    x = c * p[0] - s * p[1] + tx   # 旋转部分 + 平移部分一次算完
    y = s * p[0] + c * p[1] + ty
    return round(x, 4), round(y, 4)

c90, s90 = 0, 1        # cos90° 与 sin90° 的精确值，避免浮点噪声
p = (2, 1)

route1 = transform(c90, s90, 3, 0, p)          # 路线一：先旋转，后平移 (3,0)
moved = (p[0] + 3, p[1])                       # 路线二先做平移
route2 = transform(c90, s90, 0, 0, moved)      # 再做纯旋转
print(f"先转后移: {route1}")
print(f"先移后转: {route2}")
```

同一组动作，两种顺序给出不同终点——矩阵不满足交换律在这里变成铁打的工程事实。写机器人代码时永远先问自己：**我的下标链从右往左念对吗？**

### 快问快答

```quiz
矩阵 T_AB 的正确读法是？
- 把 A 系的点搬到 B 系
- 把 B 系的坐标翻译成 A 系的语言 [*]
- 只记录 A 和 B 之间的距离
? 下标从右往左念：T_AB 吃进 B 系坐标，吐出 A 系坐标。链式相乘时同样从右往左。
```

:::warning[常见误区]

**误区一**："你以为位姿就是位置。" 差一个朝向，抓杯子的手可能正好握在杯底下方——位置对了，姿态错了照样失败。位姿 = 位置 + 朝向，缺一不可。

**误区二**："你以为矩阵乘法顺序无所谓。" 实验 2 刚刚演示了两条路线分道扬镳。物理直觉版：先穿袜子再穿鞋 ≠ 先穿鞋再穿袜子。

**误区三**："你以为任何矩阵都能当位姿用。" 位姿矩阵的旋转块必须正交（$R^TR=I$）。数值误差会让长期连乘的矩阵慢慢"歪掉"，工程上要定期做正交化校正——这是数值稳定性的入门课题。

:::

## 6. 练习

**练习 1**：`apply_T` 里忘了加上平移列，点只被旋转没被搬家。修到通过：

```exercise
# @title: 练习：修复位姿变换
# @check: 2
# @check: 2
# @hint: 齐次坐标的妙处在第三位：旋转块作用完之后还要加上平移量 t=(3,1)，也就是 T 的最后一列。
T = [[0, -1, 3],
     [1,  0, 1],
     [0,  0, 1]]     # 平移 (3,1) 叠加旋转 90°
p = (1, 1)

x = T[0][0] * p[0] + T[0][1] * p[1]          # ← 错在这：漏掉了 T[0][2]
y = T[1][0] * p[0] + T[1][1] * p[1]
print(int(x))
print(int(y))
```

**练习 2**：已知 $T_{世←基}$ 与 $T_{基←爪}$，如何求 $T_{爪←世}$（反向翻译表）？给出思路并用实验 1 的函数验证：把世界坐标 $(1, 0.5)$ 送回夹爪系应得到 $(0,0)$。

<details>
<summary>点开查看逐步解答</summary>

思路：反向翻译 = 逆矩阵。$T_{爪←世}=(T_{世←爪})^{-1}$；工程做法是把链**倒序逐个取逆相乘**：

$$T_{爪←世}=T_{基←爪}^{-1}\cdot T_{世←基}^{-1}$$

验证代码：

```python
import math

def inv_T(T):
    c, s, tx, ty = T[0][0], T[1][0], T[0][2], T[1][2]   # 抽出旋转参数与平移
    it = [[c, s, -c * tx - s * ty],
          [-s, c, s * tx - c * ty],
          [0, 0, 1]]                                     # 逆 = 转置旋转 + 反向平移
    return it

def apply3(T, p):
    x = T[0][0] * p[0] + T[0][1] * p[1] + T[0][2]
    y = T[1][0] * p[0] + T[1][1] * p[1] + T[1][2]
    return round(x, 6), round(y, 6)

inv = inv_T([[0, -1, 1], [1, 0, 0.5], [0, 0, 1]])
print(apply3(inv, (1, 0.5)))
```

输出 $(0.0, 0.0)$——世界坐标精确回到夹爪原点。注意逆公式里旋转块转置、平移项要"吃掉"旋转的影响，直接把 $t$ 变号是错的。
</details>

## 7. 选读：为什么全世界的机器人都说 4×4

<details>
<summary>选读 · 一个数据结构的霸权</summary>

三维世界里位姿矩阵是 $4\times4$。为什么不直接存"位置向量 + 3×3 旋转"？功能上等价，但齐次格式有三重红利：

1. **统一接口**：任何刚体关系都是一个矩阵，乘法即组合，API 只需一种类型；
2. **透视兼容**：图形学与相机模型里的投影恰好也用第四维（第 64 章），机器人视觉无缝衔接；
3. **微分友好**：速度、力都可以表示成 6 维"旋量"，其变换规则由同一个 4×4 矩阵派生（选读中的选读）。

历史注脚：这套记号来自 1960 年代机器人学奠基人 Denavit–Hartenberg 的参数化传统，如今 ROS、MATLAB、CUDA 内核里跑的都是同一种数据结构——数学形式的生命力可见一斑。

</details>

## 8. 下一站

位姿语言就绪，现在让关节动起来：给定每个关节的角度，夹爪会在哪？这条"角度 → 位置"的单行道叫正运动学——二连杆小臂上手算给你看。

→ [正运动学：二连杆手算](./20-forward-kinematics.md)
