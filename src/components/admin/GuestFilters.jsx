export default function GuestFilters({ filters, onChange }) {
  const change = event => onChange({ ...filters, [event.target.name]: event.target.value });
  return <div className="guest-filters">
    <label>Buscar por nome<input name="search" type="search" value={filters.search} onChange={change} /></label>
    <label>Presença<select name="attendance" value={filters.attendance} onChange={change}><option value="">Todas</option><option value="yes">Confirmados</option><option value="no">Ausentes</option></select></label>
    <label>Ordenar por data<select name="order" value={filters.order} onChange={change}><option value="desc">Mais recentes</option><option value="asc">Mais antigas</option></select></label>
  </div>;
}
