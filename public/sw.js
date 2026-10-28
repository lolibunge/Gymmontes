// Service worker: hace la app instalable, guarda lo estático para abrir más rápido
// y avisa del descanso / cambio de tramo cuando la app no está en pantalla (ver lib/bgnotify.ts).
const CACHE = 'gm-v1.2';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/logo.jpg', '/icons/icon-192.png'])));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/') || url.pathname === '/logo.jpg') {
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => {
      const copy = r.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return r;
    })));
  }
});

/* ---------- Avisos con la app en segundo plano ---------- */
let timers = [];
let wake = null; // resuelve la espera que mantiene vivo al service worker
const ICON = '/icons/icon-192.png';

function clearAll() {
  timers.forEach(clearTimeout);
  timers = [];
  if (wake) { wake(); wake = null; }
}

async function closeTag(tag) {
  const list = await self.registration.getNotifications({ tag });
  list.forEach((n) => n.close());
}

self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type === 'gm-cancel') {
    clearAll();
    e.waitUntil(Promise.all([closeTag('gm-ongoing'), closeTag('gm-alert')]));
    return;
  }
  if (d.type !== 'gm-plan') return;
  clearAll();
  const plan = d.plan || {};
  const skew = Date.now() - (d.now || Date.now());
  const alerts = (plan.alerts || []).map((a) => ({ ...a, at: a.at + skew })).filter((a) => a.at > Date.now() - 2000);
  const shows = [];
  if (plan.ongoing) {
    shows.push(self.registration.showNotification(plan.ongoing.title, {
      body: plan.ongoing.body, tag: 'gm-ongoing', icon: ICON, badge: ICON, silent: true, renotify: false, data: { url: '/rutina' },
    }));
  }
  // Mientras haya avisos pendientes, la espera mantiene vivo al service worker (Chrome da unos minutos;
  // la app le vuelve a mandar el plan cada 30 s mientras está en segundo plano, y eso lo renueva).
  const last = alerts.reduce((m, a) => Math.max(m, a.at), 0);
  const keep = new Promise((resolve) => {
    wake = resolve;
    alerts.forEach((a, k) => {
      timers.push(setTimeout(() => {
        self.registration.showNotification(a.title, {
          body: a.body, tag: 'gm-alert', icon: ICON, badge: ICON, renotify: true, requireInteraction: false,
          vibrate: [300, 120, 300, 120, 300], data: { url: '/rutina' },
        });
        if (k === alerts.length - 1) closeTag('gm-ongoing');
      }, Math.max(0, a.at - Date.now())));
    });
    timers.push(setTimeout(resolve, Math.max(0, last - Date.now()) + 3000));
  });
  e.waitUntil(Promise.all([...shows, keep]));
});

// Tocar la notificación vuelve a la app (a la pestaña que ya estaba abierta, si hay)
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = all.find((c) => new URL(c.url).origin === location.origin);
    if (open) return open.focus();
    return self.clients.openWindow(e.notification.data?.url || '/');
  })());
});
