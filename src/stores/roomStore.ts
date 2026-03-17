import { create } from 'zustand'
import type { Room, Profile } from '@/types'

interface RoomStore {
  room: Room | null
  hostProfile: Profile | null
  guestProfile: Profile | null
  setRoom: (room: Room | null) => void
  setHostProfile: (p: Profile | null) => void
  setGuestProfile: (p: Profile | null) => void
  reset: () => void
}

export const useRoomStore = create<RoomStore>((set) => ({
  room: null,
  hostProfile: null,
  guestProfile: null,
  setRoom: (room) => set({ room }),
  setHostProfile: (p) => set({ hostProfile: p }),
  setGuestProfile: (p) => set({ guestProfile: p }),
  reset: () => set({ room: null, hostProfile: null, guestProfile: null }),
}))
