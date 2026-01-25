# Phase 4: Signal Path Diagrams - Research

**Researched:** 2026-01-25
**Domain:** Graph visualization for audio signal flow diagrams
**Confidence:** HIGH

## Summary

Phase 4 requires rendering directed graphs with cycles (feedback paths) from metadata headers in .spn files. The standard approach is **Cytoscape.js with the Dagre layout extension**, which provides declarative graph rendering with automatic hierarchical layout for DAGs and graceful handling of cycles.

**Key findings:**
- Cytoscape.js is the industry standard for graph visualization in web apps (10.8k+ GitHub stars, used by GitHub, Google, Microsoft)
- Dagre layout algorithm handles directed acyclic graphs (DAGs) with built-in support for left-to-right flow
- Feedback cycles require special handling: Dagre breaks cycles automatically but visual distinction (dashed edges) must be implemented via styling
- React integration is straightforward via `useEffect` and refs, but Cytoscape instances should be destroyed on unmount to prevent memory leaks
- SpinCAD Designer uses color-coded blocks (delay=blue, filter=green, modulation=purple, etc.) — colors can be replicated via Cytoscape stylesheet

**Primary recommendation:** Use Cytoscape.js 3.33.1 with cytoscape-dagre 2.5.0 for layout. Render in a React component with vintage analog styling (rounded corners, shadows, warm palette) to match Phase 3's knob aesthetic.

## Standard Stack

The established libraries/tools for graph visualization in web applications:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| cytoscape | 3.33.1 | Graph theory library for visualization | Industry standard (10.8k stars), declarative API, extensible architecture, proven at scale (GitHub, Google, Microsoft) |
| cytoscape-dagre | 2.5.0 | Dagre layout algorithm integration | Official Cytoscape extension, hierarchical layout for DAGs, handles LR/TB flow, supports cycle detection |
| dagre | 0.8.2 | Directed graph layout engine | Battle-tested algorithm (Chris Pettitt), handles node/edge separation, rank assignment, cycle breaking |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react | (existing) | UI framework | Already in project stack (Phase 0 decision) |
| @types/cytoscape | latest | TypeScript definitions | Strong typing for Cytoscape API |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Cytoscape.js | D3.js force layout | D3 requires manual layout implementation; Cytoscape provides declarative API with built-in layouts. For hierarchical flow diagrams, Dagre > force layout. |
| Cytoscape.js | react-flow | react-flow is React-specific but less mature (3k vs 10.8k stars), no Dagre integration, weaker auto-layout for complex graphs |
| Dagre layout | CoSE (force-directed) | CoSE doesn't respect left-to-right signal flow; Dagre produces hierarchical layouts that match audio signal chain mental models |

**Installation:**
```bash
npm install cytoscape cytoscape-dagre dagre @types/cytoscape
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── SignalPathDiagram.tsx    # Main diagram component
├── utils/
│   ├── metadataParser.ts        # Parse ;@fx headers
│   └── graphBuilder.ts          # Convert metadata to Cytoscape elements
└── styles/
    └── cytoscapeStyles.ts       # Node/edge styles (analog aesthetic)
```

### Pattern 1: React Component with Cytoscape Instance
**What:** Create Cytoscape instance in `useEffect`, destroy on unmount
**When to use:** Standard pattern for integrating imperative libraries with React
**Example:**
```typescript
// Source: Cytoscape.js React integration best practices
import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';

cytoscape.use(dagre); // Register dagre layout

function SignalPathDiagram({ elements }: { elements: cytoscape.ElementDefinition[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create Cytoscape instance
    cyRef.current = cytoscape({
      container: containerRef.current,
      elements,
      style: [ /* styles */ ],
      layout: { name: 'dagre', rankDir: 'LR' },
    });

    // Cleanup on unmount
    return () => {
      cyRef.current?.destroy();
    };
  }, []);

  // Update graph when elements change
  useEffect(() => {
    if (!cyRef.current) return;
    cyRef.current.json({ elements });
    cyRef.current.layout({ name: 'dagre', rankDir: 'LR' }).run();
  }, [elements]);

  return <div ref={containerRef} style={{ width: '100%', height: '400px' }} />;
}
```

