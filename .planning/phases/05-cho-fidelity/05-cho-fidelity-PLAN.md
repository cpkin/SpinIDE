---
phase: 05-cho-fidelity
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/fv1/instructions/io.ts
  - src/fv1/instructions/delay.ts
  - src/fv1/constants.ts
  - src/audio/renderSimulation.ts
  - src/audio/renderTypes.ts
  - src/ui/SimulationDiagnostics.tsx
  - src/ui/DebugPanel.tsx
autonomous: true

must_haves:
  truths:
    - "CHO modulation uses dual-tap constant-power crossfade with a phase offset"
    - "Sine LFO delay modulation uses sine output, ramp uses ramp phase"
    - "Delay modulation depth reflects calibrated LFO delay scaling constants"
    - "Diagnostics expose CHO/LFO calibration details for rendered output"
  artifacts:
    - path: "src/fv1/instructions/io.ts"
      provides: "CHO dual-tap crossfade and LFO waveform-accurate delay offset"
    - path: "src/fv1/instructions/delay.ts"
      provides: "Shared interpolated delay read helpers used by CHO/RMPA"
    - path: "src/fv1/constants.ts"
      provides: "Calibrated LFO delay scaling constants"
    - path: "src/audio/renderSimulation.ts"
      provides: "CHO diagnostics data emitted with renders"
    - path: "src/ui/SimulationDiagnostics.tsx"
      provides: "UI section showing CHO/LFO diagnostic values"
  key_links:
    - from: "src/fv1/instructions/io.ts"
      to: "src/fv1/instructions/delay.ts"
      via: "shared interpolated delay read helper"
      pattern: "readDelayInterpolated"
    - from: "src/fv1/constants.ts"
      to: "src/fv1/instructions/io.ts"
      via: "LFO delay scale usage"
      pattern: "LFO_.*_DELAY_SCALE"
    - from: "src/audio/renderSimulation.ts"
      to: "src/ui/SimulationDiagnostics.tsx"
      via: "renderResult CHO diagnostics"
      pattern: "choDiagnostics"
---

<objective>
Improve CHO/pitch-shift fidelity by implementing dual-tap crossfade, waveform-accurate phase offsets, calibrated delay scaling, and surface diagnostics to validate the new behavior.

Purpose: Reduce chorus artifacts and make modulation depth predictable and inspectable.
Output: Updated CHO/DSP path, calibrated delay constants, and diagnostics UI updates.
</objective>

<execution_context>
@~/.config/opencode/get-shit-done/workflows/execute-plan.md
@~/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/05-cho-fidelity/05-cho-fidelity-RESEARCH.md
@docs/simulation-fidelity.md
@src/fv1/instructions/io.ts
@src/fv1/instructions/delay.ts
@src/fv1/constants.ts
@src/audio/renderSimulation.ts
@src/ui/SimulationDiagnostics.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Implement dual-tap CHO crossfade with phase offsets</name>
  <files>src/fv1/instructions/io.ts, src/fv1/instructions/delay.ts</files>
  <action>
    Create or export a shared interpolated delay read helper in `src/fv1/instructions/delay.ts` so CHO and RMPA use the same interpolation path. Update `cho` in `src/fv1/instructions/io.ts` to read two interpolated taps separated by a phase offset (e.g., 0.5 cycle), then crossfade using a constant-power curve (sin/cos blend). Use waveform-accurate modulation: for sine LFO use `lfoParams.normalized`, for ramp LFO use the ramp phase (do not use sine phase for delay). Preserve CHO modes (RDA/SOF/RDAL) and COMPC behavior while removing single-tap blending.
  </action>
  <verify>npm run typecheck</verify>
  <done>CHO delay reads use two taps with constant-power crossfade and waveform-correct offsets; no single-tap blend remains.</done>
</task>

<task type="auto">
  <name>Task 2: Calibrate delay scaling constants and apply consistently</name>
  <files>src/fv1/constants.ts, src/fv1/instructions/io.ts, src/fv1/instructions/delay.ts</files>
  <action>
    Calibrate `LFO_SIN_DELAY_SCALE` and `LFO_RMP_DELAY_SCALE` in `src/fv1/constants.ts` to normalize LFO amplitude codes to a predictable delay depth (e.g., full-scale amplitude maps to +/-1.0 before `choDepth`). Use those constants in CHO delay offset and RMPA modulation so both paths share the same scaling. Add concise comments explaining the scaling rationale and ensure any helper functions take the scale as an explicit argument (avoid implicit 1.0 defaults).
  </action>
  <verify>npm run lint</verify>
  <done>Delay modulation depth is normalized via constants and used consistently by CHO and RMPA.</done>
</task>

<task type="auto">
  <name>Task 3: Surface CHO diagnostics in render debug and UI</name>
  <files>src/audio/renderSimulation.ts, src/audio/renderTypes.ts, src/ui/SimulationDiagnostics.tsx, src/ui/DebugPanel.tsx</files>
  <action>
    Extend `RenderSimulationResult` to include a `choDiagnostics` payload (delay scales, phase offset, crossfade mode, and choDepth used for the render). Populate it in `renderSimulation` using the calibrated constants. Update `SimulationDiagnostics` to display a compact "CHO Fidelity" section when render results are available, and update `DebugPanel` formatting if needed to keep new fields readable (avoid dumping huge objects).
  </action>
  <verify>npm run typecheck</verify>
  <done>Diagnostics panel shows CHO/LFO calibration values from the most recent render.</done>
</task>

</tasks>

<verification>
- `npm run typecheck`
- `npm run lint`
</verification>

<success_criteria>
- Dual-tap CHO crossfade and phase offsets are in place with waveform-accurate LFO usage.
- LFO delay scaling constants are calibrated and applied consistently across CHO/RMPA.
- Diagnostics UI exposes CHO calibration details for validation.
</success_criteria>

<output>
After completion, create `.planning/phases/05-cho-fidelity/05-cho-fidelity-01-SUMMARY.md`
</output>
