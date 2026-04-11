import { NextRequest, NextResponse } from 'next/server'

function extractJsonObject(text: string) {
  const clean = text.replace(/```json|```/g, '').trim()
  const firstBrace = clean.indexOf('{')
  const lastBrace = clean.lastIndexOf('}')

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('A IA respondeu sem JSON valido.')
  }

  return clean.slice(firstBrace, lastBrace + 1)
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Erro inesperado ao gerar recomendacoes.'
}

async function getSteamData(title: string) {
  try {
    const response = await fetch(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(title)}&l=latam&cc=BR`,
      { next: { revalidate: 60 * 60 * 12 } }
    )

    if (!response.ok) throw new Error(`Steam respondeu ${response.status}`)

    const data = await response.json()
    const game = data?.items?.[0]

    if (!game) {
      return {
        image: null,
        storeUrl: `https://store.steampowered.com/search/?term=${encodeURIComponent(title)}`,
        steamScore: null,
      }
    }

    return {
      image: `https://cdn.akamai.steamstatic.com/steam/apps/${game.id}/header.jpg`,
      storeUrl: `https://store.steampowered.com/app/${game.id}`,
      steamScore: game.metascore || null,
    }
  } catch (error) {
    console.error(`Erro ao buscar Steam Data para ${title}:`, error)
    return {
      image: null,
      storeUrl: `https://store.steampowered.com/search/?term=${encodeURIComponent(title)}`,
      steamScore: null,
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { genre, previousTitles = [] } = await req.json()

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY nao configurada.' }, { status: 500 })
    }

    const genrePrompt =
      genre === 'qualquer'
        ? 'de qualquer genero, misturando bastante os estilos'
        : `do genero ${genre}, podendo incluir subgeneros relacionados`

    const avoidList = previousTitles.length > 0
      ? `\n\nNao recomende estes jogos: ${previousTitles.join(', ')}.`
      : ''

    const angles = [
      'Foque em jogos indie surpreendentes',
      'Foque em classicos essenciais',
      'Foque em lancamentos recentes dos ultimos 2 anos',
      'Foque em narrativa marcante',
      'Foque em alto fator replay',
      'Misture AAA com independentes',
    ]
    const angle = angles[Math.floor(Math.random() * angles.length)]

    const prompt = `Voce e um especialista em jogos de PC. Recomende 6 jogos ${genrePrompt} disponiveis na Steam. ${angle}.${avoidList}

Responda apenas em JSON puro neste formato:
{
  "games": [
    {
      "title": "Nome oficial do jogo em ingles",
      "genre": "Genero principal",
      "year": 2023,
      "description": "Descricao curta em portugues",
      "score": 85,
      "tags": ["tag1", "tag2"],
      "why": "Frase motivadora em portugues"
    }
  ]
}

Regras:
- Use obrigatoriamente o nome oficial em ingles no campo title.
- Certifique-se de que o jogo existe na Steam.
- Nao escreva nada fora do JSON.`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1200,
        temperature: 0.8,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      console.error('Erro Groq:', response.status, body)
      return NextResponse.json(
        { error: `Falha na IA (${response.status}). Tente novamente em instantes.` },
        { status: 502 }
      )
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content
    if (!text) throw new Error('A IA nao retornou conteudo.')

    const parsed = JSON.parse(extractJsonObject(text))
    if (!Array.isArray(parsed.games)) {
      throw new Error('A IA respondeu sem lista de jogos.')
    }

    const gamesWithSteamData = await Promise.all(
      parsed.games.slice(0, 6).map(async (game: any) => {
        const steamDetails = await getSteamData(game.title)
        return {
          ...game,
          image: steamDetails.image,
          storeUrl: steamDetails.storeUrl,
          score: steamDetails.steamScore || game.score,
        }
      })
    )

    return NextResponse.json({ games: gamesWithSteamData })
  } catch (error) {
    console.error('Erro na rota de recomendacoes:', error)
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 })
  }
}
