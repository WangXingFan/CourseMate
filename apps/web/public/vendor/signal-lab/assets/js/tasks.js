(function (root) {
  'use strict';
  const Lab = root.SignalLab = root.SignalLab || {};
  Lab.version = '0.1.0';
  Lab.courses = [
    { id: 'L1', number: '01', name: '信号变换与连续系统时域探究', short: '时域 · 从波形到系统', subtitle: '观察信号的变化，在时间轴上理解系统的行为。', chapter: '第一章 / 第二章', available: true, tags: ['信号变换', '系统性质', '响应分解', '图解卷积'], objectives: ['用关键点检查信号的平移、反转与尺度变化。', '用两条计算路径与反例检验系统性质。', '区分初始状态和外部输入对响应的贡献。', '解释翻转、平移、相乘、积分的卷积过程。'] },
    { id: 'L2', number: '02', name: '信号分解、频谱与滤波', short: '频域 · 发现波形的组成', subtitle: '从谐波合成到采样，观察频率成分如何影响波形。', chapter: '第三章', available: false, tags: ['谐波合成', '连续频谱', '低通滤波', '采样重建'], objectives: ['解释奇次谐波与方波逼近的关系。', '测量矩形脉冲的频谱零点与时移相位。', '按有用成分与干扰幅度比选择截止频率。', '比较 100、25、15 Hz 采样并解释混叠。'] },
    { id: 'L3', number: '03', name: '拉普拉斯变换与连续系统响应求解', short: 's 域 · 从推导到预测', subtitle: '连接方程、变换与响应，用理论预测新的输入条件。', chapter: '第五章', available: false, tags: ['变换对应', '零状态响应', '初始条件', '脉冲设计'], objectives: ['写出基本信号及延迟信号的拉氏变换。', '从微分方程得到系统函数并求零状态响应。', '保留初始条件项，解释全响应的来源。', '通过推导与测量设计满足峰值指标的脉冲。'] }
  ];
  const number = (key, label, min, max, step, value, unit = '') => ({ key, label, min, max, step, value, unit, type: 'number' });
  const select = (key, label, value, options) => ({ key, label, value, options, type: 'select' });
  Lab.tasks = {
    'L1-1': { title: '信号变换与窄脉冲', eyebrow: 'SIGNAL TRANSFORMATION', question: '一个表达式中的参数，分别改变波形的什么特征？', goal: '用端点、峰值时刻和幅度检查组合变换；比较三个等面积窄脉冲。', prediction: '预测 p(t−1)、p(−t)、p(2t) 的支撑和峰时，再预测组合变换的关键点。', analysis: '用一个关键点比较 p(2(t−1)) 与 p(2t−1)；解释为什么窄脉冲变窄时高度必须增加。', hints: ['检查对象：起点、峰时和终点都要随参数变化。', '相关性质：把原信号的关键点 q 代入 a(t−t₀)=q。', '局部提示：a 为负数时，映射后的两个端点顺序会交换。'], evidence: '保存平移、反转、压缩、组合变换及 Δ=0.5、0.2、0.1 s 的试验，并解释面积。', params: [select('mode', '观察模式', 'transform', [['transform', '三角脉冲变换'], ['impulse', '等面积窄脉冲']]), number('A', '幅度 A', 0.25, 3, 0.05, 1), number('a', '尺度 a', -4, 4, 0.25, 1), number('shift', '平移 t₀', -3, 3, 0.05, 0, 's'), number('delta', '脉冲宽度 Δ', 0.05, 0.5, 0.05, 0.2, 's')] },
    'L1-2': { title: '线性与时不变性检验', eyebrow: 'SYSTEM PROPERTIES', question: '两条路径的输出相同，就足以判断系统性质吗？', goal: '分别检验三个系统，保留至少一个非线性反例与一个时变反例。', prediction: '预测 2x(t)、x²(t)、t·x(t) 是否线性、是否时不变，并写出理由。', analysis: '写出两个具体反例，解释为什么有限次试验相同不能证明对所有输入成立。', hints: ['检查对象：比较两条完整路径，而非只观察输入形状。', '相关性质：线性比较叠加顺序；时不变比较延迟与系统运算的顺序。', '局部提示：若系统含时间乘子，平移输出时，时间乘子也必须平移。'], evidence: '对三个系统分别保存线性与时移检验，使用文字给出性质判定和反例。', params: [select('kind', '待检验系统', 'gain', [['gain', 'S₁ · y(t)=2x(t)'], ['square', 'S₂ · y(t)=x²(t)'], ['varying', 'S₃ · y(t)=t·x(t)']]), select('test', '检验方式', 'linearity', [['linearity', '线性 · 叠加检验'], ['invariance', '时不变 · 时移检验']]), select('x1', '输入 x₁ / x', 'constant', [['constant', '常数 1'], ['sin', 'sin(t)'], ['cos', 'cos(2t)']]), select('x2', '输入 x₂', 'constant', [['constant', '常数 1'], ['sin', 'sin(t)'], ['cos', 'cos(2t)']]), number('alpha', '叠加系数 α', -2, 2, 0.1, 1), number('beta', '叠加系数 β', -2, 2, 0.1, 1), number('delay', '延迟 d', -2, 2, 0.1, 1, 's')] },
    'L1-3': { title: '初始状态与响应分解', eyebrow: 'RESPONSE DECOMPOSITION', question: '接通一个正输入，输出一定会上升吗？', goal: '分别观察零输入、零状态与全响应，记录初值、长期结果和分解误差。', prediction: '对 y′+y=u(t)、y(0⁻)=2，预测输出起点、变化方向与长期值。', analysis: '解释关闭输入后为什么仍可能有输出；比较初始值 2 与 0.5 时的变化方向。', hints: ['检查对象：分别保留初始状态、外部输入，再同时保留二者。', '相关性质：同一线性系统的全响应可以分解为两种来源。', '局部提示：从 y′=x−y 判断初始变化方向。'], evidence: '记录 t=0、1、3、5 s 的读数，并保存 y₀=2 与 0.5 的试验。', params: [select('enabled', '外部输入', 'on', [['on', '接通 · A·u(t)'], ['off', '关闭 · x(t)=0']]), number('A', '输入幅度 A', 0, 3, 0.1, 1), number('initial', '初始值 y₀', -1, 3, 0.1, 2)] },
    'L1-4': { title: '图解卷积与系统输出', eyebrow: 'GRAPHICAL CONVOLUTION', question: '翻转、平移、相乘与积分，怎样给出系统输出？', goal: '先完成两个矩形的卷积，再比较矩形与指数冲激响应的卷积。', prediction: '预测 r*r 的形状与支撑，再预测矩形输入结束后 r*h 是否立即归零。', analysis: '解释两个矩形卷积顶点的位置，以及矩形输入结束后输出继续衰减的原因。', hints: ['检查对象：t 是输出时刻，τ 是积分变量。', '相关性质：先把第二个信号翻转，再平移到输出时刻 t。', '局部提示：比较 r(τ) 与第二个信号的重叠区间，乘积面积决定输出。'], evidence: '保存至少三个时刻的重叠状态，并比较 r*r 与 r*h 的曲线。', params: [select('kind', '信号组合', 'rr', [['rr', 'r*r · 两个单位矩形'], ['rh', 'r*h · 矩形与指数响应']]), number('time', '输出时刻 t', -1, 5, 0.01, 0.5, 's'), number('speed', '演示速度', 0.25, 2, 0.25, 0.5, '×')] },
    'L2-1': { title: '方波谐波合成' }, 'L2-2': { title: '矩形脉冲及连续频谱' }, 'L2-3': { title: '双频信号低通滤波' }, 'L2-4': { title: '采样与重建' },
    'L3-1': { title: '时域信号与拉氏变换对应' }, 'L3-2': { title: '零状态响应求解' }, 'L3-3': { title: '含初始条件的响应' }, 'L3-4': { title: '脉冲持续时间设计' }
  };
  Lab.defaults = id => Object.fromEntries((Lab.tasks[id].params || []).map(p => [p.key, p.value]));
  Lab.validParams = (id, params) => {
    if (!params || typeof params !== 'object' || Array.isArray(params)) return false;
    return (Lab.tasks[id]?.params || []).every(p => p.type === 'select' ? p.options.some(o => o[0] === params[p.key]) : typeof params[p.key] === 'number' && Number.isFinite(params[p.key]) && params[p.key] >= p.min && params[p.key] <= p.max && !(id === 'L1-1' && p.key === 'a' && Math.abs(params.a) < 0.25));
  };
})(typeof window !== 'undefined' ? window : globalThis);
