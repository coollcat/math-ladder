---
title: 哈希与消息认证
lesson_id: cryptography/hash-mac
prereqs:
  - cryptography/threat-model
  - numtheory/mod
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
  - cryptographic-hash
  - avalanche-effect
  - message-authentication-code
applications:
  - file-integrity-checksums
  - api-signing
exits:
  - engineering
---

# 哈希与消息认证

## 1. 从一个场景开始

下载一个安装包，官网旁边挂着一串十六进制乱码"校验和"。改完系统时钟、换过下载镜像，只要这串码对上就安心安装——它怎么知道文件有没有被掉包？

这就是**哈希函数**的舞台：任意长的输入压成固定长度的"指纹"，输入动一根汗毛、指纹面目全非。再往指纹里掺一把只有你我知道的密钥，就成了防伪造的**消息认证码（MAC）**。

## 2. 直觉解释

把哈希想成绞肉机：肉进去馅出来，反向还原不可能；而且两块只差一粒胡椒的肉，出来的馅也完全不同。密码学哈希的三条职业操守：

- **确定性**：同一输入永远同一输出（不然没法对账）；
- **雪崩效应**：改动 1 个比特，输出约一半比特翻转——指纹彻底变脸；
- **抗碰撞**：找不到两个不同输入共用一条指纹（严格说是"算力范围内找不到"）。

MAC 的配方是“指纹 + 秘密调料”：发送方把密钥混入哈希计算后生成 tag 随信附上；接收方用同一密钥重算比对。窃听者看得见 hash 函数与全部报文（Kerckhoffs 原则下无妨），但没有 key 就复制不出能通过验收的 tag——**完整性**与**真实性**一并到手。

## 3. 正式定义

密码学哈希函数 $H : \lbrace 0,1\rbrace^{*} \to \lbrace 0,1\rbrace^{L}$ 把任意长位串压到 $L$ 位，要求：确定性、高效计算、抗原像（给 $y$ 难找 $x$ 使 $H(x)=y$）、抗第二原像（给 $x$ 难找 $x'\ne x$ 同像）、抗碰撞（难找任意一对同像）。

**消息认证码**：算法三元组，密钥 $k$ 生成 $\text{tag} = \text{MAC}_k(m)$；验证方重算并比较。安全性要求：不知 $k$ 的攻击者即使看过许多 $(m_i, \text{tag}_i)$ 样本，伪造新消息合法标签的概率仍可忽略。注意与加密分工明确：MAC 保完整与真身，不保机密；工程里应使用标准认证加密或 HMAC 方案，不要自创“签名”顺序和拼接方式。

## 4. 分步例题

**例**：手玩一个迷你滚动哈希：$h$ 从 0 出发，逐字符执行

$$h = (31 \cdot h + \text{code}(c)) \bmod 997$$

其中 code 取字母编号（A=0）。计算 H(`BA`)：

1. 读入 B：$h = 31\times 0 + 1 = 1$；
2. 读入 A：$h = 31\times 1 + 0 = 31$；
3. 指纹为 31。
4. 换成 `AB`：读入 A 得 $h=31\times0+0=0$，再读入 B 得 $h=31\times0+1=1$——指纹从 31 变成 1。读入顺序不同指纹完全不同——位置信息被揉进了乘法。真实哈希（SHA-256）轮数更多、模更大，但"逐块搅拌"的骨架一模一样。

## 5. 动手实验

### 实验 1：篡改检测流程图

点击卡片连线，走一遍 MAC 验收流程（正确链路：原文→指纹→比对一致）：

```viz
{
  "type": "proof-trail",
  "title": "MAC 篡改检测流水线",
  "steps": [
    { "id": "m", "text": "原始消息 m" },
    { "id": "t", "text": "带钥算出 tag" },
    { "id": "send", "text": "(m, tag) 公开传输" },
    { "id": "evil", "text": "攻击者改成 m'" },
    { "id": "re", "text": "收方用钥匙重算 tag'" },
    { "id": "bad", "text": "tag' ≠ tag：拒收报警" }
  ],
  "edges": [
    ["m", "t"],
    ["t", "send"],
    ["send", "evil"],
    ["evil", "re"],
    ["re", "bad"]
  ]
}
```

### 实验 2：雪崩现场

```python title="迷你滚动哈希：一字之差，指纹全变"
def mini_hash(text):
    h = 0
    for ch in text:
        code = ord(ch.lower()) - ord("a")   # lower() 转小写再统一编号
        h = (31 * h + code) % 997           # 乘子搅拌 + 大素数取模
    return h

pairs = [
    ("PAYONEHUNDRED", "PAYONEHUNDREX"),     # 只差最后一个字母
    ("transfer_100_to_bob", "transfer_101_to_bob"),
]
for a, b in pairs:
    print(f"{a} -> {mini_hash(a)}")
    print(f"{b} -> {mini_hash(b)}")
    print("---")
```

