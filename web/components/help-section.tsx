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
    descriptionEn:
      "Cloud-hosted models via API key. Easiest way to get started.",
    descriptionEs:
      "Modelos en la nube con API key. La forma más fácil de empezar.",
    stepsEn: [
      "Go to openrouter.ai and create a free account.",
      "Navigate to Keys and click Create Key. Copy it.",
      "In the extension popup, set AI Brain to Standard and Provider to OpenRouter.",
      "Paste your API key in the API Key field.",
      "Pick a model from the dropdown (or keep the default). Free-tier models are available.",
    ],
    stepsEs: [
      "Andá a openrouter.ai y creá una cuenta gratuita.",
      "Navegá a Keys y hacé click en Create Key. Copiala.",
      "En el popup de la extensión, poné AI Brain en Standard y Provider en OpenRouter.",
      "Pegá tu API key en el campo API Key.",
      "Elegí un modelo del dropdown (o dejá el default). Hay modelos gratuitos disponibles.",
    ],
  },
  {
    id: "ollama",
    titleEn: "Ollama (Local)",
    titleEs: "Ollama (Local)",
    descriptionEn:
      "Run models on your own machine. No API key needed, fully private.",
    descriptionEs:
      "Corré modelos en tu propia máquina. Sin API key, totalmente privado.",
    stepsEn: [
      "Install Ollama from ollama.com and start it.",
      "Pull a model: run ollama pull llama3.1 in your terminal.",
      "In the extension popup, set AI Brain to Standard and Provider to Ollama.",
      "Set the Ollama URL (default: http://localhost:11434) and enter your model name.",
      "Note: If Ollama blocks requests, set OLLAMA_ORIGINS=* before starting it to allow CORS.",
    ],
    stepsEs: [
      "Instalá Ollama desde ollama.com e inicialo.",
      "Descargá un modelo: ejecutá ollama pull llama3.1 en la terminal.",
      "En el popup de la extensión, poné AI Brain en Standard y Provider en Ollama.",
      "Configurá la URL de Ollama (default: http://localhost:11434) y escribí el nombre del modelo.",
      "Nota: Si Ollama bloquea requests, ejecutá OLLAMA_ORIGINS=* antes de iniciarlo para permitir CORS.",
    ],
  },
  {
    id: "openclaw",
    titleEn: "OpenClaw (Agent)",
    titleEs: "OpenClaw (Agente)",
    descriptionEn:
      "Agent mode with onchain and online tools. Requires a running OpenClaw gateway.",
    descriptionEs:
      "Modo agente con herramientas onchain y online. Requiere un gateway OpenClaw corriendo.",
    stepsEn: [
      "Clone and run the OpenClaw gateway on your machine or server.",
      "Copy the WebSocket URL and the gateway token from the terminal output.",
      "In the extension popup, set AI Brain to Agent.",
      "Paste the Gateway URL and Token in the corresponding fields.",
      "Your shimeji now has access to tools beyond simple chat (web search, onchain actions, etc.).",
    ],
    stepsEs: [
      "Cloná y ejecutá el gateway de OpenClaw en tu máquina o servidor.",
      "Copiá la URL WebSocket y el token del gateway desde la salida de la terminal.",
      "En el popup de la extensión, poné AI Brain en Agent.",
      "Pegá la Gateway URL y el Token en los campos correspondientes.",
      "Tu shimeji ahora tiene acceso a herramientas más allá del chat (búsqueda web, acciones onchain, etc.).",
    ],
  },
];

