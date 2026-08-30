# 第 34 章 · 密码学 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：历史生产指导。实际已落成 index + 8 门正式课；课题切分以 `docs/34-cryptography` 与 `VISION.md` 为准。
> 原规划目标：8 门正式课
> 写法：`LESSON_TEMPLATE.md` 九段式 + 本章定制组件
> 元数据基线：volume 3 / layer L4 / track discrete-computing / stage university-core / 章级 difficulty 4

## 1. 章定位

密码学把「数论结构 + 计算难度 + 概率论证」拧成一股绳：安全性不是"看不懂"，而是攻击者在给定威胁模型下没有高效算法。本章沿一条主线推进：

```text
威胁模型 → 古典密码为何必败 → 完美保密存在 → 哈希指纹 → 模指数与快速幂 → 费马/欧拉定理 → DH 密钥交换 → RSA 公钥体制
```

前半章回答「什么是不安全、什么是无条件安全」，后半章回答「什么是计算上安全」。每课都要同时给出代数结构和攻击者视角；不能把密码学写成算法说明书。

## 2. 前置覆盖

- 第 10 章已建立模运算（`numtheory/mod`）、欧几里得算法与 math.gcd（`numtheory/gcd`）、同余记号（`numtheory/congruence`）。
- 第 33 章已建立群、循环群、子群阶、Lagrange 定理、模环与有限域（`algebraic-structures/groups`、`cyclic-groups`、`lagrange`、`modular-rings-fields`、`finite-fields`）。
- 第 32 章已建立 P-NP 与问题难度语言（`computability/p-np`）。
- 第 09 章已有计数与概率直觉（`prob/counting`）；第 00 章已有 Python 循环/函数/matplotlib 与 `random`。

**重要事实**：费马小定理与欧拉 φ 函数全站**尚未出生**（grep 全 docs 仅本章 index 提到"费马小定理"一词），本章第 60 课必须给完整出生证明，不得引用不存在的前置。第 27/28/30 章在本文写作时只有 index 壳（现已分别建成 6/7/9 门，可正常引用）。

本章不重复推导 Lagrange 定理和扩展欧几里得，只调用其结论；不重复讲 P-NP 定义，只引用"无已知多项式算法"这一难度判断。

## 3. 组件清单

| renderer | 核心交互 | 服务课 |
| --- | --- | --- |
| `caesar`（现有） | 移位滑块加密/解密对照 | 20 |
| `cipher-freq`（新增） | 密文字频柱 vs 英文基线，拖移位对齐解码 | 20 |
| `hash-avalanche`（新增） | 改一位输入，指纹翻转位闪烁对比 | 40 |
| `clockmod`（现有） | 模时钟演示幂的落点循环 | 50/60 |
| `cyclic-generator`（现有） | Z_n 中生成元幂轨道（模幂循环可视化） | 50/70 |
| `sqmul-trace`（新增） | 平方-乘法步骤流水线逐步执行 | 50/80 |
| `finite-field-inverse-grid`（现有） | 模逆元网格查询验证 | 60 |
| `euclid`（现有） | gcd 步骤演示（选 e/d 时互素检查） | 60/80 |
| `sieve`（现有） | 小素数筛选演示 | 80 |
| `dh-public`（新增） | Alice/Bob/Eve 三栏公开信息实验 | 70 |
| `rsa-toy`（新增） | 小参数 RSA 加解密往返演示器 | 80 |

### 新增组件规格

