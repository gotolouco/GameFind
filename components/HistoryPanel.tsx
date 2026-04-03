'use client'
import { useState, useEffect } from 'react'
import { getHistory, clearHistory, HistorySession } from '@/lib/history'
import { useAuth } from './AuthProvider'
import { Clock, Trash2, ChevronDown, ChevronUp, X, Loader2 } from 'lucide-react'

interface Props {
  onClose: () => void
}

export default function HistoryPanel({ onClose }: Props) {
  const { user } = useAuth() 
  const [history, setHistory] = useState<HistorySession[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showConfirmClearHistory, setShowConfirmClearHistory] = useState(false)

  useEffect(() => {
    async function loadData() {
      if (user) {
        setLoading(true)
        try {
          const fetchedHistory = await getHistory()
          setHistory(fetchedHistory)
        } catch (error) {
          console.error("Erro ao carregar histórico:", error)
        } finally {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    }
    loadData()
  }, [user])

  async function handleClearSessions() {
    try {
      await clearHistory()
      setHistory([])
      setShowConfirmClearHistory(false)
    } catch (error) {
      console.error("Erro ao limpar histórico:", error)
    }
  }

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
            <p>Faça login para ver seu histórico de sessões.</p>
          </div>
        ) : loading ? (
          <div className="fav-empty" style={{ marginTop: '2rem' }}>
             <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto', opacity: 0.5 }} />
             <p style={{ marginTop: 8 }}>Carregando dados...</p>
          </div>
        ) : (
          <div className="history-panel-wrap" style={{ marginTop: '1rem' }}>
            
            <div className="history-panel">
              <div className="history-header">
                <span className="history-title">
                  <Clock size={14} /> Histórico de sessões ({history.length})
                </span>
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
            
          </div>
        )}
      </div>

      {/* MODAL DE CONFIRMAÇÃO LIMPAR HISTÓRICO */}
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