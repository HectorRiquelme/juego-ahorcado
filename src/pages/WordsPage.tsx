import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase, db } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { WordEntry, Category } from '@/types'
import Layout from '@/components/layout/Layout'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { staggerChildren, slideUp } from '@/animations/variants'
import { IS_DEMO, DEMO_CATEGORIES, DEMO_WORDS } from '@/lib/demo'
import toast from 'react-hot-toast'

export default function WordsPage() {
  const { user } = useAuthStore()
  const [words, setWords] = useState<WordEntry[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    word: '',
    hint: '',
    categoryId: '',
    isPublic: false,
    difficulty: 2 as 1 | 2 | 3,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (IS_DEMO) {
      setWords(DEMO_WORDS)
      setCategories(DEMO_CATEGORIES)
      setLoading(false)
      return
    }
    if (!user) return
    Promise.all([
      supabase.from('word_entries').select('*').eq('created_by', user.id).order('created_at', { ascending: false }),
      supabase.from('categories').select('*').or(`is_system.eq.true,created_by.eq.${user.id}`).order('name'),
    ]).then(([{ data: ws }, { data: cats }]) => {
      setWords(ws ?? [])
      setCategories(cats ?? [])
      setLoading(false)
    })
  }, [user])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.word.trim() || !user) return
    setSaving(true)
    try {
      const { data, error } = await db.from('word_entries').insert({
        word: formData.word.trim(),
        hint: formData.hint || null,
        category_id: formData.categoryId || null,
        is_public: formData.isPublic,
        difficulty: formData.difficulty,
        created_by: user.id,
        language: 'es',
      }).select().single()

      if (error) throw error
      setWords([data as import('@/types').WordEntry, ...words])
      setModalOpen(false)
      setFormData({ word: '', hint: '', categoryId: '', isPublic: false, difficulty: 2 })
      toast.success('Palabra añadida')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    await supabase.from('word_entries').delete().eq('id', id)
    setWords(words.filter((w) => w.id !== id))
    toast.success('Palabra eliminada')
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <motion.div
          variants={staggerChildren}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-6"
        >
          <motion.div variants={slideUp} className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text">Mis palabras</h1>
              <p className="text-text-muted text-sm mt-1">
                Palabras y frases personalizadas para el juego
              </p>
            </div>
            <Button onClick={() => setModalOpen(true)}>+ Añadir</Button>
          </motion.div>

          {loading && (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && words.length === 0 && (
            <motion.div variants={slideUp} className="text-center py-12">
              <p className="text-5xl mb-4">📝</p>
              <p className="text-text-muted">No tienes palabras personalizadas aún</p>
              <p className="text-text-subtle text-sm mt-1">
                Añade tus propias palabras para usarlas en el juego
              </p>
            </motion.div>
          )}

          <div className="flex flex-col gap-3">
            {words.map((word) => {
              const cat = categories.find((c) => c.id === word.category_id)
              return (
                <motion.div key={word.id} variants={slideUp}>
                  <Card>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-text truncate">{word.word}</p>
                        {word.hint && (
                          <p className="text-xs text-text-muted mt-0.5 truncate">
                            💡 {word.hint}
                          </p>
                        )}
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {cat && (
                            <Badge variant="primary" size="sm">
                              {cat.emoji} {cat.name}
                            </Badge>
                          )}
                          <Badge
                            variant={word.difficulty === 1 ? 'success' : word.difficulty === 3 ? 'error' : 'default'}
                            size="sm"
                          >
                            {word.difficulty === 1 ? 'Fácil' : word.difficulty === 2 ? 'Medio' : 'Difícil'}
                          </Badge>
                          {!word.is_public && <Badge size="sm">Privada</Badge>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(word.id)}
                        className="text-text-subtle hover:text-accent transition-colors p-1"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </div>

      {/* Modal para añadir */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Añadir palabra">
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          <Input
            label="Palabra o frase *"
            placeholder="Escribe la palabra o frase"
            value={formData.word}
            onChange={(e) => setFormData({ ...formData, word: e.target.value })}
            autoFocus
          />
          <Input
            label="Pista (opcional)"
            placeholder="Una pista para el adivinador"
            value={formData.hint}
            onChange={(e) => setFormData({ ...formData, hint: e.target.value })}
          />
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
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm text-text-muted">Hacer pública</span>
            </label>
          </div>
          <Button type="submit" loading={saving} fullWidth>Guardar</Button>
        </form>
      </Modal>
    </Layout>
  )
}
