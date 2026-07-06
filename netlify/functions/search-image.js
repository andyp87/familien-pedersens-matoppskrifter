// Søker etter pene matbilder via Pexels (gratis API-nøkkel fra pexels.com/api).
// Claude genererer engelske søkeord (img_query) under oppskriftsanalysen;
// denne funksjonen returnerer kandidatbilder frontenden kan foreslå.
exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const key = process.env.PEXELS_API_KEY;
  if (!key) return json({ error: 'PEXELS_API_KEY ikke konfigurert på serveren' });

  let query;
  try { query = JSON.parse(event.body || '{}').query; } catch(e) {}
  if (!query || typeof query !== 'string' || !query.trim()) {
    return json({ error: 'Mangler søketekst' });
  }

  try {
    const resp = await fetch(
      'https://api.pexels.com/v1/search?query=' + encodeURIComponent(query.trim().slice(0, 100)) + '&per_page=8&orientation=landscape',
      { headers: { 'Authorization': key } }
    );
    if (!resp.ok) return json({ error: 'Pexels svarte med feilkode ' + resp.status });
    const data = await resp.json();

    const photos = (data.photos || []).map(p => ({
      url: p.src.large2x || p.src.large || p.src.original,
      thumb: p.src.medium,
      alt: p.alt || '',
      photographer: p.photographer || ''
    }));
    return json({ photos });
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
