---
title: RSA 与模指数
lesson_id: cryptography/rsa
prereqs:
  - cryptography/diffie-hellman
  - algebraic-structures/lagrange
  - numtheory/primes
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
  - rsa-cryptosystem
  - euler-phi-function
  - trapdoor-permutation
applications:
  - tls-certificates
  - digital-signatures
exits:
  - engineering
  - research
---

# RSA 与模指数

## 1. 从一个场景开始

Diffie-Hellman 解决了"商量密钥"，但需要双方都在线互动。能不能更进一步：我公开发一个**锁好的信箱**，全世界任何人往里投信，只有我能开？

1977 年 Rivest、Shamir、Adleman 给出答案：把"两个大素数相乘容易、乘积分解回去极难"铸成锁芯。公钥人人可拿，私钥唯我独享——RSA 让"收件箱密码学"成为现实，也是 HTTPS 证书签名几十年的顶梁柱。

## 2. 直觉解释

RSA 的全部魔法浓缩在三个角色里：

- **公开的锁**：$n = p \cdot q$（两个大素数的乘积）和指数 $e$。任何人都能执行 $c = m^e \bmod n$ 把消息锁进箱子；
- **秘密的钥**：指数 $d$，满足 $e \cdot d \equiv 1 \pmod{\varphi(n)}$。有了它，$c^d \bmod n$ 一键开箱还原 $m$；
- **单向门的铰链**：$\varphi(n) = (p-1)(q-1)$——知道 $p, q$ 才算得出它，而外人从 $n$ 反解 $p,q$ 就是质因数分解难题。

为什么 $c^d$ 会变回 $m$？第 33 章 Lagrange 定理的回响：在模 $n$ 的可逆元群里，任意元素自乘 $\varphi(n)$ 次回到单位元 1（费马-欧拉定理）。由 $ed=1+t\varphi(n)$ 得 $m^{ed}=m\cdot(m^{\varphi(n)})^t=m$，所以先锁后开相当于绕场若干整圈后回到原明文——**加密与解密互为逆运算**，但造钥匙的方法只藏在分解式里。

## 3. 正式定义

**RSA 密钥生成**：

1. 选大素数 $p \ne q$，计算 $n = pq$ 与欧拉函数 $\varphi(n) = (p-1)(q-1)$；
2. 选 $e$ 与 $\varphi(n)$ 互素（常用 $65537 = 2^{16}+1$）；
3. 求 $d$：$e \cdot d \equiv 1 \pmod{\varphi(n)}$（扩展欧几里得算法求解，10 章的老工具）；
4. 公布 $(n, e)$ 为公钥，$(n, d)$ 为私钥。

**加解密**：对消息 $m < n$，

$$c = m^e \bmod n, \qquad m = c^d \bmod n$$

正确性由 $m^{ed} \equiv m \pmod{n}$ 保证：因 $ed = 1 + t\varphi(n)$，在 $\gcd(m,n)=1$ 时欧拉定理给 $m^{\varphi(n)}\equiv 1$；$m$ 含因子 $p$ 或 $q$ 的退化情形由中国剩余定理分案处理。交换 $e$、$d$ 的角色，同一台机器还能做**数字签名**：私钥签、公钥验。

## 4. 分步例题

**例**：玩具参数 $p=3, q=11$。

1. $n = 33$，$\varphi(n) = 2\times10 = 20$；
2. 取 $e = 3$（与 20 互素 ✓）；求 $d$：$3d \equiv 1 \pmod{20}$ → $d = 7$（$21 = 20 + 1$ ✓）；
3. 加密 $m = 4$：$c = 4^3 \bmod 33 = 64 \bmod 33 = 31$；
4. 解密：$31^7 \bmod 33$。用平方拼装：$31^2 \equiv 4$，$31^4 \equiv 16$，$31^6 \equiv 16\times4 = 64 \equiv 31$，再乘 $31$ 得 $31\times31 \equiv 961$；$961 = 29\times33+4$ → 余 **4** ✓ 原文回归；
5. 攻击者视角：只有 33 这个公开数，想求 $\varphi(33)=20$ 必须先分解出 3 和 11——玩具规模秒破，真实 RSA 的 $n$ 是 2048 位，人类算力至今束手。

## 5. 动手实验

### 实验 1：加密是一张打乱座位的表

```viz
{
  "type": "datachart",
  "title": "m -> m^3 mod 33：明文编号被搅乱",
  "labels": [
    "m=2",
    "m=4",
    "m=6",
    "m=8",
    "m=10"
  ],
  "values": [
    8,
    31,
    18,
    17,
    10
  ]
}
```

输入 2→8、4→31……映射毫无单调性可言，相邻明文被甩到天南地北——这就是"看起来像随机"的置换，而它的逆只有持 $d$ 者能算。

### 实验 2：完整跑一台迷你 RSA

