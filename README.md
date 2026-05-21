# X — Life OS

Personal dashboard. Starts with the gym module. Built to be lightweight, scalable, and yours.

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS** for styling, custom warm palette
- **Zustand** for state, persisted to LocalStorage
- **Geist** (sans), **Fraunces** (display serif), **JetBrains Mono** (numbers)

No backend yet. Everything runs in the browser. Your data lives in LocalStorage. Move to a real DB when you're ready (the data layer is isolated — only `src/store/useStore.ts` changes).

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000

## What's here

```
src/
  app/
    page.tsx              ← Today / home dashboard
    gym/
      page.tsx            ← Gym module dashboard
      log/page.tsx        ← Session logger (record your workout)
      history/page.tsx    ← Past cycles
      exercise/[id]/      ← Exercise form detail page
  components/
    Sidebar.tsx           ← Module nav
    ThemeProvider.tsx     ← Dark/light toggle
  data/
    days.ts               ← The 4-day cycle definition
    exercises.ts          ← All locked-in exercises with form notes
  store/
    useStore.ts           ← Zustand store, namespaced for future modules
```

## Design philosophy

- **Warm dark by default.** Charcoal with brown undertones, never pure black.
- **Display serif (Fraunces) for headings**, geometric sans (Geist) for UI, mono (JetBrains) for numbers.
- **Muted earth tones** for muscle group accents — no neon.
- **Subtle paper grain** on raised cards, low-key graph paper background option.
- Quiet confidence over loud encouragement.

## Adding modules later

1. Drop a new folder in `src/app/(modules)/<name>/`
2. Add a slice to `useStore.ts` — same pattern as `gym`
3. Add a nav item in `Sidebar.tsx` (remove `soon: true`)

The whole app shell already supports it. You're not building a new app, you're plugging in a new module.

## Bundle size

Approximate JS shipped to client:
- Next.js + React: ~80KB gzipped
- Zustand: ~3KB
- Your code: ~25KB
- Total: ~110KB gzipped — light enough for slow connections.

No image hosting. Exercise demo URLs point to public sources you can swap anytime.
# lifeos
