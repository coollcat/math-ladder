---
title: 椭圆曲线密码选讲
lesson_id: cryptography/ecc
prereqs:
  - cryptography/diffie-hellman
  - algebraic-structures/cyclic-groups
  - algebraic-structures/lagrange
volume: 3
layer: L4
track:
  - discrete-computing
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - elliptic-curve
  - point-addition-law
  - elliptic-curve-discrete-logarithm
  - ecdh
applications:
  - tls-ecdh-handshake
  - bitcoin-signatures
exits:
  - engineering
  - research
---

# 椭圆曲线密码选讲

## 1. 从一个场景开始

Diffie-Hellman 的剧本你已经会背了：双方公开交换 $g^a$ 与 $g^b$，窃听者被卡在离散对数的单向门外。剧本唯一的依赖是**舞台**——模 $p$ 乘法群。可这张舞台的租金不便宜：翻开安全预算表，模乘法群要扛住现代攻击，模数得 2048 位起步；密钥、签名、握手报文全都跟着膨胀。

有没有更省的群？1985 年 Koblitz 与 Miller 各自指向一张奇怪的曲线：把密码舞台从「数字的乘法」搬到「曲线上的点」。同样的剧本，同样的安全强度，参数从 3072 位缩到 256 位——HTTPS 握手、比特币签名，用的都是这门「换群术」。

## 2. 直觉解释

先忘掉 mod，在一张光滑的卵石形曲线上玩台球：

1. **两点相加**：过点 $P$、$Q$ 画一条直线，它与曲线恰好交于第三点 $R$（这是三次曲线的代数承诺）；把 $R$ 沿 x 轴**翻折**（镜像），落点记作 $P+Q$；
2. **自己加自己**：直线需要两个点定方向，只有一个点时改用**切线**——切线与曲线的「第三个交点」翻折后就是 $2P$；
3. **单位元**：竖直的直线交不到第三点，约定它交在无穷远处的点 $\mathcal{O}$——它扮演加法里的 0。

翻折不是审美偏好：不翻折的话「加法」没有单位元、成不了群，整套剧本就散架了。

单向门也照旧立起，只是门板换成了几何：正向算 $kG$（点 $G$ 自己加自己 $k$ 次）用「倍增」技巧只要约 $\log_2 k$ 步；反向拿着 $kG$ 和 $G$ 求 $k$，却没有「坐标除以 $k$」的公式，只能一圈圈瞎试。这就是**椭圆曲线离散对数问题**。

## 3. 正式定义

**实数上的椭圆曲线**：

$$y^2 = x^3 + ax + b, \qquad 4a^3 + 27b^2 \neq 0$$

条件 $4a^3 + 27b^2 \neq 0$ 保证曲线光滑——没有尖点、没有自交，切线处处有定义（否则连「自己加自己」都做不了）。

**搬到有限域**：密码学实际使用的是同一条方程的 mod $p$ 版本，点集记作 $E(\mathbb{F}_p)$：所有满足方程的整数坐标 $(x, y)$，再并上无穷远点 $\mathcal{O}$：

$$y^2 \equiv x^3 + ax + b \pmod{p}$$

几何直觉原封不动地照用，只是每个零件都换成整数钟面上的对应物：

| 几何动作 | mod $p$ 下的代数化身 |
| --- | --- |
| 直线斜率 $\dfrac{y_2-y_1}{x_2-x_1}$ | 乘模逆元：$(y_2-y_1)\cdot(x_2-x_1)^{-1} \bmod p$ |
| 沿 x 轴翻折 $(x, y) \mapsto (x, -y)$ | $(x, y) \mapsto (x, p-y)$，坐标全是 $0 \sim p-1$ 的整数 |

**点加法公式**（$P=(x_1,y_1)$，$Q=(x_2,y_2)$，全程 mod $p$）：

