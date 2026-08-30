---
title: 同构：结构相同的不同外壳
lesson_id: algebraic-structures/isomorphism
prereqs:
  - algebraic-structures/lagrange
volume: 3
layer: L2
track:
  - algebra-structure
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - isomorphism
applications:
  - representation-design
  - geometry-transforms
exits:
  - engineering
  - research
---

# 同构：结构相同的不同外壳

## 1. 开场钩子

模 5 加法群和“乘以 2 转动五边形”的动作群，元素名字完全不同，但把两者的乘法表换掉标签后一模一样。

数学说它们同构。名字不重要，保运算的一一对应才重要。

## 2. 直觉解释

同构是一台翻译机，需要通过两项考试：

1. 双射：每个元素都有唯一翻译，没有漏网也没有撞车；
2. 保运算：先翻译再运算，等于先运算再翻译。

写成公式就是

$$\phi(a*b)=\phi(a)\circ\phi(b).$$

左边用左边的运算，右边用右边的运算。

## 3. 正式定义

设 $\langle G,*\rangle$ 与 $\langle H,\circ\rangle$ 是两个群。若有双射 $\phi:G\to H$ 使所有 $a,b\in G$ 都满足

$$\phi(a*b)=\phi(a)\circ\phi(b),$$

则称 $\phi$ 为群同构，记作

$$G\cong H.$$

同构保持单位元、逆元和元素的阶。

## 4. 分步例题

比较模 4 加法群和四格旋转群 $\lbrace1,i,-1,-i\rbrace$（复数乘法）：

1. 翻译 $\phi(k)=i^k$；
2. $\phi(0)=1,\phi(1)=i,\phi(2)=-1,\phi(3)=-i$；
3. 检查 $\phi(1+2)=\phi(3)=-i$；
4. 另一边 $\phi(1)\cdot\phi(2)=i(-1)=-i$；
5. 所有组合同理，所以二者同构。

## 5. 动手实验

```viz
{
  "type": "set-mapper",
  "title": "双射是同构的第一道门槛",
  "left": ["0", "1", "2", "3"],
  "right": ["1", "i", "-1", "-i"],
  "arrows": [[0, 0], [1, 1], [2, 2], [3, 3]]
}
```

点击中间圆点增删箭头。少一条或多条交叉箭头，双射立刻失败；即使映射看起来很整齐，也还要做下一道保运算检查。

```python title="逐项验证翻译是否保持运算"
powers = [1, 1j, -1 + 0j, -1j]

def phi(a):
    return powers[a]

def add_mod4(a, b):
    return (a + b) % 4

same_count = 0
total = 0
for a in range(4):
    for b in range(4):
        total = total + 1
        if phi(add_mod4(a, b)) == phi(a) * phi(b):
            same_count = same_count + 1

print(same_count)
print(total)
```

16 组全部相等，说明这台翻译机不是碰巧对上几个例子。

## 6. 练习

```exercise
# @title: 练习：找出破坏同构的反例
# @check: bijective=False
# @check: operation_ok=False
# @hint: 让两个输入翻译到同一个输出，再检查一组加法是否被保留。
powers = [1, 1j, 1, 1j]
images = []
for value in powers:
    hit = False
    for old in images:
        if old == value:
            hit = True
    if hit == False:
        images.append(value)

bijective = len(images) == 4
operation_ok = True
print("bijective=" + str(bijective))
print("operation_ok=" + str(operation_ok))
```

<details>
<summary>点开查看逐步解答</summary>

列表中 0 和 2 都翻译成 1，1 和 3 都翻译成 $i$，像只有 $\lbrace 1,\ i\rbrace$ 两个值——4 个输入挤进 2 个输出，双射失败。

保运算也会失败，但反例必须在这张坏翻译表的内部找，不能借用正确表格的取值。取 $(a,b)=(1,1)$：

$$\phi(1+1)=\phi(2)=1,\qquad \phi(1)\times\phi(1)=i\times i=-1.$$

两边不等，保运算失败。顺带警惕一个"假朋友"：$(a,b)=(1,2)$ 这对是碰巧相等的——$\phi(3)=i$ 且 $\phi(1)\times\phi(2)=i\times1=i$。同构要求每一对都保运算，个别巧合不算数，所以要全表审计。这个映射既非双射、也不保运算，不是同构。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为元素个数相同就够了。四个元素可以组成不同结构的群，例如模 4 加法与 Klein 四元群不同构。

**误区二**：你以为只要一一对应即可。还必须让运算关系一起搬家。

**误区三**：你以为同构表示完全无差别。对外壳中的计算方式而言差别仍在；同构说的是抽象群结构一致。

:::

## 8. 快问快答

```quiz
群同构除了双射，还必须保证什么？
- 两边元素都能排序
- 运算结果先翻译或后翻译一致 [*]
- 两边一定都是循环群
? 同构的核心是保运算；排序和循环性都不是必要条件。
```

## 9. 选读：同构的性质

<details>
<summary>选读 · 单位元与逆元的搬运</summary>

设 $e_G$ 是 $G$ 的单位元。因为

$$\phi(e_G)=\phi(e_G*e_G)=\phi(e_G)\phi(e_G),$$

两边左乘 $\phi(e_G)^{-1}$ 得 $\phi(e_G)=e_H$。又由

$$e_H=\phi(e_G)=\phi(a*a^{-1})=\phi(a)\phi(a^{-1}),$$

所以 $\phi(a^{-1})=\phi(a)^{-1}$。

</details>

## 10. 下一站

若映射只保留运算但不一定可逆，会发生什么？下一课看同态、核与信息丢失。

→ [同态与核](./45-homomorphism-kernel.md)
