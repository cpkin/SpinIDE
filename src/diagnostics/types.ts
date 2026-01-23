import type { LineContext } from './context'

export type DiagnosticSeverity = 'error' | 'warning' | 'info'

export interface ValidationDiagnostic {
  severity: DiagnosticSeverity
  message: string
  suggestedFix?: string
  line?: number
  column?: number
  context?: LineContext
}

export interface ResourceMeter {
  used: number
  max: number
}

export interface DelayRamUsage extends ResourceMeter {
  ms: number
}

export interface ResourceUsage {
  instructions: ResourceMeter
  delayRam: DelayRamUsage
  registers: ResourceMeter
}
