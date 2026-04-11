'use client'
import { useState, useEffect } from 'react'
import { getUserRatings, clearAllRatings, removeRating, RatingWithGame } from '@/lib/history'
import { slugifyGameTitle } from '@/lib/games'
import { useAuth } from './AuthProvider'
import { Star, Trash2, X, Loader2 } from 'lucide-react'

interface Props {
  onClose: () => void
}

export default function UserRatingsPanel({ onClose }: Props) {
  const { user } = useAuth()
  const [ratings, setRatings] = useState<RatingWithGame[]>([])
  const [loading, setLoading] = useState(true)
  const [showConfirmClear, setShowConfirmClear] = useState(false)

  const ratingLabels = ['', 'Pessimo', 'Ruim', 'Ok', 'Bom', 'Incrivel!']

  useEffect(() => {
    async function loadRatings() {
      if (!user) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const fetchedRatings = await getUserRatings(user.id)
        setRatings(fetchedRatings)
      } catch (error) {
        console.error('Erro ao carregar avaliacoes:', error)
      } finally {
        setLoading(false)
      }
    }

    loadRatings()
  }, [user])

  async function handleClearRatings() {
    try {
      if (!user) return
      await clearAllRatings(user.id)

      ratings.forEach(item => {
        const gameKey = item.game_id || item.game.slug || slugifyGameTitle(item.game.title)
        window.dispatchEvent(new CustomEvent('ratingSync', {
          detail: { gameKey, rating: 0 }
        }))
      })

      setRatings([])
      setShowConfirmClear(false)
    } catch (error) {
      console.error('Erro ao limpar todas as avaliacoes:', error)
    }
  }

  async function handleRemoveRating(item: RatingWithGame) {
    try {
      if (!user) return
      await removeRating(item.game, user.id)

      const gameKey = item.game_id || item.game.slug || slugifyGameTitle(item.game.title)
      window.dispatchEvent(new CustomEvent('ratingSync', {
        detail: { gameKey, rating: 0 }
      }))

      setRatings(prev => prev.filter(rating => rating.game_id !== item.game_id))
    } catch (error) {
      console.error('Erro ao remover avaliacao:', error)
    }
  }

  const ratedGames = [...ratings].sort((a, b) => b.rating - a.rating)

  return (
    <div className="auth-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="favorites-modal">
        <div className="auth-header">
          <div className="auth-logo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Star size={14} /> Minhas Avaliacoes
          </div>
          <button className="auth-close" onClick={onClose}><X size={16} /></button>
        </div>

        {!user ? (
          <div className="fav-empty" style={{ marginTop: '2rem' }}>
            <Star size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
            <p>Faca login para ver e gerenciar suas avaliacoes.</p>
          </div>
        ) : loading ? (
          <div className="fav-empty" style={{ marginTop: '2rem' }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto', opacity: 0.5 }} />
            <p style={{ marginTop: 8 }}>Carregando avaliacoes...</p>
          </div>
        ) : (
          <div className="history-panel-wrap" style={{ marginTop: '1rem' }}>
            <div className="history-panel">
              <div className="history-header">
                <span className="history-title">
                  <Star size={14} /> Jogos avaliados ({ratedGames.length})
                </span>
                {ratedGames.length > 0 && (
                  <button className="history-clear" onClick={() => setShowConfirmClear(true)}>
                    <Trash2 size={12} /> Limpar
                  </button>
                )}
              </div>

              {ratedGames.length === 0 ? (
                <p className="history-empty">Nenhuma avaliacao ainda. Avalie jogos nos cards!</p>
              ) : (
                <div className="ratings-list">
                  {ratedGames.map(item => (
                    <div key={item.game_id} className="rating-item">
                      <div className="rating-item-stars">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            size={12}
                            fill={item.rating >= star ? '#facc15' : 'none'}
                            color={item.rating >= star ? '#facc15' : 'var(--muted)'}
                            strokeWidth={1.5}
                          />
                        ))}
                      </div>
                      <div className="rating-item-info">
                        <span className="rating-item-title">{item.game.title}</span>
                        <span className="rating-item-label">{ratingLabels[item.rating]}</span>
                      </div>
                      <button
                        className="rating-item-remove"
                        onClick={() => handleRemoveRating(item)}
                        title="Remover avaliacao"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showConfirmClear && (
        <div
          className="auth-overlay confirm-overlay"
          onClick={() => setShowConfirmClear(false)}
        >
          <div
            className="favorites-modal confirm-dialog"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="confirm-title">
              <Trash2 size={20} /> Atencao
            </h3>
            <p className="confirm-text">
              Tem a certeza de que deseja apagar <strong>todas</strong> as suas avaliacoes? Esta acao nao pode ser desfeita.
            </p>

            <div className="confirm-actions">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="confirm-btn-cancel"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearRatings}
                className="confirm-btn-danger"
              >
                Sim, apagar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
