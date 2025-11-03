/**
 * OPL3 Patch Type Definitions
 *
 * Defines the structure for OPL3 instrument patches.
 * Each patch consists of 2 operators (Modulator + Carrier) in 2-operator FM synthesis mode.
 */

/**
 * Single OPL3 operator configuration
 */
export interface OPLOperator {
  // ADSR Envelope (0-15 for all)
  attackRate: number;          // 0=slowest, 15=fastest attack
  decayRate: number;           // 0=slowest, 15=fastest decay
  sustainLevel: number;        // 0=loudest sustain, 15=softest
  releaseRate: number;         // 0=slowest, 15=fastest release

  // Frequency & Timbre
  frequencyMultiplier: number; // 0-15: 0=×0.5, 1=×1, 2=×2, etc.
  waveform: number;            // 0-7: 0=sine, 1=half-sine, 2=abs-sine, 3=quarter-sine

  // Volume & Modulation
  outputLevel: number;         // 0-63: 0=loudest, 63=silent
  keyScaleLevel: number;       // 0-3: Volume scaling with pitch

  // Flags (boolean modulation options)
  amplitudeModulation: boolean; // Tremolo effect on/off
  vibrato: boolean;             // Pitch vibrato on/off
  envelopeType: boolean;        // true=sustaining, false=percussive
  keyScaleRate: boolean;        // Scale envelope speed with pitch
}

/**
 * Complete OPL3 instrument patch (2-operator FM synthesis)
 */
export interface OPLPatch {
  id: number;                   // Instrument ID (0-127 for GM compatibility)
  name: string;                 // Display name (e.g., "Acoustic Grand Piano")
  category?: string;            // Optional category (e.g., "Piano", "Bass", "Lead")

  // Operators (FM synthesis: modulator modulates carrier)
  modulator: OPLOperator;       // Operator 1: Modulates the carrier
  carrier: OPLOperator;         // Operator 2: Produces final sound

  // Channel configuration
  feedback: number;             // 0-7: Modulator self-modulation depth
  connection: 'fm' | 'additive'; // FM (mod→car) vs Additive (mod+car mixed)

  // GENMIDI-specific: Base note offset for pitch correction
  noteOffset?: number;          // MIDI note offset (from GENMIDI 'note' field)

  // Metadata (for user customization tracking)
  isCustom?: boolean;           // True if user-edited
  basePresetId?: number;        // If custom, which preset it was based on
}

/**
 * Instrument bank (collection of patches)
 */
export interface InstrumentBank {
  name: string;                 // Bank name (e.g., "GENMIDI", "Custom")
  version: string;              // Version string
  patches: OPLPatch[];          // Array of instruments (typically 128 for GM)
}