- $P \neq \pm Q$：割线斜率 $\lambda = (y_2 - y_1)\cdot(x_2 - x_1)^{-1}$；
- $P = Q \neq \mathcal{O}$：切线斜率 $\lambda = (3x_1^2 + a)\cdot(2y_1)^{-1}$；
- 和的坐标：$x_3 = \lambda^2 - x_1 - x_2$，$y_3 = \lambda(x_1 - x_3) - y_1$；
- 特例：$P + (-P) = \mathcal{O}$（其中 $-P = (x, p-y)$）；$\mathcal{O} + P = P$。

除法全部换成模逆元（第 10 章扩展欧几里得的老本行）。这套加法让 $E(\mathbb{F}_p)$ 成为一个交换群——第 33 章群论的戏台，这次班底全是整数坐标的点。

## 4. 分步例题

**例**：教学曲线 $y^2 \equiv x^3 + 2x + 2 \pmod{17}$，生成元 $G = (5, 1)$。

1. **验明正身**：$G$ 在曲线上吗？左边 $1^2 = 1$；右边 $125 + 10 + 2 = 137 = 8\times17 + 1 \equiv 1$ ✓；
2. **切线算 $2G$**：$\lambda = (3\cdot25 + 2)\cdot 2^{-1} = 77\cdot 2^{-1}$；$77 \equiv 9$，而 $2^{-1} = 9$（$2\times9=18\equiv1$），故 $\lambda = 9\times9 \equiv 13$；$x_3 = 169 - 5 - 5 = 159 \equiv 6$；$y_3 = 13(5-6) - 1 = -14 \equiv 3$。所以 $2G = (6, 3)$；
3. **割线算 $3G = 2G + G$**：$\lambda = (1-3)(5-6)^{-1} = (-2)(-1)^{-1} = 2$；$x_3 = 4 - 6 - 5 \equiv 10$；$y_3 = 2(6-10) - 3 \equiv 6$。所以 $3G = (10, 6)$；
4. **实跑穷举**（下一节代码）：把 $17\times17$ 格子全试一遍，曲线上恰好 **19 个点**（含 $\mathcal{O}$），且 $G$ 的阶恰为 **19**：$G, 2G, \ldots, 18G$ 各不相同，$19G = \mathcal{O}$。倍乘序列实跑抄录：$2G=(6,3)$，$3G=(10,6)$，$4G=(3,1)$，$5G=(9,16)$，$6G=(16,13)$，$7G=(0,6)$，$8G=(13,7)$，$9G=(7,6)$，$10G=(7,11)$，……，$19G=\mathcal{O}$。
5. **两个彩蛋**：群阶 19 是素数——由 Lagrange 定理，除 $\mathcal{O}$ 外每个点的阶都是 19，**每个点都是生成元**，不存在小圈子可躲；Hasse 定理则承诺群阶不会离 $p+1=18$ 太远（$|N-(p+1)| \le 2\sqrt{17} \approx 8.25$，实际 $N=19$ 正落在区间 $[10, 26]$ 内）。真实曲线的「参数小、群不小」，根子就在这两条。

## 5. 动手实验

### 实验 1：先在实数上玩几何

下面的组件画出 $y^2 = x^3 + ax + 2$ 的上下两支。想象过 $P$、$Q$ 的直线：与曲线的第三个交点沿 x 轴一翻折，就是 $P+Q$。拖动滑块 $a$，曲线胖瘦随你捏——只要不捏出尖点或自交（本图 $b=2$ 时要 $a=-3$ 才会出事），它都是椭圆曲线家族的合法成员：

```viz
{
  "type": "plot",
  "title": "y^2 = x^3 + a*x + 2：连线、交点、翻折的舞台",
  "expr": "sqrt(x^3 + a*x + 2)",
  "expr2": "-sqrt(x^3 + a*x + 2)",
  "xmin": -3,
  "xmax": 4,
  "sliders": [
    { "name": "a", "min": -2, "max": 2, "step": 0.1, "value": 2 }
  ]
}
```

mod 17 版本没有这张图好看——它只是 17×17 格子里的 18 个整数点加一个抽象的 $\mathcal{O}$。但别失望：图上的几何只是**直觉**，真正干活的是 §3 那组公式，而公式在整数钟面上原样成立。实验 2 见分晓。

