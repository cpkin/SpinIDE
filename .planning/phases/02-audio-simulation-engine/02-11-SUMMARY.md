---
phase: 02-audio-simulation-engine
plan: 11
subsystem: simulation
tags: [fv1, opcodes, raw, compiler, interpreter]

# Dependency graph
requires:
  - phase: 02-audio-simulation-engine
    provides: interpreter baseline with opcode handlers
provides:
  - Expanded SPINAsm opcode catalog with SKP/CHO alias coverage
  - RAW instruction decoding and dispatch to opcode handlers
affects: [phase-3-audio-interaction, corpus-validation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Opcode alias normalization for SKP/CHO variants
    - RAW word decoding into fixed-point operands

key-files:
  created: []
  modified:
    - src/parser/opcodes.ts
    - src/fv1/compileProgram.ts
    - src/fv1/instructions/index.ts
    - src/fv1/instructions/control.ts
    - src/fv1/instructions/io.ts
    - src/fv1/types.ts
    - src/fv1/warnings.ts
    - src/fv1/interpreter.ts
    - src/audio/renderSimulation.ts

key-decisions:
  - "None - followed plan as specified"

patterns-established:
  - "Opcode alias normalization for SKP/CHO"
  - "RAW decode path maps machine words to handler dispatch"

# Metrics
duration: 0 min
completed: 2026-01-25
---

# Phase 02 Plan 11: Opcode Coverage and RAW Decode Summary

**Expanded opcode coverage with SKP/CHO aliases and RAW word decoding that dispatches through the interpreter.**

## Performance

- **Duration:** 0 min
- **Started:** 2026-01-25T14:25:18-05:00
- **Completed:** 2026-01-25T14:26:02-05:00
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Expanded the SPINAsm opcode catalog with SKP/CHO alias coverage and compiler parsing
- Implemented RAW word decoding with fixed-point operand reconstruction and warnings
- Routed RAW execution through interpreter dispatch with PC injection for control flow

## Task Commits

Each task was committed atomically:

1. **Task 1: Expand opcode catalog and handler coverage to 40+ mnemonics** - `6c05fbe` (feat)
2. **Task 2: Implement RAW instruction decoding and execution path** - `98026f6` (feat)

**Plan metadata:** pending

## Files Created/Modified
- `src/parser/opcodes.ts` - Expanded opcode catalog with alias mnemonics
- `src/fv1/compileProgram.ts` - Alias parsing helpers and RAW word parsing
- `src/fv1/instructions/index.ts` - Alias handler registry entries
- `src/fv1/instructions/control.ts` - SKP unconditional skip handling
- `src/fv1/instructions/io.ts` - RAW opcode decoding and dispatch
- `src/fv1/types.ts` - RAW decoded instruction type
- `src/fv1/warnings.ts` - RAW warning helper
- `src/fv1/interpreter.ts` - RAW opcode PC injection
- `src/audio/renderSimulation.ts` - RAW opcode PC injection in cached execution

## Decisions Made
None - followed plan as specified.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SKP without flags now skips unconditionally**
- **Found during:** Task 1 (Expand opcode catalog and handler coverage to 40+ mnemonics)
- **Issue:** `skp` with no condition flags behaved as a no-op instead of an unconditional skip
- **Fix:** Treat zero flags as unconditional skip in the control handler
- **Files modified:** `src/fv1/instructions/control.ts`
- **Verification:** `npm run typecheck`
- **Committed in:** 6c05fbe

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Fix required for correct SKP behavior; no scope creep.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 2 opcode coverage complete, ready for Phase 3 planning
- RAW instruction path now dispatches decoded opcodes or warns on unsupported words

---
*Phase: 02-audio-simulation-engine*
*Completed: 2026-01-25*
