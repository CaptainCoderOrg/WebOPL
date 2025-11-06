const data = require('./minimal-prototype/public/instruments/GENMIDI.json');

// Heuristic from genmidiParser.ts
function operatorDistance(op1, op2) {
  let distance = 0;
  distance += Math.abs(op1.attack - op2.attack);
  distance += Math.abs(op1.decay - op2.decay);
  distance += Math.abs(op1.sustain - op2.sustain);
  distance += Math.abs(op1.release - op2.release);
  distance += Math.abs(op1.multi - op2.multi);
  distance += Math.abs(op1.out - op2.out);
  distance += Math.abs(op1.wave - op2.wave);
  distance += Math.abs(op1.ksl - op2.ksl);
  return distance;
}

function isDualVoiceWorthwhile(inst) {
  const v1 = inst.voice1;
  const v2 = inst.voice2;

  // Check if feedback or connection differ
  if (v1.feedback !== v2.feedback) return true;
  if (v1.additive !== v2.additive) return true;

  // Check if operator parameters differ significantly
  const modDiff = operatorDistance(v1.mod, v2.mod);
  const carDiff = operatorDistance(v1.car, v2.car);

  const threshold = 10;
  return (modDiff + carDiff) > threshold;
}

data.instruments.slice(0, 4).forEach(i => {
  const dual = isDualVoiceWorthwhile(i);
  console.log(`Patch ${i.id} (${i.name}): Dual-voice = ${dual}`);
});
