import type React from "react";
import { JetBrains_Mono, Nunito, Roboto, Space_Grotesk } from "next/font/google";
import "@rainbow-me/rainbowkit/styles.css";
import "@scaffold-ui/components/styles.css";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { ScaffoldEthAppWithProviders } from "~~/components/ScaffoldEthAppWithProviders";
import { LanguageProvider } from "~~/components/language-provider";
import { SiteShimejiMascot } from "~~/components/site-shimeji-mascot";
import { createPageMetadata } from "~~/lib/metadata";
import "~~/styles/globals.css";

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
    title: "Shimeji AI Pets on Ethereum | AI Desktop Pets & NFTs",
    description:
      "Animated desktop pets with AI chat, Ethereum wallet integration, and NFT-ready experiences.",
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
      var themes = ['neural', 'pink', 'kawaii'];
      var theme = themes[Math.floor(Math.random() * themes.length)];
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} ${nunito.variable} ${roboto.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ScaffoldEthAppWithProviders>
          <LanguageProvider>
            {children}
            <SiteShimejiMascot />
          </LanguageProvider>
        </ScaffoldEthAppWithProviders>
        <Analytics />
      </body>
    </html>
  );
}
