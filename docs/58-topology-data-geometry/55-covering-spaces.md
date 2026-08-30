---
title: 覆盖空间预告
lesson_id: tdg/covering-spaces
prereqs:
  - tdg/fundamental-group
volume: 5
layer: L8
track:
  - geometry-space
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - covering-space
applications:
  - phase-unwrapping
exits:
  - engineering
---

# 覆盖空间预告

## 1. 开场钩子

钟表指针从 11 点走到 1 点，表盘只看见跨过 12 点，而真实时间其实经过了许多圈。把无限长的直线卷到圆上，就是最简单的覆盖空间模型。

## 2. 直觉解释

覆盖映射像一个均匀楼梯投影：上层每一段都公平地盖住底层同一小弧，且局部可以反向展开。整条螺旋线覆盖圆周；实数轴通过指数函数覆盖单位圆。

覆盖空间的用处是把缠绕展开成直线运动。相位解缠、路径提升和基本群的子群都靠这张“上层地图”。

## 3. 正式定义

设 $E,B$ 都是拓扑空间，$p:E\to B$ 连续且满射。若每个 $b\in B$ 有开邻域 $U$，使 $p^{-1}(U)$ 分裂成若干开片，并且 $p$ 在每片上同胚地映到 $U$，则称 $p$ 是覆盖映射。

标准例子是 $p:\mathbb R\to S^1$，定义为 $p(t)=(\cos 2\pi t,\sin 2\pi t)$。

## 4. 分步例题

把实数轴上的点 $t=0,0.25,0.5,0.75,1$ 投影到圆：

1. $t=0$ 和 $t=1$ 都映到 $(1,0)$；
2. 但在上层它们是不同楼层；
3. 区间 $(-0.1,0.1)$ 投影成圆上一段小弧；
4. 它的原像由许多小区间组成，例如 $(-0.1+n,0.1+n)$，每个 $n\in\mathbb Z$ 一片；
5. 每一片都与该小弧同胚，所以这是覆盖。

## 5. 动手实验

```viz
{
  "type": "plot",
  "title": "正弦波：直线的周期投影",
  "expr": "sin(2 * pi * (x + phase))",
  "xmin": -1,
  "xmax": 3,
  "sliders": [
    { "name": "phase", "min": -1, "max": 1, "step": 0.05, "value": 0 }
  ]
}
```

想象竖直方向压缩成一条水平轴，波峰波谷反复出现就是多层楼投影到同一个表盘位置。拖动 `phase` 相当于把整条直线沿楼层方向平移：同一个表盘刻度对应的楼层换了，投影值却只差一个周期。

```python title="把实数坐标折叠到圆周"
coordinates = [-0.25, 0.25, 1.25, 2.25]

for t in coordinates:
    folded = t % 1   # % 取余数，把负数也折回 [0,1)
    print(folded)
```

`%` 只是数值折叠模型，不代表覆盖映射的全部连续结构。

## 6. 练习

```exercise
# @title: 练习：判断两点是否在同一投影点
# @check: True
# @check: False
# @check: True
# @hint: 实数轴覆盖圆时，t1-t2 为整数才会投到同一点。
pairs = [(0.25, 1.25), (0.25, 0.75), (-0.75, 0.25)]

for t1, t2 in pairs:
    same_point = abs(t1 - t2) < 1
    print(same_point)
```

初始判断只看距离小于 1，漏掉了任意整数层差。

<details>
<summary>点开查看逐步解答</summary>

应检查差是否为整数：

```python
pairs = [(0.25, 1.25), (0.25, 0.75), (-0.75, 0.25)]
for t1, t2 in pairs:
    # round 取最接近的整数层差；减掉它后剩余部分应几乎为零
    same_point = abs(t1 - t2 - round(t1 - t2)) < 1e-9
    print(same_point)
```

第一对差 -1，第二对差 -0.5，第三对差 -1，所以输出 `True,False,True`。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为只要满射就是覆盖。还必须存在均匀展开的小邻域。

**误区二**：你以为取余运算就等于覆盖映射。`%` 只是数值折叠模型，它丢掉了连续性，也说不清"哪个楼层投影到表盘刻度"。

**误区三**：你以为覆盖空间一定有限层。实数轴覆盖圆有无穷层。

:::

## 8. 选读：万有覆盖

<details>
<summary>选读 · 最大解缠空间</summary>

若空间局部道路连通且半局部单连通，则存在单连通覆盖空间，称为万有覆盖。圆周的万有覆盖是实数轴；轮胎面的万有覆盖是平面。

基本群作用于覆盖空间的楼层之间。这个观点能把代数条件和几何对称性连接起来，是后续代数拓扑课程的核心入口。

</details>

## 9. 下一站

现在回到数据：离散点没有光滑曲面，需要先用最小积木拼出形状。下一站讲单纯复形。

→ [单纯复形](./60-simplicial-complexes.md)
