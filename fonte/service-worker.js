/* Cache só de arquivos públicos estáticos. Nenhuma API, chave ou conversa. */
'use strict';
const CACHE='jarvis-mkxv-static-__CACHE_VERSION__';
const CORE=['./','./index.html','./assets/art/jarvis-hud.png','./assets/art/dum-e-u-hud.png','./assets/icons/icon-192.png','./assets/icons/icon-512.png'];
const scope=new URL(self.registration.scope);
function staticAsset(url){return url.origin===scope.origin&&!url.search&&url.pathname.startsWith(scope.pathname)&&(url.pathname===scope.pathname||/\/(?:index\.html|manifest\.webmanifest)$/.test(url.pathname)||/\/assets\/(?:art|icons)\/[a-z0-9-]+\.(?:png|svg)$/.test(url.pathname));}
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('jarvis-mkxv-static-')&&k!==CACHE).map(k=>caches.delete(k)))));});
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);if(req.method!=='GET'||!staticAsset(url))return;
  if(req.mode==='navigate')event.respondWith(fetch(req).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(req,copy)));}return response;}).catch(()=>caches.match(req).then(value=>value||caches.match('./index.html'))));
  else event.respondWith(caches.match(req).then(value=>value||fetch(req).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(req,copy)));}return response;})));
});
