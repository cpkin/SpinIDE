/**
 * FV-1 Delay Memory Instruction Handlers
 * 
 * Implements handlers for delay memory read/write opcodes:
 * - RDA: Read delay RAM and multiply, add to ACC
 * - RMPA: Read delay RAM with LFO modulation
 * - WRA: Write ACC to delay RAM
 * - WRAP: Write ACC to delay RAM and increment write pointer
 * 
 * Note: FV-1 delay RAM is floating-point with limited resolution.
 * For precision filters, use register-based instructions instead.
 * 
 * Reference: http://www.spinsemi.com/knowledge_base/inst_syntax.html
 */

import type { InstructionHandler, FV1State } from '../types';
import { saturatingAdd, saturatingMul, clampRDACoeff } from '../fixedPoint';
import { MAX_DELAY_RAM, LFO_SIN_DELAY_SCALE, LFO_RMP_DELAY_SCALE } from '../constants';

function resolveDelayAddress(state: FV1State, address: number): number {
  const pointerRelative = address >= MAX_DELAY_RAM;
  const base = pointerRelative ? address - MAX_DELAY_RAM : address;
  const resolved = pointerRelative ? base + state.delayWritePtr : base;
  return ((resolved % MAX_DELAY_RAM) + MAX_DELAY_RAM) % MAX_DELAY_RAM;
}

function readDelayInterpolated(state: FV1State, address: number): number {
  const wrapped = resolveDelayAddress(state, address);
  const index = Math.floor(wrapped);
  const next = (index + 1) % MAX_DELAY_RAM;
  const fraction = wrapped - index;
  const current = state.delayRam[index];
  const nextValue = state.delayRam[next];
  return current + (nextValue - current) * fraction;
}

/**
 * RDA: Read from delay RAM, multiply, and add to ACC
 * 
 * ACC = ACC + (DELAY[address] * coefficient)
 * 
 * Operands:
 * - operands[0]: Delay RAM address (0-32767)
 * - operands[1]: Coefficient [-2.0, +1.998]
 * 
 * Reference: http://www.spinsemi.com/knowledge_base/inst_syntax.html#RDA
 */
export const rda: InstructionHandler = (state: FV1State, operands: number[]) => {
  const address = Math.trunc(operands[0]);
  const coeff = clampRDACoeff(operands[1]);
  const resolved = resolveDelayAddress(state, address);
  const delayValue = state.delayRam[resolved];
  const product = saturatingMul(delayValue, coeff);
  state.acc = saturatingAdd(state.acc, product);
};

/**
 * RMPA: Read from delay RAM with LFO-modulated address
 * 
 * ACC = ACC + (DELAY[address + LFO_offset] * coefficient)
 * 
 * Used for chorus and modulated delay effects.
 * 
 * Operands:
 * - operands[0]: Coefficient [-2.0, +1.998]
 * 
 * Note: LFO offset comes from CHO instruction state.
 * For now, we'll implement without LFO modulation (base implementation).
 * 
 * Reference: http://www.spinsemi.com/knowledge_base/inst_syntax.html#RMPA
 */
export const rmpa: InstructionHandler = (state: FV1State, operands: number[]) => {
  const coeff = clampRDACoeff(operands[0]);

  const useSineLfo = state.lfo.sin0Amp !== 0 || state.lfo.sin0Rate !== 0;
  const normalized = useSineLfo ? state.lfo.sin0 : state.lfo.rmp0;
  const amplitude = useSineLfo ? state.lfo.sin0Amp : state.lfo.rmp0Amp;
  const delayScale = useSineLfo ? LFO_SIN_DELAY_SCALE : LFO_RMP_DELAY_SCALE;
  const offset = normalized * amplitude * delayScale;

  const address = state.delayWritePtr + offset;
  const delayValue = readDelayInterpolated(state, address);
  const product = saturatingMul(delayValue, coeff);
  state.acc = saturatingAdd(state.acc, product);
};

/**
 * WRA: Write ACC to delay RAM at specified address
 * 
 * DELAY[address] = ACC
 * ACC = ACC * coefficient
 * 
 * Operands:
 * - operands[0]: Delay RAM address (0-32767)
 * - operands[1]: Coefficient [-2.0, +1.9999389] (default 0.0)
 * 
 * Reference: http://www.spinsemi.com/knowledge_base/inst_syntax.html#WRA
 */
export const wra: InstructionHandler = (state: FV1State, operands: number[]) => {
  const address = Math.trunc(operands[0]);
  const coeff = operands.length > 1 ? operands[1] : 0.0;
  const resolved = resolveDelayAddress(state, address);
  state.delayRam[resolved] = state.acc;
  state.acc = saturatingMul(state.acc, coeff);
};

/**
 * WRAP: Write ACC to delay RAM and advance write pointer
 * 
 * DELAY[writePtr] = (ACC * coefficient) + DELAY[address]
 * writePtr = (writePtr + 1) % MAX_DELAY_RAM
 * 
 * Used for all-pass filters and circular delay buffers.
 * 
 * Operands:
 * - operands[0]: Delay RAM address (0-32767)
 * - operands[1]: Coefficient [-2.0, +1.998]
 * 
 * Reference: http://www.spinsemi.com/knowledge_base/inst_syntax.html#WRAP
 */
export const wrap: InstructionHandler = (state: FV1State, operands: number[]) => {
  const address = Math.trunc(operands[0]);
  const coeff = clampRDACoeff(operands[1]);
  
  // Read from specified address
  const resolved = resolveDelayAddress(state, address);
  const delayValue = state.delayRam[resolved];
  
  // Write (ACC * coeff + delayValue) to current write pointer
  const product = saturatingMul(state.acc, coeff);
  const sum = saturatingAdd(product, delayValue);
  state.delayRam[state.delayWritePtr] = sum;
  
  // Advance write pointer (circular buffer)
  state.delayWritePtr = (state.delayWritePtr + 1) % MAX_DELAY_RAM;
  
  // ACC is set to the written value
  state.acc = sum;
};
