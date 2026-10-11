# Design Archive

Un archivio editoriale di oggetti di design d'interni: quasi 900 pezzi (sedie, divani, lampade,
tavoli, oggetti) con designer, produttore, anno, paese, materiali e una foto accreditata per ognuno.

L'idea che tiene insieme il sito è il **cartellino**: come nei musei, ogni pezzo ha il suo (nome,
designer, anno, materiali), anche quello trovato al mercatino. Da qui i momenti del sito, che sono
anche il suo menu:

- **Conosci** (Archivio, Storie, Designer): la scheda, la storia, dove trovarlo, i segni di
  autenticità verificati e, dove ci sono, le misure reali;
- **Trova** (Mercati): un pianificatore — "dove andiamo a caccia questo weekend?" — con i luoghi
  come biglietti accanto alla mappa della città, il calendario del mese, la vista Mondo sul globo e
  una pagina per ogni città e ogni luogo;
- **Colleziona** (La mia collezione): ogni pezzo con uno stato — possiedo, cerco (con budget e
  note), visto, salvato; un cartellino o tutta la collezione si condividono come immagine;
- **moodboard** (quante se ne vogliono), da condividere con un link o stampare in PDF;
- account facoltativi per ritrovare tutto su ogni dispositivo;
- e ancora: una pagina per ogni designer e una storia al giorno.

Tutto è gratuito e aperto a tutti. Senza account il sito funziona interamente e salva nel browser;
con Supabase configurato (sezione più sotto) si attivano gli account, la sincronizzazione e i link
pubblici delle moodboard. Finché non lo fai, il sito lo dice dove serve e continua a funzionare come
sito statico.

L'interfaccia è in cinque lingue (inglese, italiano, spagnolo, francese, cinese). I contenuti
dell'archivio — nomi, descrizioni, storie — sono in inglese.

## Avvio

Serve Node.js 22 o successivo.

```bash
npm install
npm run dev
```

Il sito si apre su <http://localhost:5173>.

## Script

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Server di sviluppo. Rigenera prima i dati della home. |
| `npm run build` | Build di produzione in `dist/`: una pagina HTML per ogni pezzo, designer e storia, più `sitemap.xml`, `robots.txt` e `404.html`. |
| `npm run preview` | Rifà la build e la serve in locale su <http://localhost:4173>. |
| `npm run preview:pages` | Come su GitHub Pages: build con base `/design-archive/` e anteprima su <http://localhost:4173/design-archive/>. |
| `npm run check` | Lint, controllo delle traduzioni e dei dati. Deve passare prima di ogni pubblicazione. |
| `npm run check:i18n` | Solo le traduzioni: stesse chiavi in tutti e cinque i dizionari. |
| `npm run check:data` | Solo i dati: id unici, ogni pezzo con foto e fonte, storie, pezzi iconici e mercati coerenti. |
| `npm run check:markets` | Rapporto sui mercati: frequenze da cui non si ricavano date, luoghi lontani dalla propria città. `check:data` fallisce se un luogo è a più di 25 km dal centro. |
| `npm run check:images` | Verifica che le foto rispondano ancora (lento: rispetta i limiti dei server). Con `-- --json` scrive `image-report.json`. |
| `npm test` | Test automatici (date dei mercati, unione dei dati, e le migrazioni del database eseguite su un Postgres dentro Node). Quelli su Supabase partono solo con le chiavi in `.env.local`. |
| `npm run guide:import` | Dati verificati: dal file privato a `src/data/pieceFacts.js` (segni di autenticità e produzione; con `-- --upload` le misure nel database). |
| `npm run guide:coverage` | Quali dei 50 pezzi più iconici hanno i dati verificati, e quali blocchi. |

Script di supporto in `scripts/`:

- `build-home-data.mjs` — genera `src/data/homeData.js` e `src/data/storyCovers.js`, il riassunto
  dell'archivio che serve alla home. Parte da solo con `dev` e `build`.
- `find-orphan-i18n.mjs` — elenca le chiavi dei dizionari che nessun file usa più (non modifica
  niente: si tolgono con `scaffold-i18n.mjs --remove`).
