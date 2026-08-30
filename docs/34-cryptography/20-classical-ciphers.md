---
title: 古典密码与频率攻击
lesson_id: cryptography/classical-ciphers
prereqs:
  - cryptography/threat-model
  - numtheory/mod
  - numtheory/congruence
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
  - shift-cipher
  - frequency-analysis
  - ciphertext-letter-distribution
applications:
  - classical-cryptanalysis
  - puzzle-solving
exits:
  - engineering
---

# 古典密码与频率攻击

## 1. 从一个场景开始

公元前一世纪，凯撒给前线将军写信：每个字母都换成字母表后移三位的那个。敌人捡到信，看到的只是一串"天书"。这套以他名字命名的凯撒密码风光了两千年——然后在公元九世纪，阿拉伯学者阿尔·肯迪发明了一种方法，让所有单表替换密码集体破防。

这一课我们既是加密者也是破译者：先用模运算把凯撒密码写干净，再用**字母频率**当指纹，亲手撕开它的伪装。

## 2. 直觉解释

先把字母变成数字（第 10 章同余应用课的老朋友，$a=0, b=1, \dots, z=25$），凯撒密码就浓缩成一行模运算：

- 加密：$c = (p + k) \bmod 26$，把字母在"26 格钟面"上顺时针拨 $k$ 格；
- 解密：$p = (c - k) \bmod 26$，逆时针拨回去；
- $k = 3$ 就是凯撒本人的版本。

它为什么脆弱？因为**替换是"一对一"的**：明文里出现最多的字母，密文里必然也最多。英语里 e、t、a 高频得像指纹——数一数密文的字频，把最常见密文字母猜成 e，钥匙往往当场现形。这叫**频率分析**：密码藏得住字母的身份，藏不住字母的**习惯**。

## 3. 正式定义

**移位密码**：取密钥 $k \in \mathbb{Z}_{26}$，对明文字母序列 $p_1 p_2 \cdots$ 定义

$$c_i = (p_i + k) \bmod 26$$

解密为 $p_i = (c_i - k) \bmod 26$；可还原性由模加法与模减互逆保证（同余时钟上顺拨 $k$ 再逆拨 $k$ 回到原点）。

密钥空间 $\vert\mathcal{K}\vert = 26$，按上一课的算术，穷举成本约 13 次尝试——防线形同虚设。更致命的是统计攻击成立的前提：**移位密码不改变字母频谱的形状**，只把它整体平移；更一般的单表替换虽会重排字母名字，仍保住“从高到低排好”的频率轮廓。

## 4. 分步例题

**例**：用 $k=5$ 加密 `hello`，再自己解回来。

1. 编号：h→7, e→4, l→11, l→11, o→14；
2. 加 5：7+5=12→m，4+5=9→j，11+5=16→q，16→q，14+5=19→t；
3. 密文：`mjqqt`；
4. 解密逐位减 5：m(12)−5=7→h……回到 `hello` ✓。
5. 观察 `l l → q q`：重复模式原样保留！这是频率分析之外的另一路线索（"密文中两连字母对应明文两连字母"）。

## 5. 动手实验

### 实验 1：网页里的凯撒转盘

拖动滑块换钥匙，输入框里随便打英文句子，实时看加密结果：

```viz
{
  "type": "caesar",
  "title": "凯撒转盘：拖 k 试加密",
  "k": 3,
  "text": "HELLO MATH"
}
```

挑战任务：把 k 拨到某个值，让 `ATTACKATDAWN` 变成你能背下来的样子；再把它拨回 0 验证还原。

### 实验 2：加密器与暴力破解

```python title="凯撒加密 + 全钥匙穷举"
def shift_text(text, k):
    out = ""
    for ch in text:
        if ch == " ":                 # 空格不是字母：原样放行，不做移位
            out = out + " "
        else:
            code = ord(ch) - ord("A")     # ord 把字符变编号（大写 A 对齐到 0）
            new_code = (code + k) % 26    # % 26 让越界字母绕回钟面开头
            out = out + chr(ord("A") + new_code)   # chr 把编号变回字符
    return out

secret = shift_text("ATTACK AT DAWN", 9)
print(f"密文: {secret}")

for guess in range(1, 26):            # 攻击者视角：把 1~25 号钥匙全部试一遍
    candidate = shift_text(secret, 26 - guess)
    if candidate.startswith("ATTACK"):
        print(f"命中！钥匙 k={guess}，明文 {candidate}")
```

26 把钥匙的锁，程序眨眼开完。注意解密用 $26-k$ 实现"逆拨 $k$"——顺拨 17 格和逆拨 9 格在钟面上是同一个动作。

### 实验 3：频率分析——不用穷举也能破

