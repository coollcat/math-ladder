---
title: 连通性与道路连通
lesson_id: tdg/connectedness
prereqs:
  - tdg/open-sets
volume: 5
layer: L8
track:
  - geometry-space
  - information-learning
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - connectedness
  - path-connectedness
applications:
  - sensor-network-coverage
exits:
  - engineering
---

# 连通性与道路连通

## 1. 开场钩子

一片传感器田野里，每台设备能监听半径 100 米。若没有任何接力链把左区和右区连起来，即使两区各自很热闹，整个网络的感知也是断开的。拓扑学把这件事叫不连通。

## 2. 直觉解释

空间连通，意思是它不能被拆成两个互不接触的非空开片。道路连通更强：任意两点之间都要有一条连续路径。

地铁网是否连通，不看站台数量，而看能否从任意站走到任意站。传感器覆盖是否连通，不看设备总数，而看覆盖区域能否通过重叠一路传递。

## 3. 正式定义

拓扑空间 $X$ 连通，是指不存在两个非空开集 $U,V$ 同时满足：

$$U\cup V=X,\quad U\cap V=\varnothing$$

若对任意 $p,q\in X$ 都存在连续映射 $\gamma:[0,1]\to X$ 使 $\gamma(0)=p,\gamma(1)=q$，则称 $X$ 道路连通。道路连通必连通；反向不一定成立。

## 4. 分步例题

**例 A**：实数轴 $\mathbb R$ 道路连通，因为 $\gamma(t)=(1-t)p+tq$ 是从 $p$ 到 $q$ 的直线路径。

**例 B**：$\mathbb R\setminus\lbrace 0\rbrace$ 分成 $(-\infty,0)$ 和 $(0,\infty)$，两边都是开集，因此不连通；负数到正数的任何连续路径都必须穿过 0 或跳变。

**例 C**：传感器模型中，若覆盖圆 $A$ 与 $B$ 重叠，$B$ 与 $C$ 重叠，则 $A,B,C$ 的并道路连通，因为可经重叠区接力。

## 5. 动手实验

### 实验 1：拖动两团数据，制造断桥

```viz
{
  "type": "fit",
  "n": 10
}
```

把十个点拖成左右两团，并在中间留出明显空白；最小二乘直线仍会横跨空白，但它掩盖了“桥断了”。再把中间放几个点，连通性立刻恢复。

### 实验 2：Python 判断阈值下的连通性

```python title="广度优先检查道路接力"
points = [[0, 0], [1, 0], [2, 0], [6, 0]]
threshold = 1.2
reached = {0}   # set 集合字面量；0 号点作为起点
frontier = [0]  # frontier：等待向外接力的点编号

while frontier:
    now = frontier.pop()       # pop 默认删除并返回末尾元素
    for other in range(len(points)):   # range 生成 0..长度-1 的整数序列
        gap_x = points[now][0] - points[other][0]
        gap_y = points[now][1] - points[other][1]
        dist = (gap_x * gap_x + gap_y * gap_y) ** 0.5
        if dist <= threshold and other not in reached:
            reached.add(other)
            frontier.append(other)

print(len(reached), len(points))
```

`len(reached)==len(points)` 时，所有点在同一条接力链里。把 `threshold` 改小到 1.0，最后一点会被隔离。

## 6. 练习

```exercise
# @title: 练习：判断传感器网络是否连通
# @check: False
# @hint: 用 reached 记录可达编号，最后比较 len(reached) 是否等于 len(points)，并把结果转成布尔值。
points = [[0, 0], [1, 0], [5, 0]]
threshold = 1.5
reached = set()
reached.add(0)
frontier = [0]

while frontier:
    now = frontier.pop()
    for other in range(len(points)):
        dist = abs(points[now][0] - points[other][0])
        if dist <= threshold and other not in reached:
            reached.add(other)
            frontier.append(other)

connected = len(reached) > 0
print(connected)
```

<details>
<summary>点开查看逐步解答</summary>

起点 0 能到达 1；1 到 2 的距离是 4，大于 1.5，所以 2 不可达。应写：

```python
points = [[0, 0], [1, 0], [5, 0]]
threshold = 1.5
reached = {0}
frontier = [0]
while frontier:
    now = frontier.pop()
    for other in range(len(points)):
        dist = abs(points[now][0] - points[other][0])
        if dist <= threshold and other not in reached:
            reached.add(other)
            frontier.append(other)
connected = len(reached) == len(points)
print(connected)
```

`len(reached)` 是 2，`len(points)` 是 3，因此打印 `False`。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为连通就是“看起来挨着”。拓扑连通由开集分割定义，视觉密集也可能没有一条连续通路。

**误区二**：你以为连通和道路连通一样。一般拓扑空间中有连通但不可道路连通的反例；直观几何场景通常一致。

**误区三**：你以为回归线跨过间隙代表连通。直线只是投影模型，不证明数据之间存在接力覆盖。

:::

## 8. 选读：连通分支

<details>
<summary>选读 · 最大连通块</summary>

定义关系 $x\sim y$ 为存在连通子集同时包含 $x,y$。这是一个等价关系，其等价类称为连通分支。分支本身是闭的；在局部道路连通空间中也是开的。

数据聚类中的簇很像经验连通分支，但阈值、噪声和采样密度都会改变分支数量，因此结论必须随参数一起报告。

</details>

## 9. 下一站

连通回答“会不会断”；紧致性回答“会不会无界发散或漏掉极限点”。下一站给紧致性一个工程化直觉。

→ [紧致性直觉](./25-compactness.md)
