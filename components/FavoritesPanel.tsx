'use client'
import { useState, useEffect } from 'react'
import { getFavorites, removeFavorite, FavoriteGame } from '@/lib/favorites'
import { useAuth } from './AuthProvider'
import { Heart, Trash2, X } from 'lucide-react'
import GameCard from './GameCard'

interface Props {
  onClose: () => void
}

export default function FavoritesPanel({ onClose }: Props) {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState<FavoriteGame[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      getFavorites().then(favs => {
        setFavorites(favs)
        setLoading(false)
      })
    }
  }, [user])

  async function handleRemove(title: string) {
    await removeFavorite(title)
    setFavorites(prev => prev.filter(f => f.title !== title))

    window.dispatchEvent(new Event('favoritesUpdated'))
  }

  return (
    <div className="auth-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="favorites-modal">
        <div className="auth-header">
          <div className="auth-logo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Heart size={14} /> Meus Favoritos
          </div>
          <button className="auth-close" onClick={onClose}><X size={16} /></button>
        </div>

        {loading ? (
          <div className="fav-empty">Carregando...</div>
        ) : favorites.length === 0 ? (
          <div className="fav-empty">
            <Heart size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
            <p>Nenhum favorito ainda.</p>
            <p style={{ fontSize: '0.7rem', marginTop: 4 }}>Clique no coração nos cards de jogos para salvar aqui.</p>
          </div>
        ) : (
          <div className="fav-grid">
            {favorites.map((g, i) => (
              <div key={g.id} style={{ position: 'relative' }}>
                <GameCard game={g} index={i} />
                <button
                  className="fav-remove"
                  onClick={() => handleRemove(g.title)}
                  title="Remover dos favoritos"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
