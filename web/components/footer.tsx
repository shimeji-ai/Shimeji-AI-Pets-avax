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
      <div className="border-t border-primary-foreground/10 bg-primary">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-3 gap-10">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                  <Image
                    src="/logo.png"
                    alt="Shimeji Logo"
                    width={36}
                    height={36}
                  />
                </div>
                <span className="text-lg font-bold text-primary-foreground">
                  Shimeji Factory
                </span>
              </div>
              <p className="text-primary-foreground/60 text-sm max-w-xs mb-6 leading-relaxed">
                {isSpanish
                  ? "Compañeros animados con IA para tu navegador. Chatea, recibe avisos suaves o conecta un agente con herramientas online y onchain."
                  : "Animated AI companions for your browser. Chat, get gentle nudges, or connect an agent with online and onchain tools."}
              </p>
              <div className="flex gap-3">
                <Link
                  href="https://x.com/ShimejiFactory"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#FFCC66] via-[#FF9999] to-[#1159CC] p-[2px] shadow-[0_10px_22px_rgba(17,89,204,0.35)] transition-transform hover:-translate-y-0.5"
                  aria-label="Twitter"
                >
                  <span className="flex h-full w-full items-center justify-center rounded-[0.9rem] bg-[#0B0B14] text-[#FFCC66]">
                    <Twitter className="w-5 h-5" />
                  </span>
                </Link>
                <Link
                  href="#"
                  className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#FFCC66] via-[#FF9999] to-[#1159CC] p-[2px] shadow-[0_10px_22px_rgba(17,89,204,0.35)] transition-transform hover:-translate-y-0.5"
                  aria-label="Discord"
                >
                  <span className="flex h-full w-full items-center justify-center rounded-[0.9rem] bg-[#0B0B14] text-[#FFCC66]">
                    <MessageCircle className="w-5 h-5" />
                  </span>
                </Link>
                <Link
                  href="#"
                  className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#FFCC66] via-[#FF9999] to-[#1159CC] p-[2px] shadow-[0_10px_22px_rgba(17,89,204,0.35)] transition-transform hover:-translate-y-0.5"
                  aria-label="GitHub"
                >
                  <span className="flex h-full w-full items-center justify-center rounded-[0.9rem] bg-[#0B0B14] text-[#FFCC66]">
                    <Github className="w-5 h-5" />
                  </span>
                </Link>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4 text-sm text-primary-foreground">
                {isSpanish ? "Mantente informado" : "Stay Updated"}
              </h3>
              <UpdatesSubscribePopup
                buttonClassName="bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground text-sm"
                buttonVariant="ghost"
              />
            </div>

            <div>
              <h3 className="font-semibold mb-4 text-sm text-primary-foreground">
                {isSpanish ? "Navegación" : "Navigate"}
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/"
                    className="text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors"
                  >
                    {isSpanish ? "Inicio" : "Home"}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/factory"
                    className="text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors"
                  >
                    {isSpanish ? "Fábrica" : "Factory"}
                  </Link>
                </li>
                <li>
                  <Link
                    href="https://x.com/ShimejiFactory"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors"
                  >
                    X / Twitter
                  </Link>
                </li>
                <li>
                  <Link
                    href="/download"
                    className="text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors"
                  >
                    {isSpanish ? "Descargar" : "Download"}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Credits */}
          <div className="border-t border-primary-foreground/10 mt-10 pt-6 text-center">
            <p className="text-sm text-primary-foreground/60">
              {isSpanish ? "Creado por " : "Created by "}
              <Link
                href="https://x.com/LuloxDev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-foreground hover:underline"
              >
                @LuloxDev
              </Link>{" "}
              &{" "}
              <Link
                href="https://x.com/Kathonejo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-foreground hover:underline"
              >
                @Kathonejo
              </Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
