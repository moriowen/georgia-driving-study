(function(root){
'use strict';
function canonical(v){if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';return JSON.stringify(v)}
function validEvent(e,bank,C){
 if(!e||typeof e.id!=='string'||!/^[-a-zA-Z0-9_:]{8,100}$/.test(e.id)||!Number.isSafeInteger(e.ts)||e.ts<0||e.ts>8640000000000000)throw Error('Invalid sync event');
 if(!['answer','baseline','exam','reset'].includes(e.type))throw Error('Unknown sync event');
 const safe={id:e.id,ts:e.ts,type:e.type};
 if(e.type==='answer'||e.type==='baseline'){
  if(!bank.some(q=>q.id===e.qid))throw Error('Unknown synced question');safe.qid=e.qid;
  if(e.type==='answer'){if(typeof e.correct!=='boolean')throw Error('Invalid synced answer');safe.correct=e.correct}
  else{const b=C.validateBackup({version:1,records:{[e.qid]:e.record}},bank);safe.record=b.records[e.qid]}
 }
 if(e.type==='exam'){const b=C.validateBackup({version:1,records:{},exams:[e.exam]},bank);if(b.exams.length!==1)throw Error('Invalid synced exam');safe.exam=b.exams[0]}
 return safe;
}
function union(a,b,bank,C){const all=new Map();for(const event of [...a,...b]){const e=validEvent(event,bank,C);if(all.has(e.id)&&canonical(all.get(e.id))!==canonical(e))throw Error('Conflicting sync event identity');all.set(e.id,e)}return [...all.values()].sort((x,y)=>x.ts-y.ts||x.id.localeCompare(y.id))}
function derive(events,bank,C){
 const ordered=union([],events,bank,C);let reset=-1;for(let i=0;i<ordered.length;i++)if(ordered[i].type==='reset')reset=i;
 const active=ordered.slice(reset+1),result=C.empty(),baselineIds={};
 // Legacy snapshots cannot reveal overlapping attempts across devices. Retain the
 // most complete prior record per card; every new answer has a unique identity.
 for(const e of active.filter(e=>e.type==='baseline')){
  const p=result.records[e.qid],r=e.record;
  if(!p||r.attempts>p.attempts||r.attempts===p.attempts&&((r.last||0)>(p.last||0)||(r.last||0)===(p.last||0)&&e.id>baselineIds[e.qid])){result.records[e.qid]={...r};baselineIds[e.qid]=e.id}
 }
 for(const e of active){if(e.type==='answer')result.records[e.qid]=C.record(result.records[e.qid],e.correct,e.ts);if(e.type==='exam')result.exams.push(e.exam)}
 result.exams=[...new Map(result.exams.map(e=>[canonical(e),e])).values()];
 result.exams=result.exams.sort((a,b)=>a.date-b.date).slice(-100);return result;
}
const api={canonical,validEvent,union,derive};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StudySyncCore=api;
})(typeof window!=='undefined'?window:globalThis);
