const CACHE='calendario-v13';
const IMG='calendario-img-v1';
const FUENTES='calendario-fuentes-v1';
const BASE=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png','./cargando.svg','./cargando-caida.svg','./cargando-letras.svg'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>Promise.all(BASE.map(u=>c.add(u).catch(()=>{})))));
  self.skipWaiting();
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>![CACHE,IMG,FUENTES].includes(x)).map(x=>caches.delete(x)))));
  self.clients.claim();
});

// Fotos y comprobantes de Drive: se guardan para verlos sin internet
async function imagen(req){
  const c=await caches.open(IMG);
  const hit=await c.match(req);
  if(hit) return hit;
  try{
    const r=await fetch(req);
    if(r && (r.ok || r.type==='opaque')) c.put(req,r.clone());
    return r;
  }catch(e){ return hit || Response.error(); }
}
// Tipografías: usa la guardada y actualiza en segundo plano
async function fuente(req){
  const c=await caches.open(FUENTES);
  const hit=await c.match(req);
  const red=fetch(req).then(r=>{ if(r && (r.ok||r.type==='opaque')) c.put(req,r.clone()); return r; }).catch(()=>hit);
  return hit || red;
}
// Archivos de la app: primero internet (para tener la última versión), si no hay, lo guardado
async function app(req){
  const c=await caches.open(CACHE);
  try{
    const r=await fetch(req);
    if(r && r.ok) c.put(req,r.clone());
    return r;
  }catch(e){
    return (await c.match(req,{ignoreSearch:true})) || (req.mode==='navigate' ? (await c.match('./index.html')) || (await c.match('./')) : Response.error());
  }
}

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET') return;
  const u=new URL(req.url);
  if(u.hostname==='drive.google.com' && u.pathname.startsWith('/thumbnail')) return e.respondWith(imagen(req));
  if(u.hostname.endsWith('googleusercontent.com')) return e.respondWith(imagen(req));
  if(u.hostname==='fonts.googleapis.com' || u.hostname==='fonts.gstatic.com') return e.respondWith(fuente(req));
  if(u.origin!==location.origin) return;
  e.respondWith(app(req));
});
