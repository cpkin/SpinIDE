/**
 * FV-1 IO and LFO Instruction Handlers
 * 
 * Implements handlers for IO and LFO opcodes:
 * - WLDS: Write LFO sine frequency
 * - WLDR: Write LFO ramp frequency
 * - JAM: Reset LFO ramp
 * - CHO: Chorus/LFO operations
 * - RAW: Raw instruction pass-through
 * 
 * Reference: http://www.spinsemi.com/knowledge_base/inst_syntax.html
 */

import type { InstructionHandler, FV1State } from '../types';
import { saturatingAdd, saturatingMul, clampRDAXCoeff } from '../fixedPoint';
import {
  LFO_PHASE_INCREMENT_SCALE,
  LFO_SIN_GAIN_SCALE,
  LFO_RMP_GAIN_SCALE,
  LFO_SIN_DELAY_SCALE,
  LFO_RMP_DELAY_SCALE,
  MAX_DELAY_RAM,
} from '../constants';

const CHO_MODE_RDA = 0;
const CHO_MODE_SOF = 1;
const CHO_MODE_RDAL = 2;
const CHO_FLAG_COMPC = 2;

function getLfoParams(state: FV1State, lfoSelect: number): {
  normalized: number;
  amplitude: number;
  gainScale: number;
  delayScale: number;
  blend: number;
} {
  const isRamp = lfoSelect >= 2;
  const index = lfoSelect % 2;

  const normalized = isRamp
    ? (index === 0 ? state.lfo.rmp0 : state.lfo.rmp1)
    : (index === 0 ? state.lfo.sin0 : state.lfo.sin1);
  const amplitude = isRamp
    ? (index === 0 ? state.lfo.rmp0Amp : state.lfo.rmp1Amp)
    : (index === 0 ? state.lfo.sin0Amp : state.lfo.sin1Amp);

  const gainScale = isRamp ? LFO_RMP_GAIN_SCALE : LFO_SIN_GAIN_SCALE;
  const delayScale = isRamp ? LFO_RMP_DELAY_SCALE : LFO_SIN_DELAY_SCALE;
  const blend = isRamp ? normalized : (normalized + 1) * 0.5;

  return {
    normalized,
    amplitude,
    gainScale,
    delayScale,
    blend,
  };
}

function readDelayInterpolated(state: FV1State, address: number): number {
  const wrapped = ((address % MAX_DELAY_RAM) + MAX_DELAY_RAM) % MAX_DELAY_RAM;
  const index = Math.floor(wrapped);
  const next = (index + 1) % MAX_DELAY_RAM;
  const fraction = wrapped - index;
  const current = state.delayRam[index];
  const nextValue = state.delayRam[next];
  return current + (nextValue - current) * fraction;
}

/**
 * WLDS: Write LFO sine frequency
 * 
 * Sets the frequency for SIN LFO (LFO 0 or LFO 1).
 * 
 * Operands:
 * - operands[0]: LFO selector (0 or 1)
 * - operands[1]: Frequency (0-511)
 * - operands[2]: Amplitude (0-4095)
 * 
 * Note: LFO implementation requires tracking phase and computing sin/cos.
 * For now, this is a placeholder until full LFO support is implemented.
 * 
 * Reference: http://www.spinsemi.com/knowledge_base/inst_syntax.html#WLDS
 */
export const wlds: InstructionHandler = (_state: FV1State, _operands: number[]) => {
  const state = _state;
  const lfoSelect = _operands[0] ?? 0;
  const frequency = _operands[1] ?? 0;
  const amplitude = _operands[2] ?? 0;
  const rate = Math.max(0, frequency) * LFO_PHASE_INCREMENT_SCALE;

  if (lfoSelect === 0) {
    state.lfo.sin0Rate = rate;
    state.lfo.sin0Amp = Math.max(0, amplitude);
  } else {
    state.lfo.sin1Rate = rate;
    state.lfo.sin1Amp = Math.max(0, amplitude);
  }
};

/**
 * WLDR: Write LFO ramp frequency
 * 
 * Sets the frequency for RMP LFO (LFO 0 or LFO 1).
 * 
 * Operands:
 * - operands[0]: LFO selector (0 or 1)
 * - operands[1]: Frequency (0-511)
 * - operands[2]: Amplitude (0-32767)
 * 
 * Note: LFO implementation requires tracking phase and computing ramp.
 * For now, this is a placeholder until full LFO support is implemented.
 * 
 * Reference: http://www.spinsemi.com/knowledge_base/inst_syntax.html#WLDR
 */
