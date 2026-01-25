import { useEffect, useRef } from 'react'
import { useAudioStore } from '../store/audioStore'
import { usePlaybackStore } from '../store/playbackStore'
import { playbackManager } from '../audio/playbackManager'

export default function PlaybackControls() {
  const animationFrameRef = useRef<number | null>(null)
  
  const outputBuffer = useAudioStore((state) => state.outputBuffer)
  const { isPlaying, isLooping, setPlaying, setPlayheadTime, setDuration, setIsLooping, setLoopRegion } = usePlaybackStore()

  // Set buffer when output changes and reset loop region
  useEffect(() => {
    if (outputBuffer) {
      playbackManager.setBuffer(outputBuffer)
      setDuration(outputBuffer.duration)
      setLoopRegion(0, outputBuffer.duration)
      setIsLooping(false)
    }
  }, [outputBuffer, setDuration, setLoopRegion, setIsLooping])

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

  const handleToggleLoop = () => {
    if (!outputBuffer) return
    
    const newLoopState = !isLooping
    setIsLooping(newLoopState)
    playbackManager.setLooping(newLoopState)
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
      <button
        className={`loop-button ${isLooping ? 'loop-active' : ''}`}
        onClick={handleToggleLoop}
        disabled={disabled}
        type="button"
        aria-label={isLooping ? 'Disable Loop' : 'Enable Loop'}
      >
        🔁
      </button>
    </div>
  )
}
