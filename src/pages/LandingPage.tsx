import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fadeIn, slideUp, staggerChildren } from '@/animations/variants'
import { useAuthStore } from '@/stores/authStore'
import { IS_DEMO } from '@/lib/demo'

export default function LandingPage() {
  const { user } = useAuthStore()

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <motion.div
        variants={staggerChildren}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-2xl w-full text-center flex flex-col items-center gap-8"
      >
        {/* Logo */}
        <motion.div variants={slideUp} className="flex flex-col items-center gap-4">
          <div className="text-7xl">🪢</div>
          <h1 className="text-5xl sm:text-6xl font-extrabold">
            <span className="text-gradient">Cuellito</span>
          </h1>
          <p className="text-lg text-text-muted max-w-md">
            El juego del ahorcado para dos personas que se quieren. Adivina la palabra, reta a alguien especial.
          </p>
        </motion.div>

        {/* Features */}
        <motion.div
          variants={slideUp}
          className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full"
        >
          {[
            { icon: '⚡', text: 'Tiempo real' },
            { icon: '📊', text: 'Estadísticas' },
            { icon: '🎭', text: 'Comodines' },
            { icon: '💑', text: 'Frases privadas' },
            { icon: '🏆', text: 'Puntajes' },
            { icon: '📱', text: 'En el celular' },
          ].map(({ icon, text }) => (
            <div
              key={text}
              className="glass rounded-xl p-3 flex items-center gap-2"
            >
              <span className="text-xl">{icon}</span>
              <span className="text-sm text-text-muted">{text}</span>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div variants={slideUp} className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          {user ? (
            <>
              <Link
                to="/home"
                className="flex-1 bg-primary hover:bg-primary-hover text-white font-semibold py-3.5 px-6 rounded-xl text-center transition-all duration-200 glow-primary"
              >
                {IS_DEMO ? 'Ver el inicio →' : 'Ir al inicio →'}
              </Link>
              {IS_DEMO && (
                <Link
                  to="/demo"
                  className="flex-1 bg-success/20 border border-success/40 hover:bg-success/30 text-success font-semibold py-3.5 px-6 rounded-xl text-center transition-all duration-200"
                >
                  🎮 Jugar demo
                </Link>
              )}
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className="flex-1 bg-primary hover:bg-primary-hover text-white font-semibold py-3.5 px-6 rounded-xl text-center transition-all duration-200 glow-primary"
              >
                Empezar gratis
              </Link>
              <Link
                to="/auth?mode=login"
                className="flex-1 bg-bg-surface border border-border hover:border-border-light text-text font-semibold py-3.5 px-6 rounded-xl text-center transition-all duration-200"
              >
                Iniciar sesión
              </Link>
            </>
          )}
        </motion.div>

        <motion.p variants={fadeIn} className="text-xs text-text-subtle">
          Completamente gratis. Sin publicidad. Hecho con ❤️
        </motion.p>
      </motion.div>
    </div>
  )
}
