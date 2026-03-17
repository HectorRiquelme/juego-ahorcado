import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import type { Category } from '@/types'
import type { ProposerFormData } from '@/types/game'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { slideUp } from '@/animations/variants'

interface ProposerFormProps {
  onSubmit: (data: ProposerFormData) => void
  maxPowerups: number
  loading?: boolean
}

export default function ProposerForm({ onSubmit, maxPowerups, loading }: ProposerFormProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [formData, setFormData] = useState<ProposerFormData>({
    word: '',
    categoryId: '',
    hint: '',
    hintExtra: '',
    powerupsGranted: maxPowerups,
    difficulty: 2,
  })
  const [errors, setErrors] = useState<Partial<Record<keyof ProposerFormData, string>>>({})

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .eq('is_public', true)
      .order('name')
      .then(({ data }) => setCategories(data ?? []))
  }, [])

  const validate = (): boolean => {
    const newErrors: typeof errors = {}
    if (!formData.word.trim() || formData.word.trim().length < 2) {
      newErrors.word = 'Mínimo 2 caracteres'
    }
    if (formData.word.trim().length > 60) {
      newErrors.word = 'Máximo 60 caracteres'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onSubmit({ ...formData, word: formData.word.trim() })
    }
  }

  return (
    <motion.form
      variants={slideUp}
      initial="hidden"
      animate="visible"
      onSubmit={handleSubmit}
      className="flex flex-col gap-5"
    >
      <div>
        <h2 className="text-xl font-bold text-text mb-1">Tu turno de proponer</h2>
        <p className="text-text-muted text-sm">
          Elige una palabra o frase. El otro jugador intentará adivinarla.
        </p>
      </div>

      {/* Palabra */}
      <Input
        label="Palabra o frase *"
        placeholder="ej: Titanic, La vida es sueño, ñoño..."
        value={formData.word}
        onChange={(e) => setFormData({ ...formData, word: e.target.value })}
        error={errors.word}
        autoFocus
        autoComplete="off"
        spellCheck={false}
      />

      {/* Categoría */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-muted">Categoría</label>
        <select
          value={formData.categoryId}
          onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
          className="bg-bg-surface border border-border rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Sin categoría</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.emoji} {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Pista */}
      <Input
        label="Pista (opcional)"
        placeholder="Una pequeña ayuda para el adivinador"
        value={formData.hint}
        onChange={(e) => setFormData({ ...formData, hint: e.target.value })}
        hint="Se mostrará desde el inicio de la ronda"
      />

      {/* Pista extra (para comodín) */}
      <Input
        label="Pista extra secreta (opcional)"
        placeholder="Se revela solo si usa el comodín 💡"
        value={formData.hintExtra}
        onChange={(e) => setFormData({ ...formData, hintExtra: e.target.value })}
        hint="Solo visible si el adivinador usa el comodín de pista extra"
      />

      {/* Comodines y dificultad */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-muted">
            Comodines del adivinador
          </label>
          <div className="flex gap-2">
            {Array.from({ length: maxPowerups + 1 }, (_, i) => i).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setFormData({ ...formData, powerupsGranted: n })}
                className={`w-10 h-10 rounded-lg border text-sm font-bold transition-all ${
                  formData.powerupsGranted === n
                    ? 'bg-primary border-primary text-white'
                    : 'bg-bg-surface2 border-border text-text-muted hover:border-border-light'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-muted">Dificultad</label>
          <div className="flex gap-2">
            {([1, 2, 3] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setFormData({ ...formData, difficulty: d })}
                className={`flex-1 h-10 rounded-lg border text-xs font-bold transition-all ${
                  formData.difficulty === d
                    ? 'bg-primary border-primary text-white'
                    : 'bg-bg-surface2 border-border text-text-muted hover:border-border-light'
                }`}
              >
                {d === 1 ? '😊' : d === 2 ? '🤔' : '😅'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Button type="submit" loading={loading} size="lg" fullWidth>
        Confirmar y enviar ronda
      </Button>
    </motion.form>
  )
}
