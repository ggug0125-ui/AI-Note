type ActivityCardProps = {
  label: string;
  value: string;
};

export function ActivityCard({ label, value }: ActivityCardProps) {
  return (
    <article className="rounded-2xl border border-[#EAD8C1] bg-[#FFFDF8] p-4">
      <p className="text-xs font-black uppercase tracking-wide text-[#8A7354]">{label}</p>
      <p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-[#4F3B25]">{value}</p>
    </article>
  );
}
