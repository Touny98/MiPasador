import { createHmac } from 'crypto';
import { readFileSync } from 'fs';

// Read the payload file
const payload = readFileSync('./test-payload.json', 'utf8');
console.log('Payload length:', payload.length);
console.log('First 50 chars:', payload.substring(0, 50));
console.log('Last 50 chars:', payload.substring(payload.length - 50));

const secret = '6d9910782f490ccc237333008ab9c5fb';
const hmac = createHmac('sha256', secret);
hmac.update(payload);
const expectedSignature = hmac.digest('hex');
console.log('Expected signature:', expectedSignature);

// What we calculated earlier
const ourCalc = 'a09e4948fb1e23c30d2cc992138c79090db93a8e6faefff979575b3ffee2fb6d';
console.log('Our calculation:', ourCalc);
console.log('Match:', expectedSignature === ourCalc);