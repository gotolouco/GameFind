import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import { ModalProvider } from '@/components/ModalContext'

export const metadata: Metadata = {
  title: 'GAMEFIND — Recomendador de Jogos',
  description: 'Descubra jogos de PC aleatórios com recomendações por IA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <ModalProvider>
            {children}
          </ModalProvider>
        </AuthProvider>
      </body>
    </html>
  )
}