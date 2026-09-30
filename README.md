# TechIndex

Die Schweizer Open-Source Gaming Plattform.

Shop-Vorschau auf [www.techindex.ch](https://www.techindex.ch): Handhelds, Controller, Kabel, Beamer und Peripherie. Das Forum folgt als Schritt 2. Der frühere Blog wird nicht übernommen.

## Lokal öffnen

Node.js und npm sind erforderlich. Kundenkonten nutzen Better Auth und Cloudflare D1. Einrichtung: [docs/ACCOUNTS.md](docs/ACCOUNTS.md).

```sh
npm ci
npm run db:local
npm run dev
```

Vorschau: http://127.0.0.1:4173

## Prüfen und bauen

```sh
npm test
npm run build
```

Der Build erzeugt `dist/` und kopiert nur die öffentlichen Dateien der neuen Plattform. Cloudflare Pages veröffentlicht dieses Verzeichnis automatisch bei Änderungen auf `main`. Der Vorschaustand setzt absichtlich `noindex`.

## Inhalt und Verkaufsstatus

`data/catalogue.json`: 19 Handheld-Modellfamilien mit 50 Varianten plus 12 ausgewählte Zubehörmodelle. Alle Produkte bleiben nicht bestellbare Recherchekandidaten. Warenkorb und echte Kundenkonten sind verfügbar. Es gibt noch keine Verkaufspreise, Bestellabschlüsse oder Zahlungen. Produktbilder und Lieferantenquellen sind pro Modell dokumentiert; Produktfreigaben und Bildrechte sind vor dem Verkaufsstart zu klären.

Die Modellsuche berücksichtigt Ausführungen und Farben. Kategorie, Suche und Seite bleiben beim Neuladen über URL-Parameter erhalten.

Der Import aus den Recherchedateien ist reproduzierbar:

```sh
python3 scripts/import-catalogue.py /absoluter/pfad/zur/recherche
```

Hosting, Veröffentlichung und Wiederherstellung: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
