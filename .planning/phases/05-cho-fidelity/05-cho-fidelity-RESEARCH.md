# Phase 5: CHO Fidelity Improvements - Research

**Researched:** 2026-01-26
**Domain:** FV-1 CHO/pitch-shift fidelity in simulation
**Confidence:** MEDIUM

## Summary

This research focused on the current FV-1 CHO implementation and related LFO/delay behavior in `src/fv1/instructions/io.ts`, `src/fv1/instructions/delay.ts`, and the LFO update loop. The in-repo docs call out CHO interpolation and LFO phase accuracy as known fidelity risks, which aligns with observed flutter/robotic artifacts.

SpinCAD-Designer’s ElmGen simulator and generated chorus/pitch blocks provide concrete reference behavior for CHO on FV-1-style codegen and simulation. Its CHO implementation uses a dual-read linear interpolation pattern (two CHO RDA reads at `addr` and `addr+1` with `COMPC` on the first) and uses different fractional resolutions for SIN (8-bit) versus RAMP (14-bit) LFOs. For pitch shifting, SpinCAD uses a dual-ramp approach: a second read pointer (RPTR2) and a CHO SOF crossfade driven by the ramp LFO’s xfade window, then mixes a temporary buffer under NA mode.

SpinCAD’s ramp LFO crossfade window is explicitly shaped: it ramps up over one eighth of the ramp cycle, holds for two eighths, ramps down over one eighth, and is zero elsewhere; the window is scaled per ramp amplitude (512/1024/2048/4096). This is a strong reference for how FV-1 CHO crossfade should behave during pitch shifting and helps explain why single-tap or cosine-only blends sound “robotic.”

**Primary recommendation:** Implement dual-tap CHO that matches SpinCAD’s CHO RDA interpolation (COMPC + addr+1), then add ramp LFO xfade windows (NA/CHO SOF) for pitch-shift crossfades and calibrate LFO delay scaling against reference patches.

## Standard Stack

The established code path and modules for CHO fidelity work:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| In-repo FV-1 interpreter | N/A | Execute FV-1 instructions sample-by-sample | All CHO behavior flows through interpreter and instruction handlers |
| `src/fv1/instructions/io.ts` | N/A | CHO opcode implementation | Current CHO/LFO behavior lives here |
| `src/fv1/instructions/delay.ts` | N/A | Delay interpolation helper | Shared interpolated reads for modulated delay |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `src/fv1/interpreter.ts` | N/A | LFO phase update | Required when changing LFO waveform or phase handling |
| `src/fv1/constants.ts` | N/A | LFO scaling constants | Required for delay/gain scaling adjustments |
| SpinCAD-Designer ElmGen simulator | N/A | Reference CHO/pitch shift simulation behavior | Use to mirror CHO RDA interpolation and ramp xfade windowing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| In-repo interpolation | External DSP lib | Adds dependency and diverges from FV-1 semantics |

**Installation:**
```bash
npm install
```

## Architecture Patterns

### Recommended Project Structure
```
src/fv1/
├── instructions/        # Opcode handlers
├── constants.ts         # Scaling constants
├── interpreter.ts       # LFO phase update
└── state.ts             # DSP state
```

### Pattern 1: Dual-Tap Constant-Power Crossfade
**What:** Read two interpolated taps separated by a phase offset and crossfade using a constant-power curve to avoid amplitude modulation artifacts.
**When to use:** Any CHO/RDAL path that currently relies on a single modulated tap.
**Example:**
```ts
// Source: src/fv1/instructions/io.ts
const blend = 0.5 - 0.5 * Math.cos(Math.PI * phase);
```

### Pattern 2: CHO RDA Linear Interpolation (SpinCAD)
**What:** Use two CHO RDA reads at `addr` and `addr+1`, with `COMPC` on the first, so the LFO fraction performs linear interpolation at the CHO read stage.
**When to use:** CHO-based chorus and pitch shift paths intended to mimic FV-1/SpinCAD behavior.
**Example:**
```java
// Source: https://raw.githubusercontent.com/HolyCityAudio/SpinCAD-Designer/master/src-gen/com/holycityaudio/SpinCAD/CADBlocks/ChorusCADBlock.java
sfxb.chorusReadDelay((int)lfoSel, SIN|REG|COMPC, chorusCenter );
sfxb.chorusReadDelay((int)lfoSel, SIN, chorusCenter + 1);
```

