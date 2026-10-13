import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KârCep — E-ticaret Kâr Hesaplayıcı",
  description:
    "Türkiye'deki e-ticaret satıcıları için ücretsiz kâr, komisyon, KDV ve başa baş fiyatı hesaplayıcı. Veriler yalnızca tarayıcınızda saklanır.",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a1020",
};

// Tema, ilk boyamadan önce uygulanır (açık tema seçen kullanıcıda koyu ekran yanıp sönmesini önler).
const themeScript = `try{var s=JSON.parse(localStorage.getItem("karcep:settings")||"null");if(s&&s.theme==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

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
