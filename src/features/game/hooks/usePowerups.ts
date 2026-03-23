import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { PowerupType } from '@/types'
import type { RevealLetterResult, EliminateWrongResult } from '@/types/game'
import {
  getUniqueLettersToGuess,
  getWrongCandidateLetters,
  decodeWord,
  normalizeLetter,
} from '@/utils/wordNormalizer'
import { recordPowerupUse } from '../services/gameService'
import toast from 'react-hot-toast'

interface UsePowerupsOptions {
  roundId: string
  matchId: string
  userId: string
  wordEncoded: string
  correctLetters: string[]
  wrongLetters: string[]
  powerupsUsed: PowerupType[]
  shieldActive: boolean
  onRevealLetter: (result: RevealLetterResult) => void
  onEliminateWrong: (result: EliminateWrongResult) => void
  onShowHint: (hint: string) => void
  onActivateShield: () => void
  onShowStructure: (structure: number[]) => void
  onFreezeTime: () => void
}

export function usePowerups(options: UsePowerupsOptions) {
  const isUsed = useCallback(
    (type: PowerupType) => options.powerupsUsed.includes(type),
    [options.powerupsUsed]
  )

  const usePowerup = useCallback(
    async (type: PowerupType) => {
      if (isUsed(type)) {
        toast.error('Ya usaste ese comodín en esta ronda')
        return
      }

      const word = decodeWord(options.wordEncoded)
      if (!word && type !== 'extra_hint' && type !== 'shield' && type !== 'time_freeze') {
        toast.error('Error: no se pudo decodificar la palabra')
        return
      }

      try {
        switch (type) {
          case 'reveal_letter': {
            const allLetters = getUniqueLettersToGuess(word)
            const remaining = allLetters.filter(
              (l) => !options.correctLetters.includes(l)
            )
            if (remaining.length === 0) {
              toast('No quedan letras por revelar', { icon: '🤷' })
              return
            }
            // Elige letra más común (simplificado: aleatoria del resto)
            const letter = remaining[Math.floor(Math.random() * remaining.length)]
            // BUG 20 FIX: normalizar cada caracter para manejar tildes correctamente
            const positions = word.toUpperCase().split('').reduce<number[]>((acc, ch, i) => {
              if (normalizeLetter(ch) === letter) acc.push(i)
              return acc
            }, [])

            await recordPowerupUse({
              round_id: options.roundId,
              match_id: options.matchId,
              player_id: options.userId,
              powerup_type: type,
              result_payload: { letter, positions },
            })
            options.onRevealLetter({ letter, positions })
            toast.success(`Letra revelada: ${letter}`, { icon: '✨' })
            break
          }

          case 'eliminate_wrong': {
            const eliminated = getWrongCandidateLetters(word, [
              ...options.correctLetters,
              ...options.wrongLetters,
            ], 3)

            await recordPowerupUse({
              round_id: options.roundId,
              match_id: options.matchId,
              player_id: options.userId,
              powerup_type: type,
              result_payload: { eliminated },
            })
            options.onEliminateWrong({ eliminatedLetters: eliminated })
            toast.success(`${eliminated.length} letras eliminadas del teclado`, { icon: '🗑️' })
            break
          }

          case 'extra_hint': {
            const { data: rawRound } = await supabase
              .from('rounds')
              .select('hint_extra')
              .eq('id', options.roundId)
              .single()

            const hint = (rawRound as { hint_extra: string | null } | null)?.hint_extra ?? 'Sin pista extra disponible'
            await recordPowerupUse({
              round_id: options.roundId,
              match_id: options.matchId,
              player_id: options.userId,
              powerup_type: type,
              result_payload: { hint },
            })
            options.onShowHint(hint)
            toast.success('Pista extra revelada', { icon: '💡' })
            break
          }

          case 'shield': {
            if (options.shieldActive) {
              toast('El escudo ya está activo', { icon: '🛡️' })
              return
            }
            await recordPowerupUse({
              round_id: options.roundId,
              match_id: options.matchId,
              player_id: options.userId,
              powerup_type: type,
              result_payload: {},
            })
            options.onActivateShield()
            toast.success('Escudo activado — el próximo error no cuenta', { icon: '🛡️' })
            break
          }

          case 'show_structure': {
            const structure = word.split(' ').map((token) => token.length)
            await recordPowerupUse({
              round_id: options.roundId,
              match_id: options.matchId,
              player_id: options.userId,
              powerup_type: type,
              result_payload: { structure },
            })
            options.onShowStructure(structure)
            toast.success('Estructura de la frase revelada', { icon: '🔤' })
            break
          }

          case 'time_freeze': {
            await recordPowerupUse({
              round_id: options.roundId,
              match_id: options.matchId,
              player_id: options.userId,
              powerup_type: type,
              result_payload: { extra_seconds: 30 },
            })
            options.onFreezeTime()
            toast.success('+30 segundos al reloj', { icon: '⏱️' })
            break
          }
        }
      } catch (error) {
        console.error('Error using powerup:', error)
        toast.error('No se pudo usar el comodín')
      }
    },
    [isUsed, options]
  )

  return { usePowerup, isUsed }
}
