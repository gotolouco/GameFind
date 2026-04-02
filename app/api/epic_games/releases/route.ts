import { NextResponse } from 'next/server'
import { fetchStoreGames } from '@/lib/rawg'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1', 10)

  try {
    const data = await fetchStoreGames({
      page, 
      storeId: '11',
      platformIds: '4',
      generateStoreUrl: (gameName) => `https://store.epicgames.com/pt-BR/browse?q=${encodeURIComponent(gameName)}`
    })
    return NextResponse.json(data)
  } catch (err) {
    console.error('❌ Error na Epic Games:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}