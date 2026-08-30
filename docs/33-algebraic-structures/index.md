---
title: 第 33 章 · 代数结构
description: 从运算律到群环域：把对称、可逆和同态统一成结构语言。
volume: 3
layer: L2
track:
  - algebra-structure
  - discrete-computing
stage: university-core
difficulty: 4
---

# 代数结构

小学的四则运算律在这里升级为研究对象。群捕捉对称，环处理加减乘，域支撑线性代数和密码学；同构则回答“两个系统何时本质相同”。

## 课程地图

- [运算律与结构预告](./10-operation-laws.md)——洗牌时先左转再右转总会回到原地，钟表上加 9 小时再加 5 小时落到下午 2 点：对象完全不同，动作却像同一家人；配套 distributive 分配律实验；
- [二元运算与单位元](./15-binary-operation.md)——遥控器的静音键再按一次恢复原声：“按按钮”也是运算，可这套操作里有没有“什么都不做”的特殊元素？配套 operation-table 运算表；
- [群的定义与非群反例](./20-groups.md)——魔方的每一串转动都有一串反向步骤能把棋子送回起点：动作可接龙、可分组、可撤销，这就是群的日常版本；配套 operation-table 对照非群反例；
- [循环群与生成元](./25-cyclic-groups.md)——时针只有一个基本动作走一格：走 24 格回原点、走 13 格等于走 1 格，一个动作竟铺满整张时刻表；配套 cyclic-generator 双视图与 clockmod 钟面；
- [子群与阶](./30-subgroups-order.md)——模 12 钟面上只许走 4 格，你会反复停在 0、4、8：这个小圈有自己的单位元和逆元，大小还藏着一条整除规律；配套 clockmod 钟面探针；
- [Lagrange 定理选读](./35-lagrange.md)——12 位客人分桌，每桌坐 5 人必剩人：子群作为“桌子”只能以整除全群人数的方式摆放；配套 set-mapper 实验；
- [同构：结构相同的不同外壳](./40-isomorphism.md)——模 5 加法群和“乘 2 转动五边形”的动作群名字完全不同，乘法表换掉标签后一模一样；配套 set-mapper 标签替换实验；
- [同态与核](./45-homomorphism-kernel.md)——把精确到分钟的钟压扁成上午、下午两格：规律部分保留，被压到单位元的部分叫核；配套 set-mapper 压扁实验；
- [环与域](./50-rings-fields.md)——钟表既能加也能乘：9 点过 5 小时是 2 点，而 $9\times5=45$ 又落回 9 点；配套 operation-table 与 distributive 演示；
- [多项式环](./55-polynomial-ring.md)——$x^2-3x+2$ 不是单个数而是一台代入机器，多项式之间还能像整数一样加减乘；配套 factoring 因式分解实验；
- [模运算中的环和域](./60-modular-rings-fields.md)——模 12 能加能乘却做不好除法：3 乘 4 会撞回 0；换成模 7 后每个非零数字突然都会“倒转”；配套 finite-field-inverse-grid 倒数网格；
- [有限域入门](./65-finite-fields.md)——二维码划破一角还能扫出来，密钥能在有限数字世界里做除法：共同舞台常常是有限域；配套 finite-field-inverse-grid 网格；
- [置换群与对称](./70-permutation-groups.md)——四张牌可以洗成很多顺序：第一张去第三位、第二张去第一位……“重排”本身就是代数对象；配套 set-mapper 实验；
- [群作用与计数选讲](./75-group-actions-counting.md)——四颗珠子串成手环黑白两色共 16 种涂法，转动后相同的图案不该重复数：让群作用替你转动手环；配套 set-mapper 轨道实验；
- [代数结构方法地图](./80-method-map.md)——遇到一个新系统，该先问交换律还是先找逆元？一张判断路线图替你决定把它看成群、环还是域；配套 proof-trail 梳理；
- [伽罗瓦理论选讲：对称决定可解性](./85-galois-theory.md)——五次方程为什么没有求根公式：根的对称群决定可解性，尺规作图的不可能也在这里结账；配套 set-mapper 根置换实验；

本章从钟表算术、开关、洗牌和加密进入抽象定义，再回到密码学与编码理论接口。核心依赖链为：运算律 → 二元运算 → 群 → 子群/陪集 → 同构/同态 → 环域 → 多项式与有限域 → 置换与群作用。

