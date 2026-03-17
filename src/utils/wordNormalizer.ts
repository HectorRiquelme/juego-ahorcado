/**
 * Normalización de palabras para el juego del ahorcado.
 * - Soporta español: tildes, ñ, ü
 * - Normaliza para comparación pero preserva visual
 */

/** Mapa de caracteres con tilde a su base (para comparación interna) */
const ACCENTED_MAP: Record<string, string> = {
  'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
  'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
  'Ü': 'U', 'ü': 'u',
  // ñ y Ñ se mantienen como letra propia
}

/** Normaliza una letra para comparación (quita tildes, convierte a mayúsculas) */
export function normalizeLetter(letter: string): string {
  const mapped = ACCENTED_MAP[letter]
  return (mapped ?? letter).toUpperCase()
}

/** Normaliza toda una palabra para comparación interna */
export function normalizeWord(word: string): string {
  return word
    .toUpperCase()
    .split('')
    .map((ch) => ACCENTED_MAP[ch] ?? ch)
    .join('')
}

/**
 * Devuelve las letras únicas que deben ser adivinadas en la palabra.
 * Solo letras, ignorando espacios y puntuación.
 * Normaliza tildes para comparación.
 */
export function getUniqueLettersToGuess(word: string): string[] {
  const normalized = normalizeWord(word)
  const unique = new Set<string>()
  for (const ch of normalized) {
    if (/[A-ZÑ]/.test(ch)) {
      unique.add(ch)
    }
  }
  return Array.from(unique)
}

/**
 * Genera la estructura visual de la palabra.
 * Retorna array de caracteres: letra|' '|'-'
 * ' ' = espacio real de la frase (siempre revelado)
 * '-' = letra no adivinada
 * Letra en mayúscula = letra adivinada
 */
export function buildDisplayWord(
  word: string,
  correctLetters: string[]
): string[] {
  return word.toUpperCase().split('').map((ch) => {
    if (ch === ' ') return ' '
    // Puntuación: siempre mostrar
    if (!/[A-ZÁÉÍÓÚÜÑ]/.test(ch)) return ch
    // Normalizar para comparar
    const normalized = normalizeLetter(ch)
    if (correctLetters.includes(normalized)) return ch
    return '_'
  })
}

/**
 * Calcula estructura de frase (longitud de cada palabra)
 * Para el comodín show_structure
 */
export function getWordStructure(word: string): number[] {
  return word.split(' ').map((token) => token.length)
}

/**
 * Codifica la palabra en base64 (no es seguridad real, solo ofuscación para RLS)
 */
export function encodeWord(word: string): string {
  return btoa(unescape(encodeURIComponent(word)))
}

/**
 * Decodifica la palabra desde base64
 */
export function decodeWord(encoded: string): string {
  try {
    return decodeURIComponent(escape(atob(encoded)))
  } catch {
    return ''
  }
}

/**
 * Verifica si la palabra fue completamente adivinada
 */
export function isWordComplete(word: string, correctLetters: string[]): boolean {
  const unique = getUniqueLettersToGuess(word)
  return unique.every((letter) => correctLetters.includes(letter))
}

/**
 * Obtiene letras del abecedario español que no han sido usadas
 * y no están en la palabra (para comodín eliminate_wrong)
 */
export function getWrongCandidateLetters(
  word: string,
  usedLetters: string[],
  count = 3
): string[] {
  const wordLetters = getUniqueLettersToGuess(word)
  const ALPHABET = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('')

  const candidates = ALPHABET.filter(
    (l) => !wordLetters.includes(l) && !usedLetters.includes(l)
  )

  // Shuffle and take first `count`
  const shuffled = candidates.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}
