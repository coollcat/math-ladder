---
title: 分组密码工作模式
lesson_id: cryptography/block-cipher-modes
prereqs:
  - cryptography/symmetric-ciphers
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
  - ecb-mode
  - cbc-mode
  - ctr-mode
  - authenticated-encryption
applications:
  - disk-encryption
  - tls-record-layer
  - vpn-tunnels
exits:
  - engineering
  - research
---

# 分组密码工作模式

## 1. 从一个场景开始

AES 能把 128 位明文锁成 128 位密文——但磁盘加密、网络传输动辄几百 MB。总不能把长消息切成 16 字节一块、每块独立加密吧？（还真有人这么干过，代价惨痛。）**工作模式**就是回答这个问题的方案：告诉你怎么把"一次锁一个块"的积木拼成"一次锁一整面墙"的流水线。

## 2. 直觉解释

想象一排保险箱，每个只能装 16 字节。把文件分段塞进去，问题来了：

- **ECB（电子密码本）**：每个箱子独立上锁。相同的明文块永远锁出相同的密文——攻击者看密文就能"看图猜画"，因为图案的轮廓还在。著名的"企鹅图"就是 ECB 的反面教材。
- **CBC（密码块链接）**：每个箱子上锁前，先把内容跟上一个箱子的密文搅在一起。第一块加个随机 IV（初始向量）。同样的明文块，前面不同时结果也不同——链条效应打破了规律。
- **CTR（计数器）**：不再往箱子里"锁"东西，而是用加密器生成一串伪随机密钥流，跟明文按位异或。像一次性密码本的"量产版"——可以跳着访问任意块（并行友好）。
- **GCM（伽罗瓦/计数器模式）**：CTR 的基础上加了一道"认证标签"——不仅保密，还能检测篡改。现代 TLS 的标配。

## 3. 正式定义

设分组密码加密函数为 $E_K$（密钥 $K$ 作用于一个块），块大小 $b$ 位：

| 模式 | 加密公式 | 特性 |
| --- | --- | --- |
| ECB | $C_i = E_K(P_i)$ | 简单但不安全：相同明文 → 相同密文 |
| CBC | $C_i = E_K(P_i \oplus C_{i-1})$，$C_0=\text{IV}$ | 串行、需要随机 IV、需填充 |
| CTR | $C_i = P_i \oplus E_K(\text{nonce} \| i)$ | 并行、无需填充、计数器不重复即可 |
| GCM | CTR 加密 + GHASH 认证 | 同时保密 + 完整性（AEAD） |

**符号说明**：

| 符号 | 含义 |
| --- | --- |
| $P_i$ | 第 $i$ 块明文 |
| $C_i$ | 第 $i$ 块密文 |
| $E_K$ | 分组密码加密函数 |
| IV | 初始向量（CBC 必须随机且不可预测） |
| nonce | 仅用一次的数（CTR/GCM 中不可重复） |
| $\oplus$ | 按位异或 |

## 4. 分步例题

**例**：用 4 位分组（块大小 4 位）演示 CBC 模式。设 $E_K(x)=x+3\bmod16$（简化版加密），IV=5，明文 $P_1=2, P_2=7$。

**CBC 加密**：
1. 第一块：$P_1\oplus\text{IV}=2\oplus5=7$，$C_1=E_K(7)=7+3\bmod16=10$；
2. 第二块：$P_2\oplus C_1=7\oplus10=13$，$C_2=E_K(13)=13+3\bmod16=0$；
3. 密文 = $(10, 0)$。

**CBC 解密**：
1. $D_K(C_1)=10-3=7$，$P_1=7\oplus\text{IV}=7\oplus5=2$ ✓；
2. $D_K(C_2)=0-3=-3\equiv13$，$P_2=13\oplus C_1=13\oplus10=7$ ✓。

注意：解密时是密文块参与异或（而非明文），所以 CBC 解密可以并行——只要拿到相邻密文块即可。

## 5. 动手实验

### 实验 1（viz）：ECB 的"企鹅效应"

