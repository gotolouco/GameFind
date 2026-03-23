'use client'
import { getHistory, clearHistory, HistorySession } from '@/lib/history'
import { useState, useEffect } from 'react'
import { Clock, Trash2, ChevronDown, ChevronUp, Star } from 'lucide-react'

const RATINGS_KEY = 'gamedrop_ratings'

function getRatings(): Record<string, number> {
  try {
    const raw = localStorage.getItem(RATINGS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

type HistoryTab = 'sessions' | 'ratings'

export default function HistoryPanel() {
  const [historyTab, setHistoryTab] = useState<HistoryTab>('sessions')
  const [history, setHistory] = useState<HistorySession[]>([])
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [expanded, setExpanded] = useState<string | null>(null)

  const ratingLabels = ['', 'Péssimo', 'Ruim', 'Ok', 'Bom', 'Incrível!']

  useEffect(() => {
    setHistory(getHistory())
    setRatings(getRatings())
  }, [historyTab])

  function handleClearSessions() {
    clearHistory()
    setHistory([])
  }

  function handleClearRatings() {
    localStorage.removeItem(RATINGS_KEY)
    setRatings({})
  }

  function handleRemoveRating(title: string) {
    const updated = { ...ratings }
    delete updated[title]
    localStorage.setItem(RATINGS_KEY, JSON.stringify(updated))
    setRatings(updated)
  }

  const ratedGames = Object.entries(ratings).sort((a, b) => b[1] - a[1])

  return (
    <div className="history-panel-wrap">
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
              <button className="history-clear" onClick={handleClearSessions}>
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
                    <span><strong>{session.genre}</strong> — {session.date}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {session.games.length} jogos
                      {expanded === session.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </span>
                  </button>
                  {expanded === session.id && (
                    <ul className="history-games">
                      {session.games.map((g) => (
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
              <button className="history-clear" onClick={handleClearRatings}>
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
  )
}
