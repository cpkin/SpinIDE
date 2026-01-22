# Project State: SpinGPT

**Last Updated:** 2026-01-22
**Status:** Phase 0 In Progress

---

## Project Reference

### Core Value
Paste .spn code → hear simulated audio in under 2 seconds. Catch bugs before burning EEPROMs.

### Current Focus
Establishing foundational specifications and test infrastructure for FV-1 SpinASM validator and simulator.

---

## Current Position

### Active Phase
**Phase 0: Foundation & Test Infrastructure**

Goal: Specifications and test corpus locked; development can proceed with confidence

### Active Plan
Plan 02 of 6 in current phase

### Status
In progress

### Progress
```
Phase 0: [█░░░░░░░░░░░░░░░░░░░] 1/6 plans (17%)
Overall: [█░░░░░░░░░░░░░░░░░░░] 1/50 plans (2%)
```

**Last Activity:** 2026-01-22 - Completed 00-02-PLAN.md

---

## Performance Metrics

### Velocity
- **Plans completed:** 1
- **Requirements completed:** 1/50 (2%)
- **Phases completed:** 0/5 (0%)

### Quality
- **Blockers:** 0 active
- **Technical debt items:** 0 tracked
- **Test coverage:** Not yet applicable

### Efficiency
- **Avg time per plan:** 2 min
- **Replanning rate:** 0%

---

## Accumulated Context

### Key Decisions

| Date | Decision | Rationale | Impact |
|------|----------|-----------|--------|
| 2026-01-22 | Roadmap: 5 phases at "quick" depth | Requirements naturally cluster into foundation → validation → simulation → interaction → diagrams | Clear delivery boundaries, each phase unblocks next |
| 2026-01-22 | Phase 0 before coding | Lock SpinASM spec, metadata schema, test corpus before implementation | Prevents parser rework, enables TDD approach |
| 2026-01-22 | Separate Phase 2 (simulation) from Phase 3 (interaction) | Audio engine is highest-risk; isolate for focused testing | Front-loads critical risk (fixed-point math) |
| 2026-01-22 | Phase 4 (diagrams) as optional enhancement | Diagrams require metadata; tool works without them | Graceful degradation, metadata adoption can grow organically |
| 2026-01-22 | Version field optional with v1 default | Supports backward compatibility with legacy .spn files | Missing metadata doesn't block validator/simulator |
| 2026-01-22 | Strict validation (additionalProperties: false) | Catches typos and schema drift early | Invalid fields produce warnings but don't break tool |
| 2026-01-22 | Memory limit 32768 samples | Enforces FV-1 hardware constraint at 32kHz | Schema validation prevents overallocation errors |
| 2026-01-22 | Signal graph allows cycles | Feedback paths common in audio effects | Diagrams can visualize feedback without validation errors |

### Active Todos
None (no work started yet)

### Blockers
None

---

## Session Continuity

### What Just Happened
- Completed 00-02-PLAN.md: Metadata Schema v1
- Created JSON Schema 2020-12 for metadata validation with strict required fields
- Documented metadata authoring with two complete examples (v1 mono delay, v2 stereo reverb)
- Established versioning strategy (v1 default, v2 forward-compatible)
- Locked metadata format for validation and diagram phases

### What's Next
1. Continue Phase 0 with remaining plans (01, 03, 04, 05, 06)
2. Next plan likely: SpinASM dialect specification
3. After Phase 0 completion, Phase 1 can begin parser implementation with confidence

### Context for Next Session
- **Project:** Browser-based FV-1 SpinASM validator and audio simulator
- **User background:** FV-1 pedal builder frustrated by SpinCAD bugs and Windows-only tooling
- **Tech stack:** React + TypeScript + Web Audio API (offline rendering)
- **Critical risks:** Fixed-point math emulation, sample rate conversion, parser robustness
- **Success metric:** Paste code → hear audio in <2 seconds

---

*State initialized: 2026-01-22*
*Ready for planning*
