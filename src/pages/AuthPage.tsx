import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { slideUp } from '@/animations/variants'
import toast from 'react-hot-toast'

export default function AuthPage() {
  const [params] = useSearchParams()
  const [mode, setMode] = useState<'login' | 'register'>(
    params.get('mode') === 'login' ? 'login' : 'register'
  )
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ email: '', password: '', username: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.email.includes('@')) newErrors.email = 'Email inválido'
    if (formData.password.length < 6) newErrors.password = 'Mínimo 6 caracteres'
    if (mode === 'register' && formData.username.trim().length < 2) {
      newErrors.username = 'Mínimo 2 caracteres'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(formData.email, formData.password)
        toast.success('Bienvenido de vuelta')
        navigate('/home')
      } else {
        await signUp(formData.email, formData.password, formData.username.trim())
        toast.success('Cuenta creada. ¡A jugar!')
        navigate('/home')
      }
    } catch (err) {
      // PostgrestError y AuthError no son instancias de Error estándar,
      // pero ambos tienen .message
      const raw = (err as { message?: string })?.message ?? String(err)
      toast.error(translateAuthError(raw))
    } finally {
      setLoading(false)
    }
  }

  const update = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value })
    if (errors[field]) setErrors({ ...errors, [field]: '' })
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-16">
      {/* Fondos decorativos */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <motion.div
        variants={slideUp}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <span className="text-3xl">🔤</span>
          </Link>
          <h1 className="text-2xl font-bold text-text">
            {mode === 'login' ? 'Bienvenido de vuelta' : 'Crear cuenta'}
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {mode === 'login'
              ? 'Ingresa para continuar jugando'
              : 'Es gratis y toma 30 segundos'}
          </p>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'register' && (
              <Input
                label="Nombre de usuario"
                placeholder="Como te llamarán en el juego"
                value={formData.username}
                onChange={(e) => update('username', e.target.value)}
                error={errors.username}
                autoComplete="username"
                autoFocus
              />
            )}

            <Input
              label="Email"
              type="email"
              placeholder="tu@email.com"
              value={formData.email}
              onChange={(e) => update('email', e.target.value)}
              error={errors.email}
              autoComplete="email"
              autoFocus={mode === 'login'}
            />

            <Input
              label="Contraseña"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={formData.password}
              onChange={(e) => update('password', e.target.value)}
              error={errors.password}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />

            <Button type="submit" loading={loading} size="lg" fullWidth className="mt-2">
              {mode === 'login' ? 'Entrar' : 'Crear mi cuenta'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-text-muted">
              {mode === 'login' ? '¿Sin cuenta aún?' : '¿Ya tienes cuenta?'}{' '}
              <button
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="text-primary-light hover:text-primary font-medium transition-colors"
              >
                {mode === 'login' ? 'Registrarse' : 'Iniciar sesión'}
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Traducción de errores de Supabase Auth ───────────────────────────────────

function translateAuthError(message: string): string {
  const m = message.toLowerCase()

  if (m.includes('security purposes') || m.includes('after') && m.includes('seconds')) {
    // Extraer los segundos del mensaje original
    const match = message.match(/(\d+)\s*seconds?/i)
    const secs = match ? match[1] : 'unos'
    return `Espera ${secs} segundos antes de intentarlo de nuevo`
  }
  if (m.includes('invalid login') || m.includes('invalid credentials')) {
    return 'Email o contraseña incorrectos'
  }
  if (m.includes('already registered') || m.includes('user already exists')) {
    return 'Ese email ya está registrado'
  }
  if (m.includes('email not confirmed')) {
    return 'Debes confirmar tu email antes de entrar'
  }
  if (m.includes('password') && m.includes('6')) {
    return 'La contraseña debe tener al menos 6 caracteres'
  }
  if (m.includes('invalid email')) {
    return 'El email no es válido'
  }
  if (m.includes('signup') && m.includes('disabled')) {
    return 'El registro está deshabilitado temporalmente'
  }
  if (m.includes('network') || m.includes('fetch') || m.includes('failed to fetch')) {
    return 'Error de conexión. Verifica tu internet'
  }
  if (m.includes('relation') && m.includes('does not exist')) {
    return 'Las tablas no están configuradas. Ejecuta el SQL en Supabase primero'
  }
  if (m.includes('duplicate') || m.includes('unique')) {
    return 'Ese nombre de usuario ya está en uso'
  }

  // Si no reconocemos el error, mostrarlo tal cual (mejor que "Error inesperado")
  return message || 'Error inesperado. Intenta de nuevo'
}
