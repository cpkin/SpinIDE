import { useEffect, useRef } from 'react'
import { useAudioStore } from '../store/audioStore'
import { usePlaybackStore } from '../store/playbackStore'
import { playbackManager } from '../audio/playbackManager'

export default function PlaybackControls() {
  const animationFrameRef = useRef<number | null>(null)
  
  const outputBuffer = useAudioStore((state) => state.outputBuffer)
  const { isPlaying, setPlaying, setPlayheadTime, setDuration } = usePlaybackStore()

  // Set buffer when output changes
  useEffect(() => {
    if (outputBuffer) {
      playbackManager.setBuffer(outputBuffer)
      setDuration(outputBuffer.duration)
    }
  }, [outputBuffer, setDuration])

  // Animation frame loop for playhead updates
  useEffect(() => {
    if (isPlaying) {
      const updatePlayhead = () => {
        const currentTime = playbackManager.getCurrentTime()
        setPlayheadTime(currentTime)

        // Stop when reaching end
        if (currentTime >= playbackManager.getDuration()) {
          setPlaying(false)
          playbackManager.stop()
        } else {
          animationFrameRef.current = requestAnimationFrame(updatePlayhead)
        }
      }

      animationFrameRef.current = requestAnimationFrame(updatePlayhead)
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, setPlaying, setPlayheadTime])

  const handleTogglePlayback = () => {
    if (!outputBuffer) return

    if (isPlaying) {
      playbackManager.pause()
      setPlaying(false)
      setPlayheadTime(playbackManager.getCurrentTime())
    } else {
      playbackManager.play()
      setPlaying(true)
    }
  }

  const disabled = !outputBuffer

  return (
    <div className="playback-controls">
      <button
        className="play-button"
        onClick={handleTogglePlayback}
        disabled={disabled}
        type="button"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>
    </div>
  )
}
