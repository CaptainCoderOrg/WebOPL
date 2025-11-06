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
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0); // 0-1 normalized position
  const animationFrameRef = useRef<number | null>(null);

  // Setup Web Audio API when wavBuffer is provided
  useEffect(() => {
    if (!wavBuffer) return;

    const setupAudio = async () => {
      // Create AudioContext
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      // Decode the WAV buffer
      const audioBuffer = await audioContext.decodeAudioData(wavBuffer.slice(0));
      audioBufferRef.current = audioBuffer;
    };

    setupAudio().catch((err) => {
      console.error('[WaveformDisplay] Failed to setup audio:', err);
    });

    // Cleanup
    return () => {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      audioBufferRef.current = null;
      setIsPlaying(false);
      setPlaybackPosition(0);
    };
  }, [wavBuffer]);

  // Update playback position while playing
  useEffect(() => {
    if (!isPlaying || !audioContextRef.current || !audioBufferRef.current) {
      // Cancel animation frame if stopped
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const updatePosition = () => {
      const audioContext = audioContextRef.current;
      const audioBuffer = audioBufferRef.current;

      if (audioContext && audioBuffer && audioBuffer.duration > 0) {
        // Calculate elapsed time since start
        const elapsed = audioContext.currentTime - startTimeRef.current + pauseTimeRef.current;
        // Get position within a single loop
        const loopPosition = elapsed % audioBuffer.duration;
        const position = loopPosition / audioBuffer.duration;
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
   * Format time as MM:SS:MS (milliseconds as 2 digits)
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(ms).padStart(2, '0')}`;
  };

  /**
   * Handle play/pause button click
   */
  const handlePlayPauseClick = () => {
    const audioContext = audioContextRef.current;
    const audioBuffer = audioBufferRef.current;

    if (!audioContext || !audioBuffer) return;

    if (isPlaying) {
      // Pause: stop the source and record the pause time
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }

      // Calculate where we paused (same formula as position tracking)
      const elapsed = audioContext.currentTime - startTimeRef.current + pauseTimeRef.current;
      pauseTimeRef.current = elapsed % audioBuffer.duration;

      setIsPlaying(false);
    } else {
      // Play/Resume: create a new source node with looping
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = true; // Enable seamless looping
      source.connect(audioContext.destination);

      // Start from pause position (or 0 if first play)
      source.start(0, pauseTimeRef.current);

      // Record start time - use same approach as seeking
      startTimeRef.current = audioContext.currentTime;

      sourceNodeRef.current = source;
      setIsPlaying(true);
    }
  };

  /**
   * Handle waveform canvas click to seek
   */
  const handleWaveformClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const audioContext = audioContextRef.current;
    const audioBuffer = audioBufferRef.current;

    if (!canvas || !audioContext || !audioBuffer) return;

    // Get click position relative to canvas rendered size
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const clickPosition = x / rect.width; // 0-1 normalized (use rendered width, not canvas.width)

    // Clamp to 0-1 range
    const clampedPosition = Math.max(0, Math.min(1, clickPosition));

    // Calculate new time position
    const newTime = clampedPosition * audioBuffer.duration;

    // If playing, restart from new position
    if (isPlaying && sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;

      // Create new source at the clicked position
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = true;
      source.connect(audioContext.destination);
      source.start(0, newTime);

      // Update timing - startTimeRef should be when we started, adjusted for the offset
      startTimeRef.current = audioContext.currentTime;
      pauseTimeRef.current = newTime;

      sourceNodeRef.current = source;
    } else {
      // If paused, just update the pause position
      pauseTimeRef.current = newTime;
      setPlaybackPosition(clampedPosition);
    }
  };

  // Calculate current time and total duration for display
  const audioBuffer = audioBufferRef.current;
  const currentTime = audioBuffer ? playbackPosition * audioBuffer.duration : 0;
  const totalDuration = audioBuffer ? audioBuffer.duration : 0;

  return (
    <div className="waveform-wrapper">
      <div className="waveform-row">
        {/* Play/Pause Button */}
        {wavBuffer && (
          <button
            className="waveform-play-button"
            onClick={handlePlayPauseClick}
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
        <div className="waveform-display-container">
          <canvas
            ref={canvasRef}
            className="waveform-canvas"
            onClick={handleWaveformClick}
            style={{ cursor: wavBuffer ? 'pointer' : 'default' }}
          />
        </div>
      </div>
      {wavBuffer && (
        <div className="waveform-time-tracker">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </div>
      )}
    </div>
  );
}
