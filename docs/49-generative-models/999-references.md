---
title: 生成模型 · 参考资料
description: 第 49 章涉及的核心论文、原著与延伸阅读一览。
volume: 5
layer: L11
track:
  - information-learning
stage: research-elective
difficulty: 5
---

# 生成模型 · 参考资料

本章涉及的核心论文、原著与延伸阅读，按课程推进顺序整理。

文献页面对所有人开放；带归档副本的条目，未登录点「原站下载」前往出处，登录后点「本地下载」直接取本站副本。

```paper
# @title: Auto-Encoding Variational Bayes（VAE）
# @authors: Diederik Kingma, Max Welling
# @year: 2013
# @venue: arXiv:1312.6114 (ICLR 2014)
# @tag: 论文
# @desc: 重参数化技巧让「采样」可以求梯度：变分生成模型的起点。
# @page: https://arxiv.org/abs/1312.6114
# @pdf64: aHR0cHM6Ly9hcnhpdi5vcmcvcGRmLzEzMTIuNjExNA==
```

```paper
# @title: Generative Adversarial Networks（GAN）
# @authors: Ian Goodfellow 等
# @year: 2014
# @venue: arXiv:1406.2661 (NeurIPS 2014)
# @tag: 论文
# @desc: 生成器与判别器的极简博弈：以假乱真从对抗中长出。
# @page: https://arxiv.org/abs/1406.2661
# @pdf64: aHR0cHM6Ly9hcnhpdi5vcmcvcGRmLzE0MDYuMjY2MQ==
```

```paper
# @title: Wasserstein GAN
# @authors: Martin Arjovsky, Soumith Chintala, Léon Bottou
# @year: 2017
# @venue: arXiv:1701.07875 (ICML 2017)
# @tag: 论文
# @desc: 用最优传输距离换掉 JS 散度：GAN 训练稳定性的一次理论升级。
# @page: https://arxiv.org/abs/1701.07875
# @pdf64: aHR0cHM6Ly9hcnhpdi5vcmcvcGRmLzE3MDEuMDc4NzU=
```

```paper
# @title: Denoising Diffusion Probabilistic Models（DDPM）
# @authors: Jonathan Ho, Ajay Jain, Pieter Abbeel
# @year: 2020
# @venue: arXiv:2006.11239 (NeurIPS 2020)
# @tag: 论文
# @desc: 「逐步去噪」的生成范式：扩散模型热潮的引爆点。
# @page: https://arxiv.org/abs/2006.11239
# @pdf64: aHR0cHM6Ly9hcnhpdi5vcmcvcGRmLzIwMDYuMTEyMzk=
```

```paper
# @title: Generative Modeling by Estimating Gradients of the Data Distribution
# @authors: Yang Song, Stefano Ermon
# @year: 2019
# @venue: arXiv:1907.05600 (NeurIPS 2019)
# @tag: 论文
# @desc: 学习「对数密度的梯度」做生成：分数模型与扩散模型的汇合点。
# @page: https://arxiv.org/abs/1907.05600
# @pdf64: aHR0cHM6Ly9hcnhpdi5vcmcvcGRmLzE5MDcuMDU2MDA=
```

```paper
# @title: High-Resolution Image Synthesis with Latent Diffusion Models（Stable Diffusion）
# @authors: Rombach 等（LMU/Runway）
# @year: 2022
# @venue: arXiv:2112.10752 (CVPR 2022)
# @tag: 论文
# @desc: 在压缩的潜空间做扩散：文生图从实验室走向全民。
# @page: https://arxiv.org/abs/2112.10752
# @pdf64: aHR0cHM6Ly9hcnhpdi5vcmcvcGRmLzIxMTIuMTA3NTI=
```

```paper
# @title: Leonid Kantorovich 与最优传输
# @authors: Leonid Kantorovich（坎托罗维奇）
# @year: 1942
# @venue: 最优传输理论的起点
# @tag: 论文
# @desc: 「把土堆搬成规划后的形状」的最优方案：Wasserstein 距离的源头。
# @page: https://en.wikipedia.org/wiki/Leonid_Kantorovich
```
