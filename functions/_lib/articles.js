const STORE_KEY = 'articles';
const STORE_BINDINGS = ['TECHINDEX_ARTICLES', 'ARTICLE_STORE', 'ARTICLES_KV'];

export const seedArticles = [
  article('langzeit-test-nvme-ssds-2025', 'Langzeit-Test: NVMe SSDs 2025', 'Hardware', '2025-11-21', '8 Minuten', '12 Monate Dauertest: Performance-Drift, Temperaturkontrolle und Firmware-Risiken aktueller NVMe SSDs.', '12 Monate Belastungstest: Performance-Drift, Temperaturlimits und Firmware-Fallen im Überblick.', 'https://picsum.photos/seed/langzeit-test-nvme-ssds-2025/1200/630', 'NVMe SSDs auf einem Testbench'),
  article('cloud-backup-3-2-1-strategie-einfach-erklaert', 'Cloud-Backup: 3-2-1-Strategie einfach erklärt', 'Software', '2025-11-18', '6 Minuten', 'So kombinierst du lokale Medien, Offsite-Backups und verschlüsselte Cloud-Dienste zur perfekten 3-2-1-Strategie.', 'So kombinierst du lokale Platten, NAS und verschlüsselte Cloud-Speicher ohne Bauchweh.', 'https://picsum.photos/seed/cloud-backup-3-2-1-strategie-einfach-erklaert/1200/630', 'Symbolbild aus Wolken-Icons und NAS-System'),
  article('ram-knappheit-analyse', 'DDR4 & DDR5 RAM-Knappheit 2025/2026', 'Hardware', '2026-01-08', '9 Minuten', 'Die RAM-Preise für DDR4 und DDR5 explodieren 2025/2026. Ursachen, Prognosen und Upgradetipps.', 'RAM-Krise in der Schweiz: Preise explodieren, Verfügbarkeit sinkt - Ursachen, Prognosen und Upgradetipps.', 'pictures/RAM_Kriese.png', 'RAM-Module auf einem Mainboard mit Preisschild'),
  article('grafikkarten-analyse-2025', 'Grafikkarten-Analyse 2025', 'Hardware', '2025-11-19', '9 Minuten', 'RTX 50 vs. RX 9000: Welche Grafikkarte liefert 2025 in der Schweiz das beste FPS-pro-100-CHF-Verhältnis?', 'RTX 50 vs. RX 9000: Unser FPS-pro-100-CHF-Index für den Schweizer Markt 2025.', 'pictures/grafikkarten-analyse-2025.jpg', 'RTX 50 und RX 9000 Grafikkarten nebeneinander'),
  article('raw-workflow-mit-capture-one-vs-lightroom', 'RAW-Workflow mit Capture One vs. Lightroom', 'Fotografie', '2025-11-02', '9 Minuten', 'Capture One oder Lightroom? Wir vergleichen Farb-Engine, Tethering und KI-Tools im RAW-Workflow.', 'Farb-Engines, Tethering und KI-Masken im direkten Vergleich für Studio und Reportage.', 'https://picsum.photos/seed/raw-workflow-mit-capture-one-vs-lightroom/1200/630', 'Laptop mit Capture One und Lightroom nebeneinander'),
  article('guenstige-4k-monitore-im-vergleich', 'Günstige 4K-Monitore im Vergleich', 'Preisvergleich', '2025-10-30', '7 Minuten', 'Drei 4K-Monitore unter 500 Franken im Vergleich: Panelqualität, Anschlüsse und Kalibrierung.', 'IPS, VA oder OLED? Wir testen Farbraumabdeckung, Uniformity und Ergonomie unter 500 Franken.', 'https://picsum.photos/seed/guenstige-4k-monitore-im-vergleich/1200/630', 'Drei 4K-Monitore nebeneinander auf einem Schreibtisch'),
  article('cpu-analyse-2025', 'CPU-Analyse 2025', 'Hardware', '2025-11-19', 'ca. 11 Minuten', 'Ryzen 7000/9000, Intel 12.-14. Gen, X3D & Quick Sync: Preis-Leistung für Gaming, Editing und Rendering.', 'Ryzen 7000/9000 vs. Intel 12.-14. Gen: Preis-Leistungs-Check für Gaming, Editing und Rendering.', 'pictures/CPU-Analyse-2025.jpg', 'AMD- und Intel-Desktop-CPUs nebeneinander auf einem Mainboard'),
  article('noise-reduction-topaz-vs-dxo', 'Noise-Reduction: Topaz vs. DxO', 'Fotografie', '2025-10-20', '6 Minuten', 'Topaz Photo AI oder DxO PureRAW? Wir vergleichen die aktuellen Noise-Reduction-Algorithmen.', 'KI-Modelle im Direktvergleich: Detailerhalt, Batch-Fähigkeit und GPU-Performance.', 'https://picsum.photos/seed/noise-reduction-topaz-vs-dxo/1200/630', 'Vergleich von entrauschten Nachtaufnahmen'),
  article('windows-11-privacy-hardening', 'Windows 11: Privacy Hardening', 'Software', '2025-10-15', '6 Minuten', 'Windows 11 datensparsam konfigurieren: Setup-Assistent, Telemetrie und Automatisierung im Griff.', 'Von O&O ShutUp bis Winget-Automation: So reduzierst du Telemetrie auf einem frischen System.', 'https://picsum.photos/seed/windows-11-privacy-hardening/1200/630', 'Laptop mit Windows 11 Datenschutz-Einstellungen')
];

function article(slug, title, category, date, readingTime, description, excerpt, image, imageAlt) {
  return {
    id: slug,
    slug,
    title,
    category,
    status: 'live',
    author: 'TechIndex Redaktion',
    date,
    readingTime,
    description,
    excerpt,
    image,
    imageAlt,
    content: `## Überblick\n${excerpt}\n\n## Einordnung\nDieser Artikel wird aus dem dynamischen Article Store gerendert und kann im Adminbereich aktualisiert werden.`
  };
}

export function getArticleStore(env) {
  return STORE_BINDINGS.map((name) => env[name]).find(Boolean) || null;
}

export async function readArticles(env) {
  const store = getArticleStore(env);
  if (!store) return seedArticles;
  const stored = await store.get(STORE_KEY, 'json');
  return Array.isArray(stored) && stored.length ? stored : seedArticles;
}

export async function writeArticles(env, articles) {
  const store = getArticleStore(env);
  if (!store) return false;
  await store.put(STORE_KEY, JSON.stringify(articles));
  return true;
}

export function publicArticles(articles) {
  return articles
    .filter((article) => article.status === 'live')
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export function normalizeArticle(input) {
  const title = clean(input.title) || 'Unbenannter Artikel';
  const slug = slugify(input.slug || title) || 'unbenannter-artikel';
  return {
    id: clean(input.id) || slug,
    slug,
    title,
    category: clean(input.category) || 'Hardware',
    status: ['live', 'draft', 'archived', 'deleted'].includes(input.status) ? input.status : 'draft',
    author: clean(input.author) || 'TechIndex Redaktion',
    date: clean(input.date) || new Date().toISOString().slice(0, 10),
    readingTime: clean(input.readingTime) || 'ca. 6 Minuten',
    description: clean(input.description),
    excerpt: clean(input.excerpt),
    image: clean(input.image),
    imageAlt: clean(input.imageAlt),
    content: clean(input.content),
    html: clean(input.html)
  };
}

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...(init.headers || {})
    }
  });
}

export function clean(value) {
  return String(value || '').trim();
}

export function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
