import type React from "react";
import type { Metadata, Viewport } from "next";
import {
  Space_Grotesk,
  JetBrains_Mono,
  Nunito,
  Roboto,
} from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { LanguageProvider } from "@/components/language-provider";
import { FreighterProvider } from "@/components/freighter-provider";

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
  title: "Shimeji Factory | AI Companions for Your Browser",
  description:
    "Animated browser companions with AI chat. Choose a personality, talk to your shimeji, or connect an AI agent with onchain tools.",
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
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} ${nunito.variable} ${roboto.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <FreighterProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </FreighterProvider>
        <Analytics />
      </body>
    </html>
  );
}
