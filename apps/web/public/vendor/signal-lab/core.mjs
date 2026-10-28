// Account-scoped numerical engine for the native React workspace.
// No browser globals are mutated; each call owns its caches and experiment records.
export function createVirtualLabEngine(onChange = () => {}) {
const environment = { SignalLab: {} };
// models: preserved numerical / schema implementation.
(function (root) {
  'use strict';
  const Lab = root.SignalLab = root.SignalLab || {};
  const p = t => t >= 0 && t < 1 ? t : t >= 1 && t <= 3 ? (3 - t) / 2 : 0;
  const g = t => t < 0 ? 0 : -Math.expm1(-t);
  const h = t => t < 0 ? 0 : Math.exp(-t);
  const r = t => t >= 0 && t < 1 ? 1 : 0;
  const sample = (fn, lo, hi, count = 700) => Array.from({ length: count + 1 }, (_, i) => {
    const x = lo + (hi - lo) * i / count;
    return [x, fn(x)];
  });
  const maxError = (a, b) => Math.max(...a.map((v, i) => Math.abs(v[1] - b[i][1])));
  // Independent RK4 solution of y' = x - y; evaluate each smooth segment
  // separately so no RK4 stage crosses a known input discontinuity.
  function integrate(input, initial, end = 5, step = 0.001, boundaries = []) {
    let t = 0, y = initial;
    const result = [[0, y]];
    const cuts = [...boundaries.filter(v => v > 0 && v < end), end].sort((a, b) => a - b);
    for (const stop of cuts) {
      const start = t;
      const n = Math.ceil((stop - start) / step);
      const dt = (stop - start) / n;
      // Interior endpoint samples select this segment's one-sided input limit.
      const x = q => input(Math.min(stop - dt * 1e-7, Math.max(start + dt * 1e-7, q)));
      for (let i = 0; i < n; i++) {
        t = start + i * dt;
        const k1 = x(t) - y;
        const k2 = x(t + dt / 2) - (y + dt * k1 / 2);
        const k3 = x(t + dt / 2) - (y + dt * k2 / 2);
        const k4 = x(t + dt) - (y + dt * k3);
        y += dt * (k1 + 2 * k2 + 2 * k3 + k4) / 6;
        result.push([start + (i + 1) * dt, y]);
      }
      t = stop;
    }
    return result;
  }
  function at(data, t) {
    if (t <= data[0][0]) return data[0][1];
    if (t >= data[data.length - 1][0]) return data[data.length - 1][1];
    let lo = 0, hi = data.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (data[m][0] <= t) lo = m; else hi = m; }
    const [x0, y0] = data[lo], [x1, y1] = data[hi];
    return y0 + (y1 - y0) * (t - x0) / (x1 - x0);
  }
  const signal = (kind, t) => kind === 'sin' ? Math.sin(t) : kind === 'cos' ? Math.cos(2 * t) : 1;
  const system = (kind, t, x) => kind === 'square' ? x * x : kind === 'varying' ? t * x : 2 * x;
  function compare(params) {
    const { kind, test, x1, x2, alpha, beta, delay } = params;
    const left = t => test === 'linearity'
      ? system(kind, t, alpha * signal(x1, t) + beta * signal(x2, t))
      : system(kind, t, signal(x1, t - delay));
    const right = t => test === 'linearity'
      ? alpha * system(kind, t, signal(x1, t)) + beta * system(kind, t, signal(x2, t))
      : system(kind, t - delay, signal(x1, t - delay));
    const a = sample(left, -2, 5), b = sample(right, -2, 5);
    return { a, b, difference: a.map(([t, y], i) => [t, y - b[i][1]]), error: maxError(a, b), left, right };
  }
  // Midpoint quadrature on the actual intersection. No endpoint is counted twice.
  function convolve(t, kind, step = 0.001) {
    const lo = Math.max(0, kind === 'rr' ? t - 1 : 0), hi = Math.min(1, t);
    if (hi <= lo) return 0;
    const n = Math.ceil((hi - lo) / step), dt = (hi - lo) / n;
    let sum = 0;
    for (let i = 0; i < n; i++) { const tau = lo + (i + 0.5) * dt; sum += r(tau) * (kind === 'rr' ? r(t - tau) : h(t - tau)); }
    return sum * dt;
  }
  function transform(params) {
    const { A, a, shift } = params;
    if (a === 0) throw new Error('尺度 a 不能为 0。');
    const ends = [shift, shift + 3 / a].sort((x, y) => x - y);
    return { support: ends, peakTime: shift + 1 / a, peak: A, value: t => A * p(a * (t - shift)) };
  }
  const responseCache = new Map();
  function response(A, initial) {
    const key = A + ':' + initial;
    if (!responseCache.has(key)) {
      if (responseCache.size > 40) responseCache.clear();
      const numerical = integrate(() => A, initial);
      const zeroInput = t => initial * Math.exp(-t);
      const zeroState = t => A * g(t);
      responseCache.set(key, {
        numerical, zeroInput, zeroState,
        total: t => A + (initial - A) * Math.exp(-t),
        error: Math.max(...numerical.map(([t, y]) => Math.abs(y - (zeroInput(t) + zeroState(t)))))
      });
    }
    return responseCache.get(key);
  }
  Lab.models = { p, g, h, r, sample, maxError, integrate, at, signal, system, compare, convolve, transform, response };
})(environment);

// models-extra: preserved numerical / schema implementation.
(function (root) {
  'use strict';
  const L=root.SignalLab, M=L.models, TAU=2*Math.PI;
  const sinc=z=>Math.abs(z)<1e-12?1:Math.sin(Math.PI*z)/(Math.PI*z);
  const square=t=>Math.sin(TAU*10*t)>=0?1:-1;
  const harmonic=(k,t)=>4/(Math.PI*k)*Math.sin(TAU*k*10*t);
  const synthesis=(K,t)=>{let value=0;for(let k=1;k<=K;k+=2)value+=harmonic(k,t);return value;};
  const pulseSpectrum=(A,T,center,f)=>{const value=A*T*sinc(f*T);return {magnitude:Math.abs(value),phase:Math.abs(value)<Math.abs(A*T)*1e-7?null:Math.atan2(-value*Math.sin(TAU*f*center),value*Math.cos(TAU*f*center))};};
  function solve(matrix,vector){
    const n=vector.length,a=matrix.map((r,i)=>[...r,vector[i]]);
    for(let col=0;col<n;col++){let pivot=col;for(let r=col+1;r<n;r++)if(Math.abs(a[r][col])>Math.abs(a[pivot][col]))pivot=r;
      [a[col],a[pivot]]=[a[pivot],a[col]];if(Math.abs(a[col][col])<1e-14)throw Error('拟合矩阵奇异');
      const d=a[col][col];for(let j=col;j<=n;j++)a[col][j]/=d;
      for(let r=0;r<n;r++)if(r!==col){const factor=a[r][col];for(let j=col;j<=n;j++)a[r][j]-=factor*a[col][j];}
    }return a.map(r=>r[n]);
  }
  function fitComponents(data,lo=0.1,hi=0.2){
    const normal=Array.from({length:5},()=>Array(5).fill(0)),rhs=Array(5).fill(0);let count=0;
    for(const [t,y]of data){if(t<lo-1e-12||t>=hi-1e-12)continue;const basis=[1,Math.sin(TAU*100*t),Math.cos(TAU*100*t),Math.sin(TAU*1000*t),Math.cos(TAU*1000*t)];
      for(let i=0;i<5;i++){rhs[i]+=basis[i]*y;for(let j=0;j<5;j++)normal[i][j]+=basis[i]*basis[j];}count++;
    }
    const c=solve(normal,rhs);
    return {count,offset:c[0],components:[100,1000].map((frequency,i)=>({frequency,amplitude:Math.hypot(c[1+2*i],c[2+2*i]),ratio:Math.hypot(c[1+2*i],c[2+2*i])/(i?0.3:1),phase:Math.atan2(c[2+2*i],c[1+2*i])*180/Math.PI}))};
  }
  const filterCache=new Map();
  function filter(fc,step=0.00001){
    const key=fc+':'+step;if(filterCache.has(key))return filterCache.get(key);
    const rate=TAU*fc,input=t=>Math.sin(TAU*100*t)+0.3*Math.sin(TAU*1000*t);
    const n=Math.ceil(0.2/step),dt=0.2/n;let y=0;const numerical=[[0,0]];
    for(let i=0;i<n;i++){const t=i*dt;
      const k1=rate*(input(t)-y),k2=rate*(input(t+dt/2)-(y+dt*k1/2)),k3=rate*(input(t+dt/2)-(y+dt*k2/2)),k4=rate*(input(t+dt)-(y+dt*k3));
      y+=dt*(k1+2*k2+2*k3+k4)/6;numerical.push([(i+1)*dt,y]);
    }
    const fit=fitComponents(numerical),theory=[100,1000].map((frequency,i)=>({frequency,ratio:1/Math.hypot(1,frequency/fc),phase:-Math.atan(frequency/fc)*180/Math.PI,inputAmplitude:i?0.3:1}));
    const result={input,numerical,fit,theory,dt,passed:fit.components[0].ratio>=0.85&&fit.components[1].ratio<=0.25&&theory[0].ratio>=0.85&&theory[1].ratio<=0.25};
    if(filterCache.size>25)filterCache.clear();filterCache.set(key,result);return result;
  }
  const reconstructionCache=new Map();
  function reconstruction(fs){
    if(reconstructionCache.has(fs))return reconstructionCache.get(fs);
    const first=-400,last=Math.ceil(0.4*fs)+400;const extended=[];
    for(let n=first;n<=last;n++)extended.push([n,Math.cos(TAU*10*n/fs)]);
    const interpolate=t=>{let sum=0;for(const[n,value]of extended)sum+=value*sinc(fs*t-n);return sum;};
    const points=M.sample(interpolate,0,0.4,800),samples=extended.filter(([n])=>n>=0&&n/fs<=0.4+1e-12).map(([n,y])=>[n/fs,y]);
    const result={points,samples,first,last,maxError:Math.max(...points.map(([t,y])=>Math.abs(y-Math.cos(TAU*10*t))))};
    reconstructionCache.set(fs,result);return result;
  }
  function pulseResponse(T,step=0.001){
    const end=Math.max(5,T+3);const numerical=M.integrate(t=>t<T?1:0,0,end,step,[T]);
    let peak=-Infinity,peakTime=0;for(const[t,y]of numerical)if(y>peak){peak=y;peakTime=t;}
    const theoreticalPeak=-Math.expm1(-T);
    return{numerical,end,peak,peakTime,theoreticalPeak,passed:T>=Math.log(5)&&peak>=0.8-64*Number.EPSILON*Math.max(1,Math.abs(peak)),error:Math.max(...numerical.map(([t,y])=>Math.abs(y-(M.g(t)-M.g(t-T)))))};
  }
  Object.assign(M,{sinc,square,harmonic,synthesis,pulseSpectrum,fitComponents,filter,reconstruction,pulseResponse});
})(environment);

