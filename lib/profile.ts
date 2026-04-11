import { createClient } from './supabase'
import { Badge, Profile, ProfileUpdatePayload, UserProfileWithBadges } from './types'

export async function getCurrentProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('Erro ao buscar perfil:', error)
    return null
  }

  return data
}

export async function ensureProfile(userId: string, fallbackEmail?: string | null): Promise<Profile | null> {
  const existing = await getCurrentProfile(userId)
  if (existing) return existing

  const supabase = createClient()
  const fallbackName = fallbackEmail?.split('@')[0] || 'Jogador'
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      display_name: fallbackName,
      username: null,
      bio: null,
      avatar_path: null,
    })
    .select('*')
    .single()

  if (error) {
    console.error('Erro ao criar perfil pelo cliente:', error)
    const response = await fetch('/api/profile/ensure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: fallbackName }),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.profile) {
      console.error('Erro ao criar perfil pelo servidor:', payload?.error || response.statusText)
      return null
    }
    return payload.profile
  }

  return data
}

export async function updateProfile(userId: string, payload: ProfileUpdatePayload): Promise<Profile | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('*')
    .single()

  if (error) {
    console.error('Erro ao atualizar perfil:', error)
    return null
  }

  return data
}

export async function uploadAvatar(userId: string, file: File): Promise<string | null> {
  const supabase = createClient()
  const extension = file.name.split('.').pop() || 'jpg'
  const path = `${userId}/avatar-${Date.now()}.${extension}`
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) {
    console.error('Erro ao enviar avatar:', error)
    return null
  }

  return path
}

export function getAvatarPublicUrl(avatarPath?: string | null) {
  if (!avatarPath) return ''
  const supabase = createClient()
  return supabase.storage.from('avatars').getPublicUrl(avatarPath).data.publicUrl
}

export async function getUserBadges(userId: string): Promise<Badge[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('user_badges')
    .select('badges(*)')
    .eq('user_id', userId)
    .order('awarded_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar badges:', error)
    return []
  }

  return (data || [])
    .map((row: any) => row.badges)
    .filter(Boolean)
}

export async function getUserProfileWithBadges(userId: string, fallbackEmail?: string | null): Promise<UserProfileWithBadges | null> {
  const [profile, badges] = await Promise.all([
    ensureProfile(userId, fallbackEmail),
    getUserBadges(userId),
  ])

  return profile ? { ...profile, badges } : null
}
