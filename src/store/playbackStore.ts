import { create } from 'zustand'

interface PlaybackState {
  isPlaying: boolean
  playheadTime: number
  duration: number
  
  setPlaying: (playing: boolean) => void
  setPlayheadTime: (time: number) => void
  setDuration: (duration: number) => void
  reset: () => void
}

export const usePlaybackStore = create<PlaybackState>((set) => ({
  isPlaying: false,
  playheadTime: 0,
  duration: 0,
  
  setPlaying: (playing) => set({ isPlaying: playing }),
  setPlayheadTime: (time) => set({ playheadTime: time }),
  setDuration: (duration) => set({ duration }),
  reset: () => set({ isPlaying: false, playheadTime: 0 }),
}))