// tasks: preserved numerical / schema implementation.
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
})(environment);

// tasks-extra: preserved numerical / schema implementation.
(function (root) {
  'use strict';
  const L = root.SignalLab;
  L.version = '1.0.0';
  L.courses.forEach(c => { c.available = true; });
  const n = (key, label, min, max, step, value, unit = '') => ({ key, label, min, max, step, value, unit, type: 'number' });
  const s = (key, label, value, options) => ({ key, label, value, options, type: 'select' });
  const answer = (key, label, placeholder = '', type = 'number') => ({ key, label, placeholder, type });
  Object.assign(L.tasks, {
    'L2-1': { title: '方波谐波合成', short: '谐波合成', eyebrow: 'FOURIER SERIES', question: '增加谐波之后，方波跳变处的过冲会消失吗？', goal: '比较最大奇次序号 K=1、3、7、15 的波形和单边谐波幅度谱。', prediction: '预测平坦区和跳变区随 K 的变化；区分最大谐波序号与叠加项数。', analysis: '解释吉布斯现象，以及“过冲高度”和“过冲影响区域”如何变化。', evidence: '保存四组 K，写出各组项数与最高频率，并保留合成图与过冲解释。', hints: ['检查对象：只叠加不大于 K 的正奇次谐波。', '相关性质：高次谐波更快振荡，系数按 1/k 衰减。', '局部提示：分别测量跳变附近的最大值和偏离区域宽度。'], params: [s('K', '最大奇次谐波序号 K', '1', [['1','K=1 · 1 项'],['3','K=3 · 2 项'],['7','K=7 · 4 项'],['15','K=15 · 8 项']]), s('showComponents', '各谐波显示', 'on', [['on','显示各次谐波'],['off','仅显示合成与目标']])] },
    'L2-2': { title: '矩形脉冲及连续频谱', short: '连续频谱', eyebrow: 'CONTINUOUS SPECTRUM', question: '脉冲变窄和脉冲平移，会怎样改变频谱？', goal: '比较宽度、幅度和中心位置，测量第一正零点、零频值与相位。', prediction: '保持幅度不变，预测 T=0.5、1、2 s 的频谱；再预测中心从 0 移到 1 s 的变化。', analysis: '解释时宽与频谱宽度的关系；用非零频谱处的相位读数说明时移性质。', evidence: '保存三组宽度、一次时移和一次幅度比较，记录第一零点与 X(0)。', hints: ['检查对象：分开观察幅度谱、相位谱与零频值。', '相关性质：零频值是信号面积，时移对应复指数相位因子。', '局部提示：归一化 sinc 的非零整数点为零，零点附近相位不适用。'], params: [n('A','脉冲幅度 A',0.25,3,0.05,1),n('T','脉冲宽度 T',0.25,2.5,0.05,1,'s'),n('center','中心 t₀',-2,2,0.05,0,'s')] },
    'L2-3': { title: '双频信号低通滤波', short: '低通滤波', eyebrow: 'FREQUENCY RESPONSE', question: '怎样抑制干扰，同时保留有用成分？', goal: '用稳态测量选择 fc，使 R(100)≥0.85 且 R(1000)≤0.25。', prediction: '预测 fc=100、200、500 Hz 对两个成分的幅度和相位有什么影响。', analysis: '用各成分的幅度比和相移说明方案；解释为什么输出更平滑不等于满足指标。', evidence: '保存三组候选和最终方案，记录两个频率的理论预测、拟合测量与相移。', hints: ['检查对象：幅度比分母分别是输入的 1 与 0.3。', '相关性质：降低截止频率会同时衰减有用成分和干扰。', '局部提示：从各成分的正弦、余弦拟合读数判断，而非混合信号总峰值。'], params: [n('fc','截止频率 fc',50,1000,1,200,'Hz'),s('components','分量显示','both',[['both','输入、输出与稳态分量'],['combined','仅输入与输出']])] },
    'L2-4': { title: '采样与重建', short: '采样重建', eyebrow: 'SAMPLING & ALIASING', question: '同一组采样点，会对应不止一个连续信号吗？', goal: '比较 100、25、15 Hz 采样，区分带限插值重建与低频候选信号。', prediction: '对 10 Hz 余弦使用三种采样率，预测哪组能够重建原始频率。', analysis: '解释 15 Hz 采样的频率歧义，说明重建条件和有限样本边缘误差。', evidence: '保存三组采样率，在 15 Hz 时寻找与所有样本吻合的低频候选并说明依据。', hints: ['检查对象：比较全部采样点，而非只看一两个交点。', '相关性质：采样只保留离散时刻信息；可靠重建需要带宽条件。', '局部提示：对整数 n 比较两个余弦的离散相位，允许整周与符号变化。'], params: [s('fs','采样率 fs','100',[['100','100 Hz'],['25','25 Hz'],['15','15 Hz']]),n('candidate','候选余弦频率',0,30,0.5,5,'Hz')] },
    'L3-1': { title: '时域信号与拉氏变换对应', short: '变换对应', eyebrow: 'LAPLACE TRANSFORM PAIRS', question: '怎样在 s 域表达一个延迟开始、有限持续的信号？', goal: '通过受限模板填入系数、时移和分母常数，建立四种变换对应。', prediction: '预测指数衰减率、阶跃延迟和脉冲结束时刻分别出现在变换的哪个位置。', analysis: '说明延迟矩形的开始时刻、结束时刻和持续时间如何体现在表达式中。', evidence: '保存四种信号的模板填空与核验；独立完成延迟矩形并写出推导。', hints: ['检查对象：区分幅度、衰减率、开始时刻与结束时刻。', '相关性质：先确定基本变换，再应用时移或线性叠加。', '局部提示：有限脉冲可写成两个不同开始时刻的阶跃之差。'], params: [s('mode','信号模型','exp',[['exp','A·e^(−at)u(t)'],['step','A·u(t−T)'],['pulse','A[u(t)−u(t−T)]'],['delayed','A[u(t−t₁)−u(t−t₂)]']]),n('A','幅度 A',0.25,3,0.05,1),n('a','衰减率 a',0.25,4,0.05,1,'s⁻¹'),n('T','延迟 / 持续时间 T',0.1,4,0.05,1,'s'),n('start','矩形开始 t₁',0,3,0.05,1,'s')], answers: [answer('coefficient','分子幅度系数 c','填写 c'),answer('denShift','分母 s+b 中的 b','指数型填写；其他模型填 0'),answer('delay1','第一时移 d₁','e^(−d₁s) 的延迟 / s'),answer('delay2','第二时移 d₂','两阶跃之差时填写 / s')] },
    'L3-2': { title: '零状态响应求解', short: '零状态响应', eyebrow: 'ZERO-STATE RESPONSE', question: '怎样从 y′+y=u(t) 得到可测量的响应预测？', goal: '填写 H、X 与部分分式系数，比较学生解析曲线和独立 RK4 响应。', prediction: '先预测 y(1) 和达到最终值 90% 所需时间，再推导变换关系。', analysis: '写出从微分方程到 H(s)、Y(s)、部分分式和逆变换的过程，并解释差异。', evidence: '保存完整模板和推导，测量 y(1) 与 t90，保留学生解析曲线和独立数值曲线。', hints: ['检查对象：系统函数在零初始状态定义，阶跃输入的变换单独填写。', '相关性质：Y=HX，部分分式的分子系数可通过通分比较。', '局部提示：用初始值与长期值分别检查两个部分分式系数。'], params: [n('measureTime','测量时刻',0,5,0.01,1,'s')], answers: [answer('hShift','H(s)=1/(s+aH) 中 aH','分母常数'),answer('xGain','X(s)=bX/s 中 bX','分子系数'),answer('C','Y(s)=C/s+D/(s+1) 中 C','常数部分系数'),answer('D','Y(s)=C/s+D/(s+1) 中 D','指数部分系数')] },
    'L3-3': { title: '含初始条件的响应', short: '初始条件', eyebrow: 'INITIAL CONDITIONS', question: '非零初始状态下，全响应为什么不能只写成 Y=HX？', goal: '保留 sY−y₀ 项，比较 y₀=0、0.5、2 的响应并填写全响应分解。', prediction: '预测三种初始值下的起点、变化方向和长期值。', analysis: '从微分变换中的初始项说明零输入响应的来源，并解释三条曲线最终趋于同一值。', evidence: '保存三组初始值、初始项与部分分式填写，记录全响应与两种分量。', hints: ['检查对象：变换 y′ 时保留 y(0⁻)。', '相关性质：初始条件项在方程移项后应单独出现，不能并入零状态系统函数。', '局部提示：用 y(0⁺)=y₀ 和 t→∞ 的结果检查学生解析式。'], params: [s('initial','初始值 y₀','0',[['0','y₀=0'],['0.5','y₀=0.5'],['2','y₀=2']]),n('measureTime','测量时刻',0,5,0.01,1,'s')], answers: [answer('initialTerm','(s+1)Y=X+b₀ 中 b₀','移项后的初始项'),answer('C','y(t)=C+D·e^(−t) 中 C','常数项'),answer('D','y(t)=C+D·e^(−t) 中 D','指数项系数')] },
    'L3-4': { title: '脉冲持续时间设计', short: '脉冲设计', eyebrow: 'PULSE DURATION DESIGN', question: '怎样用尽可能短的脉冲，让输出峰值至少达到 0.8？', goal: '先比较候选脉宽，再推导并细调参数，用理论条件和独立数值结果核验。', prediction: '预测 T=0.5、1、2、3 s 的峰值及出现时刻，说明你的最短脉宽初步方案。', analysis: '写出 Y(s)、时移逆变换、峰值条件与最短脉宽依据，解释临界参数是否满足指标。', evidence: '保存四组候选与最终方案，提供推导或逐步逼近记录；达标不能只凭四舍五入后的读数。', hints: ['检查对象：输入结束前后，输出变化方向是否改变？', '相关性质：矩形输入是两个阶跃之差，可使用时移后的阶跃响应。', '局部提示：在预测峰值时刻代入解析响应，再把峰值条件转化为对 T 的不等式。'], params: [n('T','单位脉冲宽度 T',0.1,4,0.01,1,'s')] }
  });
  const names = ['信号变换','系统性质','响应分解','图解卷积'];
  names.forEach((name,i) => { L.tasks['L1-'+(i+1)].short=name; });
  L.taskIds = Object.keys(L.tasks);
  L.courseIds = id => L.taskIds.filter(t => t.startsWith(id+'-'));
  L.defaultAnswers = id => Object.fromEntries((L.tasks[id].answers || []).map(a => [a.key, '']));
  L.validAnswers = (id, values) => !!values && typeof values === 'object' && !Array.isArray(values) && Object.keys(values).length === (L.tasks[id].answers || []).length && (L.tasks[id].answers || []).every(a => typeof values[a.key] === 'string' && values[a.key].length <= 100 && (values[a.key].trim() === '' || Number.isFinite(Number(values[a.key])) && Math.abs(Number(values[a.key])) <= 100));
  L.answerNumber = (a,key) => a && typeof a[key] === 'string' && a[key].trim() !== '' && Number.isFinite(Number(a[key])) ? Number(a[key]) : null;
  const valid = L.validParams;
  L.validParams = (id,p) => !!L.tasks[id] && valid(id,p);
  L.requiredMeasurements = (id,p) => ({
    'L1-1': p.mode === 'transform' ? ['supportStart','supportEnd','peakTime','peak'] : ['width','height','analyticArea','numericalArea'],
    'L1-2':['maxDifference','comparison','window'], 'L1-3':['initial','limit','decompositionError','atTimes'], 'L1-4':['time','overlap','integral','reference','error'],
    'L2-1':['K','termCount','highestFrequency','amplitudes','maximum'], 'L2-2':['firstZero','zeroFrequency','phaseAtQuarter'],
    'L2-3':['cutoff','fitWindow','components','passed'], 'L2-4':['sampleRate','candidate','sampleDifference','reconstructionError'],
    'L3-1':['model','support','answerStatus'], 'L3-2':['yAtTime','t90','answerStatus'], 'L3-3':['initial','initialValue','decompositionError','answerStatus'], 'L3-4':['width','peak','peakTime','theoreticalPeak','passed']
  })[id];
})(environment);
/* teaching steps start */
environment.SignalLab.guides = {"L1-1": {"steps": ["先写平移、反转、压缩对关键点的预测，点击保存初始预测。", "在参数控制依次点平移、反转、压缩、组合；每次用图上游标读峰时和峰值，点击保存本次试验。", "依次点 Δ=0.5、Δ=0.2、Δ=0.1；每组保存宽度、高度和面积。", "在推导区写关键点映射，在分析区比较预测与测量，说明窄脉冲哪些量变、哪些量不变。"], "evidence": "至少保存四种变换和三组窄脉冲；写明关键点、峰时、峰值、宽度、高度、面积及单位。"}, "L1-2": {"steps": ["保存对三个系统 2x、x²、t·x 的线性与时不变性预测。", "选线性检验，令两个输入都为常数 1，α=β=1；依次切换三个系统，保存两条比较曲线及最大差。", "切换时不变检验，输入常数 1、延迟 d=1；依次保存三个系统。", "再用正弦或余弦输入复核；把每个系统的判定和支持判定的代数关系或反例写在分析区。"], "evidence": "三个系统的两类判定、参数与比较差异；否定结论要有反例，肯定结论补代数依据。"}, "L1-3": {"steps": ["先预测三种情况下的曲线起点和长期值。", "设初值 y₀=2、输入关闭，保存零输入情况；改为 y₀=0、输入开启，保存零状态情况。", "设 y₀=2、输入开启，读 t=0、1、3、5 s 处的全响应和分量，保存本次试验。", "改为 y₀=0.5 再比较；在分析区核对每个时刻的分量之和与全响应。"], "evidence": "三种响应的参数记录、四个时刻的分量对照，补一组 y₀=0.5，解释初值与输入各自贡献。"}, "L1-4": {"steps": ["先预测两个单位矩形的卷积形状与非零范围。", "选矩形与矩形，依次用快速设置 t=−0.5、0.5、1、1.5、2.5；查看翻转平移图、乘积和积分。", "至少保存三种关键重叠情况，分析中补齐五个时刻的读数。", "切换矩形与系统冲激响应，读取 t=0.5、1、1.5、2 s 并保存比较，说明积分变量 τ 与观察时刻 t 的区别。"], "evidence": "矩形卷积五时刻读数、至少三种重叠记录；系统输出四时刻数据和 τ、t 的解释。"}, "L2-1": {"steps": ["保存对平坦区、跳变附近和过冲的预测。", "依次选择 K=1、3、7、15，每次观察合成波与单边幅度谱，保存本次试验。", "逐组记录叠加项数、最高频率和跳变附近最大值；需要时关闭各谐波显示以看清合成波。", "分析哪些位置更接近方波，以及过冲高度和影响区域是否同步消失。"], "evidence": "四组 K 的记录、项数与最高频率对照、合成图及过冲解释。"}, "L2-2": {"steps": ["设 A=1、中心 t₀=0，保存三种宽度下的频谱预测。", "依次设 T=0.5、1、2 s，每组保存 X(0) 与第一正零点。", "恢复 T=1，比较中心 0 与 1 s，在 f=0.25 Hz 处读相位并保存。", "保持宽度和中心不变，将 A 从 1 改为 2，保存对照并解释幅度变化。"], "evidence": "三宽度、一时移和一幅度比较；记录零频值、首零点、非零频谱处相位及单位。"}, "L2-3": {"steps": ["先预测截止频率 fc=100、200、500 Hz 的保留与抑制效果。", "逐个设定三种 fc，查看稳态拟合读数并保存；拟合窗口是 0.1–0.2 s。", "分别用 100 Hz 输出幅度除以 1、1000 Hz 输出幅度除以 0.3，核对两个幅度比。", "按有用分量比≥0.85 且干扰分量比≤0.25 选择最终方案，保存并用数据解释。"], "evidence": "三组候选和最终方案；两个频率的理论值、拟合幅度比、相移与逐项达标判断。"}, "L2-4": {"steps": ["原信号固定为 10 Hz 余弦，保存对三种采样率的预测。", "依次选择 fs=100、25、15 Hz，比较原信号、样本与 sinc 插值，每组保存。", "在 fs=15 Hz 下改变候选余弦频率，寻找与全部采样点吻合的低频候选并保存。", "在分析区计算 n=0、1、2、3 的样本，说明频率歧义，并区分混叠与有限样本边缘误差。"], "evidence": "三采样率与等样本候选记录、四个样本值和重建条件说明。"}, "L3-1": {"steps": ["先预测幅度、衰减率和时移分别进入变换式的哪个位置。", "选指数型，A=1，依次设 a=0.5、1、2，填受限答案模板并逐组保存。", "分别选阶跃和矩形，比较延迟或持续时间，填模板并保存。", "独立题：选延迟矩形，设 A=3、开始 t₁=1 s、持续 T=2 s；先在推导区写两个阶跃，再填模板、看反馈并保存。"], "evidence": "四种模型及三种衰减率的模板记录；独立题写出开始、结束、持续时间和完整变换。"}, "L3-2": {"steps": ["先预测 y(1) 与达到最终值 90% 的时间并保存。", "从零初值方程 y′+y=u(t) 写出 H(s)、X(s)、Y(s)，再做部分分式。", "在右侧填写 aH、bX、C、D，观察学生解析曲线与独立 RK4 曲线。", "将测量时刻设为 0、1 和接近 t90 的时刻，逐组保存；在推导区保留逆变换过程，在分析区解释核验结果。"], "evidence": "H、X、Y、部分分式、模板与推导；y(0)、y(1)、t90 的读数和曲线比较。"}, "L3-3": {"steps": ["先预测 y₀=0、0.5、2 的起点、方向和长期值。", "分别选三种初值，在推导中保留 sY−y₀，再求 Y 与时域响应。", "每次更新模板的初始项、C、D，不能只换曲线不改答案；读取起点和 t=1 s，逐组保存。", "比较零输入、零状态和全响应，解释为什么最终值相同而过渡过程不同。"], "evidence": "三初值的推导、对应模板、分量和读数；写明起点、变化方向与长期值。"}, "L3-4": {"steps": ["保存对 T=0.5、1、2、3 s 峰值和峰时的预测。", "依次设四种 T，每组保存峰值、峰时和达标状态。", "由两个阶跃之差推导响应及峰值条件，在临界区至少再试两组更细的 T，保存失败与成功记录。", "选最短达标方案并保存，在分析区说明参数步长、理论下界，以及为何相邻更短方案不达标。"], "evidence": "四候选、至少两次细调及最终方案；Y(s)、时移响应、峰值不等式与最短性依据。"}};
/* teaching steps end */

