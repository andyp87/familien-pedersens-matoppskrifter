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

  const isInstagram = /(instagram\.com|facebook\.com|fb\.com)/i.test(url);

  try {
    let html;

    if (isInstagram) {
      // Route Instagram through ScrapingAnt — renders the page in a real browser
      const antKey = process.env.SCRAPINGANT_API_KEY;
      if (!antKey) {
        return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'SCRAPINGANT_API_KEY ikke konfigurert på serveren' }) };
      }
      const antResp = await fetch(
        `https://api.scrapingant.com/v2/general?url=${encodeURIComponent(url)}&x-api-key=${antKey}&browser=false&proxy_country=NO`,
        { headers: { 'Accept': 'application/json' } }
      );
      if (!antResp.ok) {
        return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'ScrapingAnt svarte med feil: ' + antResp.status }) };
      }
      html = await antResp.text();
    } else {
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
      html = await resp.text();
    }

    // For Instagram: extract caption text from meta tags and JSON-LD first
    let captionText = '';
    if (isInstagram) {
      const ogDesc = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)?.[1] ||
                     html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:description"/i)?.[1] || '';
      // og:description on Instagram is usually: "N likes, M comments - Author: caption text"
      // Extract just the caption part (after the colon)
      const colonIdx = ogDesc.indexOf(': ');
      if (colonIdx !== -1) captionText = ogDesc.slice(colonIdx + 2);
      else captionText = ogDesc;
    }

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

    // For Instagram: prepend extracted caption to increase Claude's chance of finding the recipe
    const text = captionText ? 'BILDETEKST: ' + captionText + '\n\n' + clean : clean;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ text })
    };
  } catch(e) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: e.message })
    };
  }
};
