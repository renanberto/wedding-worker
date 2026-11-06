// Fixture exclusiva de testes; não é importada pelo build de produção.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import StatsCards from '../../src/components/admin/StatsCards';
import GuestTable from '../../src/components/admin/GuestTable';
import GuestFilters from '../../src/components/admin/GuestFilters';
import { filterResponses } from '../../src/lib/rsvp';
import '../../src/styles.css';
const rows = [{ id: 'fixture', name: 'Convidada de teste', attendance: 'yes', guests: 3, message: 'Mensagem de teste '.repeat(60), createdAt: { toMillis: () => 1, toDate: () => new Date('2026-12-01T12:00:00Z') } }];
export function Fixture() {
  const [filters, setFilters] = useState({ search: '', attendance: '', order: 'desc' });
  return <main className="admin-shell"><header className="admin-header"><h1>Confirmações de presença</h1><button className="outline-button">Sair</button></header><StatsCards rows={rows} /><GuestFilters filters={filters} onChange={setFilters} /><GuestTable rows={filterResponses(rows, filters)} /></main>;
}
createRoot(document.getElementById('root')).render(<Fixture />);