正式课已接入首批专属组件：双轴运算表、有限域倒数网格和循环生成器双视图。完整实现规格集中在仓库文件 `docs/33-algebraic-structures/COMPONENT_SPEC.md`，不在读者主线中展开。

:::note[生产状态]

第 33 章 16 门正式课已完成首轮生产，全部通过课程闭环校验与构建检查。

:::

## 实战挑战 · 循环群里的密钥交换

1976 年，Diffie 与 Hellman 发表论文《New Directions in Cryptography》（IEEE Transactions on Information Theory，第 IT-22 卷第 6 期，第 644–654 页），提出一个颠覆性的问题：两个从未见过面的人，能否当着全世界围观者的面，协商出只有他俩知道的秘密？他们给出的舞台正是本章的主角——模素数的乘法**循环群**：公开选定素数 $p$ 和生成元 $g$，两人各藏一个私数，交换"公钥"，再拿对方的公钥配自己的私数，两头会算出同一个数。

下面用玩具参数走完全程（真实协议里 $p$ 是几百位的大素数，这里取 $p=23$、$g=5$；5 在模 23 下的阶恰好是 22，是整个乘法群的生成元）。Alice 的私数 $a=6$，Bob 的私数 $b=15$。

**(a)** Alice 计算公钥 $A = g^a \bmod p$；

**(b)** Bob 计算公钥 $B = g^b \bmod p$；

**(c)** Alice 计算 $s = B^a \bmod p$，Bob 计算 $s' = A^b \bmod p$，验证两者相等——这个相等的值就是共享密钥。

第一问已示范。唯一诀窍：幂一旦变大就立刻取余，别让数字膨胀：

```exercise
# @title: 实战挑战：算出共享密钥
# @check: A=8
# @check: B=19
# @check: shared=2
# @hint: mod_pow 里每乘一次就要取一次余（% mod），否则 5 的 15 次方会膨胀成天文数字；共享密钥是拿对方的公钥配自己的私数，两头必然相同。
p = 23
g = 5
a = 6   # Alice 的私数（对外保密）
b = 15  # Bob 的私数（对外保密）

def mod_pow(base, exp, mod):
    result = 1
    for count in range(exp):
        result = result * base   # 这里每乘一次还缺一步什么？

    return result

A = mod_pow(g, a, p)
B = mod_pow(g, b, p)
shared = mod_pow(B, a, p)   # Alice 视角：Bob 的公钥配 Alice 的私数

print("A=" + str(A))
print("B=" + str(B))
print("shared=" + str(shared))
```

<details>
<summary>点开查看逐步解答</summary>

先把 `mod_pow` 补全——每乘一次就折回 0 到 mod−1 的范围：

```python
def mod_pow(base, exp, mod):
    result = 1
    for count in range(exp):
        result = (result * base) % mod   # 边乘边取余，数字永远长不大

    return result
```

**(a)** $A = 5^6 \bmod 23$：$5^6 = 15625 = 23\times679 + 8$，所以 $A = 8$。

**(b)** $B = 5^{15} \bmod 23$。一路乘一路折返（每个数是前一个乘 5 再对 23 取余）：$5, 2, 10, 4, 20, 8, 17, 16, 11, 9, 22, 18, 21, 13, 19$，所以 $B = 19$。

**(c)** Alice 算 $s = 19^6 \bmod 23$：$19^2 = 361 \equiv 16$，$19^3 \equiv 16\times19 = 304 \equiv 5$，于是 $19^6 \equiv 5^2 = 25 \equiv 2$。Bob 算 $s' = 8^{15} \bmod 23$：$8^2 \equiv 18$，$8^4 \equiv 18\times18 = 324 \equiv 2$，$8^8 \equiv 4$，拼起来 $8^{15} = 8^8\times8^4\times8^2\times8 \equiv 4\times2\times18\times8 = 1152 \equiv 2$。两头都停在同一个数：**共享密钥是 2**。围观的窃听者虽然抄下了 $p, g, A, B$ 全部四个数，却不知道 $a$ 或 $b$ 中的任何一个。

完整验算（输出应与判题目标一致）：

