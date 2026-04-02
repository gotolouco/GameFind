import { NextRequest, NextResponse } from 'next/server'
import { GAMEFIND_SYSTEM_PROMPT } from '@/lib/prompts'

// ─── Steam Data ──────────────────────────────────────────────────────────────
async function getSteamData(title: string) {
  try {
    const searchRes = await fetch(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(title)}&l=latam&cc=BR`
    )
    const data = await searchRes.json()
    if (data?.items?.length > 0) {
      const appid = data.items[0].id
      return {
        image: `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`,
        steamUrl: `https://store.steampowered.com/app/${appid}`,
        steamScore: data.items[0].metascore || null,
      }
    }
    return { image: null, steamUrl: `https://store.steampowered.com/search/?term=${encodeURIComponent(title)}` }
  } catch {
    return { image: null, steamUrl: `https://store.steampowered.com/search/?term=${encodeURIComponent(title)}` }
  }
}

// Embaralha array para pegar jogos diferentes a cada chamada
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

export async function POST(req: NextRequest) {
  const { topGames, previousTitles = [] } = await req.json()

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY não configurada' }, { status: 500 })
  }

  const randomGames = shuffle(topGames).slice(0, 5)
  const gameList = randomGames.map((g: any) => g.title).join(', ')

  const avoidList = previousTitles.length > 0
    ? `\nIMPORTANTE: NUNCA recomende estes jogos (já foram sugeridos): ${previousTitles.join(', ')}.`
    : ''

  const angles = [
    'Foque em jogos indie surpreendentes e joias escondidas.',
    'Foque em clássicos que todo gamer deveria ter jogado.',
    'Foque em lançamentos recentes dos últimos 2 anos.',
    'Foque em jogos com narrativa e história marcante.',
    'Foque em jogos com muitas horas de conteúdo e replay.',
    'Foque em jogos cooperativos ou multiplayer.',
    'Foque em gêneros diferentes dos jogos listados.',
    'Misture AAA com pequenas produções independentes.',
  ]
  const angle = angles[Math.floor(Math.random() * angles.length)]

  // O User Prompt agora foca apenas no CONTEXTO dinâmico da requisição
  const userContextPrompt = `Aqui está o contexto para a sua curadoria:
  1. Jogos populares no momento: ${gameList}.
  2. Direcionamento criativo: ${angle}${avoidList}
  
  Gere exatamente 6 recomendações baseadas nesse perfil. 
  Lembre-se de retornar APENAS o bloco <games> com os dados em JSON, sem textos adicionais antes ou depois.`

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1500,
        temperature: 0.9, // Reduzi um pouco de 1.1 para 0.9 para evitar quebrar a estrutura JSON/XML, mantendo criatividade
        messages: [
          { role: 'system', content: GAMEFIND_SYSTEM_PROMPT },
          { role: 'user', content: userContextPrompt }
        ],
      }),
    })

    if (!response.ok) {
      const errBody = await response.json()
      console.error('❌ Groq API erro:', response.status, errBody)
      return NextResponse.json({ error: 'Erro na IA' }, { status: 500 })
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || ''

    // Extrai especificamente o conteúdo de dentro das tags <games>
    const match = text.match(/<games>\s*([\s\S]*?)\s*<\/games>/i)
    if (!match) {
      console.error('Retorno inesperado:', text)
      throw new Error('A IA não retornou o bloco <games> esperado.')
    }

    // Limpa caracteres de controle ruins antes do parse
    const cleanJson = match[1].replace(/[\x00-\x09\x0B\x0C\x0E-\x1F]/g, '').trim()
    const parsedGamesArray = JSON.parse(cleanJson)

    // O novo system prompt retorna um Array direto [{}, {}], e não um objeto { "games": [] }
    const gamesWithSteamData = await Promise.all(
      parsedGamesArray.map(async (game: any) => {
        const steamDetails = await getSteamData(game.title)
        return { ...game, image: steamDetails.image, steamUrl: steamDetails.steamUrl }
      })
    )

    return NextResponse.json({ games: gamesWithSteamData })
  } catch (err) {
    console.error('❌ Steam recommend error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}