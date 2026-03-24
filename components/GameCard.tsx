'use client'
import { useState, useEffect } from 'react'
import { Heart, Star } from 'lucide-react'
import { useAuth } from './AuthProvider'
import { Game, saveRating, removeRating, getRatings } from '@/lib/history' 
import { addFavorite, removeFavorite, isFavorited } from '@/lib/favorites'

interface Props {
  game: Game & { image?: string }
  index: number
  hideLike?: boolean
}

export default function GameCard({ game, index, hideLike}: Props) {
  const { user } = useAuth()
  const [liked, setLiked] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)
  const [userRating, setUserRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [ratingDone, setRatingDone] = useState(false)

  useEffect(() => {
    // Busca dados APENAS se o usuário estiver logado (direto do Supabase)
    if (user) {
      getRatings().then(ratings => {
        if (ratings[game.title]) { 
          setUserRating(ratings[game.title])
          setRatingDone(true) 
        }
      })
      isFavorited(game.title).then(setLiked)
    } else {
      // Se não tiver usuário (ou se ele deslogar), zera os estados visuais
      setUserRating(0)
      setRatingDone(false)
      setLiked(false)
    }
  }, [game.title, user])

  async function handleLike() {
    if (!user) {
      alert('Faça login para salvar seus jogos favoritos!')
      return
    }
    
    if (likeLoading) return
    setLikeLoading(true)
    
    const newLiked = !liked
    setLiked(newLiked)

    // Salva exclusivamente no Supabase
    if (newLiked) {
      await addFavorite(game)
    } else {
      await removeFavorite(game.title)
    }
    
    window.dispatchEvent(new Event('favoritesUpdated'))

    setLikeLoading(false)
  }

  async function handleRate(star: number) {
    if (!user) {
      alert('Faça login para avaliar os jogos!')
      return
    }

    const newRating = userRating === star ? 0 : star
    setUserRating(newRating)
    setRatingDone(newRating > 0)

    // Salva exclusivamente no Supabase
    if (newRating === 0) {
      await removeRating(game.title)
    } else {
      await saveRating(game.title, newRating)
    }
  }

  const scoreColor = game.score >= 85 ? '#4ade80' : game.score >= 70 ? '#facc15' : '#ff3e6c'
  const ratingLabels = ['', 'Péssimo', 'Ruim', 'Ok', 'Bom', 'Incrível!']

  return (
    <div className="game-card" style={{ animationDelay: `${index * 0.06}s` }}>
      {game.image && (
        <div className="card-image"><img src={game.image} alt={game.title} /></div>
      )}
      <div className="card-body">
        <div className="card-genre">
          <span className="genre-dot" />
          {game.genre} {game.year ? `· ${game.year}` : ''}
        </div>
        <div className="card-title">{game.title}</div>
        <div className="card-desc">{game.description}</div>
        <div className="card-meta">
          {game.tags.map((t) => <span key={t} className="meta-tag">{t}</span>)}
          <span className="meta-score" style={{ color: scoreColor }}>{game.score}/100</span>
          {!hideLike && (
            <button
              className={`like-btn ${liked ? 'liked' : ''}`}
              onClick={handleLike}
              disabled={likeLoading}
              title={user ? (liked ? 'Remover dos favoritos' : 'Favoritar') : 'Faça login para favoritar'}
            >
              <Heart size={14} fill={liked ? '#ff3e6c' : 'none'} />
            </button>
          )}
        </div>
        <div className="card-rating">
          <div className="rating-stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                className="star-btn"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => handleRate(star)}
                title={!user ? 'Faça login para avaliar' : ratingLabels[star]}
              >
                <Star
                  size={15}
                  fill={(hoverRating || userRating) >= star ? '#facc15' : 'none'}
                  color={(hoverRating || userRating) >= star ? '#facc15' : 'var(--muted)'}
                  strokeWidth={1.5}
                />
              </button>
            ))}
          </div>
          <span className="rating-label">
            {hoverRating ? ratingLabels[hoverRating] : ratingDone ? ratingLabels[userRating] : 'Avaliar'}
          </span>
        </div>
        <div className="card-why">✦ {game.why}</div>
      </div>
    </div>
  )
}