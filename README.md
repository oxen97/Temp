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

## Isolated local AI experiment

The browser-only Local AI Lab lives in `experiments/local-ai-lab`. It has its
own package lock and does not participate in the AMOUS app build or GitHub Pages
deployment.

```powershell
cd experiments/local-ai-lab
npm ci
npm run dev
```

The model is downloaded only after the user clicks the load button and is kept
in browser cache. Generated commands are validated draft-only proposals; the
experiment cannot mutate an AMOUS project.
