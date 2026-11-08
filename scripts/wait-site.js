import { setTimeout } from 'node:timers/promises';
const url = new URL(process.argv[2]);
if (url.protocol !== 'https:') throw new Error('O endereço publicado deve usar HTTPS.');
const deadline = Date.now() + 180000;
let attempt = 0;
while (Date.now() < deadline) {
  attempt++;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (response.ok && (await response.text()).includes('id="root"')) {
      console.log(`Site pronto com HTTPS válido: ${url.origin} (tentativa ${attempt}).`);
      process.exit(0);
    }
  } catch { /* DNS, routing and certificates can need time after the first upload. */ }
  console.log(`Aguardando publicação e HTTPS: tentativa ${attempt}.`);
  await setTimeout(5000);
}
throw new Error(`O site não ficou disponível com HTTPS válido em três minutos: ${url.origin}`);
