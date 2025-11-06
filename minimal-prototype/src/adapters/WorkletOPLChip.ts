import type { IOPLChip } from '../interfaces/IOPLChip';

/**
 * OPL3 chip adapter for AudioWorklet-based real-time playback.
 * Sends write commands to AudioWorklet via postMessage.
 */
export class WorkletOPLChip implements IOPLChip {
  private workletNode: AudioWorkletNode;

  constructor(workletNode: AudioWorkletNode) {
    this.workletNode = workletNode;
  }

  write(array: number, address: number, value: number): void {
    this.workletNode.port.postMessage({
      type: 'write-register',
      payload: { array, address, value }
    });
  }

  read(_buffer: Int16Array): void {
    throw new Error('WorkletOPLChip does not support direct read - audio flows through AudioContext');
  }
}
