'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import { getAvatarPublicUrl, getUserProfileWithBadges } from '@/lib/profile'
import { Badge, UserProfileWithBadges } from '@/lib/types'

interface AuthContextType {
  user: User | null
  profile: UserProfileWithBadges | null
  badges: Badge[]
  avatarUrl: string
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  badges: [],
  avatarUrl: '',
  loading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfileWithBadges | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function loadProfile(authUser: User | null) {
    if (!authUser) {
      setProfile(null)
      return
    }

    try {
      const nextProfile = await getUserProfileWithBadges(authUser.id, authUser.email)
      setProfile(nextProfile)
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
      setProfile(null)
    }
  }

  useEffect(() => {
    function refreshAuthState() {
      supabase.auth.getUser()
      .then(({ data: { user } }) => {
        setUser(user)
        setLoading(false)
        void loadProfile(user)
      })
      .catch(error => {
        console.error('Erro ao carregar sessao:', error)
        setUser(null)
        setProfile(null)
        setLoading(false)
      })
    }

    refreshAuthState()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null
      setUser(nextUser)
      setLoading(false)
      void loadProfile(nextUser)
    })

    window.addEventListener('authSessionUpdated', refreshAuthState)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('authSessionUpdated', refreshAuthState)
    }
  }, [])

  async function refreshProfile() {
    await loadProfile(user)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const badges = profile?.badges || []
  const avatarUrl = getAvatarPublicUrl(profile?.avatar_path)

  return (
    <AuthContext.Provider value={{ user, profile, badges, avatarUrl, loading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
