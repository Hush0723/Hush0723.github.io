---
document_title: Lecture 2 有限马尔科夫决策过程
node: root/science/computer-science/artificial-intelligence/machine-learning/reinforcement-learning/强化学习-课程
updated: 2026-09-17T10:40:50.215Z
---
## **2.1 描述环境及交互**
智能体 Agent，环境 Environment

由Lecture 1.2定义的马尔科夫决策过程模型，整个交互过程由$S, A, R$的循环构成。\
并记时间步 time stpes: t = 0, 1, 2, ...

根据Lecture 1.2，我们定义状态转移概率$p$为状态转移函数和奖赏函数的联合概率分布，并认为$S,A,R$是有限集，则$p(s',r|s,a)$表示状态$s$执行动作$a$后，到达状态$s'$并获得奖赏$r$的概率。

这个模型要求问题具有**马尔可夫性**，即下一个状态与之前的状态和动作不相关。

## **2.2 目标与奖励 Goals & Rewards**
⽤奖赏的办法来使智能体达成⽬标是强化学习的⼀⼤特点，奖赏是灵活⽽⼴泛适⽤的⽅法。

## **2.3 回报与事件 Returns/Gains & Episodes**
最简单的回报/收益就是此后所有奖励之和：$G_t=\sum_{i=t+1}^T R_i$\
其中$T$为中止时间步 Terminate State

这种会自然结束，可以用简单求和作为回报的问题称为**事件**，这类任务被称为**事件性任务**；相反地，智能体与环境的交互可能永不结束的问题称为**持续性任务**，则需要考虑折扣率$\gamma$，即$G_t=\sum_{k=0}\gamma^k R_{t+k+1}$

## **2.4 策略**
定义$v_\pi(s)$和$q_\pi(s,a)$分别是策略$\pi$的状态价值和动作价值，分别表示到达某状态/某状态下做某动作的回报的期望。可以通过一步贪心。有递推公式：\
$$v_\pi(s)=\sum_a \pi(a|s)\sum_{s',r}p(s',r|s,a)(r+\gamma v_\pi(s'))$$\
这一公式称为**贝尔曼方程**。\
公式可以理解为：先按$\pi$选择一个动作，这个动作带来的回报为即时奖励+到达状态的状态价值。




