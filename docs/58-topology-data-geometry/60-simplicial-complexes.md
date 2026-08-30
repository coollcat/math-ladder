---
title: 单纯复形
lesson_id: tdg/simplicial-complexes
prereqs:
  - tdg/covering-spaces
volume: 5
layer: L11
track:
  - geometry-space
  - information-learning
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - simplicial-complex
applications:
  - point-cloud-reconstruction
exits:
  - data-ai
---

# 单纯复形

## 1. 开场钩子

三维扫描仪输出的常常不是连续曲面，而是散乱点云。要谈洞和连通块，得先把点连成边、边围成三角形、三角形拼成面。单纯复形就是这套最小积木规则。

## 2. 直觉解释

0 维单纯形是点，1 维是线段，2 维是三角形，3 维是四面体。关键不只是列出积木，还要保证拼接整齐：两个单纯形要么不相交，要么沿公共面完全重合。

地铁网天然是 1 维复形；三角网格是 2 维复形；传感器覆盖的交叠关系也能抽象成高维“团队关系”。

## 3. 正式定义

设顶点集 $V=\lbrace v_0,\ldots,v_n\rbrace$。一个 $k$ 维单纯形是 $k+1$ 个仿射无关顶点的凸包：

$$[v_0,\ldots,v_k]$$

单纯复形 $K$ 是单纯形的有限集合，且每个单纯形的非空面仍在 $K$ 中，任意两个单纯形的交集是它们的公共面。

## 4. 分步例题

构造一个空心三角形：

1. 顶点是 $a,b,c$，得到 3 个 0 维单纯形；
2. 边是 $ab,bc,ca$，得到 3 个 1 维单纯形；
3. 若加入面 $abc$，就成为实心三角形；
4. 不加面时它是圆周的离散模型；
5. Euler 示性数分别为：无面时 $3-3+0=0$，有面时 $3-3+1=1$。

## 5. 动手实验

```viz
{
  "type": "set-mapper",
  "left": ["点", "线段", "三角形"],
  "right": ["0 维", "1 维", "2 维"],
  "arrows": [[0, 0], [1, 1], [2, 2]]
}
```

这张匹配盘把三种单纯形连到维度。点击中间圆点可以增删箭头；正确对应必须是双射，正如每个单纯形的维度由它包含的顶点数减一决定。

```python title="检查缺失面并计算示性数"
vertices = ["a", "b", "c"]
edges = [("a", "b"), ("b", "c"), ("c", "a")]
faces = []

def has_all_edges(triangle, edge_list):
    # 方向敏感版检查：三条边必须按完全相同的顶点顺序出现
    a, b, c = triangle
    needed = [(a, b), (b, c), (c, a)]
    return all(edge in edge_list for edge in needed)

print(has_all_edges(("a", "b", "c"), edges))  # 方向一致，True

chi = len(vertices) - len(edges) + len(faces)
print(chi)
```

`has_all_edges` 按**方向**精确匹配三条边：把某条边写成 `("b", "a")` 就会匹配失败。练习里边表混入了重复和反向的边，需要你先规范化再判断。

## 6. 练习

```exercise
# @title: 练习：补全合法三角形复形
# @check: 1
# @check: True
# @hint: 把每条边的顶点排成升序去重；再检查三角形的三条边是否都在边集中。
vertices = ["a", "b", "c"]
edges = [("a", "b"), ("b", "a"), ("b", "c"), ("c", "a")]
face = ("a", "b", "c")

oriented_edges = set(edges)
has_face_edges = False

print(len(vertices) - len(edges) + 1)
print(has_face_edges)
```

期望输出 1 和 `True`。初始代码把重复方向的两条边当成了两条不同的边，示性数账本因此记错。

<details>
<summary>点开查看逐步解答</summary>

统一方向后去重：

```python
vertices = ["a", "b", "c"]
edges = [("a", "b"), ("b", "a"), ("b", "c"), ("c", "a")]
face = ("a", "b", "c")
oriented_edges = set()
for u, v in edges:
    oriented_edges.add(tuple(sorted((u, v))))
needed = {tuple(sorted(pair)) for pair in [(face[0], face[1]), (face[1], face[2]), (face[2], face[0])]}
has_face_edges = needed <= oriented_edges
print(len(vertices) - len(oriented_edges) + 1)
print(has_face_edges)
```

`sorted((u, v))` 把每条边规范成升序，`("a","b")` 和 `("b","a")` 由此合并成一条；`needed <= oriented_edges` 检查三条边是否都在集合里。去重后剩 3 条唯一边，对应三个顶点加一个面，$\chi=3-3+1=1$。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为任意三角形集合都是复形。必须检查公共面是否完全一致。

**误区二**：你以为随手拿来的边表就能直接算账本。重复边和方向不一致的边会污染顶点-边-面计数，先规范化去重再算 $\chi$。

**误区三**：你以为高维单纯形表示真实高维体积。Čech 和 Rips 复形常用高维单纯形记录“多个集合相交”，不是几何实体。

:::

## 8. 选读：链与边界算子

<details>
<summary>选读 · 同调的最小代数外壳</summary>

$k$ 维链是 $k$ 维单纯形的形式线性组合。边界算子 $\partial_k$ 把一个 $k$ 单纯形送到其 $k-1$ 维面的交错和。

核心事实是 $\partial_{k}\circ\partial_{k+1}=0$：面的边界再取边界为零。闭链、边缘链和同调群由此定义，Euler 示性数变成各维 Betti 数的交替和。

**一条空心三角边框的完整手算**——三个顶点 $a,b,c$、三条边 $ab, bc, ca$（没有面）。边界算子逐条算：$\partial_1(ab) = b - a$、$\partial_1(bc) = c - b$、$\partial_1(ca) = a - c$。一个一般的一维链 $x\,ab + y\,bc + z\,ca$ 的边界是

$$\partial_1 = (-x+z)\,a + (x-y)\,b + (y-z)\,c$$

让它为零得 $x=y=z$——闭链（圈）恰好只有一圈：绕三角形的那个方向。再验核心事实 $\partial_1\circ\partial_2 = 0$：如果补上面 $abc$，$\partial_2(abc) = bc - ac + ab$，取它的边界 $(c-b)-(c-a)+(b-a) = 0$，一丝不差地归零——"边的边界再无边"当场兑现。

于是两种情形的户口簿：**只留边框**时，闭链群 $Z_1$ 有一圈、边缘链群 $B_1$ 是空的（没有面可当边界）——同调群 $H_1 = Z_1/B_1$ 留下一个真正的洞，$\beta_1 = 1$；**补上面 $abc$** 后，那一圈本身就是 $\partial_2$ 的像，$B_1 = Z_1$，洞被填死，$\beta_1 = 0$。两头的 $H_0$ 都是一维（连通块只有一个），$\beta_0 = 1$。顺带验收 Euler 示性数：边框 $V-E = 3-3 = 0 = 1-1$，添面后 $V-E+F = 3-3+1 = 1 = 1-0$——示性数正是各维 Betti 数的交替和。[持久同调](./75-persistence-diagrams.md) 里那对 $H_0/H_1$ 的"出生与死亡"记号，用的就是这本账：随着阈值扫过，成分与洞各有各的户口变更记录。

</details>

## 9. 下一站

单纯复形给出骨架；数据覆盖给出另一种自然拼法。下一站讨论 Čech 复形。

→ [Čech 复形与数据覆盖](./65-cech-complexes.md)