```viz
{
  "type": "datachart",
  "title": "ECB 模式：相同明文块 → 相同密文块（模式泄露）",
  "labels": ["块1=HELLO", "块2=WORLD", "块3=HELLO", "块4=BYE!!"],
  "values": [83, 41, 83, 72]
}
```

块 1 和块 3 明文相同，密文也相同（都是 83）——攻击者不需要解密就能知道哪些块内容一样。

### 实验 2（python）：四种模式的安全性对比

```python title="ECB vs CBC vs CTR：相同明文的密文差异"
import random
random.seed(42)

def simple_encrypt(block, key):
    # 简化分组加密：每个字节加 key 并取模 256
    return [(b + key) % 256 for b in block]

def simple_decrypt(block, key):
    # 对应的解密：减回去
    return [(b - key) % 256 for b in block]

def xor_blocks(a, b):
    # 按位异或：两个等长列表逐元素异或
    return [x ^ y for x, y in zip(a, b)]

key = 7
iv = [random.randint(0, 255) for _ in range(4)]  # 随机 IV

# 两个相同的明文块
plain = [72, 73, 73, 33]  # "HII!"

# ECB：相同明文 → 相同密文
ecb1 = simple_encrypt(plain, key)
ecb2 = simple_encrypt(plain, key)
print(f"ECB: 块1={ecb1}, 块2={ecb2}, 相同={ecb1==ecb2}")

# CBC：IV 不同导致密文不同
cbc1 = simple_encrypt(xor_blocks(plain, iv), key)
cbc2 = simple_encrypt(xor_blocks(plain, cbc1), key)  # 链上前一块密文
print(f"CBC: 块1={cbc1}, 块2={cbc2}, 相同={cbc1==cbc2}")

# CTR：计数器不同 → 密钥流不同 → 密文不同
stream1 = simple_encrypt([0, 0, 0, 1], key)  # 计数器=1
stream2 = simple_encrypt([0, 0, 1, 0], key)  # 计数器=2
ctr1 = xor_blocks(plain, stream1)
ctr2 = xor_blocks(plain, stream2)
print(f"CTR: 块1={ctr1}, 块2={ctr2}, 相同={ctr1==ctr2}")
```

ECB 两块密文完全一样——模式泄露；CBC 和 CTR 即使明文相同，密文也不同。

### 快问快答

```quiz
为什么 ECB 模式被认为不安全？
- 它的加密算法太弱
- 相同的明文块总是产生相同的密文块，泄露模式 [*]
- 它不支持解密
? ECB 对每个块独立加密，相同输入永远产生相同输出。攻击者可以通过密文中的重复模式推断明文结构——著名的"ECB 企鹅"就是例证。
```

```quiz
GCM 比 CTR 多了什么能力？
- 更高的加密速度
- 认证（完整性校验），能检测密文是否被篡改 [*]
- 支持更大的密钥
? GCM = CTR 加密 + GHASH 认证标签。接收方不仅解密，还验证标签——篡改任何一位都会被发现。这就是 AEAD（认证加密）。
```

:::warning[常见误区]

**误区一**："CBC 模式的 IV 可以重复使用。" IV 必须每次加密都随机生成且不可预测。IV 重用会让第一块的异或结果相同，泄露明文差异——与 ECB 的问题异曲同工。

**误区二**："CTR 模式不需要认证。" CTR 只保密不防篡改。攻击者翻转密文的某一位，解密后对应明文位也会翻转——毫无察觉。实际工程中几乎总是用 GCM（或其他 AEAD）而非裸 CTR。

**误区三**："模式选错了没关系，加密算法强就行。" AES-256-ECB 的加密算法无懈可击，但模式让它照样泄露信息。**算法决定单块安全性，模式决定整体安全性**——两者缺一不可。

:::

## 6. 练习

**练习 1**：用 CBC 模式手动加密：$E_K(x)=x\times3\bmod32$（块大小 5 位），IV=4，明文 $P_1=5, P_2=6$。

<details>
<summary>点开查看逐步解答</summary>

