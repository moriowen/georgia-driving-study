(function(root){
'use strict';
function create(opts){
 const {bank,C,storage,randomId,fetcher,config,getState,apply,status}=opts;
 const S=opts.core||root.StudySyncCore,now=opts.now||Date.now;
 const base='peach-state-cloud-v1',prefix=base+'.event.',settingsKey=base+'.settings';
 let settings={},busy=null,timer=null,closed=false,message='Not connected',lastSynced=0;
 try{settings=JSON.parse(storage.getItem(settingsKey)||'{}')}catch{}
 function settingsSave(){storage.setItem(settingsKey,JSON.stringify(settings))}
 function entries(){const all=[];for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k?.startsWith(prefix)){const x=JSON.parse(storage.getItem(k));x.event=S.validEvent(x.event,bank,C);all.push(x)}}return all}
 function put(event,acked=false){event=S.validEvent(event,bank,C);const key=prefix+event.id,old=JSON.parse(storage.getItem(key)||'null');if(old&&S.canonical(old.event)!==S.canonical(event))throw Error('Conflicting stored event');storage.setItem(key,JSON.stringify({event,acked:acked||!!old?.acked}))}
 function emit(text){message=text;status?.({message,connected:!!settings.key,queued:entries().filter(e=>!e.acked).length,lastSynced})}
 function pending(){return entries().filter(e=>!e.acked).map(e=>e.event)}
 function hasConfig(){return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.url||'')&&!!config.publishableKey}
 function make(type,payload={},ts=now()){return S.validEvent({id:randomId(),type,ts,...payload},bank,C)}
 function seed(snapshot,after=0){
  const safe=C.validateBackup(snapshot,bank);
  for(const [qid,record] of Object.entries(safe.records))put(make('baseline',{qid,record},after||record.last||0));
  for(const exam of safe.exams)put(make('exam',{exam},after||exam.date));
 }
 // Store each immutable event under its own key. Concurrent tabs cannot
 // overwrite each other's distinct answers with a read/modify/write snapshot.
 if(!settings.initialized){seed(getState());settings.initialized=true;settings.cursor=0;settingsSave()}
 function schedule(){if(closed||!settings.key)return;if(timer)(opts.clearTimer||clearTimeout)(timer);timer=(opts.setTimer||setTimeout)(()=>{timer=null;flush()},1200)}
 function add(type,payload,ts){try{const e=make(type,payload,ts);put(e);schedule();emit(settings.key?'Changes saved · syncing soon':'Saved on this device · connect to sync');return e}catch{emit('Could not save sync history. Export a backup.');return null}}
 function answer(qid,correct,ts=now()){return add('answer',{qid,correct},ts)}
 function exam(result){return add('exam',{exam:result},result.date)}
 function snapshot(){return S.derive(entries().map(e=>e.event),bank,C)}
 async function flush(){
  if(closed||!settings.key||!hasConfig()){emit(settings.key?'Cloud sync is not configured':'Saved on this device · not connected');return false}
  if(busy)return busy;
  busy=(async()=>{
   try{
    emit('Syncing…');
    let more=true,passes=0;
    while(more||pending().length){
     if(++passes>100)throw Error('Sync interrupted');
     const batch=pending().slice(0,100),cursor=settings.cursor||0;
     const response=await fetcher(config.url+'/rest/v1/rpc/sync_driving_study',{
      method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},
      body:JSON.stringify({p_sync_key:settings.key,p_events:batch,p_after:cursor}),
      ...(typeof AbortSignal!=='undefined'&&AbortSignal.timeout?{signal:AbortSignal.timeout(15000)}:{})
     });
     if(!response.ok){const e=Error(response.status===401||response.status===403?'key':'network');throw e}
     const data=await response.json();
     if(!data||!Array.isArray(data.events)||!Number.isSafeInteger(data.cursor)||data.cursor<cursor||typeof data.more!=='boolean')throw Error('Invalid server response');
     const received=data.events.map(x=>{if(!Number.isSafeInteger(x.seq)||x.seq<=cursor||x.seq>data.cursor)throw Error('Invalid sync sequence');return S.validEvent(x.event,bank,C)});
     // Validate the whole merge before committing incoming data or advancing.
     S.union(entries().map(x=>x.event),received,bank,C);
     for(const e of received)put(e,true);
     for(const e of batch)put(e,true);
     settings.cursor=data.cursor;settingsSave();more=data.more;
     if(more&&data.cursor===cursor)throw Error('Sync cursor did not advance');
    }
    apply(snapshot());lastSynced=now();emit('Synced across devices');return true;
   }catch(e){emit(e.message==='key'?'Connection key not accepted. Check your private link.':'Sync unavailable · progress saved here and queued');return false}
   finally{busy=null}
  })();return busy;
 }
 async function connect(key){
  if(!/^[a-f0-9]{64}$/.test(key))throw Error('Use the complete private connection link or its 64-character key.');
  if(settings.key&&settings.key!==key)throw Error('Disconnect before using another connection key.');
  settings.key=key;settings.cursor=0;settingsSave();emit('Connecting…');const ok=await flush();if(!ok&&message.startsWith('Connection key not accepted')){settings.key=null;settings.cursor=0;settingsSave();emit('Connection key not accepted. Check your private link.')}return ok;
 }
 function disconnect(){settings.key=null;settings.cursor=0;settingsSave();if(timer)(opts.clearTimer||clearTimeout)(timer);emit('Disconnected · progress stays on this device')}
 function clearLocal(){const keys=[];for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k?.startsWith(prefix))keys.push(k)}keys.forEach(k=>storage.removeItem(k));settings.cursor=0;settingsSave()}
 function reset(){if(settings.key)return !!add('reset',{},now());clearLocal();emit('Local study history cleared');return true}
 function replace(snapshotValue,events){
  if(events){const restored=S.union([],events,bank,C);for(const e of restored)put(e);apply(snapshot());schedule();emit('Backup merged · sync queued');return}
  const at=now();if(settings.key)put(make('reset',{},at));else clearLocal();seed(snapshotValue,at+1);apply(snapshot());schedule();emit('Backup restored · sync queued');
 }
 function dump(){return entries().map(e=>e.event)}
 function stop(){closed=true;if(timer)(opts.clearTimer||clearTimeout)(timer)}
 emit(settings.key?'Connected · checking for changes':'Saved on this device · not connected');
 return {answer,exam,flush,connect,disconnect,reset,replace,dump,stop,snapshot,configured:hasConfig,connectionKey:()=>settings.key||'',info:()=>({message,connected:!!settings.key,queued:pending().length,lastSynced})};
}
const api={create};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DrivingSyncClient=api;
})(typeof window!=='undefined'?window:globalThis);