```python title="统计密文字频，按英语高频字母猜钥匙"
def shift_text(text, k):              # 与实验 2 相同的加密器（含空格放行）
    out = ""
    for ch in text:
        if ch == " ":
            out = out + " "
        else:
            code = ord(ch) - ord("A")
            out = out + chr(ord("A") + (code + k) % 26)
    return out

cipher = shift_text("THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG", 10)
print(f"密文: {cipher}")

counts = {}
for ch in cipher.replace(" ", ""):    # replace：把字符串里的空格换成空
    counts[ch] = counts.get(ch, 0) + 1   # get(key, 0)：取键值，没有就默认 0

ranked = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)   # reverse=True：从高到低排（首见参数：默认升序，打开后变降序）
print(f"密文最高频字母: {ranked[0][0]}（出现 {ranked[0][1]} 次）")

english_order = "ETAOINSRHL"          # 英语高频字母速查表：e 最热、t 次之……
top_cipher = ranked[0][0]
for guess_e in english_order[:4]:     # 依次押"最热密文字母 = e/t/a/o"
    k_guess = (ord(top_cipher) - ord(guess_e)) % 26
    plain_head = "".join(chr((ord(c) - ord('A') - k_guess) % 26 + ord('A')) for c in cipher[:6])
    verdict = "可读！" if plain_head.startswith("THE") else "乱码，换下一名嫌疑人"
    print(f"押 {top_cipher}~{guess_e}: k={k_guess:>2}, 开头 {plain_head} -> {verdict}")
```

前三个押注全部乱码——因为这句测试语里最高频的不是 e 而是 o！直到第四个押注命中。真实的频率分析正是这样：统计给出**嫌疑人名单**，语言直觉做最终指认；样本越长，名单越短。这正是阿尔·肯迪在千年前干的事。

### 快问快答

```quiz
频率分析能奏效的根本原因是？
- 凯撒密码的钥匙太少
- 单表替换保留了明文字母的频率轮廓 [*]
- 密文太短
? 一对一替换不改各字母的相对占比：明文的 e 是最高频，密文里它变身后的字母照样最高频——轮廓泄露身份。
```

:::warning[常见误区]

**误区一**："换个复杂点的替换表就安全了。" 任意单表替换（26! 种钥匙！）依然保不住频率轮廓——阿尔·肯迪的方法对全体单表通杀。

**误区二**："解密公式是 $(c+k) \bmod 26$。" 方向反了会得到另一种加密；解密必须逆拨：$(c-k) \bmod 26$。Python 里负数取模自动落在 0~25，帮我们兜住了减过头的情形。

**误区三**："短密文一定破不了也一定破得了。" 频率分析需要足够长的样本才稳定；几个字的密文反而可能多种解读并存——统计武器的弹药是数据量。

:::

## 6. 练习

**练习 1**：手算：$k=15$ 时 `math` 的密文是什么？再用 $(c-15)\bmod 26$ 验算回明文。

<details>
<summary>点开查看逐步解答</summary>

m=12, a=0, t=19, h=7；加 15：27→1=b，15→p，34→8=i，22→w，密文 `bpiw`。验算：b(1)−15=−14≡12=m ✓（负数借一圈 26 补成 12）。同余时钟的负方向跳跃，第 10 章已经练过。
</details>

**练习 2**：修复解密函数的方向 bug，让两行输出命中：

```exercise
# @title: 练习：修好解密的方向盘
# @check: HELLO
# @check: WORLD
# @hint: 密文是明文顺拨 k 得到的；解密要逆拨——括号里的 k 前应该是什么符号？
def unshift(word, k):
    out = ""
    for ch in word:
        code = ord(ch) - ord("A")
        new_code = (code + k) % 26      # ← 往哪个方向拨才能回家？
        out = out + chr(ord("A") + new_code)
    return out

print(unshift("KHOOR", 3))
print(unshift("ZRUOG", 3))
```

**练习 3**：一段英文密文里 Q 出现 41 次高居榜首、Z 出现 38 次次席。给出两个候选钥匙并说明下一步怎么定夺。

<details>
<summary>点开查看逐步解答</summary>

候选一：Q 对应 e，则 $k=(16-4)\bmod 26=12$；候选二：Z 对应 e，则 $k=(25-4)=21$。分别用两个钥匙解出前几行，看哪个产出可读单词——统计给嫌疑人名单，语言直觉做最终指认。若都不通，继续押 a/o/i。
</details>

## 7. 选读：维吉尼亚——给频率分析设的第一道障碍

<details>
<summary>选读 · 多表替换如何抹平频谱</summary>

维吉尼亚密码用长度为 $L$ 的关键词循环移位：第 $i$ 位用 $k_{i \bmod L}$。同一个明文字母在不同位置被拨不同格，e 在密文里不再固定化身——频率轮廓被打碎成 $L$ 份小频谱。破法也相应升级：先统计密文找周期（重合指数法估 $L$），再把每第 $i, i{+}L, i{+}2L$ 个字母归堆，退化成 $L$ 个独立凯撒逐一击破。历史反复上演同一剧本：新的防御逼出新的统计武器，而"密钥比消息长且只用一次"（下一课！）才是终极答案。

</details>

## 8. 下一站

凯撒输给了统计，维吉尼亚输给了周期。有没有一种密码**永远**破不了？有——但它贵得离谱。下一课认识信息论盖章认证的唯一完美保密方案。

→ [完美保密与一次一密](./30-perfect-secrecy.md)