1. **cipher-freq** —— spec 字段：`{"type":"cipher-freq","ciphertext":"DWWDFN DW GDZQ","shift":3,"baseline":"english"}`。画布：上方 26 根密文字母频率柱，下方英文基线折线，底部实时解码预览行。交互：拖 shift 滑块整组平移柱子对齐基线，预览即时更新；点柱高亮该字母的映射对。动画：无，即时重绘。
2. **hash-avalanche** —— spec 字段：`{"type":"hash-avalanche","text":"hello","bits":16,"algorithm":"fnv-lite"}`。画布：上部输入串逐字符格子，下部 16 格指纹位条（0/1 双色）。交互：编辑任一字符或点「翻转一位」按钮重新计算，值翻转的指纹位闪橙一次。动画：位翻转闪烁一轮。
3. **sqmul-trace** —— spec 字段：`{"type":"sqmul-trace","base":5,"exp":15,"mod":23}`。画布：左侧指数二进制位条，右侧 result/current 两寄存器步骤流水，每步标注「平方」或「乘 base」及取模后数值。交互：base/exp/mod 滑块或数字输入，「单步/播放/重置」。动画：步进高亮当前位与寄存器，播放模式可选。
4. **dh-public** —— spec 字段：`{"type":"dh-public","p":23,"g":5,"maxSecret":20}`。画布：三栏舞台，Alice/Bob 栏各一个私钥滑块与公钥读数，公共区显示 g、g^a mod p、g^b mod p，Eve 栏为 g^x 对照表。交互：双滑块调 a/b；Eve 面板「开始搜索」逐行扫描并高亮命中行。动画：Eve 扫描逐行动画，可暂停。
5. **rsa-toy** —— spec 字段：`{"type":"rsa-toy","message":4,"primes":[3,11,17,19,23],"autoKey":true}`。画布：三区——参数区（点选 p/q）、派生区（n、φ(n)、合法 e 下拉、d 读数）、管线区（m→加密→c→解密→m′）。交互：点选 p/q、输入 m、选 e（与 φ 不互素的选项灰掉）。动画：无，往返即时显示。

验收：5 个新 renderer 注册进 `RENDERERS`，有源码签名守卫，亮暗主题可读，canvas 非空白，至少一门课真实消费。

## 4. 八门课题切分

对应 index 规划模块：Kerckhoffs→10；古典密码频率攻击→20；完美保密→30；哈希认证→40；DH→70；RSA→80；另增设 50/60 两门数论支柱课（模指数与费马/欧拉），因为它们是 DH/RSA 的出生证明所需，且全站尚未诞生。

### 10 · Kerckhoffs 原则与威胁模型

- 文件：`10-threat-model.md`
- 核心概念一句话：密码系统必须在「敌人知道全部算法、只密钥保密」的前提下评估，安全性是相对威胁模型的陈述。
- 边界：讲攻击者能力三级（唯密文/已知明文/选择明文）与 Kerckhoffs 原则；不讲具体协议与形式化安全定义。
- 组件：quiz 情境分类为主 + 浮窗 Python 小实验（同一密文在不同泄露信息下的可读性）。
- 判题 exercise：实现 `classify(known_cipher, known_pairs, can_choose)` 返回能力等级中文标签。初始代码恒返回 `"唯密文"`；学生补两条 if 分支。@check 逐行：`已知明文`／`选择明文`／`唯密文`。
- 必写误区：「隐藏算法才安全」（恰恰相反）；「选择明文攻击是最弱的假设」（最强）；威胁模型不同结论可反转，脱离模型谈安全无意义。

### 20 · 古典密码与频率攻击

- 文件：`20-classical-frequency.md`
- 核心概念一句话：单表替换保不住自然语言——字母频率分布穿透了密钥空间的大小。
- 边界：讲凯撒/单表替换与频率分析；不讲 Enigma 转轮与已知明文攻击的完整历史细节。
- 组件：`caesar`（现有）+ `cipher-freq`（新增）。
- 判题 exercise：解密凯撒密文 `DWWDFN DW GDZQ`。初始代码把移位写成 `+3`（等于再加密一遍），输出错误字符串；学生把一处 `+3` 改成 `-3` 即通过。@check 单行：`ATTACK AT DAWN`。
- 必写误区：密钥空间巨大 ≠ 安全（26! 种替换仍被频率击穿）；频率攻击需要足够长的密文；移位方向混淆（解密是减密钥）。

### 30 · 完美保密与一次一密