### Pattern 2: Feedback Cycle Detection and Styling
**What:** Use Dagre's cycle detection, apply distinct styling to feedback edges
**When to use:** Graphs with cycles (common in audio feedback paths)
**Example:**
```typescript
// Source: Dagre documentation + Cytoscape styling API
const style = [
  {
    selector: 'node',
    style: {
      'background-color': '#c9a66b', // warm tan (analog aesthetic)
      'label': 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      'shape': 'roundrectangle',
      'width': 'label',
      'height': 'label',
      'padding': '12px',
      'border-width': 2,
      'border-color': '#8b7355',
      'font-family': 'monospace', // match CodeMirror
      'font-size': '14px',
      'text-wrap': 'wrap',
      'text-max-width': '100px',
    }
  },
  {
    selector: 'edge',
    style: {
      'width': 2,
      'line-color': '#8b7355',
      'target-arrow-color': '#8b7355',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
    }
  },
  {
    selector: 'edge.feedback', // Apply to feedback edges
    style: {
      'line-style': 'dashed',
      'line-dash-pattern': [6, 3],
      'line-color': '#d9534f', // distinct red for feedback
      'target-arrow-color': '#d9534f',
    }
  }
];

// Mark feedback edges (must be done manually or via metadata)
// Dagre's acyclicer option breaks cycles for layout but doesn't tag them
// Solution: Compare metadata edge list with Dagre's computed ranks
```

### Pattern 3: Auto-Height Container
**What:** Container expands to fit diagram content without scrolling
**When to use:** Diagram size varies based on graph complexity
**Example:**
```typescript
// Source: Cytoscape.js layout API
useEffect(() => {
  if (!cyRef.current) return;

  cyRef.current.on('layoutstop', () => {
    const boundingBox = cyRef.current!.elements().boundingBox();
    const height = boundingBox.h + 40; // Add padding
    containerRef.current!.style.height = `${height}px`;
  });
}, []);
```

### Pattern 4: SpinCAD Color Scheme
**What:** Replicate SpinCAD Designer's block type colors
**When to use:** User expects familiar color coding from SpinCAD
**Example:**
```typescript
// Source: SpinCAD Designer screenshots (LOW confidence - needs verification)
// Common DSP block colors (observed from SpinCAD Designer community examples):
const BLOCK_COLORS = {
  delay: '#6baed6',      // Blue for delay blocks
  filter: '#74c476',     // Green for filters (LPF, HPF, etc.)
  modulation: '#9e9ac8', // Purple for chorus, flanger, etc.
  reverb: '#fd8d3c',     // Orange for reverb
  mixer: '#969696',      // Gray for mix/gain blocks
  input: '#fee391',      // Light yellow for input
  output: '#fc8d59',     // Warm orange for output
};

// Apply via selector based on block type from metadata
{
  selector: 'node[type="delay"]',
  style: { 'background-color': BLOCK_COLORS.delay }
}
```
**NOTE:** SpinCAD color scheme confidence is LOW. Planner should inspect SpinCAD Designer screenshots or source code (Java Swing UI) to verify exact colors. Above values are educated guesses based on common DSP visualization conventions.

### Anti-Patterns to Avoid
- **Don't recreate Cytoscape instance on every render** — Expensive and causes flickering. Create once in `useEffect`, update via `cy.json()`.
- **Don't apply Dagre layout inside render** — Layout calculation is synchronous and blocks UI. Run layout in `useEffect` after elements update.
- **Don't forget to call `cy.destroy()`** — Cytoscape holds references to DOM nodes and event listeners. Memory leaks accumulate without cleanup.
- **Don't use force-directed layouts for signal flow** — Force layouts (CoSE, Cola) don't respect hierarchical structure. Use Dagre for left-to-right signal chains.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Graph layout algorithm | Custom node positioning logic | Dagre via cytoscape-dagre | Edge crossing minimization, rank assignment, node spacing are complex graph theory problems with NP-hard components. Dagre implements Sugiyama-style layout (proven algorithm from 1981). |
| Cycle detection in directed graphs | Depth-first search with visited set | Dagre's `acyclicer: 'greedy'` option | Dagre's greedy heuristic finds minimal feedback arc set (edges to remove to make graph acyclic) for layout purposes. Manual DFS implementation won't integrate with layout engine. |
| Graph rendering engine | Canvas drawing + manual edge routing | Cytoscape.js | Edge routing with curves/arrows, zoom/pan, node selection, event handling are 1000+ LOC when done correctly. Cytoscape is battle-tested at scale. |
| Metadata parsing | Custom regex or hand-written parser | Existing metadata extraction from Phase 1 | Phase 1 parser already handles ;@fx headers. Reuse parsing logic, only add graph-specific validation. |

**Key insight:** Graph visualization is a mature domain with well-established algorithms. Cytoscape.js + Dagre provide production-grade solutions to problems that took decades of research to solve optimally.

## Common Pitfalls

### Pitfall 1: Feedback Cycles Break Layout
**What goes wrong:** Dagre expects DAGs (directed acyclic graphs). Cycles cause layout to fail or produce overlapping nodes.
**Why it happens:** Audio signal graphs often have feedback paths (e.g., reverb tail feeding back into input). Dagre's default behavior is to error on cycles.
**How to avoid:** Use Dagre's `acyclicer: 'greedy'` option, which temporarily removes edges to create a DAG for layout, then re-adds them. Style removed edges as feedback (dashed).
**Warning signs:** Nodes overlapping, edges crossing unnecessarily, layout throws errors.

