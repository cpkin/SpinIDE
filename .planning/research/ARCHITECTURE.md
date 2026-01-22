# Architecture Patterns: Web-Based FV-1 Audio Simulation Tool

**Domain:** Browser-based audio processing, code validation, and DSP simulation  
**Researched:** 2026-01-22  
**Confidence:** HIGH

## Recommended Architecture

### System Overview

SpinGPT should follow a **modular, event-driven architecture** with clear separation between parsing, simulation, audio rendering, and UI components. The architecture prioritizes:

1. **Offline audio rendering** (not real-time) using Web Audio API's OfflineAudioContext
2. **Immutable state** for code, parsed AST, and simulation results
3. **Lazy computation** - only re-render what changed (knobs vs. code)
4. **Web Workers** for CPU-intensive tasks (parsing, simulation)
5. **Static hosting** with no server dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                        MAIN THREAD                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │  UI Layer    │◄─────┤ State Store  │                    │
│  │              │      │              │                    │
│  │ - Editor     │      │ - source     │                    │
│  │ - Knobs      │      │ - AST        │                    │
│  │ - Waveform   │      │ - potValues  │                    │
│  │ - Diagram    │      │ - audioData  │                    │
│  │ - Meters     │      │ - metadata   │                    │
│  └──────┬───────┘      └──────┬───────┘                    │
│         │                     │                            │
│         │  Events             │  State Updates             │
│         │                     │                            │
│  ┌──────▼──────────────────────▼───────┐                   │
│  │      Controller/Orchestrator        │                   │
│  │                                     │                   │
│  │ - Route user actions                │                   │
│  │ - Coordinate workers                │                   │
│  │ - Manage render queue               │                   │
│  └──────┬──────────────────────────────┘                   │
│         │                                                  │
└─────────┼──────────────────────────────────────────────────┘
          │
          │ postMessage
          │
┌─────────▼──────────────────────────────────────────────────┐
│                    WORKER THREADS                          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────┐        ┌──────────────────────┐      │
│  │  Parser Worker  │        │  Simulator Worker    │      │
│  │                 │        │                      │      │
│  │ - Tokenize      │        │ - Load AudioBuffer   │      │
│  │ - Parse AST     │        │ - Create             │      │
│  │ - Validate      │        │   OfflineAudioContext│      │
│  │ - Extract       │        │ - Interpret FV-1     │      │
│  │   metadata      │        │   instructions       │      │
│  │ - Compute       │        │ - Process 32-sample  │      │
│  │   resources     │        │   blocks @ 32kHz     │      │
│  │                 │        │ - Apply pot values   │      │
│  └─────────────────┘        │ - Render to buffer   │      │
│                             └──────────────────────┘      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Component Boundaries

| Component | Responsibility | Inputs | Outputs | Communicates With |
|-----------|---------------|--------|---------|-------------------|
| **CodeEditor** | Syntax highlighting, editing | User text input, syntax rules | source code string | StateStore, Controller |
| **Parser** | AST generation, validation | source string | AST, errors, warnings, resource counts | Controller (via Worker) |
| **Simulator** | FV-1 instruction interpreter | AST, AudioBuffer, pot values | Rendered AudioBuffer | Controller (via Worker) |
| **AudioPipeline** | Load, resample, playback | File upload, AudioBuffer | Resampled @ 32kHz, playback controls | Simulator, UI |
| **KnobController** | Pot value management | Mouse/touch input | pot0/1/2 values (0-1023) | StateStore, Controller |
| **WaveformView** | Audio visualization | AudioBuffer | Canvas rendering | AudioPipeline |
| **DiagramView** | Signal path visualization | Metadata | SVG/Canvas graph | Parser metadata |
| **ResourceMeters** | Usage visualization | Instruction count, RAM | Visual meters | Parser results |
| **StateStore** | Centralized state | Actions from all components | State updates | All components |
| **Controller** | Orchestration | User events, state changes | Worker messages, state updates | All |

---

## Data Flow

### Primary Flow: Code → Parse → Simulate → Audio

