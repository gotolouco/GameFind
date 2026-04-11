'use client'
import ChatPanel from '@/components/ChatPanel'
import EpicGamesPanel from '@/components/EpicGamesPanel'
import SearchBar from '@/components/SearchBar'
import SteamPanel from '@/components/SteamPanel'
import RecommendationPanel from './RecommendationPanel'
import { HomeTab } from './types'

interface Props {
  activeTab: HomeTab
}

export default function HomeContent({ activeTab }: Props) {
  if (activeTab === 'recommend') return <RecommendationPanel />
  if (activeTab === 'search') return <SearchBar />
  if (activeTab === 'steam') return <SteamPanel />
  if (activeTab === 'epic') return <EpicGamesPanel />
  if (activeTab === 'chat') return <ChatPanel />

  return null
}
