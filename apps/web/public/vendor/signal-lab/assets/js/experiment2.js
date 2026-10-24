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
})(typeof window!=='undefined'?window:globalThis);
