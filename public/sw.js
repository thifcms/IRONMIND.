/**
 * Service Worker do IronMind.
 *
 * Antes disso era só um esqueleto (instalava/ativava mas não guardava
 * nada em cache) -- suficiente pro navegador aceitar instalar o PWA,
 * mas o app não funcionava offline de verdade, mesmo depois de
 * instalado. Numa academia com wifi ruim, é o pior cenário possível
 * pra um app de treino.
 *
 * Estratégia:
 * - index.html e o próprio sw.js: NUNCA cacheados aqui (o servidor já
 *   manda no-cache pra esses dois -- são eles que "apontam" pra versão
 *   certa do resto). Deixa passar direto pra rede.
 * - /assets/*: arquivos JS/CSS gerados pelo Vite com hash no nome
 *   (ex: index-D7cYJFGt.js) -- cache-first. Como o hash muda sempre
 *   que o conteúdo muda, é seguro cachear "pra sempre": nunca vai
 *   servir uma versão errada por engano.
 * - Resto (imagens, ícones, manifest): network-first com fallback pro
 *   cache -- tenta buscar atualizado quando tem internet, mas ainda
 *   funciona offline usando a última versão vista.
 * - Só GET, só mesma origem -- chamadas de API (Firebase, IronMind AI)
 *   passam direto, sem interceptar, pra nunca servir dado desatualizado
 *   ou quebrar CORS.
 */

const STATIC_CACHE = 'ironmind-static-v1';
const RUNTIME_CACHE = 'ironmind-runtime-v1';
const CURRENT_CACHES = [STATIC_CACHE, RUNTIME_CACHE];

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => !CURRENT_CACHES.includes(key)).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Só mesma origem, só GET -- resto passa direto sem interceptar.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // index.html e sw.js: sempre rede, nunca cache (ver comentário no topo).
  if (url.pathname.endsWith('/sw.js') || url.pathname.endsWith('.html')) return;

  const isHashedAsset = url.pathname.includes('/assets/');

  if (isHashedAsset) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(req, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, clone));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
