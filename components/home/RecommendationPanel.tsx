'use client'
import { useState } from 'react'
import GenrePills from '@/components/GenrePills'
import GameCard from '@/components/GameCard'
import { useAuth } from '@/components/AuthProvider'
import { saveSession, Game } from '@/lib/history'

export default function RecommendationPanel() {
  const { user } = useAuth()
  const [genre, setGenre] = useState('qualquer')
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [previousTitles, setPreviousTitles] = useState<string[]>([])

  async function getRecommendations() {
    setLoading(true)
    setError('')
    setGames([])

    try {
      const response = await fetch('/api/pc_gaming/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genre, previousTitles }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok || data?.error) {
        throw new Error(data?.error || 'Erro ao buscar recomendacoes.')
      }

      setGames(data.games)
      void saveSession(genre, data.games, null, user?.id)
      setPreviousTitles(prev => [...prev, ...data.games.map((game: Game) => game.title)].slice(-30))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar recomendacoes.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  function handleGenreChange(nextGenre: string) {
    setGenre(nextGenre)
    setPreviousTitles([])
    setGames([])
  }

  return (
    <>
      <GenrePills selected={genre} onChange={handleGenreChange} />
      <div className="controls">
        <button className="btn-roll" onClick={getRecommendations} disabled={loading}>
          {loading ? 'Buscando...' : 'ROLAR RECOMENDACOES'}
        </button>
      </div>

      {previousTitles.length > 0 && !loading && (
        <p className="rec-variety-hint">
          {previousTitles.length} jogos ja sugeridos. A IA vai recomendar titulos diferentes.
        </p>
      )}

      {loading && (
        <div className="loading show">
          <div className="loader-grid">
            {[...Array(8)].map((_, index) => <div key={index} className="loader-cell" />)}
          </div>
          <p>Buscando jogos para voce...</p>
        </div>
      )}

      {error && (
        <div className="error-box">{error}</div>
      )}

      {games.length > 0 && !loading && (
        <>
          <div className="section-label">
            Recomendacoes desta rodada <span className="count-badge">{games.length}</span>
          </div>
          <div className="games-grid">
            {games.map((game, index) => (
              <GameCard key={`${game.title}-${index}`} game={game} index={index} />
            ))}
          </div>
        </>
      )}
    </>
  )
}
