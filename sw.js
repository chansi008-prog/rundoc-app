// 런닥 서비스 워커: 앱 파일과 해부도를 저장해 두어 신호가 약한 곳(트랙·산길)에서도 열리게 한다
const VERSION = "rundoc-v8";
const CORE = ["./", "index.html", "manifest.webmanifest", "img/front.jpg", "img/back.jpg", "img/side.jpg", "img/sole.jpg", "icons/icon-192-v3.png", "icons/icon-512-v3.png", "icons/apple-touch-icon-v3.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// 화면(index.html)은 새 버전을 먼저 받아 보고, 3초 안에 안 오면 저장본을 보여 준다
// 나머지 파일(그림·아이콘·글꼴)은 저장본을 먼저 보여 주고 뒤에서 새로 받아 둔다
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const same = url.origin === location.origin;
  if (!same && !url.host.endsWith("fonts.googleapis.com") && !url.host.endsWith("fonts.gstatic.com")) return;
  if (e.request.mode === "navigate") {
    e.respondWith(caches.open(VERSION).then(async c => {
      const net = fetch(e.request).then(r => { if (r.ok) c.put("index.html", r.clone()); return r; });
      const late = new Promise(res => setTimeout(res, 3000)).then(() => c.match("index.html"));
      const first = await Promise.race([net.catch(() => null), late]);
      return first || (await c.match("index.html")) || net;
    }));
    return;
  }
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(e.request);
    const net = fetch(e.request).then(r => { if (r.ok || r.type === "opaque") c.put(e.request, r.clone()); return r; });
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    return net;
  }));
});
