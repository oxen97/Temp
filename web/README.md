# AMOUS Web

Next.js application for the AMOUS interactive exhibition editor and viewer.

## Stack

- Next.js App Router
- React and TypeScript
- Tailwind CSS
- Zustand for editor state
- Zod for versioned project data
- IndexedDB through `idb` for local drafts
- Vitest and Testing Library
- Playwright for desktop and mobile browser tests

## Development

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

Copy `.env.example` to `.env.local` when backend credentials are available. Never commit real credentials.

## Checks

```powershell
npm run check
npm run test:e2e
```

`npm run check` runs ESLint, TypeScript, unit tests, and the production build.
