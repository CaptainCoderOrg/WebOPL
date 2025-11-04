/**
 * VolumeControl Component
 * Master volume slider for the entire application
 */

import { useState, useEffect } from 'react';
import './VolumeControl.css';

export interface VolumeControlProps {
  /** SimpleSynth instance */
  synth?: any;

  /** Initial volume (0.0 to 12.0, default 6.0) */
  initialVolume?: number;
}

export function VolumeControl({ synth, initialVolume = 6.0 }: VolumeControlProps) {
  const [volume, setVolume] = useState(initialVolume);

  useEffect(() => {
    if (synth) {
      synth.setMasterVolume(volume);
    }
  }, [synth, volume]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const getVolumeIcon = () => {
    if (volume === 0) return '🔇';
    if (volume < 0.5) return '🔈';
    if (volume < 1.5) return '🔉';
    return '🔊';
  };

  return (
    <div className="volume-control">
      <span className="volume-icon" title="Master Volume">
        {getVolumeIcon()}
      </span>
      <input
        type="range"
        className="volume-slider"
        min="0"
        max="12"
        step="0.1"
        value={volume}
        onChange={handleVolumeChange}
        aria-label="Master Volume"
      />
    </div>
  );
}
