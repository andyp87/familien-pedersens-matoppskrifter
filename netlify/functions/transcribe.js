// Transkriberer lyden i en video (Instagram-reel o.l.) med OpenAI Whisper.
// Brukes av importen når bildeteksten IKKE inneholder oppskriften — da
// «hører» appen gjennom videoen for å få tak i det som blir sagt.
//
// Krever miljøvariabel OPENAI_API_KEY i Netlify.
// Merk: Netlify-funksjoner har ~10 s tidsgrense. Korte reels (15–60 s) rekker
// stort sett innenfor; svært lange videoer kan gi tidsavbrudd (502).

const MAX_BYTES = 24 * 1024 * 1024; // Whisper tar maks 25 MB — hold oss under

function json(body, status = 200) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body)
  };
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json({ error: 'OPENAI_API_KEY er ikke satt i Netlify — kan ikke transkribere video.' });
  }

  let videoUrl;
  try { ({ videoUrl } = JSON.parse(event.body || '{}')); } catch (e) {}
  if (!videoUrl || !/^https?:\/\//i.test(videoUrl)) {
    return json({ error: 'Ugyldig videoUrl' });
  }

  try {
    // 1) Hent videoen
    const vResp = await fetch(videoUrl, { redirect: 'follow' });
    if (!vResp.ok) return json({ error: 'Klarte ikke å hente videoen (' + vResp.status + ')' });
    const buf = Buffer.from(await vResp.arrayBuffer());
    if (buf.length > MAX_BYTES) {
      return json({ error: 'Videoen er for stor til å transkriberes (over 25 MB).' });
    }

    // 2) Send til Whisper (Whisper trekker ut lyden fra mp4-en selv)
    const form = new FormData();
    form.append('file', new Blob([buf], { type: 'video/mp4' }), 'reel.mp4');
    form.append('model', 'whisper-1');
    // Ingen språk-hint → Whisper detekterer selv (kan være norsk eller engelsk)

    const wResp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey },
      body: form
    });
    const data = await wResp.json();
    if (!wResp.ok) {
      return json({ error: 'Whisper svarte med feil: ' + (data.error?.message || wResp.status) });
    }
    const transcript = (data.text || '').trim();
    if (!transcript) return json({ error: 'Ingen tale funnet i videoen.' });
    return json({ transcript });
  } catch (e) {
    return json({ error: e.message });
  }
};
