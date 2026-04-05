# Desktop build and auto-update

## Local installers (no upload)

```bash
cd apps/www
npm install
npm run dist
```

Runs `next build`, then packages **macOS** and **Windows** with `electron-builder` (`--publish never`). Output is under `dist/`. The Windows NSIS installer is **x64** only (typical Intel/AMD PCs), including when you build on Apple Silicon—so friends should use `*-win-x64.exe`, not `win-arm64` artifacts.

## Shipping updates to users

Packaged apps use `electron-updater` and the GitHub provider in `package.json` (`trueosdev/trueChat`). Users only receive updates after artifacts are published to a **GitHub Release**.

1. Bump `version` in `package.json`.
2. Commit and push a tag matching `.github/workflows/desktop-release.yml`, e.g. `v0.2.0`.
3. CI builds each OS and runs `npm run release` (publish). Installed apps check for updates on open.

## Publish from your machine

```bash
cd apps/www
GH_TOKEN=<token with repo contents write> npm run release
```

Use a personal access token (or fine-grained token) that can upload releases to the configured repo.
