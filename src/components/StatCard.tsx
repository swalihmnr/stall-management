interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  color: string;
  sub?: string;
}

export function StatCard({ label, value, icon, color, sub }: StatCardProps) {
  return (
    <div className={`card flex items-center gap-4`}>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">{label}</p>
        <p className="text-xl font-bold text-slate-100 truncate">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
