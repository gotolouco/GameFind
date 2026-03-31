'use client'
import { createContext, useContext, useState, ReactNode } from 'react'
import AuthModal from '@/components/AuthModal' // Ajuste o caminho se necessário

interface ModalContextType {
  openAuthModal: () => void
  closeAuthModal: () => void
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

export function ModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const openAuthModal = () => setIsOpen(true)
  const closeAuthModal = () => setIsOpen(false)

  return (
    <ModalContext.Provider value={{ openAuthModal, closeAuthModal }}>
      {children}
      {isOpen && <div className="modal-root"><AuthModal onClose={closeAuthModal} /></div>}
    </ModalContext.Provider>
  )
}

export function useModal() {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useModal deve ser usado dentro de um ModalProvider')
  }
  return context
}