'use client'
import { useState, useEffect } from 'react'
import { getHistory, clearHistory, getRatings, clearAllRatings, removeRating, HistorySession } from '@/lib/history'
import { useAuth } from './AuthProvider'
import { Clock, Trash2, ChevronDown, ChevronUp, Star, X, Loader2 } from 'lucide-react'

type HistoryTab = 'sessions' | 'ratings'

interface Props {
  onClose: () => void
}

export default function HistoryPanel({ onClose }: Props) {
  const { user } = useAuth() 
  const [historyTab, setHistoryTab] = useState<HistoryTab>('sessions')
  const [history, setHistory] = useState<HistorySession[]>([])
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showConfirmClearFavorites, setShowConfirmClearFavorites] = useState(false)
  const [showConfirmClearHistory, setShowConfirmClearHistory] = useState(false)

  const ratingLabels = ['', 'Péssimo', 'Ruim', 'Ok', 'Bom', 'Incrível!']

  useEffect(() => {
    async function loadData() {
      if (user) {
        setLoading(true)
        const [fetchedHistory, fetchedRatings] = await Promise.all([
          getHistory(),
          getRatings()
        ])
        setHistory(fetchedHistory)
        setRatings(fetchedRatings)
      }
      setLoading(false)
    }
    loadData()
  }, [user, historyTab])

  async function handleClearSessions() {

    try {
      await clearHistory()
      setHistory([])
      setShowConfirmClearHistory(false)
    } catch (error) {
      console.error("Erro ao limpar histórico:", error)
    }
  }

async function handleClearRatings() {
    try {
      await clearAllRatings()
      Object.keys(ratings).forEach(title => {
        window.dispatchEvent(new CustomEvent('ratingSync', { 
          detail: { title: title, rating: 0 } 
        }))
      })
      setRatings({})
      setShowConfirmClearFavorites(false)
    } catch (error) {
      console.error("Erro ao limpar todas as avaliações:", error)
    }
  }

async function handleRemoveRating(title: string) {
    try {
      // 1. Remove da base de dados (Supabase)
      await removeRating(title)

      // 2. DISPARA O EVENTO: Avisa o GameCard na página principal para despintar as estrelas!
      // (Passamos rating: 0 porque a avaliação foi excluída)
      window.dispatchEvent(new CustomEvent('ratingSync', { 
        detail: { title: title, rating: 0 } 
      }))

      // 3. Atualiza o estado visual local do próprio Menu para a linha sumir imediatamente
      setRatings(prev => {
        const updated = { ...prev }
        delete updated[title] // Remove a chave do jogo do objeto de avaliações
        return updated
      })
      
    } catch (error) {
      console.error("Erro ao remover avaliação do histórico:", error)
    }
  }

  const ratedGames = Object.entries(ratings).sort((a, b) => b[1] - a[1])

  return (
    <div className="auth-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="favorites-modal">
        <div className="auth-header">
          <div className="auth-logo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={14} /> Meu Histórico
          </div>
          <button className="auth-close" onClick={onClose}><X size={16} /></button>
        </div>

        {!user ? (
          <div className="fav-empty" style={{ marginTop: '2rem' }}>
            <Clock size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
            <p>Faça login para ver seu histórico e avaliações.</p>
          </div>
        ) : loading ? (
          <div className="fav-empty" style={{ marginTop: '2rem' }}>
             <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto', opacity: 0.5 }} />
             <p style={{ marginTop: 8 }}>Carregando dados...</p>
          </div>
        ) : (
          <div className="history-panel-wrap" style={{ marginTop: '1rem' }}>
            {/* Sub-tabs */}
            <div className="history-subtabs">
              <button
                className={`history-subtab ${historyTab === 'sessions' ? 'active' : ''}`}
                onClick={() => setHistoryTab('sessions')}
              >
                <Clock size={13} /> Sessões ({history.length})
              </button>
              <button
                className={`history-subtab ${historyTab === 'ratings' ? 'active' : ''}`}
                onClick={() => setHistoryTab('ratings')}
              >
                <Star size={13} /> Avaliações ({ratedGames.length})
              </button>
            </div>

            {/* SESSÕES */}
            {historyTab === 'sessions' && (
              <div className="history-panel">
                <div className="history-header">
                  <span className="history-title"><Clock size={14} /> Histórico de sessões</span>
                  {history.length > 0 && (
                    <button className="history-clear" onClick={() => setShowConfirmClearHistory(true)}>
                      <Trash2 size={12} /> Limpar
                    </button>
                  )}
                </div>
                {history.length === 0 ? (
                  <p className="history-empty">Nenhuma sessão salva ainda.</p>
                ) : (
                  <div className="history-list">
                    {history.map((session) => (
                      <div key={session.id} className="history-item">
                        <button
                          className="history-item-header"
                          onClick={() => setExpanded(expanded === session.id ? null : session.id)}
                        >
                          {/* Formatando a data do Supabase para o padrão brasileiro */}
                          <span><strong>{session.genre}</strong> — {new Date(session.created_at).toLocaleDateString('pt-BR')}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {session.games?.length || 0} jogos
                            {expanded === session.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </span>
                        </button>
                        {expanded === session.id && (
                          <ul className="history-games">
                            {session.games?.map((g) => (
                              <li key={g.title}>
                                <span className="hg-title">{g.title}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  {ratings[g.title] && (
                                    <span style={{ color: '#facc15', fontSize: '0.6rem' }}>
                                      {'★'.repeat(ratings[g.title])}
                                    </span>
                                  )}
                                  <span className="hg-genre">{g.genre}</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* AVALIAÇÕES */}
            {historyTab === 'ratings' && (
              <div className="history-panel">
                <div className="history-header">
                  <span className="history-title"><Star size={14} /> Meus jogos avaliados</span>
                  {ratedGames.length > 0 && (
                    <button className="history-clear" onClick={() => setShowConfirmClearFavorites(true)}>
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
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL DE CONFIRMAÇÃO LIMPAR AVALIAÇÕES*/}
      {showConfirmClearFavorites && (
        <div 
          className="auth-overlay confirm-overlay" 
          onClick={() => setShowConfirmClearFavorites(false)}
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
                onClick={() => setShowConfirmClearFavorites(false)}
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

      {/* MODAL DE CONFIRMAÇÃO LIMPAR HISTÓRICO*/}
      {showConfirmClearHistory && (
        <div 
          className="auth-overlay confirm-overlay" 
          onClick={() => setShowConfirmClearHistory(false)}
        >
          <div 
            className="favorites-modal confirm-dialog"
            onClick={e => e.stopPropagation()} 
          >
            <h3 className="confirm-title">
              <Trash2 size={20} /> Atenção
            </h3>
            <p className="confirm-text">
              Tem a certeza de que deseja apagar <strong>todo</strong> o seu histórico de sessões? Esta ação não pode ser desfeita.
            </p>
            <div className="confirm-actions">
              <button onClick={() => setShowConfirmClearHistory(false)} className="confirm-btn-cancel">
                Cancelar
              </button>
              <button onClick={handleClearSessions} className="confirm-btn-danger">
                Sim, apagar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}