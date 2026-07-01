type ActivityCardProps = {
  label: string;
  value: string;
};

export function ActivityCard({ label, value }: ActivityCardProps) {
  return (
    <article className="rounded-2xl border border-border bg-panel p-4">
      <p className="text-xs font-black uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-body">{value}</p>
    </article>
  );
}
