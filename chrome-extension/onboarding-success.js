const isSpanish = (navigator.language || "").toLowerCase().startsWith("es");

function t(en, es) {
  return isSpanish ? es : en;
}

document.getElementById("success-title").textContent = t("You're all set!", "Listo! Ya está configurado.");
document.getElementById("success-subtitle").textContent = t(
  "Your first shimeji is ready. Open any page to start enjoying your AI pet.",
  "Tu primer shimeji está listo. Abrí cualquier página para empezar a disfrutarlo."
);
document.getElementById("cta-factory").textContent = t("Get a Shimeji NFT", "Conseguí un Shimeji NFT");
document.getElementById("cta-close").textContent = t("Close this tab", "Cerrar esta pestaña");
document.getElementById("success-hint").textContent = t(
  "Tip: You can close this tab and browse anywhere. Your shimejis will appear on the pages you open.",
  "Tip: Podés cerrar esta pestaña y navegar normalmente. Tus shimejis aparecerán en las páginas que abras."
);

const closeBtn = document.getElementById("cta-close");
if (closeBtn) {
  closeBtn.addEventListener("click", () => {
    window.close();
  });
}
