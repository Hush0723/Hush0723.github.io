---
document_title: Lecture 2 基本概率不等式
node: root/science/computer-science/artificial-intelligence/machine-learning/机器学习
updated: '2026-09-17T06:03:39.403Z'
---
## 1 分布限制不等式 
马尔科夫不等式Markov Ineq.
	非负随机变量$x$存在期望，则对任意$k>0$，有$P(x\ge k)\le E(x)/k$
切比雪夫不等式Chebyshev Ineq.
	随机变量$x$存在期望和方差，则对任意$k>0$，有$P(|x-E(x)|\ge k)\le V(x)/k^2$
t阶矩不等式
	非负随机变量$x$存在一阶、二阶、三阶矩，则对任意$k>0$，有$P(x\ge k)\le E(x)^t/k^t$
矩不等式
	生成函数$G(t)=1+tE(x)+t^2/2 E(x)^2+...=E(e^{tx})$
	