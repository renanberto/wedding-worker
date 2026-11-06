import { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, Check, ChevronDown, ExternalLink, Gift, Heart, MapPin, Menu, MessageCircleHeart, Send, X } from 'lucide-react';
import { wedding } from './content';

const navigation = [
  ['home', 'Home'], ['historia', 'Nossa história'], ['casamento', 'Casamento'],
  ['rsvp', 'R.S.V.P.'], ['hospedagem', 'Hospedagem'], ['presentes', 'Presentes'], ['mensagem', 'Mensagem'],
];
const endpoint = import.meta.env.VITE_FORMSPREE_ENDPOINT || '';
const formReady = /^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(endpoint) && !endpoint.includes('SEU_ID');

function SafeLink({ url, children, className = '' }) {
  if (!url || !/^https:\/\//i.test(url)) return <span className={`${className} disabled-link`} title="Link disponível em breve">{children} <span className="small-note">Em breve</span></span>;
  return <a className={className} href={url} target="_blank" rel="noopener noreferrer">{children} <ExternalLink size={15} aria-hidden="true" /></a>;
}

function SectionLabel({ number, children }) { return <p className="section-label"><span>{number}</span>{children}</p>; }

function Header() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener('hashchange', close);
    return () => window.removeEventListener('hashchange', close);
  }, []);
  return <header className="site-header">
    <a href="#home" className="brand" aria-label="Ir para o início">
      <img src={`${import.meta.env.BASE_URL}images/monograma-referencia.webp`} alt="Monograma do casal" />
    </a>
    <button className="mobile-menu-button" type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-controls="primary-nav" aria-label={open ? 'Fechar menu' : 'Abrir menu'}>{open ? <X /> : <Menu />}</button>
    <nav className={`primary-nav ${open ? 'is-open' : ''}`} id="primary-nav" aria-label="Menu principal">
      {navigation.map(([id, label]) => <a href={`#${id}`} onClick={() => setOpen(false)} key={id}>{label}</a>)}
    </nav>
  </header>;
}

function Hero() {
  return <section className="hero" id="home">
    <div className="hero-content">
      <p className="eyebrow hero-eyebrow">O início de um novo capítulo</p>
      <h1>{wedding.names}</h1>
      <div className="tiny-ornament" aria-hidden="true">✦</div>
      <p className="hero-date">{wedding.dateLabel}</p>
      <p className="hero-place">{wedding.cityLabel}</p>
    </div>
    <img className="church-art" src={`${import.meta.env.BASE_URL}images/igreja-referencia.webp`} alt="Ilustração arquitetônica em traço fino de uma igreja" />
    <a href="#historia" className="scroll-cue" aria-label="Conheça nossa história"><ChevronDown size={20} /></a>
  </section>;
}

function Story() {
  return <section className="section story-section" id="historia"><div className="container narrow center">
    <SectionLabel number="01">O nosso caminho</SectionLabel>
    <h2>{wedding.story.heading}</h2>
    <p className="lead">{wedding.story.intro}</p>
    <div className="timeline">{wedding.story.moments.map((moment, i) => <article className="timeline-item" key={i}><div className="timeline-index">{moment.year}</div><div><h3>{moment.title}</h3><p>{moment.body}</p></div></article>)}</div>
    <p className="script-note">{wedding.announcement}</p>
  </div></section>;
}

function VenueCard({ heading, data, Icon }) {
  return <article className="venue-card"><div className="venue-icon"><Icon size={24} strokeWidth={1.2} /></div><p className="overline">{heading}</p><h3>{data.venue}</h3><p className="venue-address">{data.address}</p><div className="venue-details"><span><CalendarDays size={16} /> {data.time}</span>{data.dressCode && <span><Heart size={16} /> {data.dressCode}</span>}</div><SafeLink url={data.mapsUrl} className="text-link"><MapPin size={16} /> Como chegar <ArrowRight size={16} /></SafeLink></article>;
}

function Wedding() { return <section className="section wedding-section" id="casamento"><div className="container center"><SectionLabel number="02">Celebração</SectionLabel><h2>O grande dia</h2><p className="lead">Cada detalhe foi pensado com carinho. Confira as informações para celebrar conosco.</p><div className="venue-grid"><VenueCard heading="A cerimônia" data={wedding.ceremony} Icon={Heart} /><VenueCard heading="A festa" data={wedding.party} Icon={Gift} /></div></div></section>; }

