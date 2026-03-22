import { FV1_SAMPLE_RATE } from '../fv1/constants';

export interface ResampleResult {
  buffer: AudioBuffer;
  duration: number;
  sampleRate: number;
  note: string;
}

const AudioCtx = globalThis.AudioContext || (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

/**
 * Resample an AudioBuffer to the target sample rate using linear interpolation.
 * Avoids OfflineAudioContext which doesn't support non-standard rates (e.g. 32kHz) on iOS.
 */
export async function resampleAudio(
  buffer: AudioBuffer,
  targetSampleRate: number = FV1_SAMPLE_RATE,
): Promise<ResampleResult> {
  if (buffer.sampleRate === targetSampleRate) {
    return {
      buffer,
      duration: buffer.duration,
      sampleRate: buffer.sampleRate,
      note: `Input already at ${targetSampleRate} Hz; no resample needed.`,
    };
  }

  const ratio = buffer.sampleRate / targetSampleRate;
  const frameCount = Math.ceil(buffer.length / ratio);
  const channels = buffer.numberOfChannels;

  // Create output buffer via AudioContext.createBuffer (works on all platforms)
  const ctx = new AudioCtx();
  const resampled = ctx.createBuffer(channels, frameCount, targetSampleRate);
  await ctx.close();

  // Linear interpolation resampling for each channel
  for (let ch = 0; ch < channels; ch++) {
    const input = buffer.getChannelData(ch);
    const output = resampled.getChannelData(ch);
    for (let i = 0; i < frameCount; i++) {
      const srcIndex = i * ratio;
      const srcFloor = Math.floor(srcIndex);
      const frac = srcIndex - srcFloor;
      const s0 = input[srcFloor] ?? 0;
      const s1 = input[srcFloor + 1] ?? s0;
      output[i] = s0 + frac * (s1 - s0);
    }
  }

  return {
    buffer: resampled,
    duration: resampled.duration,
    sampleRate: resampled.sampleRate,
    note: `Resampled from ${buffer.sampleRate} Hz to ${targetSampleRate} Hz for FV-1 simulation.`,
  };
}
