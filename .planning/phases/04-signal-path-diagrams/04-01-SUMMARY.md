---
phase: 04-signal-path-diagrams
plan: 01
subsystem: ui
tags: [cytoscape, dagre, metadata, visualization, signal-path]

# Dependency graph
requires:
  - phase: 03-audio-interaction-export
    provides: Analog aesthetic knob components and styling conventions
  - phase: 00-foundation
    provides: Metadata schema v1 specification and JSON schema validation
provides:
  - Metadata-driven signal path diagram visualization with Cytoscape.js
  - Auto-layout block diagrams with Dagre (left-to-right signal flow)
  - Feedback cycle detection and visual distinction (dashed red edges)
  - Type-based block coloring matching SpinCAD convention
affects: [future-enhancement, interactive-diagrams, metadata-validation]

# Tech tracking
tech-stack:
  added: [cytoscape ^3.33.1, cytoscape-dagre ^2.5.0, dagre]
  patterns:
    - Metadata extraction from ;@fx comment headers
    - Topological ranking for feedback edge detection
    - Graceful degradation when metadata missing or malformed

key-files:
  created:
    - src/utils/metadataParser.ts
    - src/utils/graphBuilder.ts
    - src/styles/cytoscapeStyles.ts
    - src/components/SignalPathDiagram.tsx
  modified:
    - src/ui/SimulationPanel.tsx
    - package.json

key-decisions:
  - "Use Cytoscape.js with Dagre layout for auto-arranged block diagrams"
  - "Parse metadata from ;@fx comment headers with graceful null returns on errors"
  - "Detect feedback cycles via topological ranking (edges going to lower/equal rank nodes)"
  - "Hide diagram section entirely when no metadata present (no placeholder/warning)"
  - "Auto-expand diagram when valid metadata detected"

patterns-established:
  - "Metadata extraction pattern: useMemo(() => extractMetadata(source), [source])"
  - "Collapsible UI sections with expand/collapse state"
  - "Cytoscape instance lifecycle: create on mount, destroy on unmount"

# Metrics
duration: 5min
completed: 2026-01-25
---

# Phase 4 Plan 1: Signal Path Diagrams Summary

**Cytoscape.js block diagrams with Dagre auto-layout rendering signal flow from ;@fx metadata headers**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-25T23:16:04Z
- **Completed:** 2026-01-25T23:20:43Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Metadata parsing from ;@fx headers with multi-line JSON support and graceful error handling
- Cytoscape.js + Dagre integration for automatic left-to-right signal flow layout
- Analog aesthetic block styling matching Phase 3 knobs (warm colors, rounded corners, gradients)
- Feedback cycle detection via topological ranking heuristic
- Type-based block coloring (delay blue, filter green, reverb orange, etc.)
- Collapsible diagram section integrated into SimulationPanel
- Graceful degradation: diagram hidden entirely when no metadata present

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Cytoscape deps and create metadata extraction utilities** - `2d71bc9` (feat)
2. **Task 2: Create SignalPathDiagram component with analog aesthetic** - `4642fe9` (feat)
3. **Task 3: Integrate diagram into SimulationPanel** - `52f6f94` (feat)

**Plan metadata:** (pending)

## Files Created/Modified

- `src/utils/metadataParser.ts` - Parses ;@fx headers, returns FxMetadata or null
- `src/utils/graphBuilder.ts` - Converts metadata to Cytoscape elements, detects feedback edges
- `src/styles/cytoscapeStyles.ts` - Analog aesthetic stylesheet with type-specific colors
- `src/components/SignalPathDiagram.tsx` - Cytoscape component with Dagre layout and auto-height
- `src/ui/SimulationPanel.tsx` - Integrated collapsible diagram section after KnobPanel
- `package.json` - Added cytoscape, cytoscape-dagre, dagre dependencies

## Decisions Made

**1. Cytoscape.js + Dagre for layout engine**
- Rationale: Mature graph visualization library with strong TypeScript support and proven Dagre integration for hierarchical layouts
- Alternative considered: D3.js force-directed (rejected: requires manual layout tuning, less suitable for signal flow diagrams)

**2. Topological ranking heuristic for feedback detection**
- Rationale: Simple BFS-based ranking assigns each node a "depth" from input nodes. Edges going backward (to lower/equal rank) are feedback cycles.
- Limitation: May not catch all cycles in complex graphs, but works well for typical audio effect signal paths

**3. Hide diagram section entirely when no metadata**
- Rationale: Per CONTEXT.md decision - no nag messages or placeholders. Tool works fully without metadata.
- Benefit: Clean UI that doesn't clutter interface with empty states

**4. Auto-expand diagram when metadata detected**
- Rationale: If user added metadata, they likely want to see the diagram immediately
- UX: User can still collapse if not needed, default is to show the work they authored

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**1. TypeScript type definitions for cytoscape-dagre**
- Issue: `cytoscape-dagre` package lacks TypeScript definitions
- Solution: Added `// @ts-ignore` comment and created local `DagreLayoutOptions` interface to provide type safety
- Impact: No runtime issues, type checking works correctly

**2. Cytoscape StylesheetStyle API differences**
- Issue: Initial attempt used `Stylesheet` type (doesn't exist), and box-shadow properties aren't supported
- Solution: Changed to `StylesheetStyle` type and removed box-shadow properties (not needed for analog aesthetic)
- Impact: Analog aesthetic maintained without shadows

## Next Phase Readiness

**Phase 4 Plan 1 complete.** Signal path diagram visualization now available for .spn files with ;@fx metadata.

**Ready for:**
- User testing with metadata-annotated programs
- Future enhancements: interactive diagrams, metadata validation against code
- Production deployment (Phase 4 is optional enhancement - core tool complete)

**Known limitations:**
- Very large graphs (>50 nodes) may require pan/zoom optimization
- Feedback detection heuristic may not catch all cycles in extremely complex graphs
- SpinCAD color scheme approximated from research (not pixel-perfect match)

---
*Phase: 04-signal-path-diagrams*
*Completed: 2026-01-25*
