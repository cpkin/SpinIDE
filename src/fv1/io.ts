/**
 * FV-1 IO Mode Mapping
 * 
 * Handles input/output channel routing for different IO modes:
 * - mono_mono: Single input, single output
 * - mono_stereo: Single input, stereo output (duplicate L/R)
 * - stereo_stereo: Stereo input, stereo output
 * 
 * Reference: http://www.spinsemi.com/knowledge_base/arch.html
 */

import type { IOMode } from './types';

/**
 * IO configuration for a specific mode
 */
export interface IOConfig {
  /**
   * Number of input channels
   */
  inputChannels: number;
  
  /**
   * Number of output channels
   */
  outputChannels: number;
  
  /**
   * Whether program runs twice per sample (once for L, once for R)
   */
  dualPass: boolean;
  
  /**
   * Description of the IO mode
   */
  description: string;
}

/**
 * IO mode configurations
 */
export const IO_MODE_CONFIG: Record<IOMode, IOConfig> = {
  mono_mono: {
    inputChannels: 1,
    outputChannels: 1,
    dualPass: false,
    description: 'Single input, single output',
  },
  
  mono_stereo: {
    inputChannels: 1,
    outputChannels: 2,
    dualPass: true,
    description: 'Single input, stereo output (program runs twice per sample)',
  },
  
  stereo_stereo: {
    inputChannels: 2,
    outputChannels: 2,
    dualPass: true,
    description: 'Stereo input, stereo output (program runs twice per sample)',
  },
};

/**
 * Gets IO configuration for a specific mode
 * 
 * @param mode - IO mode
 * @returns IO configuration
 */
export function getIOConfig(mode: IOMode): IOConfig {
  return IO_MODE_CONFIG[mode];
}

/**
 * Maps input samples to FV-1 ADC registers based on IO mode
 * 
 * @param inputL - Left channel input sample
 * @param inputR - Right channel input sample
 * @param mode - IO mode
 * @param lr - Left/Right flag (0 = left, 1 = right)
 * @returns Object with adcl and adcr values
 */
export function mapInputToADC(
  inputL: number,
  inputR: number,
  mode: IOMode,
  lr: number,
): { adcl: number; adcr: number } {
  switch (mode) {
    case 'mono_mono':
      // Mono mode: downmix L+R to mono, or use left channel only
      // For now, use left channel only (downmix can be added as option)
      return { adcl: inputL, adcr: inputL };
    
    case 'mono_stereo':
      // Mono input, stereo output: duplicate input to both ADCs
      return { adcl: inputL, adcr: inputL };
    
    case 'stereo_stereo':
      // Stereo mode: route based on LR flag
      if (lr === 0) {
        // Left pass: ADCL = left input
        return { adcl: inputL, adcr: inputL };
      } else {
        // Right pass: ADCR = right input
        return { adcl: inputR, adcr: inputR };
      }
    
    default:
      return { adcl: 0, adcr: 0 };
  }
}

/**
 * Output normalization to -1 dB
 * 
 * Applies a gain reduction to prevent clipping and match FV-1 output levels.
 * -1 dB = 10^(-1/20) ≈ 0.8913
 * 
 * @param sample - Output sample value
 * @returns Normalized sample
 */
export function normalizeOutput(sample: number): number {
  const MINUS_1_DB = 0.8913;
  return sample * MINUS_1_DB;
}

/**
 * Input normalization (optional)
 * 
 * Normalizes input to prevent clipping in high-gain programs.
 * This is typically off by default and user-controlled.
 * 
 * @param sample - Input sample value
 * @param enabled - Whether normalization is enabled
 * @returns Normalized sample
 */
export function normalizeInput(sample: number, enabled: boolean = false): number {
  if (!enabled) {
    return sample;
  }
  
  // Apply -6 dB gain reduction for headroom
  const MINUS_6_DB = 0.5012;
  return sample * MINUS_6_DB;
}
