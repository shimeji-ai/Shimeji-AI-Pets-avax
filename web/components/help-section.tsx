"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollAnimation } from "./scroll-animation";
import { useLanguage } from "./language-provider";
import Link from "next/link";

const providers = [
  {
    id: "openrouter",
    titleEn: "OpenRouter (Recommended)",
    titleEs: "OpenRouter (Recomendado)",
    descriptionEn: "Cloud models with a single API key. Fastest setup.",
    descriptionEs: "Modelos en la nube con una sola API key. El setup más rápido.",
    stepsEn: [
      "Create an account and generate a key (free trial available).",
      "Extension popup → Standard → OpenRouter.",
      "Paste the key and choose a model.",
    ],
    stepsEs: [
      "Crea tu cuenta y genera una key (hay free trial).",
      "Popup de la extensión → Standard → OpenRouter.",
      "Pegá la key y elegí un modelo.",
    ],
    link: { href: "https://openrouter.ai/settings/keys", label: "OpenRouter Keys" },
  },
  {
    id: "ollama",
    titleEn: "Ollama (Local)",
    titleEs: "Ollama (Local)",
    descriptionEn: "Run models on your machine. Private and keyless.",
    descriptionEs: "Corré modelos en tu máquina. Privado y sin key.",
    stepsEn: [
      "Install Ollama and pull a model (e.g. llama3.1).",
      "Popup → Standard → Provider: Ollama.",
      "Set `Ollama URL` and your model name.",
    ],
    stepsEs: [
      "Instalá Ollama y bajá un modelo (ej. llama3.1).",
      "Popup → Standard → Provider: Ollama.",
      "Configurá `Ollama URL` y el nombre del modelo.",
    ],
    link: { href: "https://ollama.com", label: "Ollama" },
  },
  {
    id: "openclaw",
    titleEn: "OpenClaw (Agent)",
    titleEs: "OpenClaw (Agente)",
    descriptionEn: "Tool-augmented agent mode with a gateway.",
    descriptionEs: "Modo agente con herramientas vía gateway.",
    stepsEn: [
      "Run your OpenClaw gateway.",
      "Copy the WebSocket URL + token.",
      "Popup → AI Agent → paste URL + token.",
    ],
    stepsEs: [
      "Corré tu gateway de OpenClaw.",
      "Copiá la URL WebSocket + token.",
      "Popup → AI Agent → pegá URL + token.",
    ],
    link: { href: "https://openclaw.ai", label: "OpenClaw" },
  },
];

const configReference = [
  {
    titleEn: "Character",
    titleEs: "Personaje",
    contentEn: "Choose which shimeji appears on screen. Each character has its own animations.",
    contentEs: "Elegí qué shimeji aparece en pantalla. Cada personaje tiene sus propias animaciones.",
  },
  {
    titleEn: "Size",
    titleEs: "Tamaño",
    contentEn: "Controls how big the shimeji looks on your screen.",
    contentEs: "Controla qué tan grande se ve el shimeji en tu pantalla.",
  },
  {
    titleEn: "Active",
    titleEs: "Activo",
    contentEn: "Turns this shimeji on or off everywhere.",
    contentEs: "Prende o apaga este shimeji en todas las páginas.",
  },
  {
    titleEn: "Personality",
    titleEs: "Personalidad",
    contentEn: "Sets the tone of voice and behavior for chats.",
    contentEs: "Define el tono y el comportamiento al chatear.",
  },
  {
    titleEn: "AI Brain",
    titleEs: "Cerebro AI",
    contentEn: "Standard uses OpenRouter or Ollama. Agent uses OpenClaw tools.",
    contentEs: "Standard usa OpenRouter u Ollama. Agent usa herramientas de OpenClaw.",
  },
  {
    titleEn: "Provider",
    titleEs: "Proveedor",
    contentEn: "Choose OpenRouter (cloud) or Ollama (local) for Standard mode.",
    contentEs: "Elegí OpenRouter (nube) u Ollama (local) en modo Standard.",
  },
  {
    titleEn: "API Key",
    titleEs: "API Key",
    contentEn: "Paste your OpenRouter key here so the shimeji can speak.",
    contentEs: "Pegá tu key de OpenRouter para que el shimeji pueda hablar.",
  },
  {
    titleEn: "Model",
    titleEs: "Modelo",
    contentEn: "Pick the model for chat. OpenRouter lists many; Ollama needs the exact name.",
    contentEs: "Elegí el modelo de chat. OpenRouter lista muchos; Ollama necesita el nombre exacto.",
  },
  {
    titleEn: "Sound & Volume",
    titleEs: "Sonido y Volumen",
    contentEn: "Notification sound and its loudness.",
    contentEs: "Sonido de notificación y su volumen.",
  },
  {
    titleEn: "Read Aloud",
    titleEs: "Leer en voz alta",
    contentEn: "Turns on text-to-speech so replies are spoken.",
    contentEs: "Activa la lectura en voz alta de las respuestas.",
  },
  {
    titleEn: "Open Mic",
    titleEs: "Micrófono abierto",
    contentEn: "Hands-free mode: listens and replies when you speak.",
    contentEs: "Modo manos libres: escucha y responde cuando hablás.",
  },
  {
    titleEn: "Relay",
    titleEs: "Relay",
    contentEn: "Lets shimejis pass messages between each other.",
    contentEs: "Permite que los shimejis se pasen mensajes entre sí.",
  },
  {
    titleEn: "Chat Style",
    titleEs: "Estilo de chat",
    contentEn: "Theme color, background style, font size, and width of the bubble.",
    contentEs: "Color del tema, estilo de fondo, tamaño de fuente y ancho de burbuja.",
  },
  {
    titleEn: "Security",
    titleEs: "Seguridad",
    contentEn: "Use a Master Key to encrypt your keys and lock the popup.",
    contentEs: "Usá una Master Key para encriptar tus keys y bloquear el popup.",
  },
  {
    titleEn: "Theme",
    titleEs: "Tema",
    contentEn: "Changes only the popup look (not the on-page shimeji).",
    contentEs: "Cambia solo el look del popup (no del shimeji en la página).",
  },
];

