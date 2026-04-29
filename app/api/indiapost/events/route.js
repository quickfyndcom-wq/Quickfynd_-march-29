import { downloadIndiaPostEvents } from '@/lib/indiaPost';

export async function POST(request) {
  try {
    const body = await request.json();
    const Cust_Id = String(body?.Cust_Id || '').trim();
    const Event_Code = String(body?.Event_Code || '').trim();
    const Event_Date = String(body?.Event_Date || '').trim();

    if (!Cust_Id || !Event_Code || !Event_Date) {
      return Response.json({ error: 'Cust_Id, Event_Code and Event_Date are required' }, { status: 400 });
    }

    const xml = await downloadIndiaPostEvents({ Cust_Id, Event_Code, Event_Date });
    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });
  } catch (error) {
    return Response.json({ error: error?.message || 'India Post event download failed' }, { status: 500 });
  }
}
