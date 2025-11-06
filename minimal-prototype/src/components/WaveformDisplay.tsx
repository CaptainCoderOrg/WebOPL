/**
 * WaveformDisplay Component
 * Renders audio waveform visualization using Canvas
 */

import { useEffect, useRef } from 'react';
import './WaveformDisplay.css';

export interface WaveformDisplayProps {
  /** Waveform data (0-1 normalized amplitude values) */
  waveformData: number[];

  /** Canvas width in pixels (default: 600) */
  width?: number;

  /** Canvas height in pixels (default: 100) */
  height?: number;
}

export function WaveformDisplay({
  waveformData,
  width = 600,
  height = 100,
}: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate dimensions
    const centerY = height / 2;
    const maxAmplitude = height / 2 - 2; // Leave 2px padding
    const barWidth = width / waveformData.length;

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#5aa7ff');
    gradient.addColorStop(0.5, '#4a9eff');
    gradient.addColorStop(1, '#5aa7ff');

    // Draw waveform
    ctx.fillStyle = gradient;

    for (let i = 0; i < waveformData.length; i++) {
      const amplitude = waveformData[i];
      const barHeight = amplitude * maxAmplitude;
      const x = i * barWidth;

      // Draw symmetric bars (mirrored top/bottom)
      ctx.fillRect(x, centerY - barHeight, barWidth, barHeight * 2);
    }

    // Draw center line
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
  }, [waveformData, width, height]);

  return (
    <div className="waveform-display">
      <canvas ref={canvasRef} className="waveform-canvas" />
    </div>
  );
}
