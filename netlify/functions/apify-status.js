// Poller en Apify-kjøring startet av fetch-url.js.
// Frontenden kaller denne hvert par sekund til den får { text } eller { error }.
exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const token = process.env.APIFY_TOKEN;
  if (!token) {
    return json({ error: 'APIFY_TOKEN ikke konfigurert på serveren' });
  }

  let runId, datasetId;
  try { ({ runId, datasetId } = JSON.parse(event.body || '{}')); } catch(e) {}
  if (!runId || !datasetId || !/^[A-Za-z0-9]+$/.test(runId) || !/^[A-Za-z0-9]+$/.test(datasetId)) {
    return json({ error: 'Ugyldig runId/datasetId' });
  }

  const auth = { 'Authorization': 'Bearer ' + token };

  try {
    const runResp = await fetch('https://api.apify.com/v2/actor-runs/' + runId, { headers: auth });
    if (!runResp.ok) return json({ error: 'Apify svarte med feil: ' + runResp.status });
    const status = (await runResp.json()).data.status;

    if (status === 'RUNNING' || status === 'READY') {
      return json({ pending: true });
    }
    if (status !== 'SUCCEEDED') {
      return json({ error: 'Apify-kjøringen endte med status ' + status });
    }

    const itemsResp = await fetch('https://api.apify.com/v2/datasets/' + datasetId + '/items?clean=true', { headers: auth });
    if (!itemsResp.ok) return json({ error: 'Klarte ikke å lese resultatet: ' + itemsResp.status });
    const items = await itemsResp.json();
    const it = items && items[0];
    if (!it || it.error) {
      return json({ error: 'Fant ikke posten — er den offentlig? ' + (it && it.errorDescription || '') });
    }

    // Felles parsing for Instagram (apify~instagram-scraper) og TikTok
    // (clockworks~free-tiktok-scraper) — feltnavnene skiller seg, så vi
    // prøver begge formene.
    const caption = it.caption || it.text || '';
    const author  = it.ownerFullName || it.ownerUsername || (it.authorMeta && (it.authorMeta.nickName || it.authorMeta.name)) || '';
    const parts = [];
    if (caption) parts.push('BILDETEKST: ' + caption);
    if (author)  parts.push('KONTO: ' + author);
    if (it.firstComment) parts.push('FØRSTE KOMMENTAR (ofte oppskriften): ' + it.firstComment);
    const text = parts.join('\n\n').slice(0, 14000);

    // Coverbilde — for videoer et stillbilde av retten. Forslag til forsidebilde.
    const imageUrl = it.displayUrl
      || (Array.isArray(it.images) && it.images.length ? it.images[0] : null)
      || (it.videoMeta && it.videoMeta.coverUrl) || null;

    // Videolenke — brukes til å analysere/transkribere når oppskriften ikke
    // står i teksten. Instagram gir videoUrl; TikTok kan gi mediaUrls eller
    // videoMeta.downloadAddr (ikke garantert i gratis-versjonen).
    const videoUrl = it.videoUrl
      || (Array.isArray(it.mediaUrls) && it.mediaUrls.length ? it.mediaUrls[0] : null)
      || (it.videoMeta && (it.videoMeta.downloadAddr || it.videoMeta.playAddr)) || null;

    if (!text && !videoUrl) return json({ error: 'Posten hadde verken tekst eller video å hente oppskrift fra' });
    return json({ text: text || '', imageUrl, videoUrl });
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
