// Service worker : garde une copie de l'app sur le téléphone pour qu'elle
// s'ouvre sans connexion. À chaque nouvelle version, changer VERSION : les
// téléphones téléchargent alors les nouveaux fichiers et jettent les anciens.

const VERSION = 'msw-2.0.0';
const FICHIERS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/app.js',
  'js/db.js',
  'js/store.js',
  'js/money.js',
  'js/rates.js',
  'js/ui.js',
  'js/icons.js',
  'js/saisie.js',
  'js/installation.js',
  'js/ecrans/commun.js',
  'js/ecrans/accueil.js',
  'js/ecrans/operations.js',
  'js/ecrans/analyse.js',
  'js/ecrans/reglages.js',
  'assets/fonts/manrope.woff2',
  'assets/icons/icon.svg',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/maskable-512.png',
  'assets/icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Fichiers de l'app : d'abord la copie locale (instantané, marche hors ligne).
// Les taux de change, eux, ne passent pas par ici : ils vont toujours au réseau.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((r) => r || fetch(e.request).catch(() => caches.match('index.html'))),
  );
});
