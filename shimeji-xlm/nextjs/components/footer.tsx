"use client";

import Link from "next/link";
import { Twitter, MessageCircle, Github } from "lucide-react";
import Image from "next/image";
import { UpdatesSubscribePopup } from "./updates-subscribe-popup";
import { useLanguage } from "./language-provider";

export function Footer() {
  const { isSpanish } = useLanguage();
  return (
    <footer>
      {/* Footer Links */}
      <div className="border-t border-white/10 bg-[#0b0f14]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-3 gap-10">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
                  <Image
                    src="/logo.png"
                    alt="Shimeji Logo"
                    width={36}
                    height={36}
                  />
                </div>
                <span className="text-lg font-semibold text-foreground">
                  Shimeji AI Pets
                </span>
              </div>
              <p className="text-muted-foreground text-sm max-w-xs mb-6 leading-relaxed">
                {isSpanish
                  ? "Mascotas animados con IA para tu navegador. Chatea, recibe avisos suaves o conecta un agente con herramientas online y onchain."
                  : "Animated AI pets for your browser. Chat, get gentle nudges, or connect an agent with online and onchain tools."}
              </p>
              <div className="flex gap-3">
                <Link
                  href="https://x.com/ShimejiFactory"
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
                  href="#"
                  className="w-11 h-11 rounded-2xl p-[2px] neural-outline transition-transform hover:-translate-y-0.5"
                  aria-label="Discord"
                >
                  <span className="flex h-full w-full items-center justify-center rounded-[0.9rem] bg-[#0b0f14] text-[var(--brand-accent)]">
                    <MessageCircle className="w-5 h-5" />
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
              <h3 className="font-semibold mb-4 text-sm text-foreground">
                {isSpanish ? "Mantente informado" : "Stay Updated"}
              </h3>
              <UpdatesSubscribePopup
                buttonClassName="footer-updates-button bg-white/5 hover:bg-white/10 text-sm"
                buttonVariant="ghost"
              />
            </div>

            <div>
              <h3 className="font-semibold mb-4 text-sm text-foreground">
                {isSpanish ? "Navegación" : "Navigate"}
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isSpanish ? "Inicio" : "Home"}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auction"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isSpanish ? "Subasta" : "Auction"}
                  </Link>
                </li>
                <li>
                  <Link
                    href="https://x.com/ShimejiFactory"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    X / Twitter
                  </Link>
                </li>
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
                    href="/privacy"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isSpanish ? "Privacidad" : "Privacy"}
                  </Link>
                </li>
                <li>
                  <Link
                    href="https://github.com/luloxi/Shimeji-AI-Pets"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    GitHub
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