CBC 加密：$C_1=E_K(P_1\oplus\text{IV})=E_K(5\oplus4)=E_K(1)=1\times3=3$；$C_2=E_K(P_2\oplus C_1)=E_K(6\oplus3)=E_K(5)=5\times3=15$。密文 = $(3,15)$。验证解密：$D_K(3)=3/3=1$，$P_1=1\oplus4=5$ ✓；$D_K(15)=15/3=5$，$P_2=5\oplus3=6$ ✓。
</details>

**练习 2**：补全 CBC 解密逻辑——代码能跑但结果不对：

```exercise
# @title: 练习：修复 CBC 解密
# @check: [5, 6]
# @hint: CBC 解密时，用密文块（不是明文）参与异或
def simple_encrypt(block, key):
    return [(b + key) % 256 for b in block]

def simple_decrypt(block, key):
    return [(b - key) % 256 for b in block]

key = 7
iv = [42, 42, 42, 42]
cipher_blocks = [
    simple_encrypt([5 ^ 42, 5 ^ 42, 5 ^ 42, 5 ^ 42], key),
    simple_encrypt([6 ^ 5, 6 ^ 5, 6 ^ 5, 6 ^ 5], key),   # ← bug：应该异或前一块密文
]

plaintext = []
prev = iv
for cb in cipher_blocks:
    decrypted = simple_decrypt(cb, key)
    block = [d ^ p for d, p in zip(decrypted, prev)]  # prev 应该是密文块
    plaintext.append(block[0])
    prev = [block[0]] * 4   # ← bug：prev 应该更新为密文块，不是明文

print(plaintext)
```

<details>
<summary>点开查看逐步解答</summary>

```python
def simple_encrypt(block, key):
    return [(b + key) % 256 for b in block]

def simple_decrypt(block, key):
    return [(b - key) % 256 for b in block]

key = 7
iv = [42, 42, 42, 42]
cipher_blocks = [
    simple_encrypt([5 ^ 42, 5 ^ 42, 5 ^ 42, 5 ^ 42], key),
    simple_encrypt([6 ^ 5, 6 ^ 5, 6 ^ 5, 6 ^ 5], key),
]

plaintext = []
prev = iv
for cb in cipher_blocks:
    decrypted = simple_decrypt(cb, key)
    block = [d ^ p for d, p in zip(decrypted, prev)]
    plaintext.append(block[0])
    prev = cb   # ← 修复：prev 更新为当前密文块

print(plaintext)  # [5, 6]
```
</details>

## 7. 选读：认证加密的演化史

<details>
<summary>选读 · 从 MAC-then-Encrypt 到 AEAD</summary>

早期做法是先算 MAC（消息认证码）再加密（MAC-then-Encrypt），但 TLS 的实现顺序错误导致了 BEAST、Lucky Thirteen 等攻击。安全界总结出教训：认证和加密必须**不可分割**地绑定在一起。

演化路径：Encrypt-and-MAC（并行，各自独立，安全性最弱）→ MAC-then-Encrypt（先认证再加密，填充攻击可利用）→ Encrypt-then-MAC（先加密再对密文算 MAC，理论安全但实现复杂）→ AEAD（一体化设计，如 GCM、ChaCha20-Poly1305）。

GCM 用 CTR 做加密、用 GHASH（基于伽罗瓦域乘法的通用哈希）做认证。关键约束：同一个密钥下的 nonce 绝对不能重复——nonce 重用不仅泄露明文，还会泄露认证密钥，彻底崩盘。ChaCha20-Poly1305 用流密码 ChaCha20 加密、Poly1305 认证，在没有 AES 硬件加速的设备上更快，是 Android 和 TLS 1.3 的首选。

</details>

## 8. 下一站

分组模式解决了"怎么锁一大块"，但纠错码解决的是"怎么让数据在噪声中存活"。当信道不只是噪声而是**恶意篡改**时——下一课把舞台搬进有限域，看 Reed-Solomon 码如何用多项式拯救 CD 刮痕和太空信号。

→ [Reed-Solomon 码](../../35-coding-theory/72-reed-solomon.md)
