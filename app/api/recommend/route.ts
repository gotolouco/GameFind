import { NextRequest, NextResponse } from 'next/server'

// Busca imagem do jogo na RAWG API
async function fetchGameImage(title: string): Promise<string | null> {
  try {
    const rawgKey = process.env.RAWG_API_KEY
    const url = rawgKey
      ? `https://api.rawg.io/api/games?search=${encodeURIComponent(title)}&page_size=1&key=${rawgKey}`
      : `https://api.rawg.io/api/games?search=${encodeURIComponent(title)}&page_size=1`

    const res = await fetch(url)
    const data = await res.json()
    return data.results?.[0]?.background_image || null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const { genre, previousTitles = [] } = await req.json()

  const genrePrompt =
    genre === 'qualquer'
      ? 'de qualquer gênero (misture bastante os gêneros)'
      : `do gênero ${genre} (pode incluir subgêneros relacionados)`

  const avoidList = previousTitles.length > 0
    ? `\n\nIMPORTANTE: NÃO recomende nenhum destes jogos que já foram sugeridos: ${previousTitles.join(', ')}.`
    : ''

  const angles = [
    'Foque em jogos indie surpreendentes e joias escondidas',
    'Foque em clássicos que todo gamer deveria ter jogado',
    'Foque em lançamentos recentes dos últimos 2 anos',
    'Foque em jogos com narrativa e história marcante',
    'Foque em jogos com muitas horas de conteúdo e replay',
    'Foque em jogos cooperativos ou multiplayer',
    'Misture AAA com pequenas produções independentes',
    'Foque em jogos com mecânicas únicas e inovadoras',
  ]
  const angle = angles[Math.floor(Math.random() * angles.length)]

  const prompt = `Você é um especialista em jogos de PC. Recomende 6 jogos ${genrePrompt} de forma aleatória e surpreendente. ${angle}.${avoidList}

Responda APENAS em JSON puro, sem markdown, sem explicação fora do JSON. Use este formato exato:
{
  "games": [
    {
      "title": "Nome Exato do Jogo em Inglês",
      "genre": "Gênero principal",
      "year": 2023,
      "description": "Descrição curta e envolvente em português (2-3 frases)",
      "score": 85,
      "tags": ["tag1", "tag2", "tag3"],
      "why": "Por que jogar agora: uma frase criativa e motivadora em português"
    }
  ]
}

Regras:
- score entre 60 e 100
- tags: 2-4 palavras-chave curtas em português
- Use o nome oficial em inglês no campo title (para buscar imagens corretamente)
- Seja criativo e surpreendente — evite sempre os mesmos títulos óbvios
- Sempre em português brasileiro nos campos description, why e tags`

  if (!process.env.GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY não encontrada no .env.local')
    return NextResponse.json({ error: 'GROQ_API_KEY não configurada' }, { status: 500 })
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1200,
        temperature: 1.0,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const errBody = await response.json()
      console.error('❌ Groq API erro:', response.status, JSON.stringify(errBody))
      return NextResponse.json(
        { error: `Groq API: ${response.status} — ${errBody?.error?.message || 'erro desconhecido'}` },
        { status: 500 }
      )
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content

    if (!text) {
      console.error('❌ Groq não retornou conteúdo:', JSON.stringify(data))
      return NextResponse.json({ error: 'Groq não retornou conteúdo' }, { status: 500 })
    }

    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    // Busca imagens para todos os jogos em paralelo
    const gamesWithImages = await Promise.all(
      parsed.games.map(async (game: any) => ({
        ...game,
        image: await fetchGameImage(game.title),
      }))
    )

    return NextResponse.json({ games: gamesWithImages })
  } catch (err) {
    console.error('❌ Groq error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