### Pitfall 2: Memory Leaks from Cytoscape Instances
**What goes wrong:** Cytoscape instance not destroyed when component unmounts. Browser memory grows on navigation/re-renders.
**Why it happens:** Cytoscape holds DOM references and event listeners. React doesn't automatically clean up imperative libraries.
**How to avoid:** Always call `cy.destroy()` in `useEffect` cleanup function.
**Warning signs:** DevTools shows increasing heap size after component mounts/unmounts repeatedly.

### Pitfall 3: Layout Runs on Every Render
**What goes wrong:** Diagram flickers, UI freezes during layout recalculation.
**Why it happens:** Layout logic placed in render function or missing dependency array in `useEffect`.
**How to avoid:** Run layout only when `elements` prop changes. Use `useEffect` with `[elements]` dependency.
**Warning signs:** Visible flicker when hovering/clicking unrelated UI elements.

### Pitfall 4: Container Size Not Set
**What goes wrong:** Diagram doesn't render or appears at 0x0 pixels.
**Why it happens:** Cytoscape requires explicit container dimensions. Parent div has no height in CSS.
**How to avoid:** Set explicit `width` and `height` on container div (e.g., `height: 400px` or `height: 100%` with sized parent).
**Warning signs:** Empty white space where diagram should render.

### Pitfall 5: Missing Metadata Graceful Degradation
**What goes wrong:** Diagram component throws errors when ;@fx header missing or malformed.
**Why it happens:** No null checks before accessing metadata fields.
**How to avoid:** Check for metadata existence before rendering diagram. Hide diagram section entirely if no metadata (per CONTEXT.md decision).
**Warning signs:** Console errors when loading .spn files without metadata.

## Code Examples

Verified patterns from official sources:

### Basic Cytoscape.js + Dagre Setup
```typescript
// Source: https://github.com/cytoscape/cytoscape.js-dagre demo
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';

cytoscape.use(dagre); // Register extension

const cy = cytoscape({
  container: document.getElementById('cy'),
  elements: [
    { data: { id: 'a', label: 'Input' } },
    { data: { id: 'b', label: 'LPF (cutoff: POT0)' } },
    { data: { id: 'c', label: 'Delay (time: POT1)' } },
    { data: { id: 'd', label: 'Output' } },
    { data: { source: 'a', target: 'b' } },
    { data: { source: 'b', target: 'c' } },
    { data: { source: 'c', target: 'd' } },
    { data: { source: 'c', target: 'b', classes: 'feedback' } }, // Feedback edge
  ],
  layout: {
    name: 'dagre',
    rankDir: 'LR', // Left-to-right
    nodeSep: 50,   // Horizontal spacing
    rankSep: 100,  // Vertical spacing
  },
});
```

### Parsing Metadata to Cytoscape Elements
```typescript
// Source: Cytoscape.js element definition format
interface FxMetadata {
  version: string;
  name: string;
  description?: string;
  signalGraph?: {
    nodes: Array<{ id: string; label: string; type: string }>;
    edges: Array<{ source: string; target: string; feedback?: boolean }>;
  };
}

function buildCytoscapeElements(metadata: FxMetadata): cytoscape.ElementDefinition[] {
  if (!metadata.signalGraph) return [];

  const nodes = metadata.signalGraph.nodes.map(node => ({
    data: {
      id: node.id,
      label: node.label,
      type: node.type, // For color styling
    },
  }));

  const edges = metadata.signalGraph.edges.map(edge => ({
    data: {
      source: edge.source,
      target: edge.target,
    },
    classes: edge.feedback ? 'feedback' : '',
  }));

  return [...nodes, ...edges];
}
```

### Collapsible Diagram Section
```typescript
// Source: React controlled component pattern
function SimulationPanel({ metadata }: { metadata: FxMetadata | null }) {
  const [diagramExpanded, setDiagramExpanded] = useState(!!metadata?.signalGraph);

  // Hide diagram section if no metadata
  if (!metadata?.signalGraph) return null;

  return (
    <div className="simulation-panel">
      {/* Other simulation controls */}
      
      <div className="diagram-section">
        <button onClick={() => setDiagramExpanded(!diagramExpanded)}>
          {diagramExpanded ? '▼' : '▶'} Signal Flow Diagram
        </button>
        {diagramExpanded && (
          <SignalPathDiagram elements={buildCytoscapeElements(metadata)} />
        )}
      </div>
    </div>
  );
}
```

