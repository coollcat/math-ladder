---
title: 群作用与计数选讲
lesson_id: algebraic-structures/group-actions-counting
prereqs:
  - algebraic-structures/permutation-groups
volume: 3
layer: L2
track:
  - algebra-structure
  - discrete-computing
stage: university-core
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - group-action
  - orbit
  - burnside-counting
applications:
  - necklace-counting
  - chemical-isomers
exits:
  - research
---

# 群作用与计数选讲

## 1. 开场钩子

四颗珠子串成手环，黑白两色共有 16 种涂法。但转动后相同的图案不该重复数。

怎样不用手工画图，就知道本质不同的手环有几种？答案是让群作用替我们转动手环。

## 2. 直觉解释

群作用是把群元素当成对象的搬运工：

$$g\cdot x$$

表示用动作 $g$ 移动对象 $x$。搬来搬去能互相到达的对象组成同一轨道。

Burnside 计数法的口诀是：**对每个对称动作数固定点，再平均**。

$$\text{轨道数}=\frac1{|G|}\sum_{g\in G}|\operatorname{Fix}(g)|.$$

## 3. 正式定义

设群 $G$ 作用于集合 $X$，满足：

1. $e\cdot x=x$；
2. $(gh)\cdot x=g\cdot(h\cdot x)$。

元素 $x$ 的轨道为

$$Gx=\lbrace g\cdot x:g\in G\rbrace,$$

稳定子为

$$G_x=\lbrace g\in G:g\cdot x=x\rbrace.$$

Burnside 引理说：互不相同轨道的个数等于所有群元素固定点数的平均值。

## 4. 分步例题

给正方形四个角染黑白，允许绕中心旋转 $0^\circ,90^\circ,180^\circ,270^\circ$：

1. $0^\circ$ 固定全部 $2^4=16$ 种涂法；
2. $90^\circ$ 要求四角全同，固定 2 种；
3. $180^\circ$ 只要求对角相同，固定 $2^2=4$ 种；
4. $270^\circ$ 与 $90^\circ$ 相同，固定 2 种；
5. 平均：

$$\frac{16+2+4+2}{4}=6.$$

所以本质不同的旋转类有 6 种。

## 5. 动手实验

```viz
{
  "type": "set-mapper",
  "title": "90 度旋转对四个角的搬运",
  "left": ["角0", "角1", "角2", "角3"],
  "right": ["位0", "位1", "位2", "位3"],
  "arrows": [[0, 1], [1, 2], [2, 3], [3, 0]]
}
```

这张映射图表示逆时针旋转 90°时旧角的新位置。它是双射，所以确实是置换群元素。

```python title="枚举 16 种染色并应用 Burnside"
colorings = []
for a in range(2):
    for b in range(2):
        for c in range(2):
            for d in range(2):
                colorings.append([a, b, c, d])

fixed_counts = []
for k in range(4):
    count = 0
    for old in colorings:
        moved = [0, 0, 0, 0]
        for i in range(4):
            moved[(i + k) % 4] = old[i]
        same = True
        for i in range(4):
            if moved[i] != old[i]:
                same = False
        if same:
            count = count + 1
    fixed_counts.append(count)

total = 0
for value in fixed_counts:
    total = total + value

print("fixed:", fixed_counts)
print("orbits:", round(total / 4))   # round：轨道数必是整数，用它收掉真除法带出的浮点尾巴
```

输出 `fixed: [16, 2, 4, 2]` 和 `orbits: 6`。（Python 里 `/` 是真除法，就算整除也会吐出 `6.0` 这样的浮点数；轨道数本来就是整数，所以用第 2 章学过的 `round()` 把小数尾巴收掉。）

## 6. 练习

```exercise
# @title: 练习：修正正三角形旋转染色的固定点
# @check: fixed=[8, 2, 2]
# @check: orbits=4
# @hint: 三角形三个顶点两色染色共 8 种；120 度旋转要求三点同色，240 度也一样。
n = 3
fixed = [8, 4, 4]
total = 0
for value in fixed:
    total = total + value
orbits = round(total / 2)   # round：轨道数必是整数，收掉真除法的浮点尾巴
print("fixed=" + str(fixed))
print("orbits=" + str(orbits))
```

<details>
<summary>点开查看逐步解答</summary>

三角形有三个旋转动作：0°、120°、240°，所以除以 3 而不是 2。非恒等旋转会把三个顶点循环搬运，只能全黑或全白，因此各固定 2 种：

$$\frac{8+2+2}{3}=4.$$

修正后的完整代码（可直接跑通判题）：

```python
n = 3
fixed = [8, 2, 2]
total = 0
for value in fixed:
    total = total + value
orbits = round(total / 3)   # 除数改成群阶 3；round 收掉浮点尾巴
print("fixed=" + str(fixed))
print("orbits=" + str(orbits))
```

四种轨道分别是三黑、三白、一黑二白、一白二黑；同一轨道里的位置可由旋转互相到达。

</details>

## 7. 常见误区

**误区一**：你以为只需平均总涂法数。不同对称动作固定的图案数量不同，必须逐个动作统计。

**误区二**：你以为反射也算在纯旋转群里。是否包含翻面由你选定的群决定；手环能否翻转要提前说清。

**误区三**：你以为固定点是“动作不动自己”。固定的是对象在动作后保持不变。

## 8. 快问快答

```quiz
Burnside 计数法最后要对什么取平均？
- 所有对象的颜色总数
- 每个群元素的固定点数 [*]
- 所有轨道的大小
? 公式是固定点总数除以群阶，不是轨道大小的平均。
```

## 9. 选读：轨道-稳定子定理

<details>
<summary>选读 · 一条漂亮的除法关系</summary>

对有限群作用，

$$|G|=|Gx|\cdot|G_x|.$$

轨道越大，能让对象不动的动作越少。它像 Lagrange 定理的动态版本：大群的元素被分成“搬运结果”和“原地守护者”两部分。

</details>

## 10. 下一站

群、环、域、同态都登场了。最后一课把这些工具排成一张方法地图。

→ [代数结构方法地图](./80-method-map.md)
