/**
 * SimpleSynth - OPL3 Synthesizer Wrapper
 *
 * Manages OPL3 instance and Web Audio API integration.
 * Supports 9 simultaneous voices (channels 0-8).
 */

import type { OPLPatch, OPLOperator } from './types/OPLPatch';

// Type definition for the global OPL class
declare global {
  interface Window {
    OPL?: any;
  }
}

export class SimpleSynth {
  private opl: any = null;
  private audioContext: AudioContext | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  private activeChannels: Map<number, number> = new Map(); // channel → MIDI note
  private channelPatches: Map<number, OPLPatch> = new Map(); // channel → loaded patch
  private isInitialized: boolean = false;

  /**
   * Load a script dynamically
   */
  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  /**
   * Initialize OPL3 and Web Audio
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      console.warn('[SimpleSynth] Already initialized');
      return;
    }

    console.log('[SimpleSynth] Initializing...');

    try {
      // Step 1: Load the WASM module as a script tag (creates global 'opl' function)
      console.log('[SimpleSynth] Loading OPL WASM module...');
      await this.loadScript('/lib/opl.js');
      console.log('[SimpleSynth] ✅ WASM module loaded');

      // Step 2: Load the OPL wrapper class (uses the global 'opl')
      console.log('[SimpleSynth] Loading OPL wrapper...');
      await this.loadScript('/opl-wrapper.js');
      console.log('[SimpleSynth] ✅ OPL wrapper loaded');

      if (!window.OPL || typeof window.OPL.create !== 'function') {
        throw new Error('OPL class not found on window object');
      }

      // Step 3: Create OPL instance
      console.log('[SimpleSynth] Creating OPL instance...');
      this.opl = await window.OPL.create(49716, 2); // 49716 Hz, stereo
      console.log('[SimpleSynth] ✅ OPL instance created');

      // Step 4: Enable waveform selection (required for custom waveforms)
      this.opl.write(0x01, 0x20);

      console.log('[SimpleSynth] Initialized OPL3 synthesizer with 9 channels');
      console.log('[SimpleSynth] Ready for patch loading');

      // Step 5: Create AudioContext
      this.audioContext = new AudioContext({ sampleRate: 49716 });
      console.log('[SimpleSynth] ✅ AudioContext created');
      console.log('[SimpleSynth]    Sample rate:', this.audioContext.sampleRate);

      // Step 6: Create ScriptProcessorNode
      const bufferSize = 4096;
      this.scriptNode = this.audioContext.createScriptProcessor(bufferSize, 0, 2);
      this.scriptNode.onaudioprocess = this.processAudio.bind(this);
      this.scriptNode.connect(this.audioContext.destination);
      console.log('[SimpleSynth] ✅ Audio processor connected');

      this.isInitialized = true;
      console.log('[SimpleSynth] Initialization complete!');
    } catch (error) {
      console.error('[SimpleSynth] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get operator offsets for a channel
   * OPL3 has an irregular operator layout that doesn't follow a linear pattern
   *
   * @param channelId Channel number (0-8)
   * @returns [modulatorOffset, carrierOffset]
   */
  private getOperatorOffsets(channelId: number): [number, number] {
    // Operator offsets for each channel
    const operatorMap: [number, number][] = [
      [0x00, 0x03], // Channel 0
      [0x01, 0x04], // Channel 1
      [0x02, 0x05], // Channel 2
      [0x08, 0x0B], // Channel 3
      [0x09, 0x0C], // Channel 4
      [0x0A, 0x0D], // Channel 5
      [0x10, 0x13], // Channel 6
      [0x11, 0x14], // Channel 7
      [0x12, 0x15], // Channel 8
    ];

    return operatorMap[channelId];
  }

  /**
   * Write all registers for a single operator
   *
   * @param operatorOffset Operator offset (0x00-0x15)
   * @param operator Operator configuration
   */
  private writeOperatorRegisters(operatorOffset: number, operator: OPLOperator): void {
    // Register 0x20: AM/VIB/EG/KSR/MULT
    const reg20 =
      operator.frequencyMultiplier |
      (operator.keyScaleRate ? 0x10 : 0) |
      (operator.envelopeType ? 0x20 : 0) |
      (operator.vibrato ? 0x40 : 0) |
      (operator.amplitudeModulation ? 0x80 : 0);
    this.opl.write(0x20 + operatorOffset, reg20);

    // Register 0x40: KSL/Output Level
    const reg40 = operator.outputLevel | (operator.keyScaleLevel << 6);
    this.opl.write(0x40 + operatorOffset, reg40);

    // Register 0x60: Attack/Decay
    const reg60 = operator.decayRate | (operator.attackRate << 4);
    this.opl.write(0x60 + operatorOffset, reg60);

    // Register 0x80: Sustain/Release
    const reg80 = operator.releaseRate | (operator.sustainLevel << 4);
    this.opl.write(0x80 + operatorOffset, reg80);

    // Register 0xE0: Waveform
    this.opl.write(0xE0 + operatorOffset, operator.waveform);
  }