const emptyForm = { name: '', attendance: '', guests: '1', message: '', website: '' };
function RSVP() {
  const [values, setValues] = useState(emptyForm);
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');
  const set = (key, value) => setValues(prev => ({ ...prev, [key]: value }));
  async function submit(e) {
    e.preventDefault();
    if (state === 'sending') return;
    if (!formReady) { setError('O formulário ainda não foi ativado. Configure VITE_FORMSPREE_ENDPOINT antes de publicar.'); setState('error'); return; }
    if (values.website) return; // campo anti-spam invisível
    setError(''); setState('sending');
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: values.name.trim(),
          comparecimento: values.attendance === 'sim' ? 'Sim' : 'Não',
          quantidade_pessoas: values.attendance === 'sim' ? Number(values.guests) : 0,
          mensagem: values.message.trim(),
          _subject: 'Nova confirmação de presença | Casamento',
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.errors?.map(item => item.message).join('; ') || 'Não foi possível registrar sua confirmação.');
      setState('success'); setValues(emptyForm);
    } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao enviar. Tente novamente.'); setState('error'); }
  }
  return <section className="section rsvp-section" id="rsvp"><div className="container rsvp-layout"><div className="rsvp-intro"><SectionLabel number="03">Sua presença importa</SectionLabel><h2>Confirme sua presença</h2><p>Sua companhia tornará esse momento ainda mais especial. Pedimos que confirme até a data indicada.</p><div className="deadline"><CalendarDays size={18} /> {wedding.rsvpDeadline}</div><span className="rsvp-decoration" aria-hidden="true">Com carinho, sempre.</span></div>
    <div className="form-card">{state === 'success' ? <div className="success-state" role="status"><div className="success-icon"><Check size={32} /></div><h3>Recebemos sua resposta!</h3><p>Obrigado por responder. Sua confirmação foi registrada com carinho.</p><button className="button-primary" type="button" onClick={() => setState('idle')}>Enviar outra resposta <ArrowRight size={16} /></button></div> : <form onSubmit={submit}>
      <h3>R.S.V.P.</h3><p className="form-subtitle">Confirmação de presença</p>
      <div className="honeypot" aria-hidden="true"><label>Não preencha este campo<input tabIndex={-1} autoComplete="off" name="website" value={values.website} onChange={e => set('website', e.target.value)} /></label></div>
      <label htmlFor="name">Nome completo <span aria-hidden="true">*</span></label><input id="name" name="name" required maxLength={120} autoComplete="name" value={values.name} onChange={e => set('name', e.target.value)} placeholder="Como podemos chamar você?" />
      <fieldset className="attendance"><legend>Você poderá comparecer? <span aria-hidden="true">*</span></legend><div className="radio-grid"><label className={values.attendance === 'sim' ? 'selected' : ''}><input type="radio" name="attendance" value="sim" required checked={values.attendance === 'sim'} onChange={e => set('attendance', e.target.value)} /> Sim, estarei lá!</label><label className={values.attendance === 'nao' ? 'selected' : ''}><input type="radio" name="attendance" value="nao" required checked={values.attendance === 'nao'} onChange={e => set('attendance', e.target.value)} /> Não poderei ir</label></div></fieldset>
      {values.attendance === 'sim' && <><label htmlFor="guests">Total de pessoas incluindo você <span aria-hidden="true">*</span></label><select id="guests" name="guests" required value={values.guests} onChange={e => set('guests', e.target.value)}>{Array.from({length:10},(_,i)=>i+1).map(n=><option key={n} value={n}>{n} {n===1?'pessoa':'pessoas'}</option>)}</select><p className="field-hint">A quantidade deve respeitar o número de convidados do seu convite.</p></>}
      <label htmlFor="message">Mensagem aos noivos <span className="optional">(opcional)</span></label><textarea id="message" name="message" rows="3" maxLength={1000} value={values.message} onChange={e=>set('message',e.target.value)} placeholder="Deixe uma mensagem carinhosa..." />
      {state === 'error' && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="button-primary" disabled={state === 'sending'}>{state === 'sending' ? 'Enviando...' : 'Enviar confirmação'} <Send size={17} /></button>
      <p className="privacy-note">Seus dados serão usados apenas para organizar as confirmações deste evento.</p>
    </form>}</div></div></section>;
}

function Stays() { return <section className="section stays-section" id="hospedagem"><div className="container center"><SectionLabel number="04">Para quem vem de longe</SectionLabel><h2>Hospedagem</h2><p className="lead">Algumas sugestões para aproveitar cada momento da celebração com conforto.</p><div className="stay-grid">{wedding.stays.map((stay,i)=><article className="stay-card" key={i}><div className="stay-number">0{i+1}</div><h3>{stay.name}</h3><p>{stay.detail}</p><SafeLink url={stay.bookingUrl} className="text-link">Ver hospedagem <ArrowRight size={16}/></SafeLink></article>)}</div></div></section>; }
function Gifts() { return <section className="section gifts-section" id="presentes"><div className="container narrow center"><SectionLabel number="05">O maior presente é você</SectionLabel><Gift size={32} strokeWidth={1} className="section-symbol" /><h2>Lista de presentes</h2><p className="lead">Sua presença já é nosso maior presente. Para quem desejar nos presentear, deixamos aqui algumas opções.</p><div className="gift-links">{wedding.gifts.map((gift,i)=><div key={i} className="gift-item"><div><h3>{gift.title}</h3><p>{gift.description}</p></div><SafeLink url={gift.url} className="round-link" ><ArrowRight size={19} /></SafeLink></div>)}</div></div></section>; }
function Message() { return <section className="section message-section" id="mensagem"><div className="container narrow center"><SectionLabel number="06">Uma mensagem especial</SectionLabel><MessageCircleHeart size={31} strokeWidth={1.1} className="section-symbol" /><h2>Para você, com amor</h2><p className="lead">{wedding.introduction}</p><p className="script-note">{wedding.footerMessage}</p><a className="outline-button" href="#rsvp">Confirmar presença <ArrowRight size={17}/></a></div></section>; }

function Footer() { return <footer className="site-footer"><div className="footer-line" aria-hidden="true">✦</div><p className="footer-names">{wedding.names}</p><p>{wedding.dateLabel} · {wedding.cityLabel}</p><a href="#home">Voltar ao início ↑</a></footer>; }

export default function App() { return <><a className="skip-link" href="#historia">Pular para o conteúdo</a><Header/><main><Hero/><Story/><Wedding/><RSVP/><Stays/><Gifts/><Message/></main><Footer/></>; }