// plotting: preserved numerical / schema implementation.
(function (root) {
  'use strict';
  const Lab = root.SignalLab;
  const colors = ['#cf5b36', '#347565', '#4e657c', '#8b6b46'];
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const format = (value, digits = 4) => !Number.isFinite(value) ? '不适用' : Math.abs(value) < 1e-10 ? '0' : Number(value.toFixed(digits)).toString();
  let serial = 0;
  function svg(spec, taskId, cursor, forExport = false) {
    const width = 900, height = 290, left = 62, right = 23, top = 46, bottom = 60;
    const w = width - left - right, h = height - top - bottom;
    const values = spec.series.flatMap(s => s.points.map(p => p[1]));
    let ymin = Math.min(0, ...values), ymax = Math.max(0, ...values);
    const pad = Math.max((ymax - ymin) * 0.13, 0.15);
    ymin -= pad; ymax += pad;
    const [xmin, xmax] = spec.range;
    const x = t => left + (t - xmin) / (xmax - xmin) * w;
    const y = v => top + (ymax - v) / (ymax - ymin) * h;
    const clip = 'plot-' + (++serial);
    let content = `<svg xmlns="http://www.w3.org/2000/svg" class="signal-plot" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(taskId + ' ' + spec.title)}" ${forExport ? '' : 'tabindex="0" data-chart="' + escape(spec.key) + '"'} data-xmin="${xmin}" data-xmax="${xmax}"><title>${escape(taskId + ' ' + spec.title)}</title><rect width="900" height="290" fill="#fffefa"/><defs><clipPath id="${clip}"><rect x="${left}" y="${top}" width="${w}" height="${h}"/></clipPath></defs><text x="${left}" y="24" fill="#716f65" font-family="sans-serif" font-size="12">${escape(spec.yLabel || '归一化幅度')}</text><text x="${width - right}" y="24" text-anchor="end" fill="#8c8a80" font-family="monospace" font-size="11">${escape(taskId)}</text>`;
    for (let i = 0; i <= 6; i++) {
      const value = xmin + (xmax - xmin) * i / 6, px = x(value);
      content += `<path d="M${px},${top}V${top + h}" stroke="#e7e6de" stroke-dasharray="2 5"/><text x="${px}" y="${top + h + 21}" fill="#77766c" text-anchor="middle" font-family="monospace" font-size="11">${format(value, 2)}</text>`;
    }
    for (let i = 0; i <= 4; i++) {
      const value = ymin + (ymax - ymin) * i / 4, py = y(value);
      content += `<path d="M${left},${py}H${left + w}" stroke="#e7e6de" stroke-dasharray="2 5"/><text x="${left - 10}" y="${py + 4}" fill="#77766c" text-anchor="end" font-family="monospace" font-size="11">${format(value, 2)}</text>`;
    }
    content += `<path d="M${left},${y(0)}H${left + w}" stroke="#bdbcb0"/><text x="${left + w}" y="${height - 10}" fill="#77766c" text-anchor="end" font-family="sans-serif" font-size="11">${escape(spec.xLabel || '时间 t / s')}</text>`;
    spec.series.forEach((s, i) => {
      const points = s.points.map(([px, py]) => `${x(px).toFixed(2)},${y(py).toFixed(2)}`);
      if (s.fill && points.length) content += `<polygon points="${x(s.points[0][0])},${y(0)} ${points.join(' ')} ${x(s.points[s.points.length - 1][0])},${y(0)}" fill="${s.color || colors[i]}" fill-opacity="0.14" clip-path="url(#${clip})"/>`;
      content += `<polyline points="${points.join(' ')}" fill="none" stroke="${s.color || colors[i]}" stroke-width="${s.width || 2.5}" ${s.dash ? 'stroke-dasharray="' + s.dash + '"' : ''} stroke-linejoin="round" clip-path="url(#${clip})"/>`;
      const lx = left + i * (spec.series.length > 3 ? 195 : 240);
      content += `<path d="M${lx},${height - 15}h22" stroke="${s.color || colors[i]}" stroke-width="2.5" ${s.dash ? 'stroke-dasharray="' + s.dash + '"' : ''}/><text x="${lx + 28}" y="${height - 11}" fill="#514f46" font-family="sans-serif" font-size="11">${escape(s.label)}</text>`;
    });
    if (cursor != null && cursor >= xmin && cursor <= xmax) {
      content += `<path d="M${x(cursor)},${top}V${top + h}" stroke="#282d28" stroke-width="1" stroke-dasharray="3 3"/>`;
      spec.series.forEach((s, i) => { const val = Lab.models.at(s.points, cursor); content += `<circle cx="${x(cursor)}" cy="${y(val)}" r="4" stroke="#fffefa" stroke-width="2" fill="${s.color || colors[i]}"/>`; });
      content += `<text x="${Math.min(x(cursor) + 8, width - 130)}" y="${top + 13}" fill="#282d28" font-family="monospace" font-size="11">${format(cursor, 3)} s</text>`;
    }
    return content + '</svg>';
  }
  Lab.escape = escape; Lab.format = format;
  Lab.plot = { svg, colors };
})(environment);

