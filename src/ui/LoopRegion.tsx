import { useEffect, useRef, useState, useCallback } from 'react'
import { usePlaybackStore } from '../store/playbackStore'
import { playbackManager } from '../audio/playbackManager'

interface LoopRegionProps {
  duration: number
  width: number
  height: number
}

export default function LoopRegion({ duration, width, height }: LoopRegionProps) {
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const { loopStart, loopEnd, setLoopRegion } = usePlaybackStore()

  // Initialize loop region to full duration when duration changes
  useEffect(() => {
    if (duration > 0 && (loopEnd === 0 || loopEnd > duration)) {
      setLoopRegion(0, duration)
      playbackManager.setLoopRegion(0, duration)
    }
  }, [duration, loopEnd, setLoopRegion])

  const calculateTimeFromX = useCallback((clientX: number): number => {
    if (!containerRef.current) return 0
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const ratio = Math.max(0, Math.min(1, x / rect.width))
    return ratio * duration
  }, [duration])

  const handleMouseDown = useCallback((type: 'start' | 'end') => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation() // Prevent waveform click-to-seek
    setDragging(type)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return

    const time = calculateTimeFromX(e.clientX)
    
    if (dragging === 'start') {
      // Enforce minimum 0.1s gap and clamp to valid range
      const newStart = Math.max(0, Math.min(time, loopEnd - 0.1))
      setLoopRegion(newStart, loopEnd)
      playbackManager.setLoopRegion(newStart, loopEnd)
    } else if (dragging === 'end') {
      // Enforce minimum 0.1s gap and clamp to valid range
      const newEnd = Math.min(duration, Math.max(time, loopStart + 0.1))
      setLoopRegion(loopStart, newEnd)
      playbackManager.setLoopRegion(loopStart, newEnd)
    }
  }, [dragging, duration, loopStart, loopEnd, calculateTimeFromX, setLoopRegion])

  const handleMouseUp = useCallback(() => {
    setDragging(null)
  }, [])

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [dragging, handleMouseMove, handleMouseUp])

  // Calculate positions as percentages
  const startPercent = (loopStart / duration) * 100
  const endPercent = (loopEnd / duration) * 100

  return (
    <div 
      ref={containerRef}
      className="loop-region-overlay"
      style={{ width, height }}
    >
      {/* Shaded loop region background */}
      <div 
        className="loop-region-background"
        style={{
          left: `${startPercent}%`,
          width: `${endPercent - startPercent}%`,
        }}
      />
      
      {/* Start handle */}
      <div
        className="loop-handle loop-handle-start"
        style={{ left: `${startPercent}%` }}
        onMouseDown={handleMouseDown('start')}
      >
        <div className="loop-handle-line" />
      </div>
      
      {/* End handle */}
      <div
        className="loop-handle loop-handle-end"
        style={{ left: `${endPercent}%` }}
        onMouseDown={handleMouseDown('end')}
      >
        <div className="loop-handle-line" />
      </div>
    </div>
  )
}
