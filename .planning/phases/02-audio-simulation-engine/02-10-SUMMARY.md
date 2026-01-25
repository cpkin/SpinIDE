# Plan 02-10: Diagnostics UI & Human Verification - SUMMARY

**Status:** Partially Complete (UI done, silence issue unresolved)  
**Duration:** ~45 minutes  
**Commits:** 6 commits (1 UI + 5 orchestrator fixes)

---

## Objective

Show render timing and corpus validation status in the diagnostics UI, then run human verification to confirm Phase 2 completion.

---

## Tasks Completed

### Task 1: Show render timing and corpus status in diagnostics UI ✓

**Commit:** bbe49f8

**What was built:**
- SimulationDiagnostics component displays:
  - Last render elapsed time (ms) and duration
  - Performance warnings when renders exceed 2s target
  - Corpus validation pass/fail counts with expandable details
  - "Re-run Validation" button for on-demand testing
  - Error details for failed tests

**Files modified:**
- `src/ui/SimulationDiagnostics.tsx` — Added corpus stats, timing display, expandable results table
- `src/ui/SimulationPanel.tsx` — (No changes needed, already wired)

---

### Orchestrator Corrections (Critical Bug Fixes)

The user reported extensive parser/compiler errors during human verification. The orchestrator identified and fixed 5 critical issues:

#### Fix 1: Equate Symbol Resolution (e6027c3)

**Problem:** All 11 official programs failed with `Invalid register: input`

**Root cause:** `parseRegister()` didn't resolve equates before parsing register names. Programs using `equ input ADCL` then `ldax input` failed because `input` wasn't recognized.

**Solution:**
- Modified `parseRegister()` to accept equates table
- Check equates first, resolve symbolic names before parsing
- Example: `input` → `ADCL` → register index 32

**Files:** `src/fv1/compileProgram.ts`

---

#### Fix 2: Guitar Demo Update (d596301)

**Problem:** User provided real guitar recording for realistic testing

**Solution:**
- Replaced synthetic `guitar.wav` (258KB) with user's `guitar_riff.m4a` (847KB)
- Updated demo description to "Electric guitar recording (real performance)"

**Files:** `public/demos/guitar.m4a`, `src/demos/index.ts`

---

#### Fix 3: Memory Symbol Resolution (1eca900)

**Problem:** 7 programs failed with `Invalid address: delay`

**Root cause:** `parseAddress()` only handled `delay#` (with hash), not bare symbol names

**Solution:**
- Added support for bare memory symbols (e.g., `wra delay,0` without `#`)
- Memory addresses map now uses lowercase keys for case-insensitive lookup
- Added POT0/POT1/POT2 as valid register names (indices 40-42)

**Files:** `src/fv1/compileProgram.ts`

---

#### Fix 4: POT Register Runtime Support (110fb85)

**Problem:** distortion.spn and tremolo.spn failed with `Invalid register: POT0`

**Solution:**
- Added POT0/POT1/POT2 to SPECIAL_REGISTERS (indices 40-42)
- `getRegisterValue()` now returns pot values from `state.pots`
- Enables RDAX/LDAX/MULX with POT operands for gain control

**Files:** `src/fv1/instructions/arithmetic.ts`

---

#### Fix 5: Address Expression Parsing (d213e43)

**Problem:** multitap-delay and pitch-shift failed with `Invalid address: delay+4096`

**Root cause:** Parser expected `delay#+4096` but programs used `delay+4096` (no hash)

**Solution:**
- Added regex pattern for expressions without `#` separator
- Both `delay#+100` and `delay+100` now supported

**Files:** `src/fv1/compileProgram.ts`

---

#### Fix 6: Audio Playback for Debugging (28d9da6)

**Problem:** User needs to hear test outputs to diagnose silence issue

**Solution:**
- Added `renderedBuffer` field to `CorpusTestResult`
- Added play/stop buttons (▶/⏹) in corpus results table
- Users can click to hear each test's rendered output

**Files:** `src/fv1/validation/corpusRunner.ts`, `src/ui/SimulationDiagnostics.tsx`

---

## Critical Unresolved Issue: Programs Producing Silence

**Status:** All 11 programs compile successfully but produce 0.0000 output

**Symptoms:**
- All programs parse without errors ✓
- All programs compile without errors ✓
- All programs run without exceptions ✓
- BUT: All programs output Peak=0.0000, RMS=0.0000

**Investigation:**
- Input generation verified (500ms impulse + 440Hz sine, amplitude 0.3)
- LDAX implementation verified (reads from `state.adcL/adcR`)
- WRAX implementation verified (writes ACC to DAC registers)
- Instruction handlers properly registered
- mapInputToADC() correctly maps inputs to ADC registers

**Hypothesis:**
Likely one of:
1. Interpreter not calling handlers correctly
2. State not being passed/mutated properly
3. Output collection reading wrong values
4. Instructions being replaced with NOPs somewhere

**Next steps:**
- Add debug logging to interpreter execution loop
- Manually step through basic-delay with test input
- Check if cached instructions (02-09 optimization) broke execution
- Verify handler function signatures match expectations

---

## Key Decisions

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Equate resolution at compile time | Compiler has full symbol table context | Enables symbolic register/memory names |
| POT registers as special indices 40-42 | Consistent with ADC/DAC/LFO pattern | Runtime pot value lookup works like other specials |
| Support both `label#` and `label` syntax | Official programs use inconsistent formats | Parser handles real-world code variations |
| Add audio playback to test results | Critical for debugging silence issues | Users can hear actual vs. expected output |

---

## Success Criteria

- [x] Diagnostics panel shows render timing and performance warnings
- [x] Official corpus results visible with pass/fail status
- [x] All 11 programs parse and compile successfully
- [ ] Human verification confirms performance and corpus status (BLOCKED by silence issue)

---

## Verification

**Automated:**
- `npm run typecheck` — All type checks pass ✓

**Manual:**
- Corpus validation runs on page load ✓
- All 11 programs compile without errors ✓
- Play buttons render in corpus table ✓
- **Silence issue prevents full verification** ⚠

---

## Next Steps

1. **Debug silence issue:**
   - Add console.log to interpreter loop showing ACC values
   - Check if optimization pass broke execution
   - Verify handler functions are actually being called

2. **Once silence fixed:**
   - Re-run corpus validation
   - Verify all 11 programs produce audible output
   - Check performance meets <2s target
   - Complete human verification checkpoint

3. **Complete Phase 2:**
   - Run phase verifier
   - Update STATE.md
   - Create Phase 2 VERIFICATION.md

---

*Plan execution: 2026-01-25*  
*Orchestrator: execute-phase workflow*
