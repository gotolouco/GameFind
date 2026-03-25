import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { GAMEFIND_SYSTEM_PROMPT } from '@/lib/prompts'

// ─── CONFIGURAÇÕES E LIMITES ────────────────────────────────────────────────
const MAX_MESSAGE_LENGTH = 4000  // Aumentado para suportar contextos maiores
const MAX_MESSAGES = 20          // Histórico otimizado
const MAX_TITLES = 60            // Evita repetição de muitos jogos vistos

// ─── LGPD: Anonimização de IP ────────────────────────────────────────────────
function anonymizeIp(ip: string): string {
  return createHash('sha256')
    .update(ip + (process.env.IP_HASH_SALT || 'gamefind-salt'))
    .digest('hex')
    .slice(0, 16)
}

// ─── Rate Limiting ───────────────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number; blocked: boolean }>()
const RATE_LIMIT_NORMAL = 20
const RATE_LIMIT_WINDOW = 60_000 
const RATE_LIMIT_BLOCK = 50
const BLOCK_DURATION = 5 * 60_000

function checkRateLimit(hashedIp: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(hashedIp)

  if (entry?.blocked && now < entry.resetAt) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(hashedIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW, blocked: false })
    return { allowed: true }
  }

  entry.count++
  if (entry.count > RATE_LIMIT_BLOCK) {
    entry.blocked = true
    entry.resetAt = now + BLOCK_DURATION
    return { allowed: false, retryAfter: BLOCK_DURATION / 1000 }
  }

  if (entry.count > RATE_LIMIT_NORMAL) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  return { allowed: true }
}

// ─── Monitoramento de Logs ──────────────────────────────────────────────────
function secureLog(level: 'info' | 'warn' | 'error', event: string, meta?: Record<string, any>) {
  const safeLog = {
    ts: new Date().toISOString(),
    level,
    event,
    ...(meta && {
      msgCount: meta.msgCount,
      hasGames: meta.hasGames,
      status: meta.status,
      errorType: meta.errorType,
    }),
  }
  console[level === 'info' ? 'log' : level](JSON.stringify(safeLog))
}

// ─── Validação e Sanitização ────────────────────────────────────────────────
function validateMessages(messages: any[]): { valid: boolean; reason?: string } {
  if (!Array.isArray(messages)) return { valid: false, reason: 'formato inválido' }
  if (messages.length === 0) return { valid: false, reason: 'sem mensagens' }
  if (messages.length > MAX_MESSAGES) return { valid: false, reason: 'histórico longo demais' }

  for (const m of messages) {
    if (typeof m !== 'object' || m === null) return { valid: false, reason: 'mensagem inválida' }
    if (!['user', 'assistant'].includes(m.role)) return { valid: false, reason: 'role inválido' }
    if (typeof m.content !== 'string') return { valid: false, reason: 'conteúdo inválido' }
    
    // Validação rigorosa apenas para o usuário para evitar o erro 400 no histórico da IA
    if (m.role === 'user' && m.content.length > MAX_MESSAGE_LENGTH) {
      return { valid: false, reason: 'mensagem longa demais' }
    }
  }
  return { valid: true }
}

function sanitize(text: string): string {
  return text
    .slice(0, MAX_MESSAGE_LENGTH)
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/\0/g, '')
    .trim()
}

// ─── Steam Data ──────────────────────────────────────────────────────────────
async function getSteamData(title: string) {
  try {
    const searchRes = await fetch(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(title)}&l=latam&cc=BR`,
      { signal: AbortSignal.timeout(5000) }
    )
    const data = await searchRes.json()
    if (data?.items?.length > 0) {
      const appid = data.items[0].id
      return {
        image: `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`,
        storeUrl: `https://store.steampowered.com/app/${appid}`,
        steamScore: data.items[0].metascore || null,
      }
    }
    return { image: null, storeUrl: `https://store.steampowered.com/search/?term=${encodeURIComponent(title)}` }
  } catch {
    return { image: null, storeUrl: `https://store.steampowered.com/search/?term=${encodeURIComponent(title)}` }
  }
}

// ─── Handler Principal ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const rawIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const hashedIp = anonymizeIp(rawIp)

  const rateCheck = checkRateLimit(hashedIp)
  if (!rateCheck.allowed) {
    secureLog('warn', 'rate_limit_exceeded', { status: 429 })
    return NextResponse.json({ error: 'Muitas requisições. Aguarde.' }, { status: 429 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { messages, recommendedTitles = [] } = body

  const validation = validateMessages(messages)
  if (!validation.valid) {
    secureLog('warn', 'validation_failed', { status: 400, errorType: validation.reason })
    return NextResponse.json({ error: `Erro: ${validation.reason}` }, { status: 400 })
  }

  const sanitizedMessages = messages.map((m: any) => ({
    role: m.role,
    content: m.role === 'user' ? sanitize(m.content) : String(m.content).slice(0, 5000),
  }))

  // Montagem do Prompt Final
  const avoidList = recommendedTitles.slice(0, MAX_TITLES).map((t: string) => `- ${t}`).join('\n')
  const fullSystemPrompt = avoidList 
    ? `${GAMEFIND_SYSTEM_PROMPT}\n\n## JOGOS JÁ VISTOS (NÃO REPETIR):\n${avoidList}`
    : GAMEFIND_SYSTEM_PROMPT

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 2000,
        temperature: 0.7, // Baixa temperatura para maior precisão e menos "conversa"
        messages: [
          { role: 'system', content: fullSystemPrompt },
          ...sanitizedMessages,
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    })

    if (!groqRes.ok) throw new Error('Groq API Error')

    const data = await groqRes.json()
    const content = data.choices?.[0]?.message?.content || ''

    // Extração do Bloco <games>
    const gamesMatch = content.match(/<games>([\s\S]*?)<\/games>/)
    let games: any[] = []
    let text = content

    if (gamesMatch) {
      try {
        const raw = gamesMatch[1].replace(/\n/g, ' ').trim()
        const parsed = JSON.parse(raw)
        games = Array.isArray(parsed) ? parsed.slice(0, 6) : []
        text = content.replace(/<games>[\s\S]*?<\/games>/, '').trim()
      } catch (e) {
        secureLog('warn', 'games_parse_failed')
      }
    }

    // Enriquecimento com Steam Data
    if (games.length > 0) {
      games = await Promise.all(games.map(async (g: any) => {
        const steam = await getSteamData(g.title)
        return { ...g, ...steam }
      }))
    }

    secureLog('info', 'request_completed', { status: 200, hasGames: games.length > 0 })

    return NextResponse.json({ text, games }, {
      headers: { 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' }
    })

  } catch (err: any) {
    secureLog('error', 'unexpected_error', { errorType: err?.name })
    return NextResponse.json({ error: 'Erro ao processar sua solicitação.' }, { status: 500 })
  }
}