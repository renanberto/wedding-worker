import { describe, expect, it, vi } from 'vitest';
import { parseOptions, provisionNoivo } from '../scripts/add-noivo.js';

const missing = () => Object.assign(new Error('missing'), { code: 'auth/user-not-found' });
function fixture(user) {
  const create = vi.fn().mockResolvedValue(undefined);
  const doc = vi.fn().mockReturnValue({ create });
  const collection = vi.fn().mockReturnValue({ doc });
  return {
    auth: {
      getUserByEmail: user ? vi.fn().mockResolvedValue(user) : vi.fn().mockRejectedValue(missing()),
      createUser: vi.fn().mockResolvedValue({ uid: 'new-uid', email: 'noiva@example.com' }),
    },
    db: { collection }, email: 'noiva@example.com', displayName: 'Noiva',
    getPassword: vi.fn().mockResolvedValue('senha-de-teste'), timestamp: () => 'server-time',
    create, doc, collection,
  };
}

describe('cadastro administrativo dos noivos', () => {
  it('cria conta e autoriza exatamente seu UID', async () => {
    const f = fixture();
    await expect(provisionNoivo(f)).resolves.toEqual({ uid: 'new-uid', created: true });
    expect(f.auth.createUser).toHaveBeenCalledWith({ email: f.email, password: 'senha-de-teste', displayName: 'Noiva' });
    expect(f.collection).toHaveBeenCalledWith('admins');
    expect(f.doc).toHaveBeenCalledWith('new-uid');
    expect(f.create).toHaveBeenCalledWith({ email: f.email, createdAt: 'server-time' });
  });
  it('reutiliza conta e autorização sem alterar senha ou metadados', async () => {
    const f = fixture({ uid: 'existing', email: 'noiva@example.com', providerData: [{ providerId: 'password' }] });
    f.create.mockRejectedValue({ code: 6 });
    await expect(provisionNoivo(f)).resolves.toEqual({ uid: 'existing', created: false });
    expect(f.getPassword).not.toHaveBeenCalled();
    expect(f.auth.createUser).not.toHaveBeenCalled();
  });
  it.each([
    { uid: 'disabled', disabled: true },
    { uid: 'google-only', providerData: [{ providerId: 'google.com' }] },
  ])('não concede acesso à conta incompatível $uid', async user => {
    const f = fixture(user);
    await expect(provisionNoivo(f)).rejects.toThrow();
    expect(f.create).not.toHaveBeenCalled();
    expect(f.auth.createUser).not.toHaveBeenCalled();
  });
  it('não trata falha de credencial como usuário ausente', async () => {
    const f = fixture();
    f.auth.getUserByEmail.mockRejectedValue({ code: 'auth/insufficient-permission' });
    await expect(provisionNoivo(f)).rejects.toMatchObject({ code: 'auth/insufficient-permission' });
    expect(f.auth.createUser).not.toHaveBeenCalled();
    expect(f.create).not.toHaveBeenCalled();
  });
  it('preserva falha no Firestore para permitir concluir o cadastro na reexecução', async () => {
    const f = fixture();
    const onCreated = vi.fn();
    f.create.mockRejectedValue({ code: 7 });
    await expect(provisionNoivo({ ...f, onCreated })).rejects.toMatchObject({ code: 7 });
    expect(onCreated).toHaveBeenCalledWith('new-uid');
    expect(f.auth.createUser).toHaveBeenCalledTimes(1);
  });
  it('rejeita senha inválida antes de criar ou autorizar', async () => {
    const f = fixture();
    f.getPassword.mockResolvedValue('123');
    await expect(provisionNoivo(f)).rejects.toThrow('senha');
    expect(f.auth.createUser).not.toHaveBeenCalled();
    expect(f.create).not.toHaveBeenCalled();
  });
  it('rejeita argumentos inválidos e exige projeto explícito ou configurado', () => {
    expect(parseOptions(['--help'])).toEqual({ help: true });
    expect(() => parseOptions(['--email', 'inválido'], 'project')).toThrow('e-mail');
    expect(() => parseOptions(['--email', 'noiva@example.com'])).toThrow('--project');
    expect(() => parseOptions(['--email', 'noiva@example.com', '--password', 'secret'], 'project')).toThrow();
    expect(parseOptions(['--email', ' noiva@example.com ', '--project', 'other'], 'default')).toEqual({
      email: 'noiva@example.com', projectId: 'other', displayName: undefined,
    });
  });
});
