// Test script to calculate correct fnum values for MIDI notes
// OPL3 frequency formula: frequency = (fnum × 49716) / 2^(20 - block)
// Rearranged: fnum = (frequency × 2^(20 - block)) / 49716

const SAMPLE_RATE = 49716;

function midiNoteToFrequency(midiNote) {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

function calculateOptimalOPLParams(midiNote) {
  const targetFreq = midiNoteToFrequency(midiNote);

  // Try each block (0-7) and find which gives fnum in optimal range (512-1023)
  let bestBlock = 0;
  let bestFnum = 0;
  let bestError = Infinity;

  for (let block = 0; block <= 7; block++) {
    const fnum = Math.round((targetFreq * Math.pow(2, 20 - block)) / SAMPLE_RATE);

    // Clamp to valid range
    if (fnum < 0 || fnum > 1023) continue;

    // Calculate actual frequency we'd get
    const actualFreq = (fnum * SAMPLE_RATE) / Math.pow(2, 20 - block);
    const error = Math.abs(actualFreq - targetFreq);

    // Prefer fnum in range 512-1023 for best precision
    const inOptimalRange = fnum >= 512 && fnum <= 1023;

    if (inOptimalRange && (bestFnum < 512 || error < bestError)) {
      bestBlock = block;
      bestFnum = fnum;
      bestError = error;
    } else if (!inOptimalRange && bestFnum < 512 && fnum > bestFnum) {
      bestBlock = block;
      bestFnum = fnum;
      bestError = error;
    }
  }

  const actualFreq = (bestFnum * SAMPLE_RATE) / Math.pow(2, 20 - bestBlock);

  return {
    midiNote,
    targetFreq: targetFreq.toFixed(2),
    block: bestBlock,
    fnum: bestFnum,
    fnumHex: '0x' + bestFnum.toString(16).toUpperCase().padStart(3, '0'),
    actualFreq: actualFreq.toFixed(2),
    error: bestError.toFixed(4)
  };
}

console.log('MIDI notes 48-59 (C-3 to B-3):');
console.log('Note | MIDI | Target Hz | Block | Fnum (dec) | Fnum (hex) | Actual Hz | Error Hz');
console.log('-----|------|-----------|-------|------------|------------|-----------|----------');

const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

for (let midiNote = 48; midiNote < 60; midiNote++) {
  const params = calculateOptimalOPLParams(midiNote);
  const noteName = noteNames[midiNote % 12] + '-3';
  console.log(`${noteName.padEnd(5)} ${params.midiNote.toString().padEnd(5)} ${params.targetFreq.padEnd(10)} ${params.block}     ${params.fnum.toString().padEnd(11)} ${params.fnumHex.padEnd(11)} ${params.actualFreq.padEnd(10)} ${params.error}`);
}

console.log('\n\nMIDI notes 60-71 (C-4 to B-4):');
console.log('Note | MIDI | Target Hz | Block | Fnum (dec) | Fnum (hex) | Actual Hz | Error Hz');
console.log('-----|------|-----------|-------|------------|------------|-----------|----------');

for (let midiNote = 60; midiNote < 72; midiNote++) {
  const params = calculateOptimalOPLParams(midiNote);
  const noteName = noteNames[midiNote % 12] + '-4';
  console.log(`${noteName.padEnd(5)} ${params.midiNote.toString().padEnd(5)} ${params.targetFreq.padEnd(10)} ${params.block}     ${params.fnum.toString().padEnd(11)} ${params.fnumHex.padEnd(11)} ${params.actualFreq.padEnd(10)} ${params.error}`);
}
