import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadGifts, reserveGift } from '../../services/giftService';
import { demoMode } from '../../lib/site';
import '../../gifts.css';
export default function GiftCatalog() {
  const [data, setData] = useState(null), [error, setError] = useState('');
  const [selection, setSelection] = useState(null), [sent, setSent] = useState(null);
  const [busy, setBusy] = useState(false), [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    loadGifts().then(result => { if (active) setData(result); }).catch(() => { if (active) setError('Não foi possível carregar os presentes. Tente atualizar a lista.'); });
    return () => { active = false; };
  }, [revision]);
  async function reserve(event) {
    event.preventDefault(); setBusy(true); setError('');
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    try { setSent(await reserveGift({ ...fields, ...selection })); setSelection(null); setRevision(v => v + 1); }
    catch (e) { setError(e.message); if (e.status === 503) setSelection(value => value && ({ ...value, requestId: crypto.randomUUID() })); setRevision(v => v + 1); }
    finally { setBusy(false); }
  }
  return <div className="gift-catalog">
    {demoMode && <p className="gift-note">Experimente com dados fictícios. Nenhum e-mail será enviado nesta demonstração.</p>}
    <button className="gift-button gift-secondary" type="button" onClick={() => { setError(''); setRevision(v => v + 1); }}>Atualizar lista</button>
    {error && <p role="alert" className="gift-error">{error}</p>}
    {!data && !error && <p role="status">Carregando presentes…</p>}
    {sent && <div className="gift-feedback" role="status"><strong>Falta confirmar sua escolha!</strong><p>{sent.demoLink ? 'Nesta demonstração, use o link abaixo para simular a confirmação. Nenhum e-mail foi enviado.' : 'Confira sua caixa de entrada e a pasta de spam.'} O link expira em 30 minutos; depois disso o presente volta a ficar disponível.</p>{sent.demoLink && <Link to={sent.demoLink.slice(2)}>Simular o link recebido por e-mail</Link>}</div>}
    {data && !data.gifts.length && <p>Os noivos estão preparando a lista de presentes. Volte em breve.</p>}
    {data?.gifts.length > 0 && !data.reservationsEnabled && <p>As escolhas de presentes estarão disponíveis em breve.</p>}
    <div className="gift-grid">{data?.gifts.map(gift => <article className="gift-card" key={gift.id}>
      {gift.imageUrl && <img src={gift.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />}
      <h3>{gift.title}</h3><p>{gift.description}</p>
      {gift.url && <a href={gift.url} target="_blank" rel="noopener noreferrer">Ver sugestão na loja ↗</a>}
      <p className="gift-status">{gift.status === 'confirmed' ? 'Já escolhido' : gift.status === 'pending' ? 'Aguardando confirmação' : 'Disponível'}</p>
      {selection?.giftId === gift.id ? <form onSubmit={reserve} className="gift-form">
        <label>Seu nome<input name="name" autoComplete="name" required maxLength={120} disabled={busy} /></label>
        <label>Seu e-mail<input name="email" type="email" autoComplete="email" required maxLength={254} disabled={busy} /></label>
        <label hidden>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
        <p className="gift-note">Os noivos poderão ver seu nome e e-mail para organizar o presente. Confirme pelo link enviado em até 30 minutos. A compra e a entrega são combinadas com eles.</p>
        <button className="gift-button" disabled={busy}>{busy ? 'Enviando…' : 'Enviar link de confirmação'}</button>
        <button type="button" className="gift-button gift-secondary" disabled={busy} onClick={() => setSelection(null)}>Cancelar</button>
      </form> : <button className="gift-button" type="button" disabled={gift.status !== 'available' || !data.reservationsEnabled || busy} onClick={() => { setSent(null); setError(''); setSelection({ giftId: gift.id, requestId: crypto.randomUUID() }); }}>Escolher este presente</button>}
    </article>)}</div>
  </div>;
}
