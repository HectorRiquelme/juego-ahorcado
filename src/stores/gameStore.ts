import { create } from 'zustand'
import type { GameState, RoundState, GameStatus } from '@/types/game'
import type { PowerupType } from '@/types/database'

interface GameStore {
  gameState: GameState | null
  setGameState: (state: GameState | null) => void
  updateGameStatus: (status: GameStatus) => void
  setRoundState: (round: RoundState | null) => void
  updateRoundState: (partial: Partial<RoundState>) => void
  addCorrectLetter: (letter: string) => void
  addWrongLetter: (letter: string) => void
  markPowerupUsed: (powerup: PowerupType) => void
  incrementErrors: () => void
  setOpponentReady: (ready: boolean) => void
  updateScores: (myScore: number, opponentScore: number) => void
  setDisconnected: (playerId: string) => void
  clearDisconnected: () => void
  reset: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: null,

  setGameState: (state) => set({ gameState: state }),

  updateGameStatus: (status) =>
    set((s) => ({
      gameState: s.gameState ? { ...s.gameState, status } : null,
    })),

  setRoundState: (round) =>
    set((s) => ({
      gameState: s.gameState ? { ...s.gameState, roundState: round } : null,
    })),

  updateRoundState: (partial) =>
    set((s) => {
      if (!s.gameState?.roundState) return s
      return {
        gameState: {
          ...s.gameState,
          roundState: { ...s.gameState.roundState, ...partial },
        },
      }
    }),

  addCorrectLetter: (letter) =>
    set((s) => {
      if (!s.gameState?.roundState) return s
      const { correctLetters } = s.gameState.roundState
      if (correctLetters.includes(letter)) return s
      return {
        gameState: {
          ...s.gameState,
          roundState: {
            ...s.gameState.roundState,
            correctLetters: [...correctLetters, letter],
          },
        },
      }
    }),

  addWrongLetter: (letter) =>
    set((s) => {
      if (!s.gameState?.roundState) return s
      const { wrongLetters, errorsCount } = s.gameState.roundState
      if (wrongLetters.includes(letter)) return s
      return {
        gameState: {
          ...s.gameState,
          roundState: {
            ...s.gameState.roundState,
            wrongLetters: [...wrongLetters, letter],
            errorsCount: errorsCount + 1,
          },
        },
      }
    }),

  markPowerupUsed: (powerup) =>
    set((s) => {
      if (!s.gameState?.roundState) return s
      const { powerupsUsed } = s.gameState.roundState
      if (powerupsUsed.includes(powerup)) return s
      return {
        gameState: {
          ...s.gameState,
          roundState: {
            ...s.gameState.roundState,
            powerupsUsed: [...powerupsUsed, powerup],
          },
        },
      }
    }),

  incrementErrors: () =>
    set((s) => {
      if (!s.gameState?.roundState) return s
      return {
        gameState: {
          ...s.gameState,
          roundState: {
            ...s.gameState.roundState,
            errorsCount: s.gameState.roundState.errorsCount + 1,
          },
        },
      }
    }),

  setOpponentReady: (ready) =>
    set((s) => {
      if (!s.gameState?.roundState) return s
      return {
        gameState: {
          ...s.gameState,
          roundState: {
            ...s.gameState.roundState,
            opponentReady: ready,
          },
        },
      }
    }),

  updateScores: (myScore, opponentScore) =>
    set((s) => ({
      gameState: s.gameState ? { ...s.gameState, myScore, opponentScore } : null,
    })),

  setDisconnected: (playerId) =>
    set((s) => ({
      gameState: s.gameState
        ? { ...s.gameState, disconnectedAt: Date.now(), disconnectedPlayerId: playerId }
        : null,
    })),

  clearDisconnected: () =>
    set((s) => ({
      gameState: s.gameState
        ? { ...s.gameState, disconnectedAt: null, disconnectedPlayerId: null }
        : null,
    })),

  reset: () => set({ gameState: null }),
}))
