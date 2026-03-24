'use client'
import { useState, useEffect } from 'react'
import { useAuth } from './AuthProvider'
import { getFavorites } from '@/lib/favorites'
import { LogOut, Heart, User, ChevronDown } from 'lucide-react'

interface Props {
  onOpenAuth: () => void
  onOpenFavorites: () => void
}

export default function UserMenu({ onOpenAuth, onOpenFavorites }: Props) {
  const { user, loading, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [favCount, setFavCount] = useState(0)

  useEffect(() => {
    if (user) {
      getFavorites().then(favs => setFavCount(favs.length))
    }
  }, [user])

  if (loading) return null

  if (!user) {
    return (
      <button className="auth-trigger" onClick={onOpenAuth}>
        <User size={13} /> Entrar
      </button>
    )
  }

  const initials = (user.user_metadata?.display_name || user.email || 'U')
    .split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="user-menu-wrap">
      <button className="user-trigger" onClick={() => setOpen(!open)}>
        <div className="user-avatar">{initials}</div>
        <ChevronDown size={12} style={{ opacity: 0.6 }} />
      </button>

      {open && (
        <div className="user-dropdown" onMouseLeave={() => setOpen(false)}>
          <div className="user-info">
            <div className="user-avatar lg">{initials}</div>
            <div>
              <div className="user-name">{user.user_metadata?.display_name || 'Jogador'}</div>
              <div className="user-email">{user.email}</div>
            </div>
          </div>
          <div className="user-divider" />
          <button className="user-menu-item" onClick={() => { onOpenFavorites(); setOpen(false) }}>
            <Heart size={13} /> Meus favoritos
            {favCount > 0 && <span className="fav-count">{favCount}</span>}
          </button>
          <div className="user-divider" />
          <button className="user-menu-item danger" onClick={signOut}>
            <LogOut size={13} /> Sair
          </button>
        </div>
      )}
    </div>
  )
}
