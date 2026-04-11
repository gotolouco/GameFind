export interface Profile {
  id: string
  username: string | null
  display_name: string | null
  bio: string | null
  avatar_path: string | null
  created_at: string
  updated_at: string
}

export interface Game {
  id?: string
  slug?: string
  title: string
  genre: string
  release_year?: number | null
  year?: number | null
  description: string
  image_url?: string | null
  image?: string | null
  store_url?: string | null
  storeUrl?: string | null
  metadata?: Record<string, unknown> | null
  score?: number | null
  tags: string[]
  why?: string | null
  created_at?: string
  updated_at?: string
}

export interface Tag {
  id: number
  name: string
  created_at: string
}

export interface UserFavorite {
  user_id: string
  game_id: string
  note: string | null
  score: number | null
  why: string | null
  created_at: string
}

export interface UserGameRating {
  id: string
  user_id: string
  game_id: string
  rating: number
  review: string | null
  created_at: string
  updated_at: string
}

export interface RecommendationSession {
  id: string
  user_id: string
  genre: string
  prompt: string | null
  raw_response: Record<string, unknown> | null
  created_at: string
}

export interface RecommendationSessionGame {
  session_id: string
  game_id: string
  position: number
  reason: string | null
  created_at: string
}

export interface Badge {
  id: number
  code: string
  name: string
  description: string | null
  icon: string | null
  created_at: string
}

export interface UserBadge {
  user_id: string
  badge_id: number
  awarded_at: string
}

export interface UserProfileWithBadges extends Profile {
  badges: Badge[]
}

export interface FavoriteWithGame extends UserFavorite {
  game: Game
}

export interface RatingWithGame extends UserGameRating {
  game: Game
}

export interface RecommendationSessionGameWithGame extends RecommendationSessionGame {
  game: Game
}

export interface RecommendationSessionWithGames extends RecommendationSession {
  games: RecommendationSessionGameWithGame[]
}

export type ProfileUpdatePayload = Partial<Pick<Profile, 'username' | 'display_name' | 'bio' | 'avatar_path'>>
