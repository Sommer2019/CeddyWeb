Migration Plan — Vite + React + TypeScript

Ziel: Komplett-Umwandlung der Website in eine SPA mit Vite + React (TypeScript). OB/ Seiten bleiben unverändert.

Schritte (vollständig, ausführbar):

1) Lokales Setup (einmalig)

```bash
# In project root
npm install
# Optional: wenn du pnpm oder yarn bevorzugst
# pnpm install
# yarn install
```

2) Dev Server starten

```bash
npm run dev
```

3) GitHub Pages deploy vorbereiten
- Setze in GitHub Repo Settings > Pages: Branch: gh-pages (nachdem Workflow das build gepusht hat)
- Optional: setze BASE_URL (wenn repo is not root domain) als env in GH Actions oder in workflow

4) Vollständiges Rewrite (empfohlen, Schritt-für-Schritt)
- Priority 1: `clipdesjahres.html`, `impressum.html`, `datenschutz.html` — diese werden jetzt in `src/pages/*.tsx` gehostet (iframe -> native portieren). Ich habe die TSX-Scaffolds erstellt. Portierungsschritte pro Seite:
  - Kopiere den HTML-body-Inhalt in die entsprechende React-Komponente in `src/pages/*`.
  - Extrahiere Inline-Scripts in `src/lib/*` (utility modules).
  - Styles: importiere globale Styles aus `public/css/*.css`; komponentenspezifische Styles als CSS Modules oder Tailwind.
  - Teste im Dev-Server.
- Priority 2: `games/bartclicker.html` und zugehörige Skripte
  - Extrahiere Logik in Hooks: `useBartClicker()` (zustand, save/load, events)
  - UI: konvertiere SVG + DOM-Updates zu React state/props
  - Behalte Offline/ServiceWorker-Handling kompatibel

5) Footer und CookieBanner
- Bereits ausgelagert: `src/components/Footer.tsx`, `src/components/CookieBanner.tsx`.
- Ersetze die vorhandenen HTML-Footer/Inline-cookie-banner mit React-Imports in `src/App.tsx`.

6) Tests
- Nutze Vitest + React Testing Library für smoke tests auf kritischen Komponenten (BartClicker interactions, cookie banner).

7) CI/CD
- GitHub Actions workflow geschaffen: `.github/workflows/deploy.yml` — baut und deployed auf `gh-pages`.

8) Finalisierung
- Entferne legacy .html Dateien, wenn alle Seiten nativ gemigriert sind (optional)

Commands to run locally

```bash
npm ci
npm run dev
npm run build
npm run preview
# deploy (CI will run on push to main); locally you can run:
npm run predeploy && npm run deploy
```

Wenn du willst, übernehme ich jetzt die native Portierung von `clipdesjahres.html`, `impressum.html`, `datenschutz.html` und anschließend `games/bartclicker.html` in TypeScript-React (vollständiger Rewrite). Sag mir, welche Seite ich zuerst vollständig portieren soll (ich empfehle `clipdesjahres`), dann mache ich das und teste intensiv.

