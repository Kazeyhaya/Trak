"use client";

import { useEffect, useRef } from "react";

type TurnstileWidgetProps = {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (errorCode?: string | number) => void;
  theme?: "light" | "dark" | "auto";
  className?: string;
};

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
          callback?: (token: string) => void;
          "error-callback"?: (errorCode?: string | number) => void;
          "expired-callback"?: () => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

const SCRIPT_ID = "cf-turnstile-script";

export function TurnstileWidget({
  onVerify,
  onExpire,
  onError,
  theme = "dark",
  className = "turnstile-container"
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();

  // Mantém referências estáveis para evitar re-execução do efeito em re-render do pai
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onExpireRef.current = onExpire;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (!siteKey) {
      // Se não houver chave configurada (ex: dev local sem chaves), não bloqueia o fluxo.
      return;
    }

    let isMounted = true;

    function renderWidget() {
      if (!isMounted || !containerRef.current || !window.turnstile) {
        return;
      }
      // Evita renderizar novamente se já houver um widget ativo
      if (widgetIdRef.current) {
        return;
      }

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey!,
          theme,
          callback: (token) => {
            if (isMounted) onVerifyRef.current(token);
          },
          "expired-callback": () => {
            if (isMounted) onExpireRef.current?.();
          },
          "error-callback": (errorCode) => {
            if (isMounted) onErrorRef.current?.(errorCode);
          }
        });
        widgetIdRef.current = id;
      } catch {
        // ignora erro de inicializacao concorrente
      }
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = SCRIPT_ID;
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.onerror = () => {
          if (isMounted) onErrorRef.current?.("script_load_failed");
        };
        document.head.appendChild(script);
      }

      const checkInterval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(checkInterval);
          renderWidget();
        }
      }, 100);

      const timeout = setTimeout(() => {
        clearInterval(checkInterval);
        if (isMounted && !widgetIdRef.current) {
          onErrorRef.current?.("timeout");
        }
      }, 10000);

      return () => {
        isMounted = false;
        clearInterval(checkInterval);
        clearTimeout(timeout);
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // ignora
          }
          widgetIdRef.current = null;
        }
      };
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignora
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, theme]);

  if (!siteKey) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "65px",
        margin: "12px 0"
      }}
    />
  );
}
