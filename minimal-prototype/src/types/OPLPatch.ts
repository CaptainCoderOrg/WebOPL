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
 * Single voice in a dual-voice instrument
 * Each voice consists of 2 operators (modulator + carrier)
 */
export interface OPLVoice {
  modulator: OPLOperator;
  carrier: OPLOperator;
  feedback: number;              // 0-7: Modulator self-modulation depth
  connection: 'fm' | 'additive'; // FM (mod→car) vs Additive (mod+car mixed)
  baseNote?: number;             // Base note offset from GENMIDI (int16, -1200 to +1200 cents)
}

/**
 * Complete OPL3 instrument patch (2-operator FM synthesis)
 * Supports both single-voice (backward compatible) and dual-voice modes
 */
export interface OPLPatch {
  id: number;                   // Instrument ID (0-127 for GM compatibility)
  name: string;                 // Display name (e.g., "Acoustic Grand Piano")
  category?: string;            // Optional category (e.g., "Piano", "Bass", "Lead")

  // Backward compatibility: Single-voice format (always Voice 1)
  modulator: OPLOperator;       // Operator 1: Modulates the carrier
  carrier: OPLOperator;         // Operator 2: Produces final sound
  feedback: number;             // 0-7: Modulator self-modulation depth
  connection: 'fm' | 'additive'; // FM (mod→car) vs Additive (mod+car mixed)

  // Dual-voice format (new)
  voice1?: OPLVoice;            // Voice 1 (detailed format)
  voice2?: OPLVoice;            // Voice 2 (detailed format)

  // Control flags
  isDualVoice?: boolean;        // True if instrument uses both voices (computed from voice2 data or flags)
  dualVoiceEnabled?: boolean;   // DEPRECATED: Use isDualVoice instead (kept for backward compatibility)

  // GENMIDI/DMX-specific fields
  flags?: number;               // OP2 flags field (bit 0=fixed pitch, bit 2=dual-voice)
  finetune?: number;            // OP2 finetune field (128=normal, <128=flat, >128=sharp)
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
  metadata?: {                  // Optional collection metadata
    source?: string;            // Source URL
    license?: string;           // License type
    author?: string;            // Author name
    game?: string;              // Associated game
    year?: number;              // Year of creation
  };
}
