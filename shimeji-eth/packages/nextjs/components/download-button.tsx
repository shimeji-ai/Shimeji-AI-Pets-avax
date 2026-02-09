"use client";

import React from "react";
import Link from "next/link";
import { useLanguage } from "./language-provider";

interface DownloadButtonProps {
  href?: string;
  labelEn?: string;
  labelEs?: string;
}

const DownloadButton = ({
  href = "/download",
  labelEn = "TRY OUR CHROME EXTENSION",
  labelEs = "PROBAR EXTENSIÓN",
}: DownloadButtonProps) => {
  const { isSpanish } = useLanguage();
  return (
    <Link href={href} prefetch={false}>
      <button type="button" className="neural-stars-button">
        <strong className="neural-stars-label">{isSpanish ? labelEs : labelEn}</strong>
        <div className="neural-stars-container">
          <div className="neural-stars" />
        </div>
        <div className="neural-stars-glow">
          <div className="neural-stars-circle" />
          <div className="neural-stars-circle" />
        </div>
      </button>
    </Link>
  );
};

export default DownloadButton;
