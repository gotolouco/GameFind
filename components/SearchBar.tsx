'use client'
import { Search, X } from 'lucide-react'
import { useState } from 'react'
import GameCard from './GameCard'
import { Game } from '@/lib/history'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<(Game & { image?: string })[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function handleSearch() {
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch(`/api/pc_gaming/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(data.games || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  function handleClear() {
    setQuery('')
    setResults([])
    setSearched(false)
  }

  return (
    <div className="search-section">
      <div className="search-wrapper">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Buscar jogo específico..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        {query && (
          <button className="search-clear" onClick={handleClear}>
            <X size={14} />
          </button>
        )}
        <button className="search-btn" onClick={handleSearch} disabled={loading}>
          {loading ? '...' : 'Buscar'}
        </button>
      </div>

      {searched && !loading && results.length === 0 && (
        <p className="search-empty">Nenhum jogo encontrado para "{query}"</p>
      )}

      {results.length > 0 && (
        <div className="games-grid" style={{ marginTop: '1.5rem' }}>
          {results.map((g, i) => (
            <GameCard key={g.title} game={g} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