### 实验 2：mod 17 的整数影子 + ECDH 剧本重演

```python title="数点、找阶、重演 ECDH"
p = 17                  # 有限域的模数（真实曲线用 256 位素数）
a_c, b_c = 2, 2         # 曲线参数：y^2 = x^3 + a_c*x + b_c

# 第一步：穷举数点——17×17 格子全试一遍
count = 0
for x in range(p):
    rhs = (x ** 3 + a_c * x + b_c) % p     # 方程右边
    for y in range(p):
        if y * y % p == rhs:               # 左右相等，(x, y) 就在曲线上
            count += 1
print(f"仿射点 {count} 个，加无穷远点后群阶 = {count + 1}")

def point_add(P, Q):   # 点加法：几何三步（连线 -> 第三交点 -> 翻折）的代数化身
    if P is None: return Q     # None 代表无穷远点 O（加法单位元）
    if Q is None: return P
    x1, y1 = P                 # 元组解包：一次取出点的横纵坐标
    x2, y2 = Q
    if x1 == x2 and (y1 + y2) % p == 0: return None   # 连线竖直：和为 O
    if P == Q:                 # 自己加自己：切线斜率
        m = (3 * x1 ** 2 + a_c) * pow(2 * y1, -1, p) % p   # pow(t, -1, p)：t 的模 p 逆元
    else:                      # 两点不同：割线斜率
        m = (y2 - y1) * pow(x2 - x1, -1, p) % p
    x3 = (m * m - x1 - x2) % p
    y3 = (m * (x1 - x3) - y1) % p      # 翻折：注意是减 y1
    return (x3, y3)

def point_mul(k, P):   # 点倍乘 k*P：二进制倍加，DH 课的平方-乘法换了个舞台
    result = None
    addend = P
    while k > 0:
        if k % 2 == 1:                     # k 的二进制末位是 1，才往结果里加一次
            result = point_add(result, addend)
        addend = point_add(addend, addend)  # 翻倍
        k = k // 2                          # 指数右移：整除 2
    return result

G = (5, 1)
print(f"G = {G}，2G = {point_mul(2, G)}，3G = {point_mul(3, G)}")

# 第二步：G 的阶——一直加 G，看几步回到 O
Q, order = G, 1                 # Q 是游标，order 数步数
while Q is not None:            # 还没回到 O 就继续加
    Q = point_add(Q, G)
    order += 1
print(f"G 的阶 = {order}")

# 第三步：ECDH——与 DH 课逐行对照，只把模幂换成点倍乘
a_secret, b_secret = 7, 12             # 两把私钥（标量）
A_public = point_mul(a_secret, G)      # 对应 pow(G, a, P)
B_public = point_mul(b_secret, G)
print(f"Alice 公钥 {A_public}，Bob 公钥 {B_public}")
print(f"Alice 用自己私钥加 Bob 公钥：{point_mul(a_secret, B_public)}")
print(f"Bob 用自己私钥加 Alice 公钥：{point_mul(b_secret, A_public)}")
```

实跑结果：仿射点 18 个、群阶 19、$G$ 的阶 19、$2G=(6,3)$、$3G=(10,6)$；Alice 公钥 $(0,6)$、Bob 公钥 $(0,11)$，两边共享密钥同为 $(13, 7)$。看，$0+11=17$：两条公钥还是同一条竖线上的镜像——群阶素得连「选点失误」的余地都没有。共享密钥 $(13,7)$ 其实是 $84G$，而 $84 \equiv 8 \pmod{19}$，正是例题序列里的 $8G$。

**剧本对照表**——DH 与 ECDH 是同一份代码的两副面孔：

| DH（模 p 乘法群） | ECDH（椭圆曲线群） |
| --- | --- |
| 公开底数 $g$ | 公开生成元点 $G$ |
| 私钥：指数 $a$ | 私钥：标量 $a$ |
| 公钥 $A = g^a \bmod p$ | 公钥 $A = aG$（点倍乘） |
| 共享 $s = B^a = A^b$ | 共享 $S = aB = bA$ |
| 难点：由 $g^a$ 反求 $a$ | 难点：由 $G, aG$ 反求 $a$ |

