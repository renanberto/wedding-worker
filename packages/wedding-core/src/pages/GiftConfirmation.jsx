import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { confirmGift } from '../services/giftService';
import '../gifts.css';
export default function GiftConfirmation() {
  const [params] = useSearchParams();
  const [state, setState] = useState('ready'), [message, setMessage] = useState('');
  const valid = Boolean(params.get('token') && params.get('reservation'));
  async function confirm() {
    setState('loading'); setMessage('');
    try {
      const result = await confirmGift({ token: params.get('token'), reservation: params.get('reservation') });
      setMessage(result.title); setState('success');
      window.history.replaceState(null, '', `${window.location.pathname}#/presentes/confirmar`);
    } catch (e) { setState('error'); setMessage(e.message); }
  }
  return <main className="gift-confirmation"><Link to="/#presentes">← Lista de presentes</Link>
    <h1>{state === 'success' ? 'Presente confirmado!' : 'Confirme sua escolha'}</h1>
    {state === 'success' ? <p role="status">Obrigado! O presente “{message}” ficou reservado para você. Combine a compra e a entrega com os noivos.</p> : <>
      <p>Clique abaixo para confirmar o presente escolhido. Abrir este link ainda não confirma a reserva.</p>
      {!valid && <p role="alert">Link incompleto. Abra o link recebido por e-mail ou escolha novamente na lista.</p>}
      {state === 'error' && <p role="alert" className="gift-error">{message}</p>}
      <button className="gift-button" disabled={!valid || state === 'loading'} onClick={confirm}>{state === 'loading' ? 'Confirmando…' : 'Confirmar presente'}</button>
    </>}
  </main>;
}