```python
p = 23
g = 5
a = 6
b = 15

def mod_pow(base, exp, mod):
    result = 1
    for count in range(exp):
        result = (result * base) % mod

    return result

A = mod_pow(g, a, p)
B = mod_pow(g, b, p)
print("A=" + str(A))
print("B=" + str(B))
print("shared_alice=" + str(mod_pow(B, a, p)))
print("shared_bob=" + str(mod_pow(A, b, p)))
```

**为什么窃听者干瞪眼？** 从 $A = 8$ 反推 $a$ 叫**离散对数问题**。本例 $p=23$ 小到可以逐个试；真实协议里 $p$ 有几百位，已知最快的反解方法也慢得不划算——安全性从来不是"绝对无解"，而是"代价高过秘密本身的价值"。

**为什么非得挑 $g=5$？** 模 23 的全体非零元素在乘法下组成一个 22 阶的循环群（这正是有限域 $\mathbb{F}_{23}$ 去掉 0 后的样子）。5 的阶恰好是 22，能生成整个群，它的幂才铺满全部候选密钥。对比一下：$g=2$ 的阶只有 11（因为 $2^{11} = 2048 = 23\times89+1$），公钥只能在半个群里打转，窃听者的搜索空间直接减半。生成元的阶，就是这套密码系统的天花板。

</details>

相关课程：[循环群与生成元](./25-cyclic-groups.md)（阶与生成判据）、[模运算中的环和域](./60-modular-rings-fields.md)（逆元住在哪里）、[有限域入门](./65-finite-fields.md)（为什么挑素数模）。第 34 章密码学将把这里的玩具参数换成真实尺寸。

## 实战挑战 · 圆形徽章的旋转对称

一家工作室在六格圆形徽章上涂两种釉色。顾客旋转徽章后看到的图案算同一款，但镜像图案是另一款设计。设计主管不想靠手画 64 张图，于是用本章的群作用计数法：让旋转群搬运六个格子，统计每个动作固定多少种涂法，再取平均。

设六个格子编号 0 到 5。恒等旋转固定全部 $2^6=64$ 种；旋转 1 格或 5 格时，所有颜色必须全同；旋转 2 格或 4 格形成两组三格循环；旋转 3 格形成三个双格循环。请用 Burnside 计数法求本质不同的徽章款数：

```exercise
# @title: 实战挑战：数出旋转等价的徽章
# @check: fixed=[64, 2, 4, 8, 4, 2]
# @check: orbits=14
# @hint: 旋转 k 格时先数独立循环个数：k=0 有 6 个；k=1、5 有 1 个；k=2、4 有 2 个；k=3 有 3 个。每个循环内颜色必须相同。
fixed = []
for k in range(6):
    cycle_count = 1
    fixed.append(2 ** cycle_count)

total = 0
for value in fixed:
    total = total + value
orbits = round(total / len(fixed))   # round：平均结果必是整数，收掉真除法的浮点尾巴

print("fixed=" + str(fixed))
print("orbits=" + str(orbits))
```

<details>
<summary>点开查看逐步解答</summary>

把“旋转 $k$ 格”看成置换，先数清它的独立循环：

| 旋转 | 循环结构 | 固定涂法 |
| --- | --- | --- |
| 0 格 | 六个单格 | $2^6=64$ |
| 1、5 格 | 一个六格环 | $2^1=2$ |
| 2、4 格 | 两个三格环 | $2^2=4$ |
| 3 格 | 三个双格环 | $2^3=8$ |

Burnside 平均给出

$$\frac{64+2+4+8+4+2}{6}=14.$$

完整验算代码（输出应与判题目标一致）：

```python
fixed = []
cycle_counts = [6, 1, 2, 3, 2, 1]   # 旋转 k 格的独立循环个数，k 从 0 到 5（对照上表）
for k in range(6):
    fixed.append(2 ** cycle_counts[k])

total = 0
for value in fixed:
    total = total + value
orbits = round(total / len(fixed))   # round：收掉真除法的浮点尾巴

print("fixed=" + str(fixed))
print("orbits=" + str(orbits))
```

所以只需生产 14 种代表款，就能覆盖旋转等价后的全部双色徽章设计。镜像图案不在这个旋转群里；若工厂也允许翻面，就要改用二面体群重新计数。

</details>

这个挑战与上面的密钥交换分别对应本章两条现实出口：对称性计数走向设计、化学与图分类；循环群取幂走向密码学与编码理论。
