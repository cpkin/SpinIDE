import { useEffect, useRef } from 'react'
import { useAudioStore } from '../store/audioStore'
import { renderSimulation } from '../audio/renderSimulation'
import AnalogKnob from './AnalogKnob'

export default function KnobPanel() {
  const {
    pots,
    renderStatus,
    cachedInstructions,
    cachedIOMode,
    cachedInputBuffer,
    setPots,
    setRenderStatus,
    setRenderProgress,
    setRenderError,
    setRenderResult,
  } = useAudioStore()
  
  const debounceTimerRef = useRef<number | null>(null)
  const previousPotsRef = useRef(pots)
  
  // Convert 0.0-1.0 internal range to 0-11 display range
  const displayPot0 = pots.pot0 * 11
  const displayPot1 = pots.pot1 * 11
  const displayPot2 = pots.pot2 * 11
  
  const isDisabled = renderStatus === 'rendering'
  
  const handlePot0Change = (value: number) => {
    setPots({ pot0: value / 11 })
  }
  
  const handlePot1Change = (value: number) => {
    setPots({ pot1: value / 11 })
  }
  
  const handlePot2Change = (value: number) => {
    setPots({ pot2: value / 11 })
  }
  
  // Debounced re-render on knob change
  useEffect(() => {
    // Check if pots actually changed
    if (
      pots.pot0 === previousPotsRef.current.pot0 &&
      pots.pot1 === previousPotsRef.current.pot1 &&
      pots.pot2 === previousPotsRef.current.pot2
    ) {
      return
    }
    
    previousPotsRef.current = pots
    
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
  }, [pots, cachedInstructions, cachedIOMode, cachedInputBuffer, renderStatus])
  
  const triggerReRender = async () => {
    if (!cachedInstructions || !cachedIOMode || !cachedInputBuffer) {
      console.warn('Cannot re-render: cache missing')
      return
    }
    
    console.log('Re-rendering with cached instructions...')
    const reRenderStartTime = performance.now()
    
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
      })
      
      const reRenderEndTime = performance.now()
      const elapsedMs = reRenderEndTime - reRenderStartTime
      console.log(`Re-render using cached instructions: ${elapsedMs.toFixed(0)}ms`)
      
      setRenderStatus('complete')
      setRenderResult(result)
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
