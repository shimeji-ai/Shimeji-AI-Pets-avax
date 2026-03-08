"use client";

import { ScrollAnimation } from "./scroll-animation";
import { useLanguage } from "./language-provider";
import Link from "next/link";
import DownloadButton from "./download-button";
import { useState } from "react";
import { ArrowRight, PlayCircle, Wand2 } from "lucide-react";
import { ANIMATION_GUIDE_PATH, CHARACTER_CREATOR_PATH } from "@/lib/shimeji-sprite-spec";

const providers = [
  {
    id: "openrouter",
    titleEn: "OpenRouter (Recommended)",
    titleEs: "OpenRouter (Recomendado)",
    descriptionEn: "Fast cloud setup with one key.",
    descriptionEs: "Setup rápido en la nube con una sola key.",
    bestForEn: "Best for: fastest setup with many model options.",
    bestForEs: "Ideal para: setup más rápido con muchas opciones de modelos.",
    
    stepsEn: [
      "Open Router settings and create an API key.",
      "Extension: in popup set AI Brain = Standard and Provider = OpenRouter. Web: open the homepage Provider tab and choose OpenRouter.",
      "Paste the API key and click your Shimeji to talk (extension or web).",
    ],
    stepsEs: [
      "Abrí OpenRouter y creá una API key.",
      "Extensión: en el popup poné Cerebro AI = Standard y Proveedor = OpenRouter. Web: abrí la pestaña Proveedor en la homepage y elegí OpenRouter.",
      "Pegá la API key y hacé click en tu Shimeji para hablarle (extensión o web).",
    ],
    link: { href: "https://openrouter.ai/settings/keys", labelEn: "Get OpenRouter keys", labelEs: "Conseguir keys de OpenRouter" },
  },
  {
    id: "ollama",
    titleEn: "Ollama (Local)",
    titleEs: "Ollama (Local)",
    descriptionEn: "Private local models, no API key needed.",
    descriptionEs: "Modelos locales y privados, sin API key.",
    bestForEn: "Best for: local/offline use and privacy.",
    bestForEs: "Ideal para: uso local/offline y privacidad.",
    
    stepsEn: [
      "Install Ollama and pull a model (example: llama3.1).",
      "Extension: in popup set AI Brain = Standard and Provider = Ollama. Web: open the homepage Provider tab and choose Ollama.",
      "Set Ollama URL and click your Shimeji to talk (extension or web).",
    ],
    stepsEs: [
      "Instalá Ollama y bajá un modelo (ejemplo: llama3.1).",
      "Extensión: en el popup poné Cerebro AI = Standard y Proveedor = Ollama. Web: abrí la pestaña Proveedor en la homepage y elegí Ollama.",
      "Configurá URL de Ollama y hacé click en tu Shimeji para hablarle (extensión o web).",
    ],
    link: { href: "https://ollama.com", labelEn: "Download Ollama", labelEs: "Descargar Ollama" },
  },
  {
    id: "openclaw",
    titleEn: "OpenClaw (Agent)",
    titleEs: "OpenClaw (Agente)",
    descriptionEn: "Agent mode connected through your OpenClaw gateway.",
    descriptionEs: "Modo agente conectado mediante tu gateway de OpenClaw.",
    bestForEn: "Best for: actions and tools beyond normal chat.",
    bestForEs: "Ideal para: acciones y herramientas más allá del chat.",
    
    stepsEn: [
      "Start your OpenClaw gateway.",
      "Copy the WebSocket URL and token.",
      "Extension: in popup set AI Brain = AI Agent. Web: open Provider tab, choose OpenClaw, and click “I'm an agent” if you need agent integration instructions.",
      "Paste the gateway URL + token (and agent name if needed).",
    ],
    stepsEs: [
      "Iniciá tu gateway de OpenClaw.",
      "Copiá la URL WebSocket y token.",
      "Extensión: en el popup poné Cerebro AI = AI Agent. Web: abrí la pestaña Proveedor, elegí OpenClaw y hacé click en “Soy un agente” si necesitás instrucciones de integración.",
      "Pegá la URL del gateway + token (y nombre del agente si hace falta).",
    ],
    link: { href: "https://github.com/openclaw/openclaw", labelEn: "Setup OpenClaw", labelEs: "Configurar OpenClaw" },
  },
];

