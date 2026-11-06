import { calculateStats } from '../../lib/rsvp';
export default function StatsCards({ rows }) {
  const stats = calculateStats(rows);
  return <div className="stats-grid">{[
    ['Respostas recebidas', stats.total], ['Confirmaram presença', stats.yes],
    ['Não comparecerão', stats.no], ['Pessoas confirmadas', stats.people],
  ].map(([label, value]) => <article className="stat-card" key={label}><h2>{label}</h2><strong>{value}</strong></article>)}</div>;
}
