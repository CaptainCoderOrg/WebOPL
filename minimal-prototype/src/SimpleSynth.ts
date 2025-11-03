/**
 * SimpleSynth - OPL3 Synthesizer Wrapper (AudioWorklet Edition)
 *
 * Manages OPL3 instance and Web Audio API integration.
 * Supports 9 simultaneous voices (channels 0-8).
 *
 * FEATURE FLAG: USE_AUDIO_WORKLET
 * - true: Use modern AudioWorklet (recommended, better browser support)
 * - false: Fall back to deprecated ScriptProcessorNode (Edge compatibility)
 */

import type { OPLPatch, OPLOperator } from './types/OPLPatch';
import { defaultPatches } from './data/defaultPatches';
import { getOPLParams } from './constants/midiToOPL';

// Feature flag: Toggle between AudioWorklet and ScriptProcessorNode
const USE_AUDIO_WORKLET = true;

// Type definition for the global OPL class
declare global {
  interface Window {
    OPL?: any;
  }
}

export class SimpleSynth {
  // Common properties
  private audioContext: AudioContext | null = null;
  private activeChannels: Map<number, number> = new Map(); // channel → MIDI note
  private channelPatches: Map<number, OPLPatch> = new Map(); // channel → loaded patch
  private isInitialized: boolean = false;

  // AudioWorklet properties
  private workletNode: AudioWorkletNode | null = null;
  private workletReady: boolean = false;
  private wasmLoaded: boolean = false;

  // ScriptProcessorNode properties (fallback)
  private opl: any = null;
  private scriptNode: ScriptProcessorNode | null = null;

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
    console.log(`[SimpleSynth] Mode: ${USE_AUDIO_WORKLET ? 'AudioWorklet' : 'ScriptProcessorNode'}`);

    try {
      // Create AudioContext
      this.audioContext = new AudioContext({ sampleRate: 49716 });
      console.log('[SimpleSynth] ✅ AudioContext created');
      console.log('[SimpleSynth]    Sample rate:', this.audioContext.sampleRate);

      if (USE_AUDIO_WORKLET && 'audioWorklet' in this.audioContext) {
        await this.initAudioWorklet();
      } else {
        console.warn('[SimpleSynth] AudioWorklet not supported, falling back to ScriptProcessorNode');
        await this.initScriptProcessor();
      }

      this.isInitialized = true;
      console.log('[SimpleSynth] Initialization complete!');
    } catch (error) {
      console.error('[SimpleSynth] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize using AudioWorklet (modern approach)
   */
  private async initAudioWorklet(): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not created');
    }

    console.log('[SimpleSynth] Using AudioWorklet mode...');

    // Load WASM modules in main thread
    console.log('[SimpleSynth] Loading WASM modules...');
    let oplCode = await this.fetchScript('/lib/opl.js');
    let wrapperCode = await this.fetchScript('/opl-wrapper.js');

    // Fetch WASM binary
    const wasmBinary = await this.fetchBinary('/lib/opl.wasm');
    console.log('[SimpleSynth] ✅ WASM binary fetched');

    // Patch opl.js to use the pre-loaded WASM binary instead of trying to fetch it
    // This replaces the file system read operations with the binary we already have
    oplCode = oplCode.replace(
      'function getBinaryPromise(){',
      `function getBinaryPromise(){return Promise.resolve(new Uint8Array(${JSON.stringify(Array.from(wasmBinary))}));`
    );

    // Patch wrapper code to use globalThis instead of window for AudioWorklet compatibility
    wrapperCode = wrapperCode.replace(/window\.OPL/g, 'globalThis.OPL');

    console.log('[SimpleSynth] ✅ WASM modules fetched and patched');

    // Load AudioWorklet module
    console.log('[SimpleSynth] Loading AudioWorklet processor...');
    await this.audioContext.audioWorklet.addModule('/opl-worklet-processor.js');
    console.log('[SimpleSynth] ✅ AudioWorklet module loaded');

    // Create AudioWorkletNode
    this.workletNode = new AudioWorkletNode(this.audioContext, 'opl-worklet-processor');

    // Listen for messages from worklet
    this.workletNode.port.onmessage = (event) => {
      this.handleWorkletMessage(event.data);
    };

    // Connect to audio output
    this.workletNode.connect(this.audioContext.destination);
    console.log('[SimpleSynth] ✅ AudioWorkletNode connected');

    // Send WASM code to worklet
    console.log('[SimpleSynth] Sending WASM code to worklet...');
    this.workletNode.port.postMessage({
      type: 'load-wasm',
      payload: { oplCode, wrapperCode }
    });

    // Wait for WASM to load in worklet
    await this.waitForWASMLoaded();

    // Initialize OPL in the worklet
    console.log('[SimpleSynth] Initializing OPL3 in worklet...');
    this.workletNode.port.postMessage({
      type: 'init',
      payload: { sampleRate: this.audioContext.sampleRate }
    });

    // Wait for worklet to be ready
    await this.waitForWorkletReady();

    // Load default instruments
    console.log('[SimpleSynth] Loading default instruments...');
    for (let ch = 0; ch < 4; ch++) {
      const patch = defaultPatches[ch];
      this.loadPatch(ch, patch);
      console.log(`[SimpleSynth] Channel ${ch}: ${patch.name}`);
    }

    // Channels 4-8 get piano as default (for future use)
    for (let ch = 4; ch < 9; ch++) {
      this.loadPatch(ch, defaultPatches[0]);
    }

    console.log('[SimpleSynth] All channels initialized with default patches');
  }

