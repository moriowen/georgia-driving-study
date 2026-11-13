(function(){
'use strict';
const status=document.getElementById('offline-status');
const install=document.getElementById('install-app');
const help=document.getElementById('install-help');
let promptEvent;
function show(message){status.textContent=message}
install.addEventListener('click',async()=>{
 if(promptEvent){const p=promptEvent;promptEvent=null;await p.prompt();await p.userChoice;install.hidden=true}
 else{help.hidden=!help.hidden}
});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event;install.textContent='Install on your phone';install.hidden=false});
window.addEventListener('appinstalled',()=>{install.hidden=true;help.hidden=true});
if(location.protocol==='file:'){show('Offline file · all questions included');install.hidden=true;return}
if(!('serviceWorker' in navigator)){show('Offline saving is unavailable in this browser.');return}
show('Saving questions for offline use…');
function check(worker){
 if(!worker)return;
 const channel=new MessageChannel();
 channel.port1.onmessage=event=>{channel.port1.close();show(event.data.ready?'Ready offline · all 330 questions saved':'Offline download incomplete. Reconnect and reopen the app.')};
 worker.postMessage({type:'OFFLINE_STATUS'},[channel.port2]);
}
navigator.serviceWorker.addEventListener('controllerchange',()=>check(navigator.serviceWorker.controller));
navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(async registration=>{
 const worker=registration.installing||registration.waiting;
 if(worker)worker.addEventListener('statechange',()=>{
  if(worker.state==='activated')check(registration.active);
  if(worker.state==='redundant')show('Could not save offline. Reconnect and reopen the app.');
 });
 // An installed worker can already serve offline while an update downloads.
 if(registration.active)check(registration.active);
 const ready=await navigator.serviceWorker.ready;check(ready.active);
}).catch(()=>show('Could not save offline. Reconnect and reopen the app.'));
})();
