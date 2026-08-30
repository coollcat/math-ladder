---
title: 生成矩阵与校验矩阵
lesson_id: coding-theory/generator-parity-matrices
prereqs:
  - coding-theory/linear-codes
volume: 3
layer: L4
track:
  - discrete-computing
  - information-learning
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - generator-matrix
  - parity-check-matrix
applications:
  - hardware-encoders
  - protocol-design
exits:
  - engineering
  - research
---

# 生成矩阵与校验矩阵

## 1. 从一个场景开始

发送端关心怎么快速造出码字，接收端关心怎么快速判断合法性。生成矩阵 $G$ 和校验矩阵 $H$ 分工完成这两件事；在 $\mathbb F_2$ 上，它们用同一套异或规则工作。

## 2. 直觉解释

设消息是长度 $k$ 的行向量 $m$。把 $k$ 个基码字按行排成生成矩阵 $G$，编码就是：

$$c=mG\pmod 2.$$

校验矩阵 $H$ 则像一组关卡。合法码字必须满足：

$$Hc^T=\vec 0\pmod 2.$$

接收块的 $Hc^T$ 叫校验子。它是几条奇偶警报组成的短地址。

## 3. 正式定义

一个 $[n,k]$ 线性码可由 $k$ 个线性无关码字按行组成的 $k\times n$ 生成矩阵 $G$ 生成：

$$C=\lbrace mG:m\in\mathbb F_2^k\rbrace.$$

它的校验矩阵 $H$ 是 $(n-k)\times n$ 矩阵，满足：

$$GH^T=0.$$

换句话说，码空间恰好是“能让每一条奇偶检查都通过”的那组向量的集合。

## 4. 分步例题

取

$$G=\begin{pmatrix}1&1&1&0&0\\0&0&1&1&1\end{pmatrix},$$

则消息 `10` 编成 `11100`，消息 `01` 编成 `00111`，消息 `11` 编成两者的异或 `11011`。

一个配套校验矩阵是：

$$H=\begin{pmatrix}1&1&0&0&0\\0&0&0&1&1\\0&1&1&0&1\end{pmatrix}.$$

对 `11011` 逐条验算：三条方程分别是第 $1+2$ 位、第 $4+5$ 位、第 $2+3+5$ 位，结果都为 $0\pmod2$。所以它是合法码字。

## 5. 动手实验

### 实验：$\mathbb F_2$ 矩阵流水线

```python title="mG 编码和 Hc^T 校验"
G = [
    [1, 1, 1, 0, 0],
    [0, 0, 1, 1, 1]
]
H = [
    [1, 1, 0, 0, 0],
    [0, 0, 0, 1, 1],
    [0, 1, 1, 0, 1]
]

def vec_matrix_mod2(v, M):
    out = []
    for col in range(len(M[0])):   # 依次计算输出的每一个分量
        total = 0
        for row in range(len(M)):
            total += v[row] * M[row][col]
        out.append(total % 2)      # 所有乘加完成后只保留模 2 余数
    return out

def matrix_vec_mod2(M, v):
    columns = []                 # 把 M 的每一列重新竖着收集
    for c in range(len(M[0])):
        column = []
        for r in range(len(M)):
            column.append(M[r][c])
        columns.append(column)
    return vec_matrix_mod2(v, columns)

m = [1, 1]
codeword = vec_matrix_mod2(m, G)
syndrome = matrix_vec_mod2(H, codeword)
print("codeword =", codeword)
print("syndrome =", syndrome)
```

把 `codeword` 手动改一位再求校验子，你会看到非零向量；不同位置的错误会给出不同校验子，这正是这组示例的巧妙之处。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为 $G$ 和 $H$ 相乘要用普通实数。这里是 $\mathbb F_2$：加法为异或，乘法为 AND。

**误区二**：你以为任何 $H$ 都适合纠错。若不同单错给出相同校验子，译码器就无法区分出错位置。

**误区三**：你以为生成矩阵的行数等于码长。它的行数通常是信息位数 $k$，列数才是码长 $n$。

:::

## 7. 练习

```exercise
# @title: 练习：编码并计算校验子
# @check: codeword=[1, 1, 1, 0, 0]
# @check: syndrome=[0, 0, 0]
# @hint: 消息 10 只取 G 的第一行；合法码字的三条奇偶检查都必须通过。
m = [1, 0]
G = [[1, 1, 1, 0, 0], [0, 0, 1, 1, 1]]
codeword = [
    (m[0] * G[0][0] + m[1] * G[1][0]) % 2,
    (m[0] * G[0][1] + m[1] * G[1][1]) % 2,
    (m[0] * G[0][2] + m[1] * G[1][2]) % 2,
    (m[0] * G[0][3] + m[1] * G[1][3]) % 2,
    (m[0] * G[0][4] + m[1] * G[1][4]) % 2
]
syndrome = [1, 0, 1]
print(f"codeword={codeword}")
print(f"syndrome={syndrome}")
```

<details>
<summary>点开查看逐步解答</summary>

因为 $m=[1,0]$，所以：

$$c=G_1=11100.$$

逐条验算 $Hc^T$：

```text
第 1 条方程看位 1、2：   1+1   ≡ 0
第 2 条方程看位 4、5：   0+0   ≡ 0
第 3 条方程看位 2、3、5：1+1+0 ≡ 0
```

三条方程全部通过，因此校验子是：

```python
H = [
    [1, 1, 0, 0, 0],
    [0, 0, 0, 1, 1],
    [0, 1, 1, 0, 1]
]
syndrome = []
for row in H:
    total = 0
    for i in range(len(codeword)):
        total += row[i] * codeword[i]
    syndrome.append(total % 2)      # F2 中只保留奇偶余数

print(f"codeword={codeword}")
print(f"syndrome={syndrome}")
```

</details>

## 8. 快问快答

```quiz
接收块满足 Hc^T=0 说明什么？
- 一定没有任何传输错误
- 它通过当前校验方程 [*]
- 它一定是发送端原文
? 通过校验只说明它落在该线性码的子空间里。偶数个错误也可能互相抵消，仍保持零校验子。
```

## 9. 选读：两种描述

<details>
<summary>选读 · 生成描述和检查描述</summary>

$G$ 的每一行都是一个能拿来组合发送的基码字；$H$ 的每一行则是一条合法性检查，不是用来发消息的码字。同一个线性码因此有两张脸：一张回答“怎么造”，另一张回答“怎么查”。卷积码、LDPC 和现代通信标准会反复使用这张检查脸。

</details>

## 10. 下一站

把“每列校验子都是一个二进制编号”做到极致，就得到经典 Hamming(7,4) 码。

→ [Hamming(7,4) 码](./50-hamming-74-code.md)