  /**
   * Fetch script content as text
   */
  private async fetchScript(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    return response.text();
  }

  /**
   * Fetch binary content as Uint8Array
   */
  private async fetchBinary(url: string): Promise<Uint8Array> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  /**
   * Initialize using ScriptProcessorNode (fallback for older browsers)
   */
  private async initScriptProcessor(): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not created');
    }

    console.log('[SimpleSynth] Using ScriptProcessorNode mode (fallback)...');

    // Load WASM modules
    console.log('[SimpleSynth] Loading OPL WASM module...');
    await this.loadScript('/lib/opl.js');
    console.log('[SimpleSynth] ✅ WASM module loaded');

    console.log('[SimpleSynth] Loading OPL wrapper...');
    await this.loadScript('/opl-wrapper.js');
    console.log('[SimpleSynth] ✅ OPL wrapper loaded');

    if (!window.OPL || typeof window.OPL.create !== 'function') {
      throw new Error('OPL class not found on window object');
    }

    // Create OPL instance
    console.log('[SimpleSynth] Creating OPL instance...');
    this.opl = await window.OPL.create(this.audioContext.sampleRate, 2);
    console.log('[SimpleSynth] ✅ OPL instance created');

    // Enable waveform selection
    this.opl.write(0x01, 0x20);

    // Load default instruments
    console.log('[SimpleSynth] Loading default instruments...');
    for (let ch = 0; ch < 4; ch++) {
      const patch = defaultPatches[ch];
      this.loadPatch(ch, patch);
      console.log(`[SimpleSynth] Channel ${ch}: ${patch.name}`);
    }

    // Channels 4-8 get piano as default
    for (let ch = 4; ch < 9; ch++) {
      this.loadPatch(ch, defaultPatches[0]);
    }

    console.log('[SimpleSynth] All channels initialized with default patches');

    // Create ScriptProcessorNode
    const bufferSize = 4096;
    this.scriptNode = this.audioContext.createScriptProcessor(bufferSize, 0, 2);
    this.scriptNode.onaudioprocess = this.processAudio.bind(this);
    this.scriptNode.connect(this.audioContext.destination);
    console.log('[SimpleSynth] ✅ Audio processor connected');
  }

  /**
   * Wait for WASM modules to load in worklet
   */
  private waitForWASMLoaded(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WASM loading timeout'));
      }, 10000);

      const checkReady = () => {
        if (this.wasmLoaded) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };

      checkReady();
    });
  }

  /**
   * Wait for AudioWorklet to signal it's ready
   */
  private waitForWorkletReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('AudioWorklet initialization timeout'));
      }, 5000);

      const checkReady = () => {
        if (this.workletReady) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };

      checkReady();
    });
  }

  /**
   * Handle messages from AudioWorklet
   */
  private handleWorkletMessage(data: any): void {
    const { type, payload } = data;

    switch (type) {
      case 'wasm-loaded':
        console.log('[SimpleSynth] ✅ WASM modules loaded in worklet');
        this.wasmLoaded = true;
        break;

      case 'ready':
        console.log('[SimpleSynth] ✅ OPL3 initialized in worklet');
        this.workletReady = true;
        break;

      case 'error':
        console.error('[SimpleSynth] Worklet error:', payload.message);
        break;

      default:
        console.warn('[SimpleSynth] Unknown message from worklet:', type);
    }
  }

  /**
   * Write to OPL register (handles both modes)
   */
  private writeOPL(register: number, value: number): void {
    if (USE_AUDIO_WORKLET && this.workletNode) {
      // Send to AudioWorklet
      this.workletNode.port.postMessage({
        type: 'write',
        payload: { register, value }
      });
    } else if (this.opl) {
      // Direct write (ScriptProcessorNode mode)
      this.opl.write(register, value);
    }
  }

  /**
   * Write to OPL register directly (public method for debugging/testing)
   * @param register OPL register address
   * @param value Value to write to register
   */
  public writeRegister(register: number, value: number): void {
    this.writeOPL(register, value);
  }

  /**
   * Get operator offsets for a channel
   */
  private getOperatorOffsets(channelId: number): [number, number] {
    const operatorMap: [number, number][] = [
      [0x00, 0x03], [0x01, 0x04], [0x02, 0x05],
      [0x08, 0x0B], [0x09, 0x0C], [0x0A, 0x0D],
      [0x10, 0x13], [0x11, 0x14], [0x12, 0x15],
    ];
    return operatorMap[channelId];
  }

  /**
   * Write all registers for a single operator
   */
  private writeOperatorRegisters(operatorOffset: number, operator: OPLOperator): void {
    const reg20 =
      operator.frequencyMultiplier |
      (operator.keyScaleRate ? 0x10 : 0) |
      (operator.envelopeType ? 0x20 : 0) |
      (operator.vibrato ? 0x40 : 0) |
      (operator.amplitudeModulation ? 0x80 : 0);
    this.writeOPL(0x20 + operatorOffset, reg20);

    const reg40 = operator.outputLevel | (operator.keyScaleLevel << 6);
    this.writeOPL(0x40 + operatorOffset, reg40);

    const reg60 = operator.decayRate | (operator.attackRate << 4);
    this.writeOPL(0x60 + operatorOffset, reg60);

    const reg80 = operator.releaseRate | (operator.sustainLevel << 4);
    this.writeOPL(0x80 + operatorOffset, reg80);

    this.writeOPL(0xE0 + operatorOffset, operator.waveform);
  }

  /**
   * Load an instrument patch to a specific channel
   */
  public loadPatch(channelId: number, patch: OPLPatch): void {
    if (channelId < 0 || channelId >= 9) {
      throw new Error(`Invalid channel: ${channelId}. Must be 0-8.`);
    }

    console.log(`[SimpleSynth] Loading patch "${patch.name}" to channel ${channelId}`);

    this.channelPatches.set(channelId, patch);

    const [modOffset, carOffset] = this.getOperatorOffsets(channelId);

    this.writeOperatorRegisters(modOffset, patch.modulator);
    this.writeOperatorRegisters(carOffset, patch.carrier);

    const regC0 = (patch.feedback << 1) | (patch.connection === 'fm' ? 1 : 0);
    this.writeOPL(0xC0 + channelId, regC0);

    console.log(`[SimpleSynth] Patch loaded successfully to channel ${channelId}`);
  }

  /**
   * Get the currently loaded patch for a channel
   */
  public getChannelPatch(channelId: number): OPLPatch | null {
    return this.channelPatches.get(channelId) || null;
  }

  /**
   * Get all loaded patches
   */
  public getAllPatches(): Array<[number, string]> {
    const result: Array<[number, string]> = [];
    for (let ch = 0; ch < 9; ch++) {
      const patch = this.channelPatches.get(ch);
      if (patch) {
        result.push([ch, patch.name]);
      }
    }
    return result;
  }

  /**
   * Audio processing callback (ScriptProcessorNode mode only)
   */
  private processAudio(event: AudioProcessingEvent): void {
    if (!this.opl) return;

    const outputL = event.outputBuffer.getChannelData(0);
    const outputR = event.outputBuffer.getChannelData(1);
    const numSamples = outputL.length;

    const maxChunkSize = 512;
    let offset = 0;

    while (offset < numSamples) {
      const chunkSize = Math.min(maxChunkSize, numSamples - offset);
      const samples = this.opl.generate(chunkSize, Int16Array);

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
   */
  noteOn(channel: number, midiNote: number, _velocity: number = 100): void {
    if (!this.isInitialized) {
      console.error('[SimpleSynth] Not initialized');
      return;
    }

    if (channel < 0 || channel >= 9) {
      console.error('[SimpleSynth] Invalid channel:', channel);
      return;
    }

    if (midiNote < 0 || midiNote > 127) {
      console.error('[SimpleSynth] Invalid MIDI note:', midiNote);
      return;
    }

    // Use pre-calculated lookup table for accurate OPL3 parameters
    const { freq, fnum, block } = getOPLParams(midiNote);

    console.log(`[SimpleSynth] Note ON: ch=${channel}, midi=${midiNote}, freq=${freq.toFixed(2)}Hz, fnum=${fnum}, block=${block}`);

    this.writeOPL(0xA0 + channel, fnum & 0xFF);
    const keyOnByte = 0x20 | ((block & 0x07) << 2) | ((fnum >> 8) & 0x03);
    this.writeOPL(0xB0 + channel, keyOnByte);

    this.activeChannels.set(channel, midiNote);
  }

  /**
   * Stop a note on a specific channel
   */
  noteOff(channel: number, midiNote: number): void {
    if (!this.isInitialized) return;
    if (channel < 0 || channel >= 9) return;

    if (this.activeChannels.get(channel) === midiNote) {
      console.log(`[SimpleSynth] Note OFF: ch=${channel}, midi=${midiNote}`);
      this.writeOPL(0xB0 + channel, 0x00);
      this.activeChannels.delete(channel);
    }
  }

  /**
   * Stop all notes on all channels
   */
  allNotesOff(): void {
    console.log('[SimpleSynth] All notes off');

    for (let channel = 0; channel < 9; channel++) {
      this.writeOPL(0xB0 + channel, 0x00);
    }

    this.activeChannels.clear();
  }

  /**
   * Start audio playback
   */
  start(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      console.log('[SimpleSynth] Resuming AudioContext');
      this.audioContext.resume();
    }
  }

  /**
   * Stop audio playback
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
