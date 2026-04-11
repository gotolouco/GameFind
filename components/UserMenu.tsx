'use client'
import { useState, useEffect } from 'react'
import { useAuth } from './AuthProvider'
import { getFavorites } from '@/lib/favorites'
import { LogOut, Heart, User, ChevronDown, Clock, Star, BadgeCheck } from 'lucide-react'

interface Props {
  onOpenAuth: () => void
  onOpenProfile: () => void
  onOpenFavorites: () => void
  onOpenHistory: () => void
  onOpenRatings: () => void
}

export default function UserMenu({ onOpenAuth, onOpenProfile, onOpenFavorites, onOpenHistory, onOpenRatings}: Props) {
  const { user, profile, avatarUrl, loading, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [favCount, setFavCount] = useState(0)

  // Atualizado para buscar inicialmente e escutar eventos de mudança
  useEffect(() => {
    function fetchFavCount() {
      if (user) {
        getFavorites(user.id).then(favs => setFavCount(favs.length))
      } else {
        setFavCount(0)
      }
    }

    function syncFavCount(event: Event) {
      const detail = (event as CustomEvent<{ delta?: number }>).detail
      if (typeof detail?.delta === 'number') {
        setFavCount(current => Math.max(0, current + detail.delta!))
        return
      }

      fetchFavCount()
    }

    // Carrega a quantidade assim que o menu aparece ou o user loga
    fetchFavCount()

    // Fica escutando o evento 'favoritesUpdated' que vamos disparar nos outros componentes
    window.addEventListener('favoritesUpdated', syncFavCount)

    // Remove a escuta ao desmontar para evitar vazamento de memória
    return () => {
      window.removeEventListener('favoritesUpdated', syncFavCount)
    }
  }, [user])

  if (loading) {
    return (
      <button className="auth-trigger" type="button" disabled>
        <User size={13} /> ...
      </button>
    )
  }

  if (!user) {
    return (
      <button className="auth-trigger" onClick={onOpenAuth}>
        <User size={13} /> Entrar
      </button>
    )
  }

  const displayName = profile?.display_name || profile?.username || 'Jogador'
  const initials = (displayName || user.email || 'U')
    .split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="user-menu-wrap">
      <button className="user-trigger" onClick={() => setOpen(!open)}>
        <div className="user-avatar">
          {avatarUrl ? <img src={avatarUrl} alt="" /> : initials}
        </div>
        <ChevronDown size={12} style={{ opacity: 0.6 }} />
      </button>

      {open && (
        <div className="user-dropdown" onMouseLeave={() => setOpen(false)}>
          <div className="user-info">
            <div className="user-avatar lg">
              {avatarUrl ? <img src={avatarUrl} alt="" /> : initials}
            </div>
            <div>
              <div className="user-name">{displayName}</div>
              <div className="user-email">{user.email}</div>
            </div>
          </div>
          <div className="user-divider" />
          <button className="user-menu-item" onClick={() => { onOpenProfile(); setOpen(false) }}>
            <BadgeCheck size={13} /> Meu perfil
          </button>
          <button className="user-menu-item" onClick={() => { onOpenFavorites(); setOpen(false) }}>
            <Heart size={13} /> Meus favoritos
            {favCount > 0 && <span className="fav-count">{favCount}</span>}
          </button>
          <button className="user-menu-item" onClick={() => { onOpenRatings(); setOpen(false) }}>
            <Star size={13} /> Minhas avaliações
          </button>
          <button className="user-menu-item" onClick={() => { onOpenHistory(); setOpen(false) }}>
            <Clock size={13} /> Historico
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
