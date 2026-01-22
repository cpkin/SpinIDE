# Simulation Fidelity Target

This document defines the Phase 0 "gross correctness" target for the FV-1
simulator. The goal is to catch functional bugs and resource issues before
hardware programming, not to match every hardware quirk.

## Fidelity Goals (Must Match Hardware)

- **Instruction semantics:** ACC/PACC/LR behavior per opcode.
- **Fixed-point math:** 1.23 format scaling, saturation/wrap rules as per manual.
- **Delay memory:** 32,768 sample circular buffer with correct address wrapping.
- **Instruction limits:** 128 instruction slots; padding with `nop` as needed.
- **Resource limits:** pot/register/delay allocations must match hardware constraints.
- **Block timing:** 32-sample block processing and pot update cadence.

## Acceptable Deviations

- **No cycle-accurate timing:** instruction timing differences acceptable if audio output
  remains in the correct range and control behavior is stable.
- **Minor spectral differences:** small floating-point precision drift is acceptable
  if it does not change overall effect behavior (e.g., low-level noise floor).
- **UI parameterization:** UI knob smoothing can differ from hardware so long as the
  underlying pot values are applied on 32-sample boundaries.

## Known Risks to Surface in UI

- Fixed-point saturation vs JavaScript float rounding differences.
- LFO phase accuracy (SIN/RMP) compared with hardware oscillator.
- Subtle differences in interpolation for `cho` operations.
- Input resampling artifacts when non-32kHz sources are provided.

## Pass/Fail Criteria

- **Pass:** Outputs from corpus programs are audibly correct and meet numerical
  bounds (no NaNs, stable feedback, expected delay lengths). Regression checks
  show no unexpected clipping or silence.
- **Fail:** Any program produces silence when hardware should produce audio,
  runaway feedback from stable programs, incorrect delay lengths, or resource
  accounting mismatches (instruction count or delay RAM).

## Corpus Comparison Strategy

- Use Phase 0 corpus outputs as baselines for functional comparison.
- Compare against reference implementations (SpinCAD where available, asfv1
  assembly for instruction counts and resource limits).