  /**
   * Load an instrument patch to a specific channel
   * Reprograms all OPL3 registers for the channel's operators
   *
   * @param channelId Channel number (0-8)
   * @param patch OPL patch to load
   */
  public loadPatch(channelId: number, patch: OPLPatch): void {
    if (channelId < 0 || channelId >= 9) {
      throw new Error(`Invalid channel: ${channelId}. Must be 0-8.`);
    }

    console.log(`[SimpleSynth] Loading patch "${patch.name}" to channel ${channelId}`);

    // Store patch for this channel
    this.channelPatches.set(channelId, patch);

    // Get operator offsets for this channel
    const [modOffset, carOffset] = this.getOperatorOffsets(channelId);

    // Program modulator operator
    this.writeOperatorRegisters(modOffset, patch.modulator);

    // Program carrier operator
    this.writeOperatorRegisters(carOffset, patch.carrier);

    // Program channel configuration (feedback and connection)
    const regC0 =
      (patch.feedback << 1) |
      (patch.connection === 'fm' ? 1 : 0);
    this.opl.write(0xC0 + channelId, regC0);

    console.log(`[SimpleSynth] Patch loaded successfully to channel ${channelId}`);
  }

  /**
   * Get the currently loaded patch for a channel
   *
   * @param channelId Channel number (0-8)
   * @returns Current patch or null if none set
   */
  public getChannelPatch(channelId: number): OPLPatch | null {
    return this.channelPatches.get(channelId) || null;
  }

  /**
   * Audio processing callback (runs on audio thread)
   */
  private processAudio(event: AudioProcessingEvent): void {
    if (!this.opl) return;

    const outputL = event.outputBuffer.getChannelData(0);
    const outputR = event.outputBuffer.getChannelData(1);
    const numSamples = outputL.length;

    // OPL can only generate 512 samples per call, so we need to chunk it
    const maxChunkSize = 512;
    let offset = 0;

    while (offset < numSamples) {
      const chunkSize = Math.min(maxChunkSize, numSamples - offset);

      // Generate samples from OPL (returns Int16Array by default)
      const samples = this.opl.generate(chunkSize, Int16Array);

      // Convert Int16 to Float32 and copy to output
      for (let i = 0; i < chunkSize; i++) {
        const sample = samples[i] / 32768.0;
        outputL[offset + i] = sample;
        outputR[offset + i] = sample;
      }

      offset += chunkSize;
    }
  }

  /**
   * Play a note on a specific channel
   * @param channel - Channel number (0-8)
   * @param midiNote - MIDI note number (0-127)
   * @param _velocity - Note velocity (0-127, currently unused)
   */
  noteOn(channel: number, midiNote: number, _velocity: number = 100): void {
    if (!this.opl || !this.isInitialized) {
      console.error('[SimpleSynth] Not initialized');
      return;
    }

    if (channel < 0 || channel >= 9) {
      console.error('[SimpleSynth] Invalid channel:', channel, '(must be 0-8)');
      return;
    }

    if (midiNote < 0 || midiNote > 127) {
      console.error('[SimpleSynth] Invalid MIDI note:', midiNote);
      return;
    }

    // Convert MIDI note to frequency
    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);

    // Calculate F-number and block
    const { fnum, block } = this.calculateFNum(freq);

    console.log(`[SimpleSynth] Note ON: ch=${channel}, midi=${midiNote}, freq=${freq.toFixed(2)}Hz, fnum=${fnum}, block=${block}`);

    // Write frequency registers
    this.opl.write(0xA0 + channel, fnum & 0xFF); // F-number low 8 bits

    // Write key-on + block + F-number high 2 bits
    const keyOnByte = 0x20 | ((block & 0x07) << 2) | ((fnum >> 8) & 0x03);
    this.opl.write(0xB0 + channel, keyOnByte);

    // Track active note
    this.activeChannels.set(channel, midiNote);
  }

  /**
   * Stop a note on a specific channel
   * @param channel - Channel number (0-8)
   * @param midiNote - MIDI note number (for verification)
   */
  noteOff(channel: number, midiNote: number): void {
    if (!this.opl || !this.isInitialized) return;

    if (channel < 0 || channel >= 9) return;

    // Verify this note is playing on this channel
    if (this.activeChannels.get(channel) === midiNote) {
      console.log(`[SimpleSynth] Note OFF: ch=${channel}, midi=${midiNote}`);

      // Key off (clear key-on bit)
      this.opl.write(0xB0 + channel, 0x00);

      // Remove from active channels
      this.activeChannels.delete(channel);
    }
  }

  /**
   * Stop all notes on all channels
   */
  allNotesOff(): void {
    if (!this.opl) return;

    console.log('[SimpleSynth] All notes off');

    for (let channel = 0; channel < 9; channel++) {
      this.opl.write(0xB0 + channel, 0x00);
    }

    this.activeChannels.clear();
  }

  /**
   * Calculate F-number and block for a frequency
   * @param freq - Frequency in Hz
   * @returns Object with fnum (0-1023) and block (0-7)
   */
  private calculateFNum(freq: number): { fnum: number; block: number } {
    // Try each block from 0 to 7
    for (let block = 0; block < 8; block++) {
      const fnum = Math.round((freq * Math.pow(2, 20 - block)) / 49716);

      // F-number must be in range 0-1023
      if (fnum >= 0 && fnum < 1024) {
        return { fnum, block };
      }
    }

    // Fallback (shouldn't happen for valid MIDI notes)
    console.warn('[SimpleSynth] Could not calculate F-number for frequency:', freq);
    return { fnum: 0, block: 0 };
  }

  /**
   * Start audio playback (resume AudioContext)
   */
  start(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      console.log('[SimpleSynth] Resuming AudioContext');
      this.audioContext.resume();
    }
  }

  /**
   * Stop audio playback (suspend AudioContext)
   */
  stop(): void {
    if (this.audioContext && this.audioContext.state === 'running') {
      console.log('[SimpleSynth] Suspending AudioContext');
      this.audioContext.suspend();
      this.allNotesOff();
    }
  }

  /**
   * Check if initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get number of active notes
   */
  getActiveNoteCount(): number {
    return this.activeChannels.size;
  }
}
