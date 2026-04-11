'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { ensureProfile, updateProfile } from '@/lib/profile'
import { X, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'

interface Props {
  onClose: () => void
}

type Mode = 'login' | 'register' | 'forgot'

export default function AuthModal({ onClose }: Props) {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const supabase = createClient()

  async function handleSubmit() {
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        window.dispatchEvent(new Event('authSessionUpdated'))
        onClose()

      } else if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        if (data.user && data.session) {
          await ensureProfile(data.user.id, data.user.email)
          await updateProfile(data.user.id, { display_name: name.trim() || 'Jogador' })
        }
        setSuccess('Conta criada! Verifique seu email para confirmar.')

      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback`,
        })
        if (error) throw error
        setSuccess('Email de recuperação enviado!')
      }
    } catch (err: any) {
      const msg = err.message || 'Erro desconhecido'
      if (msg.includes('Invalid login')) setError('Email ou senha incorretos.')
      else if (msg.includes('already registered')) setError('Este email já está cadastrado.')
      else if (msg.includes('Password should')) setError('A senha precisa ter pelo menos 6 caracteres.')
      else setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSubmit()
  }

  const titles = { login: 'Entrar', register: 'Criar conta', forgot: 'Recuperar senha' }

  return (
    <div className="auth-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="auth-modal">
        <div className="auth-header">
          <div className="auth-logo">GAMEFIND</div>
          <button className="auth-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="auth-title">{titles[mode]}</div>

          {/* Google OAuth */}
          {mode !== 'forgot' && (
            <>
              <button className="auth-google" onClick={handleGoogle} disabled={loading}>
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                
                <span className="auth-google-text">Continuar com Google</span>
              </button>
              <div className="auth-divider"><span>ou</span></div>
            </>
          )}

        {/* Name field (register only) */}
        {mode === 'register' && (
          <div className="auth-field">
            <User size={14} className="auth-field-icon" />
            <input
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={handleKey}
              className="auth-input"
            />
          </div>
        )}

        {/* Email */}
        <div className="auth-field">
          <Mail size={14} className="auth-field-icon" />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={handleKey}
            className="auth-input"
          />
        </div>

        {/* Password */}
        {mode !== 'forgot' && (
          <div className="auth-field">
            <Lock size={14} className="auth-field-icon" />
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKey}
              className="auth-input"
            />
            <button className="auth-eye" onClick={() => setShowPass(!showPass)}>
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        )}

        {/* Forgot link */}
        {mode === 'login' && (
          <button className="auth-link" onClick={() => setMode('forgot')}>
            Esqueci minha senha
          </button>
        )}

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        <button className="auth-submit" onClick={handleSubmit} disabled={loading}>
          {loading ? '...' : titles[mode]}
        </button>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>Não tem conta? <button onClick={() => setMode('register')}>Criar conta</button></>
          ) : mode === 'register' ? (
            <>Já tem conta? <button onClick={() => setMode('login')}>Entrar</button></>
          ) : (
            <button onClick={() => setMode('login')}>Voltar para login</button>
          )}
        </div>
      </div>
    </div>
  )
}
