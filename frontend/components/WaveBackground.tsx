type WaveBackgroundProps = {
  className?: string;
};

export function WaveBackground({ className = "" }: WaveBackgroundProps) {
  return (
    <div className={`wave-field pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div className="absolute right-[5%] top-[12%] h-[360px] w-[360px] rounded-full bg-coral/20 blur-3xl" />
      <div className="absolute bottom-[-12%] left-[4%] h-[300px] w-[520px] rounded-full bg-orange-200/35 blur-3xl" />
      <div className="absolute right-[12%] top-[20%] h-[420px] w-[170px] rotate-[32deg] rounded-full bg-stone-900/10 blur-sm" />
    </div>
  );
}
