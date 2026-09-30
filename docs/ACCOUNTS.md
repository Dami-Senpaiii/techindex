# Kundenkonten und Warenkorb

## Funktionen

- `/konto`: Registrierung, Login, Logout, Bestellhistorie mit Detailansicht und Pagination, persönliche Daten und Schweizer Lieferadresse, E-Mail- und Passwortänderung.
- `/warenkorb`: Varianten, Mengen (1–99), Entfernen und persistente Auswahl. Gäste speichern nur SKU und Menge im Browser. Beim Login wird diese Auswahl in den Kontowarenkorb übernommen; Kontodaten werden nicht im Browser gespeichert.
- Zahlungsmethoden sind sichtbar als späterer Bereich. Checkout ist deaktiviert, solange Preise, Versand und Zahlungsabwicklung fehlen. Es gibt keine öffentliche API zum Erzeugen von Bestellungen oder Festlegen von Preisen.
- Bestellungen stammen aus `shop_order`, sind ausschliesslich anhand der angemeldeten Benutzer-ID abrufbar und werden künftig vom serverseitigen Bestellprozess geschrieben. Neue Konten haben einen leeren Verlauf.

## Infrastruktur

Cloudflare Pages Functions, Better Auth 1.7 und eine eigene Cloudflare-D1-Datenbank `techindex-shop` mit EU-Jurisdiktion. Produktionsbindung: `SHOP_DB`. `BETTER_AUTH_SECRET` ist als verschlüsseltes Cloudflare Secret hinterlegt. Die bestehende KV-Konfiguration bleibt erhalten.

Der Build kompiliert die Functions mit der projektgebundenen Wrangler-Version zu `dist/_worker.js` (Pages Advanced Mode), weil der eingebaute Pages-Compiler veraltet sein kann. Die Produktionslaufzeit benötigt `nodejs_compat`. Einstellungen und Bindungen werden im Cloudflare-Dashboard verwaltet. `wrangler.dev.jsonc` enthält ausschliesslich die lokale Entwicklungsdefinition. Das Startskript kopiert sie in eine ignorierte `wrangler.jsonc`; diese Datei gehört nicht in Git.

## Lokal entwickeln

```sh
npm ci
# .dev.vars mit einem zufälligen BETTER_AUTH_SECRET anlegen (mindestens 32 Zeichen).
npm run db:local
npm run dev
```

Die Entwicklung nutzt eine lokale D1-Datenbank, niemals die Produktionsdaten. Schemas liegen versioniert unter `migrations/`. Neue Migrationen müssen separat vor dem Code-Deployment auf der Produktionsdatenbank ausgeführt werden. Die ersten drei Migrationen wurden beim Einrichten bereits angewendet.

```sh
npm test
# Zusätzlich gegen den laufenden lokalen Server:
npm run test:integration
```

Die Integration prüft zwei Konten, Datenisolation, Registrierung, Login/Logout, Cookie-Eigenschaften, Profil-, E-Mail- und Passwortänderungen, Warenkorb, echte Bestellabfragen mit ausschliesslich lokalen Fixtures, Eingabeprüfung und Origin-Schutz. Die Testkonten werden danach entfernt.

## Schutz und nächste Schritte

Better Auth übernimmt Authentifizierung, Sessions, Cookie-Signaturen und CSRF-Schutz. Passwörter verwenden natives scrypt mit zufälligem Salt; mindestens 12 Zeichen sind erforderlich. Produktionscookies sind Secure, HttpOnly, SameSite=Lax und auf den jeweiligen Host beschränkt. Auth-Endpunkte akzeptieren nur die Produktionsdomains und lokale Entwicklung. Preview-Domains erhalten keinen Kontozugriff. Mutationen verlangen denselben Origin und begrenzen JSON-Anfragen auf 16 KB.

Authentifizierung und Datenänderungen haben datenbankgestützte Ratenlimits. Profil, Warenkorb und Bestellungen verwenden ausschliesslich die Benutzer-ID aus der geprüften Sitzung, keine vom Client übermittelte Benutzer-ID. API-Antworten dürfen nicht zwischengespeichert werden. Eine Passwortänderung meldet andere Sitzungen ab; eine E-Mail-Änderung verlangt das aktuelle Passwort.

E-Mail-Versand ist noch nicht angebunden: Es gibt derzeit keine E-Mail-Verifizierung und keine Wiederherstellung per „Passwort vergessen“. E-Mail-Adressen gelten deshalb nicht als verifiziert. Vor dem Verkaufsstart einen Maildienst für Verifizierung und Wiederherstellung anbinden, Produktfreigaben und Preise festlegen sowie Checkout, serverseitige Bestellerzeugung und Zahlungsmethoden konfigurieren. Keine Passwörter oder Karteninformationen in Frontend-Speicher oder Logs schreiben.
