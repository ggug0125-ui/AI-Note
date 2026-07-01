"use client";

export type CreditTone = "blue" | "witch" | "fairy" | "gold" | "danger";

type CreditBadgeProps = {
  credits?: number | null;
  tone?: CreditTone;
  className?: string;
};

const toneClasses: Record<CreditTone, string> = {
  blue: "border-border bg-card/75 text-body shadow-soft",
  witch: "border-lime-300/75 bg-black/18 text-emerald-50 shadow-[0_0_18px_rgba(132,204,22,0.2)]",
  fairy: "border-pink-300/78 bg-black/18 text-pink-50 shadow-[0_0_18px_rgba(244,114,182,0.24)]",
  gold: "border-yellow-300/70 bg-yellow-300/16 text-yellow-100 shadow-[0_0_18px_rgba(250,204,21,0.2)]",
  danger: "border-red-300/70 bg-red-500/12 text-red-100 shadow-[0_0_18px_rgba(248,113,113,0.2)]"
};

const gemBaseClasses: Record<CreditTone, string> = {
  blue: "from-sky-300 via-blue-600 to-indigo-900 shadow-[0_0_8px_rgba(37,99,235,0.72)]",
  witch: "from-lime-100 via-emerald-400 to-emerald-950 shadow-[0_0_13px_rgba(34,197,94,0.95)]",
  fairy: "from-pink-100 via-pink-400 to-pink-950 shadow-[0_0_13px_rgba(244,114,182,0.95)]",
  gold: "from-yellow-100 via-amber-400 to-orange-700 shadow-[0_0_8px_rgba(250,204,21,0.78)]",
  danger: "from-red-200 via-red-500 to-red-900 shadow-[0_0_8px_rgba(239,68,68,0.78)]"
};

const gemFacetClasses: Record<
  CreditTone,
  {
    top: string;
    left: string;
    center: string;
    right: string;
    bottom: string;
    line: string;
  }
> = {
  blue: {
    top: "bg-sky-100/90",
    left: "bg-cyan-300/70",
    center: "bg-blue-300/80",
    right: "bg-blue-800/55",
    bottom: "bg-indigo-950/58",
    line: "bg-sky-50/55"
  },
  witch: {
    top: "bg-lime-50/95",
    left: "bg-emerald-200/86",
    center: "bg-lime-300/88",
    right: "bg-emerald-950/82",
    bottom: "bg-black/45",
    line: "bg-lime-50/82"
  },
  fairy: {
    top: "bg-pink-50/95",
    left: "bg-rose-200/86",
    center: "bg-pink-200/88",
    right: "bg-pink-950/82",
    bottom: "bg-black/45",
    line: "bg-pink-50/82"
  },
  gold: {
    top: "bg-yellow-100/92",
    left: "bg-amber-200/78",
    center: "bg-yellow-300/82",
    right: "bg-orange-700/52",
    bottom: "bg-orange-900/52",
    line: "bg-yellow-50/60"
  },
  danger: {
    top: "bg-red-100/90",
    left: "bg-rose-300/70",
    center: "bg-red-300/78",
    right: "bg-red-800/55",
    bottom: "bg-red-950/58",
    line: "bg-red-50/55"
  }
};

function GemIcon({ tone }: { tone: CreditTone }) {
  const facet = gemFacetClasses[tone];

  return (
    <span className="relative mr-2 inline-flex h-5 w-5 shrink-0 items-center justify-center overflow-visible">
      <span
        className={[
          "absolute h-[17px] w-[17px]",
          "[clip-path:polygon(50%_0%,88%_18%,100%_50%,88%_82%,50%_100%,12%_82%,0%_50%,12%_18%)]",
          "bg-gradient-to-br",
          gemBaseClasses[tone]
        ].join(" ")}
      />

      <span
        className={[
          "absolute h-[17px] w-[17px]",
          "[clip-path:polygon(50%_0%,88%_18%,50%_50%,12%_18%)]",
          facet.top
        ].join(" ")}
      />
      <span
        className={[
          "absolute h-[17px] w-[17px]",
          "[clip-path:polygon(12%_18%,50%_50%,12%_82%,0%_50%)]",
          facet.left
        ].join(" ")}
      />
      <span
        className={[
          "absolute h-[17px] w-[17px]",
          "[clip-path:polygon(50%_50%,88%_18%,100%_50%,88%_82%)]",
          facet.right
        ].join(" ")}
      />
      <span
        className={[
          "absolute h-[17px] w-[17px]",
          "[clip-path:polygon(12%_82%,50%_50%,88%_82%,50%_100%)]",
          facet.bottom
        ].join(" ")}
      />
      <span
        className={[
          "absolute h-[17px] w-[17px]",
          "[clip-path:polygon(50%_50%,70%_32%,88%_82%,50%_100%,31%_82%)]",
          facet.center
        ].join(" ")}
      />

      <span className={["absolute left-[2px] top-[8px] h-px w-[13px] rotate-45", facet.line].join(" ")} />
      <span className={["absolute left-[5px] top-[2px] h-[13px] w-px rotate-45", facet.line].join(" ")} />
      <span className="absolute right-[5px] top-[2px] h-[13px] w-px -rotate-45 bg-black/24" />

      <span className="absolute left-[5px] top-[4px] h-[2px] w-[2px] rounded-full bg-white/95 shadow-[0_0_4px_rgba(255,255,255,0.9)]" />
      <span className="absolute left-[4px] top-[5px] h-px w-[5px] -rotate-45 rounded-full bg-white/75" />
    </span>
  );
}

function formatCredits(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}

export function CreditBadge({ credits, tone = "blue", className = "" }: CreditBadgeProps) {
  const value = typeof credits === "number" && Number.isFinite(credits) ? credits : 0;
  const formattedCredits = formatCredits(value);

  return (
    <span
      className={[
        "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-3 text-xs font-black",
        toneClasses[tone],
        className
      ].join(" ")}
      title={`${formattedCredits} Credits`}
    >
      <GemIcon tone={tone} />
      {formattedCredits} Credits
    </span>
  );
}
