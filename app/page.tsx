'use client'
import { useState } from 'react'
import { Shuffle, Search, Gamepad2, MessageSquare } from 'lucide-react'
import GenrePills from '@/components/GenrePills' /* GenrePills é um componente que renderiza os botões de seleção de gênero, e chama onChange(gênero) quando um é selecionado */
import GameCard from '@/components/GameCard' /* GameCard é um componente que recebe um objeto game e renderiza um card bonitinho com as informações do jogo, como título, imagem, descrição e tags. Também tem um botão de "favoritar" que salva o jogo nos favoritos do usuário. */
import SearchBar from '@/components/SearchBar' /* SearchBar é um componente que renderiza uma barra de busca onde o usuário pode digitar o nome de um jogo e receber resultados de busca vindos da API do Steam. Cada resultado é renderizado usando o GameCard. */
import HistoryPanel from '@/components/HistoryPanel' /* HistoryPanel é um componente que mostra o histórico de jogos recomendados para o usuário, agrupados por gênero. Ele lê os dados do histórico usando a função getHistory() da lib/history, e renderiza cada jogo usando o GameCard. */
import SteamPanel from '@/components/SteamPanel' /* SteamPanel é um componente que tem 3 abas: "Top Sellers", "Novos Lançamentos" e "Recomendações IA". Ele busca os dados da API do Steam para mostrar os jogos mais vendidos e os novos lançamentos, e também tem uma funcionalidade de recomendações por IA baseada nos jogos mais populares. Cada jogo é renderizado usando o GameCard. */
import ChatPanel from '@/components/ChatPanel' /* ChatPanel é um componente que renderiza um chat onde o usuário pode conversar com uma IA sobre jogos. O usuário pode fazer perguntas como "Qual jogo é melhor, X ou Y?" ou "Me recomende um jogo parecido com Z". A IA responde usando mensagens de texto, e também pode enviar recomendações de jogos que são renderizados usando o GameCard. */
import UserMenu from '@/components/UserMenu' /* UserMenu é um componente que renderiza um menu de usuário no canto superior direito da página. Ele tem opções para "Entrar/Cadastrar", "Meus Favoritos", "Minhas Avaliações" e "Histórico". Cada opção chama uma função passada por props para abrir o modal correspondente (AuthModal, FavoritesPanel, RatingsPanel, HistoryPanel). */
import AuthModal from '@/components/AuthModal' /* AuthModal é um componente que renderiza um modal de autenticação, onde o usuário pode entrar com email e senha, ou se cadastrar. Ele tem um formulário simples e chama as funções de login ou cadastro da lib/auth. */
import RatingsPanel from '@/components/RatingsPanel' /* RatingsPanel é um componente que mostra as avaliações que o usuário fez nos jogos. Ele lê os dados das avaliações usando a função getRatings() da lib/ratings, e renderiza cada avaliação com o título do jogo, a nota dada e um comentário opcional. */
import FavoritesPanel from '@/components/FavoritesPanel' /* FavoritesPanel é um componente que mostra os jogos que o usuário favoritou. Ele lê os dados dos favoritos usando a função getFavorites() da lib/favorites, e renderiza cada jogo usando o GameCard. */
import { saveSession, Game } from '@/lib/history' /* saveSession é uma função que salva a sessão atual de recomendações no histórico do usuário. Ela recebe o gênero selecionado e a lista de jogos recomendados, e salva essas informações com um timestamp. O tipo Game é uma interface que define as propriedades de um jogo, como título, imagem, descrição e tags. */
import EpicGamesPanel from '@/components/EpicGamesPanel'

type Tab = 'recommend' | 'search' | 'history' | 'steam' | 'chat' | 'epic'

export default function Home() {
  const [tab, setTab] = useState<Tab>('recommend')
  const [genre, setGenre] = useState('qualquer')
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [previousTitles, setPreviousTitles] = useState<string[]>([])
  const [showAuth, setShowAuth] = useState(false)
  const [showFavorites, setShowFavorites] = useState(false)
  const [showRatingsPanel, setShowRatingsPanel] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  async function getRecs() {
    setLoading(true); setError(false); setGames([])
    try {
      const res = await fetch('/api/pc_gaming/recommend', {
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
          <UserMenu onOpenAuth={() => setShowAuth(true)} onOpenFavorites={() => setShowFavorites(true)} onOpenRatings={() => setShowRatingsPanel(true)} onOpenHistory={() => setShowHistory(true)} />
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
        <button className={`tab-btn ${tab === 'epic' ? 'active' : ''}`} onClick={() => setTab('epic')}>
          <Gamepad2 size={13} /> Epic Games
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
      {tab === 'epic' && <EpicGamesPanel />}
      {tab === 'chat' && <ChatPanel />}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {showFavorites && <FavoritesPanel onClose={() => setShowFavorites(false)} />}
      {showHistory && <HistoryPanel onClose={() => setShowHistory(false)} />}
      {showRatingsPanel && (<RatingsPanel onClose={() => setShowRatingsPanel(false)} />)}
    </div>
  )
}