export function HelpSection() {
  const { isSpanish } = useLanguage();
  const variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } },
  };

  return (
    <section id="help" className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <ScrollAnimation variants={variants}>
        <div className="max-w-3xl mx-auto text-center mb-20">
          <p className="uppercase tracking-[0.3em] text-xs text-muted-foreground font-mono mb-4">
            {isSpanish ? "Guía" : "Guide"}
          </p>
          <h1 className="text-4xl sm:text-5xl font-semibold text-foreground tracking-tight mb-4">
            {isSpanish ? "Ayuda y Configuración" : "Help & Setup"}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {isSpanish
              ? "Una guía simple para conectar proveedores y entender cada ajuste."
              : "A simple guide to connect providers and understand every setting."}
          </p>
        </div>
      </ScrollAnimation>

      <ScrollAnimation variants={variants}>
        <div className="max-w-6xl mx-auto mb-20">
          <div className="text-center mb-12">
            <p className="uppercase tracking-[0.3em] text-xs text-muted-foreground font-mono mb-4">
              {isSpanish ? "Proveedores" : "Providers"}
            </p>
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
              {isSpanish ? "Guías de configuración" : "Setup Guides"}
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {providers.map((provider) => (
              <div key={provider.id} className="neural-card rounded-3xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-mono">
                    {provider.id}
                  </span>
                  <span className="text-xs px-3 py-1 rounded-full neural-outline text-muted-foreground font-mono">
                    {isSpanish
                      ? `${provider.stepsEs.length} pasos`
                      : `${provider.stepsEn.length} steps`}
                  </span>
                </div>
                <h3 className="text-2xl font-semibold text-foreground mb-3">
                  {isSpanish ? provider.titleEs : provider.titleEn}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {isSpanish ? provider.descriptionEs : provider.descriptionEn}
                </p>
                <div className="flex flex-col gap-3 text-sm text-foreground/80">
                  {(isSpanish ? provider.stepsEs : provider.stepsEn).map((item) => (
                    <span key={item} className="flex gap-3">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--brand-accent)]" />
                      <span>{item}</span>
                    </span>
                  ))}
                </div>
                <div className="mt-6 text-sm">
                  <Link
                    href={provider.link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--brand-accent)] hover:text-white transition-colors"
                  >
                    {provider.link.label}
                  </Link>
                </div>
              </div>
            ))}
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

          <Accordion type="single" collapsible className="w-full space-y-3">
            {configReference.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="neural-card rounded-2xl px-6"
              >
                <AccordionTrigger className="text-foreground text-left">
                  {isSpanish ? item.titleEs : item.titleEn}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {isSpanish ? item.contentEs : item.contentEn}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </ScrollAnimation>
    </section>
  );
}
