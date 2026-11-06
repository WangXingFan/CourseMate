// Independent answer oracle. Do not import the authoring script or its keys.
// Integrals, direct sums, DFTs and an ODE solver cross-check the authored
// closed forms; remaining entries apply the handout identities directly.
function integral(f, left, right, steps = 2048) {
  const h = (right-left)/steps;
  let sum = f(left)+f(right);
  for (let i = 1; i < steps; i++) sum += (i%2 ? 4 : 2)*f(left+i*h);
  return sum*h/3;
}
function gcd(a, b) {
  while (b) [a, b] = [b, a%b];
  return a;
}
function firstOrder(initial, decay, forcing, time) {
  let y = initial;
  const dt = time/2048;
  const derivative = (v) => forcing-decay*v;
  for (let i = 0; i < 2048; i++) {
    const k1 = derivative(y), k2 = derivative(y+dt*k1/2);
    const k3 = derivative(y+dt*k2/2), k4 = derivative(y+dt*k3);
    y += dt*(k1+2*k2+2*k3+k4)/6;
  }
  return y;
}
function dftBin(amplitude, size, frequency) {
  let real = 0, imaginary = 0;
  for (let n = 0; n < size; n++) {
    const angle = 2*Math.PI*frequency*n/size;
    const sample = amplitude*Math.cos(angle);
    real += sample*Math.cos(angle);
    imaginary -= sample*Math.sin(angle);
  }
  return Math.hypot(real, imaginary);
}