### Pattern 3: Waveform-Accurate Modulation
**What:** Use sine LFO output for sine-based modulation and ramp only for ramp LFOs. Avoid using phase directly for sine modulation.
**When to use:** CHO delay offset computation and RDAL/RDA scaling.

### Pattern 4: Ramp LFO Xfade Window (SpinCAD)
**What:** Use the ramp LFO’s built-in crossfade window for pitch shifting: ramp up over 1/8 of the cycle, hold for 2/8, ramp down over 1/8, otherwise 0. Scale per ramp range (512/1024/2048/4096).
**When to use:** Pitch shift implementations using CHO RDA + RPTR2 and CHO SOF.
**Example:**
```java
// Source: https://raw.githubusercontent.com/HolyCityAudio/SpinCAD-Designer/master/src/org/andrewkilpatrick/elmGen/simulator/RampLFO.java
int eighthAmp = amp >> 3;
if(pos > eighthAmp * 7) {
  xfade = 0;
} else if (pos > eighthAmp * 5) {
  xfade += increment;
} else if (pos > eighthAmp * 3) {
  xfade = xfade * 1;
} else if ((pos > eighthAmp * 1)) {
  xfade -= increment;
} else {
  xfade = 0;
}
```

### Anti-Patterns to Avoid
- **Phase-as-sine:** Using `phase` (ramp) for sine LFO delay offsets introduces non-sinusoidal pitch modulation artifacts.
- **Single-tap CHO:** Scaling a single tap with a blend coefficient creates periodic level modulation and “robotic” flutter.
- **Ignoring CHO fraction width:** Using a uniform fraction width for SIN and RAMP LFOs will not match SpinCAD’s CHO interpolation behavior.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Delay address wrapping | Custom modulo logic | `resolveDelayAddress` in io/delay handlers | Ensures pointer-relative addresses match FV-1 expectations |
| Delay interpolation math | Ad-hoc interpolation | `readDelayInterpolated` helper (then refine) | Keeps one consistent interpolation path for CHO/RMPA |

**Key insight:** CHO fidelity depends more on consistent LFO phase and crossfade behavior than on adding new DSP primitives.

## Common Pitfalls

### Pitfall 1: Sine LFO uses ramp phase for delay
**What goes wrong:** Pitch modulation becomes stair-stepped or robotic because the delay offset is a ramp, not a sine.
**Why it happens:** `delayOffset` uses `lfoParams.phase` regardless of LFO type.
**How to avoid:** Use `lfoParams.normalized` for sine, ramp only for ramp LFOs.
**Warning signs:** Audible buzz/zipper during chorus, especially at low rates.

### Pitfall 2: Single-tap blend for CHO RDAL
**What goes wrong:** Level modulation and flutter due to scaling a single tap instead of crossfading two taps.
**Why it happens:** Current CHO uses one interpolated read and applies a blend coefficient.
**How to avoid:** Implement dual-tap with phase offset and constant-power crossfade.
**Warning signs:** Audible pumping with steady input; chorus depth feels “steppy.”

### Pitfall 3: LFO delay scaling mismatch
**What goes wrong:** Delay modulation depth is too large or too small, producing unnatural warble.
**Why it happens:** `LFO_SIN_DELAY_SCALE` and `LFO_RMP_DELAY_SCALE` are set to 1 (no normalization).
**How to avoid:** Calibrate delay scaling against known FV-1 reference patches and update constants.
**Warning signs:** Modulation depth changes dramatically with program amplitude values.

### Pitfall 4: Missing ramp xfade window
**What goes wrong:** Pitch shift crossfades click or smear when the read pointer wraps.
**Why it happens:** NA-mode CHO crossfade window is not modeled; the simulator blends with a generic window or no window at all.
**How to avoid:** Implement the ramp LFO xfade window as per SpinCAD’s `RampLFO` and use it for NA-mode CHO SOF/RDA.
**Warning signs:** Periodic clicks at pitch shift cycle boundaries; abrupt image “doubling.”

### Pitfall 5: Chorus center too close to delay edges
**What goes wrong:** LFO modulation drives the read pointer out of range or clips the interpolation window.
**Why it happens:** Center tap is placed at the start/end of the delay segment without guard band.
**How to avoid:** Keep center taps within ~5% to ~95% of the allocated delay length (SpinCAD uses 0.05..0.95 range and notes “need to allow 4 phases of LFO”).
**Warning signs:** Sudden pitch jumps near LFO extremes; out-of-range memory access in simulation.

## Broader Fidelity Gaps

