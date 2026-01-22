---
phase: 00-foundation-test-infrastructure
plan: 02
subsystem: foundation
tags: [json-schema, metadata, documentation, validation]

# Dependency graph
requires:
  - phase: 00-foundation-test-infrastructure
    provides: Phase context and research on metadata schema approach
provides:
  - JSON Schema 2020-12 for metadata v1 validation
  - Metadata authoring guide with v1/v2 examples
  - Versioned metadata format supporting forward compatibility
affects: [01-validation-parser, 03-interaction-ui, 04-diagrams]

# Tech tracking
tech-stack:
  added: [JSON Schema 2020-12]
  patterns: [Versioned metadata headers, strict validation with warnings, embedded JSON in SpinASM comments]

key-files:
  created: [schemas/metadata-v1.schema.json, docs/metadata-schema-v1.md]
  modified: []

key-decisions:
  - "Version field optional with v1 default to support legacy .spn files without breaking validation"
  - "Strict validation (additionalProperties: false) to catch typos and prevent schema drift"
  - "Memory samples maximum set to 32768 (FV-1 hardware limit at 32kHz sample rate)"
  - "Signal graph allows cycles for feedback paths without validation errors"

patterns-established:
  - "Metadata headers as JSON embedded in SpinASM comments with ;@fx prefix"
  - "Two-version strategy (v1 baseline, v2 extensible) enables forward compatibility"
  - "Graceful degradation: missing/invalid metadata warns but doesn't block validator/simulator"

# Metrics
duration: 2 min
completed: 2026-01-22
---

# Phase 00 Plan 02: Metadata Schema v1 Summary

**JSON Schema 2020-12 validation with versioned headers (v1/v2), strict required fields, and comprehensive authoring documentation**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-22T19:52:35Z
- **Completed:** 2026-01-22T19:54:21Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- JSON Schema 2020-12 defines strict metadata v1 validation rules with required fields for effect name, IO mode, pots, memory, and signal graph
- Comprehensive documentation with two complete header examples (mono delay v1, stereo reverb v2) in SpinASM comment format
- Versioning strategy enables forward compatibility (v1 default, v2 extensible) while supporting legacy files without metadata

## Task Commits

Each task was committed atomically:

1. **Task 1: Create JSON Schema for metadata v1** - `9b91c43` (feat)
2. **Task 2: Document metadata schema usage** - `a55aadf` (feat)

**Plan metadata:** (to be committed after SUMMARY creation) (docs)

## Files Created/Modified
- `schemas/metadata-v1.schema.json` - JSON Schema 2020-12 with strict validation for effectName, io, pots (3 required, pot0/1/2 with labels), memory (name + samples 1-32768), and graph (nodes/edges with cycle support)
- `docs/metadata-schema-v1.md` - Metadata authoring guide with field definitions, two complete examples (v1 mono delay, v2 stereo reverb), validation behavior, best practices, and schema reference link

## Decisions Made
- **Version field optional with v1 default:** Supports backward compatibility with legacy .spn files that lack metadata headers. Missing version triggers warning but doesn't block validation.
- **Strict validation via additionalProperties: false:** Catches typos and schema drift early. Invalid fields produce warnings, allowing rest of tool to function.
- **Memory limit 32768 samples:** Enforces FV-1 hardware constraint (1.02 seconds at 32kHz). Schema validation prevents overallocation errors.
- **Signal graph allows cycles:** Feedback paths are common in audio effects. Edges can form cycles without validation errors; diagrams mark feedback visually.
- **Two-version strategy (v1/v2):** v1 establishes baseline required fields. v2 (future) adds optional extensions while maintaining v1 compatibility. Enables graceful evolution without breaking existing programs.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - schema and documentation created without blockers.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Metadata schema v1 is locked and documented. Ready for:
- **Phase 1 (Validation/Parser):** Parser can extract and validate metadata headers using JSON Schema
- **Phase 3 (Interaction/UI):** UI can render pot labels and IO mode from validated metadata
- **Phase 4 (Diagrams):** Signal flow visualization can consume graph structure from metadata

No blockers for dependent phases. Schema is extensible via v2 without breaking v1 consumers.

---
*Phase: 00-foundation-test-infrastructure*
*Completed: 2026-01-22*
