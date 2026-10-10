---
title: Transformer 数学 · 参考资料
description: 第 47 章涉及的核心论文、原著与延伸阅读一览。
volume: 5
layer: L11
track:
  - information-learning
stage: research-elective
difficulty: 5
---

# Transformer 数学 · 参考资料

本章涉及的核心论文、原著与延伸阅读，按课程推进顺序整理。

文献页面对所有人开放；带归档副本的条目，未登录点「原站下载」前往出处，登录后点「本地下载」直接取本站副本。

```paper
# @title: Attention Is All You Need
# @authors: Vaswani 等（Google）
# @year: 2017
# @venue: arXiv:1706.03762 (NeurIPS 2017)
# @tag: 论文
# @desc: 抛弃循环只用注意力：Transformer 与大模型时代的起点。
# @page: https://arxiv.org/abs/1706.03762
# @pdf64: aHR0cHM6Ly9hcnhpdi5vcmcvcGRmLzE3MDYuMDM3NjI=
```

```paper
# @title: Layer Normalization
# @authors: Jimmy Lei Ba, Jamie Kiros, Geoffrey Hinton
# @year: 2016
# @venue: arXiv:1607.06450
# @tag: 论文
# @desc: 按样本内归一化：Transformer 前后层的稳定器。
# @page: https://arxiv.org/abs/1607.06450
# @pdf64: aHR0cHM6Ly9hcnhpdi5vcmcvcGRmLzE2MDcuMDY0NTA=
```

```paper
# @title: RoFormer: Rotary Position Embedding（RoPE）
# @authors: Jianlin Su 等
# @year: 2021
# @venue: arXiv:2104.09864
# @tag: 论文
# @desc: 用旋转矩阵编码位置：点积只依赖相对距离，现代大模型的默认位置编码。
# @page: https://arxiv.org/abs/2104.09864
# @pdf64: aHR0cHM6Ly9hcnhpdi5vcmcvcGRmLzIxMDQuMDk4NjQ=
```

```paper
# @title: An Image is Worth 16x16 Words（ViT）
# @authors: Dosovitskiy 等（Google）
# @year: 2020
# @venue: arXiv:2010.11929 (ICLR 2021)
# @tag: 论文
# @desc: 把图片切块当词喂给 Transformer：注意力统一视觉与语言。
# @page: https://arxiv.org/abs/2010.11929
# @pdf64: aHR0cHM6Ly9hcnhpdi5vcmcvcGRmLzIwMTAuMTE5Mjk=
```

```paper
# @title: Outrageously Large Neural Networks: The Sparsely-Gated Mixture-of-Experts Layer
# @authors: Noam Shazeer, Azalia Mirhoseini, Krzysztof Maziarz, Andy Davis, Quoc Le, Geoffrey Hinton, Jeff Dean
# @year: 2017
# @venue: arXiv:1701.06538 (ICLR 2017)
# @tag: 论文
# @desc: 稀疏门控 MoE 的出生证明：1370 亿参数的 LSTM 版混合专家，含噪声 TopK 门控与负载均衡损失。
# @page: https://arxiv.org/abs/1701.06538
# @pdf64: aHR0cHM6Ly9hcnhpdi5vcmcvcGRmLzE3MDEuMDY1Mzg=
```

```paper
# @title: GShard: Scaling Giant Models with Conditional Computation and Automatic Sharding
# @authors: Dmitry Lepikhin, HyoukJoong Lee, Yuanzhong Xu, Dehao Chen, Orhan Firat, Yanping Huang, Maxim Krikun, Noam Shazeer, Zhifeng Chen
# @year: 2020
# @venue: arXiv:2006.16668 (ICLR 2021)
# @tag: 论文
# @desc: 把 MoE 搬进 Transformer 并引入容量因子与专家并行：超额 token 走残差，超额不白扔。
# @page: https://arxiv.org/abs/2006.16668
# @pdf64: aHR0cHM6Ly9hcnhpdi5vcmcvcGRmLzIwMDYuMTY2Njg=
```

```paper
# @title: Switch Transformers: Scaling to Trillion Parameter Models with Simple and Efficient Sparsity
# @authors: William Fedus, Barret Zoph, Noam Shazeer
# @year: 2021
# @venue: arXiv:2101.03961 (JMLR 2022)
# @tag: 论文
# @desc: k = 1 就够用：路由减到只剩一位专家，训练更快、通信更省，MoE 从此定型。
# @page: https://arxiv.org/abs/2101.03961
# @pdf64: aHR0cHM6Ly9hcnhpdi5vcmcvcGRmLzIxMDEuMDM5NjE=
```

```paper
# @title: DeepSeekMoE: Towards Ultimate Expert Specialization in Mixture-of-Experts Language Models
# @authors: Damai Dai, Chengqi Deng, Chenggang Zhao, R. X. Xu, Huazuo Gao, Deli Chen, Jiashi Li, Wangding Zeng, Xingkai Yu, Y. Wu, Zhenda Xie, Y. K. Li, Panpan Huang, Fuli Luo, Chong Ruan, Zhifang Sui, Wenfeng Liang
# @year: 2024
# @venue: arXiv:2401.06066
# @tag: 论文
# @desc: 细粒度专家切分 + 共享专家隔离：让「专」与「通」各就各位，DeepSeek 系列的 MoE 家底。
# @page: https://arxiv.org/abs/2401.06066
# @pdf64: aHR0cHM6Ly9hcnhpdi5vcmcvcGRmLzI0MDEuMDYwNjY=
```

```paper
# @title: DeepSeek-V3 Technical Report
# @authors: DeepSeek-AI（Aixin Liu, Bei Feng, ... 等）
# @year: 2024
# @venue: arXiv:2412.19437
# @tag: 论文
# @desc: 6710 亿总参数、每 token 激活 370 亿：MLA、无辅助损失均衡、FP8 训练与 MTP 的完整账本。
# @page: https://arxiv.org/abs/2412.19437
# @pdf64: aHR0cHM6Ly9hcnhpdi5vcmcvcGRmLzI0MTIuMTk0Mzc=
```
