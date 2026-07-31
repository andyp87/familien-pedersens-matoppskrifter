// Verifiserer at et funksjonskall kommer fra en innlogget Supabase-bruker.
// Hindrer at fremmede bruker API-nøklene våre (Claude/OpenAI/Gemini/Apify) gratis.
//
// Ligger UTENFOR netlify/functions/ med vilje, så Netlify ikke prøver å
// deploye den som et eget endepunkt. Funksjonene henter den med require('../lib/auth').
//
// SUPABASE_URL og anon-nøkkelen er offentlige (samme som i frontend) — de
// identifiserer prosjektet; selve tilgangskontrollen ligger i tokenet.

const SUPABASE_URL = 'https://hfktoxmjudaopjsbvram.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhma3RveG1qdWRhb3Bqc2J2cmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDAyNTUsImV4cCI6MjA5NTM3NjI1NX0.riZHTmNJpA0yDyzA6WHzFfVxtpf5z8aT-NCkuSEKSJQ';

// Returnerer brukeren hvis tokenet er gyldig, ellers null.
async function getUser(event) {
  const h = event.headers || {};
  const authHeader = h.authorization || h.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  try {
    const resp = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + token }
    });
    if (!resp.ok) return null;
    const user = await resp.json();
    return user && user.id ? user : null;
  } catch (e) {
    return null;
  }
}

module.exports = { getUser };