```
1. USER EDITS CODE
   └─► CodeEditor.onChange()
       └─► Controller.updateSource(sourceCode)
           └─► StateStore.setState({ source: sourceCode })
               └─► Controller.triggerParse()
                   └─► ParserWorker.postMessage({ source })
                       └─► ParserWorker: tokenize → parse → validate
                           └─► ParserWorker.postMessage({
                                   ast, errors, warnings, resources, metadata
                               })
                               └─► Controller.onParseComplete()
                                   └─► StateStore.setState({
                                           ast, errors, warnings, ...
                                       })
                                       └─► UI updates (errors, meters, diagram)
                                       └─► Controller.triggerRender()

2. TRIGGER RENDER (on code change OR knob change)
   └─► Controller.triggerRender()
       ├─► Check if AST valid
       │   └─► If invalid: abort
       ├─► Check what changed:
       │   ├─► Code changed: Full re-parse + re-render
       │   └─► Knob changed: Re-render ONLY (reuse AST)
       └─► SimulatorWorker.postMessage({
               ast,
               audioBuffer: stateStore.inputAudio,
               potValues: stateStore.potValues
           })
           └─► SimulatorWorker:
               ├─► Create OfflineAudioContext
               ├─► Iterate 32-sample blocks
               ├─► Interpret FV-1 instructions
               └─► Apply pot values per instruction
                   └─► SimulatorWorker.postMessage({
                           renderedBuffer: AudioBuffer
                       })
                       └─► Controller.onRenderComplete()
                           └─► StateStore.setState({
                                   outputAudio: renderedBuffer
                               })
                               └─► WaveformView.update()
                               └─► AudioPlayer.load(renderedBuffer)

3. USER ADJUSTS KNOB
   └─► KnobController.onChange(pot2, newValue)
       └─► StateStore.setState({ potValues: {...} })
           └─► Controller.triggerRender()  // FAST PATH: reuse AST
```

### Secondary Flows

**Audio Upload:**
```
File Input → AudioPipeline.load()
    → Decode via AudioContext.decodeAudioData()
    → Resample to 32kHz
    → Store in StateStore.inputAudio
    → Trigger render
```

**Metadata Extraction:**
```
Parse complete → Extract metadata from AST
    → Validate metadata schema
    → DiagramView.render(metadata)
    → UI.setLabels(metadata.potLabels)
```

**Export:**
```
Export button → StateStore.outputAudio
    → WAV: PCM encoding
    → MP3: Web Audio Recorder (or similar)
    → Download trigger
```

**Share URL:**
```
Share button → StateStore.source + potValues
    → Compress (LZ-string or similar)
    → Base64 encode
    → Set window.location.hash
    → Copy to clipboard
```

---

## State Management Strategy

### Centralized State Store (Immutable)

Use a **single source of truth** pattern with immutable updates. This enables:
- Predictable state changes
- Easy debugging (state history)
- Efficient change detection (reference equality)

**State Shape:**

```typescript
interface AppState {
  // Source code
  source: string;
  
  // Parse results
  ast: AST | null;
  errors: ParseError[];
  warnings: ParseWarning[];
  resources: {
    instructionCount: number;
    delayRamUsage: number; // samples
    registerUsage: string[]; // reg0, reg1, etc.
  };
  metadata: Metadata | null;
  
  // Audio state
  inputAudio: AudioBuffer | null;
  outputAudio: AudioBuffer | null;
  
  // Control state
  potValues: {
    pot0: number; // 0-1023
    pot1: number;
    pot2: number;
  };
  
  // UI state
  isRendering: boolean;
  isParsing: boolean;
  renderProgress: number; // 0-1
  
  // Playback state
  isPlaying: boolean;
  loopEnabled: boolean;
  currentTime: number;
}
```

**Implementation Options:**

1. **Vanilla JS with Observer Pattern**
   - Pros: No dependencies, simple
   - Cons: Manual subscription management
   
2. **Zustand (recommended)**
   - Pros: Minimal boilerplate, React-like API, works with vanilla JS
   - Cons: Small dependency (~1kb)
   - Example:
     ```typescript
     import create from 'zustand';
     
     const useStore = create((set) => ({
       source: '',
       ast: null,
       updateSource: (source) => set({ source }),
       setAST: (ast) => set({ ast }),
     }));
     ```

3. **Nanostores**
   - Pros: Tiny (334 bytes), framework-agnostic
   - Cons: Less conventional API

**Recommendation:** Use **Zustand** for simplicity and great DX.

---

## Performance Optimization: Fast Knob Re-render

**Goal:** < 2 seconds from knob change to audio output

