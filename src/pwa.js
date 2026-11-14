(function(){
'use strict';
const APP_BUILD='/* APP_BUILD */';
const status=document.getElementById('offline-status'),install=document.getElementById('install-app'),help=document.getElementById('install-help'),update=document.getElementById('update-app');
let promptEvent,registration,updateAvailable=false;
function show(message){status.textContent=message}
install.addEventListener('click',async()=>{if(promptEvent){const p=promptEvent;promptEvent=null;await p.prompt();await p.userChoice;install.hidden=true}else help.hidden=!help.hidden});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event;install.textContent='Install on your phone';install.hidden=false});
window.addEventListener('appinstalled',()=>{install.hidden=true;help.hidden=true});
if(location.protocol==='file:'){show('Offline file · all questions included');install.hidden=true;update.hidden=true;return}
if(!('serviceWorker' in navigator)){show('Offline saving is unavailable in this browser.');update.hidden=true;return}
// Acknowledge version checks so the worker knows this page can display updates.
navigator.serviceWorker.addEventListener('message',event=>{if(event.data?.type==='APP_VERSION_CHECK')event.ports[0]?.postMessage({build:APP_BUILD})});
function check(worker){
 if(!worker)return;
 const channel=new MessageChannel();
 channel.port1.onmessage=event=>{
  channel.port1.close();
  updateAvailable=!!event.data.ready&&event.data.version!==APP_BUILD;
  if(updateAvailable){show('App update ready · your progress is saved');update.textContent='Load latest version';update.classList.remove('secondary')}
  else{show(event.data.ready?'Ready offline · all 330 questions saved':'Offline download incomplete. Reconnect and try Check for updates.');update.textContent='Check for updates';update.classList.add('secondary')}
 };
 worker.postMessage({type:'OFFLINE_STATUS'},[channel.port2]);
}
async function waitForActivation(worker){
 if(!worker||worker.state==='activated')return;
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Update timed out')),15000);
  function changed(){if(worker.state==='activated'){clearTimeout(timer);resolve()}else if(worker.state==='redundant'){clearTimeout(timer);reject(Error('Update failed'))}}
  worker.addEventListener('statechange',changed);changed();
 });
}
update.addEventListener('click',async()=>{
 update.disabled=true;show('Loading the latest app · keeping your progress…');
 try{
  if(navigator.onLine===false)throw Error('Offline');
  registration=registration||await navigator.serviceWorker.getRegistration();
  if(registration){await registration.update();await waitForActivation(registration.installing||registration.waiting)}
  // The worker uses network-first HTML navigation; localStorage and sync keys stay.
  location.reload();
 }catch{show('Could not update. Reconnect and try again; progress is kept.');update.disabled=false}
});
show('Saving questions for offline use…');
navigator.serviceWorker.addEventListener('controllerchange',()=>check(navigator.serviceWorker.controller));
navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(async current=>{
 registration=current;
 function observe(worker){if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='activated')check(current.active);if(worker.state==='redundant')show('Could not save offline. Reconnect and try Check for updates.')})}
 observe(current.installing||current.waiting);current.addEventListener('updatefound',()=>observe(current.installing));
 if(current.active)check(current.active);
 const ready=await navigator.serviceWorker.ready;check(ready.active);
}).catch(()=>show('Could not save offline. Reconnect and try Check for updates.'));
window.addEventListener('online',()=>registration?.update().catch(()=>{}));
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&navigator.onLine!==false)registration?.update().catch(()=>{})});
})();
