---
title: Diffie-Hellman 密钥交换
lesson_id: cryptography/diffie-hellman
prereqs:
  - algebraic-structures/cyclic-groups
  - algebraic-structures/modular-rings-fields
  - numtheory/gcd
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
  - public-key-exchange
  - discrete-logarithm-problem
  - shared-secret
applications:
  - tls-handshake
  - vpn-tunnels
exits:
  - engineering
  - research
---

# Diffie-Hellman 密钥交换

## 1. 从一个场景开始

两个人隔着人山人海喊话，全程被窃听，最后却共享了一个只有他们知道的秘密数字——1976 年之前，密码学界公认这是不可能的任务；要商量密钥总得先秘密见面递钥匙。

Diffie 与 Hellman 用一行同余等式终结了共识：**有些运算顺着算容易、逆着算天难**。交换公开的数字不泄密，因为敌人被卡在"离散对数"这道单向门上。

## 2. 直觉解释

经典比喻是**调漆**：

1. 全世界约定一种公开底色（生成元 $g$）；
2. Alice 私配一份秘密颜料 a，把 $g$ 调成 $A = g^a$ 寄出；Bob 同样寄出 $B = g^b$；
3. 关键一步：Alice 把收到的 B 再调入自己的秘方，得 $B^a = g^{ba}$；Bob 调得 $A^b = g^{ab}$——**同一桶颜色**！

窃听者手握 $g$、$A$、$B$ 三样公开品，想合成共同色就必须先从 $g^a$ 反推出 a——"指数上取对数"。在模大素数的钟面世界里，这活儿的难度与幂运算云泥之别：正向乘方一路狂奔，逆向对数只能一格一格摸。单向门就此立起。

## 3. 正式定义

公开参数：大素数 $p$ 与模 $p$ 乘法群的生成元 $g$（第 33 章循环群的老朋友：$g$ 的幂跑遍群里每个元素）。

1. Alice 选私密随机数 $a$，发送 $A = g^a \bmod p$；
2. Bob 选 $b$，发送 $B = g^b \bmod p$；
3. 共享密钥 $s = B^a \equiv A^b \equiv g^{ab} \pmod{p}$——相等性由乘法交换律保证。

攻击者面对的核心难题叫**离散对数问题**：由 $g, g^a \bmod p$ 求 $a$。严格说，只由两个公钥 $A,B$ 求 $g^{ab}$ 是相关的 Diffie-Hellman 问题；本课先用离散对数这个最直接的入口讲直觉。当 $p$ 取数百上千位素数时，已知最好算法也遥不可及；而实验里故意用小 $p$ 让你亲手把它穷举穿——参数规模就是安全本身。

## 4. 分步例题

**例**：取 $p = 23$，$g = 5$，$a = 6$，$b = 15$。

1. Alice 计算 $A = 5^6 \bmod 23$：$5^2=25\equiv 2$，$5^4 \equiv 4$，故 $5^6 = 5^4 \cdot 5^2 \equiv 4\times2=8$；
2. Bob 计算 $B = 5^{15} \bmod 23$：反复平方拼装（$15 = 8{+}4{+}2{+}1$）得 $16\times4\times2\times5 = 640 \equiv 19$；
3. Alice 求密钥：$s = 19^6 \bmod 23 = 2$；Bob 求密钥：$s = 8^{15} \bmod 23 = 2$ ✓ 两边一致；
4. 窃听者视角：已知 5、8、19 与模 23，最直接攻击是先从 8 或 19 反推私密指数 a 或 b，再算共享密钥——本例 p 太小，穷举一秒就穿；把 23 换成 600 位素数后，这条路才真正望不到头。
5. 工程备注：真实协议还要验证 $g$ 的阶够大（否则密钥落在小圈子里），这正是 prereq 里"生成元与阶"知识的用武之地。

## 5. 动手实验

### 实验 1：钟面上的加法环游

正式定义里的乘方还没上手，先用最朴素的加法钟找感觉：每一步跨过 step 格、共走 power 步，落点是钟面第 $(step\times power)\bmod modulus$ 格。拖动 step 滑块，看步长怎么决定圈子的大小：

```viz
{
  "type": "cyclic-generator",
  "title": "加法钟：步长决定圈子大小",
  "modulus": 10,
  "step": 1,
  "power": 9
}
```

把 step 从 1 拨到 2 再拨到 5：步长 1 十个格子全部踩遍（组件标出「阶 = 10」，生成全群）；换 2 只绕偶数格的小圈，圈长缩到 5；换 5 更是在 0 与 5 两点之间折返，圈长只剩 2——步长选错，「能到达的世界」瞬间缩水。DH 真正使用的乘法群里有一模一样的圈结构，只是「跳格子」换成「自己乘自己」——实验 2 正式登场。

### 实验 2：完整跑一遍交换

