import type { ValidationDiagnostic } from '../diagnostics/types'

export interface ParsedInstruction {
  opcode: string
  operands: string[]
  line: number
  column: number
  raw: string
  recognized: boolean
}

export interface LabelSymbol {
  name: string
  line: number
  column: number
}

export interface EquateSymbol {
  name: string
  value: string
  line: number
  column: number
}

export interface MemorySymbol {
  name: string
  size: string
  line: number
  column: number
}

export interface SymbolTables {
  labels: Record<string, LabelSymbol>
  equates: Record<string, EquateSymbol>
  memory: Record<string, MemorySymbol>
}

export interface ParseResult {
  instructions: ParsedInstruction[]
  symbols: SymbolTables
  diagnostics: ValidationDiagnostic[]
}
