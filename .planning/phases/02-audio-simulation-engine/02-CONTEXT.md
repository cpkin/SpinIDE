# Phase 2: Audio Simulation Engine - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement the offline FV-1 audio simulation engine: load audio, resample to 32 kHz, execute SpinASM instructions, render output, and present progress/limits.

</domain>

<decisions>
## Implementation Decisions

### Input & Resampling
- Support drag/drop + upload + built-in demo audio
- Use high-quality offline, band-limited resampling to 32 kHz
- Prompt users that audio will be resampled to 32 kHz with stated fidelity
- Default mono handling: downmix L+R; allow prompt choice for mono_mono inputs
- Input normalization is a user-controlled toggle (off by default)

### Simulation Fidelity Bar
- Target audition-quality (trustworthy, not cycle-accurate)
- Show a first-run modal explaining fidelity limits
- Warn when patterns/opcodes are likely to diverge from hardware
- Validate against demo programs with both metric checks and listening notes

### Render Limits & Progress
- Default render length: 30 seconds
- Hard max: 2 minutes with warning
- Show progress UI after 5 seconds
- Allow canceling long renders

### IO Mode Behavior
- mono_mono: prompt user for stereo input handling (default downmix L+R)
- mono_stereo: duplicate mono to L/R
- stereo_stereo: duplicate mono input to L/R when needed
- Output normalization: normalize to -1 dB

### SpinCAD Reuse Policy
- Hybrid approach: reuse small proven pieces, reimplement core
- Full attribution (docs + source headers)
- If spec vs SpinCAD differs, document both behaviors
- Reuse scope left to OpenCode discretion

### OpenCode's Discretion
- Exact resampler implementation choice
- Which risky patterns get fidelity warnings
- Final wording for fidelity modal copy

</decisions>

<specifics>
## Specific Ideas

- Surface a user-facing note: "Your audio will be resampled to 32 kHz" with fidelity detail
- Treat read-before-write as likely feedback loops rather than errors

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-audio-simulation-engine*
*Context gathered: 2026-01-23*