// plotting-extra: preserved numerical / schema implementation.
(function(root){
'use strict';const L=root.SignalLab,e=L.escape,f=L.format,colors=L.plot.colors;let serial=0;
function read(s,t,breakJump){const d=s.points;if(!d.length)return null;if(s.pointsOnly||s.stems){let v=d[0];for(const p of d)if(Math.abs(p[0]-t)<Math.abs(v[0]-t))v=p;return v[1];}if(t<d[0][0]||t>d[d.length-1][0])return null;let a=0,b=d.length-1;while(b-a>1){const m=(a+b)>>1;if(d[m][0]<=t)a=m;else b=m;}if(!Number.isFinite(d[a][1])||!Number.isFinite(d[b][1]))return null;if(t===d[a][0])return d[a][1];if(t===d[b][0])return d[b][1];if(breakJump&&Math.abs(d[b][1]-d[a][1])>breakJump)return null;return d[a][0]===d[b][0]?d[b][1]:d[a][1]+(d[b][1]-d[a][1])*(t-d[a][0])/(d[b][0]-d[a][0]);}
function svg(p,id,cursor,exporting=false){
const rows=Math.ceil(p.series.length/3),height=305+Math.max(0,rows-1)*19,clip='v2-'+(++serial),values=p.series.flatMap(s=>s.points.map(q=>q[1])).filter(Number.isFinite);let low=Math.min(0,...values),high=Math.max(0,...values);const pad=Math.max((high-low)*.13,.15);low-=pad;high+=pad;const x=t=>62+(t-p.range[0])/(p.range[1]-p.range[0])*815,y=v=>46+(high-v)/(high-low)*195;
let out='<svg xmlns="http://www.w3.org/2000/svg" class="signal-plot" viewBox="0 0 900 '+height+'" role="img" aria-label="'+e(id+' '+p.title)+'" '+(exporting?'':'tabindex="0" data-chart="'+e(p.key)+'"')+'><title>'+e(id+' '+p.title)+'</title><rect width="900" height="'+height+'" fill="#fffefa"/><defs><clipPath id="'+clip+'"><rect x="62" y="46" width="815" height="195"/></clipPath></defs><g font-family="Microsoft YaHei,sans-serif"><text x="62" y="24" font-size="12" fill="#716f65">'+e(p.yLabel||'归一化幅度')+'</text><text x="877" y="24" text-anchor="end" font-size="11" fill="#888c7d">'+id+'</text>';
for(let i=0;i<=6;i++){const v=p.range[0]+(p.range[1]-p.range[0])*i/6;out+='<path d="M'+x(v)+' 46V241" stroke="#e7e6de" stroke-dasharray="2 5"/><text x="'+x(v)+'" y="261" font-size="11" fill="#77766c" text-anchor="middle">'+f(v,3)+'</text>';}
for(let i=0;i<=4;i++){const v=low+(high-low)*i/4;out+='<path d="M62 '+y(v)+'H877" stroke="#e7e6de" stroke-dasharray="2 5"/><text x="52" y="'+(y(v)+4)+'" font-size="11" fill="#77766c" text-anchor="end">'+f(v,3)+'</text>';}
out+='<path d="M62 '+y(0)+'H877" stroke="#bdbcb0"/><text x="877" y="280" font-size="11" text-anchor="end" fill="#77766c">'+e(p.xLabel||'时间 t / s')+'</text>';
p.series.forEach((s,i)=>{const color=s.color||colors[i%colors.length],dash=s.dash?' stroke-dasharray="'+s.dash+'"':'';const groups=[];let g=[],last=null;for(const q of s.points){if(!Number.isFinite(q[1])){if(g.length)groups.push(g);g=[];last=null;continue;}if(last&&p.breakJump&&Math.abs(q[1]-last[1])>p.breakJump){if(g.length)groups.push(g);g=[];}g.push(q);last=q;}if(g.length)groups.push(g);
for(const group of groups){const points=group.map(q=>x(q[0]).toFixed(3)+','+y(q[1]).toFixed(3)).join(' ');if(s.fill)out+='<polygon points="'+x(group[0][0])+','+y(0)+' '+points+' '+x(group[group.length-1][0])+','+y(0)+'" fill="'+color+'" fill-opacity=".13" clip-path="url(#'+clip+')"/>';if(!s.pointsOnly)out+='<polyline points="'+points+'" fill="none" stroke="'+color+'" stroke-width="2.3"'+dash+' clip-path="url(#'+clip+')"/>';if(s.pointsOnly||s.stems)for(const q of group){if(s.stems)out+='<path d="M'+x(q[0])+' '+y(0)+'V'+y(q[1])+'" stroke="'+color+'" stroke-width="2"/>';out+='<circle cx="'+x(q[0])+'" cy="'+y(q[1])+'" r="4" fill="#fffefa" stroke="'+color+'" stroke-width="2"/>';}}
const lx=62+(i%3)*265,ly=height-15-(rows-1-Math.floor(i/3))*19;out+='<path d="M'+lx+' '+(ly-4)+'h21" stroke="'+color+'" stroke-width="2"'+dash+'/><text x="'+(lx+27)+'" y="'+ly+'" font-size="11" fill="#514f46">'+e(s.label)+'</text>';});
if(cursor!=null&&cursor>=p.range[0]&&cursor<=p.range[1]){out+='<path d="M'+x(cursor)+' 46V241" stroke="#282d28" stroke-dasharray="3 3"/>';p.series.forEach((s,i)=>{const v=read(s,cursor,p.breakJump);if(Number.isFinite(v))out+='<circle cx="'+x(cursor)+'" cy="'+y(v)+'" r="4" fill="'+(s.color||colors[i%colors.length])+'"/>';});out+='<text x="'+Math.min(x(cursor)+8,760)+'" y="60" font-size="11">'+f(cursor,4)+' '+e(p.xUnit||'s')+'</text>';}
return out+'</g></svg>';}
L.plot.svg=svg;L.plot.read=read;
})(environment);

