// Analyserer en video (Instagram-reel o.l.) med Google Gemini — modellen SER
// og HØRER hele videoen og trekker ut oppskriften, både det som blir sagt og
// det som vises som tekst på skjermen. Brukes av importen når bildeteksten
// ikke inneholder oppskriften.
//
// Krever miljøvariabel GEMINI_API_KEY i Netlify.
// Merk: Netlify-funksjoner har ~10 s tidsgrense. Korte reels rekker stort sett
// innenfor; svært lange videoer kan gi tidsavbrudd (502) — da faller importen
// tilbake til ren lyd-transkribering (transcribe.js).

const { getUser } = require('../lib/auth');

const MODEL = 'gemini-2.0-flash';
const MAX_BYTES = 18 * 1024 * 1024; // Gemini inline-grense ~20 MB (base64 er større enn rådata)

function json(body, status = 200) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body)
  };
}

function isBlockedHost(urlStr) {
  try {
    const h = new URL(urlStr).hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.localhost')) return true;
    const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (m) {
      const a = +m[1], b = +m[2];
      if (a === 0 || a === 127 || a === 10 || a === 169 && b === 254 || a === 192 && b === 168 || a === 172 && b >= 16 && b <= 31) return true;
    }
    if (h === '::1' || h.startsWith('fd') || h.startsWith('fc') || h.startsWith('fe80')) return true;
    return false;
  } catch (e) { return true; }
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const user = await getUser(event);
  if (!user) return json({ error: 'Ikke innlogget' }, 401);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json({ error: 'GEMINI_API_KEY er ikke satt i Netlify – kan ikke analysere video.' });
  }

  let videoUrl;
  try { ({ videoUrl } = JSON.parse(event.body || '{}')); } catch (e) {}
  if (!videoUrl || !/^https?:\/\//i.test(videoUrl)) {
    return json({ error: 'Ugyldig videoUrl' });
  }
  if (isBlockedHost(videoUrl)) return json({ error: 'URL ikke tillatt' });

  try {
    // 1) Hent videoen (funksjonen henter selv – går ikke gjennom Netlifys 6 MB-tak)
    const vResp = await fetch(videoUrl, { redirect: 'follow' });
    if (!vResp.ok) return json({ error: 'Klarte ikke å hente videoen (' + vResp.status + ')' });
    const buf = Buffer.from(await vResp.arrayBuffer());
    if (buf.length > MAX_BYTES) {
      return json({ error: 'Videoen er for stor til å analyseres direkte (over ~18 MB).' });
    }
    const base64 = buf.toString('base64');

    const prompt = 'Dette er en matlagingsvideo. Se og hør nøye gjennom HELE videoen og trekk ut hele oppskriften. '
      + 'Ta med ALLE ingredienser med mengder og ALLE trinn – både det som blir SAGT og det som VISES som tekst på skjermen. '
      + 'Skriv på norsk som ren tekst (IKKE JSON): først tittel, så ingrediensliste med mengder, så fremgangsmåte som nummererte steg. '
      + 'Ikke gjett på ting som ikke nevnes eller vises.';

    // 2) Send til Gemini (video inline + instruksjon)
    const gResp = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent?key=' + encodeURIComponent(apiKey),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [ { inlineData: { mimeType: 'video/mp4', data: base64 } }, { text: prompt } ] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1200 }
        })
      }
    );
    const data = await gResp.json();
    if (!gResp.ok) {
      return json({ error: 'Gemini svarte med feil: ' + (data.error?.message || gResp.status) });
    }
    const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
    if (!text) return json({ error: 'Gemini fant ingen oppskrift i videoen.' });
    return json({ recipeText: text });
  } catch (e) {
    return json({ error: e.message });
  }
};
