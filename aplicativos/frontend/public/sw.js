// Service worker do Trak.
// - Arquivos estaticos do Next (/_next/static) e imagens: cache-first (sao versionados).
// - Navegacao: network-first, com a pagina /offline quando nao ha conexao.
// - Chamadas a API e paginas pessoais nunca sao servidas do cache.

const VERSAO = "trak-v1";
const CACHE_ESTATICO = `${VERSAO}-estatico`;
const PAGINA_OFFLINE = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_ESTATICO)
      .then((cache) => cache.addAll([PAGINA_OFFLINE]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((chave) => !chave.startsWith(VERSAO)).map((chave) => caches.delete(chave))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match(PAGINA_OFFLINE)) || Response.error())
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/pwa-icon/")) {
    event.respondWith(
      caches.match(request).then(
        (emCache) =>
          emCache ||
          fetch(request).then((resposta) => {
            if (resposta.ok) {
              const copia = resposta.clone();
              caches.open(CACHE_ESTATICO).then((cache) => cache.put(request, copia));
            }
            return resposta;
          })
      )
    );
  }
});
