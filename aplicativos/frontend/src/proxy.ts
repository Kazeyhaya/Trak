import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ehRotaPrivada } from "./lib/rotas";

// Renova a sessao do Supabase em cada navegacao e manda para o login quem
// abre uma rota privada sem estar autenticado.
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request });

  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  // getUser valida o token no Supabase (getSession apenas leria o cookie).
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user && ehRotaPrivada(request.nextUrl.pathname)) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/entrar";
    destino.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(destino);
  }

  return response;
}

export const config = {
  // Ignora arquivos estaticos, imagens, o service worker e o manifest.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|pwa-icon|sw.js|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"]
};
