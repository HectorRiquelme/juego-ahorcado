import { useState } from 'react'
import { motion } from 'framer-motion'
import { db } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useProfile } from '@/hooks/useProfile'
import { useAuth } from '@/hooks/useAuth'
import Layout from '@/components/layout/Layout'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { staggerChildren, slideUp } from '@/animations/variants'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { user } = useAuthStore()
  const { profile, loading } = useProfile()
  const { setProfile } = useAuthStore()
  const { signOut } = useAuth()
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    display_name: profile?.display_name ?? '',
    username: profile?.username ?? '',
    bio: profile?.bio ?? '',
  })
  const [saving, setSaving] = useState(false)

  // Sincronizar form cuando carga el perfil
  if (profile && formData.username === '' && profile.username) {
    setFormData({
      display_name: profile.display_name ?? '',
      username: profile.username,
      bio: profile.bio ?? '',
    })
  }

  const handleSave = async () => {
    if (!user || !profile) return
    setSaving(true)
    try {
      const { data, error } = await db
        .from('profiles')
        .update({
          display_name: formData.display_name || null,
          username: formData.username,
          bio: formData.bio || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error
      setProfile(data)
      setEditing(false)
      toast.success('Perfil actualizado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-8">
        <motion.div
          variants={staggerChildren}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-6"
        >
          <motion.div variants={slideUp}>
            <h1 className="text-2xl font-bold text-text">Mi perfil</h1>
          </motion.div>

          {/* Avatar + nombre */}
          <motion.div variants={slideUp} className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/30 flex items-center justify-center text-3xl font-black text-primary-light border border-primary/30">
              {(profile?.display_name ?? profile?.username ?? 'U')[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-text">
                {profile?.display_name ?? profile?.username ?? 'Usuario'}
              </h2>
              <p className="text-text-muted text-sm">@{profile?.username}</p>
              <p className="text-text-subtle text-xs mt-0.5">{user?.email}</p>
            </div>
          </motion.div>

          {/* Formulario */}
          <motion.div variants={slideUp}>
            <Card>
              {editing ? (
                <div className="flex flex-col gap-4">
                  <Input
                    label="Nombre para mostrar"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    placeholder="Como quieres que te vean"
                  />
                  <Input
                    label="Nombre de usuario"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="tu_usuario"
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-muted">Bio</label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Cuéntanos algo de ti (opcional)"
                      rows={3}
                      className="w-full bg-bg-surface border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={handleSave} loading={saving} fullWidth>
                      Guardar cambios
                    </Button>
                    <Button variant="secondary" onClick={() => setEditing(false)} fullWidth>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-text-muted">Información</h3>
                    <button
                      onClick={() => setEditing(true)}
                      className="text-sm text-primary-light hover:text-primary transition-colors"
                    >
                      Editar
                    </button>
                  </div>
                  <div className="space-y-3">
                    <InfoRow label="Usuario" value={`@${profile?.username ?? '—'}`} />
                    <InfoRow label="Nombre" value={profile?.display_name ?? '—'} />
                    <InfoRow label="Bio" value={profile?.bio ?? 'Sin bio'} />
                    <InfoRow label="Email" value={user?.email ?? '—'} />
                  </div>
                </div>
              )}
            </Card>
          </motion.div>

          {/* Peligro */}
          <motion.div variants={slideUp}>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text">Cerrar sesión</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Tu progreso se guarda automáticamente
                  </p>
                </div>
                <Button variant="danger" size="sm" onClick={signOut}>
                  Salir
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </Layout>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs text-text-subtle w-20 pt-0.5 shrink-0">{label}</span>
      <span className="text-sm text-text">{value}</span>
    </div>
  )
}