- 文件：`30-perfect-secrecy-otp.md`
- 核心概念一句话：密钥与消息等长、均匀随机、只用一次时，任何密文下所有明文等可能——密文零信息。
- 边界：讲 Shannon 完美保密的离散版论证与 XOR 一次一密；不讲流密码工程与密钥分发难题的解决方案（只指出难题本身）。
- 组件：浮窗 Python 实验（固定密文枚举全部密钥展示所有可能明文）为主；quiz 一道。
- 判题 exercise：按位 XOR 加解密。初始代码用 `&` 当"加密"，输出错误密文；学生把一处 `&` 改成 `^`。@check 逐行：`011001`／`101010`（明文 `101010`、密钥 `110011` 的密文与回解）。
- 必写误区：完美保密不等于实用（密钥分发是死结）；密钥重用立即破坏一次一密（两密文异或得两明文异或）；XOR 是加法群运算不是"与"。

### 40 · 哈希与消息认证

- 文件：`40-hash-mac.md`
- 核心概念一句话：哈希把任意输入压成固定长度指纹，好指纹必须雪崩且难碰撞；MAC 用共享密钥给指纹签名防篡改。
- 边界：讲哈希三性质（确定性/雪崩/碰撞阻力直觉）与"校验和为什么不够"；不讲 SHA-2 内部结构与生日攻击定量分析（预告 36 章概率工具）。
- 组件：`hash-avalanche`（新增）。
- 判题 exercise：实现微型哈希 `h = (h*31 + ord(c)) % 97`。初始代码乘数写成 `1`，输出错误摘要；学生把一处 `1` 改成 `31`。@check 逐行：`hi -> 31`／`ih -> 61`。
- 必写误区：哈希不是加密（不可逆是特性）；雪崩≠随机（确定性函数没有随机性）；无密钥哈希不能防主动篡改（攻击者可连哈希一起改）。

### 50 · 模指数与快速幂

- 文件：`50-modexp-sqmul.md`
- 核心概念一句话：模世界里幂序列必然进入循环（群有限性保证），而平方-乘法让天文数字的指数只需 O(log e) 步。
- 边界：讲幂轨道循环现象、快速幂算法；不讲离散对数求解算法。
- 组件：`cyclic-generator`（现有）+ `clockmod`（现有）+ `sqmul-trace`（新增）。
- 判题 exercise：找最小 k 使 3^k ≡ 1 (mod 7)。初始代码判据写成 `pow(3, k, 7) == 0`，永远找不到，循环走完输出 `k = 9`；学生把一处 `== 0` 改成 `== 1`。@check 逐行：`k = 6`。
- 必写误区：先算 3^15 再取模在数学上对、计算上灾难（中间值爆炸）；幂循环长度不一定整除 n−1（要看群阶）；`pow(a,k,n)` 三参形式是内置捷径不是新语法（首现注释）。

### 60 · 费马小定理与欧拉定理（本课是定理出生地）

- 文件：`60-fermat-euler.md`
- 核心概念一句话：p 素且 p∤a 时 a^(p−1) ≡ 1 (mod p)；推广到一般 n 得 a^φ(n) ≡ 1（gcd(a,n)=1），模逆元因此可由 a^(φ(n)−1) 一步算出。
- 边界：讲费马小定理的 Lagrange 式证明思路（陪集划分 1..p−1）与欧拉 φ 推广；不讲原根存在性证明与素性检验算法。
- 组件：`finite-field-inverse-grid`（现有）+ `euclid`（现有）+ 浮窗 Python 批量验证。
- 判题 exercise：用费马小定理求 3 在模 7 下的逆元并验证。初始代码指数写成 `7 - 1` 得 3^6 ≡ 1（错当逆元），第二行验证 False；学生把一处 `7 - 1` 改成 `7 - 2`。@check 逐行：`5`／`True`。
- 必写误区：条件 p∤a 不能丢（a=p 时 a^(p−1) ≡ 0）；p 合数时公式失效（反例 2^3=8≡3 mod 6）；费马小定理给的指数是 p−1 不是 p。

### 70 · Diffie-Hellman 密钥交换

