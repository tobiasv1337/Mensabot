# mensa-stt-server

Local speech-to-text (STT) HTTP service for Mensabot.

This service is intended to be run as a Docker container together with the rest of the stack
and is consumed by the API backend via `POST /api/transcribe`.

## Models / Language

The STT container runs `whisper.cpp` (`whisper-cli`) locally and loads a ggml model from `/models`.

- `STT_MODEL` selects which model file to use (default: `small` which maps to `/models/ggml-small.bin`).
- `STT_AUTO_DOWNLOAD_MODEL=true` downloads the model automatically into the `/models` volume if missing.
- `STT_LANGUAGE` is forwarded to `whisper-cli -l ...` (default: `auto` for auto-detect).

Important: Models ending with `.en` (for example `base.en`, `small.en`) are English-only. If you want
German transcription, use the multilingual variants without `.en` (for example `base`, `small`).

If you want higher accuracy than `small`, the next step up is `medium` (but it uses much more RAM/CPU).

## Local Dev

If you want to run the API backend and frontend locally (without deploying to the VM),
you can run only the STT service via Docker and point the API backend to it:

1. Start STT:
   - `docker compose up --build stt`
   - Note: by default the compose setup does not publish the STT port to the host. If you want to
     run the API backend outside Docker, add a temporary `ports: ["127.0.0.1:9100:9100"]` mapping
     to the `stt` service (or use a local override file you don’t commit).
2. Run API backend (example):
   - `export API_BACKEND_STT_BASE_URL=http://127.0.0.1:9100`
   - `uv run mensa-api-backend`
3. Run frontend:
   - `npm -C frontend run dev`
