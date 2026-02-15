"use client";

import Link from "next/link";
import styled from "styled-components";
import DownloadButton from "./download-button";
import { ScrollAnimation } from "./scroll-animation";
import { useLanguage } from "./language-provider";

function AuctionButton() {
  const { isSpanish } = useLanguage();
  return (
    <StyledWrapper>
      <Link href="/#auction">
        <button type="button" className="btn">
          <strong>{isSpanish ? "VER SUBASTA" : "VIEW AUCTION"}</strong>
          <div id="container-stars">
            <div id="stars" />
          </div>
          <div id="glow">
            <div className="circle" />
            <div className="circle" />
          </div>
        </button>
      </Link>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .btn {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 9.75rem;
    overflow: hidden;
    height: 3rem;
    background-size: 300% 300%;
    cursor: pointer;
    backdrop-filter: blur(1rem);
    border-radius: 5rem;
    transition: 0.5s;
    animation: auction-gradient 5s ease infinite;
    border: double 4px transparent;
    background-image: linear-gradient(#0b0f14, #0b0f14),
      linear-gradient(
        120deg,
        rgba(92, 255, 146, 0.72),
        rgba(255, 255, 255, 0.16) 40%,
        rgba(92, 255, 146, 0.72) 100%
      );
    background-origin: border-box;
    background-clip: content-box, border-box;
  }

  @media (max-width: 640px) {
    .btn {
      width: 75%;
      margin: 0 auto;
    }
  }

  #container-stars {
    position: absolute;
    z-index: 1;
    width: 100%;
    height: 100%;
    overflow: hidden;
    transition: 0.5s;
    backdrop-filter: blur(1rem);
    border-radius: 5rem;
    background-color: #0b0f14;
  }

  strong {
    z-index: 2;
    font-size: 12px;
    letter-spacing: 3px;
    color: #dbffe9;
    text-shadow: 0 0 6px rgba(92, 255, 146, 0.62);
  }

  #glow {
    position: absolute;
    display: flex;
    width: 12rem;
  }

  .circle {
    width: 100%;
    height: 30px;
    filter: blur(2rem);
    animation: auction-pulse 4s infinite;
    z-index: -1;
  }

  .circle:nth-of-type(1) {
    background: rgba(92, 255, 146, 0.42);
  }

  .circle:nth-of-type(2) {
    background: rgba(255, 255, 255, 0.2);
  }

  .btn:hover {
    transform: scale(1.1);
  }

  .btn:active {
    border: double 4px rgba(92, 255, 146, 0.85);
    background-origin: border-box;
    background-clip: content-box, border-box;
    animation: none;
  }

  .btn:active .circle {
    background: rgba(92, 255, 146, 0.8);
  }

  #stars {
    position: relative;
    background: transparent;
    width: 200rem;
    height: 200rem;
  }

  #stars::after {
    content: "";
    position: absolute;
    top: -10rem;
    left: -100rem;
    width: 100%;
    height: 100%;
    animation: auction-animStarRotate 90s linear infinite;
  }

  #stars::after {
    background-image: radial-gradient(#ffffff 1px, transparent 1%);
    background-size: 50px 50px;
  }

  #stars::before {
    content: "";
    position: absolute;
    top: 0;
    left: -50%;
    width: 170%;
    height: 500%;
    animation: auction-animStar 60s linear infinite;
  }

  #stars::before {
    background-image: radial-gradient(#ffffff 1px, transparent 1%);
    background-size: 50px 50px;
    opacity: 0.5;
  }

  @keyframes auction-animStar {
    from { transform: translateY(0); }
    to { transform: translateY(-135rem); }
  }

  @keyframes auction-animStarRotate {
    from { transform: rotate(360deg); }
    to { transform: rotate(0); }
  }

  @keyframes auction-gradient {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  @keyframes auction-pulse {
    0% {
      transform: scale(0.75);
      box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.7);
    }
    70% {
      transform: scale(1);
      box-shadow: 0 0 0 10px rgba(0, 0, 0, 0);
    }
    100% {
      transform: scale(0.75);
      box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
    }
  }
`;

export function CtaSection() {
  const { isSpanish } = useLanguage();
  const variants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
  };

  return (
    <section id="cta" className="py-20 px-4 sm:px-6 lg:px-8">
      <ScrollAnimation variants={variants}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center rounded-3xl neural-card p-8 md:p-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold mb-4 tracking-tight text-balance text-foreground">
              {isSpanish
                ? "Tu mascota IA te espera"
                : "Your AI pet is waiting"}
            </h2>
            <p className="mb-4 max-w-lg mx-auto text-muted-foreground">
              {isSpanish
                ? "Descarga la extensión o la app para Windows, macOS y Linux, elige una personalidad y empieza a chatear. O activa el modo agente para tareas online y onchain."
                : "Download the extension or the app for Windows, macOS, and Linux, pick a personality, and start chatting. Or enable agent mode for online and onchain tasks."}
            </p>
            <p className="mb-8 max-w-lg mx-auto text-muted-foreground/80">
              {isSpanish
                ? "La extensión es gratis e incluye una mascota por defecto, y también podés usar la app desktop en Windows, macOS y Linux. Participá en la subasta para conseguir un shimeji personalizado."
                : "The extension is free and includes a default mascot, and you can also use the desktop app on Windows, macOS, and Linux. Join the auction to get a custom shimeji."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <DownloadButton />
              <AuctionButton />
            </div>
          </div>
        </div>
      </ScrollAnimation>
    </section>
  );
}
