function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

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
    return { statusCode: 400, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Ugyldig URL' }) };
  }

  const isInstagram = /instagram\.com/i.test(url);
  const isFacebook = /(facebook\.com|fb\.watch|fb\.com)/i.test(url);

  try {
    if (isFacebook) {
      // Facebook serverer hele bildeteksten (og et bilde av retten) i og-metaene
      // til delings-crawlere — gratis, uten Apify. Krever at posten er offentlig.
      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
          'Accept-Language': 'nb,en'
        },
        redirect: 'follow'
      });
      if (!resp.ok) {
        return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Facebook svarte med feilkode ' + resp.status }) };
      }
      const fbHtml = await resp.text();
      const og = (prop) => {
        const m = fbHtml.match(new RegExp('<meta[^>]+property="' + prop + '"[^>]+content="([^"]*)"', 'i'))
               || fbHtml.match(new RegExp('<meta[^>]+content="([^"]*)"[^>]+property="' + prop + '"', 'i'));
        return m ? decodeEntities(m[1]) : '';
      };
      let text = og('og:title');
      const desc = og('og:description');
      if (desc.length > text.length) text = desc;
      // Fjern "1 mill. visninger · 105 k reaksjoner | "-prefikset (språkavhengig)
      const pipe = text.indexOf(' | ');
      if (pipe > -1 && pipe < 120 && /\d/.test(text.slice(0, pipe))) text = text.slice(pipe + 3);
      const imageUrl = og('og:image') || null;
      if (!text || text.length < 40) {
        return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Fant ikke innholdet i Facebook-posten — er den offentlig? Kopier eventuelt oppskriftsteksten og lim den inn.' }) };
      }
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ text: text.slice(0, 14000), imageUrl })
      };
    }

    if (isInstagram) {
      // Instagram hentes via Apify (strukturert data, full bildetekst).
      // Apify bruker 30–120 sek — for lenge for én Netlify-funksjon, så vi
      // STARTER kjøringen her og lar frontenden polle apify-status.js.
      const token = process.env.APIFY_TOKEN;
      if (!token) {
        return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'APIFY_TOKEN ikke konfigurert på serveren' }) };
      }
      const startResp = await fetch('https://api.apify.com/v2/acts/apify~instagram-scraper/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ directUrls: [url], resultsType: 'posts', resultsLimit: 1 })
      });
      if (!startResp.ok) {
        return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Apify svarte med feil: ' + startResp.status }) };
      }
      const run = (await startResp.json()).data;
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ pending: true, runId: run.id, datasetId: run.defaultDatasetId })
      };
    }

    // Vanlige nettsider: direkte henting som før
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FamilienPedersen-RecipeBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'nb,no;q=0.9,en;q=0.8'
      },
      redirect: 'follow'
    });
    if (!resp.ok) {
      return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Siden svarte med feilkode ' + resp.status }) };
    }
    const html = await resp.text();

    // og:image hentes ut FØR taggene strippes — brukes som forslag til forsidebilde
    let imageUrl = null;
    const og = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]*content=["']([^"']+)["']/i)
            || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["']/i);
    if (og && /^https?:\/\//i.test(og[1])) imageUrl = og[1].replace(/&amp;/g, '&');

    // Strip scripts, styles, nav, footer etc.
    const clean = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 14000);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ text: clean, imageUrl })
    };
  } catch(e) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: e.message })
    };
  }
};
