---
phase: 03-audio-interaction-export
plan: 02
subsystem: audio-interaction
tags: [loop-region, scrubbing, playback, interaction, web-audio]

# Dependency graph
requires:
  - 03-01 (waveform display, playback controls, playbackManager)
  - Phase 2 audio simulation engine (outputBuffer)
provides:
  - Click-to-seek on waveform for direct playback navigation
  - Draggable loop region handles for selecting audio sections
  - Loop toggle control for repeated playback within region
  - Loop state management in playbackStore and playbackManager
affects:
  - 03-03 (analog knobs will use same playback infrastructure)
  - 03-04 (export will include current loop region state)

# Tech tracking
tech-stack:
  added:
    - Mouse drag interaction patterns for loop handles
  patterns:
    - Event delegation with stopPropagation for overlay interactions
    - Percentage-based positioning for responsive loop markers
    - State synchronization between store and playbackManager
    - Minimum gap enforcement (0.1s) for loop boundaries

key-files:
  created:
    - src/ui/LoopRegion.tsx
  modified:
    - src/ui/WaveformDisplay.tsx
    - src/audio/playbackManager.ts
    - src/store/playbackStore.ts
    - src/ui/PlaybackControls.tsx
    - src/styles/app.css

key-decisions:
  - "Click-to-seek on waveform canvas with pointer cursor for direct navigation"
  - "Loop region overlay with draggable handles instead of waveform-integrated markers"
  - "Enforce 0.1s minimum gap between loop start/end to prevent invalid regions"
  - "Reset loop region to [0, duration] and disable looping on new buffer render"
  - "Blue tint background (rgba(59, 130, 246, 0.15)) for loop region visualization"
  - "Grab/grabbing cursor states for loop handle drag interaction"

patterns-established:
  - "Overlay pattern for interactive waveform controls without modifying canvas rendering"
  - "Percentage-based positioning for responsive UI elements on dynamic-sized containers"
  - "stopPropagation on overlay elements to prevent triggering underlying click handlers"

# Metrics
duration: 4 min
completed: 2026-01-25
---

# Phase 3 Plan 02: Loop Region and Waveform Scrubbing Summary

**Interactive waveform controls with click-to-seek, draggable loop region markers, and loop toggle for precise audio navigation and repeated playback**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-25T21:47:57Z
- **Completed:** 2026-01-25T21:52:15Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Implemented click-to-seek on waveform canvas with pointer cursor
- Built LoopRegion component with draggable start/end handles
- Added loop region state management to playbackStore (loopStart, loopEnd, isLooping)
- Extended playbackManager with setLoopRegion() and setLooping() methods
- Applied Web Audio API loop properties (loop, loopStart, loopEnd) to AudioBufferSourceNode
- Enforced minimum 0.1s gap between loop boundaries with clamping
- Created loop toggle button with visual state (dim/highlighted)
- Styled loop region overlay with blue tint background and glowing handles
- Integrated LoopRegion as absolute overlay on waveform canvas
- Reset loop region to full duration and disable looping on new render

## Task Commits

Each task was committed atomically:

1. **Task 1: Add waveform click-to-seek** - `67a8f0f` (feat)
   - onClick handler on canvas with pointer cursor
   - Calculate seek time from click position relative to canvas width
   - Call playbackManager.seek() with clamped time
   - Update playheadTime in store for cursor synchronization
   - Works both while playing and paused

2. **Task 2: Build loop region component with draggable handles** - `a4f8688` (feat)
   - LoopRegion.tsx with mouse drag interaction
   - loopStart/loopEnd/isLooping state in playbackStore
   - setLoopRegion() and setLooping() methods in playbackManager
   - Apply loop properties to AudioBufferSourceNode on play()
   - Minimum 0.1s gap enforcement between start/end points
   - Blue tint overlay background between loop markers
   - Grab/grabbing cursor with hover effects on handles
   - Percentage-based positioning for responsive layout

3. **Task 3: Add loop toggle and wire into UI** - `3841003` (feat)
   - Loop toggle button (🔁) in PlaybackControls
   - Visual state: dim when disabled, blue highlight when enabled
   - Call playbackManager.setLooping() on button click
   - Reset loop region to [0, duration] on new buffer
   - Reset isLooping to false on new render
   - Gap spacing between play and loop buttons

**Plan metadata committed:** Pending

## Files Created/Modified
- `src/ui/LoopRegion.tsx` - Draggable loop region overlay component (117 lines)
- `src/ui/WaveformDisplay.tsx` - Added click-to-seek and LoopRegion integration (modified)
- `src/audio/playbackManager.ts` - Added loop region management (modified)
- `src/store/playbackStore.ts` - Added loop state (loopStart, loopEnd, isLooping) (modified)
- `src/ui/PlaybackControls.tsx` - Added loop toggle button (modified)
- `src/styles/app.css` - Loop region and button styles (modified)

## Decisions Made

**1. Overlay vs integrated loop markers**
- Chose absolute positioned overlay for loop region instead of rendering markers directly on canvas
- Allows independent interaction without requiring canvas redraw on every drag
- Cleaner separation of concerns: canvas for audio visualization, overlay for interaction

**2. Click-to-seek interaction priority**
- Loop handle drag uses stopPropagation to prevent triggering waveform click-to-seek
- Ensures dragging handles doesn't accidentally seek playback
- User can still click waveform background to seek between handles

**3. Minimum gap enforcement (0.1s)**
- Prevents invalid loop regions where loopStart >= loopEnd
- 0.1s chosen as minimum audible loop duration (3.2 samples at 32kHz)
- Enforced during drag with Math.max/Math.min clamping

**4. Loop state reset on new render**
- Reset loop region to [0, duration] when new buffer rendered
- Disable looping by default (user must explicitly enable)
- Prevents confusing behavior where old loop region applied to new audio

## Deviations from Plan

None - plan executed exactly as written. All success criteria met:
- ✓ Clicking waveform seeks playback to clicked position immediately
- ✓ Loop region displays with draggable start and end handles on waveform
- ✓ Dragging handles updates loop boundaries, enforces loopStart < loopEnd with 0.1s minimum gap
- ✓ Loop toggle button enables/disables loop mode with clear visual state
- ✓ Audio playback loops within selected region when loop mode enabled
- ✓ Audio plays entire track when loop mode disabled
- ✓ Loop region resets to [0, duration] when new audio is rendered

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Click-to-seek and loop region ready for 03-03 (analog knobs)
- Playback infrastructure complete for parameter tweaking workflow
- Loop state can be included in URL sharing for 03-04
- No blockers identified

---
*Phase: 03-audio-interaction-export*
*Completed: 2026-01-25*
