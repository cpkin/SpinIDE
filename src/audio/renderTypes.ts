import type { CompiledInstruction, IOMode, PotValues } from '../fv1/types';

export type RenderWarningCode = 'default-limit' | 'hard-cap' | 'input-truncated' | 'slow-render';

export interface RenderWarning {
  code: RenderWarningCode;
  message: string;
}

export interface RenderProgress {
  processedSeconds: number;
  totalSeconds: number;
  progress: number;
}

export interface RenderDebugEntry {
  timestamp: number;
  label: string;
  phase: 'start' | 'end';
  data: Record<string, number | string | boolean | null>;
}

export interface RenderSimulationRequest {
  input: File | ArrayBuffer | AudioBuffer;
  instructions: CompiledInstruction[];
  ioMode: IOMode;
  pots?: Partial<PotValues>;
  renderSeconds?: number;
  abortSignal?: AbortSignal;
  onProgress?: (progress: RenderProgress) => void;
  onDebug?: (entry: RenderDebugEntry) => void;
  debugLabel?: string;
  mixWet?: number;
  mixDry?: number;
  choDepth?: number;
}

export interface RenderSimulationResult {
  buffer: AudioBuffer;
  duration: number;
  sampleRate: number;
  warnings: RenderWarning[];
  resampleNote: string;
  normalizedPeak: number;
  elapsedMs: number;
  resampledInput: AudioBuffer;
}

export class RenderCancelledError extends Error {
  constructor() {
    super('Render cancelled');
    this.name = 'RenderCancelledError';
  }
}
