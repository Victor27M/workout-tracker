# Training — workout tracker

Static PWA for logging weight × reps per set. Data lives on the device (IndexedDB), with JSON backup in Settings.

```sh
npm install
npm run dev     # local + LAN
npm run check   # date / last-session logic self-check
npm run build   # writes public/calendar.ics, type-checks, builds dist/
```

- `src/plan.ts`: the default program. It only seeds an empty database; after that you edit everything in the app (Edit button).
- `scripts/ics.ts`: weekly calendar feed. Each event links to `…/#mon` … `#sat`.
- Each push to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.
