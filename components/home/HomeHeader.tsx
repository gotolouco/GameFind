'use client'
import UserMenu from '@/components/UserMenu'

interface Props {
  onOpenAuth: () => void
  onOpenProfile: () => void
  onOpenFavorites: () => void
  onOpenRatings: () => void
  onOpenHistory: () => void
}

export default function HomeHeader({
  onOpenAuth,
  onOpenProfile,
  onOpenFavorites,
  onOpenRatings,
  onOpenHistory,
}: Props) {
  return (
    <header>
      <div className="header-top">
        <UserMenu
          onOpenAuth={onOpenAuth}
          onOpenProfile={onOpenProfile}
          onOpenFavorites={onOpenFavorites}
          onOpenRatings={onOpenRatings}
          onOpenHistory={onOpenHistory}
        />
      </div>
      <h1>GAMEFIND</h1>
      <p className="subtitle">{'// recomendacoes aleatorias por IA //'}</p>
      <div className="logo-tag">PC Gaming</div>
    </header>
  )
}
