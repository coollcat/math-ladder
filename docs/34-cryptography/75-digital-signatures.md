---
title: 数字签名
lesson_id: cryptography/digital-signatures
prereqs:
  - cryptography/rsa
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
  - digital-signature
  - rsa-signature
  - ecdsa
applications:
  - software-distribution
  - tls-certificates
  - blockchain
exits:
  - engineering
  - research
---

# 数字签名

## 1. 从一个场景开始

你下载了一个开源软件的安装包，网站旁附了一段乱码和一句话："用我们的公钥验证签名，证明这文件没被人篡改过。" 你怎么验证？数字签名到底是什么魔法，能像手写签名一样"不可伪造"却又能在全世界任何一台电脑上检验真伪？

## 2. 直觉解释

手写签名绑定的是"人"——同一支笔同一份签名，盖在合同和盖在借条上长得一模一样。数字签名倒过来：**每份文件得到一个专属印章**，改一个字印章就废。

怎么做到的？回想 RSA 加解密：公钥锁、私钥开。把这对角色反过来——

- **私钥签名**：用自己的私钥对文件的"指纹"（哈希值）做一次加密运算，得到签名；
- **公钥验证**：任何人都能用公开的公钥把签名"解密"还原出指纹，再与文件实际的哈希比对——一致即证明文件确实出自私钥持有者、且未被篡改。

签名 ≠ 加密。签名的目的是**认证与完整性**，不是保密。你完全可以在公开文档上签名，让全世界验证。

## 3. 正式定义

**RSA 签名方案**（教科书版，实际需填充）：

| 步骤 | 操作 | 说明 |
| --- | --- | --- |
| 签名 | $\sigma = H(m)^d \bmod n$ | 用私钥指数 $d$ 对消息哈希值"解密" |
| 验证 | $\sigma^e \bmod n \stackrel{?}{=} H(m)$ | 用公钥指数 $e$ "加密"签名，与哈希比对 |

**符号说明**：

| 符号 | 含义 |
| --- | --- |
| $m$ | 原始消息 |
| $H(m)$ | 哈希函数输出（固定长度的消息摘要） |
| $\sigma$ | 数字签名值 |
| $(n,e)$ | 公钥 |
| $(n,d)$ | 私钥 |

**ECDSA（椭圆曲线数字签名算法）**：把 RSA 的模指数换成椭圆曲线上的标量乘法，256 位安全性 ≈ RSA-3072，签名更短更快，是 TLS、比特币的标配。

## 4. 分步例题

**例**：用玩具 RSA 参数 $p=3, q=11$（$n=33, \varphi=20, e=3, d=7$）对消息 $m=4$ 签名。

1. 计算哈希：为简化演示直接用 $H(m)=m=4$（真实系统用 SHA-256）；
2. 签名：$\sigma = 4^7 \bmod 33$。计算：$4^2=16$，$4^4=16^2=256\equiv256-7\times33=256-231=25$，$4^6=25\times16=400\equiv400-12\times33=400-396=4$，$4^7=4\times4=16$；所以 $\sigma=16$；
3. 验证：$16^3 \bmod 33$。$16^2=256\equiv25$，$16^3=25\times16=400\equiv4$；$4=H(m)$ ✓；
4. 篡改检测：攻击者把 $m$ 改为 5，$H(5)=5$，但 $16^3\bmod33=4\ne5$——验证失败，篡改暴露。

## 5. 动手实验

### 实验 1（viz）：签名验证流程

```viz
{
  "type": "plot",
  "title": "RSA 签名空间：σ = m^d mod n 的映射",
  "expr": "x^7 % 33",
  "xmin": 1,
  "xmax": 32,
  "sliders": []
}
```

横轴是消息 $m$，纵轴是签名 $\sigma$——毫无规律的锯齿映射正是安全性的来源：从 $\sigma$ 反推 $m$ 需要私钥。

### 实验 2（python）：完整的签名与验证

```python title="RSA 签名全流程：签名、验证、篡改检测"
def mod_inverse(a, m):
    # 扩展欧几里得求模逆元
    old_g, g = a % m, m
    old_x, x = 1, 0
    while g != 0:
        q = old_g // g
        old_g, g = g, old_g - q * g
        old_x, x = x, old_x - q * x
    return old_x % m

p, q = 61, 53                      # 教材经典参数
n = p * q                          # 模数
phi = (p - 1) * (q - 1)           # 欧拉函数
e = 17                             # 公钥指数
d = mod_inverse(e, phi)            # 私钥指数

message = 42                       # 待签名的消息（实际先哈希）
h = message                        # 简化：哈希就是消息本身
signature = pow(h, d, n)           # 签名：私钥"解密"
print(f"消息 {message} 的签名: {signature}")

# 验证：公钥"加密"签名，看是否还原
recovered = pow(signature, e, n)   # 公钥"加密"
valid = (recovered == h)           # 比对哈希
print(f"验证结果: {valid}")

# 篡改检测
tampered_msg = 43                  # 攻击者改了一位
tampered_h = tampered_msg
valid_tampered = (pow(signature, e, n) == tampered_h)
print(f"篡改后验证: {valid_tampered}")  # False

# 签名 ≠ 加密 的演示
encrypted = pow(message, e, n)     # 加密：公钥锁
decrypted = pow(encrypted, d, n)   # 解密：私钥开
print(f"加密 {encrypted}, 解密 {decrypted}")
print(f"签名 {signature} ≠ 加密 {encrypted}")  # 同一消息，两种结果不同
```

