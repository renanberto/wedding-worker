import GiftCatalog from '@wedding/core/components/gifts/GiftCatalog.jsx';
import { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, ChevronDown, ExternalLink, Gift, Heart, MapPin, LockKeyhole, Menu, MessageCircleHeart, X } from 'lucide-react';
import { wedding } from './content';
import { Link, useLocation } from 'react-router-dom';
import RsvpForm from '@wedding/core/components/rsvp/RsvpForm.jsx';

const navigation = [
  ['home', 'Home'], ['historia', 'Nossa história'], ['casamento', 'Casamento'],
  ['rsvp', 'R.S.V.P.'], ['hospedagem', 'Hospedagem'], ['presentes', 'Presentes'], ['mensagem', 'Mensagem'],
];
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
    <Link to="/#home" className="brand" aria-label="Ir para o início">
      <img src={`${import.meta.env.BASE_URL}images/monograma-referencia.webp`} alt="Monograma do casal" />
    </Link>
    <Link to="/admin/login" className="couple-login"><LockKeyhole size={15} aria-hidden="true" /><span>Login dos noivos</span></Link>
    <button className="mobile-menu-button" type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-controls="primary-nav" aria-label={open ? 'Fechar menu' : 'Abrir menu'}>{open ? <X /> : <Menu />}</button>
    <nav className={`primary-nav ${open ? 'is-open' : ''}`} id="primary-nav" aria-label="Menu principal">
      {navigation.map(([id, label]) => <Link to={`/#${id}`} onClick={() => setOpen(false)} key={id}>{label}</Link>)}
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
    <Link to="/#historia" className="scroll-cue" aria-label="Conheça nossa história"><ChevronDown size={20} /></Link>
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

export function RSVP() {
  return <section className="section rsvp-section" id="rsvp"><div className="container rsvp-layout"><div className="rsvp-intro"><SectionLabel number="03">Sua presença importa</SectionLabel><h2>Confirme sua presença</h2><p>Sua companhia tornará esse momento ainda mais especial. Pedimos que confirme até a data indicada.</p><div className="deadline"><CalendarDays size={18} /> {wedding.rsvpDeadline}</div><span className="rsvp-decoration" aria-hidden="true">Com carinho, sempre.</span></div>
    <RsvpForm /></div></section>;
}

function Stays() { return <section className="section stays-section" id="hospedagem"><div className="container center"><SectionLabel number="04">Para quem vem de longe</SectionLabel><h2>Hospedagem</h2><p className="lead">Algumas sugestões para aproveitar cada momento da celebração com conforto.</p><div className="stay-grid">{wedding.stays.map((stay,i)=><article className="stay-card" key={i}><div className="stay-number">0{i+1}</div><h3>{stay.name}</h3><p>{stay.detail}</p><SafeLink url={stay.bookingUrl} className="text-link">Ver hospedagem <ArrowRight size={16}/></SafeLink></article>)}</div></div></section>; }
function Gifts() { return <section className="section gifts-section" id="presentes"><div className="container narrow center"><SectionLabel number="05">O maior presente é você</SectionLabel><Gift size={32} strokeWidth={1} className="section-symbol" /><h2>Lista de presentes</h2><p className="lead">Sua presença já é nosso maior presente. Para quem desejar nos presentear, deixamos aqui algumas opções.</p><GiftCatalog /></div></section>; }
function Message() { return <section className="section message-section" id="mensagem"><div className="container narrow center"><SectionLabel number="06">Uma mensagem especial</SectionLabel><MessageCircleHeart size={31} strokeWidth={1.1} className="section-symbol" /><h2>Para você, com amor</h2><p className="lead">{wedding.introduction}</p><p className="script-note">{wedding.footerMessage}</p><Link className="outline-button" to="/#rsvp">Confirmar presença <ArrowRight size={17}/></Link></div></section>; }

function Footer() { return <footer className="site-footer"><div className="footer-line" aria-hidden="true">✦</div><p className="footer-names">{wedding.names}</p><p>{wedding.dateLabel} · {wedding.cityLabel}</p><Link to="/#home">Voltar ao início ↑</Link></footer>; }

export default function App() {
  const location = useLocation();
  useEffect(() => {
    const id = location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView();
  }, [location]);
  return <><Link className="skip-link" to="/#historia">Pular para o conteúdo</Link><Header/><main><Hero/><Story/><Wedding/><RSVP/><Stays/><Gifts/><Message/></main><Footer/></>; }
