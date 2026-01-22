# Technology Stack

**Project:** SpinGPT - FV-1 SpinASM Validator and Audio Simulator
**Researched:** 2026-01-22

## Recommended Stack

### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **React** | 19.x | UI framework | Mature, large ecosystem, excellent TypeScript support, good performance. Battle-tested for complex interactive UIs. |
| **TypeScript** | 5.x | Type safety | Essential for custom DSP interpreter logic and maintaining correctness in complex audio code. Native support in modern tooling. |
| **Vite** | 7.x | Build tool | Lightning-fast HMR, excellent DX, optimized production builds. Industry standard for modern web apps in 2025. |

**Why React over alternatives:**
- **React 19** (latest): Concurrent features, built-in async rendering, extensive ecosystem
- **Svelte** considered but: Smaller ecosystem for audio/DSP tooling, less community content for audio apps
- React's virtual DOM overhead is negligible for this use case (UI updates are infrequent compared to audio processing)

**Confidence:** HIGH (verified via official React docs, Vite homepage)

### Code Editor
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **CodeMirror 6** | 6.x | Code editor | Modern architecture (ES6), extensible, excellent mobile support. Built-in support for custom language modes. TypeScript-first design. |

**Why CodeMirror 6:**
- Complete rewrite from v5 with modern architecture
- Accessibility built-in (screen reader support)
- Mobile-friendly touch interactions
- Easy to create custom SpinASM language mode via Lezer parser
- Active development, permissive MIT license
- Proven in production: used by Observable, GitHub, Repl.it

**Alternatives considered:**
- Monaco (VSCode editor): Too heavy for browser-only app (~5MB), complex setup
- Ace Editor: Less active development, older architecture
- Plain textarea: No syntax highlighting or editor features

**Confidence:** HIGH (verified via CodeMirror official site)

### Audio Processing
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Web Audio API** | Native | Audio context, offline rendering | Browser standard, OfflineAudioContext for fast non-realtime processing. No library needed. |
| **Custom FV-1 Interpreter** | - | DSP instruction execution | Custom implementation required (no existing library for FV-1 instruction set). TypeScript for type safety. |

**Why Web Audio API:**
- Native browser API, no dependencies
- `OfflineAudioContext` renders audio faster than realtime (perfect for <2s requirement)
- `AudioWorklet` available if realtime processing needed later
- Industry standard, well-documented

**Architecture notes:**
- FV-1 interpreter runs in JavaScript (not AudioWorklet) since we're using offline rendering
- Web Audio API provides: sample buffers, filters (biquad), delay nodes
- Custom DSP for FV-1-specific ops: RDAX, WRAX, SOF, LOG, EXP, SKP, etc.
- TypeScript ensures instruction semantics are correct

**Confidence:** HIGH (verified via MDN Web Audio API docs)

### Waveform Visualization
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **WaveSurfer.js** | 7.x | Waveform rendering, playback | Modern v7 rewrite (2023), Shadow DOM architecture, TypeScript support, interactive regions, mobile-friendly. |

**Why WaveSurfer.js 7:**
- Actively maintained (10k+ stars, regular releases)
- v7 is complete rewrite with modern architecture (2023)
- Built-in features: peaks rendering, regions, playback control, zoom
- Mobile touch support out of box
- Lightweight, no heavy dependencies
- Plugins available: timeline, minimap, regions, envelope

**Key features for SpinGPT:**
- Render waveform from AudioBuffer (our OfflineAudioContext output)
- Interactive regions for marking sections
- Scrubbing/playback control
- Responsive to container resizing

**Alternatives considered:**
- Peaks.js: BBC project, but less active, focused on large file streaming
- Canvas from scratch: Too much work, reinventing wheel
- Web Audio API visualization: Requires custom waveform rendering

**Confidence:** HIGH (verified via GitHub repo, active development confirmed)

### Knob Controls
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Custom React Components** | - | POT0/1/2 knobs | Build custom with Canvas2D or SVG. Modern approach over legacy WebComponents. |

**Recommended approach:**
1. Use HTML5 Canvas or SVG for rendering
2. React component wraps interaction logic (mouse/touch drag)
3. Map drag distance to value (0-11 range for FV-1 pots)

**Why custom over libraries:**
- **webaudio-controls** (g200kg): Last updated 2018, WebComponents v1, not React-friendly, dated UX
- Modern knob libraries scarce because:
  - Touch/mouse handling now straightforward
  - Canvas/SVG rendering simple for circular knobs
  - Custom aesthetics easier with full control

**Implementation pattern:**
```typescript
// React component with Canvas rendering
interface KnobProps {
  value: number; // 0-11
  onChange: (value: number) => void;
  label: string;
}
```

**Touch/mouse handling:**
- Track pointer Y-axis movement during drag
- Map pixels to knob rotation (e.g., 100px = full rotation)
- Support both click-drag and touch-drag
- Visual feedback: rotation + numeric display