- 文件：`70-diffie-hellman.md`
- 核心概念一句话：双方只公开 g^a 与 g^b 却能共享 g^(ab)——安全性押注在「从 g^x 反解 x 很难」（离散对数难）上。
- 边界：讲协议流程与 Eve 的暴力视角；不讲中间人攻击防御与椭圆曲线变体（结尾一句预告）。
- 组件：`dh-public`（新增）+ `cyclic-generator`（现有）。
- 判题 exercise：p=23、g=5、a=6、b=15 手算式交换。初始代码三处幂运算都没写 `% p`，A/B 变成天文数字、共享钥错误；学生给三处各补 `% 23`（改动聚焦但同型）。@check 逐行：`A = 8`／`B = 19`／`shared = 2`。
- 必写误区：Eve 能看到一切交换内容仍算不出密钥（这正是设计目标）；g^a·g^b = g^(a+b) 不是 g^(ab)，共享钥必须用对方公钥做指数；离散对数"难"是计算陈述不是逻辑不可能（小参数必被暴力攻破，本课参数就是证据）。

### 80 · RSA 与模指数

- 文件：`80-rsa.md`
- 核心概念一句话：ed ≡ 1 (mod φ(n)) 时 m^(ed) ≡ m (mod n) 成立，于是公开 e 加密、私有 d 解密构成公钥体制。
- 边界：讲密钥生成、加解密与正确性论证（欧拉定理一行收尾）；不讲填充方案、时序攻击与素性检测细节。
- 组件：`rsa-toy`（新增）+ `sqmul-trace`（现有复用）+ `sieve`（现有）+ `euclid`（现有）。
- 判题 exercise：p=3、q=11、e=7，求 d 并对 m=4 加解密。初始代码搜 d 时误用 `% n` 判据（找到 d=19），密文与回解全错；学生把判据中一处 `n` 改成 `phi`。@check 逐行：`d = 3`／`c = 16`／`m = 4`。
- 必写误区：e 要与 φ(n) 互素而不是与 n 互素（本练习初始代码就是这个坑）；d 是 e 在模 φ(n) 下的逆，不是 1/e；n 公开不代表 d 可由 n 直接推出（要分解 n——大数分解难是安全根基）；RSA 天然可做签名但那是另一套流程。

## 5. Front Matter 建议

| 课 | lesson_id | prereqs | difficulty | introduces_concepts |
| --- | --- | --- | --- | --- |
| 10 | cryptography/threat-model | numtheory/congruence, algebraic-structures/groups | 3 | kerckhoffs-principle, threat-model |
| 18 | cryptography/classical-frequency | cryptography/threat-model | 3 | substitution-cipher, frequency-analysis |
| 19 | cryptography/perfect-secrecy | cryptography/classical-frequency, prob/counting | 4 | perfect-secrecy, one-time-pad |
| 20 | cryptography/hash-mac | cryptography/perfect-secrecy | 4 | cryptographic-hash, message-authentication |
| 21 | cryptography/modexp-sqmul | numtheory/mod, algebraic-structures/cyclic-groups | 3 | modular-exponentiation, square-and-multiply |
| 22 | cryptography/fermat-euler | cryptography/modexp-sqmul, algebraic-structures/lagrange | 4 | fermat-little-theorem, euler-totient |
| 23 | cryptography/diffie-hellman | cryptography/fermat-euler, computability/p-np | 4 | discrete-logarithm, key-exchange |
| 24 | cryptography/rsa | cryptography/diffie-hellman, numtheory/gcd | 4 | rsa, public-key-cryptography |

introduces_import 全章预计为空（只用已有 math/random/内置 pow）；若 40 课采用字符遍历无需新 import。所有 prereqs 已 grep 核实存在且编号在前。

## 6. 整章验收清单

1. 五个新 renderer 注册且 validate 可识别；每个至少被一门课真实消费。
2. 每课至少两个可视化入口（定制组件或浮窗实验）；高难课不得静态图凑数。
3. 每课一个判题 exercise：初始代码能运行但结果错，独立解法与 @check 逐行一致（数值见 §4）。
4. 每课有 quiz、误区卡、选读或边界说明；费马/欧拉的出生证明在第 60 课完整落地。
5. `npm run validate`、`node scripts/gen-graph.mjs`、`npm run build` 全绿。
6. h2 逐页一致（源 `^## ` vs 产物 `<h2`）；浏览器实测 exercise/quiz/viz；360px + dark 无溢出。
7. 报告结论合并进 `CONTENT_AUDIT.md`，非阻塞项登记到 `AUDIT_REPORTS/OPEN_ITEMS.md`。