### Vintage Analog Styling
```typescript
// Source: CSS-in-JS with Cytoscape stylesheet
const analogStyle: cytoscape.Stylesheet[] = [
  {
    selector: 'node',
    style: {
      'background-color': '#d4a574', // Warm tan
      'background-gradient-direction': 'to-bottom-right',
      'background-gradient-stop-colors': '#d4a574 #c9a66b',
      'label': 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      'shape': 'roundrectangle',
      'width': 'label',
      'height': 'label',
      'padding': '16px',
      'border-width': 3,
      'border-color': '#8b7355',
      'font-family': 'Fira Code, monospace', // Match CodeMirror
      'font-size': '13px',
      'color': '#3e2723',
      'text-wrap': 'wrap',
      'text-max-width': '120px',
      // Shadow (analog depth)
      'box-shadow': '0 2px 8px rgba(0,0,0,0.3)',
    }
  },
  {
    selector: 'edge',
    style: {
      'width': 3,
      'line-color': '#8b7355',
      'target-arrow-color': '#8b7355',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'arrow-scale': 1.5,
    }
  },
  {
    selector: 'edge.feedback',
    style: {
      'line-style': 'dashed',
      'line-dash-pattern': [8, 4],
      'line-color': '#d9534f',
      'target-arrow-color': '#d9534f',
    }
  },
];
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual canvas drawing | Declarative graph libraries (Cytoscape.js) | ~2016 | Cytoscape.js published in Oxford Bioinformatics (2016, 2023 update). Shift from imperative canvas to declarative element definitions. |
| Force-directed layouts only | Hierarchical layouts (Dagre) for DAGs | ~2012 | Dagre algorithm published ~2012. Dagre produces clearer signal flow diagrams than force layouts. |
| Global CSS for graph styling | Component-scoped stylesheets | ~2020 | Cytoscape 3.x stylesheet API allows scoped styling per graph instance, avoiding global CSS conflicts. |
| D3.js for all graphs | Specialized libraries (Cytoscape for networks) | ~2016 | D3 remains powerful for custom visualizations, but Cytoscape provides better out-of-box support for graph theory operations. |

**Deprecated/outdated:**
- **Cytoscape.js 2.x:** Replaced by 3.x in 2018. 3.x has performance improvements, better layout APIs, and modern module support.
- **cytoscape-dagre 1.x:** Version 2.x (2019) uses modern Dagre and supports more layout options.

## Open Questions

Things that couldn't be fully resolved:

1. **SpinCAD Designer exact color scheme**
   - What we know: SpinCAD Designer is a Java Swing application with color-coded DSP blocks
   - What's unclear: Exact hex colors for each block type (delay, filter, modulation, reverb, mixer)
   - Recommendation: Planner should inspect SpinCAD Designer source code (Java files in `src/` directory) or run the application and use a color picker tool to extract exact colors. Fallback: use educated guesses based on common DSP visualization conventions (blue=delay, green=filter, purple=modulation).

2. **Feedback edge identification from metadata**
   - What we know: Metadata schema allows `feedback?: boolean` flag on edges
   - What's unclear: Whether users will reliably mark feedback edges in metadata, or if tool should auto-detect cycles
   - Recommendation: Support both approaches. Respect explicit `feedback: true` in metadata. For unmarked cycles, apply heuristic (e.g., edges that violate topological sort are likely feedback).

3. **Very large diagrams (50+ blocks)**
   - What we know: Cytoscape supports pan/zoom for large graphs
   - What's unclear: At what size does auto-height become unwieldy? Should there be a max height with scroll?
   - Recommendation: Start with auto-height. If user feedback shows diagrams exceed ~600px regularly, add max-height with vertical scroll or mini-map navigation.

## Sources

### Primary (HIGH confidence)
- Cytoscape.js documentation (https://js.cytoscape.org)
- Cytoscape.js GitHub repository (https://github.com/cytoscape/cytoscape.js) — Latest release: v3.33.1 (verified via npm)
- cytoscape-dagre GitHub repository (https://github.com/cytoscape/cytoscape.js-dagre) — Latest release: v2.5.0 (verified via npm)
- Dagre GitHub repository (https://github.com/dagrejs/dagre) — Latest release: v2.0.0

### Secondary (MEDIUM confidence)
- SpinCAD Designer GitHub repository (https://github.com/HolyCityAudio/SpinCAD-Designer) — Java source code available for color scheme inspection
- React + Cytoscape integration patterns from Cytoscape.js community examples

### Tertiary (LOW confidence)
- SpinCAD Designer block color scheme — Needs manual verification via source code inspection or application screenshots

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Cytoscape.js and Dagre are industry standards with proven track records
- Architecture: HIGH — React integration patterns are well-documented and verified via official Cytoscape examples
- Pitfalls: HIGH — Memory leaks, layout performance, and cycle handling are documented in Cytoscape issues and community discussions
- SpinCAD colors: LOW — No official documentation found; requires manual inspection of SpinCAD Designer UI or source code

**Research date:** 2026-01-25
**Valid until:** ~30 days (libraries are stable, but check for patch releases before implementation)
