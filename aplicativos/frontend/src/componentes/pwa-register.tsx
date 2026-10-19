"use client";

import { useEffect } from "react";

// Registra o service worker (necessario para instalar o Trak como app).
// Em desenvolvimento fica desligado para nao servir arquivos antigos do cache.
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => undefined);
  }, []);

  return null;
}