// experiment1: preserved numerical / schema implementation.
(function (root) {
  'use strict';
  const Lab = root.SignalLab, M = Lab.models, f = Lab.format;
  const series = (label, points, extra = {}) => ({ label, points, ...extra });
  const metric = (label, value, unit = '') => ({ label, value: typeof value === 'number' ? f(value, 6) : value, unit });
  Lab.scene = function (id, params) {
    const plots = [], metrics = [], readings = {};
    let formula = '', note = '';
    if (id === 'L1-1') {
      if (params.mode === 'transform') {
        const t = M.transform(params);
        const lo = Math.min(-0.5, t.support[0] - 0.5), hi = Math.max(3.5, t.support[1] + 0.5);
        const exact = [[lo, 0], [t.support[0], 0], [t.peakTime, t.peak], [t.support[1], 0], [hi, 0]].sort((a, b) => a[0] - b[0]);
        plots.push({ key: 'main', title: '原信号、目标与当前结果', range: [lo, hi], series: [series('当前结果', exact, { fill: true }), series('原信号 p(t)', [[lo, 0], [0, 0], [1, 1], [3, 0], [hi, 0]], { dash: '7 4' }), series('目标波形', [[lo, 0], [1, 0], [1.5, 2], [2.5, 0], [hi, 0]], { dash: '2 5' })] });
        metrics.push(metric('支撑起点', t.support[0], 's'), metric('支撑终点', t.support[1], 's'), metric('峰值时刻', t.peakTime, 's'), metric('峰值幅度', t.peak));
        Object.assign(readings, { supportStart: t.support[0], supportEnd: t.support[1], peakTime: t.peakTime, peak: t.peak });
        formula = `${f(params.A)} · p(${f(params.a)}(t − (${f(params.shift)})))`;
        note = '原信号：0≤t<1 时 p(t)=t；1≤t≤3 时 p(t)=(3−t)/2；其余为 0。图窗自动覆盖完整支撑。';
      } else {
        const d = params.delta;
        plots.push({ key: 'main', title: '面积为 1 的窄脉冲近似', range: [-0.15, 0.8], series: [series('qΔ(t) · 近似脉冲', [[-0.15, 0], [0, 0], [0, 1 / d], [d, 1 / d], [d, 0], [0.8, 0]], { fill: true })] });
        const n = Math.ceil(d / 0.001), dt = d / n;
        let area = 0;
        for (let i = 0; i < n; i++) area += dt / d;
        metrics.push(metric('脉冲宽度 Δ', d, 's'), metric('脉冲高度', 1 / d), metric('解析面积', 1, '幅度·s'), metric('数值面积', area, '幅度·s'));
        Object.assign(readings, { width: d, height: 1 / d, analyticArea: 1, numericalArea: area });
        formula = `qΔ(t) = 1/Δ，0 ≤ t < Δ；其余为 0`;
        note = '有限高度的窄脉冲是 δ(t) 的近似。面积采用区间内中点求积；不对端点重复计数。';
      }
    }
    if (id === 'L1-2') {
      const c = M.compare(params);
      const linear = params.test === 'linearity';
      plots.push({ key: 'main', title: '两条路径的输出对照', range: [-2, 5], series: [series('路径 A', c.a), series('路径 B', c.b, { dash: '7 4' })] });
      plots.push({ key: 'difference', title: '逐点差异 A − B', range: [-2, 5], series: [series('输出差异', c.difference, { fill: true })] });
      metrics.push(metric('最大绝对差', c.error), metric('本组试验', c.error < 1e-9 ? '两路径吻合' : '发现反例'), metric('检验窗口', '−2 → 5', 's'));
      Object.assign(readings, { maxDifference: c.error, comparison: c.error < 1e-9 ? 'equal-for-this-input' : 'counterexample', window: [-2, 5] });
      formula = linear ? 'A: T[αx₁+βx₂]　↔　B: αT[x₁]+βT[x₂]' : 'A: T[x(t−d)]　↔　B: y(t−d)，y=T[x]';
      note = '一个反例可以否定普遍命题；有限次吻合只说明本组输入一致。常数输入在全时域定义，不使用窗口补零。';
    }
    if (id === 'L1-3') {
      const A = params.enabled === 'on' ? params.A : 0;
      const response = M.response(A, params.initial);
      const thin = response.numerical.filter((_, i) => i % 5 === 0);
      plots.push({ key: 'main', title: '零输入、零状态与全响应', range: [0, 5], series: [series('全响应 · RK4', thin, { fill: true }), series('零输入响应', M.sample(response.zeroInput, 0, 5), { dash: '7 4' }), series('零状态响应', M.sample(response.zeroState, 0, 5), { dash: '2 5' })] });
      metrics.push(metric('全响应初值', params.initial), metric('长期结果', A), metric('分解最大误差', response.error < 1e-9 ? response.error.toExponential(2) : response.error), metric('初始变化方向', A > params.initial ? '上升' : A < params.initial ? '下降' : '保持不变'));
      Object.assign(readings, { initial: params.initial, limit: A, decompositionError: response.error, atTimes: [0, 1, 3, 5].map(t => ({ t, zeroInput: response.zeroInput(t), zeroState: response.zeroState(t), total: M.at(response.numerical, t) })) });
      formula = 'y′(t) + y(t) = x(t)；y(0⁻) = ' + f(params.initial);
      note = '全响应由独立 RK4 积分计算（Δt≤0.001 s）；零输入与零状态响应采用解析路径，分解误差在 0–5 s 内逐点比较。5 s 之后仍有响应，曲线接近长期值，不代表已精确到达。';
    }
    if (id === 'L1-4') {
      const { kind, time } = params;
      const second = tau => kind === 'rr' ? M.r(time - tau) : M.h(time - tau);
      const isRect = kind === 'rr';
      const lo = Math.max(0, isRect ? time - 1 : 0), hi = Math.min(1, time);
      const overlap = hi > lo;
      const range = [-2, 5.2];
      const a = [[-2, 0], [0, 0], [0, 1], [1, 1], [1, 0], [5.2, 0]];
      const b = isRect ? [[-2, 0], [time - 1, 0], [time - 1, 1], [time, 1], [time, 0], [5.2, 0]] : M.sample(second, ...range, 1000);
      const product = overlap ? [[lo, 0], [lo, second(lo + 1e-9)], ...M.sample(second, lo + 1e-9, hi - 1e-9, 150), [hi, second(hi - 1e-9)], [hi, 0]] : [[0, 0], [1, 0]];
      plots.push({ key: 'overlap', title: '翻转、平移与乘积阴影', range, xLabel: '积分变量 τ / s', series: [series('r(τ)', a, { dash: '7 4' }), series(isRect ? 'r(t−τ)' : 'h(t−τ)', b, { dash: '2 5' }), series('乘积区域', product, { fill: true, color: '#8b6b46' })] });
      const reference = t => isRect ? t >= 0 && t <= 1 ? t : t > 1 && t <= 2 ? 2 - t : 0 : M.g(t) - M.g(t - 1);
      if (!Lab.convolutionCurves) Lab.convolutionCurves = {};
      if (!Lab.convolutionCurves[kind]) Lab.convolutionCurves[kind] = { numerical: M.sample(t => M.convolve(t, kind), -1, 5, 600), reference: M.sample(reference, -1, 5, 600) };
      const curve = Lab.convolutionCurves[kind];
      plots.push({ key: 'output', title: '卷积输出 · 数值积分与解析对照', range: [-1, 5], series: [series('数值卷积', curve.numerical, { fill: true }), series('解析对照', curve.reference, { dash: '5 5' })], marker: time });
      const value = M.convolve(time, kind);
      metrics.push(metric('输出时刻 t', time, 's'), metric('重叠区间', overlap ? `[${f(lo)}, ${f(hi)}]` : '无重叠', 's'), metric('乘积积分值', value), metric('解析对照差', Math.abs(value - reference(time)) < 1e-9 ? Math.abs(value - reference(time)).toExponential(2) : Math.abs(value - reference(time))));
      Object.assign(readings, { time, overlap: overlap ? [lo, hi] : null, integral: value, reference: reference(time), error: Math.abs(value - reference(time)) });
      formula = 'y(t) = ∫ r(τ) · ' + (isRect ? 'r(t−τ)' : 'h(t−τ)') + ' dτ';
      note = '阴影表示乘积面积。数值积分在真实重叠区间采用中点求积（Δτ≤0.001 s）；完整输出曲线已缓存。指数信号有无限长尾，图窗外未显示的部分不代表零。';
    }
    return { plots, metrics, readings, formula, note };
  };
})(environment);

