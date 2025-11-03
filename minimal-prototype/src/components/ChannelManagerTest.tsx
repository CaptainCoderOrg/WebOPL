/**
 * ChannelManagerTest - Interactive Test UI for ChannelManager
 *
 * Provides visual testing for channel allocation, voice stealing, and dual-voice behavior.
 */

import { useState } from 'react';
import { ChannelManager } from '../utils/ChannelManager';
import './ChannelManagerTest.css';

export function ChannelManagerTest() {
  const [manager] = useState(() => new ChannelManager());
  const [testLog, setTestLog] = useState<string[]>([]);
  const [stats, setStats] = useState(manager.getStats());

  const log = (message: string) => {
    setTestLog(prev => [...prev, message]);
  };

  const updateStats = () => {
    setStats(manager.getStats());
  };

  const clearLog = () => {
    setTestLog([]);
    manager.reset();
    setStats(manager.getStats());
  };

  const runTest1 = () => {
    log('=== Test 1: Allocate 9 single-voice notes ===');
    for (let i = 0; i < 9; i++) {
      const noteId = `note-${i}`;
      const channel = manager.allocateChannel(noteId);
      log(`  ${noteId} -> channel ${channel}`);
    }
    updateStats();
    log(`Stats: ${JSON.stringify(manager.getStats())}`);
    log('Expected: free=0, allocated=9, dualVoiceNotes=0');
    log('');
  };

  const runTest2 = () => {
    log('=== Test 2: Allocate 10th note (voice stealing) ===');
    const note10 = manager.allocateChannel('note-10');
    log(`  note-10 -> channel ${note10} (should steal note-0)`);
    updateStats();
    log(`Stats: ${JSON.stringify(manager.getStats())}`);
    log('Expected: note-0 stolen, note-10 gets its channel');
    log('');
  };

  const runTest3 = () => {
    manager.reset();
    updateStats();
    log('=== Test 3: Allocate 4 dual-voice notes (uses 8 channels) ===');
    for (let i = 0; i < 4; i++) {
      const noteId = `dual-${i}`;
      const channels = manager.allocateDualChannels(noteId);
      log(`  ${noteId} -> channels [${channels}]`);
    }
    updateStats();
    log(`Stats: ${JSON.stringify(manager.getStats())}`);
    log('Expected: free=1, allocated=8, dualVoiceNotes=4');
    log('');
  };

  const runTest4 = () => {
    log('=== Test 4: Allocate 5th dual-voice (not enough free channels) ===');
    const dual5 = manager.allocateDualChannels('dual-5');
    log(`  dual-5 -> channels [${dual5}]`);
    updateStats();
    log(`Stats: ${JSON.stringify(manager.getStats())}`);
    log('Expected: Should degrade to single channel or steal');
    log('');
  };

  const runTest5 = () => {
    manager.reset();
    updateStats();
    log('=== Test 5: Mixed single + dual allocations ===');
    manager.allocateChannel('single-1');
    log('  single-1 allocated');
    manager.allocateChannel('single-2');
    log('  single-2 allocated');
    manager.allocateDualChannels('dual-1');
    log('  dual-1 allocated (2 channels)');
    manager.allocateDualChannels('dual-2');
    log('  dual-2 allocated (2 channels)');
    manager.allocateChannel('single-3');
    log('  single-3 allocated');
    updateStats();
    log(`Stats: ${JSON.stringify(manager.getStats())}`);
    log('Expected: free=2, allocated=7, dualVoiceNotes=2');
    log('');
  };

  const runTest6 = () => {
    log('=== Test 6: Release notes ===');
    manager.releaseNote('dual-1');
    log('  Released dual-1 (frees 2 channels)');
    updateStats();
    log(`Stats: ${JSON.stringify(manager.getStats())}`);
    log('Expected: free=4, allocated=5, dualVoiceNotes=1');
    log('');
  };

  const runAllTests = () => {
    clearLog();
    log('=== Running All Channel Manager Tests ===');
    log('');
    runTest1();
    runTest2();
    runTest3();
    runTest4();
    runTest5();
    runTest6();
    log('=== All Tests Complete ===');
  };

  return (
    <div className="channel-manager-test">
      <div className="test-header">
        <h2>🧪 Channel Manager Test Suite</h2>
        <p>Interactive testing for OPL3 channel allocation and voice stealing</p>
      </div>

      <div className="stats-panel">
        <h3>📊 Current Stats</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-label">Free Channels</div>
            <div className="stat-value" style={{ color: stats.free > 6 ? '#00ff00' : stats.free > 0 ? '#ffaa00' : '#ff4444' }}>
              {stats.free}/18
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Allocated Channels</div>
            <div className="stat-value">{stats.allocated}/18</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Dual-Voice Notes</div>
            <div className="stat-value">{stats.dualVoiceNotes}</div>
          </div>
        </div>

        <div className="channel-visualization">
          <h4>Channel Status:</h4>
          <div className="channels">
            {Array.from({ length: 18 }, (_, i) => {
              const isFree = stats.free > 0 && stats.allocated <= i;
              return (
                <div
                  key={i}
                  className={`channel ${isFree ? 'free' : 'allocated'}`}
                  title={`Channel ${i}: ${isFree ? 'Free' : 'Allocated'}`}
                >
                  {i}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="test-controls">
        <h3>🎮 Test Controls</h3>
        <div className="button-grid">
          <button onClick={runTest1} className="test-btn">
            Test 1: 9 Single Notes
          </button>
          <button onClick={runTest2} className="test-btn">
            Test 2: Voice Stealing
          </button>
          <button onClick={runTest3} className="test-btn">
            Test 3: 4 Dual-Voice
          </button>
          <button onClick={runTest4} className="test-btn">
            Test 4: 5th Dual-Voice
          </button>
          <button onClick={runTest5} className="test-btn">
            Test 5: Mixed Allocation
          </button>
          <button onClick={runTest6} className="test-btn">
            Test 6: Release Notes
          </button>
        </div>
        <div className="action-buttons">
          <button onClick={runAllTests} className="btn-primary">
            ▶ Run All Tests
          </button>
          <button onClick={clearLog} className="btn-secondary">
            🗑 Clear Log & Reset
          </button>
        </div>
      </div>

      <div className="test-log">
        <h3>📝 Test Log</h3>
        <div className="log-output">
          {testLog.length === 0 ? (
            <div className="log-empty">No tests run yet. Click a test button to begin.</div>
          ) : (
            testLog.map((line, idx) => (
              <div
                key={idx}
                className={`log-line ${
                  line.startsWith('===') ? 'log-header' :
                  line.startsWith('Expected:') ? 'log-expected' :
                  line.includes('Stats:') ? 'log-stats' :
                  ''
                }`}
              >
                {line}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="test-info">
        <h3>ℹ️ Test Descriptions</h3>
        <div className="test-descriptions">
          <div className="test-desc">
            <strong>Test 1:</strong> Allocates 9 single-voice notes (9/18 channels used)
          </div>
          <div className="test-desc">
            <strong>Test 2:</strong> Attempts 10th allocation (no voice stealing needed with 18 channels)
          </div>
          <div className="test-desc">
            <strong>Test 3:</strong> Allocates 4 dual-voice notes (8 channels used, 10 free)
          </div>
          <div className="test-desc">
            <strong>Test 4:</strong> Attempts 5th dual-voice allocation (no degradation needed)
          </div>
          <div className="test-desc">
            <strong>Test 5:</strong> Mixed allocation of single and dual-voice notes
          </div>
          <div className="test-desc">
            <strong>Test 6:</strong> Releases a dual-voice note to free 2 channels
          </div>
        </div>
      </div>
    </div>
  );
}