### Strategy: Cache Parsed State

The key insight: **Parsing is slow, simulation is fast.**

- **Parsing:** Tokenize, build AST, validate (~100-500ms for typical program)
- **Simulation:** Interpret instructions (~50-200ms for 30s audio @ 32kHz)

**Optimization:**

1. **Cache AST** when code changes
2. **Reuse AST** when only pot values change
3. **Cancel in-flight renders** when new knob event arrives

**Implementation:**

```typescript
class RenderQueue {
  private currentRenderId: number = 0;
  
  async triggerRender(ast: AST, audioBuffer: AudioBuffer, potValues: PotValues) {
    const renderId = ++this.currentRenderId;
    
    // Cancel previous render if still running
    if (this.worker.isRunning) {
      this.worker.terminate();
      this.worker = new Worker('simulator.js');
    }
    
    // Start new render
    const result = await this.worker.simulate(ast, audioBuffer, potValues);
    
    // Check if this render is still relevant
    if (renderId === this.currentRenderId) {
      return result;
    } else {
      // Stale render, discard
      return null;
    }
  }
}
```

### Additional Optimizations

1. **Debounce knob changes** (50-100ms)
   - Avoid rendering on every mouse move
   - Wait for user to "settle" on a value

2. **Progressive rendering**
   - Render first 5 seconds immediately
   - Stream remaining audio in background
   - Update waveform incrementally

3. **Web Worker pooling**
   - Keep parser worker alive
   - Keep simulator worker alive
   - Reuse instead of recreate

4. **AudioBuffer reuse**
   - Don't recreate AudioContext on every render
   - Reuse OfflineAudioContext if same duration

5. **Waveform downsampling**
   - Don't render every sample
   - Use min/max peaks for zoom levels
   - Lib: Peaks.js handles this well

---

## Build Order & Dependencies

### Phase Ordering for Implementation

**Goal:** Build in an order that allows independent testing and incremental value delivery.

#### Phase 1: Parser (No dependencies)
- **Output:** AST, errors, warnings, resource counts
- **Testable independently:** Unit tests with .spn fixtures
- **Value:** Can validate code without simulation

**Files:**
```
/src/parser/
  tokenizer.ts     # Lexical analysis
  parser.ts        # AST construction
  validator.ts     # Semantic checks
  resources.ts     # Instruction/RAM counting
  metadata.ts      # Header extraction
  types.ts         # AST node definitions
```

**Dependencies:** None

**Duration:** 1-2 weeks

---

#### Phase 2: Simulator (Depends on: Parser)
- **Output:** AudioBuffer from AST + input audio
- **Testable independently:** Unit tests with known AST + sine wave input
- **Value:** Can hear audio output

**Files:**
```
/src/simulator/
  interpreter.ts       # FV-1 instruction execution
  registers.ts         # Register file (acc, pacc, etc.)
  memory.ts            # Delay RAM
  instructions/        # One file per instruction
    rdax.ts
    wrax.ts
    mulx.ts
    rda.ts
    ...
  audio-context.ts     # OfflineAudioContext wrapper
```

**Dependencies:** Parser (for AST)

**Duration:** 2-3 weeks

---

#### Phase 3: Audio Pipeline (Depends on: Simulator)
- **Output:** Resampled audio, playback controls
- **Testable independently:** Load audio file, resample, play
- **Value:** Complete audio workflow

**Files:**
```
/src/audio/
  loader.ts            # File upload, decoding
  resampler.ts         # 32kHz conversion
  player.ts            # Playback controls
  exporter.ts          # WAV/MP3 export
```

**Dependencies:** Simulator (for rendering), Web Audio API

**Duration:** 1 week

---

#### Phase 4: UI Components (Depends on: Parser, Simulator, Audio)
- **Output:** Interactive interface
- **Testable:** E2E tests, visual regression tests
- **Value:** User-facing application

**Files:**
```
/src/ui/
  editor/
    CodeEditor.tsx         # CodeMirror wrapper
    ErrorDisplay.tsx       # Parse errors
    
  controls/
    Knobs.tsx              # POT0/1/2 controls
    TransportControls.tsx  # Play/pause/loop
    
  visualization/
    WaveformView.tsx       # Audio waveform
    DiagramView.tsx        # Signal path
    ResourceMeters.tsx     # Instruction/RAM meters
    
  state/
    store.ts               # Zustand state
    actions.ts             # State updates
    
  App.tsx                  # Root component
```