- `scaffold-i18n.mjs` — aggiunge una stringa in tutti e cinque i dizionari in un colpo solo.
- `spa-fallback.mjs` — scrive `dist/404.html` (la shell dell'app, con `noindex`) dopo la build.
- `prerender.mjs` — dopo la build scrive una pagina statica per ogni indirizzo (titolo, descrizione,
  Open Graph, JSON-LD, hreflang e il contenuto in HTML semplice), la `sitemap.xml` e il `robots.txt`.
  L'immagine di condivisione di ogni pezzo è il suo cartellino (`dist/og/<id>.png`, disegnato da
  `scripts/lib/og-label.mjs`; le immagini già fatte restano in `node_modules/.cache`).
  Gli indirizzi assoluti vengono da `SITE_URL` (lo imposta il workflow); senza, puntano alla preview locale.
  Ogni pagina statica fa partire subito anche il codice della sua pagina (dal manifest di Vite) e
  resta a schermo finché la pagina vera non è pronta (`src/lib/handoff.js`): niente schermo vuoto
  né scheletro alla prima visita. Il suo elemento più grande è almeno grande quanto quello della
  pagina vera, così il caricamento finisce quando la pagina statica è dipinta.

## Struttura

```
src/
  pages/        una pagina per rotta, caricata su richiesta (tranne la home)
  components/   ObjectCard, SmartImage, PhotoLightbox, FilterPanel, moodboard…
  data/         i dati: tutto il sito è statico, non c'è un server
  lib/          logica senza interfaccia: parametri dell'archivio, date dei mercati, SEO
  i18n/         i cinque dizionari (inglese sempre, le altre lingue su richiesta)
  styles/       token di design (tokens.css), font (fonts.css) e stili globali
scripts/        controlli e generatori (vedi sopra)
supabase/
  migrations/   il database: tabelle, permessi riga per riga, funzioni SQL, archivi delle foto
  functions/    le funzioni server (eliminazione account)
tests/          i test (`npm test`)
```

### Dati dell'utente

Tutto ciò che un visitatore conserva passa da un solo livello, `src/lib/userData.js`: ogni raccolta
(collezione, moodboard, libreria, profilo) vive nel browser, e con un account
`src/lib/sync.js` la rispecchia nel database. Al primo accesso unisce quello che c'era nel browser
con l'account senza perdere niente; dopo, manda solo le modifiche. I componenti leggono e scrivono
sempre nel browser e non sanno se c'è un account.

### I dati

