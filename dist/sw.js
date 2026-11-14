'use strict';
const VERSION='bcabef0494ffd59c';
const PREFIX='peach-state:'+self.registration.scope+':';
const CACHE=PREFIX+VERSION;
const local=path=>new URL(path,self.registration.scope).href;
const FILES=['index.html','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await Promise.all(FILES.map(async path=>{
  const response=await fetch(local(path),{cache:'reload'});
  if(!response.ok||response.redirected)throw new Error('Could not save offline file: '+path);
  if(path==='index.html'&&!(response.headers.get('content-type')||'').includes('text/html'))throw new Error('Expected app HTML');
  await cache.put(local(path),response);
 }));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();
 await Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)));
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{
 if(event.data?.type==='OFFLINE_STATUS')event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  const ready=(await Promise.all(FILES.map(path=>cache.match(local(path))))).every(Boolean);
  event.ports[0]?.postMessage({ready,version:VERSION});
 })());
});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
 if(event.request.mode==='navigate'){
  // The app and its complete question bank are embedded in one cached HTML file.
  event.respondWith((async()=>{
   const cached=await caches.match(local('index.html'),{cacheName:CACHE});
   if(cached)return cached;
   return fetch(event.request);
  })());
 }else if(FILES.some(path=>url.href===local(path))){
  event.respondWith((async()=>await caches.match(url.href,{cacheName:CACHE})||fetch(event.request))());
 }
});
