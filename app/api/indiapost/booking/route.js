import { NextResponse } from 'next/server';
import { processIndiaPostArticles } from '@/lib/indiaPost';

export async function POST(request) {
  try {
    const body = await request.json();
    const customId = String(body?.customId || '').trim();
    const articles = body?.articles;

    if (!customId) {
      return NextResponse.json({ error: 'customId is required' }, { status: 400 });
    }
    if (!Array.isArray(articles) || articles.length === 0) {
      return NextResponse.json({ error: 'articles array is required' }, { status: 400 });
    }

    const data = await processIndiaPostArticles(customId, { articles });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'India Post booking failed' }, { status: 500 });
  }
}
