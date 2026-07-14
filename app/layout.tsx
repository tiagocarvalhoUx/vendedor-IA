import type { Metadata, Viewport } from "next";
import "./globals.css";

// URL base para as tags OG/Twitter (absolutas). Na Vercel usa a URL do deploy;
// defina NEXT_PUBLIC_SITE_URL para fixar o domínio final de produção.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

const DESCRICAO =
  "Painel de controle e orquestração do vendedor de IA — carteira, pedidos, RAG anti-alucinação e metas em tempo real.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "VIA — AI Sales Automation",
    template: "%s · VIA",
  },
  description: DESCRICAO,
  applicationName: "VIA",
  // Favicon/apple-icon e OG/Twitter vêm das convenções de arquivo:
  // app/icon.png, app/apple-icon.png, app/opengraph-image.jpeg, app/twitter-image.jpeg
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "VIA — AI Sales Automation",
    title: "VIA — AI Sales Automation",
    description: DESCRICAO,
  },
  twitter: {
    card: "summary_large_image",
    title: "VIA — AI Sales Automation",
    description: DESCRICAO,
  },
};

// Mobile-first: viewport correto + suporte a safe-area em telas com notch.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#12211b" },
  ],
};

// Aplica o tema ANTES da pintura (evita flash claro→escuro). Lê a preferência
// salva; se não houver, segue a do sistema.
const THEME_INIT = `(function(){try{var t=localStorage.getItem('tema');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        {children}
      </body>
    </html>
  );
}
