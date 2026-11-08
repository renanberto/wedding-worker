export function validateWeddingId(value) {
  if (typeof value !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || value.length > 80) {
    throw new Error('Informe um weddingId válido.');
  }
  return value;
}
export function hasWeddingAccess(member) {
  return member?.enabled === true && ['owner', 'admin'].includes(member.role);
}
