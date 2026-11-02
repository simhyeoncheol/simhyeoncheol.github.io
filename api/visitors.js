// 방문자 수: Blob 저장소의 JSON 하나에 누적한다. POST 는 1 올리고, GET 은 읽기만 한다.
import { get, put, BlobPreconditionFailedError } from '@vercel/blob';

const PATH = 'visitors.json';
let cached = null; // { count, at }

async function read() {
  const r = await get(PATH, { access: 'private', useCache: false });
  if (!r || r.statusCode !== 200) return { count: 0, etag: null };
  const data = JSON.parse(await new Response(r.stream).text());
  return { count: Number(data.count) || 0, etag: r.blob.etag };
}

async function increment() {
  for (let i = 0; i < 5; i++) {
    const { count, etag } = await read();
    const body = JSON.stringify({ count: count + 1 });
    try {
      await put(PATH, body, {
        access: 'private',
        contentType: 'application/json',
        addRandomSuffix: false,
        ...(etag ? { ifMatch: etag } : {}),
      });
      return count + 1;
    } catch (e) {
      // 동시에 들어온 다른 방문이 먼저 썼으면 다시 읽고 시도한다.
      if (!(e instanceof BlobPreconditionFailedError)) throw e;
    }
  }
  throw new Error('increment conflict');
}

export default async function handler(req, res) {
  try {
    let count;
    if (req.method === 'POST') {
      count = await increment();
      cached = { count, at: Date.now() };
    } else if (cached && Date.now() - cached.at < 30_000) {
      count = cached.count;
    } else {
      count = (await read()).count;
      cached = { count, at: Date.now() };
    }
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ count });
  } catch (e) {
    res.status(500).json({ error: 'unavailable' });
  }
}
