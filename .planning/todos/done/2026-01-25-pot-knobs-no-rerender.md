---
created: 2026-01-25T19:27
title: POT knobs do not trigger audio re-render when changed
area: ui
files:
  - src/ui/KnobPanel.tsx
  - src/components/AnalogKnob.tsx
  - src/ui/SimulationPanel.tsx
---

## Problem

User adjusts POT0, POT1, or POT2 knobs but the audio effect does not change. The knobs update visually but the audio simulation is not re-rendered with the new POT values. This breaks the core interaction loop where users should be able to hear how POT changes affect the audio effect in real-time.

Expected behavior: Adjusting a POT knob → debounced re-render (500ms) → hear updated audio with new POT settings (as designed in Phase 3, Plan 03-03).

Actual behavior: Knobs move but audio stays the same as initial render.

## Root Cause

**THREE separate bugs** were preventing POT controls from working:

### Bug 1: Missing `setOutputBuffer()` call
KnobPanel.tsx re-render successfully generated new audio but failed to update `outputBuffer` in the audio store. The playback system continued playing the old buffer.

- Main render (SimulationPanel.tsx:259): calls both `setRenderResult()` AND `setOutputBuffer()` ✓
- POT re-render (KnobPanel.tsx:106): only called `setRenderResult()` ✗

### Bug 2: Caching OUTPUT buffer instead of INPUT buffer
SimulationPanel.tsx:263 was caching `result.buffer` (the processed OUTPUT audio) instead of the resampled INPUT. This caused POT re-renders to process already-processed audio, compounding the effect instead of re-applying it with new POT values.

- Should cache: `result.resampledInput` (32kHz input for re-processing)
- Was caching: `result.buffer` (processed output)

### Bug 3: Output normalization undoing POT volume changes (PRIMARY BUG)
`renderSimulation.ts` was normalizing all output to a target peak of -1dB (0.891). When POT0 controlled volume:
- POT0=0.1 → quieter audio (peak=0.1) → normalized back up (gain=8.9x) → same loudness
- POT0=0.9 → louder audio (peak=0.9) → normalized down (gain=0.99x) → same loudness

**The automatic gain control completely cancelled out POT volume changes.**

This is why:
- Tremolo worked (varying peaks from LFO modulation couldn't be fully normalized)
- Volume control didn't work (constant volume was always normalized to target)
- Waveform changed but audio didn't (visual showed pre-normalized data, playback used normalized)

## Solution

**Files Changed:**
1. `src/audio/renderTypes.ts` - Added `resampledInput: AudioBuffer` to RenderSimulationResult
2. `src/audio/renderSimulation.ts` - Return resampled input + **DISABLED output normalization**
3. `src/ui/SimulationPanel.tsx` - Cache `result.resampledInput` instead of `result.buffer`
4. `src/ui/KnobPanel.tsx` - Added `setOutputBuffer(result.buffer)` after re-render
5. `src/ui/AnalogKnob.tsx` - Changed POT display from 0-11 to 0-10 range

Now when knobs change:
1. Re-render uses cached 32kHz **input** buffer (not output)
2. Applies effect with new POT values
3. Output is NOT normalized (preserves POT-controlled volume/effects)
4. Updates both `renderResult` and `outputBuffer`
5. PlaybackControls detects buffer change
6. User hears updated audio with correct POT values

## Testing

Test with tremolo.spn (uses POT0 for depth control):
1. Load tremolo.spn + audio input
2. Render simulation
3. Adjust POT0 knob (wait 500ms debounce)
4. Play audio → tremolo depth should change with POT0 value
