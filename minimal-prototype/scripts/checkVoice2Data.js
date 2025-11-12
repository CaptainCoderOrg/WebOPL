// Check voice2 data in doom1.json to see if it's actually different from voice1
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const data = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../public/instruments/dmx/doom1.json'),
  'utf8'
));

console.log('Checking Voice 2 data differences from Voice 1:\n');

function operatorsEqual(op1, op2) {
  return JSON.stringify(op1) === JSON.stringify(op2);
}

let differentOperators = 0;
let differentFeedback = 0;
let differentConnection = 0;
let voice2Additive = 0;

for (let i = 0; i < Math.min(10, data.instruments.length); i++) {
  const inst = data.instruments[i];
  console.log(`[${i}] ${inst.name} (isDualVoice: ${inst.isDualVoice})`);

  const v1ModSame = operatorsEqual(inst.voice1.mod, inst.voice2.mod);
  const v1CarSame = operatorsEqual(inst.voice1.car, inst.voice2.car);

  console.log(`  Voice 1 mod === Voice 2 mod: ${v1ModSame}`);
  console.log(`  Voice 1 car === Voice 2 car: ${v1CarSame}`);
  console.log(`  Voice 1 feedback: ${inst.voice1.feedback}, Voice 2 feedback: ${inst.voice2.feedback}`);
  console.log(`  Voice 1 connection: ${inst.voice1.additive}, Voice 2 connection: ${inst.voice2.additive}`);

  if (!v1ModSame || !v1CarSame) differentOperators++;
  if (inst.voice1.feedback !== inst.voice2.feedback) differentFeedback++;
  if (inst.voice1.additive !== inst.voice2.additive) differentConnection++;
  if (inst.voice2.additive) voice2Additive++;

  console.log('');
}

console.log('\nSummary (first 10 instruments):');
console.log(`Different operators: ${differentOperators}`);
console.log(`Different feedback: ${differentFeedback}`);
console.log(`Different connection: ${differentConnection}`);
console.log(`Voice2 uses additive: ${voice2Additive}`);
