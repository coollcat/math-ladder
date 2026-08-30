---
title: 第 34 章 · 密码学
description: 从移位密码到 RSA：用数论、群论和概率设计可证明安全。
volume: 3
layer: L4
track:
  - discrete-computing
stage: university-core
difficulty: 4
---

# 密码学

密码学的目标不是隐藏"用了加密"，而是让攻击者在合理资源内无法恢复信息。模逆元、费马小定理、单向函数和随机性共同构成现代方案的地基。

## 学习路线

1. [Kerckhoffs 原则与威胁模型](./10-kerckhoffs-threat-model.md)——安全只能押注在密钥上；
2. [古典密码与频率攻击](./20-classical-ciphers.md)——凯撒转盘与字母的统计指纹；
3. [完美保密与一次一密](./30-perfect-secrecy.md)——香农盖章的无条件不可破；
4. [哈希与消息认证](./40-hash-mac.md)——雪崩指纹防篡改防冒充；
5. [对称加密：从一次一密到 AES 的距离](./45-symmetric-ciphers.md)——短钥匙如何搅动长消息；
6. [Diffie-Hellman 密钥交换](./50-diffie-hellman.md)——众目睽睽下商量秘密；
7. [RSA 与模指数](./60-rsa-modexp.md)——把质因数分解铸成锁芯；
8. [椭圆曲线密码选讲](./70-ecc.md)——换一个群，不换剧本：256 位扛住 3072 位的活。

## 前置回望

卷一同余时钟和欧几里得算法提供基础；代数结构解释为什么某些逆运算难以反推。

## 计划交互形态

已落地（八门课全部上线）：

- 凯撒转盘拖 $k$ 试加密（《古典密码与频率攻击》，caesar 组件）；
- 明文与一次一密密文的字频对比图（《完美保密与一次一密》，datachart 组件）；
- MAC 篡改检测流水线（《哈希与消息认证》，proof-trail 组件）；
- Feistel 一轮往返流水线、两轮 SPN 雪崩对比图（《对称加密：从一次一密到 AES 的距离》，proof-trail 与 datachart 组件）；
- 威胁模型配对、加法钟周期圈、RSA 明文搅乱图分别由 set-mapper、cyclic-generator、datachart 承载；
- ECDH 密钥交换走浮窗 Python：同一条协议代码把模幂换成点倍乘（《椭圆曲线密码选讲》，plot 与 datachart 辅助）；
- 判题式练习与选择题八课全覆盖，破译走浮窗 Python。

待实现：跨字母统计的频率攻击面板、RSA 小参数演示器，登记在册、随专属组件批次排期。

## 实战挑战 · 罗马军团的密报

**史料出处**：凯撒密码的历史锚点真实可查——苏维托尼乌斯《恺撒传》记载凯撒用"字母表后移 3 位"通信（国家密码管理局科普专栏《凯撒大帝的智慧》亦采用此说）；最早的系统破译法（频率分析）见于公元 9 世纪阿拉伯学者阿尔·肯迪的著作。本题密文为教学情境原创，未对应任何具体竞赛或考试题号。

你是罗马元老院的情报官，截获一封军团密报（大写字母、空格保留原位）：

```text
VNNC VN JC CQN NJBC PJCN JC BNENW
```

情报显示：敌军使用**单表移位**（凯撒家族手法），但移位数 $k$ 未知——别指望还是老一套的 3。

**(a)** 统计密文中出现最多的字母。单表替换不改频谱轮廓，把它押给英语最高频字母 e（编号 4），算出候选 $k = (\text{最热密文字母} - 4) \bmod 26$。

**(b)** 用候选 $k$ 解密整段密报（解密公式 $(c-k) \bmod 26$）。若读出人话即破译成功；若仍是乱码，换频谱榜的下一名嫌疑人重试。

判题已就位——修复方向 bug 并填入你算出的 $k$：

```exercise
# @title: 实战挑战：破译罗马军团的密报
# @check: MEET ME AT THE EAST GATE AT SEVEN
# @hint: 数一数：N 出现 8 次独占鳌头；k = (ord("N") - ord("A") 的编号差 - 4) mod 26。加密是 +k，解密必须 -k！
cipher = "VNNC VN JC CQN NJBC PJCN JC BNENW"

def unshift(text, k):
    out = ""
    for ch in text:
        if ch == " ":
            out = out + " "
        else:
            code = ord(ch) - ord("A")
            out = out + chr((code + k) % 26 + ord("A"))   # ← 方向是不是反了？
    return out

best_k = 3                       # ← 用 (a) 问的押认法求出真正的 k 再填进来
print(unshift(cipher, best_k))
```

<details>
<summary>点开查看逐步解答</summary>

**(a)** 逐字数一遍：N 出现 8 次（VNNC 贡献 2、VN、CQN、NJBC、PJCN 各 1、BNENW 贡献 2），遥遥领先第二名 C 的 6 次。押 N↔e：$k = (13 - 4) \bmod 26 = 9$。

**(b)** 解密逐位减 9：V(21)−9=12→M，N−9=4→E……全段还原为：

```text
MEET ME AT THE EAST GATE AT SEVEN
```

东门七点会合——情报官立功。验算加密方向：M(12)+9=21→V ✓。

**历史回声**：本题为情境原创，但手法完全忠于两段真实历史——凯撒以移位 3 写军情（苏维托尼乌斯《恺撒传》所载），阿尔·肯迪在 9 世纪用频率分析系统破译单表替换。想体验完整攻击过程，回到 [古典密码与频率攻击](./20-classical-ciphers.md) 的实验 3。

**进阶思考**：这段密文若换成一次一密（每字母独立随机移位），同样的统计武器将彻底失灵——密文的频谱会被抹成一条平线。原因见 [完美保密与一次一密](./30-perfect-secrecy.md)。
</details>

相关课程：[古典密码与频率攻击](./20-classical-ciphers.md)（破译工具箱）、[Kerckhoffs 原则与威胁模型](./10-kerckhoffs-threat-model.md)（为什么"方法公开"依然安全）。

:::note[生产状态]

8 个规划模块已全部落成正式课并通过课程闭环校验（2026-08-28 插入对称加密课）；专属组件（凯撒频率攻击面板、RSA 小参数演示器）登记待实现。

:::

## 实战挑战 · 模幂：RSA 的心脏

RSA 加密的核心是一步**模幂**：$a^b \bmod n$。先算幂再取余，$3^4 \bmod 7$ 等于多少？下面这题忘了取余，修到输出 `4`：

```exercise
# @title: 实战挑战：模幂别忘取余
# @check: 4
# @hint: 先算 3^4 = 81，再对 7 取余；% 是取余运算符。
base, exp, mod = 3, 4, 7
result = base ** exp    # ← 问题在这：忘了对 mod 取余
print(result)
```

<details>
<summary>点开查看逐步解答</summary>

模幂是"先幂后余"：

```python
result = (base ** exp) % mod   # 81 % 7
print(result)                  # 4
```

改完：$3^4 = 81$，$81 \bmod 7 = 4$。初始代码直接输出 $81$，漏了取余。RSA 里 $m^e \bmod n$ 这步模幂，靠的就是"指数先涨、余数兜底"——$a^{b}\bmod n$ 的结果永远落在 $0$ 到 $n-1$ 之间，这也是密码学能把大数锁进小空间的根基。

</details>