const configReference = [
  {
    titleEn: "Character & Size",
    titleEs: "Personaje y Tamaño",
    contentEn:
      "Choose which shimeji character appears on screen. The Size slider controls how large the shimeji is rendered — smaller values keep it subtle, larger values make it more prominent. Each character has unique idle, walk, and chat animations.",
    contentEs:
      "Elegí qué personaje de shimeji aparece en pantalla. El control de Tamaño define qué tan grande se renderiza — valores más chicos lo mantienen sutil, valores más grandes lo hacen más prominente. Cada personaje tiene animaciones únicas de idle, caminar y chat.",
  },
  {
    titleEn: "Active Toggle",
    titleEs: "Toggle Activo",
    contentEn:
      "The Active switch enables or disables the shimeji on the current page. When off, the shimeji is hidden but its configuration is preserved. You can also use the global Wake All / Sleep All buttons in the popup header to toggle all shimejis at once.",
    contentEs:
      "El switch Activo habilita o deshabilita el shimeji en la página actual. Cuando está apagado, el shimeji se oculta pero su configuración se conserva. También podés usar los botones globales Wake All / Sleep All en el header del popup para controlar todos los shimejis a la vez.",
  },
  {
    titleEn: "Personality",
    titleEs: "Personalidad",
    contentEn:
      "The Personality field defines how the shimeji speaks and behaves. It acts as a system prompt — write something like \"You are a sarcastic pirate\" or \"Friendly tutor who explains everything simply.\" This also affects the pitch and tone of the notification sound.",
    contentEs:
      "El campo Personalidad define cómo habla y se comporta el shimeji. Actúa como prompt de sistema — escribí algo como \"Sos un pirata sarcástico\" o \"Tutor amable que explica todo de forma simple.\" Esto también afecta el tono del sonido de notificación.",
  },
  {
    titleEn: "AI Brain (Cerebro AI)",
    titleEs: "AI Brain (Cerebro AI)",
    contentEn:
      "Controls the AI mode. Standard: text-only chat using OpenRouter or Ollama. Agent: connects to an OpenClaw gateway for tool-augmented conversations (web search, onchain actions). Off: disables AI completely — the shimeji still walks around but won't chat.",
    contentEs:
      "Controla el modo de IA. Standard: chat de texto usando OpenRouter u Ollama. Agent: se conecta a un gateway OpenClaw para conversaciones con herramientas (búsqueda web, acciones onchain). Off: desactiva la IA completamente — el shimeji sigue caminando pero no chatea.",
  },
  {
    titleEn: "Provider (Standard Mode)",
    titleEs: "Provider (Modo Standard)",
    contentEn:
      "When AI Brain is set to Standard, choose between OpenRouter (cloud API) and Ollama (local). OpenRouter requires an API key but gives access to many models. Ollama runs entirely on your machine and requires no key.",
    contentEs:
      "Cuando AI Brain está en Standard, elegí entre OpenRouter (API en la nube) y Ollama (local). OpenRouter requiere una API key pero da acceso a muchos modelos. Ollama corre enteramente en tu máquina y no necesita key.",
  },
  {
    titleEn: "API Key",
    titleEs: "API Key",
    contentEn:
      "Your OpenRouter API key. Get it from openrouter.ai → Keys → Create Key. The key is encrypted locally using your Master Key (if set) and never sent anywhere except OpenRouter's API endpoint.",
    contentEs:
      "Tu API key de OpenRouter. Conseguila en openrouter.ai → Keys → Create Key. La key se encripta localmente usando tu Master Key (si la tenés configurada) y nunca se envía a ningún lado excepto al endpoint de OpenRouter.",
  },
  {
    titleEn: "Model",
    titleEs: "Modelo",
    contentEn:
      "The AI model used for chat. With OpenRouter, you get a dropdown of available models (some free, some paid). With Ollama, type the name of the model you pulled (e.g. llama3.1, mistral, gemma). Different models have different capabilities, speed, and cost.",
    contentEs:
      "El modelo de IA usado para chatear. Con OpenRouter, tenés un dropdown de modelos disponibles (algunos gratis, otros pagos). Con Ollama, escribí el nombre del modelo que descargaste (ej. llama3.1, mistral, gemma). Diferentes modelos tienen distintas capacidades, velocidad y costo.",
  },
  {
    titleEn: "Sound & Volume",
    titleEs: "Sonido y Volumen",
    contentEn:
      "Each shimeji plays a notification sound when it speaks. The volume slider controls loudness. The sound pitch is influenced by the shimeji's personality, so different characters sound distinct.",
    contentEs:
      "Cada shimeji reproduce un sonido de notificación cuando habla. El slider de volumen controla el nivel. El tono del sonido está influenciado por la personalidad del shimeji, así que diferentes personajes suenan distinto.",
  },
  {
    titleEn: "Read Aloud (TTS)",
    titleEs: "Leer en voz alta (TTS)",
    contentEn:
      "Enables text-to-speech so the shimeji reads its messages out loud using the browser's built-in speech synthesis. The voice profile is selected automatically based on personality and language.",
    contentEs:
      "Activa text-to-speech para que el shimeji lea sus mensajes en voz alta usando la síntesis de voz del navegador. El perfil de voz se selecciona automáticamente según la personalidad y el idioma.",
  },
  {
    titleEn: "Open Mic",
    titleEs: "Micrófono abierto",
    contentEn:
      "When enabled, the shimeji listens to your microphone continuously. It will respond when it detects speech, allowing hands-free conversation. You can toggle this on or off per shimeji.",
    contentEs:
      "Cuando está habilitado, el shimeji escucha tu micrófono continuamente. Responde cuando detecta habla, permitiendo conversación manos libres. Podés activarlo o desactivarlo por shimeji.",
  },
  {
    titleEn: "Talk to Other Shimejis",
    titleEs: "Hablar con otros shimejis",
    contentEn:
      "Enables inter-shimeji communication. When turned on, shimejis can relay messages to each other, creating conversations between your different characters.",
    contentEs:
      "Habilita la comunicación entre shimejis. Cuando está activado, los shimejis pueden retransmitir mensajes entre sí, creando conversaciones entre tus diferentes personajes.",
  },
  {
    titleEn: "Chat Style",
    titleEs: "Estilo de chat",
    contentEn:
      "Customize the chat bubble appearance. Options include theme color, background style (glass / solid / dark), font size, and bubble width. These are per-shimeji settings so each character can have a unique look.",
    contentEs:
      "Personalizá la apariencia de la burbuja de chat. Las opciones incluyen color del tema, estilo de fondo (glass / solid / dark), tamaño de fuente y ancho de burbuja. Son configuraciones por shimeji, así que cada personaje puede tener un look único.",
  },
  {
    titleEn: "Visibility",
    titleEs: "Visibilidad",
    contentEn:
      "Control where your shimeji appears. The Active toggle works per page, and the global Wake All / Sleep All buttons in the popup header let you show or hide every shimeji at once across all tabs.",
    contentEs:
      "Controlá dónde aparece tu shimeji. El toggle Activo funciona por página, y los botones globales Wake All / Sleep All en el header del popup te permiten mostrar u ocultar todos los shimejis a la vez en todas las pestañas.",
  },
  {
    titleEn: "Security (Master Key)",
    titleEs: "Seguridad (Master Key)",
    contentEn:
      "Set a Master Key password to encrypt your API keys and sensitive settings. When locked, the popup requires the password to access configuration. Auto-lock can be configured to lock after a period of inactivity.",
    contentEs:
      "Configurá una contraseña Master Key para encriptar tus API keys y configuraciones sensibles. Cuando está bloqueado, el popup requiere la contraseña para acceder a la configuración. El auto-lock se puede configurar para bloquear después de un período de inactividad.",
  },
  {
    titleEn: "Theme",
    titleEs: "Tema",
    contentEn:
      "Change the visual theme of the extension popup. Available themes: Neural (default dark), Pink, and Kawaii. This only affects the popup UI, not the shimeji on the page.",
    contentEs:
      "Cambiá el tema visual del popup de la extensión. Temas disponibles: Neural (oscuro por defecto), Pink, y Kawaii. Esto solo afecta la UI del popup, no al shimeji en la página.",
  },
];

