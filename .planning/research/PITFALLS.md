# Pitfalls Research: Browser-Based FV-1 Audio DSP Simulator

**Domain:** Web-based audio DSP simulation, FV-1 hardware emulation, code validation tools
**Researched:** 2026-01-22
**Confidence:** MEDIUM-HIGH

This document catalogs common mistakes in browser-based audio DSP simulation and FV-1-specific validation tools. Each pitfall includes prevention strategies and phase mapping for roadmap integration.

---

## Critical Pitfalls

### Pitfall 1: Fixed-Point Math Emulation Errors in JavaScript Floats

**What goes wrong:**
The FV-1 uses 1.23 fixed-point arithmetic (1 sign bit, 23 fractional bits) while JavaScript uses IEEE 754 double-precision floats. Direct translation without proper scaling causes:
- Accumulation errors in feedback loops (exponential drift)
- Incorrect overflow/saturation behavior (FV-1 wraps, floats don't)
- Subtle precision loss in multiply-accumulate operations
- Wrong results for bit-manipulation instructions (AND, OR, XOR)

Example: FV-1 `mulx` instruction multiplies and preserves fixed-point scaling. In JavaScript, `a * b` loses the implicit 1.0 = 2^23 scaling, causing 2^23x gain error if not rescaled.

**Why it happens:**
Developers assume floating-point is "more accurate" and forget that FV-1's fixed-point has specific wrap/saturation semantics. Many tutorials on Web Audio API don't cover fixed-point emulation.

**How to avoid:**
1. Create explicit fixed-point number class or helper functions:
   ```javascript
   // Represent FV-1 S1.23 format
   const FV1_SCALE = 2**23;
   const FV1_MAX = 2**23 - 1;
   const FV1_MIN = -(2**23);
   
   function fv1_multiply(a, b) {
     // FV-1 multiplies two S1.23 numbers, result is S2.46, then saturates to S1.23
     let result = (a * b) / FV1_SCALE;
     return Math.max(FV1_MIN, Math.min(FV1_MAX, Math.floor(result)));
   }
   ```

2. Test against official Spin demo programs with known outputs
3. Document deviations clearly (e.g., "rounding behavior differs slightly from hardware")
4. Use integers internally for delay RAM addressing (no fractional sample positions)

**Warning signs:**
- Delay effects sound "swirly" or unstable over time (accumulation error)
- Clipping sounds different from hardware (wrong saturation)
- Feedback loops diverge after several seconds
- Bit-manipulation effects produce garbage audio

**Phase to address:**
**Phase 1 (MVP)** - Core simulation must handle fixed-point correctly from day one. Defer bit-perfect matching to Phase 2, but get scaling and saturation fundamentally right.

---

### Pitfall 2: Sample Rate Conversion Artifacts

**What goes wrong:**
Browser audio contexts typically run at 44.1kHz or 48kHz, but FV-1 runs at 32kHz. Naive resampling causes:
- Audible aliasing in high-frequency content
- Phase distortion in time-domain effects (delays, flangers)
- "Metallic" quality in reverbs and feedback loops
- Incorrect delay times (e.g., 1000 samples @ 44.1kHz ≠ 1000 samples @ 32kHz)

**Why it happens:**
Using browser's default sample rate "because it's easier" without proper resampling. The Web Audio API's OfflineAudioContext doesn't force sample rate matching.

**How to avoid:**
1. **Always render at 32kHz** using `OfflineAudioContext(channels, length, 32000)`
2. Resample input audio to 32kHz BEFORE simulation:
   ```javascript
   // Use AudioContext.createAudioBuffer or offline context resampling
   const resampledBuffer = await resampleTo32k(inputBuffer);
   ```
3. Use high-quality resampling (linear minimum, prefer sinc/lanczos for offline)
4. For playback, let browser upsample 32kHz → native rate (less critical)
5. Document in UI: "All simulation at FV-1 native 32kHz"

**Warning signs:**
- Delay times sound "wrong" when compared to hardware
- High-hat cymbals or sibilance sound harsh/aliased
- Frequency analysis shows unexpected harmonics above 16kHz
- Users report "doesn't match my pedal" for known programs

**Phase to address:**
**Phase 1 (MVP)** - Must be correct from launch. This is part of "gross correctness" threshold.

---

### Pitfall 3: Block-Based Processing Timing Errors

**What goes wrong:**
FV-1 processes audio in 32-sample blocks with specific timing/latency characteristics. Sample-by-sample simulation causes:
- Incorrect interaction between LFOs and audio rate processing
- Wrong modulation timing (POT changes applied at wrong block boundaries)
- Performance issues (32x slower than block processing)
- Subtle differences in filter state updates

**Why it happens:**
Web Audio API works sample-by-sample in AudioWorklet. Developers simulate the same way without considering FV-1's block structure.

**How to avoid:**
1. Process audio in 32-sample blocks:
   ```javascript
   const BLOCK_SIZE = 32;
   for (let block = 0; block < totalBlocks; block++) {
     // Update POT values once per block
     const pot0 = getPotValue(0, blockTime);
     
     // Process 32 samples with same POT value
     for (let i = 0; i < BLOCK_SIZE; i++) {
       const sample = block * BLOCK_SIZE + i;
       output[sample] = processSample(input[sample], pot0);
     }
   }
   ```

2. Update POT values only at block boundaries
3. Maintain per-block state (don't leak sample-level state across blocks)
4. Note: LFOs in FV-1 are per-sample, not per-block (this is an exception)

**Warning signs:**
- Modulation effects sound "steppy" or wrong tempo
- POT sweeps don't match hardware timing
- Performance is unexpectedly slow (32x slower than block processing)
- Tremolo/vibrato rate calculations are off

**Phase to address:**
**Phase 1 (MVP)** - Block processing is part of core architecture. Get it right early or face rewrite.

---

### Pitfall 4: Parser Robustness vs. Real-World SpinASM Code

**What goes wrong:**
Parsers fail on valid but uncommon SpinASM syntax:
- Comments in unexpected places (mid-line, after labels)
- Inconsistent whitespace (tabs vs spaces, mixed)
- Case sensitivity variations (official assembler is case-insensitive)
- Undocumented mnemonics or pseudo-ops used in legacy code
- Missing semicolons or extra semicolons
- Windows vs Unix line endings (CRLF vs LF)

Real-world .spn files from SpinCAD export contain quirks the spec doesn't mention.

**Why it happens:**
Parser built from official instruction set spec without testing against corpus of real user programs. "Reference implementation parity" assumed but not verified.

**How to avoid:**
1. **Build test corpus in Phase 0** from:
   - All official Spin demo programs
   - SpinCAD default patches
   - Forum-shared .spn files (with permission)
   - Known problematic examples (comment edge cases)

2. Parse permissively:
   - Strip comments early (handles mid-line comments)
   - Normalize whitespace
   - Case-insensitive instruction matching
   - Tolerate missing/extra semicolons
   - Handle both CRLF and LF line endings

3. Error messages must show context:
   ```
   Line 47: Invalid instruction 'war'
   |  45:   rdax pot0, 0.5
   |  46:   mulx pot1
   → 47:   war delay1, 0.0
   |  48:   rdax pot2, 1.0
   Did you mean: 'wra' (write delay address)?
   ```

4. Test parser with corpus on every change

**Warning signs:**
- Users report "valid code fails to parse"
- SpinCAD exports don't validate
- Forum complaints: "works in SpinASM, fails in SpinGPT"
- Parser errors with no line context

**Phase to address:**
**Phase 0** (test corpus creation) and **Phase 1** (parser implementation with corpus tests)

---

### Pitfall 5: Delay RAM Addressing Out-of-Bounds

**What goes wrong:**
FV-1 has 32K delay RAM (32,768 samples = 1024ms @ 32kHz). Off-by-one errors or incorrect address wrapping cause:
- Segfaults or undefined behavior in JavaScript
- Reading/writing wrong memory addresses
- Delay taps in wrong positions
- Feedback loops accessing garbage data
- Clicks and pops at block boundaries

Common error: Using address `32768` when max valid address is `32767`.

**Why it happens:**
- Confusion between "32K RAM" (capacity) and "0-32767" (valid addresses)
- Modulo arithmetic wrong (using 32768 instead of 32767 as mask)
- Not validating delay line lengths from `mem` declarations
- Fractional delay interpolation errors

**How to avoid:**
1. **Validate all memory declarations during parse:**
   ```javascript
   // Parse: mem delay1 4096
   if (delay1_size > 32767) {
     error("Delay length exceeds 32K RAM");
   }
   totalRamUsed += delay1_size;
   if (totalRamUsed > 32767) {
     error("Total delay RAM usage exceeds 32K");
   }
   ```

2. **Bounds-check all delay operations:**
   ```javascript
   function readDelayAddress(delayName, offset) {
     const baseAddr = delays[delayName].baseAddr;
     const size = delays[delayName].size;
     const addr = (baseAddr + offset) % size; // Wrap within delay
     if (addr < 0 || addr >= 32768) {
       throw new Error(`Delay address out of bounds: ${addr}`);
     }
     return delayRAM[addr];
   }
   ```

3. **Lint rule: Warn on suspicious delay lengths**
   - Warn if delay > 16K (very long, likely typo)
   - Error if delay + offset > 32K at any instruction

4. Use TypedArray with fixed size for delay RAM (prevents accidental expansion)

**Warning signs:**
- Crashes during simulation
- Delays sound wrong (tap positions incorrect)
- Intermittent clicks/pops
- Resource meter shows >32K RAM but simulation "works"

**Phase to address:**
**Phase 1 (MVP)** - Resource validation and bounds checking are table stakes for trustworthy tool.

---

### Pitfall 6: Ambiguous Error States (Simulation vs. Validation vs. Resource Limits)

**What goes wrong:**
User sees error but can't tell if:
- Code syntax is invalid (won't assemble)
- Code is valid but exceeds resource limits (128 instructions, 32K RAM)
- Code is valid but simulation failed (divide by zero, instability)
- Audio processing succeeded but output is silent (legitimate bug in code)

Example: "Simulation failed" - is this a tool bug or user's code bug?

**Why it happens:**
Poor error taxonomy. All failures lumped into generic "Error" category. No distinction between tool failures (our bug) and user code issues (their bug).

**How to avoid:**
1. **Three-tier error system:**
   - **VALIDATION ERROR**: Syntax/semantic errors preventing parsing
     - Red, blocks simulation
     - "Line 23: Unknown instruction 'foo'"
   
   - **RESOURCE WARNING**: Code is valid but exceeds limits
     - Orange, blocks simulation
     - "Instruction count: 142/128 (14 over limit)"
   
   - **SIMULATION WARNING**: Code is valid, simulation ran, but output is suspicious
     - Yellow, does NOT block (user decides)
     - "Warning: No output detected (dacl/dacr never written)"
     - "Warning: Possible instability detected (10dB gain increase over time)"

2. **Explicit simulation health checks:**
   ```javascript
   function validateSimulationOutput(outputBuffer) {
     const warnings = [];
     
     // Check for silence
     if (isAllZeros(outputBuffer)) {
       warnings.push({
         type: 'SIMULATION_WARNING',
         message: 'Output is silent (0.0 throughout)',
         suggestion: 'Verify dacl/dacr are written'
       });
     }
     
     // Check for DC offset
     const dcOffset = calculateMean(outputBuffer);
     if (Math.abs(dcOffset) > 0.1) {
       warnings.push({
         type: 'SIMULATION_WARNING',
         message: `DC offset detected: ${dcOffset.toFixed(3)}`,
         suggestion: 'Add highpass filter or check for accumulation bug'
       });
     }
     
     // Check for clipping
     if (hasClipping(outputBuffer)) {
       warnings.push({
         type: 'SIMULATION_WARNING',
         message: 'Output is clipping (>1.0 or <-1.0)',
         suggestion: 'Reduce gain or add limiting'
       });
     }
     
     return warnings;
   }
   ```

3. **UI clearly separates categories:**
   - Red "Validation Errors" section (must fix to simulate)
   - Orange "Resource Limits" section (must fix to build)
   - Yellow "Simulation Warnings" section (review recommended)

**Warning signs:**
- Users ask "is this a bug in the tool or my code?"
- Forum posts: "SpinGPT says error but don't know what to fix"
- Silent output treated as success
- No distinction between tool crash and user code instability

**Phase to address:**
**Phase 1 (MVP)** - Error taxonomy is critical for UX. Users must trust the tool to guide them.

---

### Pitfall 7: Metadata Schema Changes Break AI-Generated Code

**What goes wrong:**
Metadata schema evolves (v1 → v2 → v3). AI agents trained on v1 examples generate stale metadata:
- Parser rejects old metadata format
- Diagram rendering breaks on legacy files
- AI agents get confused by version mismatches
- Users can't mix old and new code in same project

**Why it happens:**
No versioning discipline. Schema changes made ad-hoc without backward compatibility plan. AI examples not updated when schema changes.

**How to avoid:**
1. **Strict semantic versioning for metadata:**
   ```
   ;@fx v2
   ;@name: "My Effect"
   ```
   - v1: Original format (parse and convert to v2 internally)
   - v2: Current format (strict validation)
   - v3: Future additions (plan deprecation path)

2. **Backward compatibility layer:**
   ```javascript
   function parseMetadata(source) {
     const version = detectMetadataVersion(source);
     
     if (version === 1) {
       // Convert v1 to v2 format
       return convertV1ToV2(parseV1Metadata(source));
     }
     
     if (version === 2) {
       return parseV2Metadata(source);
     }
     
     throw new Error(`Unknown metadata version: ${version}`);
   }
   ```

3. **Tool supports latest + one previous version**
   - v2 ships: Support v1 and v2
   - v3 ships: Support v2 and v3 (drop v1 with clear migration guide)

4. **Agent prompt file versioned with schema:**
   ```markdown
   # Agent Prompt v2.0 (for metadata schema v2)
   Last updated: 2026-01-15
   
   Metadata format:
   ;@fx v2
   ;@name: "Effect Name"
   ...
   
   Breaking changes from v1:
   - Renamed `@io` to `@io_mode`
   - Added `@version` field
   ```

5. **Lint warning for old metadata:**
   ```
   Warning: Using metadata v1 (deprecated).
   This still works but v2 is recommended.
   See: https://github.com/you/spingpt/docs/metadata-v2-migration.md
   ```

**Warning signs:**
- AI generates code that fails validation
- Forum complaints: "code worked yesterday, broken today"
- Users manually fix AI-generated metadata every time
- Old .spn files from forum posts don't load

**Phase to address:**
**Phase 0** (lock schema v1) and **Phase 1** (implement versioning + parsing with forward compatibility)

---

### Pitfall 8: Slow Re-Render on Knob Changes

**What goes wrong:**
Target: <2 seconds for 30s audio re-render when POT value changes.
Reality: 10+ seconds, user abandons tool.

Causes:
- Re-parsing source code on every knob change
- Re-initializing entire simulation state
- No caching of parsed AST or delay line allocations
- Inefficient instruction interpreter (no JIT or optimization)
- Blocking UI thread during render

**Why it happens:**
"Make it work, then make it fast" philosophy applied too late. Performance not measured until Phase 2.

**How to avoid:**
1. **Cache parsed program:**
   ```javascript
   let cachedProgram = null;
   let cachedSource = null;
   
   function onKnobChange(knobId, value) {
     // Only parse if source changed
     if (source !== cachedSource) {
       cachedProgram = parseSpinASM(source);
       cachedSource = source;
     }
     
     // Run simulation with new POT value
     const output = simulate(cachedProgram, input, { [knobId]: value });
     updateUI(output);
   }
   ```

2. **Separate parse and simulate phases:**
   - Parse: Once per source change (slow, acceptable)
   - Simulate: Once per POT change (must be fast)

3. **Optimize inner loop (runs billions of times):**
   - Pre-compile instruction dispatch (switch → jump table)
   - Avoid object allocations in sample loop
   - Use TypedArrays for audio buffers
   - Consider WebAssembly for interpreter core (Phase 2)

4. **Show progress immediately:**
   ```javascript
   async function simulateWithProgress(program, input, pots) {
     const totalBlocks = Math.ceil(input.length / 32);
     
     for (let block = 0; block < totalBlocks; block++) {
       await processBlock(program, input, block, pots);
       
       // Update progress every 1000 blocks (~1 second of audio)
       if (block % 1000 === 0) {
         updateProgress(block / totalBlocks);
         await nextAnimationFrame(); // Yield to UI
       }
     }
   }
   ```

5. **Measure performance in Phase 1:**
   - Instrument simulation loop
   - Target: 30s audio in <2s wall-clock time
   - Fail build if regression detected

**Warning signs:**
- Knob changes feel laggy (>1s to start rendering)
- Progress bar freezes
- UI becomes unresponsive during simulation
- Users complain about "waiting forever"

**Phase to address:**
**Phase 1 (MVP)** - Performance target is in acceptance criteria. Measure early, optimize before launch.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip fixed-point, use floats directly | Simpler code, faster development | Accumulation errors, wrong saturation, user distrust | **Never** - core correctness issue |
| Parse source on every knob change | Simpler state management | 10x slower re-renders, poor UX | Only for Phase 0 prototype, not MVP |
| Sample-by-sample processing (not 32-sample blocks) | Easier to understand | 32x slower, wrong timing behavior | Only during initial research/learning |
| Generic "Error" messages | Faster to implement | Users can't debug, forum support load | Only in Phase 0 prototype |
| No metadata versioning | Faster initial implementation | Breaking changes break AI agents and users | Only if committed to never changing schema (unrealistic) |
| Hardcode 44.1kHz, downsample from FV-1 32kHz output | Match browser defaults | Wrong delay times, aliasing artifacts | **Never** - breaks core promise |
| No delay RAM bounds checking | Faster simulation | Crashes, wrong audio, user data loss | Only if memory safety verified elsewhere (e.g., WASM sandbox) |
| No simulation health checks (silence, DC, clipping) | Simpler code | Silent bugs go unnoticed, user blames tool | Acceptable for Phase 0, must fix for MVP |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Re-parsing AST on every render | Re-render takes 5-10s | Cache parsed program, only re-simulate | >10s audio with knob changes |
| Object allocations in sample loop | Garbage collection pauses, jank | Use TypedArrays, pre-allocate buffers | Any production use |
| Blocking UI thread | Browser "page unresponsive" warning | Use Web Workers or chunked async rendering | >5s renders |
| Naive string concatenation in error messages | Parser slows down with many errors | Build error array, join at end | Files with >50 errors |
| No memoization of expensive operations (e.g., LFO tables) | CPU pegged, slow renders | Pre-compute and cache static tables | Any oscillator-heavy effect |
| No bounds checking on delay reads (causes array resizing) | Memory leak, slowdown over time | Use fixed-size TypedArrays | Long audio files (>30s) |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Silent output treated as success | "Tool is broken" (actually their code bug) | Detect silence, show warning with debug hints |
| No distinction between validation and simulation errors | Confusion: "What do I fix?" | Separate: RED (won't parse), ORANGE (exceeds limits), YELLOW (simulation concern) |
| Knob range 0.0–1.0 instead of 0–11 | Cognitive mismatch with hardware pedals | Match hardware: 0–11 scale, document conversion |
| No progress bar for long renders | "Is it frozen?" (user force-quits browser) | Show progress for >2s renders, allow cancel |
| Error message: "Instruction 47 failed" (no code context) | User must manually count lines | Show ±2 lines context, highlight error line |
| Diagram fails → entire tool breaks | Diagram bug prevents simulation | Graceful degradation: warn about diagram, rest works |
| No "copy errors" button | User manually re-types errors for AI | One-click copy formatted for LLM context |
| Assume metadata present | Tool breaks on legacy .spn files | Metadata enhances but doesn't gate functionality |

---

## "Looks Done But Isn't" Checklist

- [ ] **Simulation**: Output waveform displays → Verify not all zeros, not clipping, not DC offset
- [ ] **Parser**: Test files validate → Test against corpus of real-world .spn files (SpinCAD exports, forum examples)
- [ ] **Fixed-point math**: Floats used → Verify multiply scaling, saturation, and overflow behavior match FV-1
- [ ] **Sample rate**: Audio plays → Verify rendered at 32kHz, not browser default (check delay times)
- [ ] **Error messages**: Errors shown → Verify line context shown, categorized (validation/resource/simulation)
- [ ] **Metadata schema**: Parser handles v1 → Verify backward compatibility, versioning discipline
- [ ] **Performance**: Simulation completes → Measure wall-clock time for 30s audio (<2s target)
- [ ] **Resource limits**: Instruction counter shown → Verify counts from parsed source, not simulation runtime
- [ ] **Delay RAM**: Long delays work → Verify bounds checking, wrap behavior, total RAM accounting
- [ ] **Block processing**: Modulation sounds right → Verify 32-sample blocks, POT updates at boundaries

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Fixed-point math wrong | **HIGH** (rewrite interpreter core) | 1. Build test harness with known I/O pairs from hardware<br>2. Rewrite math operations one-by-one with tests<br>3. Regression test entire corpus<br>4. Document remaining deviations |
| Sample rate mismatch | **MEDIUM** (add resampling layer) | 1. Implement 32kHz OfflineAudioContext<br>2. Add input resampler (use existing library)<br>3. Update UI documentation<br>4. Test delay time accuracy |
| No block processing | **HIGH** (architectural rewrite) | 1. Refactor sample loop to block loop<br>2. Update POT value handling<br>3. Regression test modulation effects<br>4. Performance benchmarks |
| Parser too strict | **LOW** (relax rules) | 1. Add test for failing file<br>2. Adjust parser rules<br>3. Verify doesn't break existing tests |
| Metadata schema v1 breaks AI | **MEDIUM** (add versioning + converter) | 1. Implement version detection<br>2. Write v1→v2 converter<br>3. Update agent prompt with v2 examples<br>4. Add lint warning for v1 usage |
| Slow re-render | **MEDIUM** (optimize, add caching) | 1. Profile simulation loop<br>2. Cache parsed AST<br>3. Optimize inner loop (TypedArrays)<br>4. Add progress indicator |
| Ambiguous errors | **LOW** (improve messages) | 1. Categorize errors (validation/resource/simulation)<br>2. Add line context<br>3. Add "copy all errors" button<br>4. Update UI with color coding |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Fixed-point math errors | **Phase 1** | Test against official Spin demos; hardware A/B comparison |
| Sample rate conversion artifacts | **Phase 1** | Delay time measurements; spectral analysis |
| Block processing timing errors | **Phase 1** | Compare modulation timing to hardware |
| Parser robustness | **Phase 0** (corpus) + **Phase 1** (implementation) | Parse all corpus files without errors |
| Delay RAM out-of-bounds | **Phase 1** | Resource validation tests; bounds checking asserts |
| Ambiguous error states | **Phase 1** | User testing: "What does this error mean?" |
| Metadata schema breaking changes | **Phase 0** (lock v1) + **Phase 1** (versioning) | Load legacy files; AI-generated code validates |
| Slow re-render | **Phase 1** | Performance benchmarks: 30s audio in <2s |

---

## Validation Test Corpus (Phase 0 Deliverable)

Create `.planning/test-corpus/` directory with:

1. **Official Spin Demo Programs** (10-15 programs)
   - From Spin Semiconductor application notes
   - Known-good reference implementations
   - Cover: delays, filters, reverb, modulation, pitch shift

2. **SpinCAD Default Patches** (5-10 programs)
   - Export from SpinCAD Designer
   - Real-world formatting quirks
   - Test metadata parsing

3. **Edge Cases** (5-10 programs)
   - Comments in unusual places
   - Maximum instruction count (128)
   - Maximum RAM usage (32K)
   - Nested macros (if supported)
   - Empty programs
   - Programs with no outputs
   - Programs with only outputs (no processing)

4. **Known Problematic Examples** (5-10 programs)
   - From forum posts ("SpinASM accepts this, why doesn't X?")
   - Unusual whitespace
   - Legacy syntax variations
   - Missing metadata (verify graceful degradation)

Each program includes:
- `.spn` source file
- `README.md` documenting what it tests
- Expected output (if simulation reference available)
- Known issues or deviations

**Acceptance:** Parser handles 100% of corpus without crashes. Simulation runs on 95%+ (some legacy programs may use unsupported features).

---

## Simulation Fidelity Trade-offs

**"Gross correctness" bar means:**

✅ **Must catch these bugs:**
- Wrong delay length (500 samples vs 5000)
- Unstable feedback (exponential growth)
- Silent output (forgot to write DAC)
- Extreme clipping (gain >10x without saturation)
- Wrong delay tap position (reversed stereo)
- POT not connected (dead knob)
- Out-of-bounds memory access

❌ **Acceptable deviations (document clearly):**
- Saturation curve shape (not bit-identical to hardware)
- Filter coefficient rounding (within 0.1% frequency)
- LFO phase at startup (may differ by <1 sample)
- Noise floor (hardware has ADC noise, simulation is clean)
- Power-on state (hardware undefined, simulation zeros)

📊 **Validation strategy:**
1. A/B test with hardware using official Spin demos
2. Document measured differences in `docs/SIMULATION_ACCURACY.md`
3. Add known deviations to user-visible help text
4. Phase 2: Improve fidelity based on user feedback

---

## Sources

**Researched:**
- MDN Web Audio API documentation (2026-01-22)
  - https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques
  - Confidence: HIGH (official spec)

- Web Audio API 1.1 Specification (W3C Editor's Draft, 2026-01-20)
  - https://webaudio.github.io/web-audio-api/
  - Confidence: HIGH (authoritative standard)

- Fixed-Point Arithmetic (Wikipedia, accessed 2026-01-22)
  - https://en.wikipedia.org/wiki/Fixed-point_arithmetic
  - Confidence: MEDIUM-HIGH (general CS knowledge)

- FV-1 GitHub projects (hires/ElmGen simulator)
  - https://github.com/search?q=FV-1+simulator
  - Confidence: MEDIUM (community projects, limited documentation)

**Inferred from domain knowledge:**
- Sample rate conversion best practices (audio DSP standard knowledge)
- Parser robustness issues (common in domain-specific language tooling)
- Web Audio API performance characteristics (browser implementation experience)
- Metadata versioning patterns (software engineering best practices)

**Confidence assessment:**
- Fixed-point math emulation: HIGH (well-documented problem in DSP)
- Sample rate conversion: HIGH (standard audio processing concern)
- Block processing: MEDIUM-HIGH (FV-1 specific, less documented online)
- Parser robustness: HIGH (general compiler/interpreter knowledge)
- Performance optimization: MEDIUM (depends on browser, hardware)
- Metadata versioning: HIGH (standard software engineering)

**Gaps requiring Phase 0/1 validation:**
- Exact FV-1 instruction behavior (need hardware testing)
- SpinCAD export format quirks (need real files)
- Community expectations for "gross correctness" (need user feedback)
- Performance bottlenecks in browser (need profiling)

---

*Pitfalls research for: Browser-based FV-1 audio DSP simulator*  
*Researched: 2026-01-22*  
*Next: Use this to inform Phase 0 (test corpus) and Phase 1 (MVP) planning*
