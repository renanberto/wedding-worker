// Run through GitHub Actions so the Cloudflare token stays in the secret store.
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
const project = process.argv[2];
const domain = process.argv[3];
if (!account || !token || !/^[a-z0-9-]+$/.test(project || '') || !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(domain || '')) {
  throw new Error('Configure a conta, o token, o projeto Pages e o domínio.');
}
const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/pages/projects/${project}/domains/${domain}`;
const safe = value => typeof value === 'string' ? value.replaceAll(token, '[REDACTED]').slice(0, 2000) : value;
async function request(method) {
  const response = await fetch(endpoint, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(30000),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    console.error(JSON.stringify({ http_status: response.status, errors: data.errors?.map(error => ({ code: error.code, message: safe(error.message) })) }));
    throw new Error('A API do Cloudflare recusou a consulta ou a revalidação do domínio.');
  }
  return data.result;
}
function report(label, data) {
  console.log(JSON.stringify({
    label,
    name: safe(data.name),
    created_on: safe(data.created_on),
    status: safe(data.status),
    certificate_authority: safe(data.certificate_authority),
    validation_data: {
      method: safe(data.validation_data?.method),
      status: safe(data.validation_data?.status),
      error_message: safe(data.validation_data?.error_message),
      txt_name: safe(data.validation_data?.txt_name),
      txt_value: safe(data.validation_data?.txt_value),
    },
    verification_data: {
      status: safe(data.verification_data?.status),
      error_message: safe(data.verification_data?.error_message),
    },
  }, null, 2));
}
const current = await request('GET');
report('Current domain status', current);
if (process.env.RETRY_VALIDATION === 'true' && ['pending', 'initializing', 'error'].includes(current.status)) {
  report('Validation retry requested', await request('PATCH'));
}
