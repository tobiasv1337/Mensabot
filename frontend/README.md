# Mensabot Frontend

This package contains the Vite + React web client for Mensabot.

## Useful Commands

- `npm run dev` starts the development server.
- `npm run lint` runs the frontend lint checks.
- `npm run build` builds the production bundle and the PWA service worker.

## Audit Status

- Safe transitive fixes for `picomatch`, `flatted`, and `brace-expansion` should come from the current compatible toolchain versions and the refreshed lockfile.
- Do not use `npm audit fix --force` here. The suggested downgrade path points to `vite-plugin-pwa@0.19.8`, which does not support the current Vite 7 setup.
- The remaining audit findings come from the current `vite-plugin-pwa` / `workbox-build` toolchain used during PWA build generation. They are tracked upstream and remain until there is a Vite-7-compatible upstream fix path.
