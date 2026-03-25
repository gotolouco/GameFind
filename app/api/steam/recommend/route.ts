import { NextRequest, NextResponse } from 'next/server'

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

  // Embaralha e pega só 5 jogos aleatórios do top para variar o contexto
  const randomGames = shuffle(topGames).slice(0, 5)
  const gameList = randomGames.map((g: any) => g.title).join(', ')

  // Informa à IA quais jogos já foram recomendados antes para evitar repetição
  const avoidList = previousTitles.length > 0
    ? `\n\nIMPORTANTE: NÃO recomende nenhum destes jogos que já foram sugeridos antes: ${previousTitles.join(', ')}.`
    : ''

  // Sorteia um "ângulo" de recomendação diferente a cada chamada
  const angles = [
    'Foque em jogos indie surpreendentes e joias escondidas',
    'Foque em clássicos que todo gamer deveria ter jogado',
    'Foque em lançamentos recentes dos últimos 2 anos',
    'Foque em jogos com narrativa e história marcante',
    'Foque em jogos com muitas horas de conteúdo e replay',
    'Foque em jogos cooperativos ou multiplayer',
    'Foque em gêneros diferentes dos jogos listados',
    'Misture AAA com pequenas produções independentes',
  ]
  const angle = angles[Math.floor(Math.random() * angles.length)]

  const prompt = `Você é um especialista em jogos de PC com conhecimento enciclopédico.

Alguns dos jogos mais jogados na Steam agora: ${gameList}

Com base nisso, recomende 6 jogos que esse público vai adorar. ${angle}.${avoidList}

Responda APENAS em JSON puro, sem markdown. Formato exato:
{
  "games": [
    {
      "title": "Nome Exato do Jogo em Inglês",
      "genre": "Gênero principal",
      "year": 2023,
      "description": "Por que quem joga esses jogos vai amar este (2 frases em português)",
      "score": 85,
      "tags": ["tag1", "tag2", "tag3"],
      "why": "Conexão criativa com as tendências do momento (1 frase em português)"
    }
  ]
}

Regras:
- score entre 60 e 100
- tags: 2-4 palavras curtas em português
- Use o nome oficial do jogo em inglês no campo title (para buscar imagens corretamente)
- Seja criativo e surpreendente — evite sempre os mesmos títulos óbvios
- Sempre em português brasileiro nos campos description, why e tags`

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
        temperature: 1.1, // mais alto = mais criativo e variado
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const errBody = await response.json()
      console.error('❌ Groq API erro:', response.status, errBody)
      return NextResponse.json({ error: 'Erro na IA' }, { status: 500 })
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content
    const clean = text
      .replace(/```json|```/g, '')
      .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F]/g, '') // remove bad control chars (keep \n \r)
      .replace(/\n/g, ' ')                             // flatten newlines inside strings
      .trim()
    const parsed = JSON.parse(clean)

    const gamesWithSteamData = await Promise.all(
      parsed.games.map(async (game: any) => {
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
