import { NextResponse } from 'next/server';
import { processIndiaPostArticlesFile } from '@/lib/indiaPost';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const customId = String(formData.get('customId') || '').trim();
    const file = formData.get('file');

    if (!customId) {
      return NextResponse.json({ error: 'customId is required' }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    const fileName = String(file?.name || 'articles.json');
    const data = await processIndiaPostArticlesFile(customId, file, fileName);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'India Post booking file upload failed' }, { status: 500 });
  }
}
