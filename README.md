# TechIndex

Die Schweizer Open-Source Gaming Plattform.

Shop auf [www.techindex.ch](https://www.techindex.ch): Handhelds, Controller, Kabel, Beamer und Peripherie. Der frühere Blog wird nicht übernommen.

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

`data/catalogue.json`: 20 Handheld-Modellfamilien mit 59 Varianten sowie jeweils 12 Controller, Kabel, Beamer und Peripherie-Modelle. Verfügbarkeit, CHF-Verkaufspreise, aufklappbare Produktdetails und Schweizer Versandoptionen stehen pro Ausführung bereit. Jeder Verkaufspreis entspricht dem sichtbaren TVCMALL-Einkaufspreis plus CHF 20. Die Preisgrundlage steht in `research/supplier-pricing.json` und wird nicht als statische Datei veröffentlicht. Warenkorb und echte Kundenkonten sind verfügbar; Bestellabschluss und Zahlungsabwicklung sind noch nicht eingerichtet.

Versandtarife sind datierte Lieferantenschätzungen für die angegebene Stückzahl. Günstigste Option: niedrigste Gebühr. Schnellste Option: kleinste obere Dauer, danach kleinere untere Dauer, danach günstigster Tarif. Werktage werden für den Vergleich mit 7/5 normalisiert; angezeigt wird immer die ursprüngliche Zeiteinheit. Bearbeitungszeiten stehen separat. Es wird kein unbestätigter Sammelversandbetrag berechnet. Im Warenkorb werden mögliche Einfuhrabgaben und Zollabfertigungsgebühren mit BAZG-Quelle erläutert.

Die Modellsuche berücksichtigt Ausführungen und Farben. Kategorie, Suche und Seite bleiben beim Neuladen über URL-Parameter erhalten.

Der Import verwendet gespeicherte sichtbare Lieferantenbeobachtungen und redaktionelle deutsche Beschreibungen (keine privaten API-Aufrufe):

```sh
python3 scripts/import-catalogue.py /pfad/supplier-observations.json /pfad/details.json
```

Hosting, Veröffentlichung und Wiederherstellung: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Der AYN Thor steht als erstes Produkt unter Handhelds, mit drei Speicheroptionen (8/128 GB, 12/256 GB, 16 GB/1 TB) und neun Farb-/Speichervarianten im Produktdialog. Das ursprüngliche Plattform-Banner bleibt erhalten. Als `featured` markierte Produkte erscheinen vor den übrigen Modellen ihrer Kategorie. Jede Katalogvariante hat ein eigenes lokales Bild; die Auswahl aktualisiert Bild, Preis, Versand und variantenspezifische Speicherdetails gemeinsam.
