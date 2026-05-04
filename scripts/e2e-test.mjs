import { createHmac } from 'crypto';

const APP_SECRET = '6d9910782f490ccc237333008ab9c5fb';
const BASE_URL = 'http://localhost:3010';

function makePayload(from, text, msgId) {
  return JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{
      id: 'TEST_BUSINESS_ACCOUNT',
      changes: [{
        field: 'messages',
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '15551234567',
            phone_number_id: '1106155125911770',
          },
          messages: [{
            from,
            id: msgId,
            timestamp: String(Math.floor(Date.now() / 1000)),
            type: 'text',
            text: { body: text },
          }],
        },
      }],
    }],
  });
}

function sign(body) {
  return 'sha256=' + createHmac('sha256', APP_SECRET).update(body).digest('hex');
}

async function postWebhook(body) {
  const sig = sign(body);
  const res = await fetch(`${BASE_URL}/api/wa/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hub-signature-256': sig,
    },
    body,
  });
  return { status: res.status, text: await res.text() };
}

async function run() {
  console.log('\n=== E2E Bot Test ===\n');

  // --- TEST 1: Freidora (should find product) ---
  console.log('TEST 1: Freidora de aire 5 litros hasta 80 mil pesos');
  const payload1 = makePayload(
    '5491123456789',
    'necesito una freidora de aire 5 litros hasta 80 mil pesos',
    'wamid.test001-freidora-' + Date.now()
  );
  const r1 = await postWebhook(payload1);
  console.log(`  → HTTP ${r1.status}: ${r1.text}`);
  console.log(r1.status === 200 ? '  ✅ Webhook OK' : '  ❌ Webhook FAIL');

  await new Promise(r => setTimeout(r, 1500));

  // --- TEST 2: Drone DJI (should NOT find product) ---
  console.log('\nTEST 2: Drone profesional DJI Mavic 3');
  const payload2 = makePayload(
    '5491123456789',
    'quiero un drone profesional dji mavic 3',
    'wamid.test002-drone-' + Date.now()
  );
  const r2 = await postWebhook(payload2);
  console.log(`  → HTTP ${r2.status}: ${r2.text}`);
  console.log(r2.status === 200 ? '  ✅ Webhook OK' : '  ❌ Webhook FAIL');

  console.log('\nAmbos requests enviados. Revisá la DB para confirmar los resultados.\n');
}

run().catch(console.error);
