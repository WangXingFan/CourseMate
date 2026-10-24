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
})(typeof window!=='undefined'?window:globalThis);
