import { decodeAudio } from './decodeAudio';
import { resampleAudio } from './resampleAudio';
import {
  FV1_SAMPLE_RATE,
  INSTRUCTIONS_PER_SAMPLE,
  POT_UPDATE_BLOCK_SIZE,
  MAX_DELAY_RAM,
} from '../fv1/constants';
import { getHandler } from '../fv1/instructions';
import { createState, resetState, updatePots } from '../fv1/state';
import type { CompiledProgram, FV1State } from '../fv1/types';
import { mapInputToADC, normalizeInput } from '../fv1/io';
import {
  RenderCancelledError,
  type RenderSimulationRequest,
  type RenderSimulationResult,
  type RenderWarning,
} from './renderTypes';

const DEFAULT_RENDER_SECONDS = 30;
const HARD_MAX_RENDER_SECONDS = 120;
const PROGRESS_THRESHOLD_SECONDS = 10;

function prepareInputChannels(
  buffer: AudioBuffer,
  ioMode: CompiledProgram['ioMode'],
  frameCount: number,
): { inputL: Float32Array; inputR: Float32Array } {
  const channels = buffer.numberOfChannels;
  const left = buffer.getChannelData(0);
  const right = channels > 1 ? buffer.getChannelData(1) : left;

  const sliceChannel = (channel: Float32Array): Float32Array => channel.subarray(0, frameCount);

  if (ioMode === 'mono_mono' || ioMode === 'mono_stereo') {
    const mono = new Float32Array(frameCount);
    if (channels === 1) {
      mono.set(sliceChannel(left));
    } else {
      for (let i = 0; i < frameCount; i += 1) {
        mono[i] = 0.5 * (left[i] + right[i]);
      }
    }
    return { inputL: mono, inputR: mono };
  }

  if (channels === 1) {
    const mono = sliceChannel(left);
    return { inputL: mono, inputR: mono };
  }

  return { inputL: sliceChannel(left), inputR: sliceChannel(right) };
}

interface CachedInstruction {
  handler: (state: FV1State, operands: number[]) => void;
  operands: number[];
  opcode: string;
}

const TWO_PI = Math.PI * 2;

function wrapPhase(phase: number): number {
  return phase - Math.floor(phase);
}

function updateLfoState(state: FV1State): void {
  const lfo = state.lfo;

  lfo.sin0Phase = wrapPhase(lfo.sin0Phase + lfo.sin0Rate);
  lfo.sin1Phase = wrapPhase(lfo.sin1Phase + lfo.sin1Rate);
  lfo.rmp0Phase = wrapPhase(lfo.rmp0Phase + lfo.rmp0Rate);
  lfo.rmp1Phase = wrapPhase(lfo.rmp1Phase + lfo.rmp1Rate);

  lfo.sin0 = Math.sin(lfo.sin0Phase * TWO_PI);
  lfo.sin1 = Math.sin(lfo.sin1Phase * TWO_PI);
  lfo.rmp0 = lfo.rmp0Phase;
  lfo.rmp1 = lfo.rmp1Phase;
}

function computePeakRms(values: Float32Array): { peak: number; rms: number } {
  let peak = 0;
  let sumSquares = 0;
  for (let i = 0; i < values.length; i += 1) {
    const sample = values[i];
    const abs = Math.abs(sample);
    if (abs > peak) peak = abs;
    sumSquares += sample * sample;
  }
  const rms = values.length > 0 ? Math.sqrt(sumSquares / values.length) : 0;
  return { peak, rms };
}

function computeNonZeroRatio(values: Float32Array): number {
  let nonZero = 0;
  for (let i = 0; i < values.length; i += 1) {
    if (values[i] !== 0) nonZero += 1;
  }
  return values.length > 0 ? nonZero / values.length : 0;
}

