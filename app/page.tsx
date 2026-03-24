'use client'
import { useState } from 'react'
import { Shuffle, Search, Gamepad2, MessageSquare } from 'lucide-react'
import GenrePills from '@/components/GenrePills'
import GameCard from '@/components/GameCard'
import SearchBar from '@/components/SearchBar'
import HistoryPanel from '@/components/HistoryPanel'
import SteamPanel from '@/components/SteamPanel'
import ChatPanel from '@/components/ChatPanel'
import UserMenu from '@/components/UserMenu'
import AuthModal from '@/components/AuthModal'
import FavoritesPanel from '@/components/FavoritesPanel'
import { saveSession, Game } from '@/lib/history'

type Tab = 'recommend' | 'search' | 'history' | 'steam' | 'chat'

export default function Home() {
  const [tab, setTab] = useState<Tab>('recommend')
  const [genre, setGenre] = useState('qualquer')
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [previousTitles, setPreviousTitles] = useState<string[]>([])
  const [showAuth, setShowAuth] = useState(false)
  const [showFavorites, setShowFavorites] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  async function getRecs() {
    setLoading(true); setError(false); setGames([])
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genre, previousTitles }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setGames(data.games)
      saveSession(genre, data.games)
      setPreviousTitles(prev => [...prev, ...data.games.map((g: Game) => g.title)].slice(-30))
    } catch { setError(true) }
    finally { setLoading(false) }
  }

  function handleGenreChange(g: string) {
    setGenre(g); setPreviousTitles([]); setGames([])
  }

  return (
    <div className="container">
      <header>
        <div className="header-top">
          <UserMenu onOpenAuth={() => setShowAuth(true)} onOpenFavorites={() => setShowFavorites(true)} onOpenHistory={() => setShowHistory(true)} />
        </div>
        <h1>GAMEFIND</h1>
        <p className="subtitle">// recomendações aleatórias por IA //</p>
        <div className="logo-tag">🎮 PC Gaming</div>
      </header>

      <div className="tabs">
        <button className={`tab-btn ${tab === 'recommend' ? 'active' : ''}`} onClick={() => setTab('recommend')}>
          <Shuffle size={13} /> Recomendar
        </button>
        <button className={`tab-btn ${tab === 'chat' ? 'active' : ''}`} onClick={() => setTab('chat')}>
          <MessageSquare size={13} /> Chat IA
        </button>
        <button className={`tab-btn ${tab === 'search' ? 'active' : ''}`} onClick={() => setTab('search')}>
          <Search size={13} /> Buscar
        </button>
        <button className={`tab-btn ${tab === 'steam' ? 'active' : ''}`} onClick={() => setTab('steam')}>
          <Gamepad2 size={13} /> Steam
        </button>
      </div>

      {tab === 'recommend' && (
        <>
          <GenrePills selected={genre} onChange={handleGenreChange} />
          <div className="controls">
            <button className="btn-roll" onClick={getRecs} disabled={loading}>
              {loading ? '⏳ Buscando...' : '▶ ROLAR RECOMENDAÇÕES'}
            </button>
          </div>
          {previousTitles.length > 0 && !loading && (
            <p className="rec-variety-hint">✓ {previousTitles.length} jogos já sugeridos — a IA vai recomendar títulos diferentes!</p>
          )}
          {loading && (
            <div className="loading show">
              <div className="loader-grid">{[...Array(8)].map((_, i) => <div key={i} className="loader-cell" />)}</div>
              <p>Buscando jogos para você...</p>
            </div>
          )}
          {error && <div className="error-box">⚠ Erro ao buscar recomendações. Verifique sua GROQ_API_KEY.</div>}
          {games.length > 0 && !loading && (
            <>
              <div className="section-label">Recomendações desta rodada <span className="count-badge">{games.length}</span></div>
              <div className="games-grid">
                {games.map((g, i) => <GameCard key={`${g.title}-${i}`} game={g} index={i} />)}
              </div>
            </>
          )}
        </>
      )}

      {tab === 'search' && <SearchBar />}
      {tab === 'steam' && <SteamPanel />}
      {tab === 'chat' && <ChatPanel />}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {showFavorites && <FavoritesPanel onClose={() => setShowFavorites(false)} />}
      {showHistory && <HistoryPanel onClose={() => setShowHistory(false)} />}
    </div>
  )
}