### 实验 3：账单——为什么 256 位能顶 3072 位

```viz
{
  "type": "datachart",
  "title": "同样 128 位安全强度，密钥要多少比特",
  "labels": ["AES 对称密钥", "ECC 椭圆曲线", "RSA / DH 模乘"],
  "values": [128, 256, 3072]
}
```

差价来自两笔结构红利：

- **群阶更紧**：模 $p$ 乘法群的阶是 $p-1$，因子花杂——生成元的阶可能整出各种小圈子（Pohlig-Hellman 攻击专拆小因子，这正是 DH 课工程备注警告的事）。ECDH 造曲线时直接把群阶选成素数 $n$，攻击者没有任何捷径，只能硬吃约 $\sqrt{n}$ 步的 Pollard rho 生日攻击；
- **没有可借道的数字结构**：模乘法群里的元素是「数字」，数字有大小、有素因子，数域筛（index calculus 一族）借此做出亚指数攻击，2048 位由此成为刚需。曲线点没有这种「数感」——坐标之间不构成可筛的格——至今没有实用化的亚指数算法。指数级对亚指数级，$2^{128}$ 的差距便直接兑换成参数长度：256 位对 3072 位。

### 快问快答

```quiz
椭圆曲线密码比同强度的 RSA 参数小得多，根本原因是哪一条？
- 曲线的点有两个坐标，信息量翻倍所以更安全
- 群阶结构紧凑，且至今没有实用化的亚指数攻击（如 index calculus） [*]
- ECC 的私钥更短，是因为它只能加密更小的消息
? 模乘法群里数域筛一族可做亚指数攻击，而曲线点没有可供筛法借道的数字结构，最好通用攻击仍是指数级的 Pollard rho。安全强度直接兑换成参数长度：同为 128 位强度，256 位对 3072 位。
```

:::warning[常见误区]

**误区一**："椭圆曲线就是椭圆。" 名字来自椭圆积分的历史渊源；密码曲线的形状是卵石桥，与椭圆零相似，只共享一段学术家谱。

**误区二**："点加法就是把坐标相加。" 加法是几何三步（连线、第三交点、翻折）翻译成的公式：斜率取模逆、$x_3$ 带 $\lambda^2$、$y_3$ 是减法不是加法——照坐标硬加，出的点根本不在曲线上。

**误区三**："搬到 mod p 之后，几何直觉作废。" 恰恰相反：连线和切线被完整搬进整数钟面，「除法换模逆、翻折换 $(x, p-y)$」两个零件替换后公式一字不改。直觉是通用货币，只是要按汇率兑换。

:::

## 6. 练习

**练习 1**：手推 $4G = 3G + G$（用例题的 $3G=(10,6)$ 与 $G=(5,1)$），算完与实验 2 的实跑序列对答案。

<details>
<summary>点开查看逐步解答</summary>

割线斜率 $\lambda = (1-6)(5-10)^{-1} = (-5)(-5)^{-1} = 1$（分子分母相同，互为逆元抵消）；$x_3 = 1 - 10 - 5 = -14 \equiv 3$；$y_3 = 1\cdot(10-3) - 6 = 1$。所以 $4G = (3, 1)$，与实跑表一致 ✓。注意翻折方向：算出的「第三交点」纵坐标若不取负，就会得到镜像点 $(3, 16)$——不在序列里，立刻露馅。
</details>

**练习 2**：下面的迷你 ECDH 能跑，但点加法带着两处伤——修复它，帮 Alice 和 Bob 算出正确的公钥与共享密钥：