const identities = {
  "dc-sine-power": (d,a,w) => integral((t) => (d+a*Math.cos(w*t))**2, 0, 2*Math.PI/w)/(2*Math.PI/w),
  "two-tone-power": (a,b,f) => f*integral((t) => (a*Math.cos(2*Math.PI*f*t)+b*Math.sin(4*Math.PI*f*t))**2, 0, 1/f),
  "duty-power": (a,width,period) => integral(() => a*a, 0, width)/period,
  "pulse-amplitude": (energy,width) => Math.sqrt(energy)/Math.sqrt(width),
  "triangle-energy": (a,t) => 2*integral((x) => (a*(1-x/t))**2, 0, t),
  "ramp-energy": (k,t) => integral((x) => (k*x)**2, 0, t),
  "bilateral-exp-energy": (a,decay) => 2*integral((t) => (a*Math.exp(-decay*t))**2, 0, 30/decay),
  "geometric-energy": (a,r) => Array.from({length:256},(_,n) => (a*r**n)**2).reduce((sum,v) => sum+v, 0),
  "finite-sequence-energy": (...samples) => samples.reduce((energy,sample) => energy+Math.abs(sample)**2, 0),
  "even-component": (positive,negative) => positive/2+negative/2,
  "odd-component": (positive,negative) => positive/2-negative/2,
  "reversed-support": (left,right,shift,scale) => Math.min((shift-left)/scale,(shift-right)/scale),
  "scaled-signal-energy": (energy,gain,scale) => energy/Math.abs(-scale)*gain**2,
  "commensurate-period": (f1,f2) => 1/gcd(f1,f2),
  "discrete-period": (p,q) => {
    for (let n=1; n<=q; n++) if ((p*n)%q===0) return n;
    throw new Error("No integer period");
  },
  "affine-impulse-area": (amplitude,scale) => amplitude/Math.abs(scale),
  "affine-impulse-sift": (a,b,c,d) => { const root=b/a; return (c*root+d)/Math.abs(a); },
  "step-window-area": (amplitude,left,right) => integral(() => amplitude, left, right),
  "differentiator-amplitude": (amplitude,frequency) => Math.abs(amplitude*frequency),
  "difference-equation-order": (lead,lag) => lead-(-lag),

  "unequal-exponential-convolution": (a,b,t) => integral((tau) => Math.exp(-a*tau)*Math.exp(-b*(t-tau)), 0, t),
  "first-order-step-sample": (k,a,t) => integral((tau) => k*Math.exp(-a*tau), 0, t),
  "natural-response-sample": (initial,a,t) => firstOrder(initial,a,0,t),
  "total-response-sample": (initial,a,b,t) => firstOrder(initial,a,b,t),
  "pulse-response-after-end": (a,width) => integral((tau) => a*Math.exp(-a*(2*width-tau)), 0, width),
  "rectangle-convolution-sample": (a,b,t1,t2,t) => {
    const endpoints=[0,t1,t-t2,t].sort((x,y)=>x-y);
    let result=0;
    for (let i=1;i<endpoints.length;i++) {
      const middle=(endpoints[i-1]+endpoints[i])/2;
      if (middle>=0 && middle<=t1 && t-middle>=0 && t-middle<=t2) result+=a*b*(endpoints[i]-endpoints[i-1]);
    }
    return result;
  },
  "shifted-convolution-end": (l1,r1,l2,r2) => l1+l2+(r1-l1)+(r2-l2),
  "convolution-total-area": (a,alpha,b,beta) => integral((t) => a*Math.exp(-alpha*t),0,30/alpha)*integral((t) => b*Math.exp(-beta*t),0,30/beta),
  "discrete-convolution-middle": (a,b,c,d) => [a,b].reduce((sum,x,k)=>sum+x*[c,d][1-k],0),
  "ramp-step-convolution": (a,t) => integral((tau) => a*tau, 0, t),
  "two-impulse-response": (a,b,decay,delay) => [[0,a],[delay,b]].reduce((sum,[time,weight])=>sum+weight*Math.exp(-decay*(2*delay-time)),0),
  "repeated-pole-step-final": (k,a) => integral((t) => k*t*Math.exp(-a*t),0,30/a),
  "second-order-impulse-jump": (mass,_damping,impulse) => impulse/mass,
  "first-order-initial-slope": (a,input,initial) => input-a*initial,
  "complex-root-frequency": (a,b) => Math.sqrt(4*(a*a+b*b)-(2*a)**2)/2,
  "complex-root-envelope": (a,_b,t) => firstOrder(1,a,0,t),
  "second-order-step-gain": (k,_b,c) => k/c,
  "critical-pole": (a) => -(2*a)/2,
  "rectangle-autocorrelation": (a,width,lag) => a*a*Math.max(0,Math.min(width,width+lag)-Math.max(0,lag)),
  "crosscorrelation-peak": (a,b) => a-b,

  "period-ms-frequency": (period) => 1/(period*1e-3),
  "sine-series-imaginary": (a,w) => -integral((t) => a*Math.sin(w*t)*Math.sin(w*t),0,2*Math.PI/w)/(2*Math.PI/w),
  "cosine-series-real": (a,degrees) => integral((t) => a*Math.cos(t+degrees*Math.PI/180)*Math.cos(t),0,2*Math.PI)/(2*Math.PI),
  "series-parseval-power": (dc,real,imaginary) => integral((t) => (dc+2*real*Math.cos(t)-2*imaginary*Math.sin(t))**2,0,2*Math.PI)/(2*Math.PI),
  "derivative-spectrum": (w,magnitude) => Math.hypot(0,w)*magnitude,
  "scaled-transform-area": (area,gain,scale) => area*gain/Math.abs(-scale),
  "exponential-spectrum-magnitude": (a,decay,w) => Math.hypot(integral((t)=>a*Math.exp(-decay*t)*Math.cos(w*t),0,30/decay), integral((t)=>-a*Math.exp(-decay*t)*Math.sin(w*t),0,30/decay)),
  "bilateral-exponential-dc": (a,decay) => 2*integral((t) => a*Math.exp(-decay*t),0,30/decay),
  "rectangle-spectrum-sample": (a,width) => integral((t) => a*Math.cos(Math.PI*t/width),-width/2,width/2),
  "delay-phase-degrees": (f,milliseconds) => -(2*Math.PI*f)*(milliseconds/1000)*180/Math.PI,
  "delay-difference-notch": (milliseconds) => 1/(milliseconds*1e-3),
  "ideal-lowpass-output-power": (a,_b,gain,low) => low*integral((t) => (gain*a*Math.cos(2*Math.PI*low*t))**2,0,1/low),
  "lowpass-sinusoid-amplitude": (a,gain,tau,w) => a*gain/Math.hypot(1,w*tau),
  "highpass-sinusoid-amplitude": (a,pole,w) => a*Math.sqrt(w*w/(pole*pole+w*w)),
  "multiple-zone-alias": (fs,f) => { const reduced=((f%fs)+fs)%fs; return Math.min(reduced,fs-reduced); },
  "normalized-cycles": (f,fs) => (2*Math.PI*f/fs)/(2*Math.PI),
  "finite-record-samples": (fs,duration) => Math.ceil(fs*duration-1e-10),
  "dft-coherent-cosine": dftBin,
  "am-sideband-amplitude": (carrier,mu,message) => 2*message*integral((t) => carrier*(1+mu*Math.cos(2*Math.PI*message*t))*Math.cos(20*Math.PI*message*t)*Math.cos(22*Math.PI*message*t),0,1/message),
  "mixer-difference-frequency": (rf,lo) => Math.abs(rf-lo),

  "laplace-exponential-value": (a,decay,s) => integral((t) => a*Math.exp(-decay*t)*Math.exp(-s*t),0,30/(s+decay)),
  "laplace-polynomial-value": (power,s) => integral((t) => t**power*Math.exp(-s*t),0,50/s,4096),
  "delayed-step-transform": (a,delay,s) => integral((t) => a*Math.exp(-s*t),delay,delay+30/s),
  "shifted-roc-boundary": (decay,shift) => -decay+shift,
  "unilateral-second-derivative": (s,transform,initial,slope) => s*(s*transform-initial)-slope,
  "time-weighted-transform": (a,decay,s) => integral((t) => a*t*Math.exp(-(s+decay)*t),0,40/(s+decay)),
  "integrated-transform": (a,decay,s) => integral((t) => a/decay*(1-Math.exp(-decay*t))*Math.exp(-s*t),0,40/s,4096),
  "rational-initial-value": (b,c,a,d) => { const residueA=(c-b*a)/(d-a), residueD=(c-b*d)/(a-d); return residueA+residueD; },
  "two-pole-final-value": (k,a,b) => k/(0+a)/(0+b),
  "inverse-damped-sine": (k,_decay,w) => k/w,
  "numerator-residue": (k,zero,a,b) => { const pole=-a; return k*(pole+zero)/(pole+b); },
  "direct-impulse-coefficient": (b,a) => b/a,
  "capacitor-initial-current-term": (c,voltage) => -voltage*c,
  "inductor-s-impedance": (l,s) => s*l,
  "routh-stable-bound": (a,b) => a*b,
  "routh-first-column": (a,b,c) => b-c/a,
  "negative-feedback-gain": (g,h) => 1/(1/g+h),
  "mason-touching-loops": (l1,l2) => 1-(l1+l2),
  "cascade-dc-gain": (k1,a,k2,b) => (k1/a)*(k2/b),
  "scalar-state-dc-gain": (a,b,c,d) => { const steadyStateForUnitInput=b/a; return c*steadyStateForUnitInput+d; },
};

export const expansionCalculations = Object.fromEntries(Object.entries(identities).map(([skill,calculate]) => [`expanded:${skill}`,calculate]));