注意最后一行：同一消息的签名和加密值完全不同——因为签名用私钥、加密用公钥，方向相反。

### 快问快答

```quiz
数字签名与加密的核心区别是什么？
- 签名用公钥加密，加密用私钥解密
- 签名用私钥生成、公钥验证，加密反过来 [*]
- 签名和加密是完全相同的操作
? 签名 = 私钥"解密"哈希，验证 = 公钥"加密"还原比对。加密 = 公钥锁消息，解密 = 私钥开锁。方向互逆，目的不同。
```

```quiz
为什么实际签名不能直接用"教科书 RSA"？
- 教科书 RSA 太慢
- 教科书 RSA 是确定性的，相同消息产生相同签名，不安全 [*]
- 教科书 RSA 的密钥太短
? 确定性签名让攻击者能通过对比签名判断两条消息是否相同。实际方案（RSA-PSS）在签名前加入随机盐值，使每次签名不同。
```

:::warning[常见误区]

**误区一**："签名能保密。" 签名只保证**来源认证**和**完整性**，不隐藏消息内容。要保密需同时加密。

**误区二**："签名 = 把原文加密一遍。" 签名是对哈希值做逆向运算，不是对全文加密。全文加密太慢且无必要——哈希函数把任意长度压缩成固定长度，签名只管这个"指纹"。

**误区三**："有了签名就不需要证书。" 签名证明"持有某私钥的人签了这份文件"，但你怎么知道公钥真的属于它声称的那个人？这正是 PKI（公钥基础设施）和证书机构（CA）存在的理由——给公钥做"身份背书"。

:::

## 6. 练习

**练习 1**：用 $p=5, q=11$（$n=55, \varphi=40$）取 $e=3, d=27$，对消息 $m=2$ 签名并验证。

<details>
<summary>点开查看逐步解答</summary>

签名：$\sigma=2^{27}\bmod 55$。$2^1=2,2^2=4,2^4=16,2^8=16^2=256\equiv256-4\times55=36$，$2^{16}=36^2=1296\equiv1296-23\times55=1296-1265=31$，$2^{24}=31\times36=1116\equiv1116-20\times55=1116-1100=16$，$2^{26}=16\times4=64\equiv9$，$2^{27}=9\times2=18$。验证：$18^3\bmod55$：$18^2=324\equiv324-5\times55=324-275=49$，$18^3=49\times18=882\equiv882-16\times55=882-880=2=H(m)$ ✓。
</details>

**练习 2**：补全签名验证的核心逻辑——代码能跑但验证结果不对：

```exercise
# @title: 练习：修复签名验证
# @check: True
# @check: False
# @hint: 验签是用公钥指数 e 对签名做幂运算，然后与哈希比对
def mod_inverse(a, m):
    old_g, g = a % m, m
    old_x, x = 1, 0
    while g != 0:
        q = old_g // g
        old_g, g = g, old_g - q * g
        old_x, x = x, old_x - q * x
    return old_x % m

n, e = 55, 3
d = mod_inverse(e, 40)
msg = 7
sig = pow(msg, d, n)

# 验证：应该用公钥还原签名，再与消息比对
recovered = pow(msg, e, n)           # ← 这里用错了：不该对 msg 操作
valid = (recovered == sig)           # ← 比对对象也反了
tampered = (pow(sig, e, n) == 8)     # 篡改检测：8 是被篡改的消息
print(valid)
print(tampered)
```

<details>
<summary>点开查看逐步解答</summary>

```python
recovered = pow(sig, e, n)           # 用公钥对签名做幂运算
valid = (recovered == msg)           # 还原值应等于原始消息
tampered = (pow(sig, e, n) == 8)     # 篡改后不等于 8
print(valid)    # True
print(tampered) # False
```
</details>

## 7. 选读：ECDSA 为何比 RSA 签名更流行

<details>
<summary>选读 · 椭圆曲线上的签名（ECDSA 原理）</summary>

ECDSA 将 RSA 的"大数模幂"替换为椭圆曲线上的"标量乘法"。签名过程：选随机数 $k$，计算 $R=kG$（$G$ 为基点），取 $r=R_x\bmod n$，$s=k^{-1}(H(m)+rd)\bmod n$，签名 = $(r,s)$。验证：计算 $u_1=H(m)s^{-1}$，$u_2=rs^{-1}$，检查 $u_1G+u_2G$ 的 $x$ 坐标是否等于 $r$。

优势：256 位椭圆曲线 ≈ 3072 位 RSA 的安全强度，签名仅 64 字节（RSA 需 384 字节）。劣势：签名过程中 $k$ 必须真随机且不可重用——2010 年索尼 PS3 的 ECDSA 实现重用了 $k$，导致私钥被直接算出，成为密码学史上最著名的工程事故之一。比特币从第一笔交易起就用 ECDSA（secp256k1 曲线），2021 年 Taproot 升级后开始向 Schnorr 签名迁移。

</details>

## 8. 下一站

签名保证了"谁写的"和"没被改"，但当消息本身很长时，逐位加密效率低下——如何把大块数据高效地锁起来？下一课探索分组密码的工作模式。

→ [分组密码工作模式](./77-block-cipher-modes.md)
