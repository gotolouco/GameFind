'use client'
import { ChangeEvent, useEffect, useState } from 'react'
import { X, Upload, Save, BadgeCheck, Loader2, Image as ImageIcon } from 'lucide-react'
import { useAuth } from './AuthProvider'
import { updateProfile, uploadAvatar } from '@/lib/profile'

interface Props {
  onClose: () => void
}

export default function UserProfileModal({ onClose }: Props) {
  const { user, profile, badges, avatarUrl, refreshProfile } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setDisplayName(profile?.display_name || '')
    setBio(profile?.bio || '')
  }, [profile?.display_name, profile?.bio])

  const visibleAvatarUrl = avatarPreview || avatarUrl
  const initials = (displayName || profile?.username || user?.email || 'U')
    .split(' ')
    .map((word: string) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setError('')
    setSuccess('')

    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Envie um arquivo de imagem valido.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('A imagem precisa ter no maximo 2MB.')
      return
    }

    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!user) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      let avatarPath = profile?.avatar_path || null

      if (avatarFile) {
        const uploadedPath = await uploadAvatar(user.id, avatarFile)
        if (!uploadedPath) throw new Error('Nao foi possivel enviar o avatar.')
        avatarPath = uploadedPath
      }

      const updated = await updateProfile(user.id, {
        display_name: displayName.trim() || 'Jogador',
        bio: bio.trim() || null,
        avatar_path: avatarPath,
      })

      if (!updated) throw new Error('Nao foi possivel salvar o perfil.')

      setAvatarFile(null)
      setAvatarPreview(null)
      await refreshProfile()
      setSuccess('Perfil atualizado.')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Nao foi possivel salvar o perfil.'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="auth-overlay" onClick={event => event.target === event.currentTarget && onClose()}>
      <div className="profile-modal">
        <div className="auth-header">
          <div className="auth-logo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BadgeCheck size={14} /> Meu perfil
          </div>
          <button className="auth-close" onClick={onClose}><X size={16} /></button>
        </div>

        {!user ? (
          <div className="fav-empty">
            <BadgeCheck size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
            <p>Faca login para editar seu perfil.</p>
          </div>
        ) : (
          <>
            <div className="profile-hero">
              <label className="profile-avatar-picker">
                <span className="profile-avatar-xl">
                  {visibleAvatarUrl ? <img src={visibleAvatarUrl} alt="Foto de perfil" /> : initials}
                </span>
                <span className="profile-avatar-action">
                  <Upload size={13} /> Trocar foto
                </span>
                <input type="file" accept="image/*" onChange={handleAvatarChange} />
              </label>

              <div className="profile-summary">
                <span className="profile-kicker">Jogador</span>
                <strong>{displayName || profile?.username || 'Jogador'}</strong>
                <span>{user.email}</span>
                {bio && <span>{bio}</span>}
              </div>
            </div>

            <label className="profile-field-label" htmlFor="profile-name">Nome do usuario</label>
            <div className="auth-field">
              <input
                id="profile-name"
                className="auth-input profile-input"
                type="text"
                value={displayName}
                onChange={event => setDisplayName(event.target.value)}
                placeholder="Como voce quer aparecer"
                maxLength={40}
              />
            </div>

            <label className="profile-field-label" htmlFor="profile-bio">Bio</label>
            <div className="auth-field">
              <textarea
                id="profile-bio"
                className="auth-input profile-input profile-textarea"
                value={bio}
                onChange={event => setBio(event.target.value)}
                placeholder="Uma frase curta sobre voce"
                maxLength={160}
              />
            </div>

            <div className="profile-badges-head">
              <span><BadgeCheck size={13} /> Badges</span>
              <small>Badges vindos do banco.</small>
            </div>
            <div className="profile-badges">
              {badges.length > 0 ? badges.map((badge) => (
                <span key={badge.id} className="profile-badge cyan" title={badge.description || badge.name}>
                  {badge.icon || null} {badge.name}
                </span>
              )) : (
                <span className="profile-badge locked">
                  <ImageIcon size={11} /> Nenhum badge ainda
                </span>
              )}
            </div>

            {error && <div className="auth-error">{error}</div>}
            {success && <div className="auth-success">{success}</div>}

            <button className="auth-submit profile-save" onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : <><Save size={14} /> Salvar perfil</>}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
