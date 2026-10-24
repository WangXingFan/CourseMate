(function(root){
'use strict';const L=root.SignalLab,KEY='signals-lab-v1-records',ids=L.taskIds,now=()=>new Date().toISOString();
const freshTask=id=>({experimentId:id.slice(0,2),taskId:id,params:L.defaults(id),answers:L.defaultAnswers(id),prediction:'',predictionDraft:'',revisions:[],trials:[],derivation:'',analysis:'',figures:[],completion:{confirmed:false,confirmedAt:null}});
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
const clone=v=>JSON.parse(JSON.stringify(v));clean.tasks[id]={experimentId:id.slice(0,2),taskId:id,params:Object.fromEntries(L.tasks[id].params.map(p=>[p.key,t.params[p.key]])),answers:{...L.defaultAnswers(id),...answers},prediction:t.prediction,predictionDraft:t.predictionDraft,revisions:t.revisions.map(v=>({text:v.text,time:v.time})),trials:t.trials.map(v=>({...clone(v),answers:legacy?{}:{...v.answers}})),derivation:t.derivation,analysis:t.analysis,figures:t.figures.map(v=>({params:{...v.params},answers:legacy?{}:{...v.answers},time:v.time})),completion:{...t.completion}};
}return clean;
}
function save(){data.updatedAt=now();window.dispatchEvent(new CustomEvent('coursemate-lab-change'));}
function missing(id){const t=data.tasks[id];return[!t.prediction.trim()&&'保存实验前预测',!t.trials.length&&'保存至少一次试验',!t.analysis.trim()&&'填写结果分析',(L.tasks[id].answers||[]).length&&!t.trials.some(v=>v.measurements.answerStatus?.length>0&&v.measurements.answerStatus.every(a=>a.status!=='missing'))&&'保存模板填写结果'].filter(Boolean);}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
function filename(suffix,label='三次实验记录'){const safe=s=>s.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,60);return[data.student.number||'学号',data.student.name||'姓名',label,'v'+L.version].map(safe).join('_')+suffix;}
L.records={get data(){return data;},get storageAvailable(){return storageAvailable;},get recoveryWarning(){return recoveryWarning;},save,missing,download,filename,validate,
import(raw){const next=validate(raw);data=next;save();},export(){save();download(new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}),filename('.json'));},clear(){data=fresh();save();},
trial(id,scene,cursor){const t=data.tasks[id];if(t.trials.length>=200)throw Error('每个任务最多保存 200 次试验，请先下载 JSON。');t.trials.push({params:{...t.params},answers:{...t.answers},measurements:scene.readings,time:now(),units:{time:'s',amplitude:'归一化',area:'幅度·s',frequency:'Hz',phase:'场景标注的 rad 或 °'},window:scene.plots.map(p=>({key:p.key,range:p.range})),cursor:cursor??null});t.figures.push({params:{...t.params},answers:{...t.answers},time:now()});t.completion={confirmed:false,confirmedAt:null};save();},
prediction(id){const t=data.tasks[id],draft=t.predictionDraft.trim();if(!draft)throw Error('请先填写预测与理由。');const last=t.revisions.length?t.revisions[t.revisions.length-1].text:t.prediction;if(draft===last)throw Error('预测内容没有变化，原稿已保留。');if(!t.prediction)t.prediction=draft;else{if(t.revisions.length>=100)throw Error('最多保留 100 次预测修订。');t.revisions.push({text:draft,time:now()});}t.completion={confirmed:false,confirmedAt:null};save();}
};
})(typeof window!=='undefined'?window:globalThis);
