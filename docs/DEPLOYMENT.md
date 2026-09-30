# Cloudflare Pages

Das bestehende Pages-Projekt `techindex` ist mit `Dami-Senpaiii/techindex` verbunden.

| Einstellung | Wert |
| --- | --- |
| Produktionsbranch | `main` |
| Automatische Deployments | Aktiviert |
| Framework | None |
| Build-Befehl | `npm run build` |
| Ausgabeordner | `dist` |
| Root-Verzeichnis | Repository-Wurzel |
| Domains | `techindex.ch`, `www.techindex.ch` |
| Pages-Domain | `techindex.pages.dev` |

## Änderungen veröffentlichen

1. `npm test` und `npm run build` lokal ausführen.
2. Geprüfte Änderungen auf `main` pushen.
3. Unter Workers & Pages → techindex → Deployments den erfolgreichen Produktionsbuild prüfen.
4. Startseite, Katalog, Suche und Produktdialog auf der Domain kontrollieren.

Der Build kopiert eine explizite Liste öffentlicher Dateien. Cloudflare kompiliert zusätzlich die Pages Functions unter `functions/`; nur `/api/*` wird an sie weitergeleitet. Recherchedateien, Dokumentation, Tests und Skripte werden nicht ausgeliefert. Der Vorschaustand bleibt `noindex, nofollow` und ermöglicht keine Bestellungen oder Zahlungen.

Die früheren Blog- und Admin-Funktionen sind aus dem Repository entfernt. Bestehende Cloudflare-KV-Daten, Secrets und die Access-Regel für den früheren Admin-Pfad wurden beim Neuaufbau nicht gelöscht; der neue Shop verwendet sie nicht. Die neue D1-Bindung und Auth-Konfiguration sind in [ACCOUNTS.md](ACCOUNTS.md) dokumentiert.

Beide Domains sind dem Pages-Projekt zugeordnet. Der frühere A-Eintrag der Hauptdomain zeigte auf einen nicht erreichbaren Ursprung (HTTP 521) und wurde durch `CNAME @ → techindex.pages.dev` ersetzt.

## Wiederherstellung

Vor dem Neuaufbau wurde ein geprüftes lokales Backup mit Git-Mirror, Git-Bundle und vollständigem Arbeitsverzeichnis erstellt. Der letzte frühere Produktionsstand ist Commit `7dc0dc42552862aa47f4c6b34e3490c54d04d56a`.

Für eine unmittelbare Wiederherstellung kann im Cloudflare-Dashboard das frühere erfolgreiche Produktionsdeployment ausgewählt und zurückgerollt werden. Für einen erneuten Build des alten Codes müssen auch dessen frühere Build-Einstellungen wiederhergestellt werden: `npm install && npm run build`, Ausgabe in der Repository-Wurzel. Anschliessend die Domain und die damals verwendeten Functions prüfen.

KV-Daten, Secrets und externe Konfiguration sind nicht Bestandteil eines Git-Backups.
