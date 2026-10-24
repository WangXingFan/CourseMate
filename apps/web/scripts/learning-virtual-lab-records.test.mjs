import { test } from "node:test";
import assert from "node:assert/strict";
import { createVirtualLabEngine } from "../public/vendor/signal-lab/core.mjs";
const L=createVirtualLabEngine(),M=L.models,R=L.records,close=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<=tol,`${a} != ${b} tol ${tol}`);
const clone=v=>JSON.parse(JSON.stringify(v)),evidence={};
test('native engine instances isolate account records and expose no window global',()=>{
 const first=createVirtualLabEngine(),second=createVirtualLabEngine();
 first.records.data.student.name='first';first.records.data.tasks['L1-1'].analysis='private draft';
 assert.equal(second.records.data.student.name,'');assert.equal(second.records.data.tasks['L1-1'].analysis,'');
 assert.equal(Object.hasOwn(globalThis,'SignalLab'),false);
});
test('all twelve default scenes render and export valid measurement sets',()=>{
 assert.equal(L.taskIds.length,12);
 for(const id of L.taskIds){const p=L.defaults(id),s=L.scene(id,p,L.defaultAnswers(id));assert.ok(L.validParams(id,p));assert.ok(s.formula&&s.metrics.length&&s.plots.length);
 for(const k of L.requiredMeasurements(id,p))assert.ok(Object.hasOwn(s.readings,k),`${id}:${k}`);
 for(const plot of s.plots){const svg=L.plot.svg(plot,id,null);assert.ok(svg.includes('<svg'));assert.ok(!/NaN|Infinity|undefined/.test(svg),id);for(const series of plot.series){assert.ok(series.label);assert.ok(series.points.every(([x,y])=>Number.isFinite(x)&&(y===null||Number.isFinite(y))));}}
 R.trial(id,s,null);}
 assert.doesNotThrow(()=>R.validate(clone(R.data)));
});
test('L2-1 harmonic amplitudes, term counts, frequencies and synthesis',()=>{
 for(const K of [1,3,7,15]){const s=L.scene('L2-1',{K:String(K),showComponents:'on'});assert.equal(s.readings.termCount,(K+1)/2);assert.equal(s.readings.highestFrequency,K*10);assert.equal(s.plots[2].series.length,(K+1)/2);
 for(const a of s.readings.amplitudes)close(a.amplitude,4/(Math.PI*a.k));
 for(const t of [0,.0037,.035,.099])close(M.synthesis(K,t),s.readings.amplitudes.reduce((v,a)=>v+a.amplitude*Math.sin(2*Math.PI*a.frequency*t),0));}
});
test('L2-2 rectangle exact zero, area and translation phase',()=>{
 for(const T of [.25,.5,1,2,2.5])for(const A of [.25,1,3])for(const center of [-2,0,1,2]){
 const s=L.scene('L2-2',{A,T,center});close(s.readings.firstZero,1/T);close(s.readings.zeroFrequency,A*T);close(M.pulseSpectrum(A,T,center,1/T).magnitude,0);assert.equal(M.pulseSpectrum(A,T,center,1/T).phase,null);
 const f=.25/T,z=M.pulseSpectrum(A,T,center,f);close(z.magnitude,A*T*M.sinc(.25));close(Math.cos(z.phase),Math.cos(-2*Math.PI*f*center));assert.ok(s.plots[0].range[0]<center-T/2&&s.plots[0].range[1]>center+T/2);
 const points=s.plots[1].series[0].points;close(L.plot.read({points},0),A*T);}
});
test('L2-3 independent RK4 fit satisfies amplitude and phase tolerance',()=>{
 evidence.filter=[];
 for(const fc of [50,100,200,500,1000]){const r=M.filter(fc);const errors=r.fit.components.map((c,i)=>({relativeAmplitude:Math.abs(c.ratio-r.theory[i].ratio)/r.theory[i].ratio,phase:Math.abs(c.phase-r.theory[i].phase)}));for(const e of errors){assert.ok(e.relativeAmplitude<=.01);assert.ok(e.phase<=1);}evidence.filter.push({fc,components:r.fit.components,errors,passed:r.passed});}
 assert.equal(M.filter(100).passed,false);assert.equal(M.filter(200).passed,true);assert.equal(M.filter(500).passed,false);
 close(M.filter(200).fit.components[0].ratio,Math.sqrt(.8),1e-6);close(M.filter(200).fit.components[1].ratio,1/Math.sqrt(26),1e-6);
});
test('filter half-step comparison improves independent fit error',()=>{
 const errors=[.00002,.00001,.000005].map(step=>{const r=M.filter(200,step);return{step,error:Math.max(...r.fit.components.map((c,i)=>Math.abs(c.ratio-r.theory[i].ratio)))}});
 assert.ok(errors[1].error<errors[0].error);assert.ok(errors[2].error<errors[1].error);evidence.filterConvergence=errors;
});
test('L2-4 sinc reconstruction and sample ambiguity',()=>{
 evidence.reconstruction=[];
 for(const fs of [100,25,15]){const r=M.reconstruction(fs),s=L.scene('L2-4',{fs:String(fs),candidate:5});evidence.reconstruction.push({fs,error:r.maxError,difference:s.readings.sampleDifference,samples:r.last-r.first+1});
 for(const [t,y]of r.samples)close(L.plot.read({points:r.points},t),y,.005);
 if(fs>20)assert.ok(r.maxError<.005);else{assert.ok(s.readings.sampleDifference<1e-9);assert.ok(r.maxError>1);for(const [t,y]of r.points)close(y,Math.cos(2*Math.PI*5*t),.005);}}
});
test('L3-1 four templates preserve student inputs and correct absolute delays',()=>{
 const cases=[['exp',{coefficient:'2',denShift:'1.5',delay1:'0',delay2:''}],['step',{coefficient:'2',denShift:'0',delay1:'1.25',delay2:''}],['pulse',{coefficient:'2',denShift:'0',delay1:'0',delay2:'1.25'}],['delayed',{coefficient:'2',denShift:'0',delay1:'1.5',delay2:'2.75'}]];
 for(const [mode,a]of cases){const p={mode,A:2,a:1.5,T:1.25,start:1.5},before=clone(a),s=L.scene('L3-1',p,a);assert.ok(s.answerFeedback.every(a=>a.status==='correct'));assert.deepEqual(a,before);assert.ok(L.scene('L3-1',p,L.defaultAnswers('L3-1')).answerFeedback.every(a=>a.status==='missing'));}
 const bad=L.scene('L3-1',{...L.defaults('L3-1'),mode:'delayed'},{coefficient:'1',denShift:'0',delay1:'1',delay2:'1'});assert.ok(bad.answerFeedback.some(a=>a.status==='review'));
});
test('L3-2 student zero-state coefficients and measured t90',()=>{
 const a={hShift:'1',xGain:'1',C:'1',D:'-1'},s=L.scene('L3-2',L.defaults('L3-2'),a);assert.ok(s.answerFeedback.every(a=>a.status==='correct'));close(s.readings.yAtTime,1-Math.exp(-1),1e-3);close(s.readings.t90,Math.log(10),.01);assert.equal(s.plots[0].series.length,2);assert.equal(L.scene('L3-2',L.defaults('L3-2'),{}).plots[0].series.length,1);
 evidence.zeroState={y1:s.readings.yAtTime,t90:s.readings.t90};
});
test('L3-3 independent initial states, decomposition and answer checks',()=>{
 for(const y0 of [0,.5,2]){const p={initial:String(y0),measureTime:1},a={initialTerm:String(y0),C:'1',D:String(y0-1)},s=L.scene('L3-3',p,a);assert.ok(s.answerFeedback.every(a=>a.status==='correct'));close(s.readings.initialValue,y0);assert.ok(s.readings.decompositionError<1e-3);close(s.readings.yAtTime,1+(y0-1)*Math.exp(-1),1e-3);assert.equal(s.plots[0].series.length,4);}
});
test('L3-4 exact peak at pulse boundary, strict threshold and convergence',()=>{
 evidence.pulse=[];
 for(const T of [.1,.5,.737,1,1.60,Math.log(5)-1e-10,Math.log(5),Math.log(5)+1e-10,1.61,2,3,4]){const r=M.pulseResponse(T);close(r.peakTime,T,1e-10);close(r.peak,1-Math.exp(-T),1e-3);assert.ok(r.error<1e-3);evidence.pulse.push({T,peak:r.peak,peakTime:r.peakTime,error:r.error,passed:r.passed});}
 assert.equal(M.pulseResponse(1.60).passed,false);assert.equal(M.pulseResponse(1.61).passed,true);assert.equal(M.pulseResponse(Math.log(5)).passed,true);assert.equal(M.pulseResponse(Math.log(5)-1e-10).passed,false);assert.equal(M.pulseResponse(Math.log(5)+1e-10).passed,true);
 const errors=[.08,.04,.001,.0005].map(step=>({step,error:M.pulseResponse(.737,step).error}));assert.ok(errors[1].error<errors[0].error);assert.ok(errors[3].error<1e-3);evidence.pulseConvergence=errors;
});
test('all task parameter boundaries and invalid numeric values are validated',()=>{
 for(const id of L.taskIds)for(const spec of L.tasks[id].params){const p=L.defaults(id);if(spec.type==='number'){for(const value of ['',NaN,Infinity,-Infinity,spec.min-1,spec.max+1])assert.equal(L.validParams(id,{...p,[spec.key]:value}),false,`${id}:${spec.key}`);for(const value of [spec.min,spec.max])assert.ok(L.validParams(id,{...p,[spec.key]:value}));}else assert.equal(L.validParams(id,{...p,[spec.key]:'not-an-option'}),false);}
 assert.equal(L.validParams('unknown',{}),false);
 for(const id of ['L3-1','L3-2','L3-3']){const a=L.defaultAnswers(id),key=Object.keys(a)[0];for(const value of ['NaN','Infinity','1e400','101','<script>'])assert.equal(L.validAnswers(id,{...a,[key]:value}),false);}
});
test('schema2 full records preserve twelve scenes and answer snapshots',()=>{
 for(const id of ['L3-1','L3-2','L3-3']){const t=R.data.tasks[id];t.answers=Object.fromEntries(Object.keys(t.answers).map(k=>[k,'1']));R.trial(id,L.scene(id,t.params,t.answers),1);}
 const expected=clone(R.data),clean=R.validate(expected);assert.deepEqual(clean.tasks,expected.tasks);R.import(expected);assert.deepEqual(R.data.tasks,expected.tasks);
});
test('schema1 legacy first-experiment records migrate without losing evidence',()=>{
 const old=clone(R.data);old.schemaVersion=1;old.appVersion='0.1.0';old.tasks=Object.fromEntries(L.courseIds('L1').map(id=>{const t=old.tasks[id];delete t.answers;t.trials.forEach(v=>{delete v.answers;});t.figures.forEach(v=>{delete v.answers;});return[id,t];}));
 const clean=R.validate(old);assert.equal(clean.schemaVersion,2);assert.equal(Object.keys(clean.tasks).length,12);for(const id of L.courseIds('L1'))assert.deepEqual(clean.tasks[id].trials.map(v=>v.measurements),old.tasks[id].trials.map(v=>v.measurements));assert.equal(clean.tasks['L2-1'].trials.length,0);
});
test('broken imports fail atomically for every experiment',()=>{
 const original=clone(R.data),snapshot=JSON.stringify(R.data);
 for(const id of L.taskIds){const bad=clone(original);delete bad.tasks[id].trials[0].measurements[L.requiredMeasurements(id,bad.tasks[id].params)[0]];assert.throws(()=>R.import(bad));assert.equal(JSON.stringify(R.data),snapshot);}
 for(const mutate of [d=>delete d.tasks['L3-1'].answers,d=>{d.tasks['L3-2'].answers.C='NaN'},d=>{d.tasks['L2-2'].trials[0].window[0].range=[3,-3]},d=>{d.tasks['L2-3'].trials[0].units.time='ms'},d=>{d.tasks['L1-1'].analysis='a'.repeat(12001)}]){const bad=clone(original);mutate(bad);assert.throws(()=>R.import(bad));assert.equal(JSON.stringify(R.data),snapshot);}
});
test('plot readouts preserve gaps, discrete points and text escaping',()=>{
 assert.equal(L.plot.read({points:[[0,1],[1,null],[2,3]]},.5),null);assert.equal(L.plot.read({pointsOnly:true,points:[[0,1],[1,2]]},.75),2);
 assert.equal(L.plot.read({points:[[0,1],[1,2]]},-1),null);assert.equal(L.plot.read({points:[[0,3.1],[1,-3.1]]},.5,Math.PI),null);assert.ok(L.escape('<script> & "x"').includes('&lt;script&gt;'));
});
