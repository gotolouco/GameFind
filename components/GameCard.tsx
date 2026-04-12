'use client'
import { useState, useEffect } from 'react'
import { Heart, Star } from 'lucide-react'
import { useAuth } from './AuthProvider'
import { useModal } from '@/components/ModalContext' 
import { Game, saveRating, removeRating, getRatings } from '@/lib/history' 
import { addFavorite, removeFavorite, isFavorited } from '@/lib/favorites'
import { slugifyGameTitle } from '@/lib/games'

interface Props {
  // ATUALIZAÇÃO: Alterado de steamUrl para storeUrl (Agnóstico de plataforma)
  game: Game & { image?: string | null; storeUrl?: string | null }
  index: number
  hideLike?: boolean
}

export default function GameCard({ game, index, hideLike}: Props) {
  const { user } = useAuth()
  const { openAuthModal } = useModal() 
  const [liked, setLiked] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)
  const [userRating, setUserRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [ratingDone, setRatingDone] = useState(false)
  const gameKey = game.id || game.slug || slugifyGameTitle(game.title)

  useEffect(() => {
    if (user) {
      getRatings(user.id).then(ratings => {
        const rating = ratings[game.id || ''] || ratings[game.slug || ''] || ratings[slugifyGameTitle(game.title)]
        if (rating) {
          setUserRating(rating)
          setRatingDone(true) 
        }
      })
      isFavorited(game, user.id).then(setLiked)
    } else {
      setUserRating(0)
      setRatingDone(false)
      setLiked(false)
    }

    const syncFavorite = (e: Event) => {
      const event = e as CustomEvent<{ gameKey: string; isLiked: boolean }>
      if (event.detail.gameKey === gameKey) {
        setLiked(event.detail.isLiked)
      }
    }

    const syncRating = (e: Event) => {
      const event = e as CustomEvent<{ gameKey: string; rating: number }>
      if (event.detail.gameKey === gameKey) {
        setUserRating(event.detail.rating)
        setRatingDone(event.detail.rating > 0)
      }
    }

    window.addEventListener('favoriteSync', syncFavorite)
    window.addEventListener('ratingSync', syncRating) 

    return () => {
      window.removeEventListener('favoriteSync', syncFavorite)
      window.removeEventListener('ratingSync', syncRating) 
    }
  }, [game.id, game.slug, game.title, gameKey, user])

  const stopTrigger = (e: React.MouseEvent) => {
    e.stopPropagation() 
  }

  async function handleLike(e: React.MouseEvent) {
    e.preventDefault() 
    e.stopPropagation()
    
    if (!user) {
      openAuthModal()
      return
    }
    
    if (likeLoading) return
    setLikeLoading(true)
    
    const newLiked = !liked
    setLiked(newLiked) 

    window.dispatchEvent(new CustomEvent('favoriteSync', { 
      detail: { gameKey, isLiked: newLiked } 
    }))

    try {
      if (newLiked) {
        await addFavorite(game, user.id)
      } else {
        await removeFavorite(game, user.id)
      }
      window.dispatchEvent(new CustomEvent('favoritesUpdated', {
        detail: { delta: newLiked ? 1 : -1 }
      }))
    } catch (error) {
      setLiked(!newLiked)
      window.dispatchEvent(new CustomEvent('favoriteSync', { 
        detail: { gameKey, isLiked: !newLiked } 
      }))
      console.error("Erro ao processar favorito:", error)
    } finally {
      setLikeLoading(false)
    }
  }

  async function handleRate(e: React.MouseEvent, star: number) {
    e.preventDefault() 
    e.stopPropagation()

    if (!user) {
      openAuthModal()
      return
    }

    const newRating = userRating === star ? 0 : star
    const previousRating = userRating 
    
    setUserRating(newRating)
    setRatingDone(newRating > 0)

    window.dispatchEvent(new CustomEvent('ratingSync', { 
      detail: { gameKey, rating: newRating } 
    }))

    try {
      if (newRating === 0) {
        await removeRating(game, user.id)
      } else {
        await saveRating(game, newRating, null, user.id)
      }

      window.dispatchEvent(new CustomEvent('ratingsUpdated', {
        detail: { gameKey, rating: newRating }
      }))
    } catch (error) {
      console.error("Erro ao guardar avaliação:", error)
      setUserRating(previousRating)
      setRatingDone(previousRating > 0)
      
      window.dispatchEvent(new CustomEvent('ratingSync', { 
        detail: { gameKey, rating: previousRating } 
      }))
    }
  }

  const handleStarHover = (star: number) => {
    if (user) setHoverRating(star)
  }

  // Tratamento da cor da avaliação
  const scoreColor = (game.score ?? 0) >= 85 ? '#4ade80' : (game.score ?? 0) >= 70 ? '#facc15' : '#ff3e6c'
  const scoreStars = game.score !== null && game.score !== undefined
    ? Math.max(0, Math.min(5, game.score / 20))
    : null
  const ratingLabels = ['', 'Péssimo', 'Ruim', 'Ok', 'Bom', 'Incrível!']

  return (
    <div className="game-card" style={{ animationDelay: `${index * 0.06}s` }}>
      <a 
        // ATUALIZAÇÃO: Removido o steamSearchUrl, utilizando diretamente o storeUrl do back-end
        href={game.storeUrl || '#'} 
        target="_blank" 
        rel="noopener noreferrer"
        className="card-anchor"
        style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
      >
        {/* ATUALIZAÇÃO: Prevenção de quebra de layout caso a imagem seja nula */}
        {game.image ? (
          <div className="card-image">
            <img src={game.image} alt={game.title} />
          </div>
        ) : (
          <div className="card-image" style={{ backgroundColor: '#1f2937', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Imagem Indisponível</span>
          </div>
        )}
        
        <div className="card-body">
          <div className="card-genre">
            <span className="genre-dot" />
            {game.genre} {game.year ? `· ${game.year}` : ''}
          </div>
          <div className="card-title">{game.title}</div>
          <div className="card-desc">{game.description}</div>
          
          <div className="card-meta">
            {(game.tags || []).map((t) => <span key={t} className="meta-tag">{t}</span>)}
            
            {/* Opcional: Só exibe o score se a loja o forneceu */}
            {scoreStars !== null && (
               <span
                 className="meta-score"
                 style={{ color: scoreColor }}
                 title={`Nota do jogo: ${scoreStars.toFixed(1)} de 5`}
               >
                 <Star size={11} fill={scoreColor} color={scoreColor} strokeWidth={1.5} />
                 {scoreStars.toFixed(1)}/5
               </span>
            )}
            
            {!hideLike && (
              <button
                className={`like-btn ${liked ? 'liked' : ''}`}
                onClick={handleLike}
                onMouseDown={stopTrigger}
                disabled={likeLoading}
              >
                <Heart size={14} fill={liked ? '#ff3e6c' : 'none'} />
              </button>
            )}
          </div>

          <div className="card-rating" onClick={stopTrigger}>
            <div className="rating-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  className="star-btn"
                  onMouseEnter={() => handleStarHover(star)} 
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={(e) => handleRate(e, star)}
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
      </a>
    </div>
  )
}
