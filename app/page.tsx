'use client'
import { useState } from 'react'
import HomeContent from '@/components/home/HomeContent'
import HomeHeader from '@/components/home/HomeHeader'
import HomeModals from '@/components/home/HomeModals'
import HomeTabs from '@/components/home/HomeTabs'
import { HomeModal, HomeTab } from '@/components/home/types'

export default function Home() {
  const [activeTab, setActiveTab] = useState<HomeTab>('recommend')
  const [activeModal, setActiveModal] = useState<HomeModal | null>(null)

  return (
    <div className="container">
      <HomeHeader
        onOpenAuth={() => setActiveModal('auth')}
        onOpenProfile={() => setActiveModal('profile')}
        onOpenFavorites={() => setActiveModal('favorites')}
        onOpenRatings={() => setActiveModal('ratings')}
        onOpenHistory={() => setActiveModal('history')}
      />

      <HomeTabs activeTab={activeTab} onChange={setActiveTab} />
      <HomeContent activeTab={activeTab} />
      <HomeModals activeModal={activeModal} onClose={() => setActiveModal(null)} />
    </div>
  )
}
