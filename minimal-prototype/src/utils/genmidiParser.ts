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
  note?: number;      // Base note (unused for now)
  mod: GENMIDIOperator;
  car: GENMIDIOperator;
  feedback: number;
  additive: boolean;
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
 * Convert GENMIDI instrument to OPLPatch format
 */
function convertInstrument(inst: GENMIDIInstrument): OPLPatch {
  return {
    id: inst.id,
    name: inst.name,
    modulator: convertOperator(inst.mod),
    carrier: convertOperator(inst.car),
    feedback: inst.feedback,
    connection: inst.additive ? 'additive' : 'fm',
  };
}

/**
 * Fetch and parse GENMIDI.json from public folder
 *
 * @returns Instrument bank with 128 patches
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

  // Validate we have 128 instruments
  if (patches.length !== 128) {
    console.warn(`[GENMIDI] Expected 128 instruments, got ${patches.length}`);
  }

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