**Confidence:** MEDIUM (best practices from Web Audio community, Canvas/SVG confirmed standard approach)

### Diagram Rendering
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Cytoscape.js** | 3.x | Signal flow diagrams | Mature graph visualization library, handles cycles (essential for FV-1 feedback), extensive layout algorithms. |

**Why Cytoscape.js:**
- Handles directed graphs with cycles (FV-1 has delay/feedback loops)
- Proven in production (used by GitHub, Meta, Microsoft, Google)
- Extensive layout algorithms: dagre (hierarchical), cola (force-directed), etc.
- Programmatic graph construction from metadata
- Pan/zoom/interactions built-in
- Highly optimized rendering

**For SpinGPT:**
- Parse SpinASM → build graph nodes (instructions) & edges (data flow)
- Detect cycles (delay lines, feedback loops)
- Auto-layout with dagre (left-to-right hierarchical)
- Node styling: color-code by instruction type

**Alternatives considered:**
- D3.js: More low-level, requires manual graph layout logic
- Mermaid: Text-based, not programmatic enough for dynamic graphs
- Raw Canvas: Too much work, no graph algorithms

**Confidence:** HIGH (verified via Cytoscape.js official site, extensive adoption list)

### State Management
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Zustand** | 5.x | Global state | Lightweight, React-friendly, TypeScript-first. No boilerplate. |

**Why Zustand:**
- Minimal API, no Redux boilerplate
- TypeScript support excellent
- Works seamlessly with React hooks
- No context provider wrapping needed
- Sufficient for this app's complexity

**State to manage:**
- SpinASM source code
- Parsed instruction metadata
- AudioBuffer (rendered output)
- POT values (0-11)
- Validation errors
- Playback state

**Alternatives considered:**
- Redux: Overkill, too much boilerplate
- Context API: Can cause unnecessary re-renders
- Jotai/Recoil: Similar to Zustand, but Zustand has simpler API

**Confidence:** HIGH (Zustand is standard choice for lightweight state in 2025)

### Build Tooling & Dev Environment
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Vite** | 7.x | Dev server, bundler | Fast HMR, optimized builds, native ESM, excellent TypeScript support. |
| **TypeScript** | 5.x | Type checking | Type safety for DSP logic, AST manipulation, audio processing. |
| **ESLint** | 9.x | Code linting | Catch bugs, enforce code style. |
| **Prettier** | 3.x | Code formatting | Consistent formatting. |

**Why Vite:**
- 2025 industry standard (replaced Webpack for most new projects)
- Instant server start, sub-100ms HMR
- Optimized production builds (Rollup-based)
- Native TypeScript, JSX support
- Tree-shaking, code splitting built-in
- Static asset handling

**Confidence:** HIGH (verified via Vite official site)

## Alternatives Considered

### UI Framework: React vs Svelte
| Criterion | React 19 | Svelte 5 |
|-----------|----------|----------|
| Ecosystem | Massive | Growing |
| Audio libs | Many examples | Fewer examples |
| TypeScript | Excellent | Excellent |
| Performance | Fast enough | Slightly faster |
| Learning curve | Moderate | Lower |
| **Verdict** | **Choose React** | - |

**Reason:** React's ecosystem advantage for audio/DSP work (more examples, libraries, community content). Performance difference negligible for this use case.

### Waveform: WaveSurfer.js vs Custom
| Criterion | WaveSurfer 7 | Custom Canvas |
|-----------|--------------|---------------|
| Time to implement | Hours | Days |
| Features | Rich | Basic |
| Maintenance | Library updates | Manual |
| File size | ~50KB | ~10KB |
| **Verdict** | **Choose WaveSurfer** | - |

**Reason:** WaveSurfer provides all needed features out of box. Custom implementation would take days and miss features like regions, zoom, etc.

### Diagram: Cytoscape.js vs D3.js
| Criterion | Cytoscape.js | D3.js |
|-----------|--------------|-------|
| Graph algorithms | Built-in | Manual |
| Cycle handling | Native | Manual |
| Learning curve | Lower | Higher |
| Bundle size | ~500KB | ~300KB |
| **Verdict** | **Choose Cytoscape** | - |

**Reason:** Cytoscape handles directed graphs with cycles out of box. D3 would require manual graph layout algorithms. Size difference negligible for this app.

## Installation

```bash
# Core
npm install react react-dom zustand

# Editor
npm install @codemirror/state @codemirror/view @codemirror/language @lezer/lr

# Waveform
npm install wavesurfer.js

# Diagram
npm install cytoscape

# Dev dependencies
npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom eslint prettier
```

## Project Structure

