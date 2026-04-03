'use client'
import { useState, useEffect } from 'react'
import { getRatings, clearAllRatings, removeRating } from '@/lib/history'
import { useAuth } from './AuthProvider'
import { Star, Trash2, X, Loader2 } from 'lucide-react'

interface Props {
  onClose: () => void
}

export default function UserRatingsPanel({ onClose }: Props) {
  const { user } = useAuth() 
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showConfirmClear, setShowConfirmClear] = useState(false)

  const ratingLabels = ['', 'Péssimo', 'Ruim', 'Ok', 'Bom', 'Incrível!']

  useEffect(() => {
    async function loadRatings() {
      if (!user) {
        setLoading(false)
        return
      }
      
      setLoading(true)
      try {
        const fetchedRatings = await getRatings()
        setRatings(fetchedRatings)
      } catch (error) {
        console.error("Erro ao carregar avaliações:", error)
      } finally {
        setLoading(false)
      }
    }
    
    loadRatings()
  }, [user])

  async function handleClearRatings() {
    try {
      await clearAllRatings()
      
      // Sincroniza a remoção em massa com a interface principal
      Object.keys(ratings).forEach(title => {
        window.dispatchEvent(new CustomEvent('ratingSync', { 
          detail: { title: title, rating: 0 } 
        }))
      })
      
      setRatings({})
      setShowConfirmClear(false)
    } catch (error) {
      console.error("Erro ao limpar todas as avaliações:", error)
    }
  }

  async function handleRemoveRating(title: string) {
    try {
      // 1. Remove da base de dados
      await removeRating(title)

      // 2. Avisa os outros componentes (ex: GameCard) para removerem a pintura das estrelas
      window.dispatchEvent(new CustomEvent('ratingSync', { 
        detail: { title: title, rating: 0 } 
      }))

      // 3. Atualiza o estado local de forma imutável
      setRatings(prev => {
        const updated = { ...prev }
        delete updated[title]
        return updated
      })
      
    } catch (error) {
      console.error("Erro ao remover avaliação:", error)
    }
  }

  const ratedGames = Object.entries(ratings).sort((a, b) => b[1] - a[1])

  return (
    <div className="auth-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="favorites-modal">
        <div className="auth-header">
          <div className="auth-logo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Star size={14} /> Minhas Avaliações
          </div>
          <button className="auth-close" onClick={onClose}><X size={16} /></button>
        </div>

        {!user ? (
          <div className="fav-empty" style={{ marginTop: '2rem' }}>
            <Star size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
            <p>Faça login para ver e gerenciar suas avaliações.</p>
          </div>
        ) : loading ? (
          <div className="fav-empty" style={{ marginTop: '2rem' }}>
             <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto', opacity: 0.5 }} />
             <p style={{ marginTop: 8 }}>Carregando avaliações...</p>
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
                <p className="history-empty">Nenhuma avaliação ainda. Avalie jogos nos cards!</p>
              ) : (
                <div className="ratings-list">
                  {ratedGames.map(([title, rating]) => (
                    <div key={title} className="rating-item">
                      <div className="rating-item-stars">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star
                            key={s}
                            size={12}
                            fill={rating >= s ? '#facc15' : 'none'}
                            color={rating >= s ? '#facc15' : 'var(--muted)'}
                            strokeWidth={1.5}
                          />
                        ))}
                      </div>
                      <div className="rating-item-info">
                        <span className="rating-item-title">{title}</span>
                        <span className="rating-item-label">{ratingLabels[rating]}</span>
                      </div>
                      <button
                        className="rating-item-remove"
                        onClick={() => handleRemoveRating(title)}
                        title="Remover avaliação"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE CONFIRMAÇÃO LIMPAR AVALIAÇÕES */}
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
              <Trash2 size={20} /> Atenção
            </h3>
            <p className="confirm-text">
              Tem a certeza de que deseja apagar <strong>todas</strong> as suas avaliações? Esta ação não pode ser desfeita.
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