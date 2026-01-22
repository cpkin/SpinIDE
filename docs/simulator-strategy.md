# Simulator Strategy

This document outlines the planned approach for the FV-1 simulator.
It establishes reference sources, math conventions, timing requirements,
and validation goals. Fidelity targets are defined in
`docs/simulation-fidelity.md`.

## Reference Implementations

- **SpinCAD Designer**: Real-world behavior reference for common effects.
- **asfv1**: Parser/assembler behavior reference for instruction encoding.
- **SPINAsm User Manual**: Canonical instruction semantics and limits.

## Fixed-Point Math Approach

- Use **1.23 fixed-point** representation for ACC/PACC/LR operations.
- Implement helpers for:
  - Converting float input samples to fixed-point and back.
  - Saturation/wrap behavior to match FV-1 numeric limits.
  - Operand range validation for each opcode.
- Avoid implicit JS float behavior in the core instruction step.

## Block Processing + POT Cadence

- FV-1 processes audio in **32-sample blocks**.
- POT0/1/2 values are sampled per block (not per sample).
- Simulator must update pot registers only at block boundaries.

## Sample Rate + Resampling

- FV-1 native sample rate: **32 kHz**.
- Input audio is resampled to 32 kHz before simulation.
- Output rendered at 32 kHz; conversion to user playback format is a UI concern.

## Validation Approach

- Use the Phase 0 corpus to validate:
  - Instruction count and delay RAM usage.
  - Output stability (no NaNs, no unstable feedback loops).
  - Behavioral expectations for known demo programs.
- Cross-check with SpinCAD demos where audio references are available.
- Follow fidelity criteria in `docs/simulation-fidelity.md`.

## Performance Targets

- **<2 seconds** to render a 30-second clip on modern hardware.
- Offline rendering via Web Audio `OfflineAudioContext` with streaming buffers.

## Open Questions (Tracked)

- Exact saturation vs wrap behavior per opcode (manual lookup needed).
- LFO phase alignment differences between SpinCAD and hardware.