export function HelpSection() {
  const { isSpanish } = useLanguage();
  const variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } },
  };

  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      {/* Hero */}
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
              ? "Todo lo que necesitás para configurar tu shimeji AI — guías de proveedores y referencia de cada opción."
              : "Everything you need to set up your AI shimeji — provider guides and a reference for every setting."}
          </p>
        </div>
      </ScrollAnimation>

      {/* Provider Setup Guides */}
      <ScrollAnimation variants={variants}>
        <div className="max-w-6xl mx-auto mb-20">
          <div className="text-center mb-12">
            <p className="uppercase tracking-[0.3em] text-xs text-muted-foreground font-mono mb-4">
              {isSpanish ? "Proveedores" : "Providers"}
            </p>
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
              {isSpanish
                ? "Guías de configuración"
                : "Setup Guides"}
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
                      ? `${(isSpanish ? provider.stepsEs : provider.stepsEn).length} pasos`
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
                  {(isSpanish ? provider.stepsEs : provider.stepsEn).map(
                    (step, i) => (
                      <span key={i} className="flex gap-3">
                        <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs text-muted-foreground font-mono">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </span>
                    )
                  )}
                </div>
                {provider.id === "openrouter" && (
                  <div className="mt-6 pt-4 border-t border-white/10">
                    <Link
                      href="https://openrouter.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[var(--brand-accent)] hover:underline"
                    >
                      openrouter.ai &rarr;
                    </Link>
                  </div>
                )}
                {provider.id === "ollama" && (
                  <div className="mt-6 pt-4 border-t border-white/10">
                    <Link
                      href="https://ollama.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[var(--brand-accent)] hover:underline"
                    >
                      ollama.com &rarr;
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </ScrollAnimation>

      {/* Configuration Reference */}
      <ScrollAnimation variants={variants}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="uppercase tracking-[0.3em] text-xs text-muted-foreground font-mono mb-4">
              {isSpanish ? "Referencia" : "Reference"}
            </p>
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
              {isSpanish
                ? "Referencia de configuración"
                : "Configuration Reference"}
            </h2>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-3">
            {configReference.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="neural-card border border-white/10 rounded-2xl px-6 data-[state=open]:shadow-sm"
              >
                <AccordionTrigger className="text-md text-left text-foreground hover:no-underline py-5 font-semibold">
                  {isSpanish ? item.titleEs : item.titleEn}
                </AccordionTrigger>
                <AccordionContent className="text-md text-muted-foreground pb-5 leading-relaxed">
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
