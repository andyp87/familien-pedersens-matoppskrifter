# UI-audit av Kokeboka mot Emil Kowalskis skills

Dato: 7. oktober 2026
Omfang: `kokebok/index.html` og `kokebok/capture.html`
Grunnlag: `apple-design`, `emil-design-eng`, `animate`, `mobile-native` og `break-ui` fra [emilkowalski/skills](https://github.com/emilkowalski/skills). Skillen var ikke tilgjengelig i skyøkten, så reglene er hentet rett fra kilden.

## Konklusjon

Appen hadde ingen alvorlige bevegelsesfeil (ingen `ease-in`, ingen `scale(0)`, ingen varigheter over 300 ms), men den brøt systematisk på fire ting som Kowalski kaller «de usynlige detaljene»: `transition:all` overalt, hover-stiler uten `(hover:hover)`-gating, ingen trykkrespons på pointer-down, og en modal med keyframes uten utgang. På mobil manglet hele grunnmuren fra `mobile-native` (viewport-fit, 16 px i felt, tap-highlight, `touch-action`). I tillegg bar grensesnittet tydelig preg av AI-slopp: dekorative emoji i nesten hver knapp, fane og overskrift, utropstegn i alle statusmeldinger og `alert()` for feilmeldinger.

Alt under er rettet i denne runden, med unntak av punktene i «Ikke gjort».

## Før og etter

| Før | Etter | Hvorfor |
| --- | --- | --- |
| `transition:all .12s` på chips, knapper, faner, modusvelger (9 steder) | Navngitte egenskaper: `border-color`, `color`, `background-color` på `var(--t-hover)`, `transform` på `var(--t-press)` | `all` animerer også layout-egenskaper og gjør hver endring uforutsigbar |
| Innebygd `ease` og ingen kurvetokens | `--ease-out: cubic-bezier(.23,1,.32,1)`, `--ease-in-out`, `--ease-drawer`, `--t-hover: 150ms ease`, `--t-press: 120ms var(--ease-out)` | Innebygde kurver er for svake; ett tokensett gir sammenheng |
| Modal: `animation: slideUp .18s ease` (keyframes), ingen utgangsanimasjon, bakteppe hopper inn | `transition` med `@starting-style` og `allow-discrete`: inn 220 ms, ut 160 ms, samme vei (`translateY(12px) scale(.98)`) | Transitions kan avbrytes, keyframes starter alltid fra null. Utgang skal speile inngang og være raskere |
| Mobil-ark: samme modal-animasjon som desktop | `translateY(100%)` med `--ease-drawer`, inn 320 ms, ut 220 ms | Et fullskjermsark skal komme fra bunnen som på iOS, og forsvinne samme vei |
| 41 `:hover`-regler uten gating | Alle flyttet inn i `@media (hover:hover) and (pointer:fine)`; bildeverktøy (`.mgr-overlay`, `.step-photo-overlay`) alltid synlige under `(hover:none)` | Touch «fryser» hover etter tapp. Kortet beholdt grønn ramme etter at modalen lukket |
| Ingen `:active`-tilstand på noen knapp | `transform: scale(.97)` på alle trykkbare elementer, `.985` på kort, `.96` på miniatyrer | Respons skal komme på pointer-down, ikke på release |
| `.img-spinner` brukt fire steder i JS, aldri definert i CSS | Definert: 14 px, `currentColor`, 600 ms lineær | Spinneren var usynlig. Rask spinner oppleves som raskere lasting |
| Ingen `prefers-reduced-motion` | Modal og toast går til ren opasitet, trykk-skalering slås av | Redusert bevegelse betyr mildere, ikke null |
| `viewport` uten `viewport-fit=cover`; `capture.html` hadde `maximum-scale=1.0` | `viewport-fit=cover` på begge, `maximum-scale` fjernet, `theme-color` per fargeskjema, `color-scheme: light dark` | Zoom-sperre er en tilgjengelighetsfeil. Statuslinjen skal matche headeren |
| Felt på 13–14 px | 16 px i alle felt under `(pointer:coarse)` | iOS zoomer inn på felt under 16 px og zoomer ikke ut igjen |
| Standard grå tapp-blink, tekst kan markeres i knapper | `-webkit-tap-highlight-color: transparent`, `touch-action: manipulation`, `user-select: none` på kontroller | Det tydeligste «dette er en nettside»-signalet på telefon |
| Modalens scroll smitter til siden bak | `overscroll-behavior: contain` på `.modal`, `-x: contain` på horisontale rader | Innholdet i arket skal ikke dra med seg siden |
| Opak header med 1 px strek | `color-mix` 86 % + `backdrop-filter: blur(14px) saturate(1.5)`, fallback for `prefers-reduced-transparency` | Apple bruker gjennomskinnelige lag som flytende struktur |
| Lukkeknapp 30 px og 24 px | 36 px og 32 px | Trykkmål under 32 px bommer på telefon |
| «Legg til bilde»-knappen brakk over tre linjer på hero-bildet | `white-space: nowrap` | Tekst i en knapp skal aldri brekke |
| `alert()` for 12 feil- og valideringsmeldinger | `toast()` nederst: transitions, inn og ut samme vei, trykk for å lukke, `aria-live` | `alert()` blokkerer og ser ut som nettleseren, ikke appen |
| To `confirm()` etter hverandre ved sletting | Én bekreftelse | Overbruk av bekreftelser lærer folk å klikke seg gjennom |
| Ingen synlig tastaturfokus på knapper og kort | `:focus-visible` med 2 px aksentramme | Felt viser fokus via kantfargen, knapper viste ingenting |
| `Kokeboka 🍽`, `📖 Min kokebok`, `🔍 Oppdag`, `⭐ Mest likt`, `🍳 Mest laget`, `✨ Nyeste`, `📊 Statistikk`, `🧪 Vil prøve`, `⚙️ Innstillinger`, `📷 Bilder`, `💰 Hva koster det?`, `✨ Importer automatisk`, `✏️ Skriv inn selv`, `💬 Kommentarer`, `🔀 Lag din versjon`, `🎬`, `➕`, `🌍` | Ren tekst. Tall-glyffene ⭐ og 🍳 på kort og i detaljvisning er byttet til små SVG-ikoner (stjerne, flamme), 🔒 og 🔗 til SVG | Emoji i navigasjon og knapper er det tydeligste AI-slopp-merket. Oppskriftenes egne emoji er data og beholdes, det samme gjør 🍳 i tom-tilstanden og 🎉 ved suksess (sjeldent-tier) |
| «✓ Konto opprettet!», «⚠️ Lagring feilet», «🎉 Registrert! Du har laget denne 3 ganger» | «Konto opprettet.», «Lagring feilet», «Registrert – du har laget denne 3 ganger» | Fargen bærer allerede statusen. Utropstegn i hver melding roper |
| Tankestrek (—) i brukertekst og «→» i skaleringsnotis | Bindestrek med mellomrom (–) | Husstil |
| «9.0», «snitt 8.0», «7.8» | «9,0», «snitt 8,0», «7,8» via `nb1()` | Norsk desimalskilletegn, samsvarer med den redaksjonelle auditen |
| Søkefelt `type="text"` | `type="search"`, `enterkeyhint="search"`; porsjonsfelt `inputmode="decimal"` | Riktig tastatur og riktig returknapp på telefon |

## Runde 2: visuelt design

Første runde var kun bevegelse, mobilfølelse og tekst. Utseendet var urørt og lignet fortsatt en mal: skarpe hjørner, tynne rammer rundt alt, små store bokser som overskrifter, to store grønne knapper som modusvalg og et grått felt der kortrutenettet hadde tomme celler. Rettet med `apple-design` (materialer, typografi, enkelhet) som grunnlag.

| Før | Etter | Hvorfor |
| --- | --- | --- |
| Alle hjørner 0 px | 12 px felt, 14 px knapper, 20 px kort, 24 px modaler, helt runde piller | Apple-former er avrundede, og det er det raskeste enkeltgrepet mot et mal-preg |
| Tynn ramme rundt kort, chips, felt og bokser | Fyll (`--fill`) og skygge (`--shadow-1/2/3`), hårstrek på 0,5 px kun der det skiller seksjoner | Dybde i stedet for strek gir ro |
| Beige bakgrunn og brunlig mørk modus | Nøytral `#F5F5F7` med hvite flater, ekte svart `#000` med `#1C1C1E` i mørk modus | Apples palett. Grønn merkefarge beholdes, men bare på hovedhandlinger |
| DM Sans fra Google Fonts | Systemfont (SF Pro på Apple-enheter), Lora kun på store titler og logo | Plattformfonten har optisk størrelse og sporing innebygd, og sparer en nettverksforespørsel |
| Små, store, sperrede etiketter («KATEGORI», «INGREDIENSER», «KJØTT») | Sentence case, 20 px halvfet seksjonstitler, kategori som farget prikk og tekst | Størrelse og vekt skaper hierarki, ikke sperret versaltekst |
| Hero som egen stripe med strek under | Stor tittel direkte på siden, 34 til 52 px, negativ sporing | Samme prinsipp som Apples «large title» |
| To store bokser «Min kokebok / Oppdag» | iOS-segmentkontroll med glidende tommel | Én kontroll i stedet for to knapper som roper |
| Tre rader med filterchips alltid synlig | Sortering på én linje, resten bak «Filtrer» som åpner seg mykt | Vis det vanlige først |
| Kort med 1 px gap, ramme og grå celler i rutenettet | 22 px mellomrom, runde kort med skygge, lik bunnlinje, avkortet forfatternavn | Det grå feltet var rutenettets bakgrunn som lyste gjennom tomme celler |
| Statusmerker i flate farger | Gjennomskinnelige piller med `backdrop-filter` over bildet | Apple-materiale oppå fotografiet |
| Detaljvisning med 16:6-stripe | 16:9-bilde, 32 px tittel, ingredienser i full tekstfarge, runde tall for steg | Maten skal være hovedpersonen, og brødtekst skal være lesbar |
| Mobil: fullskjerm uten kant | Ark med 24 px avrundede toppkanter og bakgrunnen synlig over | Slik iOS-ark ser ut |
| Innlogging som firkantet boks | 26 px kort med stor skygge, runde felt | Første inntrykk |

Samme språk er brukt på `capture.html`. Hele laget ligger som ett eget `<style id="design-layer">` sist i hver fil, så det kan justeres eller skrus av uten å røre de eldre reglene.

## Kjent og bevisst

- Merkenavnet står som «nineofve» på innloggingsskjermene (uten «i»), mens domenet er nineofive.no. Uendret i denne runden, siden det kan være bevisst.
- Forhåndsvisningene er laget med Inter som stand-in for SF Pro og med genererte matbilder, siden skymiljøet ikke har tilgang til Google-fonter eller foto. Faktisk utseende på iPhone og Mac må sjekkes på enheten.

## Verifisert

- `node --check` på begge filers skript.
- Headless Chromium 141: modal-bakteppet går 0 til 1 i opasitet over 220 ms med `cubic-bezier(.23,1,.32,1)`, `display` holdes `flex` under utgangen og blir `none` etter 160 ms.
- Ingen `:hover`-regler igjen utenfor gating-blokkene (31 + 10 regler flyttet i `index.html`, 10 i `capture.html`).
- Skjermbilder lys, mørk, desktop og 390 px: forside, Oppdag, detalj, legg til, statistikk, innstillinger, toast og mobilsiden.

## Ikke gjort

- Kortene faller inn samtidig uten stagger. Bevisst: `render()` kjører ved hvert filterklikk (titalls ganger daglig), og den tieren skal ha minimalt med bevegelse.
- `confirm()` og `prompt()` står igjen (sletting, «hva endret du», skalering fra mengde). Å erstatte dem krever egne dialoger med fokusfelle. Egen runde.
- Ingen gestestyring (dra-for-å-lukke på mobilarket). Ville trengt en spring-implementasjon med pointer capture. Egen runde om ønskelig.
- Modalen hopper rett til topp og låser ikke bakgrunnsscroll på desktop. Lav prioritet.

## Må testes på ekte telefon

Ingen av mobilfiksene kan verifiseres i emulering: fastlåst hover, tapp-blink, zoom i felt, trykkforsinkelse, safe-area og arket som kommer fra bunnen. Åpne nineofive.no/kokebok på iPhone etter deploy og sjekk at kort ikke beholder grønn ramme etter lukket modal, at søkefeltet ikke zoomer, og at arket glir inn fra bunnen.