三组对照（自己再往 `pairs` 里加一组试试），每对两条指纹都毫无规律地散开——没有任何一处"只差一点所以指纹接近"。这就是雪崩效应：它掐死了"按相似度猜原文"的一切念想。

### 实验 3：没有钥匙，伪造寸步难行

```python title="带密钥前缀的 toy MAC 与一次失败的伪造"
def mini_hash(text):                  # 与实验 2 相同的哈希，这里自带一份
    h = 0
    for ch in text:
        code = ord(ch.lower()) - ord("a")
        h = (31 * h + code) % 997
    return h

KEY = "CLASSROOMONLYSECRET"         # 双方私享的秘密前缀

def mac(msg):
    return mini_hash(KEY + "|" + msg)     # toy 前缀版：真实现（如 HMAC）的结构远比这讲究

msg = "SENDREPORTFRIDAY"
tag = mac(msg)
print(f"合法标签: {tag}")

forged_tag = mini_hash(msg)               # 攻击者不知道 KEY，只能裸发指纹
print(f"裸指纹冒充: {forged_tag}  -> 验收 {'通过' if forged_tag == tag else '拒绝'}")
```

攻击者掌握公开算法、明文和合法标签，却不知道被搅进哈希输入的 KEY，因此无法为新消息重算标签。这里的“前缀”也解释了为什么不能写成 `mini_hash(msg) + KEY`：加性标签会被已知样本直接反推出密钥。诚实声明：toy 版只是教学示意，真实 HMAC 对“如何混合 key 与 hash”有严格设计，切勿拿去生产。

### 快问快答

```quiz
MAC 能防止下列哪种攻击？
- 窃听者读懂消息内容
- 中途篡改且冒充原发送者 [*]
- 流量分析推断谁在和谁通信
? MAC 提供完整性与来源真实性：无钥者改了消息就对不上标签。但它不加密内容，也不隐藏通信关系。
```

:::warning[常见误区]

**误区一**："哈希就是加密。" 哈希不可逆、无钥匙概念，是"压缩指纹"；加密必须可解回。两者目标相反却常搭档。

**误区二**："指纹没撞过就等于内容相同。" 抗碰撞是计算意义上的安全，不等于数学唯一；校验和对上了仍可能遭遇精心构造的同像攻击（如曾经的 MD5 碰撞）。

**误区三**："hash(key, msg) 怎么拼都行。" 拼接方式有讲究（如长度扩展攻击针对某些朴素组合），工程请直接使用标准 HMAC，不要自创配方。

:::

## 6. 练习

**练习 1**：手算 mini_hash(`CD`)（C=2, D=3，模 997）。

<details>
<summary>点开查看逐步解答</summary>

读 C：$h=31\times0+2=2$；读 D：$h=31\times2+3=65$。指纹 65。注意若输入换成 DC：$h=(31\times3+2)=95$——同样的字符、不同的次序，指纹两样。
</details>

**练习 2**：补全滚动哈希：让两行输出命中（起点值错了全盘皆错）：

```exercise
# @title: 练习：滚动哈希手推机
# @check: 31
# @check: 0
# @hint: 哈希从 0 号状态出发："空串的指纹是 0"；公式 h = (31*h + code) % 997 里先乘后加再取模。
def mini_hash(text):
    h = 1                          # ← 出发值该是多少？想想"还没吃进任何字符"的状态
    for ch in text:
        code = ord(ch) - ord("A")
        h = (h * 13 + code) % 997  # ← 乘子要与本课定义一致
    return h

print(mini_hash("BA"))
print(mini_hash("AA"))
```

**练习 3**：为什么哈希输出要取模一个大素数而不是大合数？联系 10 章的因子知识想一想。

<details>
<summary>点开查看逐步解答</summary>

合数模会引入"小因子陷阱"：比如模 1000 时，末三位相同的输入必然同指纹（1000 的因子 8 和 125 各自制造规律性碰撞）。素数 997 与任何小于它的数互素，乘法搅拌不会塌缩进某个子群——散得更开。这与哈希表选槽位数、RSA 选素数的口味一脉相承。
</details>

## 7. 选读：从校验和到 SHA-256 的距离

<details>
<summary>选读 · 为什么不能拿 CRC 当指纹</summary>

网络层的 CRC 校验和擅长抓"随机误码"，却毫无抗攻击性：它是线性函数，攻击者可以按方程修改报文同时保持校验值不变。SHA-256 则经过十余年公开密码分析（Kerckhoffs 式审查），已知最好的碰撞攻击也远够不着实用边界，输出 256 位使生日碰撞期望需要 $2^{128}$ 次运算。两者的差距不在速度，在**对手模型**：前者假设世界善意，后者假设对手聪明且有预算——这正是威胁模型决定设计的又一例证。

</details>

## 8. 下一站

指纹解决了"消息没被动过"。可机密性这边，一次一密贵得没法日常用——实用世界需要一台**又快又能扛住海量流量的加密机**。下一课看现代对称加密如何用一把短钥匙搅动任意长的消息。

→ [对称加密：从一次一密到 AES 的距离](./45-symmetric-ciphers.md)