```python title="Diffie-Hellman 小剧场"
P = 23                     # 公开素数（真实协议用几百位）
G = 5                      # 公开生成元

def square_multiply(base, exp, mod):
    # 平方-乘法快速幂：把指数拆成二进制，反复平方省下大量乘法
    result = 1
    base = base % mod
    while exp > 0:
        if exp % 2 == 1:                 # 当前二进制位是 1 就乘一次底
            result = result * base % mod
        base = base * base % mod         # 底数自乘翻倍
        exp = exp // 2                   # 指数右移一位
    return result

# Python 内置 pow 还支持三参数形式 pow(底, 指数, 模)——内置的快速幂，
# 与上面的手写版结果完全相同但更快；下面两条路都走一遍互相印证：
a_secret = 6                       # 只有 Alice 知道
b_secret = 15                      # 只有 Bob 知道

A_public = pow(G, a_secret, P)
B_public = pow(G, b_secret, P)
print(f"Alice 公开 {A_public}，Bob 公开 {B_public}")

s_alice = pow(B_public, a_secret, P)   # Bob 的公钥 + 自己的私钥
s_bob = square_multiply(A_public, b_secret, P)
print(f"两边算出的共同密钥: {s_alice} 和 {s_bob}")
print(f"一致吗: {s_alice == s_bob}")

found = None
for trial in range(1, P - 1):          # 私钥通常取 1~P-2；两端指数都会让公钥退化成 1
    if pow(G, trial, P) == A_public:
        found = trial
        break
print(f"窃听者试了 {found} 次就反推出了 a —— 参数太小是原罪")
```

最后一行的穷举正是第 4 步例题的代码化：安全性不是玄学，是"穷举步数 × 单步成本"的经济学。

### 快问快答

```quiz
Diffie-Hellman 的安全基石是哪件事？
- 乘法交换律让双方结果相等
- 由 g^a mod p 反推 a 的离散对数问题在大素数下极难 [*]
- 双方的私钥从未在网络上传过（这只对了一半）
? 结果相等解释"为什么能成交"，离散对数困难解释"为什么旁人学不会"。前者是正确性，后者才是安全性。
```

:::warning[常见误区]

**误区一**："DH 是加密算法。" 它只负责协商共享密钥，本身不加密任何内容；机密性由后续对称加密接管。

**误区二**："看到 A=g^a 就等于知道 a。" 模运算世界里"看得见幂的结果"与"会算指数"隔着一道离散对数鸿沟——这正是设计初衷。

**误区三**："DH 天然防冒充。" 中间人可以各与双方各建一条隧道两头传话（MITM）；纯 DH 无身份验证，实战必须叠加签名或证书——下一课 RSA 登场的理由之一。

:::

## 6. 练习

**练习 1**：口算 $3^4 \bmod 7$ 与 $3^6 \bmod 7$，观察后者回到 1 并联系"阶"的概念。

<details>
<summary>点开查看逐步解答</summary>

$3^2=9\equiv2$，$3^4\equiv4$；$3^6 = 3^4\cdot3^2 \equiv 4\times2=8\equiv1$。1 说明 3 的幂每 6 步绕钟面一圈——6 恰是 $\mathbb{Z}_7^\times$ 的群阶，费马小定理的影子。
</details>

**练习 2**：补全一场 $P=11$, $G=7$, $a=3$, $b=4$ 的交换，并顺手算出窃听者的最坏穷举次数：

```exercise
# @title: 练习：迷你密钥交换
# @check: 2
# @check: 5
# @check: 9
# @hint: 公钥与共享密钥每步都要过 mod P 的闸门（pow(底, 指数, 模) 或手动 %）；可用私钥取 1 到 P-2，因为 0 和 P-1 都会让公钥退化成 1。
P = 11
G = 7
a_secret = 3
b_secret = 4

A_public = G ** a_secret                 # ← 少了 mod P 闸门，公钥会大到离谱
B_public = G ** b_secret % P
shared_alice = B_public ** a_secret      # ← 这一步的结果同样要绕回钟面
worst_case_tries = P                     # ← 排除两个退化指数后，最多试几个？

print(A_public)
print(shared_alice)
print(worst_case_tries)
```

**练习 3**：若偷懒选了合数 $p = 15$ 当模，DH 会出什么乱子？（提示：$\mathbb{Z}_{15}$ 不是域）

<details>
<summary>点开查看逐步解答</summary>

若在全部模 15 元素上做乘法，会混进非可逆元（如 3、5、6）；它们没有逆，幂次轨道碎成大小不一的碎片，某些公钥只在小圈子里打转，离散对数难度骤降甚至无解歧义。素数模下非零元构成循环群，可以挑选阶足够大的生成元——第 33 章“模环与域”一课的地基在此承重。
</details>

## 7. 选读：为什么相信离散对数足够难

<details>
<summary>选读 · 四十年的围剿与防线</summary>

针对大素数上离散对数的最好通用算法是数域筛一族的变体，运行时间亚指数级（约 $L_{1/3}$ 记号描述），对 2048 位素数依旧望尘莫及；椭圆曲线群上的版本连亚指数算法都暂未找到，因此同样的安全强度只需 256 位参数。注意措辞是"目前没有好算法"而非"证明了不存在"——与 P 对 NP 一样，DH 的安全性建立在未经证明的计算假设之上；量子 Shor 算法一旦工程化，这道单向门将整体塌方，这也是后量子密码研究火热的原因。

</details>

## 8. 下一站

密钥有了、指纹也有了，还差一台人人可用、只有主人能开的保险箱。终章 RSA 压轴登场：把质因数分解的困难铸成锁芯。

→ [RSA 与模指数](./60-rsa-modexp.md)
