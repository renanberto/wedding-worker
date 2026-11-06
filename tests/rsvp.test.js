import { describe, expect, it } from 'vitest';
import { calculateStats, filterResponses, validateRsvp } from '../src/lib/rsvp';
import { responsesToCsv } from '../src/lib/csv';
const valid = { name: ' João ', attendance: 'yes', guests: '2', message: ' Olá! ' };
const rows = [
  { id: '1', name: 'João', attendance: 'yes', guests: 2, message: 'Olá', createdAt: { toMillis: () => 1, toDate: () => new Date('2026-12-01T12:00:00Z') } },
  { id: '2', name: 'Maria', attendance: 'no', guests: 0, message: '', createdAt: { toMillis: () => 2, toDate: () => new Date('2026-12-02T12:00:00Z') } },
];
describe('Validação RSVP', () => {
  it('normaliza envio válido e ausência', () => {
    expect(validateRsvp(valid)).toEqual({ name: 'João', attendance: 'yes', guests: 2, message: 'Olá!' });
    expect(validateRsvp({ ...valid, attendance: 'no', guests: 8 }).guests).toBe(0);
  });
  it.each([0, -1, 11, 1.5, '', 'abc', Infinity])('rejeita quantidade %s', guests => expect(() => validateRsvp({ ...valid, guests })).toThrow());
  it.each([{ name: '   ' }, { name: 'a'.repeat(121) }, { attendance: '' }, { attendance: 'sim' }, { message: 'x'.repeat(1001) }])('rejeita campos inválidos %s', fields => expect(() => validateRsvp({ ...valid, ...fields })).toThrow());
});
it('calcula os indicadores reais e estado vazio', () => {
  expect(calculateStats(rows)).toEqual({ total: 2, yes: 1, no: 1, people: 2 });
  expect(calculateStats([])).toEqual({ total: 0, yes: 0, no: 0, people: 0 });
});
it('busca, filtra e ordena sem modificar a origem', () => {
  expect(filterResponses(rows, { search: ' JOÃO ' })).toEqual([rows[0]]);
  expect(filterResponses(rows, { attendance: 'no' })).toEqual([rows[1]]);
  expect(filterResponses(rows, { order: 'desc' })).toEqual([rows[1], rows[0]]);
  expect(filterResponses(rows, { order: 'asc' })).toEqual(rows);
  expect(filterResponses(rows, { search: 'ausente' })).toEqual([]);
});
it('exporta UTF-8, datas e conteúdo escapado', () => {
  const csv = responsesToCsv([{ ...rows[0], message: 'Olá, "noivos"\nAté breve' }]);
  expect(csv.startsWith('\uFEFF')).toBe(true);
  expect(csv).toContain('"Olá, ""noivos""\nAté breve"');
  expect(csv).toContain('2026-12-01T12:00:00.000Z');
});
it.each(['=SUM(A1)', '+cmd', '-1+2', '@SUM(A1)', '  =1', '\t=1', '\r@cmd', '\n=1'])('neutraliza fórmula CSV %s', name => {
  expect(responsesToCsv([{ ...rows[0], name }])).toContain(`"'${name}"`);
});
