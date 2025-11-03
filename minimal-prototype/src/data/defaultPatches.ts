/**
 * Default OPL3 Instrument Patches
 *
 * Fallback instruments when GENMIDI is unavailable.
 * These are carefully crafted to sound good and demonstrate OPL3 capabilities.
 */

import type { OPLPatch } from '../types/OPLPatch';

/**
 * Patch 0: Acoustic Grand Piano
 * Warm, resonant piano sound with moderate sustain
 */
const acousticPiano: OPLPatch = {
  id: 0,
  name: 'Acoustic Grand Piano',
  category: 'Piano',
  modulator: {
    attackRate: 14,
    decayRate: 4,
    sustainLevel: 6,
    releaseRate: 6,
    frequencyMultiplier: 1,
    waveform: 0, // Sine wave
    outputLevel: 18,
    keyScaleLevel: 0,
    amplitudeModulation: false,
    vibrato: false,
    envelopeType: true, // Sustaining
    keyScaleRate: false,
  },
  carrier: {
    attackRate: 14,
    decayRate: 4,
    sustainLevel: 6,
    releaseRate: 6,
    frequencyMultiplier: 1,
    waveform: 0,
    outputLevel: 0, // Full volume
    keyScaleLevel: 0,
    amplitudeModulation: false,
    vibrato: false,
    envelopeType: true,
    keyScaleRate: false,
  },
  feedback: 1,
  connection: 'fm',
};

/**
 * Patch 1: Synth Bass
 * Deep, punchy bass with quick attack
 */
const synthBass: OPLPatch = {
  id: 1,
  name: 'Synth Bass',
  category: 'Bass',
  modulator: {
    attackRate: 15,
    decayRate: 6,
    sustainLevel: 3,
    releaseRate: 4,
    frequencyMultiplier: 1,
    waveform: 0,
    outputLevel: 8,
    keyScaleLevel: 0,
    amplitudeModulation: false,
    vibrato: false,
    envelopeType: true,
    keyScaleRate: false,
  },
  carrier: {
    attackRate: 15,
    decayRate: 6,
    sustainLevel: 3,
    releaseRate: 4,
    frequencyMultiplier: 1,
    waveform: 1, // Half-sine for warmth
    outputLevel: 0,
    keyScaleLevel: 0,
    amplitudeModulation: false,
    vibrato: false,
    envelopeType: true,
    keyScaleRate: false,
  },
  feedback: 2,
  connection: 'fm',
};

/**
 * Patch 2: Square Lead
 * Bright, cutting lead sound
 */
const squareLead: OPLPatch = {
  id: 2,
  name: 'Square Lead',
  category: 'Lead',
  modulator: {
    attackRate: 15,
    decayRate: 2,
    sustainLevel: 4,
    releaseRate: 5,
    frequencyMultiplier: 1,
    waveform: 2, // Abs-sine
    outputLevel: 12,
    keyScaleLevel: 0,
    amplitudeModulation: false,
    vibrato: false,
    envelopeType: true,
    keyScaleRate: false,
  },
  carrier: {
    attackRate: 15,
    decayRate: 2,
    sustainLevel: 4,
    releaseRate: 5,
    frequencyMultiplier: 1,
    waveform: 2, // Abs-sine for square-like timbre
    outputLevel: 0,
    keyScaleLevel: 0,
    amplitudeModulation: false,
    vibrato: false,
    envelopeType: true,
    keyScaleRate: false,
  },
  feedback: 4,
  connection: 'additive', // Additive for richer sound
};

/**
 * Patch 3: Warm Pad
 * Lush, evolving pad sound
 */
const warmPad: OPLPatch = {
  id: 3,
  name: 'Warm Pad',
  category: 'Pad',
  modulator: {
    attackRate: 8, // Slow attack
    decayRate: 3,
    sustainLevel: 2,
    releaseRate: 4,
    frequencyMultiplier: 1,
    waveform: 0,
    outputLevel: 20,
    keyScaleLevel: 0,
    amplitudeModulation: false,
    vibrato: true, // Add vibrato for movement
    envelopeType: true,
    keyScaleRate: false,
  },
  carrier: {
    attackRate: 8,
    decayRate: 3,
    sustainLevel: 2,
    releaseRate: 4,
    frequencyMultiplier: 2, // One octave higher
    waveform: 0,
    outputLevel: 0,
    keyScaleLevel: 0,
    amplitudeModulation: false,
    vibrato: true,
    envelopeType: true,
    keyScaleRate: false,
  },
  feedback: 2,
  connection: 'fm',
};

/**
 * Default instrument bank
 * Export as array for easy iteration
 */
export const defaultPatches: OPLPatch[] = [
  acousticPiano,
  synthBass,
  squareLead,
  warmPad,
];

/**
 * Get patch by ID
 */
export function getDefaultPatch(id: number): OPLPatch | null {
  return defaultPatches.find(p => p.id === id) || null;
}

/**
 * Get patch by name
 */
export function getDefaultPatchByName(name: string): OPLPatch | null {
  return defaultPatches.find(p => p.name === name) || null;
}
