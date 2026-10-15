import type { Metadata, Viewport } from "next";
import "@fontsource-variable/geologica";
import "./globals.css";

const SITE_URL = "https://rodinyamert48.github.io/karcep/";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "KârCep — E-ticaret Kâr Hesaplayıcı",
    template: "%s · KârCep",
  },
  description:
    "E-ticaret satıcıları için ücretsiz kâr, komisyon, KDV ve başa baş fiyatı hesaplayıcı. Veriler yalnızca tarayıcınızda saklanır.",
  applicationName: "KârCep",
  keywords: ["e-ticaret", "kâr hesaplama", "komisyon hesaplama", "KDV hesaplama", "başa baş fiyatı"],
  alternates: { canonical: "./" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "KârCep",
    title: "KârCep — E-ticaret Kâr Hesaplayıcı",
    description: "Ücretsiz, tarayıcıda çalışan kârlılık hesaplayıcısı. Hesap gerekmez; veriler cihazınızda kalır.",
    url: "./",
  },
  twitter: {
    card: "summary",
    title: "KârCep — E-ticaret Kâr Hesaplayıcı",
    description: "Ücretsiz, tarayıcıda çalışan kârlılık hesaplayıcısı.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#11100e",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body className="antialiased">
        <noscript>
          <p style={{ padding: 16 }}>KârCep’i kullanmak için JavaScript’i etkinleştirin.</p>
        </noscript>
        {children}
      </body>
    </html>
  );
}
