import { useRef, useState } from 'react';
import { ArrowRight, Check, Send } from 'lucide-react';
import { submitRsvp } from '../../services/rsvpService';
import { RSVP_LIMITS } from '../../lib/rsvp';
import { demoMode } from '../../lib/site';

const emptyForm = { name: '', attendance: '', guests: '1', message: '', website: '' };
export default function RsvpForm() {
  const sending = useRef(false);
  const [values, setValues] = useState(emptyForm);
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');
  const set = (key, value) => setValues(prev => ({ ...prev, [key]: value }));
  async function submit(e) {
    e.preventDefault();
    if (sending.current || values.website) return;
    sending.current = true;
    setError(''); setState('sending');
    try {
      await submitRsvp(values);
      setState('success'); setValues(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar. Tente novamente.'); setState('error');
    } finally { sending.current = false; }
  }
  return <div className="form-card">{state === 'success' ? <div className="success-state" role="status"><div className="success-icon"><Check size={32} /></div><h3>Recebemos sua resposta!</h3><p>Obrigado por responder. Sua confirmação foi registrada com carinho.</p><button className="button-primary" type="button" onClick={() => setState('idle')}>Enviar outra resposta <ArrowRight size={16} /></button></div> : <form onSubmit={submit}>
      <h3>R.S.V.P.</h3><p className="form-subtitle">Confirmação de presença</p>
      <div className="honeypot" aria-hidden="true"><label>Não preencha este campo<input tabIndex={-1} autoComplete="off" name="website" value={values.website} onChange={e => set('website', e.target.value)} /></label></div>
      <label htmlFor="name">Nome completo <span aria-hidden="true">*</span></label><input id="name" name="name" required maxLength={RSVP_LIMITS.name} autoComplete="name" value={values.name} onChange={e => set('name', e.target.value)} placeholder="Como podemos chamar você?" />
      <fieldset className="attendance"><legend>Você poderá comparecer? <span aria-hidden="true">*</span></legend><div className="radio-grid"><label className={values.attendance === 'yes' ? 'selected' : ''}><input type="radio" name="attendance" value="yes" required checked={values.attendance === 'yes'} onChange={e => set('attendance', e.target.value)} /> Sim, estarei lá!</label><label className={values.attendance === 'no' ? 'selected' : ''}><input type="radio" name="attendance" value="no" required checked={values.attendance === 'no'} onChange={e => set('attendance', e.target.value)} /> Não poderei ir</label></div></fieldset>
      {values.attendance === 'yes' && <><label htmlFor="guests">Total de pessoas incluindo você <span aria-hidden="true">*</span></label><select id="guests" name="guests" required value={values.guests} onChange={e => set('guests', e.target.value)}>{Array.from({length:RSVP_LIMITS.guests},(_,i)=>i+1).map(n=><option key={n} value={n}>{n} {n===1?'pessoa':'pessoas'}</option>)}</select><p className="field-hint">A quantidade deve respeitar o número de convidados do seu convite.</p></>}
      <label htmlFor="message">Mensagem aos noivos <span className="optional">(opcional)</span></label><textarea id="message" name="message" rows="3" maxLength={RSVP_LIMITS.message} value={values.message} onChange={e=>set('message',e.target.value)} placeholder="Deixe uma mensagem carinhosa..." />
      {state === 'error' && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="button-primary" disabled={state === 'sending'}>{state === 'sending' ? 'Enviando...' : 'Enviar confirmação'} <Send size={17} /></button>
      <p className="privacy-note">{demoMode ? 'Demonstração: use dados fictícios. Sua resposta fica somente nesta aba e não é enviada a um servidor.' : 'Seus dados serão usados apenas para organizar as confirmações deste evento.'}</p>
    </form>}</div>;
}
