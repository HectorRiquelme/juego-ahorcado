import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { useRoomStore } from '@/stores/roomStore'
import { joinRoom } from '@/features/rooms/services/roomService'
import Layout from '@/components/layout/Layout'
import Button from '@/components/ui/Button'
import { slideUp } from '@/animations/variants'
import toast from 'react-hot-toast'

export default function JoinRoomPage() {
  const { user } = useAuthStore()
  const { setRoom } = useRoomStore()
  const navigate = useNavigate()
  const [code, setCode] = useState<string[]>(Array(6).fill(''))
  const [loading, setLoading] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleInput = (index: number, value: string) => {
    const char = value.toUpperCase().replace(/[^A-Z]/g, '').slice(-1)
    const newCode = [...code]
    newCode[index] = char
    setCode(newCode)

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6)
    const newCode = [...code]
    pasted.split('').forEach((ch, i) => { newCode[i] = ch })
    setCode(newCode)
    inputRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  const handleJoin = async () => {
    const fullCode = code.join('')
    if (fullCode.length < 6) {
      toast.error('Ingresa el código completo de 6 letras')
      return
    }
    if (!user) return

    setLoading(true)
    try {
      const room = await joinRoom(fullCode, user.id)
      setRoom(room)
      navigate(`/rooms/${room.code}/lobby`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo unir a la sala')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-8">
        <motion.div
          variants={slideUp}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-8"
        >
          <div>
            <button
              onClick={() => navigate('/home')}
              className="text-text-muted text-sm hover:text-text mb-4 flex items-center gap-1 transition-colors"
            >
              ← Volver
            </button>
            <h1 className="text-2xl font-bold text-text">Unirse a sala</h1>
            <p className="text-text-muted text-sm mt-1">
              Ingresa el código de 6 letras que te compartieron
            </p>
          </div>

          {/* Input de código */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-2 sm:gap-3" onPaste={handlePaste}>
              {code.map((char, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el }}
                  type="text"
                  inputMode="text"
                  maxLength={1}
                  value={char}
                  onChange={(e) => handleInput(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className={`
                    w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-mono font-bold
                    bg-bg-surface border-2 rounded-xl
                    focus:outline-none focus:ring-0 transition-all duration-200
                    ${char
                      ? 'border-primary text-text bg-primary/10'
                      : 'border-border text-text-subtle focus:border-primary'
                    }
                  `}
                  autoFocus={i === 0}
                />
              ))}
            </div>
            <p className="text-xs text-text-subtle">
              ¿El código tiene tildes o espacios? Solo letras A-Z y Ñ
            </p>
          </div>

          <Button
            onClick={handleJoin}
            loading={loading}
            size="lg"
            fullWidth
            disabled={code.join('').length < 6}
          >
            Unirme a la partida
          </Button>
        </motion.div>
      </div>
    </Layout>
  )
}
