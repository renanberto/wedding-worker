function cell(value) {
  let text = String(value ?? '');
  // Neutraliza fórmulas mesmo após espaços/caracteres de controle.
  if (/^[\s\p{Cc}]*[=+@-]/u.test(text) || /^[\t\r\n]/u.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function responsesToCsv(rows) {
  const data = rows.map(row => [row.name, row.attendance === 'yes' ? 'Sim' : 'Não', row.guests, row.message, row.createdAt?.toDate().toISOString() ?? '']);
  return '\uFEFF' + [['Nome', 'Presenca', 'Pessoas', 'Mensagem', 'Data'], ...data].map(row => row.map(cell).join(',')).join('\r\n');
}
export function exportResponses(rows) {
  const url = URL.createObjectURL(new Blob([responsesToCsv(rows)], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `confirmacoes-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