```
SpinGPT/
├── src/
│   ├── components/
│   │   ├── Editor.tsx           # CodeMirror wrapper
│   │   ├── Waveform.tsx         # WaveSurfer wrapper
│   │   ├── Knob.tsx             # Custom knob component
│   │   ├── Diagram.tsx          # Cytoscape diagram
│   │   └── Controls.tsx         # Play/pause, POT knobs
│   ├── interpreter/
│   │   ├── parser.ts            # SpinASM parser
│   │   ├── instructions.ts      # FV-1 instruction set
│   │   ├── simulator.ts         # DSP simulation engine
│   │   └── validator.ts         # Syntax/resource validator
│   ├── audio/
│   │   └── offline-renderer.ts  # Web Audio OfflineContext wrapper
│   ├── store/
│   │   └── app-store.ts         # Zustand store
│   └── main.tsx                 # Entry point
├── public/                      # Static assets
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Performance Considerations

### Audio Rendering
- Use `OfflineAudioContext` for non-realtime rendering (faster than realtime)
- Target: render 5s of audio in <2s (achievable on modern devices)
- Process in chunks if needed for longer audio

### Waveform Rendering
- WaveSurfer handles efficient peak rendering
- Use `peaks` pre-computation for long files (not needed for 5-10s audio)

### Diagram Rendering
- Cytoscape handles thousands of nodes efficiently
- FV-1 programs are small (max 128 instructions) - no performance issues

### Code Editor
- CodeMirror 6 handles large files efficiently
- FV-1 programs are tiny (<1KB typically) - no issues

## Browser Compatibility

**Target:** Modern browsers (2024+)
- Chrome 120+
- Firefox 120+
- Safari 17+
- Edge 120+

**Key API requirements:**
- Web Audio API: Baseline 2021 (all modern browsers)
- OfflineAudioContext: Baseline 2021
- ES6+ JavaScript: All modern browsers
- Canvas 2D: Universal support

**Mobile support:**
- iOS Safari 17+: Full Web Audio support, touch events work
- Android Chrome 120+: Full support

**Not supporting:**
- IE11 (no Web Audio API support)
- Old Safari (<15)

## Deployment

**Static hosting (browser-only, no server):**
- Vercel (recommended): Zero-config, auto HTTPS, CDN
- Netlify: Similar to Vercel
- GitHub Pages: Free, simple
- Cloudflare Pages: Fast, global CDN

**Build output:**
- Vite produces static HTML/JS/CSS bundle
- No server-side rendering needed
- All processing client-side

**CDN considerations:**
- Total bundle size estimate: ~1.5MB (uncompressed), ~500KB (gzipped)
  - React + ReactDOM: ~130KB gzipped
  - CodeMirror: ~150KB gzipped
  - WaveSurfer: ~50KB gzipped
  - Cytoscape: ~200KB gzipped
  - App code: ~100KB gzipped

## License Compatibility

All recommended libraries are permissively licensed:
- React: MIT
- Vite: MIT
- CodeMirror 6: MIT
- WaveSurfer.js 7: BSD-3-Clause
- Cytoscape.js: MIT
- Zustand: MIT

**Project license:** GPL acceptable per requirements. All dependencies are compatible with GPL (permissive licenses allow GPL wrapping).

## What NOT to Use

### ❌ Monaco Editor
**Why avoid:** 5MB bundle size, complex setup, designed for desktop VSCode, overkill for small SpinASM files.

### ❌ Redux
**Why avoid:** Too much boilerplate for this app's state complexity. Zustand is sufficient and far simpler.

### ❌ Webpack
**Why avoid:** Vite is the modern standard, much faster dev experience, better DX.

### ❌ jQuery
**Why avoid:** Not needed in 2025. React handles DOM, modern JavaScript handles everything else.

### ❌ AudioWorklet for Offline Rendering
**Why avoid:** Offline rendering happens faster than realtime in main thread with OfflineAudioContext. AudioWorklet adds complexity without benefit for this use case.

### ❌ WebAssembly for DSP
**Why avoid:** JavaScript is fast enough for FV-1 simulation (simple 32-bit fixed-point math). WASM adds build complexity. Consider only if performance becomes an issue (unlikely).

### ❌ Three.js for Knobs
**Why avoid:** Massive overkill. Canvas 2D or SVG is sufficient for 2D circular knobs.

## Sources

**High Confidence (Official Docs):**
- React: https://react.dev/ (verified 2026-01-22)
- Vite: https://vitejs.dev/ (verified 2026-01-22)
- CodeMirror: https://codemirror.net/ (verified 2026-01-22)
- Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API (MDN, 2026-01-22)
- WaveSurfer.js: https://github.com/katspaugh/wavesurfer.js (v7.12.1, Dec 2025)
- Cytoscape.js: https://js.cytoscape.org/ (v3.33.x, actively maintained)

**Medium Confidence (Community Practices):**
- Custom knob components: Web Audio community best practices (Canvas/SVG standard approach)
- Zustand: Popular choice in React community for lightweight state

**Research Notes:**
- All versions verified as current as of Jan 2026
- React 19 is latest stable (released 2025)
- Vite 7 is latest (released 2025)
- WaveSurfer.js 7 is major rewrite (2023), actively maintained
- CodeMirror 6 is complete rewrite from v5, modern architecture
- Cytoscape.js proven in production at major tech companies