// experiment2: preserved numerical / schema implementation.
(function(root){
  'use strict';const L=root.SignalLab,M=L.models,f=L.format,prior=L.scene;
  const line=(label,points,extra={})=>({label,points,...extra}),metric=(label,value,unit='')=>({label,value:typeof value==='number'?f(value,6):value,unit});
  L.scene=function(id,p,answers){
    if(!id.startsWith('L2-'))return prior(id,p,answers);
    const plots=[],metrics=[],readings={};let formula='',note='';
    if(id==='L2-1'){
      const K=Number(p.K),odd=Array.from({length:(K+1)/2},(_,i)=>2*i+1),points=M.sample(t=>M.synthesis(K,t),0,0.4,2400);
      const maximum=Math.max(...M.sample(t=>M.synthesis(K,t),0,0.1,10000).map(v=>v[1]));
      plots.push({key:'main',title:'方波目标与谐波合成',range:[0,0.4],series:[line('合成波形',points),line('目标方波',M.sample(M.square,0,0.4,2400),{dash:'7 4'})]});
      plots.push({key:'spectrum',title:'单边正弦谐波幅度谱',range:[0,160],xLabel:'频率 f / Hz',xUnit:'Hz',yLabel:'正弦分量幅度',series:[line('幅度 4/(πk)',odd.map(k=>[10*k,4/(Math.PI*k)]),{stems:true,pointsOnly:true})]});
      if(p.showComponents==='on')plots.push({key:'harmonics',title:'各次正弦谐波',range:[0,0.1],series:odd.map((k,i)=>line('k='+k,M.sample(t=>M.harmonic(k,t),0,0.1,1200),{color:['#cf5b36','#347565','#4e657c','#8b6b46','#84729b','#547e88','#b38b3d','#81924c'][i],dash:i%2?'5 3':null}))});
      metrics.push(metric('最大奇次序号',K),metric('实际叠加项数',odd.length),metric('最高频率',10*K,'Hz'),metric('合成最大值',maximum));
      Object.assign(readings,{K,termCount:odd.length,highestFrequency:10*K,amplitudes:odd.map(k=>({k,frequency:10*k,amplitude:4/(Math.PI*k)})),maximum,overshootRelativeToJump:(maximum-1)/2});
      formula='xK(t)=(4/π) Σ sin(2π·k·10t)/k，k 为不大于 K 的正奇数';note='谱线表示单边正弦分量幅度，不是双边傅里叶系数或冲激强度。过冲按跳变量 2 归一化时，与按上平台 1 归一化的百分比不同。';
    }
    if(id==='L2-2'){
      const {A,T,center}=p,lo=Math.min(-3,center-T/2-0.5),hi=Math.max(3,center+T/2+0.5),freq=8/T;
      const spectrum=M.sample(q=>M.pulseSpectrum(A,T,center,q).magnitude,-freq,freq,1600);
      const phase=M.sample(q=>M.pulseSpectrum(A,T,center,q).phase,-freq,freq,1600);
      plots.push({key:'main',title:'有限矩形脉冲',range:[lo,hi],series:[line('x(t)',[[lo,0],[center-T/2,0],[center-T/2,A],[center+T/2,A],[center+T/2,0],[hi,0]],{fill:true})]});
      plots.push({key:'magnitude',title:'连续幅度谱 |X(f)|',range:[-freq,freq],xLabel:'频率 f / Hz',xUnit:'Hz',yLabel:'|X(f)| / 幅度·s',series:[line('连续幅度谱',spectrum)]});
      plots.push({key:'phase',title:'相位主值 arg X(f) · 零点不定义',range:[-freq,freq],xLabel:'频率 f / Hz',xUnit:'Hz',yLabel:'相位 / rad',breakJump:Math.PI,series:[line('相位主值',phase)]});
      const phaseQuarter=M.pulseSpectrum(A,T,center,0.25).phase;
      metrics.push(metric('第一正零点',1/T,'Hz'),metric('X(0)',A*T,'幅度·s'),metric('主瓣零点间宽度',2/T,'Hz'),metric('f=0.25 Hz 相位',phaseQuarter,'rad'));
      Object.assign(readings,{firstZero:1/T,zeroFrequency:A*T,mainLobeWidth:2/T,phaseAtQuarter:phaseQuarter});
      formula='X(f)=AT·sinc(fT)·e^(−j2πft₀)，sinc(z)=sin(πz)/(πz)';note='sinc(0)=1。频谱零点处相位无定义，图中留空；相位跨 ±π 的折返不连接。时域自动覆盖完整支撑，频域显示至 ±8/T Hz，外侧旁瓣仍存在。';
    }
    if(id==='L2-3'){
      const result=M.filter(p.fc),c=result.fit.components;
      const components=result.theory.map(z=>line(z.frequency+' Hz 理论稳态分量',M.sample(t=>z.inputAmplitude*z.ratio*Math.sin(2*Math.PI*z.frequency*t+z.phase*Math.PI/180),0.1,0.12,1600),{dash:z.frequency===100?'2 5':'7 4'}));
      plots.push({key:'main',title:'稳态输入输出 · 0.1–0.12 s 观察窗口',range:[0.1,0.12],series:[line('输出 · 独立 RK4',result.numerical.filter(([t],i)=>t>=0.1-1e-12&&t<=0.12+1e-12&&i%2===0)),line('双频输入',M.sample(result.input,0.1,0.12,1600),{dash:'7 4'}),...(p.components==='both'?components:[])]});
      plots.push({key:'magnitude',title:'幅频特性 |H(j2πf)|',range:[0,2000],xLabel:'频率 f / Hz',xUnit:'Hz',yLabel:'幅度比',series:[line('理论幅度比',M.sample(q=>1/Math.hypot(1,q/p.fc),0,2000,1000))]});
      plots.push({key:'phase',title:'相频特性 arg H(j2πf)',range:[0,2000],xLabel:'频率 f / Hz',xUnit:'Hz',yLabel:'相移 / °',series:[line('理论相移',M.sample(q=>-Math.atan(q/p.fc)*180/Math.PI,0,2000,1000))]});
      metrics.push(metric('100 Hz 测量幅度比',c[0].ratio),metric('1000 Hz 测量幅度比',c[1].ratio),metric('100 / 1000 Hz 相移',f(c[0].phase,3)+' / '+f(c[1].phase,3),'°'),metric('双项指标',result.passed?'达标':'未达标'));
      Object.assign(readings,{cutoff:p.fc,fitWindow:[0.1,0.2],fitSampleCount:result.fit.count,components:c.map((z,i)=>({...z,theoryRatio:result.theory[i].ratio,theoryPhase:result.theory[i].phase})),passed:result.passed});
      formula='τy′+y=x，τ=1/(2πfc)；H(j2πf)=1/(1+jf/fc)';
      note='输出从零初始状态独立 RK4 积分至 0.2 s，Δt≤10⁻⁵ s。测量使用 [0.1,0.2) s 的正弦/余弦与常数联合最小二乘拟合；图只展示其中 0.02 s。各比值相对各自输入幅度 1 和 0.3；达标同时检查理论与测量。';
    }
    if(id==='L2-4'){
      const fs=Number(p.fs),rec=M.reconstruction(fs),candidate=t=>Math.cos(2*Math.PI*p.candidate*t);
      let difference=0;for(let n=-400;n<=Math.ceil(0.4*fs)+400;n++)difference=Math.max(difference,Math.abs(Math.cos(2*Math.PI*10*n/fs)-candidate(n/fs)));
      plots.push({key:'main',title:'原信号、采样点、带限插值与候选',range:[0,0.4],series:[line('10 Hz 原信号',M.sample(t=>Math.cos(2*Math.PI*10*t),0,0.4,1600),{dash:'7 4'}),line('sinc 带限插值',rec.points),line('候选 '+f(p.candidate)+' Hz',M.sample(candidate,0,0.4,1600),{dash:'2 5'}),line('实际采样点',rec.samples,{pointsOnly:true,color:'#8b6b46'})]});
      metrics.push(metric('采样率',fs,'Hz'),metric('候选频率',p.candidate,'Hz'),metric('全部样本最大差',difference<1e-8?difference.toExponential(2):difference),metric('重建对原信号最大差',rec.maxError));
      Object.assign(readings,{sampleRate:fs,candidate:p.candidate,sampleDifference:difference,reconstructionError:rec.maxError,sampleCount:rec.last-rec.first+1,displayWindow:[0,0.4],aliasing:fs<20});
      formula='xn=cos(2π·10n/fs)；重建 x̂(t)=Σ xn·sinc(fs·t−n)';note='重建使用展示窗口两侧各 400 个额外样本，展示中部 0–0.4 s；有限截断仍有误差。候选余弦是单独的假设曲线，不代替通用 sinc 插值。样本吻合检查覆盖所有用于重建的样本。';
    }
    return{plots,metrics,readings,formula,note};
  };
})(environment);

