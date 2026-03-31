'use client'
import { useState, useEffect } from 'react'
import { Heart, Star } from 'lucide-react'
import { useAuth } from './AuthProvider'
import { useModal } from '@/components/ModalContext' // <-- Importa o hook do modal
import { Game, saveRating, removeRating, getRatings } from '@/lib/history' 
import { addFavorite, removeFavorite, isFavorited } from '@/lib/favorites'

interface Props {
  game: Game & { image?: string; steamUrl?: string }
  index: number
  hideLike?: boolean
}

export default function GameCard({ game, index, hideLike}: Props) {
  const { user } = useAuth()
  const { openAuthModal } = useModal() // <-- Instancia a função de abrir o modal

  const [liked, setLiked] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)
  const [userRating, setUserRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [ratingDone, setRatingDone] = useState(false)

  // ATUALIZAÇÃO AQUI: Implementação do listener com Pub/Sub
useEffect(() => {
    // Busca inicial ao carregar o ecrã (roda apenas 1 vez)
    if (user) {
      getRatings().then(ratings => {
        if (ratings[game.title]) { 
          setUserRating(ratings[game.title])
          setRatingDone(true) 
        }
      })
      isFavorited(game.title).then(setLiked)
    } else {
      setUserRating(0)
      setRatingDone(false)
      setLiked(false)
    }

    // OUVINTE 1: Sincroniza os Favoritos
    const syncFavorite = (e: Event) => {
      const event = e as CustomEvent<{ title: string; isLiked: boolean }>
      if (event.detail.title === game.title) {
        setLiked(event.detail.isLiked)
      }
    }

    // OUVINTE 2: Sincroniza as Avaliações (NOVO)
    const syncRating = (e: Event) => {
      const event = e as CustomEvent<{ title: string; rating: number }>
      if (event.detail.title === game.title) {
        setUserRating(event.detail.rating)
        setRatingDone(event.detail.rating > 0)
      }
    }

    window.addEventListener('favoriteSync', syncFavorite)
    window.addEventListener('ratingSync', syncRating) // <-- Começa a escutar

    return () => {
      window.removeEventListener('favoriteSync', syncFavorite)
      window.removeEventListener('ratingSync', syncRating) // <-- Limpa ao fechar
    }
  }, [game.title, user])

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
    setLiked(newLiked) // Atualização Otimista local

    // AVISA OS OUTROS CARDS INSTANTANEAMENTE (sem esperar pela base de dados)
    window.dispatchEvent(new CustomEvent('favoriteSync', { 
      detail: { title: game.title, isLiked: newLiked } 
    }))

    try {
      if (newLiked) {
        await addFavorite(game)
      } else {
        await removeFavorite(game.title)
      }
      // Mantemos este evento antigo caso o seu Menu de Utilizador o use para contar os favoritos
      window.dispatchEvent(new Event('favoritesUpdated')) 
    } catch (error) {
      // Rollback se a API falhar
      setLiked(!newLiked)
      window.dispatchEvent(new CustomEvent('favoriteSync', { 
        detail: { title: game.title, isLiked: !newLiked } 
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
    const previousRating = userRating // Guardamos para caso a API falhe
    
    // 1. Atualização Otimista Local
    setUserRating(newRating)
    setRatingDone(newRating > 0)

    // 2. DISPARA O EVENTO: Avisa imediatamente o Menu de Histórico (se estiver aberto)
    window.dispatchEvent(new CustomEvent('ratingSync', { 
      detail: { title: game.title, rating: newRating } 
    }))

    try {
      if (newRating === 0) {
        await removeRating(game.title)
      } else {
        await saveRating(game.title, newRating)
      }
    } catch (error) {
      // 3. Rollback se a API/Internet falhar
      console.error("Erro ao salvar avaliação:", error)
      setUserRating(previousRating)
      setRatingDone(previousRating > 0)
      
      // Avisa os outros para desfazerem também
      window.dispatchEvent(new CustomEvent('ratingSync', { 
        detail: { title: game.title, rating: previousRating } 
      }))
    }
  }

  // Função nova: Impede que o mobile simule o hover se estiver deslogado
  const handleStarHover = (star: number) => {
    if (user) setHoverRating(star)
  }

  const scoreColor = game.score >= 85 ? '#4ade80' : game.score >= 70 ? '#facc15' : '#ff3e6c'
  const ratingLabels = ['', 'Péssimo', 'Ruim', 'Ok', 'Bom', 'Incrível!']
  const steamSearchUrl = `https://store.steampowered.com/search/?term=${encodeURIComponent(game.title)}`

  return (
    <div className="game-card" style={{ animationDelay: `${index * 0.06}s` }}>
      <a 
        href={game.steamUrl || steamSearchUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="card-anchor"
        style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
      >
        {game.image && (
          <div className="card-image">
            <img src={game.image} alt={game.title} />
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
            {game.tags.map((t) => <span key={t} className="meta-tag">{t}</span>)}
            <span className="meta-score" style={{ color: scoreColor }}>{game.score}/100</span>
            
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
                  onMouseEnter={() => handleStarHover(star)} // <-- Usando a função protegida
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