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

    // NOVO: Estado para saber qual jogo está tocando a animação de saída (usando o ID)
    const [removingId, setRemovingId] = useState<string | null>(null)

    useEffect(() => {
      if (user) {
        getFavorites().then(favs => {
          setFavorites(favs)
          setLoading(false)
        })
      }
    }, [user])

    // FUNÇÃO DE REMOVER ATUALIZADA COM ATRASO
async function handleRemove(id: string, title: string) {
    if (removingId) return 

    setRemovingId(id)

    try {
      await removeFavorite(title)

      // DISPARA O EVENTO INTELIGENTE: Avisa o ecrã principal para desmarcar o coração na hora!
      window.dispatchEvent(new CustomEvent('favoriteSync', { 
        detail: { title: title, isLiked: false } 
      }))
      
      // Mantém o antigo para outros menus
      window.dispatchEvent(new Event('favoritesUpdated'))

      setTimeout(() => {
        setFavorites(prev => prev.filter(f => f.id !== id))
        setRemovingId(null) 
      }, 500)
    } catch (error) {
      console.error("Erro ao remover favorito:", error)
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
                <div 
                  key={g.id || g.title} 
                  style={{ position: 'relative' }}
                  className={removingId === g.id ? 'game-card-removing' : ''}
                >
                  {/* Avisamos o card para esconder o coração */}
                  <GameCard game={g} index={i} hideLike={true} /> 
                  
                  {/* Botão de lixeira com estilo absoluto para não quebrar o layout */}
                  <button
                    className="fav-remove"
                    onClick={() => handleRemove(g.id!, g.title)}
                    title="Remover dos favoritos"
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: '#0f172a', // Fundo escuro para contrastar
                      border: '1px solid #ff3e6c', // Borda neon
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
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }