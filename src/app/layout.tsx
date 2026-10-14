import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = "https://rodinyamert48.github.io/karcep/";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "KârCep — E-ticaret Kâr Hesaplayıcı",
    template: "%s · KârCep",
  },
  description:
    "Türkiye'deki e-ticaret satıcıları için ücretsiz kâr, komisyon, KDV ve başa baş fiyatı hesaplayıcı. Veriler yalnızca tarayıcınızda saklanır, hiçbir sunucuya gönderilmez.",
  applicationName: "KârCep",
  keywords: ["e-ticaret", "kâr hesaplama", "komisyon hesaplama", "Trendyol komisyon", "Hepsiburada komisyon", "KDV hesaplama", "başa baş fiyatı"],
  authors: [{ name: "KârCep" }],
  alternates: { canonical: "./" },
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: "icon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "KârCep",
    title: "KârCep — E-ticaret Kâr Hesaplayıcı",
    description: "Ücretsiz, tarayıcıda çalışan e-ticaret kârlılık hesaplayıcısı. Hesap gerekmez, veriler yalnızca cihazınızda saklanır.",
    url: "./",
  },
  twitter: {
    card: "summary",
    title: "KârCep — E-ticaret Kâr Hesaplayıcı",
    description: "Ücretsiz, tarayıcıda çalışan e-ticaret kârlılık hesaplayıcısı.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a1420" },
    { media: "(prefers-color-scheme: light)", color: "#f6f8fb" },
  ],
};

// Tema, ilk boyamadan önce uygulanır: kullanıcının kayıtlı tercihi "light"/"dark" ise onu,
// yoksa ("system" veya hiç kayıt yoksa) işletim sisteminin tercihini kullanır.
// Bu sayede yanlış temayla kısa süreliğine yanıp sönme (FOUC) oluşmaz.
const themeScript = `try{
var s=JSON.parse(localStorage.getItem("karcep:settings")||"null");
var t=s&&s.theme;
var resolved=(t==="light"||t==="dark")?t:(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");
document.documentElement.dataset.theme=resolved;
}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <noscript>
          <p style={{ padding: 16 }}>KârCep’i kullanmak için JavaScript’i etkinleştirin.</p>
        </noscript>
        {children}
      </body>
    </html>
  );
}
