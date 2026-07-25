// Henter et bilde server-side og returnerer det som data-URL.
// Trengs fordi Instagram/CDN-bilder mangler CORS-headere og IG-lenker utløper —
// frontenden komprimerer resultatet og laster det opp permanent til Supabase.
exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let url;
  try { url = JSON.parse(event.body || '{}').url; } catch(e) {}
  if (!url || !/^https?:\/\//i.test(url)) {
    return json({ error: 'Ugyldig URL' });
  }
  if (isBlockedHost(url)) return json({ error: 'URL ikke tillatt' });

  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FamilienPedersen-RecipeBot/1.0)',
        'Accept': 'image/*'
      },
      redirect: 'follow'
    });
    if (!resp.ok) return json({ error: 'Bildet svarte med feilkode ' + resp.status });

    const ct = (resp.headers.get('content-type') || '').split(';')[0].trim();
    if (!/^image\//.test(ct)) return json({ error: 'URL-en er ikke et bilde (' + (ct || 'ukjent type') + ')' });

    const buf = Buffer.from(await resp.arrayBuffer());
    // Netlify-funksjoner har ~6 MB responsgrense; base64 blåser opp med ~33 %
    if (buf.length > 4 * 1024 * 1024) return json({ error: 'Bildet er for stort (' + (buf.length / 1024 / 1024).toFixed(1) + ' MB)' });

    return json({ dataUrl: 'data:' + ct + ';base64,' + buf.toString('base64') });
  } catch(e) {
    return json({ error: e.message });
  }
};

function json(body) {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body)
  };
}

// SSRF-vern: blokker interne/private adresser så serveren ikke kan lures til
// å hente cloud-metadata eller interne tjenester. (Merknad: dekker ikke
// redirect-baserte omdirigeringer til private verter — se HANDOVER.)
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
