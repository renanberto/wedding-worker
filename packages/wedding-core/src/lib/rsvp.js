// Mantenha estes limites sincronizados com firestore.rules.
export const RSVP_LIMITS = Object.freeze({ name: 120, message: 1000, guests: 10 });
export function validateRsvp(values) {
  const name = String(values.name ?? '').trim();
  const message = String(values.message ?? '').trim();
  if (!name || name.length > RSVP_LIMITS.name) throw new Error('Informe seu nome completo (até 120 caracteres).');
  if (!['yes', 'no'].includes(values.attendance)) throw new Error('Selecione se você poderá comparecer.');
  const guests = values.attendance === 'no' ? 0 : Number(values.guests);
  if (!Number.isInteger(guests) || guests < 0 || (values.attendance === 'yes' && (guests < 1 || guests > RSVP_LIMITS.guests))) throw new Error('Informe uma quantidade válida de pessoas (1 a 10).');
  if (message.length > RSVP_LIMITS.message) throw new Error('A mensagem deve ter até 1000 caracteres.');
  return { name, attendance: values.attendance, guests, message };
}
export function calculateStats(rows) {
  return rows.reduce((stats, row) => ({
    total: stats.total + 1,
    yes: stats.yes + Number(row.attendance === 'yes'),
    no: stats.no + Number(row.attendance === 'no'),
    people: stats.people + (row.attendance === 'yes' ? row.guests : 0),
  }), { total: 0, yes: 0, no: 0, people: 0 });
}
export function filterResponses(rows, { search = '', attendance = '', order = 'desc' }) {
  return rows.filter(row => row.name.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')) && (!attendance || row.attendance === attendance))
    .sort((a, b) => (order === 'asc' ? 1 : -1) * ((a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0)));
}
