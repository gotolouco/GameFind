import { NextResponse } from 'next/server'
import { fetchStoreGames } from '@/lib/rawg'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1', 10)

  try {
const data = await fetchStoreGames({
      page, 
      storeId: '1', 
      platformIds: '4',
      generateStoreUrl: (gameName) => `https://store.steampowered.com/search/?term=${encodeURIComponent(gameName)}`
    })
    return NextResponse.json(data)
  } catch (err) {
    console.error('❌ Error na Steam:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}