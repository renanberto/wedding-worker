import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { loadResponses } from '../../services/rsvpService';
import { filterResponses } from '../../lib/rsvp';
import { exportResponses } from '../../lib/csv';
import StatsCards from '../../components/admin/StatsCards';
import GuestFilters from '../../components/admin/GuestFilters';
import GuestTable from '../../components/admin/GuestTable';
export default function Dashboard() {
  const { logout } = useAuth();
  const [rows, setRows] = useState([]);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [filters, setFilters] = useState({ search: '', attendance: '', order: 'desc' });
  useEffect(() => {
    let active = true;
    setState('loading'); setRows([]); setError('');
    loadResponses().then(data => { if (active) { setRows(data); setState('ready'); } })
      .catch(() => { if (active) { setState('error'); setError('Não foi possível carregar as confirmações. Confira sua conexão e autorização.'); } });
    return () => { active = false; };
  }, [revision]);
  return <main className="admin-shell"><header className="admin-header"><div><Link to="/">← Site do casamento</Link><h1>Confirmações de presença</h1></div><button className="outline-button" onClick={() => logout().catch(() => setError('Não foi possível sair. Tente novamente.'))}>Sair</button></header>
    <div className="admin-actions"><button onClick={() => setRevision(value => value + 1)} disabled={state === 'loading'}>Atualizar</button><button disabled={state !== 'ready' || !rows.length} onClick={() => exportResponses(rows)}>Exportar confirmações</button></div>
    {error && <p role="alert" className="form-error">{error}</p>}
    {state === 'loading' && <p role="status">Carregando confirmações…</p>}
    {state === 'ready' && <><StatsCards rows={rows} /><GuestFilters filters={filters} onChange={setFilters} /><GuestTable rows={filterResponses(rows, filters)} /></>}
  </main>;
}