**Dependencies:** All previous phases

**Duration:** 2-3 weeks

---

#### Phase 5: Integration & Polish (Depends on: All)
- URL encoding/decoding
- Shareable links
- Presets/examples
- Performance tuning
- Cross-browser testing

**Duration:** 1-2 weeks

---

### Total Timeline
**Estimated:** 7-11 weeks for MVP

**Critical Path:**
```
Parser → Simulator → Audio Pipeline → UI → Integration
```

**Parallelizable Work:**
- UI scaffolding can start during Phase 2
- Audio pipeline can be prototyped during Phase 2
- Design/UX work throughout

---

## Project Structure

```
/src
  /parser              # Phase 1
    index.ts           # Public API
    tokenizer.ts
    parser.ts
    validator.ts
    resources.ts
    metadata.ts
    types.ts
    
  /simulator           # Phase 2
    index.ts           # Public API
    interpreter.ts
    registers.ts
    memory.ts
    /instructions
      rdax.ts
      wrax.ts
      ...
      
  /audio               # Phase 3
    index.ts
    loader.ts
    resampler.ts
    player.ts
    exporter.ts
    
  /ui                  # Phase 4
    /editor
    /controls
    /visualization
    /state
    App.tsx
    
  /workers             # Worker entry points
    parser.worker.ts
    simulator.worker.ts
    
  /lib                 # Shared utilities
    constants.ts       # FV-1 constants
    utils.ts
    types.ts           # Shared types
    
  /examples            # Sample .spn files
    reverb.spn
    delay.spn
    ...
    
  index.ts             # App entry point

/public
  /audio               # Demo audio files
    guitar.wav
    synth.wav
    drums.wav
    
/tests
  /parser
  /simulator
  /audio
  /e2e

package.json
tsconfig.json
vite.config.ts         # Or webpack/rollup
```

---

## Architectural Patterns

### Pattern 1: Web Worker Communication

**What:** Offload CPU-intensive work to workers to keep UI responsive.

**When:** Parsing and simulation both CPU-heavy (100ms+)

**Example:**

```typescript
// In main thread
const parserWorker = new Worker(new URL('./workers/parser.worker.ts', import.meta.url));

parserWorker.postMessage({ 
  type: 'PARSE', 
  payload: { source: codeString } 
});

parserWorker.onmessage = (e) => {
  if (e.data.type === 'PARSE_SUCCESS') {
    store.setState({ ast: e.data.payload.ast });
  }
};

// In parser.worker.ts
self.onmessage = (e) => {
  if (e.data.type === 'PARSE') {
    const ast = parse(e.data.payload.source);
    self.postMessage({ type: 'PARSE_SUCCESS', payload: { ast } });
  }
};
```

**Benefits:**
- UI stays responsive during parse/render
- Leverages multi-core CPUs
- Browser automatically manages thread pool

---

### Pattern 2: Offline Audio Rendering

**What:** Use OfflineAudioContext for faster-than-realtime rendering.

**When:** All audio processing (not real-time effects)

**Example:**

```typescript
async function render(ast: AST, inputBuffer: AudioBuffer, potValues: PotValues): Promise<AudioBuffer> {
  const sampleRate = 32000; // FV-1 sample rate
  const duration = inputBuffer.duration;
  
  const offlineCtx = new OfflineAudioContext(
    2,           // channels (stereo)
    duration * sampleRate,
    sampleRate
  );
  
  // Create custom ScriptProcessorNode or AudioWorklet
  // to interpret FV-1 instructions sample-by-sample
  const processor = offlineCtx.createScriptProcessor(32, 2, 2);
  
  processor.onaudioprocess = (e) => {
    const inputL = e.inputBuffer.getChannelData(0);
    const inputR = e.inputBuffer.getChannelData(1);
    const outputL = e.outputBuffer.getChannelData(0);
    const outputR = e.outputBuffer.getChannelData(1);
    
    for (let i = 0; i < 32; i++) {
      // Interpret FV-1 instructions here
      const [outL, outR] = interpretBlock(ast, inputL[i], inputR[i], potValues);
      outputL[i] = outL;
      outputR[i] = outR;
    }
  };
  
  // Connect and render
  const source = offlineCtx.createBufferSource();
  source.buffer = inputBuffer;
  source.connect(processor);
  processor.connect(offlineCtx.destination);
  source.start();
  
  return await offlineCtx.startRendering();
}
```

