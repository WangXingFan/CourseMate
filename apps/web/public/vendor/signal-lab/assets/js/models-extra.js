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
})(typeof window!=='undefined'?window:globalThis);
