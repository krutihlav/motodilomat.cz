import {isLaunched} from '@/lib/config';
import {suggest} from '@/lib/catalog/suggest';

/** Našeptávač vyhledávání: modely a díly se srovnáním cen. GET /naseptavac?q=... */
export async function GET(request: Request) {
  if (!isLaunched) return new Response('Not found', {status: 404});
  const q = new URL(request.url).searchParams.get('q') ?? '';
  try {
    const items = await suggest(q);
    return Response.json({items}, {headers: {'Cache-Control': 'private, max-age=60'}});
  } catch (error) {
    console.error(error);
    return Response.json({items: []}, {status: 500});
  }
}