// experiment3: preserved numerical / schema implementation.
(function(root){
  'use strict';const L=root.SignalLab,M=L.models,f=L.format,prior=L.scene;
  const line=(label,points,extra={})=>({label,points,...extra}),metric=(label,value,unit='')=>({label,value:typeof value==='number'?f(value,6):value,unit});
  function feedback(checks,answers){return checks.map(([key,expected,label])=>{const value=L.answerNumber(answers,key);return{key,label,status:value===null?'missing':Math.abs(value-expected)<1e-8?'correct':'review',message:value===null?'尚未填写':Math.abs(value-expected)<1e-8?'此项与当前模型一致':'请检查 '+label+'，可结合性质与推导人工复核'};});}
  const t90=data=>{for(let i=1;i<data.length;i++)if(data[i][1]>=0.9){const a=data[i-1],b=data[i];return a[0]+(0.9-a[1])*(b[0]-a[0])/(b[1]-a[1]);}return null;};
  L.scene=function(id,p,answers={}){
    if(!id.startsWith('L3-'))return prior(id,p,answers);
    const plots=[],metrics=[],readings={};let formula='',note='',answerFeedback=[],studentExpression='';
    if(id==='L3-1'){
      const{mode,A,a,T,start}=p;const begin=mode==='delayed'?start:mode==='step'?T:0,end=mode==='exp'||mode==='step'?null:begin+T;
      const hi=mode==='exp'?Math.max(5,6/a):Math.max(5,(end??begin)+2),lo=-0.5;
      const value=t=>t<begin?0:mode==='exp'?A*Math.exp(-a*t):end!==null&&t>=end?0:A;
      const points=mode==='exp'?M.sample(value,lo,hi,1000):[[lo,0],[begin,0],[begin,A],...(end!==null?[[end,A],[end,0],[hi,0]]:[[hi,A]])];
      plots.push({key:'main',title:'当前时域信号',range:[lo,hi],series:[line('x(t)',points,{fill:true})]});
      const expected=[['coefficient',A,'幅度系数'],['denShift',mode==='exp'?a:0,'分母常数'],['delay1',begin,'第一时移']];
      if(end!==null)expected.push(['delay2',end,'第二时移']);
      answerFeedback=feedback(expected,answers);const c=L.answerNumber(answers,'coefficient'),b=L.answerNumber(answers,'denShift'),d1=L.answerNumber(answers,'delay1'),d2=L.answerNumber(answers,'delay2');
      studentExpression=c===null||b===null||d1===null||end!==null&&d2===null?'请在模板区补齐当前模型所需参数。':mode==='exp'?`学生模板：${c}·e^(−${d1}s)/(s+${b})`:end!==null?`学生模板：${c}[e^(−${d1}s)−e^(−${d2}s)]/(s+${b})`:`学生模板：${c}·e^(−${d1}s)/(s+${b})`;
      formula=mode==='exp'?`x(t)=${f(A)}e^(−${f(a)}t)u(t)`:`x(t)=${f(A)}[u(t−${f(begin)})${end!==null?'−u(t−'+f(end)+')':''}]`;
      metrics.push(metric('输入幅度',A),metric('开始时刻',begin,'s'),metric('结束时刻',end===null?'无有限结束':end,'s'),metric('已填写模板项',answerFeedback.filter(v=>v.status!=='missing').length+' / '+answerFeedback.length));
      Object.assign(readings,{model:mode,support:[begin,end],answerStatus:answerFeedback,studentExpression});
      note='模板中的 d₁、d₂ 是绝对开始和结束时刻，不是持续时间。指数信号显示至至少 6 个时间常数，之后仍有衰减尾。模板比较只作形成性反馈，等价表达式可在推导区说明并由教师复核。';
    }
    if(id==='L3-2'){
      const response=M.response(1,0),C=L.answerNumber(answers,'C'),D=L.answerNumber(answers,'D');
      const curves=[line('系统响应 · RK4',response.numerical.filter((_,i)=>i%5===0))];
      if(C!==null&&D!==null)curves.push(line('学生解析式',M.sample(t=>C+D*Math.exp(-t),0,5),{dash:'7 4'}));
      plots.push({key:'main',title:'学生解析响应与独立数值响应',range:[0,5],marker:p.measureTime,series:curves});
      answerFeedback=feedback([['hShift',1,'H(s) 分母常数'],['xGain',1,'X(s) 分子系数'],['C',1,'部分分式 C'],['D',-1,'部分分式 D']],answers);
      studentExpression=C===null||D===null?'填写 C、D 后显示学生曲线。':`学生 Y(s)=${C}/s+(${D})/(s+1)，y(t)=${C}+(${D})e^(−t)`;
      const value=M.at(response.numerical,p.measureTime),time90=t90(response.numerical);
      metrics.push(metric('当前时刻',p.measureTime,'s'),metric('数值响应 y(t)',value),metric('数值 t90',time90,'s'),metric('学生曲线最大差',C===null||D===null?'待填写':Math.max(...response.numerical.map(([t,y])=>Math.abs(y-(C+D*Math.exp(-t)))))));
      Object.assign(readings,{yAtTime:value,measureTime:p.measureTime,t90:time90,answerStatus:answerFeedback,studentExpression});
      formula='y′+y=u(t)，y(0⁻)=0；H=1/(s+aH)，X=bX/s，Y=C/s+D/(s+1)';note='数值曲线由独立 RK4 积分获得；学生曲线只使用你填入的系数，不用系统参考结果代填。t90 由数值曲线穿越 0.9 的位置插值得到。5 s 后仍渐近趋于长期值。';
    }
    if(id==='L3-3'){
      const initial=Number(p.initial),response=M.response(1,initial),C=L.answerNumber(answers,'C'),D=L.answerNumber(answers,'D');
      const curves=[0,0.5,2].map((y0,i)=>line('RK4 · y₀='+y0,M.response(1,y0).numerical.filter((_,j)=>j%5===0),{dash:i?'6 3':null}));
      if(C!==null&&D!==null)curves.push(line('当前学生解析式',M.sample(t=>C+D*Math.exp(-t),0,5),{dash:'2 5',color:'#8b6b46'}));
      plots.push({key:'main',title:'三种初始状态的全响应对照',range:[0,5],marker:p.measureTime,series:curves});
      plots.push({key:'decomposition',title:'当前初始值的零输入、零状态分解',range:[0,5],series:[line('全响应 · RK4',response.numerical.filter((_,i)=>i%5===0)),line('零输入响应',M.sample(response.zeroInput,0,5),{dash:'7 4'}),line('零状态响应',M.sample(response.zeroState,0,5),{dash:'2 5'})]});
      answerFeedback=feedback([['initialTerm',initial,'移项后的初始项'],['C',1,'常数项'],['D',initial-1,'指数项系数']],answers);
      studentExpression=C===null||D===null?'填写 C、D 后显示当前学生解析式。':`学生 y(t)=${C}+(${D})e^(−t)`;
      metrics.push(metric('初始值 y(0⁺)',response.numerical[0][1]),metric('当前 y(t)',M.at(response.numerical,p.measureTime)),metric('长期值',1),metric('分解最大差',response.error.toExponential(2)));
      Object.assign(readings,{initial,initialValue:response.numerical[0][1],decompositionError:response.error,measureTime:p.measureTime,yAtTime:M.at(response.numerical,p.measureTime),answerStatus:answerFeedback,studentExpression});
      formula='ℒ{y′}=sY−y₀；(s+1)Y=X+b₀；学生 y=C+D·e^(−t)';note='全响应由三组独立初值的 RK4 求解。当前分解的解析路径单独计算；改变初始值会保留当前草稿，请重新核对初始项与系数后保存试验。';
    }
    if(id==='L3-4'){
      const r=M.pulseResponse(p.T);
      plots.push({key:'main',title:'单位矩形输入与系统输出',range:[0,r.end],marker:p.T,series:[line('独立 RK4 输出',r.numerical.filter((_,i)=>i%5===0||Math.abs(r.numerical[i][0]-p.T)<1e-10)),line('单位矩形输入',[[0,1],[p.T,1],[p.T,0],[r.end,0]],{dash:'7 4'})]});
      metrics.push(metric('测量峰值',r.peak),metric('测量峰时',r.peakTime,'s'),metric('理论峰值',r.theoreticalPeak),metric('峰值 ≥ 0.8',r.passed?'达标':'未达标'));
      Object.assign(readings,{width:p.T,peak:r.peak,peakTime:r.peakTime,theoreticalPeak:r.theoreticalPeak,passed:r.passed,numericalError:r.error});
      formula='y′+y=u(t)−u(t−T)，y(0⁻)=0；设计目标：峰值 ≥ 0.8，T 尽可能小';note='积分在 t=T 处准确切段，测量峰值包含边界节点；判定使用内部未四舍五入值，理论阈值不放宽，数值比较仅容许 64 倍机器精度的舍入差；两项同时满足才达标。达到峰值指标不代表你已证明脉宽最短，请另写推导或逼近依据。图窗外仍有衰减尾。';
    }
    return{plots,metrics,readings,formula,note,answerFeedback,studentExpression};
  };
})(environment);

