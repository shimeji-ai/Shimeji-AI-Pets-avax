import type React from "react";
import type { Metadata, Viewport } from "next";
import "@rainbow-me/rainbowkit/styles.css";
import {
  Space_Grotesk,
  JetBrains_Mono,
  Nunito,
  Roboto,
} from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { LanguageProvider } from "@/components/language-provider";
import { WalletProvider } from "@/components/wallet-provider";
import { SiteMochiMascot } from "@/components/site-mochi-mascot";
import { SiteMochiConfigPanel } from "@/components/site-mochi-config-panel";
import { SiteMochiProvider } from "@/components/site-mochi-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { createPageMetadata } from "@/lib/metadata";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
});
const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
});
const nunito = Nunito({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-nunito",
});
const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "Mochi | AI Desktop Pets & NFT Auctions",
    description:
      "Animated desktop pets with AI chat, AVAX NFT auctions, and wallet-powered experiences for collectors.",
    path: "/",
  }),
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/logo.png",
        type: "image/png",
      },
    ],
    apple: "/logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0f14",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeScript = `
    (function() {
      var themes = ['neural', 'pink', 'kawaii', 'pastel'];
      var theme = 'kawaii';
      var savedTheme = null;
      try { savedTheme = sessionStorage.getItem('mochi-theme-last'); } catch(e) {}
      if (savedTheme && themes.indexOf(savedTheme) !== -1) {
        theme = savedTheme;
      }
      try { sessionStorage.setItem('mochi-theme-last', theme); } catch(e) {}
      document.documentElement.setAttribute('data-theme', theme);
      if (document.body) {
        document.body.setAttribute('data-theme', theme);
      } else {
        document.addEventListener('DOMContentLoaded', function() {
          document.body.setAttribute('data-theme', theme);
        });
      }
    })();
  `;
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} ${nunito.variable} ${roboto.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <LanguageProvider>
          <WalletProvider>
            <ThemeProvider>
              <SiteMochiProvider>
                <Header />
                {children}
                <SiteMochiConfigPanel />
                <SiteMochiMascot />
              </SiteMochiProvider>
            </ThemeProvider>
          </WalletProvider>
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
