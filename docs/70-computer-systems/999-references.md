---
title: 计算机系统 · 参考资料
description: 第 70 章涉及的核心论文、原著与延伸阅读一览。
volume: 6
layer: L4
track:
  - discrete-computing
stage: university-core
difficulty: 3
---

# 计算机系统 · 参考资料

本章涉及的核心论文、原著与延伸阅读，按课程推进顺序整理。

文献页面对所有人开放；带归档副本的条目，未登录点「原站下载」前往出处，登录后点「本地下载」直接取本站副本。

```paper
# @title: Cooperating Sequential Processes（协同顺序进程）
# @authors: Edsger W. Dijkstra（迪杰斯特拉）
# @year: 1965
# @venue: EWD 123 · Eindhoven University of Technology
# @tag: 原著
# @desc: 信号量、互斥、临界区这些词都出生在这份手稿里——浏览器开 30 个标签而一个崩了别的还活着，靠的就是它。
# @page: https://en.wikipedia.org/wiki/Cooperating_sequential_processes
# @pdf64: aHR0cHM6Ly93d3cuY3MudXRleGFzLmVkdS91c2Vycy9FV0QvZXdkMDF4eC9FV0QxMjMuUERG
```

```paper
# @title: Scheduling Algorithms for Multiprogramming in a Hard-Real-Time Environment（硬实时环境下的调度算法）
# @authors: C. L. Liu, James W. Layland
# @year: 1973
# @venue: Journal of the ACM 20(1)
# @tag: 论文
# @desc: 速率单调调度与那个 ln2 ≈ 69% 的利用率上界：第 3 课「SJF 平均等待最短却没人真用」的另一半答案。
# @page: https://en.wikipedia.org/wiki/Rate-monotonic_scheduling
```

```paper
# @title: Virtual Memory（虚拟内存）
# @authors: Peter J. Denning
# @year: 1970
# @venue: Computing Surveys 2(3)
# @tag: 论文
# @desc: 把「地址」和「内存」彻底解耦的工作集理论；4 KB 一页、TLB 命中率 99% 这套说法从这儿开始。
# @page: https://en.wikipedia.org/wiki/Virtual_memory
```

```paper
# @title: Three Models for the Description of Language（描述语言的三个模型）
# @authors: Noam Chomsky（诺姆·乔姆斯基）
# @year: 1956
# @venue: IRE Transactions on Information Theory
# @tag: 论文
# @desc: 文法分层的源头：为什么 3 + 4 × 5 是 23 而不是 35，答案写在文法的层级里，而不是运算符优先级表里。
# @page: https://en.wikipedia.org/wiki/Chomsky_hierarchy
```

```paper
# @title: A Relational Model of Data for Large Shared Data Banks（大型共享数据库的关系模型）
# @authors: E. F. Codd（埃德加·科德）
# @year: 1970
# @venue: Communications of the ACM 13(6)
# @tag: 论文
# @desc: 「SQL 不是查表语言，它是集合论穿了件外套」——这句话的原始出处，第 9 课的主角。
# @page: https://en.wikipedia.org/wiki/Relational_model
# @pdf64: aHR0cHM6Ly93d3cuc2Vhcy51cGVubi5lZHUvfnppdmVzLzAzZi9jaXM1NTAvY29kZC5wZGY=
```

```paper
# @title: The Transaction Concept: Virtues and Limitations（事务概念：优点与局限）
# @authors: Jim Gray（吉姆·格雷）
# @year: 1981
# @venue: VLDB 1981
# @tag: 论文
# @desc: ACID 四个字母的定稿现场，也是「并发事务对不对，看冲突图有没有环」的出处。
# @page: https://en.wikipedia.org/wiki/ACID
# @pdf64: aHR0cHM6Ly9qaW1ncmF5LmF6dXJld2Vic2l0ZXMubmV0L3BhcGVycy90aGVUcmFuc2FjdGlvbkNvbmNlcHQucGRm
```

```paper
# @title: A Protocol for Packet Network Intercommunication（分组网络互连协议）
# @authors: Vinton Cerf, Robert Kahn（瑟夫与卡恩）
# @year: 1974
# @venue: IEEE Transactions on Communications
# @tag: 论文
# @desc: TCP/IP 的出生证明：第 12 课里「100 字节发出去、线上跑的是 158 字节」的信封格式，从这儿定下来。
# @page: https://en.wikipedia.org/wiki/Internet_protocol_suite
# @pdf64: aHR0cHM6Ly93d3cuY3MucHJpbmNldG9uLmVkdS9jb3Vyc2VzL2FyY2hpdmUvZmFsbDA2L2NvczU2MS9wYXBlcnMvY2VyZjc0LnBkZg==
```

```paper
# @title: Congestion Avoidance and Control（拥塞避免与控制）
# @authors: Van Jacobson
# @year: 1988
# @venue: SIGCOMM '88
# @tag: 论文
# @desc: 「加性增、乘性减」那条锯齿的发明地——整个互联网没被自己挤垮，靠的就是这一篇。
# @page: https://en.wikipedia.org/wiki/TCP_congestion_control
# @pdf64: aHR0cHM6Ly9lZS5sYmwuZ292L3BhcGVycy9jb25nYXZvaWQucGRm
```

```paper
# @title: In Search of an Understandable Consensus Algorithm（寻找可理解的一致性算法）
# @authors: Diego Ongaro, John Ousterhout
# @year: 2014
# @venue: USENIX ATC 2014
# @tag: 论文
# @desc: 把 Paxos 的晦涩拆成选主、日志复制、安全性三块：五台机器坏两台，凭什么还能对真相达成一致。
# @page: https://en.wikipedia.org/wiki/Raft_(algorithm)
# @pdf64: aHR0cHM6Ly9yYWZ0LmdpdGh1Yi5pby9yYWZ0LnBkZg==
```
