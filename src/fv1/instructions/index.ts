/**
 * FV-1 Instruction Handler Registry
 * 
 * Central registry for all FV-1 instruction handlers.
 * Each opcode maps to a handler function that executes the instruction's behavior.
 * 
 * Reference: http://www.spinsemi.com/knowledge_base/inst_syntax.html
 */

import type { InstructionHandler, FV1State } from '../types';

/**
 * NOP (No Operation) handler - default for unimplemented opcodes
 * 
 * Does nothing. Used as a safe default until specific opcodes are implemented.
 */
const nopHandler: InstructionHandler = (_state: FV1State, _operands: number[]) => {
  // No operation
};

/**
 * Instruction handler registry
 * 
 * Maps opcode names to their handler functions.
 * All handlers default to NOP until implemented in later phases.
 */
export const instructionHandlers: Record<string, InstructionHandler> = {
  // Delay memory read/write
  rda: nopHandler,
  rmpa: nopHandler,
  wra: nopHandler,
  wrap: nopHandler,
  
  // Register operations
  rdax: nopHandler,
  rdfx: nopHandler,
  ldax: nopHandler,
  wrax: nopHandler,
  wrhx: nopHandler,
  wrlx: nopHandler,
  
  // Arithmetic/logic
  maxx: nopHandler,
  absa: nopHandler,
  mulx: nopHandler,
  log: nopHandler,
  exp: nopHandler,
  sof: nopHandler,
  
  // Bitwise
  and: nopHandler,
  clr: nopHandler,
  or: nopHandler,
  xor: nopHandler,
  not: nopHandler,
  
  // Control flow
  skp: nopHandler,
  jmp: nopHandler,
  nop: nopHandler,
  
  // LFO
  wlds: nopHandler,
  wldr: nopHandler,
  
  // Special
  jam: nopHandler,
  cho: nopHandler,
  raw: nopHandler,
};

/**
 * Gets the handler for a given opcode
 * 
 * If the opcode is not recognized, returns the NOP handler.
 * This ensures the interpreter never crashes on unknown opcodes.
 * 
 * @param opcode - Opcode name (lowercase)
 * @returns Handler function for the opcode
 */
export function getHandler(opcode: string): InstructionHandler {
  return instructionHandlers[opcode.toLowerCase()] || nopHandler;
}

/**
 * Registers a custom handler for an opcode
 * 
 * Used to add or override opcode implementations.
 * 
 * @param opcode - Opcode name (lowercase)
 * @param handler - Handler function
 */
export function registerHandler(opcode: string, handler: InstructionHandler): void {
  instructionHandlers[opcode.toLowerCase()] = handler;
}
