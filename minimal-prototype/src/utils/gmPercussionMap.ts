/**
 * General MIDI to GENMIDI Percussion Mapping
 *
 * Maps General MIDI percussion note numbers (35-81) to GENMIDI instrument IDs.
 * This is needed because GENMIDI percussion instruments use arbitrary noteOffset
 * values that don't align with the General MIDI standard.
 */

/**
 * General MIDI percussion note to GENMIDI instrument ID mapping
 *
 * General MIDI uses notes 35-81 for percussion on channel 10
 * GENMIDI has instruments 128-174 with arbitrary noteOffset values
 *
 * This mapping was created by matching instrument names between the two standards.
 */
export const GM_TO_GENMIDI_PERCUSSION: Record<number, number> = {
  // Bass Drums
  35: 128,  // Acoustic Bass Drum → ID 128
  36: 128,  // Bass Drum 1 → ID 128 (same as Acoustic Bass Drum)

  // Snares
  37: 130,  // Side Stick → ID 130 (Slide Stick)
  38: 131,  // Acoustic Snare → ID 131
  39: 132,  // Hand Clap → ID 132
  40: 133,  // Electric Snare → ID 133

  // Toms
  41: 134,  // Low Floor Tom → ID 134
  43: 136,  // High Floor Tom → ID 136
  45: 138,  // Low Tom → ID 138
  47: 140,  // Low-Mid Tom → ID 140
  48: 141,  // Hi-Mid Tom → ID 141
  50: 143,  // High Tom → ID 143

  // Hi-Hats
  42: 135,  // Closed Hi-Hat → ID 135
  44: 137,  // Pedal Hi-Hat → ID 137
  46: 139,  // Open Hi-Hat → ID 139

  // Cymbals
  49: 142,  // Crash Cymbal 1 → ID 142
  51: 144,  // Ride Cymbal 1 → ID 144
  52: 145,  // Chinese Cymbal → ID 145
  53: 146,  // Ride Bell → ID 146
  55: 148,  // Splash Cymbal → ID 148
  57: 150,  // Crash Cymbal 2 → ID 150
  59: 152,  // Ride Cymbal 2 → ID 152

  // Percussion
  54: 147,  // Tambourine → ID 147
  56: 149,  // Cowbell → ID 149
  58: 151,  // Vibraslap → ID 151

  // Latin Percussion
  60: 153,  // Hi Bongo → ID 153
  61: 154,  // Low Bongo → ID 154
  62: 155,  // Mute Hi Conga → ID 155
  63: 156,  // Open Hi Conga → ID 156
  64: 157,  // Low Conga → ID 157
  65: 158,  // High Timbale → ID 158
  66: 159,  // Low Timbale → ID 159
  67: 160,  // High Agogo → ID 160
  68: 161,  // Low Agogo → ID 161
  69: 162,  // Cabasa → ID 162
  70: 163,  // Maracas → ID 163

  // Note: Some GM percussion notes may not have GENMIDI equivalents
  // and will fall back to a default sound or be silent
};

/**
 * Get GENMIDI instrument ID for a General MIDI percussion note
 * @param gmNote - General MIDI percussion note number (35-81)
 * @returns GENMIDI instrument ID (128-174), or undefined if no mapping exists
 */
export function getGENMIDIPercussionId(gmNote: number): number | undefined {
  return GM_TO_GENMIDI_PERCUSSION[gmNote];
}

/**
 * Check if a MIDI note is a valid GM percussion note
 * @param midiNote - MIDI note number
 * @returns True if the note is in the GM percussion range (35-81)
 */
export function isGMPercussionNote(midiNote: number): boolean {
  return midiNote >= 35 && midiNote <= 81;
}
