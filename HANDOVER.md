# HANDOVER — natt-økt 25. juli 2026 (autonom)

Anders sov; jeg jobbet gjennom backlogen så langt jeg trygt kunne uten input.
Alt under er **pushet til main og live på nineofive.no**, syntaks- og lokaltestet.
Alt som rører databasen er bygget «capability-gated»: frontenden oppdager om en
kolonne finnes og skjuler funksjonen + utelater kolonnen fra skriving til
migrasjonen er kjørt — **ingenting kan knekke lagring i mellomtiden.**

---

## ✅ Ferdig og verifisert i natt

### 1. TikTok-import (fungerer)
- Lim inn en `tiktok.com`-lenke → samme flyt som Instagram (Apify + Claude).
- Verifisert ende-til-ende live: `fetch-url.js` starter `clockworks~free-tiktok-scraper`,
  `apify-status.js` parser tekst + coverbilde riktig.
- **Begrensning:** gratis-TikTok-scraperen gir IKKE en videofil-URL, så TikTok
  får **bildetekst + cover**, men video/lyd-analyse (Gemini/Whisper) hoppes over.
  Å analysere selve TikTok-videoen krever en betalt Apify-actor eller annen
  videokilde — **ta sammen senere** hvis vi trenger det.

### 2. Private oppskrifter (kode klar — venter på migrasjon 03)
- 🔒-bryter i skjema, lås-merke på kort/detalj. Skjult til migrasjon 03 er kjørt.
- RLS i `db/migration-03-private-recipes.sql` skjuler private oppskrifter + bilder
  for andre enn eier.

### 3. Kjøkken/nasjonalitet-filter (kode klar — venter på migrasjon 04)
- Claude tagger kjøkken automatisk ved import; filter-chips i Oppdag/kokebok;
  felt i redigering. Skjult til migrasjon 04 er kjørt.

### 4. Forside-redesign (fra kvelds-økten)
- Mat vises på første skjerm; filtre bak «Filtrer»-knapp; terning 1–10 med
  tydelige trinn; overflow-fiks på mobil.

### 5. 🔒 SIKKERHETSGJENNOMGANG (du ba om denne)
**Fant og FIKSET:**
- **Lagret XSS (alvorlig, ny i flerbruker):** oppskriftsdata (navn, ingredienser,
  steg, resultat, næring, forfatter, kjøkken, bildemerker, kjøkken-filterknapper)
  ble lagt i innerHTML uten escaping. En bruker kunne legge skadelig kode i en
  delt oppskrift som kjørte i *alle andres* nettlesere via Oppdag. Nå escapes alt
  (`esc()`/`jsStr()`). Verifisert: payload i alle felt kjører ikke, vises som tekst.
- **SSRF:** funksjonene som henter bruker-URL-er server-side blokkerer nå interne/
  private/metadata-adresser (`isBlockedHost`). Offentlige CDN-er slipper gjennom.

**GJENSTÅR — må vi ta sammen (trenger live-testing, derfor ikke gjort i natt):**
- ⚠️ **Åpne, betalende proxy-endepunkter (viktigst).** `claude.js`, `transcribe.js`,
  `gemini-video.js`, `fetch-url.js` har ingen innlogging — hvem som helst som
  finner URL-en kan bruke våre API-nøkler (Anthropic/OpenAI/Gemini/Apify) gratis
  og dra opp regningen. Fiks: verifiser Supabase-JWT i funksjonene + send token
  fra frontenden. Litt risikabelt å deploye uovervåket (kan knekke import hvis
  feil), så **dette er topp-prioritet å gjøre sammen.**
- SSRF-vernet dekker ikke redirect-hopp til private verter (lav risiko).
- `recipe_images`-RLS strammes i migrasjon 03 (fikser bilde-lekkasje for private).

---

## 📋 DU MÅ (i morgen, sammen med meg)

1. **Kjør migrasjon 03 + 04** i Supabase SQL Editor (samme sted som før), i denne
   rekkefølgen. 03 endrer RLS — vi sjekker LIVE etterpå at appen fortsatt viser
   alle delte oppskrifter og at en privat oppskrift kun vises for eier:
   - `db/migration-03-private-recipes.sql`
   - `db/migration-04-cuisine.sql`
2. **Gemini-nøkkel:** har du lagt `GEMINI_API_KEY` i Netlify? (For Instagram-video-
   analyse.) Uten den brukes Whisper-lyd som fallback (nøkkelen finnes).
3. **Beslutning – varianter/«2.0»:** kun for *andres* oppskrifter, eller «ny
   versjon» for alle? (Jeg heller mot kun andres.)

*(Jeg fikk ikke lest iCloud-notatet ditt — det krever Apple-innlogging, som jeg
ikke gjør. Jeg kan heller ikke huke av i notatene dine. Bruk lista over.)*

---

## Gjenstår i backlogen (egne runder)
3. 3 bildevalg fra video + «hent på nytt» · 4. Profiler · 5. Kommentarer ·
8. Oppskrift-varianter (bygg m/ #5+#4) · 7. Brandet bekreftelses-e-post.
Se full backlog i minnet (`prosjektstatus-kokebok`).

---
---

# (Historisk) Handover: nineofive.no – Google Privacy Fix

Noindex-fiksen er fullført og verifisert (X-Robots-Tag + meta + robots.txt).
Full beskrivelse ligger i git-historikken (commit før 25. juli). Kort:
- nineofive.no serveres av **Netlify** (auto-deploy fra GitHub `andyp87/…`), ikke one.com.
- `netlify.toml` har midlertidig `X-Robots-Tag: noindex` på `/*` — FJERNES når
  filmproduksjonssiden er klar.
- Rør ALDRI MX/CNAME for e-post (Google Workspace).
- Åpen tråd: Search Console-verifisering venter på TXT-record hos one.com (krever din innlogging).
