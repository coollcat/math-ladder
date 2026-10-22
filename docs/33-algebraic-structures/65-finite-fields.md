---
title: 有限域入门
lesson_id: algebraic-structures/finite-fields
prereqs:
  - algebraic-structures/modular-rings-fields
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
  - finite-field
  - characteristic
applications:
  - cryptography
  - coding-theory
exits:
  - engineering
  - research
---

# 有限域入门

## 1. 开场钩子

二维码被划破一角还能读出内容，秘密钥匙能在有限数字世界里做除法。背后的共同舞台常常是有限域。

它只有有限个元素，却保留了加减乘除四种秩序。

## 2. 直觉解释

最简单的有限域是 $\mathbb Z_p$，其中 $p$ 是素数。它像一个只有 $p$ 个刻度、但每个非零刻度都能倒转的计算盘。

有限域的大小不是随意的。若一个有限域有 $q$ 个元素，则必有

$$q=p^m,$$

其中 $p$ 是素数，$m$ 是正整数。

## 3. 正式定义

元素个数有限的域称为**有限域**，也叫 Galois 域，记作 $\mathbb F_q$。

若从单位元 1 出发，不断加 1，最少 $p$ 步后回到 0，就称域的特征为 $p$。有限域的特征必为素数。

最基本的一族有限域是

$$\mathbb F_p=\mathbb Z_p=\lbrace0,1,\ldots,p-1\rbrace,$$

其运算为模 $p$ 运算。

## 4. 分步例题

构造 $\mathbb F_5$：

1. 元素为 0、1、2、3、4；
2. 加法例如 $3+4=7\equiv2$；
3. 乘法例如 $3\times4=12\equiv2$；
4. 2 的逆元是 3，因为 $2\times3=6\equiv1$；
5. 0 不要求逆元，所以所有非零元素都可倒转。

注意 $\mathbb Z_4$ 不是域：$2\times2=0$，2 没有逆元。大小为 4 的有限域存在，但要用多项式方式另建。

## 5. 动手实验

```viz
{
  "type": "finite-field-inverse-grid",
  "title": "F11 的乘法倒数网格",
  "modulus": 11,
  "filters": ["equals-one", "equals-zero"],
  "selectedRow": 3,
  "selectedCol": 4
}
```

横轴选 $a$，纵轴选 $b$；绿色格表示乘积回到 1。除 0 行外每一行都有一个绿格，这正是有限域的除法安全证词。

```python title="体检 Z_p 是否满足有限域条件"
p = 7  # 模数 p = 7，是素数；下面在 1..p-1 这 6 个非零剩余类里找乘法逆元
all_invertible = True  # 布尔标志位：只要有一个元素找不到逆元，就把它翻成 False
inverse_table = []  # 空列表收集 (a, b) 逆元对，稍后一次性打印出来

for a in range(1, p):  # range(1, p) 首现：左闭右开，正好是 1..p-1，不含 0
    found = False  # 每换一个 a 就重置一次「本元素找到逆元了吗」
    for b in range(1, p):
        if (a * b) % p == 1:  # a·b ≡ 1 (mod p) 正是乘法逆元的定义，这里用 % 求余判断
            inverse_table.append((a, b))  # append 首现：往列表末尾追加一个元组，列表长度自动增长
            found = True
    if found == False:  # 内层 b 扫完仍没找到逆元，说明 a 在模 p 下不可逆
        all_invertible = False

print("nonzero_count=", p - 1)
print("inverse_table=", inverse_table)
print("all_invertible=", all_invertible)
```

把 `p` 改为 4、5、6、7 再运行。素数会输出 `True`，合数会出现缺失或零因子。

## 6. 练习

```exercise
# @title: 练习：找出 F_11 的特征与非零元素个数
# @check: characteristic=11
# @check: nonzero_count=10
# @hint: 特征是最少多少个 1 相加等于 0；非零元素个数是 q-1。
q = 11  # 模数 q = 11，素数；下面要问「几个 1 相加才回到 0」
sum_of_ones = 0  # 累加器：存 1+1+…+1 这个和本身
count = 0  # 计数器：存已经加了多少个 1

characteristic = 0  # 特征 = 最少几个 1 相加才 ≡ 0，这里还只是初始值
nonzero_count = q  # 非零元素个数，当前写的不是最终答案

print("characteristic=" + str(characteristic))
print("nonzero_count=" + str(nonzero_count))
```

<details>
<summary>点开查看逐步解答</summary>

用循环累加 1：

```python
# while 循环：不断累加 1，直到模 q 回到 0
q = 11
sum_of_ones = 0
count = 0
while sum_of_ones % q != 0 or count < 1:
    sum_of_ones = sum_of_ones + 1
    count = count + 1
print("characteristic=" + str(count))     # 累加到第 count 个 1 才回到 0
print("nonzero_count=" + str(q - 1))      # 非零元素就是 1..q-1
```

更直接地，素数 $q$ 的特征就是 $q$。非零元素个数为

$$11-1=10.$$

</details>

## 7. 常见误区

**误区一**：你以为 $\mathbb Z_4$ 可以当四元域。它是环不是域；$\mathbb F_4$ 要通过不可约多项式构造。

**误区二**：你以为有限域大小可以是任何正整数。只能是素数幂。

**误区三**：你以为特征可以是合数。域没有零因子，所以特征必须是素数。

## 8. 快问快答

```quiz
下列哪个数可以作为有限域的元素个数？
- 12
- 27 [*]
- 18
? 27=3^3 是素数幂；12 和 18 都不是。
```

## 9. 选读：为什么大小必为素数幂

<details>
<summary>选读 · 把域看作向量空间</summary>

设有限域 $F$ 的特征是素数 $p$。它的素子域 $\mathbb F_p$ 像“坐标轴”。若 $F$ 在 $\mathbb F_p$ 上有维数 $m$，则 $F$ 中每个元素有一组唯一的 $m$ 维坐标，每个坐标有 $p$ 种选择，所以

$$|F|=p^m.$$

线性代数的计数思想在这里悄悄登场。

</details>

## 10. 下一站

上一课认识了有限域的存在，下一课动手把它造出来：找一条不可约多项式，把商环的系数夹在 0 到 $p-1$ 之间，$F_{p^m}$ 就位。这是编码与密码的地基工序。

→ [有限域 F_{p^m} 构造](./67-finite-field-construction.md)