export const wldr: InstructionHandler = (_state: FV1State, _operands: number[]) => {
  const state = _state;
  const lfoSelect = _operands[0] ?? 0;
  const frequency = _operands[1] ?? 0;
  const amplitude = _operands[2] ?? 0;
  const rate = Math.max(0, frequency) * LFO_PHASE_INCREMENT_SCALE;

  if (lfoSelect === 0) {
    state.lfo.rmp0Rate = rate;
    state.lfo.rmp0Amp = Math.max(0, amplitude);
  } else {
    state.lfo.rmp1Rate = rate;
    state.lfo.rmp1Amp = Math.max(0, amplitude);
  }
};

/**
 * JAM: Reset LFO ramp
 * 
 * Resets the RMP LFO to zero phase.
 * 
 * Operands:
 * - operands[0]: LFO selector (0 or 1)
 * 
 * Reference: http://www.spinsemi.com/knowledge_base/inst_syntax.html#JAM
 */
export const jam: InstructionHandler = (state: FV1State, operands: number[]) => {
  const lfoSelect = operands[0];

  // Reset ramp LFO phase to zero
  if (lfoSelect === 0) {
    state.lfo.rmp0Phase = 0.0;
    state.lfo.rmp0 = 0.0;
  } else {
    state.lfo.rmp1Phase = 0.0;
    state.lfo.rmp1 = 0.0;
  }
};

/**
 * CHO: Chorus/LFO operations
 * 
 * Complex instruction for reading delay RAM with LFO modulation.
 * 
 * CHO variants:
 * - CHO RDA: Read delay with LFO, multiply and add
 * - CHO SOF: Scale and offset using LFO value
 * - CHO RDAL: Read delay with LFO crossfade
 * 
 * Operands vary by CHO type (RDA/SOF/RDAL).
 * 
 * Note: CHO is the most complex FV-1 instruction and requires
 * full LFO implementation. For now, this is a placeholder.
 * 
 * Reference: http://www.spinsemi.com/knowledge_base/inst_syntax.html#CHO
 */
export const cho: InstructionHandler = (_state: FV1State, _operands: number[]) => {
  const state = _state;
  const mode = _operands[0] ?? CHO_MODE_RDA;
  const lfoSelect = _operands[1] ?? 0;
  const flags = _operands[2] ?? 0;

  const lfoParams = getLfoParams(state, lfoSelect);
  const lfoValue = lfoParams.normalized * lfoParams.amplitude * lfoParams.gainScale;

  if (mode === CHO_MODE_SOF) {
    const coeff = _operands.length > 3 ? clampRDAXCoeff(_operands[3]) : 1.0;
    const offset = _operands.length > 4 ? _operands[4] : 0.0;
    const scaled = saturatingMul(state.acc, coeff * lfoValue);
    state.acc = saturatingAdd(scaled, offset);
    return;
  }

  const baseAddress = _operands.length > 3 ? _operands[3] : 0;
  const delayOffset = lfoParams.normalized * lfoParams.amplitude * lfoParams.delayScale;
  const delayValue = readDelayInterpolated(state, baseAddress + delayOffset);
  const coeff = (flags & CHO_FLAG_COMPC) === 0 ? lfoParams.blend : 1 - lfoParams.blend;
  const scaled = saturatingMul(delayValue, coeff);

  if (mode === CHO_MODE_RDAL) {
    state.acc = scaled;
  } else {
    state.acc = saturatingAdd(state.acc, scaled);
  }
};

/**
 * RAW: Raw instruction pass-through
 * 
 * Allows direct encoding of FV-1 machine code.
 * Used for undocumented instructions or fine-tuned control.
 * 
 * Operands:
 * - operands[0]: Raw 32-bit instruction word
 * 
 * Note: RAW is rarely used and requires deep understanding of FV-1 ISA.
 * For now, this is a no-op placeholder.
 * 
 * Reference: http://www.spinsemi.com/knowledge_base/inst_syntax.html#RAW
 */
export const raw: InstructionHandler = (_state: FV1State, _operands: number[]) => {
  // TODO: Implement RAW instruction decoding
  // This requires parsing the raw instruction word and executing accordingly
  // Extremely rare in practice - defer to later phase if needed
};