// records: preserved numerical / schema implementation.
(function(root){
'use strict';const L=root.SignalLab,KEY='signals-lab-v1-records',ids=L.taskIds,now=()=>new Date().toISOString();
const freshTask=id=>({experimentId:id.slice(0,2),taskId:id,params:L.defaults(id),answers:L.defaultAnswers(id),prediction:'',predictionDraft:'',revisions:[],trials:[],derivation:'',analysis:'',python:{code:'',result:null},figures:[],completion:{confirmed:false,confirmedAt:null}});
const fresh=()=>({schemaVersion:2,appVersion:L.version,createdAt:now(),updatedAt:now(),student:{name:'',number:'',classroom:''},tasks:Object.fromEntries(ids.map(id=>[id,freshTask(id)]))});
let data=fresh(),storageAvailable=true,recoveryWarning='';
const textField=(s,n=12000)=>typeof s==='string'&&s.length<=n,dateField=s=>typeof s==='string'&&s.length<40&&Number.isFinite(Date.parse(s));
function bounded(v,depth=0){if(depth>10)return false;if(v===null||typeof v==='boolean')return true;if(typeof v==='number')return Number.isFinite(v)&&Math.abs(v)<=1e9;if(typeof v==='string')return v.length<=12000;if(Array.isArray(v))return v.length<=500&&v.every(x=>bounded(x,depth+1));if(typeof v==='object')return Object.keys(v).length<=60&&Object.entries(v).every(([k,x])=>k.length<100&&!['__proto__','constructor','prototype'].includes(k)&&bounded(x,depth+1));return false;}
function validMeasurements(id,p,m){
const numeric={
'L1-1':p.mode==='transform'?['supportStart','supportEnd','peakTime','peak']:['width','height','analyticArea','numericalArea'],
'L1-2':['maxDifference'],'L1-3':['initial','limit','decompositionError'],'L1-4':['time','integral','reference','error'],
'L2-1':['K','termCount','highestFrequency','maximum'],'L2-2':['firstZero','zeroFrequency'],'L2-3':['cutoff'],'L2-4':['sampleRate','candidate','sampleDifference','reconstructionError'],
'L3-1':[],'L3-2':['yAtTime','t90'],'L3-3':['initial','initialValue','decompositionError'],'L3-4':['width','peak','peakTime','theoreticalPeak']
}[id];
if(!numeric.every(k=>typeof m[k]==='number'&&Number.isFinite(m[k])))return false;
if(['L2-3','L3-4'].includes(id)&&typeof m.passed!=='boolean')return false;
if(id==='L2-2'&&m.phaseAtQuarter!==null&&typeof m.phaseAtQuarter!=='number')return false;
if(id==='L2-3'&&(!Array.isArray(m.components)||m.components.length!==2||!m.components.every(c=>['frequency','amplitude','ratio','phase','theoryRatio','theoryPhase'].every(k=>typeof c[k]==='number'&&Number.isFinite(c[k])))))return false;
if(id.startsWith('L3-')&&id!=='L3-4'){
let keys=(L.tasks[id].answers||[]).map(a=>a.key);if(id==='L3-1'&&['exp','step'].includes(p.mode))keys=keys.filter(k=>k!=='delay2');
if(!Array.isArray(m.answerStatus)||m.answerStatus.length!==keys.length||!keys.every(k=>m.answerStatus.filter(a=>a&&a.key===k&&['missing','correct','review'].includes(a.status)&&textField(a.label,100)&&textField(a.message,200)).length===1))return false;
}return true;
}
function validPython(id,value){
if(!value||typeof value!=='object'||Array.isArray(value)||!textField(value.code))return false;
const r=value.result;if(r===null)return true;
if(!r||!textField(r.code)||!textField(r.stdout)||!textField(r.stderr)||!dateField(r.time)||!L.validParams(id,r.params))return false;
return Array.isArray(r.plots)&&r.plots.length<=4&&r.plots.every(chunks=>Array.isArray(chunks)&&chunks.length>0&&chunks.length<=22&&chunks.every(c=>textField(c)&&c.length>0&&/^[A-Za-z0-9+/=]+$/.test(c))&&chunks.join('').length<=262144&&chunks.join('').length%4===0&&chunks.join('').startsWith('iVBORw0KGgo'));
}
function validate(raw){
const fail=message=>{throw Error('记录文件无效：'+message+'。当前记录未被修改。');};
const legacy=raw&&raw.schemaVersion===1&&raw.appVersion==='0.1.0';
if(!raw||!legacy&&(raw.schemaVersion!==2||raw.appVersion!==L.version))fail('版本不支持，请选择本实验室 1.0.0 或旧版 0.1.0 记录');
if(!dateField(raw.createdAt)||!dateField(raw.updatedAt))fail('时间字段损坏');
if(!raw.student||!['name','number','classroom'].every(k=>textField(raw.student[k],100)))fail('学生信息错误');
const required=legacy?L.courseIds('L1'):ids;if(!raw.tasks||Array.isArray(raw.tasks)||Object.keys(raw.tasks).length!==required.length)fail('任务数量不正确');
const clean=fresh();clean.createdAt=raw.createdAt;clean.updatedAt=raw.updatedAt;clean.student=Object.fromEntries(['name','number','classroom'].map(k=>[k,raw.student[k]]));
for(const id of required){const t=raw.tasks[id];if(!t||t.taskId!==id||t.experimentId!==id.slice(0,2)||!L.validParams(id,t.params))fail(id+' 参数或编号错误');
if(!['prediction','predictionDraft','derivation','analysis'].every(k=>textField(t[k])))fail(id+' 文字字段缺失或过长');
if(t.python!==undefined&&!validPython(id,t.python))fail(id+' Python 记录错误');
const answers=legacy?{}:t.answers;if(!L.validAnswers(id,answers))fail(id+' 模板输入错误');
if(!Array.isArray(t.revisions)||t.revisions.length>100||!t.revisions.every(r=>r&&textField(r.text)&&dateField(r.time)))fail(id+' 预测修订错误');
if(!Array.isArray(t.trials)||t.trials.length>200)fail(id+' 试验数量错误');
for(const v of t.trials){
if(!v||!dateField(v.time)||!L.validParams(id,v.params)||!L.validAnswers(id,legacy?{}:v.answers))fail(id+' 试验参数错误');
if(!v.measurements||typeof v.measurements!=='object'||Array.isArray(v.measurements)||!bounded(v.measurements)||!validMeasurements(id,v.params,v.measurements)||!L.requiredMeasurements(id,v.params).every(k=>Object.hasOwn(v.measurements,k)))fail(id+' 测量字段错误');
if(!v.units||v.units.time!=='s'||v.units.amplitude!=='归一化'||v.units.area!=='幅度·s')fail(id+' 单位错误');
if(!Array.isArray(v.window)||v.window.length<1||v.window.length>4||!v.window.every(w=>w&&textField(w.key,50)&&Array.isArray(w.range)&&w.range.length===2&&w.range.every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1e6)&&w.range[0]<w.range[1]))fail(id+' 测量窗口错误');
if(v.cursor!==null&&!(typeof v.cursor==='number'&&Number.isFinite(v.cursor)&&Math.abs(v.cursor)<=1e6))fail(id+' 游标错误');
}
if(!Array.isArray(t.figures)||t.figures.length>200||!t.figures.every(v=>v&&L.validParams(id,v.params)&&dateField(v.time)&&L.validAnswers(id,legacy?{}:v.answers)))fail(id+' 图形快照错误');
if(!t.completion||typeof t.completion.confirmed!=='boolean'||t.completion.confirmedAt!==null&&!dateField(t.completion.confirmedAt))fail(id+' 完成状态错误');
if(t.completion.confirmed&&(!t.prediction.trim()||!t.trials.length||!t.analysis.trim()))fail(id+' 完成证据缺失');
const clone=v=>JSON.parse(JSON.stringify(v));clean.tasks[id]={experimentId:id.slice(0,2),taskId:id,params:Object.fromEntries(L.tasks[id].params.map(p=>[p.key,t.params[p.key]])),answers:{...L.defaultAnswers(id),...answers},prediction:t.prediction,predictionDraft:t.predictionDraft,revisions:t.revisions.map(v=>({text:v.text,time:v.time})),trials:t.trials.map(v=>({...clone(v),answers:legacy?{}:{...v.answers}})),derivation:t.derivation,analysis:t.analysis,python:t.python?{code:t.python.code,result:t.python.result?clone(t.python.result):null}:{code:'',result:null},figures:t.figures.map(v=>({params:{...v.params},answers:legacy?{}:{...v.answers},time:v.time})),completion:{...t.completion}};
}return clean;
}
function save(){data.updatedAt=now();onChange(JSON.stringify(data));}
function missing(id){const t=data.tasks[id];return[!t.prediction.trim()&&'保存实验前预测',!t.trials.length&&'保存至少一次试验',!t.analysis.trim()&&'填写结果分析',(L.tasks[id].answers||[]).length&&!t.trials.some(v=>v.measurements.answerStatus?.length>0&&v.measurements.answerStatus.every(a=>a.status!=='missing'))&&'保存模板填写结果'].filter(Boolean);}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
function filename(suffix,label='三次实验记录'){const safe=s=>s.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,60);return[data.student.number||'学号',data.student.name||'姓名',label,'v'+L.version].map(safe).join('_')+suffix;}
L.records={get data(){return data;},get storageAvailable(){return storageAvailable;},get recoveryWarning(){return recoveryWarning;},save,missing,download,filename,validate,
import(raw){const next=validate(raw);data=next;save();},export(){save();download(new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}),filename('.json'));},clear(){data=fresh();save();},
trial(id,scene,cursor){const t=data.tasks[id];if(t.trials.length>=200)throw Error('每个任务最多保存 200 次试验，请先下载 JSON。');t.trials.push({params:{...t.params},answers:{...t.answers},measurements:scene.readings,time:now(),units:{time:'s',amplitude:'归一化',area:'幅度·s',frequency:'Hz',phase:'场景标注的 rad 或 °'},window:scene.plots.map(p=>({key:p.key,range:p.range})),cursor:cursor??null});t.figures.push({params:{...t.params},answers:{...t.answers},time:now()});t.completion={confirmed:false,confirmedAt:null};save();},
prediction(id){const t=data.tasks[id],draft=t.predictionDraft.trim();if(!draft)throw Error('请先填写预测与理由。');const last=t.revisions.length?t.revisions[t.revisions.length-1].text:t.prediction;if(draft===last)throw Error('预测内容没有变化，原稿已保留。');if(!t.prediction)t.prediction=draft;else{if(t.revisions.length>=100)throw Error('最多保留 100 次预测修订。');t.revisions.push({text:draft,time:now()});}t.completion={confirmed:false,confirmedAt:null};save();}
};
})(environment);

return environment.SignalLab;
}
