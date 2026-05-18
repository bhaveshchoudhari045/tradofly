type StatCardProps = {
  label: string;
  value: string;
  sub: string;
  icon: any;
  color: string;
};

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <p>{label}</p>
        <Icon size={20} color={color} />
      </div>

      {/* VALUE COLOR CHANGES HERE */}
      <h2 style={{ color }} className="text-2xl font-bold">
        {value}
      </h2>

      {/* SUBTEXT COLOR */}
      <p style={{ color }}>{sub}</p>
    </div>
  );
}
