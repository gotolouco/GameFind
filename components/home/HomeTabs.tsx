'use client'
import { Gamepad2, MessageSquare, Search, Shuffle } from 'lucide-react'
import { HomeTab } from './types'

interface Props {
  activeTab: HomeTab
  onChange: (tab: HomeTab) => void
}

const tabs: Array<{ id: HomeTab; label: string; icon: React.ReactNode }> = [
  { id: 'recommend', label: 'Recomendar', icon: <Shuffle size={13} /> },
  { id: 'chat', label: 'Chat IA', icon: <MessageSquare size={13} /> },
  { id: 'search', label: 'Buscar', icon: <Search size={13} /> },
  { id: 'steam', label: 'Steam', icon: <Gamepad2 size={13} /> },
  { id: 'epic', label: 'Epic Games', icon: <Gamepad2 size={13} /> },
]

export default function HomeTabs({ activeTab, onChange }: Props) {
  return (
    <div className="tabs">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon} {tab.label}
        </button>
      ))}
    </div>
  )
}