This section compares SpinCAD-Designer’s ElmGen simulator behavior to our current implementation across `src/fv1` and `src/audio`.

### Major deltas vs SpinCAD
- **ACC/PACC sample semantics:** SpinCAD updates `PACC` to `ACC` and clears `ACC` after each sample (`SimulatorState.sampleIncrement()`), whereas our interpreter preserves `ACC` across samples (no per-sample clear).
- **Delay RAM compression + LR register:** SpinCAD compresses delay RAM (via `DelayCompressor` in `SimulatorState`) and sets `LR` on each delay read, with WRAP using the LR value; our delay RAM is raw float, and WRAP re-reads the address instead of using a tracked LR.
- **Delay pointer direction + update location:** SpinCAD decrements `delayp` once per sample, with all delay reads/writes offset by `delayp`; our `delayWritePtr` increments only in `renderSimulation` (not in `executeProgram`), and WRAP increments per instruction.
- **RMPA addressing:** SpinCAD RMPA reads `ADDR_PTR >> 8` (see `ReadDelayPointer`), not an LFO-modulated pointer; our RMPA uses a sin/ramp LFO offset from `delayWritePtr`.
- **LFO generation + scaling:** SpinCAD uses recursive fixed-point oscillators (SinLFO) and integer ramp counters (RampLFO), with amplitude scaling via register shifts and a dedicated xfade window; we use `Math.sin` + normalized phase and simplified amplitude scaling, with no ramp xfade, RPTR2, COS, or COMPA handling in CHO.
- **Interpolation behavior:** SpinCAD CHO uses linear interpolation at the CHO instruction with 8-bit SIN and 14-bit RAMP fractional precision; our CHO path uses cubic interpolation and cosine blend on phase.
- **Fixed-point math + bitwise ops:** SpinCAD performs 24-bit saturating integer arithmetic in `Reg`, including sign extension after bitwise ops; our implementation uses float math with saturation but does not quantize/round per instruction and uses truncated int conversions for bitwise ops.
- **LOG/EXP semantics:** SpinCAD LOG returns `log2(|ACC|)/16` with a special-case `ACC==0 → 1.0`; EXP clamps non-negative inputs to max output before scaling/offset. Our LOG/EXP are purely floating-point and do not match these edge behaviors.
- **Input/output scaling & pot cadence:** SpinCAD reads 16-bit PCM and shifts to 24-bit (`AudioFileReader`), with pot registers updated every sample; our render path uses float audio, applies a fixed +6 dB boost in `renderSimulation`, and updates pots every 32 samples.

### Prioritized recommendations
1. **Align sample-loop semantics (P0):** Match SpinCAD’s per-sample lifecycle: set `PACC`, clear `ACC`, and update delay pointer once per sample in both `executeProgram` and `renderSimulation`.
2. **Model delay RAM + LR behavior (P0):** Implement delay RAM compression/expansion and track LR on reads; WRAP should use LR instead of re-reading.
3. **Correct LFO + CHO flags (P0):** Implement COS, COMPA, RPTR2, and NA behaviors in CHO plus ramp xfade window and RAMP `Rptr2` pointer; remove phase-as-sine usage.
4. **Match CHO interpolation (P1):** Replace cubic interpolation in CHO with SpinCAD’s linear two-tap interpolation and fraction widths (8-bit SIN, 14-bit RAMP).
5. **Implement fixed-point quantization (P1):** Introduce per-instruction 24-bit quantization/rounding consistent with `Reg` and use proper sign-extension in bitwise ops.
6. **Match LOG/EXP edge behavior (P1):** Implement SpinCAD’s `ACC==0` LOG behavior and EXP positive-input saturation.
7. **Normalize I/O alignment (P2):** Mirror SpinCAD’s input scaling (16-bit << 8) and avoid the fixed +6 dB boost unless verified against SpinCAD output levels; align POT update cadence with per-sample updates when fidelity is priority.

## Code Examples

### Current CHO Delay Offset (needs correction)
```ts
// Source: src/fv1/instructions/io.ts
const saw = lfoParams.phase;
const delayOffset = (saw * 2 - 1) * lfoParams.amplitude * lfoParams.delayScale * state.choDepth;
```

