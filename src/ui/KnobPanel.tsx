import { useEffect, useRef } from 'react'
import { useAudioStore } from '../store/audioStore'
import { renderSimulation } from '../audio/renderSimulation'
import AnalogKnob from './AnalogKnob'
import { useDebugStore } from '../store/debugStore'

export default function KnobPanel() {
  const {
    pots,
    wetMix,
    choDepth,
    renderStatus,
    cachedInstructions,
    cachedIOMode,
    cachedInputBuffer,
    setPots,
    setRenderStatus,
    setRenderProgress,
    setRenderError,
    setRenderResult,
    setOutputBuffer,
  } = useAudioStore()

  const { enabled: debugEnabled, addEntry: addDebugEntry } = useDebugStore()

  const debounceTimerRef = useRef<number | null>(null)
  const previousPotsRef = useRef(pots)
  const previousWetMixRef = useRef(wetMix)
  const previousChoDepthRef = useRef(choDepth)
  
  // Convert 0.0-1.0 internal range to 0-10 display range
  const displayPot0 = pots.pot0 * 10
  const displayPot1 = pots.pot1 * 10
  const displayPot2 = pots.pot2 * 10
  
  const isDisabled = renderStatus === 'rendering'
  
  const handlePot0Change = (value: number) => {
    setPots({ pot0: value / 10 })
  }
  
  const handlePot1Change = (value: number) => {
    setPots({ pot1: value / 10 })
  }
  
  const handlePot2Change = (value: number) => {
    setPots({ pot2: value / 10 })
  }
  
  // Debounced re-render on knob change
  useEffect(() => {
    const potsChanged =
      pots.pot0 !== previousPotsRef.current.pot0 ||
      pots.pot1 !== previousPotsRef.current.pot1 ||
      pots.pot2 !== previousPotsRef.current.pot2
    const wetMixChanged = wetMix !== previousWetMixRef.current
    const choDepthChanged = choDepth !== previousChoDepthRef.current

    // Check if pots or wet mix actually changed
    if (!potsChanged && !wetMixChanged && !choDepthChanged) {
      return
    }
    
    previousPotsRef.current = pots
    previousWetMixRef.current = wetMix
    previousChoDepthRef.current = choDepth
    
    // Clear any existing debounce timer
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current)
    }
    
    // Don't trigger re-render if cache is missing or already rendering
    if (!cachedInstructions || !cachedIOMode || !cachedInputBuffer || renderStatus === 'rendering') {
      return
    }
    
    // Debounce for 500ms
    debounceTimerRef.current = window.setTimeout(() => {
      triggerReRender()
    }, 500)
    
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current)
      }
    }
  }, [pots, wetMix, choDepth, cachedInstructions, cachedIOMode, cachedInputBuffer, renderStatus])
  
  const triggerReRender = async () => {
    if (!cachedInstructions || !cachedIOMode || !cachedInputBuffer) {
      console.warn('Cannot re-render: cache missing')
      return
    }
    
    setRenderStatus('rendering')
    setRenderError(null)
    
    try {
      const result = await renderSimulation({
        input: cachedInputBuffer,
        instructions: cachedInstructions,
        ioMode: cachedIOMode,
        pots,
        onProgress: (progress) => {
          setRenderProgress(progress)
        },
        onDebug: debugEnabled ? (entry) => addDebugEntry(entry) : undefined,
        debugLabel: 'rerender',
        mixWet: wetMix,
        mixDry: 1 - wetMix,
        choDepth,
      })
      
      setRenderStatus('complete')
      setRenderResult(result)
      setOutputBuffer(result.buffer)
      setRenderError(null)
    } catch (error) {
      setRenderStatus('error')
      const message = error instanceof Error ? error.message : 'Re-render failed'
      setRenderError(`Re-render error: ${message}`)
    }
  }
  
  return (
    <div className={`knob-panel ${isDisabled ? 'knob-panel-disabled' : ''}`}>
      <AnalogKnob
        value={displayPot0}
        onChange={handlePot0Change}
        label="POT0"
        disabled={isDisabled}
      />
      <AnalogKnob
        value={displayPot1}
        onChange={handlePot1Change}
        label="POT1"
        disabled={isDisabled}
      />
      <AnalogKnob
        value={displayPot2}
        onChange={handlePot2Change}
        label="POT2"
        disabled={isDisabled}
      />
    </div>
  )
}
