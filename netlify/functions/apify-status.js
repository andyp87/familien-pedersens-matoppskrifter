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

    const parts = [];
    if (it.caption) parts.push('BILDETEKST: ' + it.caption);
    if (it.ownerFullName || it.ownerUsername) parts.push('KONTO: ' + (it.ownerFullName || '') + ' (@' + (it.ownerUsername || '') + ')');
    if (it.firstComment) parts.push('FØRSTE KOMMENTAR (ofte oppskriften): ' + it.firstComment);
    const text = parts.join('\n\n').slice(0, 14000);

    // displayUrl er postens coverbilde — for videoer et stillbilde av retten.
    // Frontenden bruker det som forslag til forsidebilde.
    const imageUrl = it.displayUrl || (Array.isArray(it.images) && it.images.length ? it.images[0] : null);

    if (!text) return json({ error: 'Posten hadde ingen bildetekst å hente oppskrift fra' });
    return json({ text, imageUrl });
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
