/**
 * WaveformDisplay Component
 * Renders audio waveform visualization using Canvas
 * Click to play/pause audio with looping
 */

import { useEffect, useRef, useState } from 'react';
import './WaveformDisplay.css';

export interface WaveformDisplayProps {
  /** Waveform data (0-1 normalized amplitude values) */
  waveformData: number[];

  /** WAV file ArrayBuffer for playback */
  wavBuffer?: ArrayBuffer;

  /** Canvas width in pixels (default: 600) */
  width?: number;

  /** Canvas height in pixels (default: 100) */
  height?: number;
}

export function WaveformDisplay({
  waveformData,
  wavBuffer,
  width = 600,
  height = 100,
}: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0); // 0-1 normalized position
  const animationFrameRef = useRef<number | null>(null);

  // Setup audio element when wavBuffer is provided
  useEffect(() => {
    if (!wavBuffer) return;

    // Create audio element
    const audio = new Audio();
    audio.loop = true; // Enable looping

    // Create blob URL from WAV buffer
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    audio.src = url;

    audioRef.current = audio;

    // Cleanup
    return () => {
      audio.pause();
      audio.src = '';
      URL.revokeObjectURL(url);
      audioRef.current = null;
      setIsPlaying(false);
      setPlaybackPosition(0);
    };
  }, [wavBuffer]);

  // Update playback position while playing
  useEffect(() => {
    if (!isPlaying || !audioRef.current) {
      // Cancel animation frame if stopped
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const updatePosition = () => {
      const audio = audioRef.current;
      if (audio && audio.duration > 0) {
        const position = audio.currentTime / audio.duration;
        setPlaybackPosition(position);
      }

      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(updatePosition);
      }
    };

    animationFrameRef.current = requestAnimationFrame(updatePosition);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying]);

  // Draw waveform
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

    // Draw playback position indicator
    if (wavBuffer && playbackPosition > 0) {
      const xPos = playbackPosition * width;

      // Draw vertical line
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(xPos, 0);
      ctx.lineTo(xPos, height);
      ctx.stroke();

      // Draw small circle at the top
      ctx.fillStyle = '#ff4444';
      ctx.beginPath();
      ctx.arc(xPos, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [waveformData, width, height, wavBuffer, playbackPosition]);

  /**
   * Handle click to play/pause audio
   */
  const handleClick = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch((err) => {
        console.error('[WaveformDisplay] Failed to play audio:', err);
      });
      setIsPlaying(true);
    }
  };

  return (
    <>
      {/* Play/Pause Button */}
      {wavBuffer && (
        <button
          className="waveform-play-button"
          onClick={handleClick}
          title={isPlaying ? 'Pause' : 'Play'}
          type="button"
        >
          {isPlaying ? (
            // Pause icon
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="6" y="5" width="4" height="14" fill="currentColor" />
              <rect x="14" y="5" width="4" height="14" fill="currentColor" />
            </svg>
          ) : (
            // Play icon
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M8 5v14l11-7z" fill="currentColor" />
            </svg>
          )}
        </button>
      )}
      <div className="waveform-display">
        <canvas ref={canvasRef} className="waveform-canvas" />
      </div>
    </>
  );
}
