/**
 * FV-1 Interpreter
 * 
 * Sample-by-sample execution loop for FV-1 DSP programs.
 * Executes up to 128 instructions per audio sample at 32 kHz.
 * 
 * Reference: http://www.spinsemi.com/knowledge_base/arch.html
 */

import { INSTRUCTIONS_PER_SAMPLE, POT_UPDATE_BLOCK_SIZE } from './constants';
import { createState, resetState } from './state';
import { getHandler } from './instructions';
import type { FV1State, CompiledProgram, PotValues } from './types';

/**
 * Options for program execution
 */
export interface ExecutionOptions {
  /**
   * Initial POT values (default: all 0.5)
   */
  initialPots?: Partial<PotValues>;
  
  /**
   * Callback invoked every 32 samples for POT updates
   * Return new POT values or undefined to keep current values
   */
  onPotUpdate?: (sampleIndex: number, state: FV1State) => Partial<PotValues> | void;
  
  /**
   * Whether to reset state before execution (default: true)
   */
  resetBeforeRun?: boolean;
}

/**
 * Result of program execution
 */
export interface ExecutionResult {
  /**
   * Output buffer for left channel
   */
  outputL: Float32Array;
  
  /**
   * Output buffer for right channel
   */
  outputR: Float32Array;
  
  /**
   * Final interpreter state after execution
   */
  finalState: FV1State;
}

/**
 * Executes a single sample through the FV-1 program
 * 
 * Steps through up to 128 instructions, updating state.
 * PACC is set to previous ACC value at the start of each sample.
 * 
 * @param state - Current interpreter state
 * @param program - Compiled program to execute
 * @param inputL - Left channel input sample
 * @param inputR - Right channel input sample
 */
function executeSample(
  state: FV1State,
  program: CompiledProgram,
  _inputL: number,
  _inputR: number
): void {
  // Update PACC with previous sample's ACC
  state.pacc = state.acc;
  
  // Store input samples (accessible via LDAX ADCL/ADCR)
  // For now, we'll just track them in ACC for initial implementation
  // TODO: Implement proper ADC register access in opcode handlers
  
  // Execute up to 128 instructions
  const instructionCount = Math.min(program.instructions.length, INSTRUCTIONS_PER_SAMPLE);
  
  for (let pc = 0; pc < instructionCount; pc++) {
    const instruction = program.instructions[pc];
    const handler = getHandler(instruction.opcode);
    
    // Execute instruction (modifies state in place)
    handler(state, instruction.operands);
  }
  
  // After all instructions, output is in ACC
  // DAC outputs are set by WRAX/WRA instructions or default to ACC
  // For stereo processing, LR flag determines which DAC gets the output
  if (state.ioMode === 'mono_mono') {
    state.dacL = state.acc;
    state.dacR = state.acc;
  } else if (state.ioMode === 'mono_stereo') {
    if (state.lr === 0) {
      state.dacL = state.acc;
    } else {
      state.dacR = state.acc;
    }
  } else {
    // stereo_stereo
    if (state.lr === 0) {
      state.dacL = state.acc;
    } else {
      state.dacR = state.acc;
    }
  }
}

/**
 * Executes a complete FV-1 program over input audio buffers
 * 
 * Processes audio sample-by-sample, executing 128 instructions per sample.
 * Updates POT values every 32 samples via optional callback.
 * 
 * @param program - Compiled FV-1 program
 * @param inputL - Left channel input buffer
 * @param inputR - Right channel input buffer (for stereo programs)
 * @param options - Execution options
 * @returns Execution result with output buffers and final state
 */
export function executeProgram(
  program: CompiledProgram,
  inputL: Float32Array,
  inputR: Float32Array,
  options: ExecutionOptions = {}
): ExecutionResult {
  const {
    initialPots = {},
    onPotUpdate,
    resetBeforeRun = true,
  } = options;
  
  // Create or reset state
  const state = createState(program.ioMode, initialPots);
  
  if (!resetBeforeRun) {
    // If not resetting, caller is responsible for state management
    // This allows for stateful processing across multiple calls
  } else {
    resetState(state);
  }
  
  // Allocate output buffers
  const frameCount = inputL.length;
  const outputL = new Float32Array(frameCount);
  const outputR = new Float32Array(frameCount);
  
  // Process samples
  for (let sample = 0; sample < frameCount; sample++) {
    // Update POT values every 32 samples
    if (sample % POT_UPDATE_BLOCK_SIZE === 0 && onPotUpdate) {
      const newPots = onPotUpdate(sample, state);
      if (newPots) {
        // Apply POT updates (clamped to [0, 1])
        if (newPots.pot0 !== undefined) {
          state.pots.pot0 = Math.max(0.0, Math.min(1.0, newPots.pot0));
        }
        if (newPots.pot1 !== undefined) {
          state.pots.pot1 = Math.max(0.0, Math.min(1.0, newPots.pot1));
        }
        if (newPots.pot2 !== undefined) {
          state.pots.pot2 = Math.max(0.0, Math.min(1.0, newPots.pot2));
        }
      }
    }
    
    // Toggle LR flag for stereo processing
    // In stereo modes, program runs twice per sample (once for L, once for R)
    if (program.ioMode !== 'mono_mono') {
      // Process left channel
      state.lr = 0;
      executeSample(state, program, inputL[sample], inputR[sample]);
      outputL[sample] = state.dacL;
      
      // Process right channel
      state.lr = 1;
      executeSample(state, program, inputL[sample], inputR[sample]);
      outputR[sample] = state.dacR;
    } else {
      // Mono mode: process once
      state.lr = 0;
      executeSample(state, program, inputL[sample], inputR[sample]);
      outputL[sample] = state.dacL;
      outputR[sample] = state.dacR;
    }
    
    state.sampleCounter++;
  }
  
  return {
    outputL,
    outputR,
    finalState: state,
  };
}

/**
 * Alias for executeProgram with more descriptive name
 * 
 * @param program - Compiled FV-1 program
 * @param inputL - Left channel input buffer
 * @param inputR - Right channel input buffer
 * @param options - Execution options
 * @returns Execution result
 */
export function runProgram(
  program: CompiledProgram,
  inputL: Float32Array,
  inputR: Float32Array,
  options: ExecutionOptions = {}
): ExecutionResult {
  return executeProgram(program, inputL, inputR, options);
}
