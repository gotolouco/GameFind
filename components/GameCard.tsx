'use client'
import { Game } from '@/lib/history'
import { Heart, Star } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from './AuthProvider'
import { addFavorite, removeFavorite, isFavorited } from '@/lib/favorites'

interface Props {
  game: Game & { image?: string }
  index: number
}

const RATINGS_KEY = 'gamedrop_ratings'

function getRatings(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(RATINGS_KEY) || '{}') } catch { return {} }
}

function saveRating(title: string, rating: number) {
  try {
    const r = getRatings(); r[title] = rating
    localStorage.setItem(RATINGS_KEY, JSON.stringify(r))
  } catch {}
}

export default function GameCard({ game, index }: Props) {
  const { user } = useAuth()
  const [liked, setLiked] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)
  const [userRating, setUserRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [ratingDone, setRatingDone] = useState(false)

  useEffect(() => {
    // Carrega nota local
    const ratings = getRatings()
    if (ratings[game.title]) { setUserRating(ratings[game.title]); setRatingDone(true) }
    // Verifica se está favoritado (Supabase se logado, localStorage se não)
    if (user) {
      isFavorited(game.title).then(setLiked)
    } else {
      try {
        const local = JSON.parse(localStorage.getItem('gamedrop_local_favs') || '[]')
        setLiked(local.includes(game.title))
      } catch {}
    }
  }, [game.title, user])

  async function handleLike() {
    if (likeLoading) return
    setLikeLoading(true)
    const newLiked = !liked
    setLiked(newLiked)

    if (user) {
      // Salva no Supabase
      if (newLiked) await addFavorite(game)
      else await removeFavorite(game.title)
    } else {
      // Salva no localStorage
      try {
        const local: string[] = JSON.parse(localStorage.getItem('gamedrop_local_favs') || '[]')
        const updated = newLiked ? [...local, game.title] : local.filter(t => t !== game.title)
        localStorage.setItem('gamedrop_local_favs', JSON.stringify(updated))
      } catch {}
    }
    setLikeLoading(false)
  }

  function handleRate(star: number) {
    const newRating = userRating === star ? 0 : star
    setUserRating(newRating); setRatingDone(newRating > 0)
    saveRating(game.title, newRating)
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
          <button
            className={`like-btn ${liked ? 'liked' : ''}`}
            onClick={handleLike}
            disabled={likeLoading}
            title={user ? (liked ? 'Remover dos favoritos' : 'Favoritar') : 'Entre para favoritar na nuvem'}
          >
            <Heart size={14} fill={liked ? '#ff3e6c' : 'none'} />
          </button>
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
                title={ratingLabels[star]}
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
