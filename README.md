# Emko Papier – Vernostný systém

Digitálna vernostná karta pre sieť 4 predajní papiernictva Emko Papier.
Zákazník má statický QR kód (jeho ID), zamestnanec ho naskenuje, pridá pečiatku
za nákup a po nazbieraní 5 pečiatok vzniká odmena – percentuálna zľava platná 60 dní.
Všetky pravidlá sú konfigurovateľné v admin paneli.

## Technológie

- **Next.js 15** (App Router, TypeScript)
- **Supabase** (PostgreSQL + Auth, RLS zapnuté)
- **Tailwind CSS 3**
- **qrcode** (generovanie QR), **html5-qrcode** (skenovanie kamerou), **exceljs** (XLSX export)

Všetky npm balíčky sú čisto JavaScriptové – inštalácia nevyžaduje Visual Studio
Build Tools, Python ani node-gyp.

## Prvé spustenie

### 1. Supabase projekt

1. Vytvorte projekt na [supabase.com](https://supabase.com).
2. V **SQL Editor** spustite celý súbor [`supabase/schema.sql`](supabase/schema.sql)
   (vytvorí tabuľky, RLS politiky, seed 4 predajní a predvolené nastavenia).
3. Vytvorte prvého admina:
   - **Authentication → Users → Add user** – zadajte e-mail + heslo a zaškrtnite
     *Auto Confirm User*.
   - Skopírujte UUID používateľa a v SQL editore spustite:
     ```sql
     insert into public.employees (id, name, email, role)
     values ('<UUID-Z-AUTH>', 'Meno Priezvisko', 'email@emko.sk', 'admin');
     ```
   - Ďalších zamestnancov už vytvoríte priamo v admin paneli aplikácie.

### 2. Aplikácia

```bash
copy .env.local.example .env.local   # doplňte hodnoty zo Supabase (Settings -> API)
npm install
npm run dev
```

Aplikácia beží na http://localhost:3000.

> **Skenovanie kamerou** vyžaduje HTTPS alebo `localhost` (obmedzenie prehliadačov).
> V produkcii nasaďte za HTTPS (napr. Vercel); na tabletoch v predajni potom
> kamera funguje bez problémov. Vždy je k dispozícii aj ručné zadanie ID.

## Ako to funguje v predajni

1. Zamestnanec sa prihlási (`/login`).
2. Naskenuje QR kód zákazníka (`/scan`) alebo ho vyhľadá (`/dashboard`).
3. Na detaile zákazníka pridá pečiatku – zadá predajňu a sumu nákupu.
   Pečiatka sa pridá len pri nákupe nad nastavenú hranicu; max. 1 pečiatka na nákup.
4. Po nazbieraní potrebného počtu pečiatok automaticky vznikne odmena.
   Kým je odmena aktívna, ďalšie pečiatky sa nepridávajú.
5. Pri ďalšom nákupe zamestnanec odmenu **uplatní** – zľava sa poskytne pri
   pokladni a zberný cyklus začína odznova. Neuplatnená odmena po 60 dňoch
   expiruje a cyklus sa tiež resetuje.

Zákazník má verejnú kartu na adrese `/card/<id-zákazníka>` – uloží si ju ako
záložku alebo screenshot QR kódu. (Apple/Google Wallet je pripravené ako
budúce rozšírenie – QR obsah zostane rovnaký.)

## Architektúra

```
app/                    UI (server + klientske komponenty) – bez business logiky
app/api/                API vrstva – tenké routy: auth kontrola + volanie služieb
lib/services/           BUSINESS LOGIKA (jediné miesto s pravidlami programu)
lib/supabase/           DB prístup – server/browser/admin klienti
supabase/schema.sql     schéma DB, RLS politiky, seed
middleware.ts           refresh session + presmerovanie neprihlásených
```

Hlavné funkcie service vrstvy: `createCustomer`, `findCustomers`, `addStamp`,
`checkRewardEligibility`, `createReward`, `redeemReward`, `resetCustomerCycle`,
`gdprExportCustomer`, `gdprDeleteCustomer`, `generateExport`, `getAdminStats`.

## Bezpečnosť

- **RLS zapnuté na všetkých tabuľkách.** Prihlásení zamestnanci majú z klienta
  iba čítanie; všetky zápisy idú cez server (service role key) po overení
  prihlásenia a roly v API vrstve. Zamestnanec preto nemôže mazať zákazníkov
  ani meniť odmeny – tieto akcie vyžadujú rolu `admin`.
- Každá akcia (pečiatka, odmena, registrácia, export, zmazanie, zmena
  nastavení…) sa loguje do `audit_logs`.
- Vstupy sa validujú na serveri v service vrstve.
- `SUPABASE_SERVICE_ROLE_KEY` je len serverová premenná – nikdy sa neposiela
  do prehliadača. Nedávajte ju do gitu.

## Roly

| Rola | Môže |
|---|---|
| Zákazník | bez loginu; má QR kartu `/card/<id>` so stavom pečiatok |
| Zamestnanec | vyhľadať/registrovať zákazníka, skenovať QR, pridať pečiatku, uplatniť odmenu, vidieť históriu |
| Admin | všetko vyššie + štatistiky, správa zamestnancov, nastavenia programu, CSV/XLSX exporty, GDPR export/zmazanie, audit log |

## Známe obmedzenia MVP (zámerné)

- Apple/Google Wallet pass zatiaľ nie je – QR karta v prehliadači ho plne nahrádza.
- Odmeny expirujú „lenivo" – pri najbližšom načítaní zákazníka (netreba cron).
- Export je limitovaný na 10 000 riadkov na jeden súbor.
