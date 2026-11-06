export default function GuestTable({ rows }) {
  if (!rows.length) return <p role="status">Nenhuma confirmação encontrada.</p>;
  return <div className="guest-table-scroll" role="region" aria-label="Confirmações" tabIndex={0}><table className="guest-table"><thead><tr>{['Nome do convidado', 'Presença', 'Pessoas', 'Mensagem', 'Data da confirmação'].map(title => <th scope="col" key={title}>{title}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id}>
    <td>{row.name}</td><td>{row.attendance === 'yes' ? 'Sim' : 'Não'}</td><td>{row.guests}</td><td>{row.message ? <details><summary>Ver mensagem completa</summary><p className="guest-message">{row.message}</p></details> : '—'}</td><td>{row.createdAt?.toDate().toLocaleString('pt-BR') ?? 'Aguardando data'}</td>
  </tr>)}</tbody></table></div>;
}