### SpinCAD CHO Interpolation (reference)
```java
// Source: https://raw.githubusercontent.com/HolyCityAudio/SpinCAD-Designer/master/src/org/andrewkilpatrick/elmGen/instructions/ChorusReadDelay.java
int delayPos = addr + lfoPos;
if(lfo == 0 || lfo == 1) {
  inter = lfoval & 0xff; // 8-bit fraction for SIN
  if(compc) {
    tempReg.mult((255 - inter) << 6);
  } else {
    tempReg.mult(inter << 6);
  }
} else {
  inter = (lfoval & 0x3fff); // 14-bit fraction for RAMP
  if(compc) {
    tempReg.mult((16383 - inter));
  } else {
    tempReg.mult(inter);
  }
}
```

### SpinCAD Pitch Shift Crossfade (reference)
```java
// Source: https://raw.githubusercontent.com/HolyCityAudio/SpinCAD-Designer/master/src/com/holycityaudio/SpinCAD/CADBlocks/PitchShiftFixedCADBlock.java
sfxb.FXchorusReadDelay(lfoFlag, REG | COMPC, "delayd", 0);
sfxb.FXchorusReadDelay(lfoFlag, 0, "delayd+", 1);
sfxb.FXwriteDelay("temp", 0, 0.0);
sfxb.FXchorusReadDelay(lfoFlag, RPTR2 | COMPC, "delayd", 0);
sfxb.FXchorusReadDelay(lfoFlag, RPTR2, "delayd+", 1);
sfxb.chorusScaleOffset(lfoFlag, NA | COMPC, 0);
sfxb.FXchorusReadDelay(lfoFlag, NA, "temp", 0);
```