function executeSample(
  state: FV1State,
  program: CompiledProgram,
  inputL: number,
  inputR: number,
  cachedInstructions?: CachedInstruction[],
): void {
  state.pacc = state.acc;
  state.dacLWritten = false;
  state.dacRWritten = false;

  const adc = mapInputToADC(inputL, inputR, state.ioMode, state.lr);
  state.adcL = adc.adcl;
  state.adcR = adc.adcr;
  state.nextPc = null;

  if (cachedInstructions) {
      const instructionCount = cachedInstructions.length;
    for (let pc = 0; pc < instructionCount; ) {
      const cached = cachedInstructions[pc];
      const needsPc = cached.opcode === 'skp'
        || cached.opcode === 'raw'
        || cached.opcode.startsWith('skp_');
      const operands = needsPc
        ? [...cached.operands, pc]
        : cached.operands;
      cached.handler(state, operands);

      if (state.nextPc !== null) {
        pc = state.nextPc;
        state.nextPc = null;
      } else {
        pc += 1;
      }
    }
  } else {
    const instructionCount = Math.min(program.instructions.length, INSTRUCTIONS_PER_SAMPLE);
    for (let pc = 0; pc < instructionCount; ) {
      const instruction = program.instructions[pc];
      const handler = getHandler(instruction.opcode);
      const needsPc = instruction.opcode === 'skp'
        || instruction.opcode === 'raw'
        || instruction.opcode.startsWith('skp_');
      const operands = needsPc
        ? [...instruction.operands, pc]
        : instruction.operands;
      handler(state, operands);

      if (state.nextPc !== null) {
        pc = state.nextPc;
        state.nextPc = null;
      } else {
        pc += 1;
      }
    }
  }

  if (state.ioMode === 'mono_mono') {
    if (!state.dacLWritten) {
      state.dacL = state.acc;
    }
    if (!state.dacRWritten) {
      state.dacR = state.acc;
    }
  } else if (state.ioMode === 'mono_stereo') {
    if (state.lr === 0 && !state.dacLWritten) {
      state.dacL = state.acc;
    }
    if (state.lr === 1 && !state.dacRWritten) {
      state.dacR = state.acc;
    }
  } else if (state.lr === 0) {
    if (!state.dacLWritten) {
      state.dacL = state.acc;
    }
  } else if (!state.dacRWritten) {
    state.dacR = state.acc;
  }
}

// Output normalization intentionally omitted to preserve POT-controlled dynamics.

function resolveRenderLengthSeconds(
  inputDuration: number,
  requestedSeconds: number | undefined,
  warnings: RenderWarning[],
): number {
  if (requestedSeconds === undefined) {
    const target = Math.min(inputDuration, DEFAULT_RENDER_SECONDS);
    if (inputDuration > DEFAULT_RENDER_SECONDS) {
      warnings.push({
        code: 'default-limit',
        message: `Input exceeds ${DEFAULT_RENDER_SECONDS}s; rendering first ${DEFAULT_RENDER_SECONDS}s.`,
      });
    }
    return target;
  }

  let target = requestedSeconds;
  if (requestedSeconds > HARD_MAX_RENDER_SECONDS) {
    target = HARD_MAX_RENDER_SECONDS;
    warnings.push({
      code: 'hard-cap',
      message: `Requested ${requestedSeconds}s exceeds hard cap; rendering ${HARD_MAX_RENDER_SECONDS}s.`,
    });
  }

  if (target < inputDuration) {
    warnings.push({
      code: 'input-truncated',
      message: `Input truncated to ${target}s for render length request.`,
    });
  }

  return Math.min(target, inputDuration);
}

