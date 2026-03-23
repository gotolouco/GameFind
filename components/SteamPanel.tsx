'use client'
import { useState, useEffect } from 'react'
import { Flame, Sparkles, ExternalLink, Rocket, ChevronLeft, ChevronRight } from 'lucide-react'
import GameCard from './GameCard'
import { Game } from '@/lib/history'

type SteamTab = 'top' | 'new' | 'recommend'

interface TopGame {
  appid: number
  title: string
  players2weeks: string
  concurrent: string
  tags: string[]
  image: string
  storeUrl: string
}

interface Release {
  appid: number
  title: string
  releaseDate: string | null
  comingSoon: boolean
  price: string
  discount: number
  originalPrice: string | null
  image: string
  storeUrl: string
  genres: string[]
  rating: number | null
  reviewScore: string | null
  rawgRating: string | null
}

export default function SteamPanel() {
  const [steamTab, setSteamTab] = useState<SteamTab>('top')

  // Top games
  const [topGames, setTopGames] = useState<TopGame[]>([])
  const [loadingTop, setLoadingTop] = useState(false)
  const [errorTop, setErrorTop] = useState(false)

  // New releases
  const [releases, setReleases] = useState<Release[]>([])
  const [relPage, setRelPage] = useState(1)
  const [relTotalPages, setRelTotalPages] = useState(1)
  const [loadingNew, setLoadingNew] = useState(false)
  const [errorNew, setErrorNew] = useState(false)

  // Recommend
  const [recGames, setRecGames] = useState<Game[]>([])
  const [previousTitles, setPreviousTitles] = useState<string[]>([])
  const [loadingRec, setLoadingRec] = useState(false)
  const [errorRec, setErrorRec] = useState(false)

  useEffect(() => { fetchTop() }, [])

  async function fetchTop() {
    setLoadingTop(true)
    setErrorTop(false)
    try {
      const res = await fetch('/api/steam/top')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setTopGames(data.games)
    } catch {
      setErrorTop(true)
    } finally {
      setLoadingTop(false)
    }
  }

  async function fetchReleases(page = 1) {
    setLoadingNew(true)
    setErrorNew(false)
    try {
      const res = await fetch(`/api/steam/deals?page=${page}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setReleases(data.releases || [])
      setRelTotalPages(data.totalPages || 1)
      setRelPage(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setErrorNew(true)
    } finally {
      setLoadingNew(false)
    }
  }

  async function fetchTopAndReturn(): Promise<TopGame[]> {
    try {
      const res = await fetch('/api/steam/top')
      const data = await res.json()
      setTopGames(data.games)
      return data.games
    } catch { return [] }
  }

  async function fetchRecommend() {
    const games = topGames.length > 0 ? topGames : await fetchTopAndReturn()
    setLoadingRec(true)
    setErrorRec(false)
    setRecGames([])
    try {
      const res = await fetch('/api/steam/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topGames: games.slice(0, 12), previousTitles }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setRecGames(data.games)
      setPreviousTitles(prev => [...prev, ...data.games.map((g: Game) => g.title)].slice(-30))
    } catch {
      setErrorRec(true)
    } finally {
      setLoadingRec(false)
    }
  }

  function handleTabChange(t: SteamTab) {
    setSteamTab(t)
    if (t === 'new' && releases.length === 0) fetchReleases(1)
    if (t === 'recommend' && recGames.length === 0) fetchRecommend()
  }

  return (
    <div className="steam-panel">
      <div className="steam-tabs">
        <button className={`steam-tab ${steamTab === 'top' ? 'active' : ''}`} onClick={() => handleTabChange('top')}>
          <Flame size={13} /> Mais Jogados
        </button>
        <button className={`steam-tab ${steamTab === 'new' ? 'active' : ''}`} onClick={() => handleTabChange('new')}>
          <Rocket size={13} /> Lançamentos
        </button>
        <button className={`steam-tab ${steamTab === 'recommend' ? 'active' : ''}`} onClick={() => handleTabChange('recommend')}>
          <Sparkles size={13} /> IA + Steam
        </button>
      </div>

      {/* MAIS JOGADOS */}
      {steamTab === 'top' && (
        <>
          {loadingTop && <div className="steam-loading">Carregando dados da Steam...</div>}
          {errorTop && <div className="steam-error">⚠ Falha ao carregar. <button onClick={fetchTop}>Tentar novamente</button></div>}
          {!loadingTop && !errorTop && topGames.length > 0 && (
            <>
              <div className="section-label">Top jogos agora na Steam <span className="count-badge">{topGames.length}</span></div>
              <div className="top-games-grid">
                {topGames.map((g, i) => (
                  <a key={`${g.appid}-${i}`} href={g.storeUrl} target="_blank" rel="noopener noreferrer" className="top-game-card">
                    <div className="top-rank">#{i + 1}</div>
                    <img src={g.image} alt={g.title} className="top-game-img" />
                    <div className="top-game-info">
                      <div className="top-game-title">{g.title}</div>
                      <div className="top-game-meta">👥 {g.concurrent} simultâneos</div>
                      <div className="top-game-tags">
                        {g.tags.map(t => <span key={t} className="meta-tag">{t}</span>)}
                      </div>
                    </div>
                    <ExternalLink size={12} className="top-game-link" />
                  </a>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* LANÇAMENTOS */}
      {steamTab === 'new' && (
        <>
          {loadingNew && <div className="steam-loading">Buscando lançamentos da Steam...</div>}
          {errorNew && <div className="steam-error">⚠ Falha ao carregar lançamentos.</div>}
          {!loadingNew && !errorNew && releases.length === 0 && (
            <div className="steam-loading">Nenhum lançamento encontrado.</div>
          )}
          {!loadingNew && releases.length > 0 && (
            <>
              <div className="section-label">
                Novidades & Lançamentos
                <span className="count-badge">pág. {relPage + 1}/{relTotalPages}</span>
              </div>
              <div className="releases-grid">
                {releases.map((g, i) => (
                  <a key={`${g.appid}-${i}`} href={g.storeUrl} target="_blank" rel="noopener noreferrer" className="release-card">
                    <div className="release-img-wrap">
                      <img src={g.image} alt={g.title} className="release-img" />
                      {g.comingSoon && <span className="release-soon-badge">Em breve</span>}
                      {g.discount > 0 && <span className="release-discount-badge">-{g.discount}%</span>}
                    </div>
                    <div className="release-info">
                      <div className="release-title">{g.title}</div>
                      <div className="release-meta">
                        {g.genres.map(genre => (
                          <span key={genre} className="meta-tag">{genre}</span>
                        ))}
                        {g.rating && <span className="meta-tag">MC {g.rating}</span>}
                      </div>
                      <div className="release-bottom">
                        <div className="release-price-wrap">
                          {g.originalPrice && <span className="deal-original">{g.originalPrice}</span>}
                          <span className="release-price">{g.price}</span>
                        </div>
                        {g.releaseDate && (
                          <span className="release-date">{g.releaseDate}</span>
                        )}
                      </div>
                      <div className="release-reviews-row">
                        {g.rawgRating && <span>⭐ {g.rawgRating}</span>}
                        {g.reviewScore && <span className="release-reviews">{g.reviewScore}</span>}
                      </div>
                    </div>
                  </a>
                ))}
              </div>

              {relTotalPages > 1 && (
                <div className="pagination">
                  <button className="page-btn" onClick={() => fetchReleases(relPage - 1)} disabled={relPage === 1}>
                    <ChevronLeft size={14} /> Anterior
                  </button>
                  <span className="page-info">Página {relPage + 1} de {relTotalPages}</span>
                  <button className="page-btn" onClick={() => fetchReleases(relPage + 1)} disabled={relPage >= relTotalPages - 1}>
                    Próxima <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* IA + STEAM */}
      {steamTab === 'recommend' && (
        <>
          <div className="steam-rec-header">
            <p className="steam-rec-desc">
              A IA analisa os jogos populares da Steam e recomenda títulos diferentes a cada rodada.
            </p>
            <button className="btn-roll" onClick={fetchRecommend} disabled={loadingRec}>
              {loadingRec ? '⏳ Analisando...' : '✦ NOVA RECOMENDAÇÃO'}
            </button>
          </div>

          {previousTitles.length > 0 && !loadingRec && (
            <p className="rec-variety-hint">
              ✓ {previousTitles.length} jogos já sugeridos — a IA vai recomendar títulos diferentes!
            </p>
          )}

          {loadingRec && (
            <div className="loading show">
              <div className="loader-grid">
                {[...Array(8)].map((_, i) => <div key={i} className="loader-cell" />)}
              </div>
              <p>IA analisando tendências da Steam...</p>
            </div>
          )}

          {errorRec && <div className="steam-error">⚠ Erro ao gerar recomendações.</div>}

          {!loadingRec && recGames.length > 0 && (
            <>
              <div className="section-label" style={{ marginTop: '1.5rem' }}>
                Recomendados com base na Steam <span className="count-badge">{recGames.length}</span>
              </div>
              <div className="games-grid">
                {recGames.map((g, i) => (
                  <GameCard key={`${g.title}-${i}`} game={g} index={i} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