### Current Interpolated Delay Read
```ts
// Source: src/fv1/instructions/delay.ts
const index = Math.floor(wrapped);
const fraction = wrapped - index;
// 4-point cubic interpolation
return ((a * fraction + b) * fraction + c) * fraction + d;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-tap CHO with blend | Same as old (current) | N/A | Level-modulation artifacts likely remain |
| LFO delay scale = 1 | Same as old (current) | N/A | Mod depth uncalibrated vs hardware |
| Unspecified CHO fraction width | SpinCAD uses 8-bit SIN / 14-bit RAMP | N/A | Fraction precision differs by LFO type |
| No ramp xfade window | SpinCAD uses 1/8-2/8-1/8 window | N/A | Missing window produces pitch shift artifacts |

**Deprecated/outdated:**
- None flagged in repo docs; CHO fidelity remains a known-risk area.

## Open Questions

1. **FV-1 CHO delay scaling constants**
   - What we know: Delay scale constants are placeholders at 1.0.
   - What’s unclear: Exact mapping of WLDS/WLDR amplitude to delay samples.
   - Recommendation: Compare to hardware or trusted corpus and derive constants.

2. **Interpolation method expected by FV-1 CHO/RMPA**
   - What we know: Current implementation uses 4-point cubic.
   - What’s unclear: Whether FV-1 uses linear or higher-order interpolation for CHO/RMPA.
   - Recommendation: Validate against hardware or known reference DSP outputs.

3. **SpinCAD simulator vs FV-1 hardware CHO timing**
   - What we know: SpinCAD uses 8-bit SIN and 14-bit RAMP fractions with a ramp xfade window.
   - What’s unclear: Whether FV-1 hardware matches these exact fraction widths and window shape.
   - Recommendation: Validate with hardware scope traces or known-good recordings; treat SpinCAD as a reference, not ground truth.

4. **SpinCAD delay RAM compression model**
   - What we know: `SimulatorState` calls `DelayCompressor.compress/decompress` for delay RAM storage.
   - What’s unclear: The compression curve and bit depth (source file not present in the repo sources).
   - Recommendation: Extract the class from `elmGen-0.5.jar` or verify against hardware to match delay RAM resolution.

## Sources

### Primary (HIGH confidence)
- `docs/simulation-fidelity.md` - known CHO/LFO fidelity risks and constraints
- `src/fv1/instructions/io.ts` - CHO implementation details
- `src/fv1/instructions/delay.ts` - delay interpolation path
- `src/fv1/interpreter.ts` - LFO phase update
- `src/fv1/constants.ts` - LFO scaling constants

### Secondary (MEDIUM confidence)
- `docs/spinasm-spec.md` - opcode listing and CHO presence (no behavior details)
- https://raw.githubusercontent.com/HolyCityAudio/SpinCAD-Designer/master/src/org/andrewkilpatrick/elmGen/instructions/ChorusReadDelay.java - CHO RDA interpolation logic
- https://raw.githubusercontent.com/HolyCityAudio/SpinCAD-Designer/master/src/org/andrewkilpatrick/elmGen/instructions/ChorusScaleOffset.java - CHO SOF NA crossfade scaling
- https://raw.githubusercontent.com/HolyCityAudio/SpinCAD-Designer/master/src/org/andrewkilpatrick/elmGen/simulator/RampLFO.java - ramp xfade window shape and scaling
- https://raw.githubusercontent.com/HolyCityAudio/SpinCAD-Designer/master/src/org/andrewkilpatrick/elmGen/simulator/SinLFO.java - sin LFO scaling
- https://raw.githubusercontent.com/HolyCityAudio/SpinCAD-Designer/master/src/org/andrewkilpatrick/elmGen/simulator/SimulatorState.java - ACC/PACC lifecycle, delay pointer, delay RAM compression hook
- https://raw.githubusercontent.com/HolyCityAudio/SpinCAD-Designer/master/src/org/andrewkilpatrick/elmGen/simulator/Reg.java - 24-bit fixed-point saturation, bitwise behavior
- https://raw.githubusercontent.com/HolyCityAudio/SpinCAD-Designer/master/src/org/andrewkilpatrick/elmGen/instructions/ReadDelay.java - RDA semantics and delay read path
- https://raw.githubusercontent.com/HolyCityAudio/SpinCAD-Designer/master/src/org/andrewkilpatrick/elmGen/instructions/ReadDelayPointer.java - RMPA uses ADDR_PTR addressing
- https://raw.githubusercontent.com/HolyCityAudio/SpinCAD-Designer/master/src/org/andrewkilpatrick/elmGen/instructions/WriteDelay.java - WRA semantics
- https://raw.githubusercontent.com/HolyCityAudio/SpinCAD-Designer/master/src/org/andrewkilpatrick/elmGen/instructions/WriteAllpass.java - WRAP uses LR value
- https://raw.githubusercontent.com/HolyCityAudio/SpinCAD-Designer/master/src/org/andrewkilpatrick/elmGen/instructions/ReadRegister.java - RDAX behavior via Reg scale
- https://raw.githubusercontent.com/HolyCityAudio/SpinCAD-Designer/master/src/org/andrewkilpatrick/elmGen/instructions/WriteRegister.java - WRAX behavior via Reg scale
- https://raw.githubusercontent.com/HolyCityAudio/SpinCAD-Designer/master/src/org/andrewkilpatrick/elmGen/instructions/ScaleOffset.java - SOF semantics
- https://raw.githubusercontent.com/HolyCityAudio/SpinCAD-Designer/master/src/org/andrewkilpatrick/elmGen/instructions/Log.java - LOG semantics and ACC==0 behavior
- https://raw.githubusercontent.com/HolyCityAudio/SpinCAD-Designer/master/src/org/andrewkilpatrick/elmGen/instructions/Exp.java - EXP saturation behavior
- https://raw.githubusercontent.com/HolyCityAudio/SpinCAD-Designer/master/src/org/andrewkilpatrick/elmGen/instructions/LoadSinLFO.java - WLDS register scaling + jam
- https://raw.githubusercontent.com/HolyCityAudio/SpinCAD-Designer/master/src/org/andrewkilpatrick/elmGen/instructions/LoadRampLFO.java - WLDR register scaling + jam
- https://raw.githubusercontent.com/HolyCityAudio/SpinCAD-Designer/master/src/org/andrewkilpatrick/elmGen/instructions/ChorusInstruction.java - CHO flag handling (COS/COMPA/RPTR2/NA)
- https://raw.githubusercontent.com/HolyCityAudio/SpinCAD-Designer/master/src/org/andrewkilpatrick/elmGen/simulator/AudioFileReader.java - input PCM scaling to 24-bit
- https://raw.githubusercontent.com/HolyCityAudio/SpinCAD-Designer/master/src-gen/com/holycityaudio/SpinCAD/CADBlocks/ChorusCADBlock.java - chorus read pattern
- https://raw.githubusercontent.com/HolyCityAudio/SpinCAD-Designer/master/src/com/holycityaudio/SpinCAD/CADBlocks/PitchShiftFixedCADBlock.java - pitch shift CHO/RPTR2 sequence

### Tertiary (LOW confidence)
- None (no external sources used)

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - includes external SpinCAD reference code
- Architecture: MEDIUM - based on SpinCAD simulator behavior, not hardware-confirmed
- Pitfalls: MEDIUM - consistent with code inspection and SpinCAD behavior

**Research date:** 2026-01-26
**Valid until:** 2026-02-25