**Benefits:**
- Renders faster than real-time (10x+ speedup typical)
- No glitches or latency concerns
- Simpler than real-time audio graph

**Note:** Consider using **AudioWorklet** instead of ScriptProcessorNode for better performance (AudioWorklet runs on audio thread).

---

### Pattern 3: Immutable State with Zustand

**What:** Single state store with immutable updates.

**When:** All state management

**Example:**

```typescript
import create from 'zustand';

interface State {
  source: string;
  ast: AST | null;
  potValues: PotValues;
  updateSource: (source: string) => void;
  setAST: (ast: AST) => void;
  updatePot: (pot: number, value: number) => void;
}

const useStore = create<State>((set) => ({
  source: '',
  ast: null,
  potValues: { pot0: 512, pot1: 512, pot2: 512 },
  
  updateSource: (source) => set({ source }),
  setAST: (ast) => set({ ast }),
  updatePot: (pot, value) => set((state) => ({
    potValues: { ...state.potValues, [`pot${pot}`]: value }
  })),
}));

// Usage in component
function KnobComponent() {
  const potValues = useStore((s) => s.potValues);
  const updatePot = useStore((s) => s.updatePot);
  
  return (
    <input 
      type="range" 
      value={potValues.pot0} 
      onChange={(e) => updatePot(0, parseInt(e.target.value))}
    />
  );
}
```

**Benefits:**
- Predictable state updates
- Easy to subscribe to state changes
- Great DevTools support
- Tiny bundle size

---

### Pattern 4: Render Queue with Cancellation

**What:** Cancel in-flight renders when new render requested.

**When:** User rapidly adjusts knobs

**Example:**

```typescript
class RenderQueue {
  private renderIdCounter = 0;
  private currentRenderId = 0;
  private worker: Worker;
  
  constructor() {
    this.worker = new Worker('./simulator.worker.ts');
  }
  
  async enqueueRender(ast, audioBuffer, potValues): Promise<AudioBuffer | null> {
    const renderId = ++this.renderIdCounter;
    this.currentRenderId = renderId;
    
    // Send to worker
    this.worker.postMessage({ renderId, ast, audioBuffer, potValues });
    
    return new Promise((resolve) => {
      this.worker.onmessage = (e) => {
        if (e.data.renderId === this.currentRenderId) {
          resolve(e.data.outputBuffer);
        } else {
          // Stale render, ignore
          resolve(null);
        }
      };
    });
  }
}
```

**Benefits:**
- No wasted work on stale renders
- UI stays responsive
- Always renders latest state

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Real-Time Audio Processing

**What:** Using AudioContext (not Offline) for live audio effects.

**Why bad:**
- FV-1 simulation is CPU-intensive (128 instructions per sample)
- Real-time audio requires < 10ms latency
- Causes glitches, dropouts, poor UX
- Complicates debugging

**Instead:**
- Use OfflineAudioContext for pre-rendering
- Render to buffer, then play buffer
- Accept 1-2 second delay for perfect quality

---

### Anti-Pattern 2: Monolithic Parser

**What:** Single giant parse() function that does everything.

**Why bad:**
- Hard to test individual stages
- Can't reuse tokenizer for syntax highlighting
- Difficult to add features (linting, formatting)
- Poor error recovery

**Instead:**
- Separate tokenizer, parser, validator
- Each stage produces intermediate representation
- Testable in isolation
- Easier to extend

---

### Anti-Pattern 3: Direct DOM Manipulation from Workers

**What:** Trying to update UI directly from worker thread.

**Why bad:**
- Workers can't access DOM
- Will throw errors
- Breaks separation of concerns

**Instead:**
- Workers send messages back to main thread
- Main thread updates UI based on messages
- Keep workers pure (data in, data out)

---

### Anti-Pattern 4: Blocking Main Thread

**What:** Running parse/simulate synchronously on main thread.

**Why bad:**
- UI freezes during processing
- Poor UX (no feedback, feels broken)
- Browser "unresponsive script" warnings

**Instead:**
- Always use Web Workers for CPU work
- Show progress indicators
- Keep main thread for UI only

---

### Anti-Pattern 5: Premature Optimization

