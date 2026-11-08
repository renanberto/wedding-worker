import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { loadGifts, editGift } from '../../services/giftService';
import '../../gifts.css';
const empty = { title: '', description: '', url: '', imageUrl: '' };
const labels = { available: 'Disponível', pending: 'Aguardando confirmação', confirmed: 'Confirmado', expired: 'Expirado', cancelled: 'Cancelado', failed: 'E-mail não enviado' };
export default function Gifts() {
  const { logout } = useAuth();
  const [data, setData] = useState(null), [form, setForm] = useState(empty);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false), [release, setRelease] = useState(null), [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    loadGifts(true).then(result => { if (active) setData(result); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [revision]);
  async function mutate(input) {
    setBusy(true); setError(''); setNotice('');
    try { await editGift(input); setForm(empty); setRelease(null); setNotice('Lista atualizada.'); setRevision(v => v + 1); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <main className="admin-shell"><header className="admin-header"><div><Link to="/">← Site do casamento</Link><h1>Lista de presentes</h1><Link to="/admin">Confirmações de presença</Link></div><button className="outline-button" onClick={() => logout().catch(() => setError('Não foi possível sair.'))}>Sair</button></header>
    <p>Cadastre os presentes desejados e acompanhe as escolhas. Nome e e-mail dos convidados ficam restritos a este painel.</p>
    {error && <p role="alert" className="gift-error">{error}</p>}{notice && <p role="status">{notice}</p>}
    <form className="gift-form gift-editor" onSubmit={e => { e.preventDefault(); mutate({ ...form, action: 'save' }); }}>
      <h2>{form.id ? 'Editar presente' : 'Cadastrar presente'}</h2>
      <label>Título do presente<input required maxLength={120} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} disabled={busy} /></label>
      <label>Descrição<textarea maxLength={1000} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} disabled={busy} /></label>
      <label>Link da loja (opcional)<input type="url" placeholder="https://" maxLength={2000} value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} disabled={busy} /></label>
      <label>Link da imagem (opcional)<input type="url" placeholder="https://" maxLength={2000} value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} disabled={busy} /></label>
      <div className="gift-actions"><button className="gift-button" disabled={busy}>{busy ? 'Salvando…' : 'Salvar presente'}</button>{form.id && <button className="gift-button gift-secondary" type="button" onClick={() => setForm(empty)} disabled={busy}>Cancelar edição</button>}</div>
    </form>
    <div className="admin-actions"><button onClick={() => { setError(''); setRevision(v => v + 1); }} disabled={busy}>Atualizar presentes</button></div>
    {!data && !error && <p role="status">Carregando presentes…</p>}
    {data && !data.gifts.length && <p>Nenhum presente cadastrado. Comece pelo formulário acima.</p>}
    <div className="gift-grid">{data?.gifts.map(gift => <article className="gift-card" key={gift.id}><h2>{gift.title}</h2><p>{gift.description}</p><p>{gift.archived ? 'Arquivado' : labels[gift.status]}</p>
      <div className="gift-actions">{gift.status === 'available' ? <><button className="gift-button gift-secondary" disabled={busy} onClick={() => { setForm({ ...empty, ...gift }); document.querySelector('.gift-editor input')?.focus(); }}>Editar{gift.archived ? ' e republicar' : ''}</button>{!gift.archived && <button className="gift-button gift-secondary" disabled={busy} onClick={() => mutate({ id: gift.id, action: 'archive' })}>Arquivar</button>}</> : <button className="gift-button gift-secondary" disabled={busy} onClick={() => setRelease(gift)}>Liberar presente</button>}</div>
    </article>)}</div>
    {release && <div className="gift-feedback" role="region" aria-label="Liberar reserva"><p>Liberar “{release.title}”? A reserva atual será cancelada e o link de confirmação deixará de funcionar.</p><button className="gift-button" disabled={busy} onClick={() => mutate({ id: release.id, action: 'release' })}>Confirmar liberação</button><button className="gift-button gift-secondary" disabled={busy} onClick={() => setRelease(null)}>Manter reserva</button></div>}
    <h2>Escolhas dos convidados</h2><p>Últimas 200 solicitações. Uma escolha fica pendente até o convidado confirmar por e-mail; sem confirmação, expira em 30 minutos.</p>
    <div className="guest-table-scroll" role="region" aria-label="Escolhas de presentes" tabIndex={0}><table className="guest-table"><thead><tr><th>Presente</th><th>Nome</th><th>E-mail</th><th>Situação</th></tr></thead><tbody>{data?.reservations.map(row => <tr key={row.id}><td>{row.giftTitle}</td><td>{row.name}</td><td>{row.email}</td><td>{labels[row.status] || row.status}</td></tr>)}</tbody></table></div>
  </main>;
}
