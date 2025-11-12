/**
 * GENMIDI Parser
 *
 * Loads and parses GENMIDI.json instrument bank.
 * Converts GENMIDI format to OPLPatch format.
 */

import type { OPLPatch, OPLOperator, InstrumentBank } from '../types/OPLPatch';

/**
 * GENMIDI JSON format (from file)
 */
interface GENMIDIOperator {
  trem: boolean;      // Amplitude modulation (tremolo)
  vib: boolean;       // Vibrato
  sus: boolean;       // Sustaining sound
  ksr: boolean;       // Key scale rate
  multi: number;      // Frequency multiplier (0-15)
  ksl: number;        // Key scale level (0-3)
  out: number;        // Output level (0-63)
  attack: number;     // Attack rate (0-15)
  decay: number;      // Decay rate (0-15)
  sustain: number;    // Sustain level (0-15)
  release: number;    // Release rate (0-15)
  wave: number;       // Waveform (0-7)
}

interface GENMIDIInstrument {
  id: number;
  name: string;
  note?: number;

  // Voice 1
  voice1: {
    mod: GENMIDIOperator;
    car: GENMIDIOperator;
    feedback: number;
    additive: boolean;
    baseNote?: number;
  };

  // Voice 2
  voice2: {
    mod: GENMIDIOperator;
    car: GENMIDIOperator;
    feedback: number;
    additive: boolean;
    baseNote?: number;
  };
}

interface GENMIDIData {
  name: string;
  version: string;
  instruments: GENMIDIInstrument[];
}

/**
 * Convert GENMIDI operator to OPLOperator format
 */
function convertOperator(op: GENMIDIOperator): OPLOperator {
  return {
    attackRate: op.attack,
    decayRate: op.decay,
    sustainLevel: op.sustain,
    releaseRate: op.release,
    frequencyMultiplier: op.multi,
    waveform: op.wave,
    outputLevel: op.out,
    keyScaleLevel: op.ksl,
    amplitudeModulation: op.trem,
    vibrato: op.vib,
    envelopeType: op.sus,
    keyScaleRate: op.ksr,
  };
}

/**
 * Calculate "distance" between two operators (sum of absolute differences)
 */
function operatorDistance(op1: GENMIDIOperator, op2: GENMIDIOperator): number {
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

/**
 * Heuristic: Check if Voice 2 is significantly different from Voice 1
 * If Voice 2 is identical or nearly identical to Voice 1, dual-voice is wasteful
 */
function isDualVoiceWorthwhile(inst: GENMIDIInstrument): boolean {
  const v1 = inst.voice1;
  const v2 = inst.voice2;

  // Check if feedback or connection differ
  if (v1.feedback !== v2.feedback) return true;
  if (v1.additive !== v2.additive) return true;

  // Check if operator parameters differ significantly
  const modDiff = operatorDistance(v1.mod, v2.mod);
  const carDiff = operatorDistance(v1.car, v2.car);

  // If combined difference > threshold, enable dual-voice
  const threshold = 10; // Arbitrary threshold (tune later based on testing)
  return (modDiff + carDiff) > threshold;
}

/**
 * Convert GENMIDI instrument to OPLPatch format
 */
function convertInstrument(inst: GENMIDIInstrument): OPLPatch {
  // Determine if dual-voice should be enabled
  const shouldEnableDualVoice = isDualVoiceWorthwhile(inst);

  return {
    id: inst.id,
    name: inst.name,
    noteOffset: inst.note,

    // Voice 1
    voice1: {
      modulator: convertOperator(inst.voice1.mod),
      carrier: convertOperator(inst.voice1.car),
      feedback: inst.voice1.feedback,
      connection: inst.voice1.additive ? 'additive' : 'fm',
      baseNote: inst.voice1.baseNote
    },

    // Voice 2
    voice2: {
      modulator: convertOperator(inst.voice2.mod),
      carrier: convertOperator(inst.voice2.car),
      feedback: inst.voice2.feedback,
      connection: inst.voice2.additive ? 'additive' : 'fm',
      baseNote: inst.voice2.baseNote
    },

    // Backward compatibility: expose Voice 1 as top-level
    modulator: convertOperator(inst.voice1.mod),
    carrier: convertOperator(inst.voice1.car),
    feedback: inst.voice1.feedback,
    connection: inst.voice1.additive ? 'additive' : 'fm',

    // Enable dual-voice if Voice 2 is different enough
    dualVoiceEnabled: shouldEnableDualVoice
  };
}

/**
 * Fetch and parse GENMIDI.json from public folder
 *
 * @returns Instrument bank with 175 patches (128 melodic + 47 percussion)
 * @throws Error if fetch fails or JSON is invalid
 */
export async function loadGENMIDI(): Promise<InstrumentBank> {
  console.log('[GENMIDI] Fetching instrument bank...');

  const response = await fetch('/instruments/GENMIDI.json');

  if (!response.ok) {
    throw new Error(`Failed to fetch GENMIDI: ${response.status} ${response.statusText}`);
  }

  const json: GENMIDIData = await response.json();

  console.log(`[GENMIDI] Loaded ${json.instruments.length} instruments from ${json.name}`);

  // Convert all instruments
  const patches = json.instruments.map(convertInstrument);

  // Validate we have 175 instruments (128 melodic + 47 percussion)
  if (patches.length !== 175) {
    console.warn(`[GENMIDI] Expected 175 instruments (128 melodic + 47 percussion), got ${patches.length}`);
  }

  // Count dual-voice enabled instruments
  const dualVoiceCount = patches.filter(p => p.dualVoiceEnabled).length;
  console.log(`[GENMIDI] Dual-voice enabled for ${dualVoiceCount}/${patches.length} instruments`);

  return {
    name: json.name,
    version: json.version,
    patches: patches,
  };
}

/**
 * Validate a single patch has all required fields
 */
export function validatePatch(patch: OPLPatch): boolean {
  try {
    // Check required fields exist
    if (typeof patch.id !== 'number') return false;
    if (typeof patch.name !== 'string') return false;
    if (!patch.modulator || !patch.carrier) return false;

    // Validate operator ranges
    const validateOp = (op: OPLOperator): boolean => {
      return (
        op.attackRate >= 0 && op.attackRate <= 15 &&
        op.decayRate >= 0 && op.decayRate <= 15 &&
        op.sustainLevel >= 0 && op.sustainLevel <= 15 &&
        op.releaseRate >= 0 && op.releaseRate <= 15 &&
        op.frequencyMultiplier >= 0 && op.frequencyMultiplier <= 15 &&
        op.waveform >= 0 && op.waveform <= 7 &&
        op.outputLevel >= 0 && op.outputLevel <= 63 &&
        op.keyScaleLevel >= 0 && op.keyScaleLevel <= 3
      );
    };

    if (!validateOp(patch.modulator)) return false;
    if (!validateOp(patch.carrier)) return false;

    // Validate feedback
    if (patch.feedback < 0 || patch.feedback > 7) return false;

    return true;
  } catch (error) {
    console.error('[GENMIDI] Patch validation error:', error);
    return false;
  }
}
