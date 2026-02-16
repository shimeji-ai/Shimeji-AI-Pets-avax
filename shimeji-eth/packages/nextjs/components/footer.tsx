"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "./language-provider";
import { Github, Twitter } from "lucide-react";

export function Footer() {
  const { isSpanish } = useLanguage();
  return (
    <footer>
      {/* Footer Links */}
      <div className="border-t border-white/10 bg-[#0b0f14]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
                  <Image src="/logo.png" alt="Shimeji Logo" width={36} height={36} />
                </div>
                <span className="text-lg font-semibold text-foreground">Shimeji AI Pets</span>
              </div>
             
              <div className="flex gap-3">
                <Link
                  href="https://x.com/ShimejiAIPets"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 rounded-2xl p-[2px] neural-outline transition-transform hover:-translate-y-0.5"
                  aria-label="Twitter"
                >
                  <span className="flex h-full w-full items-center justify-center rounded-[0.9rem] bg-[#0b0f14] text-[var(--brand-accent)]">
                    <Twitter className="w-5 h-5" />
                  </span>
                </Link>
                <Link
                  href="https://github.com/luloxi/Shimeji-AI-Pets"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 rounded-2xl p-[2px] neural-outline transition-transform hover:-translate-y-0.5"
                  aria-label="GitHub"
                >
                  <span className="flex h-full w-full items-center justify-center rounded-[0.9rem] bg-[#0b0f14] text-[var(--brand-accent)]">
                    <Github className="w-5 h-5" />
                  </span>
                </Link>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4 text-sm text-foreground">{isSpanish ? "Navegación" : "Navigate"}</h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/download"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isSpanish ? "Descargar" : "Download"}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#auction"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isSpanish ? "Subasta" : "Auction"}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/collection"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isSpanish ? "Colección" : "Collection"}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/help"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isSpanish ? "Ayuda" : "Help"}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isSpanish ? "Privacidad" : "Privacy"}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Credits */}
          <div className="border-t border-white/10 mt-10 pt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {isSpanish ? "Creado por " : "Created by "}
              <Link
                href="https://x.com/Kathonejo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:underline"
              >
                @Kathonejo
              </Link>{" "}
              &{" "}
              <Link
                href="https://x.com/LuloxDev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:underline"
              >
                @LuloxDev
              </Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
