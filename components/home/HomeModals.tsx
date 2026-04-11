'use client'
import AuthModal from '@/components/AuthModal'
import FavoritesPanel from '@/components/FavoritesPanel'
import HistoryPanel from '@/components/HistoryPanel'
import RatingsPanel from '@/components/RatingsPanel'
import UserProfileModal from '@/components/UserProfileModal'
import { HomeModal } from './types'

interface Props {
  activeModal: HomeModal | null
  onClose: () => void
}

export default function HomeModals({ activeModal, onClose }: Props) {
  return (
    <>
      {activeModal === 'auth' && <AuthModal onClose={onClose} />}
      {activeModal === 'profile' && <UserProfileModal onClose={onClose} />}
      {activeModal === 'favorites' && <FavoritesPanel onClose={onClose} />}
      {activeModal === 'history' && <HistoryPanel onClose={onClose} />}
      {activeModal === 'ratings' && <RatingsPanel onClose={onClose} />}
    </>
  )
}