| File | Contenuto |
|---|---|
| `data/objects.js` + `data/objectsExtra.js` | I pezzi. `OBJECTS` li unisce; da qui vengono anche le liste per i filtri. |
| `data/objectPhotos.js` | Una foto per pezzo, con autore, licenza e pagina di provenienza. |
| `data/indexes.js` | Ricerche già pronte: pezzo per id, per designer, paese, decennio; storie per pezzo. |
| `data/stories.js` | Le storie. Ognuna esce nel giorno indicato da `date`. |
| `data/markets.js` | Mercatini, fiere e negozi. Le date si ricavano dal testo di `frequency` (`lib/marketDates.js`): scrivilo come gli altri ("Sundays", "Third weekend of each month", "Annually, April") e controlla con `npm run check:markets`. La mappa delle città usa MapLibre con le tile gratuite di [OpenFreeMap](https://openfreemap.org) (niente chiave, attribuzione obbligatoria, già mostrata). |
| `data/iconicPieces.js` | I pezzi iconici, scelti a mano: la pagina 404 ne mostra uno, e da qui parte il rapporto sui dati verificati. |
| `data/homeData.js`, `data/storyCovers.js` | **Generati**: non modificarli a mano. |

## Aggiungere un pezzo

1. In `src/data/objectsExtra.js`, in fondo all'elenco:

   ```js
   {
     id: "nome-del-pezzo",            // minuscole e trattini: diventa /piece/nome-del-pezzo
     name: "Nome del pezzo",
     designer: "Nome Cognome",        // scritto sempre allo stesso modo: diventa /designer/…
     brand: "Produttore",
     year: 1965,
     category: "chairs",              // chairs, sofas, lamps, tables, decor, audio, rugs, art, books
     styles: ["midcentury"],
     country: "Italy",
     materials: ["walnut", "leather"],
     description: "Una frase, verificata.",
     image: img("nome-del-pezzo"),
   },
   ```

2. In `src/data/objectPhotos.js`, la sua foto, sempre con la fonte:

   ```js
   "nome-del-pezzo": { url: "https://…", author: "…", license: "CC BY 4.0", source: "Wikimedia Commons", sourceUrl: "https://…" },
   ```

3. `npm run check`. Se due grafie diverse dello stesso designer o produttore finiscono sullo stesso
   indirizzo (per esempio «Molteni&C» e «Molteni & C.»), il controllo lo segnala.

## Aggiungere una stringa o una lingua

Nessun testo dell'interfaccia va scritto direttamente nei componenti: si usa `t("gruppo.chiave")`,
con eventuali variabili `t("designer.pieces", { count: 3 })`.

Per una stringa nuova:

```bash
node scripts/scaffold-i18n.mjs gruppo.chiave "Testo in inglese"
```

La aggiunge ai cinque dizionari; nelle altre lingue compare come `TODO …` finché non la traduci.
Per inserirne molte già tradotte: `--file chiavi.json`, con `{ "gruppo": { "chiave": { "en": "…", "it": "…", "es": "…", "fr": "…", "zh": "…" } } }`.

Per una lingua nuova: copia `src/i18n/dictionaries/en.js` con il codice della lingua, traducilo,
aggiungilo in `src/i18n/dictionaries.js` (`LANGUAGES`, `LANGUAGE_NAMES` e `LOADERS`) e a `LANGS` negli
script `check-i18n.mjs` e `scaffold-i18n.mjs`.

## Pubblicazione su GitHub Pages

Il workflow `.github/workflows/deploy.yml` fa `check`, `test`, `build` e pubblica a ogni push su `main`, e
ogni mattina alle 4:30 UTC (così ogni storia nuova ha la sua pagina statica e finisce nella sitemap).

1. Installa [Git](https://git-scm.com/download/win) e crea un repository su GitHub.
2. Nel repository: **Settings → Pages → Source: GitHub Actions**.
3. Dalla cartella del progetto:

   ```bash
   git init
   git add .
   git commit -m "Design Archive"
   git branch -M main
   git remote add origin https://github.com/<utente>/<repository>.git
   git push -u origin main
   ```

Il sito esce su `https://<utente>.github.io/<repository>/`. Se invece usi un dominio tuo o il sito
utente `<utente>.github.io`, imposta la variabile del repository `SITE_BASE` a `/`
(Settings → Secrets and variables → Actions → Variables); con un dominio tuo imposta anche `SITE_URL`
(per esempio `https://designarchive.it`), che serve a sitemap e anteprime dei link.

Le lingue hanno un indirizzo ciascuna con `?lang=it` (e `es`, `fr`, `zh`): è quello che indicano i
link `hreflang` delle pagine statiche.

## Account

Il codice è pronto; manca solo il collegamento a Supabase, che fai tu (servono un account e chiavi
personali). Finché non c'è, il sito funziona come oggi. Nessuna chiave segreta va nel codice del
browser: nel sito finiscono solo l'indirizzo di Supabase e la chiave pubblica "anon"; la chiave
service_role vive nei segreti delle funzioni server o nel tuo `.env.local`, che non viene mai
pubblicato (`.env.example` elenca tutto).

### In alternativa: account su Railway

Il sito resta su GitHub Pages; su Railway gira solo il servizio degli account (`server/`: email e
password, con nome, data di nascita e paese). `railway.json` dice già a Railway come avviarlo.

1. Su <https://railway.com>: **New Project → Deploy from GitHub repo** e scegli questo repository.
2. Nello stesso progetto: **New → Database → PostgreSQL**. Poi, nelle **Variables** del servizio,
   aggiungi `DATABASE_URL` come riferimento al database (`${{Postgres.DATABASE_URL}}`): senza, gli
   account stanno in memoria e si perdono a ogni riavvio.
3. Sempre nelle **Variables** del servizio: `ALLOWED_ORIGINS=https://<utente>.github.io` e
   `SITE_URL=https://<utente>.github.io/<repository>`; facoltative `RESEND_API_KEY` ed `EMAIL_FROM`
   per le email di recupero password.
4. In **Settings → Networking → Generate Domain** Railway dà un indirizzo pubblico; controlla che
   `<indirizzo>/health` risponda.
5. Su GitHub, nelle variabili del repository (Settings → Secrets and variables → Actions →
   **Variables**), crea `API_URL` con quell'indirizzo e rilancia la pubblicazione: da quel momento il
   sito usa gli account di Railway invece di Supabase.

### Costi mensili

| Voce | In prova | Online |
|---|---|---|
| Supabase | 0 € (piano Free: 2 progetti, 500 MB di database, 1 GB di foto; si mette in pausa dopo una settimana senza visite) | 25 $/mese per il piano a pagamento di Supabase (nessuna pausa, backup giornalieri) |
| Email (Resend) | 0 € fino a 3.000 email al mese (massimo 100 al giorno) | 20 $/mese oltre |
| Dominio | circa 10–15 € all'anno, necessario per inviare le email | idem |
| GitHub Pages | 0 € | 0 € |

### 1. Supabase

1. Crea un account su <https://supabase.com> e un progetto **nella regione Europa (Frankfurt)**.
   Conviene averne due: uno di prova e uno vero.
2. Da *Project Settings → API* copia **Project URL** e **anon public key**, e mettili in `.env.local`
   (vedi `.env.example`) e nelle variabili del repository GitHub `SUPABASE_URL` e `SUPABASE_ANON_KEY`
   (Settings → Secrets and variables → Actions → **Variables**: sono valori pubblici).
   Nello stesso `.env.local`, solo sul tuo computer, la **service_role key** (`SUPABASE_SERVICE_ROLE_KEY`).
3. Collega il progetto e crea il database (serve una volta):

   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-del-progetto>
   npx supabase db push
   ```

4. *Authentication → URL Configuration*: **Site URL** = l'indirizzo del sito
   (`https://<utente>.github.io/design-archive`), e tra i **Redirect URLs** aggiungi
   `https://<utente>.github.io/design-archive/account` e `http://localhost:5173/account`.
5. *Authentication → Providers*: **Email** attivo (è il link di accesso senza password).

### 2. Accesso con Google

1. Su <https://console.cloud.google.com>: crea un progetto, *APIs & Services → OAuth consent screen*
   (tipo esterno, nome del sito, email), poi *Credentials → Create credentials → OAuth client ID*
   (tipo *Web application*).
2. Come *Authorized redirect URI* metti quello che Supabase mostra in *Authentication → Providers →
   Google* (`https://<ref>.supabase.co/auth/v1/callback`).
3. Copia Client ID e Client secret nel provider Google di Supabase e attivalo.

Accesso con Apple: richiede l'Apple Developer Program (99 $ l'anno); si aggiunge allo stesso modo
quando vorrai.

### 3. Email

L'invio integrato di Supabase è solo per le prove (poche email all'ora). Per il sito vero:

