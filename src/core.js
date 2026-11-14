(function(root){
'use strict';
const DAY=86400000;
function dayKey(t){return new Date(t).toISOString().slice(0,10)}
function empty(){return {version:1,records:{},exams:[],session:null}}
function record(old,correct,now=Date.now()){
 const p=old||{attempts:0,correct:0,wrong:0,streak:0,due:0,lastCorrectDay:null};
 const next={...p,attempts:p.attempts+1,correct:p.correct+(correct?1:0),wrong:p.wrong+(correct?0:1),last:now};
 if(!correct){next.streak=0;next.due=now;next.lastCorrectDay=null;return next}
 if(p.lastCorrectDay!==dayKey(now)){
  next.streak=Math.min((p.streak||0)+1,5);next.lastCorrectDay=dayKey(now);
  next.due=now+([1,3,7,14,30][next.streak-1])*DAY;
 }
 return next;
}
function shuffle(a,rng=Math.random){a=[...a];for(let i=a.length-1;i>0;i--){let j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function unresolved(r){return !!r&&r.wrong>0&&r.streak<2}
function mastered(r){return !!r&&r.streak>=2}
function select(bank,records,{kind='all',category='all',mode='smart',limit=20,now=Date.now()}={}){
 let pool=bank.filter(q=>(kind==='all'||q.kind===kind)&&(category==='all'||q.category===category));
 if(mode==='missed')pool=pool.filter(q=>unresolved(records[q.id]));
 if(mode==='unseen')pool=pool.filter(q=>!records[q.id]);
 if(mode==='due')pool=pool.filter(q=>records[q.id]&&records[q.id].due<=now);
 pool=shuffle(pool);
 if(mode==='smart'||mode==='missed'){
  const rank=q=>{const r=records[q.id];return r&&unresolved(r)&&r.due<=now?0:!r?1:r.due<=now?2:3};
  pool.sort((a,b)=>rank(a)-rank(b));
 }
 return pool.slice(0,limit==='all'?pool.length:Number(limit));
}
function exam(bank){return [...shuffle(bank.filter(q=>q.kind==='signs')).slice(0,20),...shuffle(bank.filter(q=>q.kind==='rules')).slice(0,20)]}
function grade(questions,answers){let result={rules:{correct:0,total:0},signs:{correct:0,total:0}};questions.forEach(q=>{result[q.kind].total++;if(answers[q.id]===q.answer)result[q.kind].correct++});result.passed=result.rules.total===20&&result.signs.total===20&&result.rules.correct>=15&&result.signs.correct>=15;return result}
function validateBackup(input,bank){
 if(!input||input.version!==1||!input.records||typeof input.records!=='object'||Array.isArray(input.records))throw Error('This is not a supported progress backup.');
 const safe=empty();const ids=new Set(bank.map(q=>q.id));
 for(const [id,r] of Object.entries(input.records)){
  if(!ids.has(id))continue;
  if(!r||!['attempts','correct','wrong','streak','due'].every(k=>Number.isFinite(r[k])&&r[k]>=0)||!['attempts','correct','wrong','streak'].every(k=>Number.isInteger(r[k]))||r.correct+r.wrong!==r.attempts||r.streak>5||r.due>8640000000000000)throw Error('The backup contains invalid progress.');
  safe.records[id]={attempts:r.attempts,correct:r.correct,wrong:r.wrong,streak:r.streak,due:r.due,last:Number.isFinite(r.last)?r.last:0,lastCorrectDay:typeof r.lastCorrectDay==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(r.lastCorrectDay)?r.lastCorrectDay:null};
 }
 if(Array.isArray(input.exams)) safe.exams=input.exams.slice(-100).filter(e=>e&&Number.isFinite(e.date)&&['rules','signs'].every(k=>e[k]&&e[k].total===20&&Number.isInteger(e[k].correct)&&e[k].correct>=0&&e[k].correct<=20)).map(e=>({date:e.date,revision:Number.isInteger(e.revision)&&e.revision>0?e.revision:1,rules:{correct:e.rules.correct,total:20},signs:{correct:e.signs.correct,total:20},passed:e.rules.correct>=15&&e.signs.correct>=15}));
 return safe;
}
const api={DAY,empty,record,shuffle,unresolved,mastered,select,exam,grade,validateBackup};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StudyCore=api;
})(typeof window!=='undefined'?window:globalThis);
