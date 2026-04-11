'use client'
import { useState, useEffect } from 'react'
import { getFavorites, removeFavorite, FavoriteGame } from '@/lib/favorites'
import { slugifyGameTitle } from '@/lib/games'
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
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    async function loadFavorites() {
      if (!user) {
        setLoading(false)
        return
      }

      setLoading(true)
      const favs = await getFavorites(user.id)
      setFavorites(favs)
      setLoading(false)
    }

    loadFavorites()
  }, [user])

  async function handleRemove(game: FavoriteGame) {
    if (!user) return
    const key = game.id || game.slug || slugifyGameTitle(game.title)
    if (removingId) return

    setRemovingId(key)

    try {
      await removeFavorite(game, user.id)

      window.dispatchEvent(new CustomEvent('favoriteSync', {
        detail: { gameKey: key, isLiked: false }
      }))
      window.dispatchEvent(new CustomEvent('favoritesUpdated', {
        detail: { delta: -1 }
      }))

      setTimeout(() => {
        setFavorites(prev => prev.filter(f => (f.id || f.slug || slugifyGameTitle(f.title)) !== key))
        setRemovingId(null)
      }, 500)
    } catch (error) {
      console.error('Erro ao remover favorito:', error)
      setRemovingId(null)
    }
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

        {!user ? (
          <div className="fav-empty">
            <Heart size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
            <p>Faca login para ver seus favoritos.</p>
          </div>
        ) : loading ? (
          <div className="fav-empty">Carregando...</div>
        ) : favorites.length === 0 ? (
          <div className="fav-empty">
            <Heart size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
            <p>Nenhum favorito ainda.</p>
            <p style={{ fontSize: '0.7rem', marginTop: 4 }}>Clique no coracao nos cards de jogos para salvar aqui.</p>
          </div>
        ) : (
          <div className="fav-grid">
            {favorites.map((game, index) => {
              const key = game.id || game.slug || slugifyGameTitle(game.title)
              return (
                <div
                  key={key}
                  style={{ position: 'relative' }}
                  className={removingId === key ? 'game-card-removing' : ''}
                >
                  <GameCard game={game} index={index} hideLike={true} />

                  <button
                    className="fav-remove"
                    onClick={() => handleRemove(game)}
                    title="Remover dos favoritos"
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: '#0f172a',
                      border: '1px solid #ff3e6c',
                      color: '#ff3e6c',
                      padding: '6px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      zIndex: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
