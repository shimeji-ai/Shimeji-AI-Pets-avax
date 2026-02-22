"use client";

import Link from "next/link";
import DownloadButton from "./download-button";
import { useLanguage } from "./language-provider";
import { ScrollAnimation } from "./scroll-animation";
import { useState } from "react";

const providers = [
  {
    id: "openrouter",
    titleEn: "OpenRouter (Recommended)",
    titleEs: "OpenRouter (Recomendado)",
    descriptionEn: "Fast cloud setup with one key.",
    descriptionEs: "Setup rápido en la nube con una sola key.",
    bestForEn: "Best for: fastest setup with many model options.",
    bestForEs: "Ideal para: setup más rápido con muchas opciones de modelos.",
    needsEn: ["OpenRouter account", "API key", "Model selection"],
    needsEs: ["Cuenta de OpenRouter", "API key", "Elegir modelo"],
    stepsEn: [
      "Open OpenRouter settings and create an API key.",
      "Extension: in popup set AI Brain = Standard and Provider = OpenRouter. Web: open the homepage Provider tab and choose OpenRouter.",
      "Paste the API key, choose a model, then save (extension or web).",
    ],
    stepsEs: [
      "Abrí OpenRouter y creá una API key.",
      "Extensión: en el popup poné Cerebro AI = Standard y Proveedor = OpenRouter. Web: abrí la pestaña Proveedor en la homepage y elegí OpenRouter.",
      "Pegá la API key, elegí un modelo y guardá (extensión o web).",
    ],
    link: {
      href: "https://openrouter.ai/settings/keys",
      labelEn: "Get OpenRouter keys",
      labelEs: "Conseguir keys de OpenRouter",
    },
  },
  {
    id: "ollama",
    titleEn: "Ollama (Local)",
    titleEs: "Ollama (Local)",
    descriptionEn: "Private local models, no API key needed.",
    descriptionEs: "Modelos locales y privados, sin API key.",
    bestForEn: "Best for: local/offline use and privacy.",
    bestForEs: "Ideal para: uso local/offline y privacidad.",
    needsEn: ["Ollama installed", "One pulled model", "Local Ollama URL"],
    needsEs: ["Ollama instalado", "Un modelo descargado", "URL local de Ollama"],
    stepsEn: [
      "Install Ollama and pull a model (example: llama3.1).",
      "Extension: in popup set AI Brain = Standard and Provider = Ollama. Web: open the homepage Provider tab and choose Ollama.",
      "Set Ollama URL and model name, then save (extension or web).",
    ],
    stepsEs: [
      "Instalá Ollama y bajá un modelo (ejemplo: llama3.1).",
      "Extensión: en el popup poné Cerebro AI = Standard y Proveedor = Ollama. Web: abrí la pestaña Proveedor en la homepage y elegí Ollama.",
      "Configurá URL de Ollama y nombre del modelo, luego guardá (extensión o web).",
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
    needsEn: ["Running OpenClaw gateway", "Gateway WebSocket URL", "Gateway token"],
    needsEs: ["Gateway OpenClaw activo", "URL WebSocket del gateway", "Token del gateway"],
    stepsEn: [
      "Start your OpenClaw gateway.",
      "Get the gateway token with `openclaw config get gateway.auth.token`.",
      "Copy the WebSocket URL and token.",
      "Extension: in popup set AI Brain = AI Agent. Web: open Provider tab, choose OpenClaw, and click “I'm an agent” if you need agent integration instructions.",
      "Paste the gateway URL + token (and agent name if needed).",
    ],
    stepsEs: [
      "Iniciá tu gateway de OpenClaw.",
      "Obtené el token con `openclaw config get gateway.auth.token`.",
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
    highlight: true,
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
        <div className="max-w-6xl mx-auto mb-20">
          <div className="text-center mb-12">
           
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
              {isSpanish ? "Elegí tu Cerebro AI" : "Choose your AI Brain"}
            </h2>
           
          </div>

          <div className="neural-card rounded-3xl p-6 sm:p-8">
            <div className="flex flex-wrap gap-3 mb-6">
              {providers.map(provider => {
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
              className="rounded-2xl border border-white/10 p-6 sm:p-8 transition-all duration-300 animate-in fade-in"
            >
              <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                <h3 className="text-2xl font-semibold text-foreground">
                  {isSpanish ? activeProvider.titleEs : activeProvider.titleEn}
                </h3>
                <span className="text-xs px-3 py-1 rounded-full neural-outline text-muted-foreground font-mono">
                  {isSpanish ? `${activeProvider.stepsEs.length} pasos` : `${activeProvider.stepsEn.length} steps`}
                </span>
              </div>

              <p className="text-muted-foreground mb-2">
                {isSpanish ? activeProvider.descriptionEs : activeProvider.descriptionEn}
              </p>
              <p className="text-sm text-foreground/80 mb-5">
                {isSpanish ? activeProvider.bestForEs : activeProvider.bestForEn}
              </p>

              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-mono mb-3">
                  {isSpanish ? "Necesitás" : "You need"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(isSpanish ? activeProvider.needsEs : activeProvider.needsEn).map(item => (
                    <span key={item} className="text-xs rounded-full border border-white/10 px-3 py-1 text-foreground/80">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 text-sm text-foreground/80">
                {(isSpanish ? activeProvider.stepsEs : activeProvider.stepsEn).map(item => (
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
            </div>
          </div>
        </div>
      </ScrollAnimation>

      <ScrollAnimation variants={variants}>
        <div className="max-w-5xl mx-auto mb-20">
          <div className="neural-card rounded-3xl p-10 text-center">
            <p className="uppercase tracking-[0.3em] text-xs text-muted-foreground font-mono mb-4">
              {isSpanish ? "Aspectos personalizados" : "Custom Looks"}
            </p>
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight mb-4">
              {isSpanish ? "Desbloqueá apariencias únicas" : "Unlock unique looks"}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              {isSpanish
                ? "Conseguí un Shimeji NFT en el Factory para acceder a skins exclusivos y personalizar tu shimeji."
                : "Grab a Shimeji NFT in the Factory to access exclusive skins and personalize your shimeji."}
            </p>
            <div className="flex justify-center">
              <DownloadButton href="/factory" labelEn="GO TO FACTORY" labelEs="IR AL FACTORY" />
            </div>
          </div>
        </div>
      </ScrollAnimation>

      <ScrollAnimation variants={variants}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="uppercase tracking-[0.3em] text-xs text-muted-foreground font-mono mb-4">
              {isSpanish ? "Opciones" : "Settings"}
            </p>
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
              {isSpanish ? "Qué hace cada ajuste" : "What each setting does"}
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {configReference.map((item, index) => (
              <div
                key={index}
                className={[
                  "neural-card rounded-2xl p-6",
                  item.highlight ? "ring-1 ring-[var(--brand-accent)]/60 shadow-[0_0_28px_rgba(123,92,255,0.3)]" : "",
                ]
                  .join(" ")
                  .trim()}
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
