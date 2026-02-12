"use client";

import { Download } from "lucide-react";
import { useLanguage } from "~~/components/language-provider";
import { Button } from "~~/components/ui/button";

const WIN_RELEASE_URL =
  "https://github.com/luloxi/Shimeji-AI-Pets/releases/latest/download/shimeji-desktop-windows-portable.exe";
const LINUX_RELEASE_URL =
  "https://github.com/luloxi/Shimeji-AI-Pets/releases/latest/download/shimeji-desktop-linux.AppImage";
const CHROME_RELEASE_URL =
  "https://github.com/luloxi/Shimeji-AI-Pets/releases/latest/download/shimeji-chrome-extension.zip";

export function DownloadSection() {
  const { isSpanish } = useLanguage();

  return (
    <section id="download" className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 border border-white/10 mb-6 text-[var(--brand-accent)]">
            <Download className="w-8 h-8" />
          </div>
          <h2 className="text-5xl font-semibold mb-4">
            {isSpanish ? "Descargar Shimeji AI Pets" : "Download Shimeji AI Pets"}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {isSpanish
              ? "Instalá la extensión y tené una mascota AI en tu navegador. Chateá con ella, dejá que reaccione a tu navegación o conectala a herramientas onchain."
              : "Install the extension and get an AI pet in your browser. Chat with it, let it react to your browsing, or connect it to onchain tools."}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="neural-card rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-semibold mb-4">{isSpanish ? "Extensión de Chrome" : "Chrome Extension"}</h3>
            <div className="text-left mb-4">
              <p className="mb-2 text-muted-foreground">
                {isSpanish ? "Seguí estos pasos para instalar:" : "Follow these steps to install:"}
              </p>
              <div className="text-sm text-muted-foreground">
                {isSpanish
                  ? "Descargá, descomprimí, activá el modo desarrollador en `chrome://extensions` y cargá la carpeta."
                  : "Click download, unzip, enable Developer Mode in `chrome://extensions`, then load the folder."}
              </div>
            </div>
            <Button asChild className="neural-button">
              <a href={CHROME_RELEASE_URL} target="_blank" rel="noopener noreferrer">
                {isSpanish ? "Descargar Extensión" : "Download Extension"}
              </a>
            </Button>
          </div>

          <div className="neural-card rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-semibold mb-4">{isSpanish ? "Windows Portable" : "Windows Portable"}</h3>
            <div className="text-left mb-4">
              <p className="mb-2 text-muted-foreground">
                {isSpanish ? "Versión .exe portable (sin instalador)." : "Portable .exe build (no installer needed)."}
              </p>
              <div className="text-sm text-muted-foreground">
                {isSpanish
                  ? "Descargá y ejecutá el archivo. Si Windows pregunta por seguridad, permite la ejecución."
                  : "Download and run the file. If Windows shows a security prompt, allow execution."}
              </div>
            </div>
            <Button asChild className="neural-button">
              <a href={WIN_RELEASE_URL} target="_blank" rel="noopener noreferrer">
                {isSpanish ? "Descargar .exe portable" : "Download Portable .exe"}
              </a>
            </Button>
          </div>

          <div className="neural-card rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-semibold mb-4">{isSpanish ? "Linux AppImage" : "Linux AppImage"}</h3>
            <div className="text-left mb-4">
              <p className="mb-2 text-muted-foreground">
                {isSpanish ? "Build Linux portable en formato AppImage." : "Portable Linux build in AppImage format."}
              </p>
              <div className="text-sm text-muted-foreground">
                {isSpanish
                  ? "Después de descargar: `chmod +x shimeji-desktop-linux.AppImage` y luego ejecuta el archivo."
                  : "After download: `chmod +x shimeji-desktop-linux.AppImage` and then run it."}
              </div>
            </div>
            <Button asChild className="neural-button">
              <a href={LINUX_RELEASE_URL} target="_blank" rel="noopener noreferrer">
                {isSpanish ? "Descargar AppImage" : "Download AppImage"}
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
