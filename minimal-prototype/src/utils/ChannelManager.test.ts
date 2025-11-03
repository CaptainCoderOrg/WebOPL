/**
 * Manual Test Harness for ChannelManager
 * Run this in browser console to verify behavior
 */

import { ChannelManager } from './ChannelManager';

export function testChannelManager() {
  console.log('=== ChannelManager Test Suite ===\n');

  const mgr = new ChannelManager();

  // Test 1: Allocate 9 single-voice notes
  console.log('Test 1: Allocate 9 single-voice notes');
  for (let i = 0; i < 9; i++) {
    const noteId = `note-${i}`;
    const channel = mgr.allocateChannel(noteId);
    console.log(`  ${noteId} -> channel ${channel}`);
  }
  console.log('Stats:', mgr.getStats()); // Should be: free=0, allocated=9
  console.log('Expected: free=0, allocated=9, dualVoiceNotes=0\n');

  // Test 2: Try to allocate 10th note (should trigger voice stealing)
  console.log('Test 2: Allocate 10th note (voice stealing)');
  const note10 = mgr.allocateChannel('note-10');
  console.log(`  note-10 -> channel ${note10} (should steal note-0)`);
  console.log('Stats:', mgr.getStats()); // Should be: free=0, allocated=9
  console.log('Expected: note-0 stolen, note-10 gets its channel\n');

  // Test 3: Reset and allocate dual-voice notes
  mgr.reset();
  console.log('Test 3: Allocate 4 dual-voice notes (uses 8 channels)');
  for (let i = 0; i < 4; i++) {
    const noteId = `dual-${i}`;
    const channels = mgr.allocateDualChannels(noteId);
    console.log(`  ${noteId} -> channels [${channels}]`);
  }
  console.log('Stats:', mgr.getStats()); // Should be: free=1, allocated=8, dualVoiceNotes=4
  console.log('Expected: free=1, allocated=8, dualVoiceNotes=4\n');

  // Test 4: Allocate 5th dual-voice note (needs to steal 1 channel)
  console.log('Test 4: Allocate 5th dual-voice (not enough free channels)');
  const dual5 = mgr.allocateDualChannels('dual-5');
  console.log(`  dual-5 -> channels [${dual5}]`);
  console.log('Stats:', mgr.getStats());
  console.log('Expected: Should degrade to single channel or steal\n');

  // Test 5: Mixed allocation
  mgr.reset();
  console.log('Test 5: Mixed single + dual allocations');
  mgr.allocateChannel('single-1');
  mgr.allocateChannel('single-2');
  mgr.allocateDualChannels('dual-1'); // Uses 2 channels
  mgr.allocateDualChannels('dual-2'); // Uses 2 channels
  mgr.allocateChannel('single-3');
  console.log('Stats:', mgr.getStats()); // Should be: free=2, allocated=7, dualVoiceNotes=2
  console.log('Expected: free=2, allocated=7, dualVoiceNotes=2\n');

  // Test 6: Release notes
  console.log('Test 6: Release notes');
  mgr.releaseNote('dual-1'); // Frees 2 channels
  console.log('After releasing dual-1:', mgr.getStats());
  console.log('Expected: free=4, allocated=5, dualVoiceNotes=1\n');

  console.log('=== Test Suite Complete ===');
}

// Auto-run in dev mode
if (import.meta.env.DEV) {
  // Expose to window for manual testing
  (window as any).testChannelManager = testChannelManager;
  console.log('Run testChannelManager() in console to test ChannelManager');
}
