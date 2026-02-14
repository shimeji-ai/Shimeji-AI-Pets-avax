"use client";

import { Download } from "lucide-react";
import { useLanguage } from "~~/components/language-provider";
import { Button } from "~~/components/ui/button";

const WIN_RELEASE_URL =
  "https://github.com/luloxi/Shimeji-AI-Pets/releases/latest/download/shimeji-desktop-windows-portable.exe";
const LINUX_RELEASE_URL =
  "https://github.com/luloxi/Shimeji-AI-Pets/releases/latest/download/shimeji-desktop-linux.AppImage";
const MAC_RELEASE_URL =
  "https://github.com/luloxi/Shimeji-AI-Pets/releases/latest/download/shimeji-desktop-macos.zip";
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
              ? "Elegí tu plataforma: extensión de navegador, desktop o mobile (próximamente)."
              : "Choose your platform: browser extension, desktop, or mobile (coming soon)."}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="neural-card rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-semibold mb-4">
              {isSpanish ? "Extensión de Navegador" : "Browser Extension"}
            </h3>
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
                {isSpanish ? "¡DESCARGAR!" : "DOWNLOAD!"}
              </a>
            </Button>
          </div>

          <div className="neural-card rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-semibold mb-4">{isSpanish ? "Versión Desktop" : "Desktop Version"}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {isSpanish
                ? "La app desktop puede interactuar con terminales locales como WSL, PowerShell y Terminal de macOS."
                : "The desktop app can interact with local terminals like WSL, PowerShell, and macOS Terminal."}
            </p>
            <div className="text-left mb-6 space-y-5">
              <div>
                <p className="mb-2 text-muted-foreground font-medium">
                  {isSpanish ? "Windows Portable" : "Windows Portable"}
                </p>
                <div className="text-sm text-muted-foreground">
                  {isSpanish
                    ? "Versión .exe portable (sin instalador). Descargá y ejecutá el archivo. Si Windows pregunta por seguridad, permite la ejecución."
                    : "Portable .exe build (no installer needed). Download and run the file. If Windows shows a security prompt, allow execution."}
                </div>
                <div className="mt-3">
                  <Button asChild className="neural-button w-full">
                    <a href={WIN_RELEASE_URL} target="_blank" rel="noopener noreferrer">
                      {isSpanish ? "Descargar .exe portable" : "Download Portable .exe"}
                    </a>
                  </Button>
                </div>
              </div>
              <div>
                <p className="mb-2 text-muted-foreground font-medium">
                  {isSpanish ? "Linux AppImage" : "Linux AppImage"}
                </p>
                <div className="text-sm text-muted-foreground">
                  {isSpanish
                    ? "Build Linux portable en formato AppImage. Después de descargar: `chmod +x shimeji-desktop-linux.AppImage` y luego ejecuta el archivo."
                    : "Portable Linux build in AppImage format. After download: `chmod +x shimeji-desktop-linux.AppImage` and then run it."}
                </div>
                <div className="mt-3">
                  <Button asChild className="neural-button w-full">
                    <a href={LINUX_RELEASE_URL} target="_blank" rel="noopener noreferrer">
                      {isSpanish ? "Descargar AppImage" : "Download AppImage"}
                    </a>
                  </Button>
                </div>
              </div>
              <div>
                <p className="mb-2 text-muted-foreground font-medium">{isSpanish ? "macOS" : "macOS"}</p>
                <div className="text-sm text-muted-foreground">
                  {isSpanish
                    ? "Build macOS en formato .zip. Descargá, descomprimí y abrí la app. Si Gatekeeper bloquea la app, permitila desde Configuración > Privacidad y seguridad."
                    : "macOS build in .zip format. Download, extract, and open the app. If Gatekeeper blocks it, allow it from Settings > Privacy & Security."}
                </div>
                <div className="mt-3">
                  <Button asChild className="neural-button w-full">
                    <a href={MAC_RELEASE_URL} target="_blank" rel="noopener noreferrer">
                      {isSpanish ? "Descargar macOS (.zip)" : "Download macOS (.zip)"}
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="neural-card rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-semibold mb-4">{isSpanish ? "Mobile" : "Mobile"}</h3>
            <div className="text-left mb-6 space-y-5">
              <div>
                <p className="mb-2 text-muted-foreground font-medium">Android</p>
                <div className="text-sm text-muted-foreground">
                  {isSpanish ? "Versión Android en desarrollo." : "Android version is in development."}
                </div>
              </div>
              <div>
                <p className="mb-2 text-muted-foreground font-medium">iPhone (iOS)</p>
                <div className="text-sm text-muted-foreground">
                  {isSpanish ? "Versión iPhone (iOS) en desarrollo." : "iPhone (iOS) version is in development."}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Button className="neural-button" disabled>
                {isSpanish ? "Android (próximamente)" : "Android (coming soon)"}
              </Button>
              <Button className="neural-button" disabled>
                {isSpanish ? "iPhone (próximamente)" : "iPhone (coming soon)"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