**What:** Trying to optimize every instruction interpreter.

**Why bad:**
- FV-1 only runs 128 instructions × 32 samples = 4096 ops per block
- Modern JS engines are fast enough
- Wastes time on non-bottlenecks

**Instead:**
- Profile first, optimize later
- Focus on architecture (workers, caching)
- Optimize hot paths only if needed
- Consider WebAssembly only if profiling shows need

---

## Technology Choices

### Recommended Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| **Framework** | Vanilla TS or React | - / 18+ | Vanilla: no deps, fast. React: better DX for complex UI |
| **Build Tool** | Vite | 5+ | Fast HMR, great DX, native ESM, easy worker setup |
| **State** | Zustand | 4+ | Minimal, fast, great DX |
| **Editor** | CodeMirror 6 | 6+ | Modern, extensible, great performance |
| **Audio** | Web Audio API | - | Native, hardware-accelerated |
| **Waveform** | Peaks.js or custom Canvas | 3+ / - | Peaks: full-featured. Canvas: lighter, more control |
| **Diagram** | Cytoscape.js or D3 | 3+ / 7+ | Cytoscape: easier. D3: more control |
| **Testing** | Vitest | 1+ | Fast, Vite-native, great DX |
| **Type Checking** | TypeScript | 5+ | Catches errors, great DX |

### Alternative Stacks

**Minimal (no framework):**
```
Vite + Vanilla TS + Zustand + CodeMirror + Canvas
```
- Pros: Tiny bundle, fast, simple
- Cons: More manual work, less structured

**Full framework:**
```
Vite + React + Zustand + CodeMirror + Peaks.js + Cytoscape
```
- Pros: Great DX, lots of components, easier to maintain
- Cons: Larger bundle, more dependencies

**Recommendation:** Start minimal, add React if complexity grows.

---

## Sources

### HIGH Confidence
- [Web Audio API specification](https://webaudio.github.io/web-audio-api/) - Official W3C spec
- [MDN Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) - Authoritative documentation
- [MDN Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) - Authoritative documentation
- [SpinCAD Simulator source](https://github.com/HolyCityAudio/SpinCAD-Designer) - Existing FV-1 simulator (Java)

### MEDIUM Confidence
- [Web Audio Games article](https://web.dev/articles/webaudio-games) - Architecture patterns for audio apps
- [Tone.js](https://tonejs.github.io/) - Reference architecture for Web Audio framework
- [CodeMirror documentation](https://codemirror.net/docs/) - Editor architecture

### Domain Insights
- **OfflineAudioContext is the right choice:** All successful Web Audio apps rendering non-real-time audio use it
- **Web Workers are essential:** Audio processing is CPU-intensive; workers prevent UI freezing
- **Immutable state is standard:** All modern audio apps use single-store pattern (Redux, Zustand, etc.)
- **Caching parsed state is key:** Parsing is 5-10x slower than simulation; cache enables fast knob changes
- **Progressive rendering is common:** Stream results for long renders (not MVP critical)

---

## Implementation Recommendations

### For MVP

**Priority 1 (Critical Path):**
1. Parser with basic validation
2. Simulator for core instructions (rdax, wrax, mulx)
3. OfflineAudioContext rendering
4. Basic UI (editor, knobs, play button)

**Priority 2 (Usability):**
5. Error display with line numbers
6. Resource meters (instruction count, RAM)
7. Waveform visualization
8. Progress indicator during render

**Priority 3 (Polish):**
9. Metadata extraction
10. Diagram visualization
11. Export (WAV)
12. URL encoding

### For Post-MVP

- Advanced lint rules (see PITFALLS.md)
- AudioWorklet (if performance issues)
- WebAssembly simulator (if performance issues)
- Preset library
- Side-by-side diff tool
- More instructions (all 40+)

### Key Architectural Decisions

1. **Offline rendering:** Prioritize quality over latency
2. **Web Workers:** Keep UI responsive
3. **Immutable state:** Predictable updates
4. **Cache AST:** Fast knob changes
5. **Modular structure:** Independent testing

### Success Criteria

- [ ] Parse typical .spn file in < 200ms
- [ ] Render 30s audio in < 2s (from knob change)
- [ ] UI stays responsive during all operations
- [ ] Clear separation: parser, simulator, UI
- [ ] Each component testable in isolation

---

*Last updated: 2026-01-22*