const configReference: Array<{
  emoji: string;
  titleEn: string;
  titleEs: string;
  contentEn: string;
  contentEs: string;
  highlight?: boolean;
}> = [
  {
    emoji: "🎭",
    titleEn: "Character",
    titleEs: "Personaje",
    contentEn: "Choose which shimeji appears on screen. Each character has its own animations.",
    contentEs: "Elegí qué shimeji aparece en pantalla. Cada personaje tiene sus propias animaciones.",
  },
  {
    emoji: "📏",
    titleEn: "Size",
    titleEs: "Tamaño",
    contentEn: "Controls how big the shimeji looks on your screen.",
    contentEs: "Controla qué tan grande se ve el shimeji en tu pantalla.",
  },
  {
    emoji: "✅",
    titleEn: "Active",
    titleEs: "Activo",
    contentEn: "Turns this shimeji on or off everywhere.",
    contentEs: "Prende o apaga este shimeji en todas las páginas.",
  },
  {
    emoji: "💬",
    titleEn: "Personality",
    titleEs: "Personalidad",
    contentEn: "Sets the tone of voice and behavior for chats.",
    contentEs: "Define el tono y el comportamiento al chatear.",
  },
  {
    emoji: "🧠",
    titleEn: "AI Brain",
    titleEs: "Cerebro AI",
    contentEn: "Standard uses OpenRouter or Ollama. Agent uses OpenClaw tools.",
    contentEs: "Standard usa OpenRouter u Ollama. Agent usa herramientas de OpenClaw.",
  },
  {
    emoji: "🧩",
    titleEn: "Provider",
    titleEs: "Proveedor",
    contentEn: "Choose OpenRouter (cloud) or Ollama (local) for Standard mode.",
    contentEs: "Elegí OpenRouter (nube) u Ollama (local) en modo Standard.",
  },
  {
    emoji: "🔑",
    titleEn: "API Key",
    titleEs: "API Key",
    contentEn: "Paste your OpenRouter key here so the shimeji can speak.",
    contentEs: "Pegá tu key de OpenRouter para que el shimeji pueda hablar.",
  },
  {
    emoji: "🧪",
    titleEn: "Model",
    titleEs: "Modelo",
    contentEn: "Pick the model for chat. OpenRouter lists many; Ollama needs the exact name.",
    contentEs: "Elegí el modelo de chat. OpenRouter lista muchos; Ollama necesita el nombre exacto.",
  },
  {
    emoji: "🔔",
    titleEn: "Notifications & Volume",
    titleEs: "Notificaciones y Volumen",
    contentEn: "Notification sounds and their volume.",
    contentEs: "Notificaciones y su volumen.",
  },
  {
    emoji: "🗣️",
    titleEn: "Read Aloud",
    titleEs: "Leer en voz alta",
    contentEn: "Turns on text-to-speech so replies are spoken.",
    contentEs: "Activa la lectura en voz alta de las respuestas.",
  },
  {
    emoji: "🎙️",
    titleEn: "Open Mic",
    titleEs: "Micrófono abierto",
    contentEn: "Hands-free mode: listens and replies when you speak.",
    contentEs: "Modo manos libres: escucha y responde cuando hablás.",
  },
  {
    emoji: "🔁",
    titleEn: "Relay",
    titleEs: "Relay",
    contentEn: "Lets shimejis pass messages between each other.",
    contentEs: "Permite que los shimejis se pasen mensajes entre sí.",
  },
  {
    emoji: "🎨",
    titleEn: "Chat Style",
    titleEs: "Estilo de chat",
    contentEn: "Theme color, background style, font size, and width of the bubble.",
    contentEs: "Color del tema, estilo de fondo, tamaño de fuente y ancho de burbuja.",
  },
  {
    emoji: "🔒",
    titleEn: "Security",
    titleEs: "Seguridad",
    contentEn: "Use a Master Key to encrypt your keys and lock the popup.",
    contentEs: "Usá una Master Key para encriptar tus keys y bloquear el popup.",
  },
  {
    emoji: "🧿",
    titleEn: "Theme",
    titleEs: "Tema",
    contentEn: "Changes only the popup look (not the on-page shimeji).",
    contentEs: "Cambia solo el look del popup (no del shimeji en la página).",
  },
];

