import { create } from 'zustand'

interface PlaybackState {
  isPlaying: boolean
  playheadTime: number
  duration: number
  loopStart: number
  loopEnd: number
  isLooping: boolean
  
  setPlaying: (playing: boolean) => void
  setPlayheadTime: (time: number) => void
  setDuration: (duration: number) => void
  setLoopRegion: (start: number, end: number) => void
  setIsLooping: (enabled: boolean) => void
  reset: () => void
}

export const usePlaybackStore = create<PlaybackState>((set) => ({
  isPlaying: false,
  playheadTime: 0,
  duration: 0,
  loopStart: 0,
  loopEnd: 0,
  isLooping: false,
  
  setPlaying: (playing) => set({ isPlaying: playing }),
  setPlayheadTime: (time) => set({ playheadTime: time }),
  setDuration: (duration) => set({ duration }),
  setLoopRegion: (start, end) => set({ loopStart: start, loopEnd: end }),
  setIsLooping: (enabled) => set({ isLooping: enabled }),
  reset: () => set({ isPlaying: false, playheadTime: 0, loopStart: 0, loopEnd: 0, isLooping: false }),
}))
