'use client'
import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, RotateCcw } from 'lucide-react'
import GameCard from './GameCard'
import { Game } from '@/lib/history'

interface Message {
  role: 'user' | 'assistant'
  content: string
  games?: (Game & { image?: string })[]
}

const SUGGESTIONS = [
  'Quero um RPG com história que me faça chorar, tipo Final Fantasy',
  'Algo como Dark Souls mas menos frustrante para iniciantes',
  'Jogo de estratégia que vicia, tipo "só mais um turno"',
  'Terror psicológico que me deixe com medo de apagar a luz',
  'Indie barato com mais de 50h de conteúdo e muito bem avaliado',
  'Co-op para jogar com amigo, caótico e divertido',
  'Mundo aberto imenso para explorar sem pressa, estilo sandbox',
  'Puzzle desafiador que me faça sentir inteligente ao resolver',
]

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)
  const [recommendedTitles, setRecommendedTitles] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(text?: string) {
    const userText = text || input.trim()
    if (!userText || loading) return

    setInput('')
    setStarted(true)

    const userMsg: Message = { role: 'user', content: userText }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/pc_gaming/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          recommendedTitles,
        }),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const assistantMsg: Message = {
        role: 'assistant',
        content: data.text,
        games: data.games?.length > 0 ? data.games : undefined,
      }

      setMessages(prev => [...prev, assistantMsg])

      // Acumula títulos já recomendados para evitar repetição
      if (data.games?.length > 0) {
        setRecommendedTitles(prev =>
          [...prev, ...data.games.map((g: any) => g.title)].slice(-50)
        )
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠ Erro ao conectar com a IA. Tente novamente.',
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function resetChat() {
    setMessages([])
    setStarted(false)
    setInput('')
    setRecommendedTitles([])
  }

  return (
    <div className="chat-panel">
      {/* Tela inicial com sugestões */}
      {!started && (
        <div className="chat-welcome">
          <div className="chat-welcome-icon">
            <Bot size={32} />
          </div>
          <h2 className="chat-welcome-title">Descreva o jogo ideal</h2>
          <p className="chat-welcome-sub">
            Descreva o que você quer sentir jogando, jogos que já amou, quanto tempo tem disponível, se quer algo desafiador ou relaxante. Quanto mais detalhes, melhores as recomendações.
          </p>
          <div className="chat-suggestions">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="chat-suggestion" onClick={() => sendMessage(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mensagens */}
      {started && (
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-msg chat-msg-${msg.role}`}>
              <div className="chat-msg-avatar">
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div className="chat-msg-content">
                <div className="chat-msg-text">
                  {msg.content.split('\n').map((line, j) => (
                    <p key={j}>{line}</p>
                  ))}
                </div>
                {/* Cards dos jogos recomendados */}
                {msg.games && msg.games.length > 0 && (
                  <div className="chat-games-grid">
                    {msg.games.map((g, gi) => (
                      <GameCard key={`${g.title}-${gi}`} game={g} index={gi} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading */}
          {loading && (
            <div className="chat-msg chat-msg-assistant">
              <div className="chat-msg-avatar"><Bot size={14} /></div>
              <div className="chat-msg-content">
                <div className="chat-typing">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <div className={`chat-input-wrap ${started ? 'chat-input-sticky' : ''}`}>
        {started && (
          <button className="chat-reset" onClick={resetChat} title="Nova conversa">
            <RotateCcw size={14} />
          </button>
        )}
        <textarea
          ref={inputRef}
          className="chat-input"
          placeholder="Ex: quero um RPG de turno com história épica e pixel art..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={loading}
        />
        <button
          className="chat-send"
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  )
}