export function HelpSection() {
  const { isSpanish } = useLanguage();
  const [selectedProvider, setSelectedProvider] = useState(providers[0].id);
  const activeProvider = providers.find(provider => provider.id === selectedProvider) ?? providers[0];
  const variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } },
  };

  return (
    <section id="help" className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <ScrollAnimation variants={variants}>
        <div className="w-full mx-auto mb-20">
          <div className="mb-6">
            <div className="mb-3">
              <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/70">
                {isSpanish ? "Creación y NFT" : "Creation and NFT"}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="neural-card rounded-3xl border border-cyan-300/15 p-8 sm:p-10">
                <PlayCircle className="mb-4 h-8 w-8 text-cyan-300/70" />
                <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {isSpanish ? "Animaciones y preview" : "Animations and preview"}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                  {isSpanish
                    ? "Mirá la guía de animación y probá cómo se ve un personaje antes de mintearlo."
                    : "Open the animation guide and preview how a character looks before minting it."}
                </p>
                <div className="mt-6">
                  <Link
                    href={ANIMATION_GUIDE_PATH}
                    className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/15 px-5 py-2.5 text-sm font-medium text-foreground transition-all hover:border-cyan-400/50 hover:bg-cyan-400/25 hover:shadow-[0_0_16px_rgba(103,232,249,0.15)]"
                  >
                    <ArrowRight className="h-4 w-4" />
                    {isSpanish ? "Guía de animaciones" : "Animation guide"}
                  </Link>
                </div>
              </div>

              <div className="neural-card rounded-3xl border border-emerald-300/15 p-8 sm:p-10">
                <Wand2 className="mb-4 h-8 w-8 text-emerald-300/70" />
                <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {isSpanish ? "Creación de NFT" : "NFT creation"}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                  {isSpanish
                    ? "Abrí la app de creación para cargar sprites localmente, validar el set requerido y recién después mintear, vender o subastar."
                    : "Open the creator app to load sprites locally, validate the required set, and then mint, sell, or auction."}
                </p>
                <div className="mt-6">
                  <Link
                    href={CHARACTER_CREATOR_PATH}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/15 px-5 py-2.5 text-sm font-medium text-foreground transition-all hover:border-emerald-400/50 hover:bg-emerald-400/25 hover:shadow-[0_0_16px_rgba(52,211,153,0.15)]"
                  >
                    <ArrowRight className="h-4 w-4" />
                    {isSpanish ? "Creador de personajes" : "Character creator"}
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Install + Unlock combined */}
            <div className="neural-card rounded-3xl p-8 sm:p-10">
              <div className="text-center mb-6">
                <h2 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight mb-2">
                  {isSpanish ? "Instalá" : "Install"}
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
                  {isSpanish
                    ? "Usá la web, la extensión de navegador o la aplicación."
                    : "Use the website, browser extension, or the app."}
                </p>
                <div className="flex justify-center mb-6">
                  <DownloadButton
                    href="/download"
                    labelEn="DOWNLOADS"
                    labelEs="DESCARGAS"
                  />
                </div>
              </div>

              <hr className="border-t border-white/6 my-4" />

              <div className="text-center mt-6">
                <h3 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-2">
                  {isSpanish
                    ? "Desbloqueá apariencias únicas"
                    : "Unlock unique looks"}
                </h3>
                <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
                  {isSpanish
                    ? "Adquirí un NFT en el marketplace para acceder a skins exclusivos."
                    : "Acquire an NFT in the marketplace to access exclusive skins."}
                </p>
                <div className="flex justify-center">
                  <DownloadButton
                    href="/marketplace"
                    labelEn="SEE MARKETPLACE"
                    labelEs="VER MERCADO"
                  />
                </div>
              </div>
            </div>

            {/* Right: Choose your AI Brain */}
            <div className="neural-card rounded-3xl p-6 sm:p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
                  {isSpanish ? "Elegí tu Cerebro AI" : "Choose your AI Brain"}
                </h2>
              </div>
              <div className="flex flex-wrap gap-3 mb-6 items-center justify-center">
                {providers.map((provider) => {
                  const isActive = provider.id === activeProvider.id;
                  return (
                    <button
                      key={provider.id}
                      type="button"
                      onClick={() => setSelectedProvider(provider.id)}
                      className={[
                        "px-4 py-2 rounded-full text-sm font-mono transition-all duration-300 border",
                        isActive
                          ? "bg-[var(--brand-accent)]/20 border-[var(--brand-accent)] text-foreground shadow-[0_0_24px_rgba(123,92,255,0.25)]"
                          : "border-white/10 text-muted-foreground hover:border-[var(--brand-accent)]/40 hover:text-foreground",
                      ].join(" ")}
                      aria-pressed={isActive}
                    >
                      {provider.id}
                    </button>
                  );
                })}
              </div>

              <div
                key={activeProvider.id}
                className="rounded-2xl transition-all duration-300 animate-in fade-in"
              >
              

                <p className="text-muted-foreground mb-2">
                  {isSpanish ? activeProvider.descriptionEs : activeProvider.descriptionEn}
                </p>
                <p className="text-sm text-foreground/80 mb-5">
                  {isSpanish ? activeProvider.bestForEs : activeProvider.bestForEn}
                </p>

               

                <div className="flex flex-col gap-3 text-sm text-foreground/80">
                  {(isSpanish ? activeProvider.stepsEs : activeProvider.stepsEn).map((item) => (
                    <span key={item} className="flex gap-3">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--brand-accent)]" />
                      <span>{item}</span>
                    </span>
                  ))}
                </div>

                <div className="mt-6 text-sm">
                  <Link
                    href={activeProvider.link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--brand-accent)] hover:text-white transition-colors"
                  >
                    {isSpanish ? activeProvider.link.labelEs : activeProvider.link.labelEn}
                  </Link>
                </div>

                {activeProvider.id === "openclaw" && (
                  <div className="mt-5 flex flex-col gap-2">
                    <button
                      type="button"
                      disabled
                      className="inline-flex w-fit items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-muted-foreground cursor-not-allowed opacity-60"
                    >
                      {isSpanish ? "Hosting gestionado (próximamente)" : "Managed hosting (coming soon)"}
                    </button>
                    <p className="text-xs text-muted-foreground">
                      {isSpanish
                        ? "Pronto ofreceremos hosting gestionado de OpenClaw para que no tengas que correrlo vos mismo."
                        : "We will soon offer managed OpenClaw hosting so you don't have to run it yourself."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </ScrollAnimation>

      <ScrollAnimation variants={variants}>
        <div className="w-full mx-auto">
          <div className="text-center mb-12">
            
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
              {isSpanish ? "Qué hace cada ajuste" : "What each setting does"}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {configReference.map((item, index) => (
              <div
                key={index}
                className={[
                  "neural-card rounded-2xl p-6",
                  item.highlight
                    ? "ring-1 ring-[var(--brand-accent)]/60 shadow-[0_0_28px_rgba(123,92,255,0.3)]"
                    : ""
                ].join(" ").trim()}
              >
                <div className="flex items-start gap-4">
                  <div className="text-2xl" aria-hidden="true">
                    {item.emoji}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {isSpanish ? item.titleEs : item.titleEn}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {isSpanish ? item.contentEs : item.contentEn}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollAnimation>
    </section>
  );
}