1. Account su <https://resend.com>, aggiungi il tuo dominio e i record DNS che indica.
2. In Supabase, *Authentication → Emails → SMTP Settings*: host `smtp.resend.com`, porta 465,
   utente `resend`, password = la chiave API di Resend, mittente sul tuo dominio.

### 4. Funzioni server

Una sola funzione, `delete-account` ("Elimina il mio account": cancella le immagini delle moodboard
condivise e poi l'account, con tutte le sue righe). Si pubblica con:

```bash
npx supabase secrets set SITE_ORIGIN=https://<utente>.github.io ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173
npx supabase functions deploy delete-account
```

Le funzioni di una volta non esistono più (gli avvisi della lista "Cerco", Riconosci, i pagamenti).
Se erano già pubblicate in un progetto, vanno spente a mano con
`npx supabase functions delete <nome>`. La migrazione
`supabase/migrations/20261007120000_remove_plans_identify.sql` toglie dal database le tabelle dei
piani e dei riconoscimenti.

### 5. Dati verificati e misure

Tutto parte da file privati in `data-private/` (esclusi da Git). Ogni dato deve avere fonte e data
di consultazione, o i controlli si fermano: niente dati inventati.

- **Segni di autenticità e produzione** (`buying-guide.json`, `price-bases.json`): pubblici, in
  `src/data/pieceFacts.js`, generato da `npm run guide:import`. Si vedono a tutti nella scheda del
  pezzo. Il file pubblico non contiene mai prezzi né misure (`check:data` lo verifica).
- **Misure**: nella tabella `buying_guide`, leggibile da tutti, per le proporzioni reali della
  stanza e le schede tecniche del PDF: `npm run guide:import -- --upload`.

### 6. Test

- `npm test`: i test senza rete girano sempre; quelli su Supabase (isolamento tra due utenti di
  prova, nessun limite sulla collezione, misure leggibili) partono quando `.env.local` ha le chiavi
  del **progetto di prova**. Creano e poi cancellano due utenti fittizi.
## Foto e diritti

Ogni foto è accreditata e rimanda alla pagina da cui proviene (`/credits`). Una parte è a licenza
libera (Wikimedia Commons, Flickr CC, Unsplash, Pexels); le altre vengono da produttori, musei, case
d'asta e rivenditori, mostrate a solo scopo di riferimento e di proprietà di chi ne detiene i
diritti. Le foto non vengono copiate sul sito: sono caricate dai server originali, e se uno smette
di rispondere il pezzo mostra un segnaposto disegnato. `npm run check:images` dice quali.
