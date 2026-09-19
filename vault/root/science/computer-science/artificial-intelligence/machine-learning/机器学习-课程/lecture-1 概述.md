---
document_title: Lecture 1 概述
node: root/science/computer-science/artificial-intelligence/machine-learning/机器学习
updated: 2026-09-17T06:02:12.737Z
---

机器学习 Machine Learning：机器从经验和数据中学习规律，相对的是基于规则的Rule-based的技术路线。
## 1 机器学习领域
监督式学习 Supervised Learning：训练数据有标签的机器学习，即认为提供的数据目标值，如预测下一单词中的参考答案
非监督式学习 Unsupervised Learning：没有参考目标值的机器学习
强化学习 Reinforcement Learning/Online Learning

## 2 监督式学习建模

### 2.1 基本假设
监督式学习的任务建模：给定一个$x$，求$y$。
	例如分类问题，给定实例instance $x$，求标签label $y$
监督式学习的目标是一个映射$f: x\rightarrow y$
监督式学习认为，世界中的数据生成满足一个独立同分布假设：
$$(x,y)\sim \text{i.i.d.}\, P_{X,Y}$$
### 2.2 流程
首先从世界中获取数据：$(x_i, y_i)$
然后在获取的数据上训练出一个映射$\hat{f}$
推理：用$\hat{f}$在测试集数据$x_{i+1}$上推理出$\hat{y_{i+1}}$

### 2.3 评判
用概率$P(Y\ne \hat{f}(X))$评判（错误率Error Rate），记已知概率分布$P_{X,Y}$的情况下错误率最小的映射为$f^*$，那么$f^*(x)=argmax_y(P(y|x))$：贝叶斯分类器

## 3 机器学习核心

课程围绕表示Representation、优化Optimization、泛化Generalization三个核心展开
表示：什么函数类表示机器？如DeepNN、线性函数、决策树等
优化：训练使得Training Error最小，Training Error=$\frac1n\sum I(y_i\ne\hat{f}(x_i))$，其中函数$I$为是否满足条件，是为1，否为0，并用$P_S$表示
泛化：让训练集错误率小的机器和在真实数据集上的gap尽量小，或体现出了稳定性

## 0 参考资料
线上课程：机器学习：cs231n、cs229、cs224；强化学习：cs285


