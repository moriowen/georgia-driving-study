'use strict';
const VERSION='ea5448a2c628e38c';
const PREFIX='peach-state:'+self.registration.scope+':';
const CACHE=PREFIX+VERSION;
const local=path=>new URL(path,self.registration.scope).href;
const FILES=['index.html','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await Promise.all(FILES.map(async path=>{
  const response=await fetch(local(path),{cache:'no-store'});
  if(!response.ok||response.redirected)throw new Error('Could not save offline file: '+path);
  if(path==='index.html'&&(!(response.headers.get('content-type')||'').includes('text/html')||!(await response.clone().text()).includes('id="question-bank"')))throw new Error('Expected app HTML');
  await cache.put(local(path),response);
 }));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();
 await Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)));
 await self.clients.claim();
})()));
// Old releases never acknowledged updates and could stay on an obsolete page.
// Ask the page before refreshing: current releases acknowledge and show a button.
const checkedClients=new Set();
async function recoverLegacyPage(client){
 if(!client||!client.url?.startsWith(self.registration.scope)||!client.navigate||typeof MessageChannel==='undefined'||checkedClients.has(client.id))return;
 checkedClients.add(client.id);
 const acknowledged=await new Promise(resolve=>{
  const channel=new MessageChannel();
  const timer=setTimeout(()=>{channel.port1.close();resolve(false)},1000);
  channel.port1.onmessage=()=>{clearTimeout(timer);channel.port1.close();resolve(true)};
  try{client.postMessage({type:'APP_VERSION_CHECK'},[channel.port2])}catch{clearTimeout(timer);channel.port1.close();resolve(true)}
 });
 if(!acknowledged)try{await client.navigate(client.url)}catch{}
}
self.addEventListener('message',event=>{
 if(event.data?.type==='OFFLINE_STATUS')event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  const ready=(await Promise.all(FILES.map(path=>cache.match(local(path))))).every(Boolean);
  event.ports[0]?.postMessage({ready,version:VERSION});
  await recoverLegacyPage(event.source);
 })());
});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
 if(event.request.mode==='navigate'){
  event.respondWith((async()=>{
   let expired=false,timer;
   const controller=new AbortController();
   const fresh=(async()=>{
    const response=await fetch(local('index.html'),{cache:'no-store',signal:controller.signal});
    if(!response.ok||response.redirected||!(response.headers.get('content-type')||'').includes('text/html')||!(await response.clone().text()).includes('id="question-bank"'))throw Error('App update unavailable');
    if(expired)throw Error('App update timed out');
    const cache=await caches.open(CACHE);await cache.put(local('index.html'),response.clone());return response;
   })();
   try{
    return await Promise.race([fresh,new Promise((_,reject)=>{timer=setTimeout(()=>{expired=true;controller.abort();reject(Error('Network timeout'))},3000)})]);
   }catch(error){
    const cached=await caches.match(local('index.html'),{cacheName:CACHE});if(cached)return cached;throw error;
   }finally{clearTimeout(timer)}
  })());
 }else if(FILES.some(path=>url.href===local(path))){
  event.respondWith((async()=>await caches.match(url.href,{cacheName:CACHE})||fetch(event.request))());
 }
});