```python title="迷你 RSA：加解密与签名"
def mod_inverse(a, m):
    # 扩展欧几里得求逆元：返回 x 使 a*x % m == 1（a 与 m 需互素）
    g, x = a % m, 1
    old_g, old_x = m, 0
    while g != 0:
        q = old_g // g
        g, old_g = old_g - q * g, g
        x, old_x = old_x - q * x, x
    return old_x % m

p, q = 61, 53                       # 教材经典示例参数（真实场景为数百位）
n = p * q
phi = (p - 1) * (q - 1)
e = 17
d = mod_inverse(e, phi)
print(f"公钥 (n={n}, e={e})，私钥 d={d}")

message = 65                        # 明文必须小于 n
cipher = pow(message, e, n)         # 三参数 pow：内置快速幂，DH 课已认识
recovered = pow(cipher, d, n)
print(f"{message} 加密成 {cipher}，解密回 {recovered}")

signature = pow(message, d, n)      # 签名：反过来先用私钥
verified = pow(signature, e, n)     # 验证：公钥能还原即确认身份
print(f"签名 {signature}，验证结果 {verified == message}")
```

同一对钥匙，正向锁信息、反向签文件——模指数这台双向机是 RSA 的灵魂。把 `message` 改成别的数字反复试；再故意把 e 换成与 phi 不互素的 15，看求逆当场崩塌。注意代码里的“签名”只是演示同一套逆运算；真实 RSA 签名要先哈希并用 PSS 这类填充方案。

### 快问快答

```quiz
RSA 安全性的根基是哪个数学事实？
- 素数有无穷多个
- 大整数乘起来容易，分解回去极难 [*]
- 模运算满足交换律
? 乘易分难让攻击者拿得到 n 却拆不出 p、q，从而永远算不出 phi(n) 与私钥 d。
```

:::warning[常见误区]

**误区一**："RSA 能直接加密大文件。" 它慢且要求 $m<n$，工程里只用 RSA 传递一把随机对称密钥，海量数据交给 AES——混合体制才是常态。

**误区二**："选素数随便挑两个就行。" 太接近、位数太少或来源可猜都会被专门算法收割；真实系统用随机化素性检测筛出无规律的大素数。

**误区三**："教科书版 RSA 可以直接上线。" 不加填充（OAEP）的裸 RSA 是确定性加密，同样明文永远同密文，经不起选择密文攻击；标准库里的实现早已替你填好这些坑。

:::

## 6. 练习

**练习 1**：手推 $p=5, q=11$：求 $n,\varphi,e=3$ 对应的 $d$，并加密 $m=2$。

<details>
<summary>点开查看逐步解答</summary>

$n=55$，$\varphi=40$；$3d\equiv1\pmod{40}$ → $d=27$（$81=80+1$）。$c=2^3=8$；验算 $8^{27}\bmod 55$：$8^2\equiv9$，$8^4\equiv26$，$8^8\equiv16$，$8^{16}\equiv36$；$27=16{+}8{+}2{+}1$ → $36\times16\times9\times8 \bmod 55 = 2$ ✓。
</details>

**练习 2**：补全玩具 RSA 的三处关键步骤：

```exercise
# @title: 练习：玩具 RSA 三步走
# @check: 33
# @check: 20
# @check: 7
# @hint: n = p*q；phi = (p-1)*(q-1)；d 是满足 e*d ≡ 1 (mod phi) 的数——把 21、41、61…里第一个能被 3 整除的那个找出来。
p = 3
q = 11
e = 3

n = p + q                    # ← 锁芯不是两数之和！
phi = (p - 1) * q            # ← 欧拉函数两边都要减一
d = 1                        # ← 用 hint 里的倍数法找出真正的 d

print(n)
print(phi)
print(d)
```

**练习 3**：为什么 $e$ 必须与 $\varphi(n)$ 互素？若不互素会发生什么？

<details>
<summary>点开查看逐步解答</summary>

$d$ 存在当且仅当 $e$ 在模 $\varphi(n)$ 下可逆，而可逆等价于互素（贝祖/扩展欧几里得的结论）。不互素时 $ed\equiv1$ 无解，私钥根本造不出来——比如 $\varphi=20$ 时取 $e=4$，$4d$ 永远是偶数追不上奇数的 1。互素检查正是密钥生成的第一道质检。
</details>

## 7. 选读：RSA 与 DH 是亲戚吗

<details>
<summary>选读 · 单向门的两副面孔</summary>

两者都靠"正向易、逆向难"的单向函数，但难点不同：RSA 押注**整数分解**，DH 押注**离散对数**。奇妙的是它们血脉相连——在素数域上会分解未必会对数，历史上最好的分解算法（数域筛）也正是离散对数算法的同族兄弟；量子算法 Shor 则一箭双雕，同时终结两者。因此后量子迁移必须整体换轨到格密码等新数学，而不是简单加大参数。教科书 RSA 还有一桩轶事：1977 年《科学美国人》悬赏的 129 位密文，直到 1994 年才被分布式计算分解——当年"天文数字"，如今一台手机几小时即可完成，参数升级永无止境。

</details>

## 8. 下一站

RSA 的锁芯在模乘法群里锻造，可同一份 DH 剧本换个群还能演得更省——终场加演：把舞台搬上椭圆曲线，看 256 位如何扛住 3072 位的活。

→ [椭圆曲线密码选讲](./70-ecc.md)