```exercise
# @title: 练习：修复点加法，跑通迷你 ECDH
# @check: (6, 3)
# @check: (9, 16)
# @check: (13, 10)
# @check: (6, 14)
# @check: (6, 14)
# @hint: 两处伤都在 point_add 里。其一：斜率的除法要换成乘模逆，pow(t, -1, p) 返回 t 的模 p 逆元；其二：公式最后一步是 m*(x1 - x3) - y1——几何上还要沿 x 轴翻折一次。修完先看 2G 是否落在例题序列里，再确认两边共享密钥相等。
p, a_c, G = 17, 2, (5, 1)    # 模数、曲线参数 a、公开生成元

def point_add(P, Q):   # 椭圆曲线点加法：连线找第三交点，再沿 x 轴翻折
    if P is None: return Q   # None 表示无穷远点 O（加法单位元）
    if Q is None: return P
    x1, y1 = P               # 元组解包：一次取出横纵坐标
    x2, y2 = Q
    if x1 == x2 and (y1 + y2) % p == 0: return None   # P 与 -P 相加，和为 O
    if P == Q:
        m = (3 * x1 ** 2 + a_c) // (2 * y1)     # ← 切线斜率：整除冒充了模逆！
    else:
        m = (y2 - y1) // (x2 - x1)              # ← 割线斜率：同样要模逆
    x3 = (m * m - x1 - x2) % p
    y3 = (m * (x1 - x3) + y1) % p               # ← 翻折丢了：检查最后一项的符号
    return (x3, y3)

def point_mul(k, P):   # 点倍乘 k*P：二进制倍加（DH 课的平方-乘法换舞台）
    result = None
    addend = P
    while k > 0:
        if k % 2 == 1:               # k 的二进制末位是 1，才往结果里加一次
            result = point_add(result, addend)
        addend = point_add(addend, addend)   # 翻倍
        k = k // 2
    return result

a_secret, b_secret = 5, 11     # 两把私钥（标量）
A_public = point_mul(a_secret, G)
B_public = point_mul(b_secret, G)
shared_alice = point_mul(a_secret, B_public)
shared_bob = point_mul(b_secret, A_public)
print(point_mul(2, G))     # 自检点加法：修对了这个才会对
print(A_public)
print(B_public)
print(shared_alice)
print(shared_bob)
```

**练习 3**：若贪便宜选了一条群阶等于 $15 = 3\times5$ 的曲线，ECDH 会出什么乱子？

<details>
<summary>点开查看逐步解答</summary>

群阶有因子 3 和 5，意味着群里藏着 3 阶、5 阶的小圈子（Lagrange 定理的必然）。Pohlig-Hellman 攻击把「求 15 阶群里的离散对数」拆成一组迷你对数：先在各小圈子里解，再用中国剩余定理拼回原答案——大锁被拆成一串小锁。所以真实曲线在上线前要验证群阶 $n$ 的素性（或确保余因子极小且无害）：练习 2 那条 19 阶曲线素得连门缝都没有，就是这个道理。
</details>

## 7. 选读：账单的细节与新威胁

<details>
<summary>选读 · 省钱的边界与收条的期限</summary>

**省钱的边界**：Hasse 界保证群阶贴着 $p+1$，密钥长度几乎不打折地兑换成安全强度；但并非每条曲线都老实——MOV 攻击能把某些曲线的点搬回模乘法群、借数域筛的刀，异常曲线则整群塌成加法。工业标准曲线（NIST P-256、Curve25519 等）都已逐条筛查过这些暗礁。顺带点名：**Curve25519** 是当今工业界的事实明星——256 位安全、设计常量全部公开、没有任何来路不明的魔数，TLS 1.3 与 Signal 协议的默认选项。

**收条的期限**：本课所有「难」，和 DH、RSA 一样，都建立在「经典计算机算不动」之上。量子 Shor 算法对模乘法群和椭圆曲线群**一视同仁**——离散对数在量子世界一律多项式时间，换群救不了场。这也是后量子密码必须整体换轨到格密码等新数学的原因：2065 年要保密的档案，今天就该开始操心。

</details>

## 8. 下一站

从凯撒的转盘到椭圆曲线上的点，同一个句式反复回响：安全性押在「正向易、逆向难」上，而「难在哪个群里」决定账单多长。武器库清点完毕——去章首页接受实战考验：那封来自罗马军团的密报还在等你。

→ [第 34 章 · 实战挑战](./index.md#实战挑战--罗马军团的密报)
