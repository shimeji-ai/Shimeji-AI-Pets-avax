"use client";

interface CurrencyToggleProps {
  value: "XLM" | "USDC";
  onChange: (currency: "XLM" | "USDC") => void;
}

export function CurrencyToggle({ value, onChange }: CurrencyToggleProps) {
  return (
    <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
      {(["XLM", "USDC"] as const).map((currency) => (
        <button
          key={currency}
          onClick={() => onChange(currency)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            value === currency
              ? "bg-[var(--brand-accent)] text-[#fff8ff]"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {currency}
        </button>
      ))}
    </div>
  );
}
