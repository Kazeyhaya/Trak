import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { BottomNav } from "../componentes/bottom-nav";
import { PwaRegister } from "../componentes/pwa-register";
import { AuthProvider } from "../contextos/auth-context";
import { I18nProvider } from "../contextos/i18n-context";
import "./globals.css";

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading"
});

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body"
});

export const metadata: Metadata = {
  // Base para URLs absolutas de Open Graph (previa de links compartilhados).
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Trak | Organize filmes, séries, jogos e livros",
  description: "Acompanhe o que você assiste, joga e lê, em um só lugar.",
  applicationName: "Trak",
  appleWebApp: { capable: true, title: "Trak", statusBarStyle: "black-translucent" }
};

export const viewport: Viewport = {
  themeColor: "#06101c",
  colorScheme: "dark"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body>
        <AuthProvider>
          <I18nProvider>{children}</I18nProvider>
        </AuthProvider>
        <BottomNav />
        <PwaRegister />
      </body>
    </html>
  );
}