export async function renderSimulation(
  request: RenderSimulationRequest,
): Promise<RenderSimulationResult> {
  const renderStartTime = performance.now();

  if (request.abortSignal?.aborted) {
    throw new RenderCancelledError();
  }

  const warnings: RenderWarning[] = [];
  const decoded =
    request.input instanceof AudioBuffer
      ? request.input
      : await decodeAudio(request.input);
  const resampled = await resampleAudio(decoded, FV1_SAMPLE_RATE);

  const renderSeconds = resolveRenderLengthSeconds(
    resampled.duration,
    request.renderSeconds,
    warnings,
  );
  const frameCount = Math.min(
    resampled.buffer.length,
    Math.max(1, Math.floor(renderSeconds * FV1_SAMPLE_RATE)),
  );

  const program: CompiledProgram = {
    instructions: request.instructions,
    ioMode: request.ioMode,
  };
  const outputChannels = request.ioMode === 'mono_mono' ? 1 : 2;
  const { inputL, inputR } = prepareInputChannels(resampled.buffer, request.ioMode, frameCount);
  const mixWet = request.mixWet ?? 1;
  const mixDry = request.mixDry ?? 1 - mixWet;
  const choDepth = request.choDepth ?? 1;

  if (request.onDebug) {
    const label = request.debugLabel ?? 'render';
    const instructionCount = program.instructions.length;
    const opCounts = program.instructions.reduce<Record<string, number>>((acc, inst) => {
      acc[inst.opcode] = (acc[inst.opcode] ?? 0) + 1;
      return acc;
    }, {});
    const choCount = opCounts.cho ?? 0;
    const inputStats = computePeakRms(inputL);
    request.onDebug({
      timestamp: Date.now(),
      label,
      phase: 'start',
      data: {
        ioMode: request.ioMode,
        pot0: request.pots?.pot0 ?? null,
        pot1: request.pots?.pot1 ?? null,
        pot2: request.pots?.pot2 ?? null,
        mixWet: Number(mixWet.toFixed(3)),
        mixDry: Number(mixDry.toFixed(3)),
        choDepth: Number(choDepth.toFixed(3)),
        instructionCount,
        choCount,
        frameCount,
        inputPeak: Number(inputStats.peak.toFixed(6)),
        inputRms: Number(inputStats.rms.toFixed(6)),
        renderSeconds: Number(renderSeconds.toFixed(3)),
        outputChannels,
      },
    });
  }

  // Precompute instruction handlers for performance (fast path)
  const instructionCount = Math.min(program.instructions.length, INSTRUCTIONS_PER_SAMPLE);
  const cachedInstructions: CachedInstruction[] = new Array(instructionCount);
  for (let i = 0; i < instructionCount; i += 1) {
    const instruction = program.instructions[i];
    cachedInstructions[i] = {
      handler: getHandler(instruction.opcode),
      operands: instruction.operands,
      opcode: instruction.opcode,
    };
  }

  const state = createState(request.ioMode, request.pots ?? {}, { choDepth });
  resetState(state);
  updatePots(state, request.pots ?? {});

  const outputL = new Float32Array(frameCount);
  const outputR = new Float32Array(frameCount);

  const totalSeconds = frameCount / FV1_SAMPLE_RATE;
  const shouldReportProgress = totalSeconds > PROGRESS_THRESHOLD_SECONDS && !!request.onProgress;
  const progressIntervalSamples = FV1_SAMPLE_RATE;

  if (shouldReportProgress && request.onProgress) {
    request.onProgress({ processedSeconds: 0, totalSeconds, progress: 0 });
  }

  for (let sample = 0; sample < frameCount; sample += 1) {
    if (request.abortSignal?.aborted) {
      throw new RenderCancelledError();
    }

    if (
      shouldReportProgress &&
      request.onProgress &&
      sample > 0 &&
      sample % progressIntervalSamples === 0
    ) {
      const processedSeconds = sample / FV1_SAMPLE_RATE;
      request.onProgress({
        processedSeconds,
        totalSeconds,
        progress: Math.min(1, processedSeconds / totalSeconds),
      });
    }

    if (sample % POT_UPDATE_BLOCK_SIZE === 0 && request.pots) {
      updatePots(state, request.pots);
    }

    const inL = normalizeInput(inputL[sample] ?? 0, false);
    const inR = normalizeInput(inputR[sample] ?? inL, false);

    updateLfoState(state);

    if (program.ioMode !== 'mono_mono') {
      state.lr = 0;
      executeSample(state, program, inL, inR, cachedInstructions);
      outputL[sample] = state.dacL;

      state.lr = 1;
      executeSample(state, program, inL, inR, cachedInstructions);
      outputR[sample] = state.dacR;
    } else {
      state.lr = 0;
      executeSample(state, program, inL, inR, cachedInstructions);
      outputL[sample] = state.dacL;
      outputR[sample] = state.dacR;
    }

    state.sampleCounter += 1;
    state.delayWritePtr = (state.delayWritePtr + 1) % MAX_DELAY_RAM;
  }

  // Apply fixed 6dB boost to compensate for FV-1 headroom
  // (Don't normalize to peak - that would undo POT volume changes)
  const FIXED_GAIN = 2.0; // +6dB boost
  for (let i = 0; i < outputL.length; i += 1) {
    outputL[i] *= FIXED_GAIN;
    if (outputChannels > 1) {
      outputR[i] *= FIXED_GAIN;
    }
  }

  if (shouldReportProgress && request.onProgress) {
    request.onProgress({ processedSeconds: totalSeconds, totalSeconds, progress: 1 });
  }

  const outputStatsPreMix = computePeakRms(outputL);

  // Apply wet/dry mix before output buffer creation
  if (mixWet !== 1 || mixDry !== 0) {
    for (let i = 0; i < outputL.length; i += 1) {
      const dryL = inputL[i] ?? 0;
      outputL[i] = outputL[i] * mixWet + dryL * mixDry;
      if (outputChannels > 1) {
        const dryR = inputR[i] ?? dryL;
        outputR[i] = outputR[i] * mixWet + dryR * mixDry;
      }
    }
  }

  const outputStats = computePeakRms(outputL);

  // Create output buffer directly without OfflineAudioContext processing
  const outputContext = new OfflineAudioContext(
    outputChannels,
    frameCount,
    FV1_SAMPLE_RATE,
  );
  const rendered = outputContext.createBuffer(outputChannels, frameCount, FV1_SAMPLE_RATE);
  rendered.copyToChannel(outputL, 0);
  if (outputChannels > 1) {
    rendered.copyToChannel(outputR, 1);
  }

  if (request.onDebug) {
    const label = request.debugLabel ?? 'render';
    const delayNonZeroRatio = computeNonZeroRatio(state.delayRam);
    const sin0DelayOffset = state.lfo.sin0 * state.lfo.sin0Amp * state.choDepth;
    const sin1DelayOffset = state.lfo.sin1 * state.lfo.sin1Amp * state.choDepth;
    request.onDebug({
      timestamp: Date.now(),
      label,
      phase: 'end',
      data: {
        outputPeak: Number(outputStats.peak.toFixed(6)),
        outputRms: Number(outputStats.rms.toFixed(6)),
        outputPeakPreMix: Number(outputStatsPreMix.peak.toFixed(6)),
        outputRmsPreMix: Number(outputStatsPreMix.rms.toFixed(6)),
        delayNonZeroRatio: Number(delayNonZeroRatio.toFixed(6)),
        delayWritePtr: state.delayWritePtr,
        sin0DelayOffset: Number(sin0DelayOffset.toFixed(3)),
        sin1DelayOffset: Number(sin1DelayOffset.toFixed(3)),
        sin0Rate: Number(state.lfo.sin0Rate.toFixed(6)),
        sin1Rate: Number(state.lfo.sin1Rate.toFixed(6)),
        sin0Amp: Number(state.lfo.sin0Amp.toFixed(6)),
        sin1Amp: Number(state.lfo.sin1Amp.toFixed(6)),
        sin0: Number(state.lfo.sin0.toFixed(6)),
        sin1: Number(state.lfo.sin1.toFixed(6)),
      },
    });
  }

  const renderEndTime = performance.now();
  const elapsedMs = renderEndTime - renderStartTime;

  // Warn if render time exceeds 2 seconds for 30s audio (performance target)
  const targetRenderSeconds = Math.min(renderSeconds, DEFAULT_RENDER_SECONDS);
  if (elapsedMs > 2000 && targetRenderSeconds >= 30) {
    warnings.push({
      code: 'slow-render',
      message: `Render took ${(elapsedMs / 1000).toFixed(1)}s (target: <2s for 30s audio). Complex program may impact performance.`,
    });
  }

  return {
    buffer: rendered,
    duration: rendered.duration,
    sampleRate: rendered.sampleRate,
    warnings,
    resampleNote: resampled.note,
    normalizedPeak: outputStats.peak,
    elapsedMs,
    resampledInput: resampled.buffer,
  };
}
