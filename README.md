# AMOUS

AMOUS is a browser-based interactive exhibition editor built with Next.js,
React, and TypeScript.

## Live demo

[Open AMOUS](https://oxen97.github.io/Temp/)

## Local development

```powershell
cd web
npm ci
npm run dev
```

Open `http://localhost:3000/`.

## Verification

```powershell
cd web
npm run check
npm run test:e2e
```

Pushes to `main` are built as a static export and deployed to GitHub Pages by
the repository's Pages workflow.
