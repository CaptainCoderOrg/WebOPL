/**
 * Test patches for manual console testing
 * TEMPORARY FILE - Will be replaced by defaultPatches.ts in Milestone 2
 */

import type { OPLPatch } from './types/OPLPatch';

/**
 * Basic piano sound (similar to current default)
 */
export const testPiano: OPLPatch = {
  id: 0,
  name: 'Test Piano',
  category: 'Piano',
  modulator: {
    attackRate: 15,
    decayRate: 5,
    sustainLevel: 7,
    releaseRate: 7,
    frequencyMultiplier: 1,
    waveform: 0, // sine
    outputLevel: 16,
    keyScaleLevel: 0,
    amplitudeModulation: false,
    vibrato: false,
    envelopeType: true,
    keyScaleRate: false,
  },
  carrier: {
    attackRate: 15,
    decayRate: 5,
    sustainLevel: 7,
    releaseRate: 7,
    frequencyMultiplier: 1,
    waveform: 0, // sine
    outputLevel: 0, // full volume
    keyScaleLevel: 0,
    amplitudeModulation: false,
    vibrato: false,
    envelopeType: true,
    keyScaleRate: false,
  },
  feedback: 0,
  connection: 'fm',
};

/**
 * Bright organ sound
 */
export const testOrgan: OPLPatch = {
  id: 1,
  name: 'Test Organ',
  category: 'Organ',
  modulator: {
    attackRate: 15,
    decayRate: 0,
    sustainLevel: 0,
    releaseRate: 5,
    frequencyMultiplier: 1,
    waveform: 0,
    outputLevel: 0, // Full modulation
    keyScaleLevel: 0,
    amplitudeModulation: false,
    vibrato: false,
    envelopeType: true,
    keyScaleRate: false,
  },
  carrier: {
    attackRate: 15,
    decayRate: 0,
    sustainLevel: 0,
    releaseRate: 5,
    frequencyMultiplier: 2, // One octave higher
    waveform: 0,
    outputLevel: 0,
    keyScaleLevel: 0,
    amplitudeModulation: false,
    vibrato: false,
    envelopeType: true,
    keyScaleRate: false,
  },
  feedback: 3,
  connection: 'fm',
};

/**
 * Bell sound
 */
export const testBell: OPLPatch = {
  id: 2,
  name: 'Test Bell',
  category: 'Percussion',
  modulator: {
    attackRate: 15,
    decayRate: 10,
    sustainLevel: 15,
    releaseRate: 5,
    frequencyMultiplier: 3,
    waveform: 1, // half-sine
    outputLevel: 10,
    keyScaleLevel: 0,
    amplitudeModulation: false,
    vibrato: false,
    envelopeType: false, // Percussive
    keyScaleRate: false,
  },
  carrier: {
    attackRate: 15,
    decayRate: 10,
    sustainLevel: 15,
    releaseRate: 5,
    frequencyMultiplier: 1,
    waveform: 0,
    outputLevel: 0,
    keyScaleLevel: 0,
    amplitudeModulation: false,
    vibrato: false,
    envelopeType: false,
    keyScaleRate: false,
  },
  feedback: 5,
  connection: 'fm',
};
