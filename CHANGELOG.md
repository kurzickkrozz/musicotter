# Changelog

All notable changes to **MusicOtter** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.4.9] - 2026-06-02

### Added

- **Startup warm-up of yt-dlp's challenge-solver cache.** On `ready`, the bot runs a
  background, best-effort extraction that downloads YouTube's player JS and solves its
  `n`/signature challenges before any user request — moving that one-time cold-solve cost
  off the first `/play`.

### Changed

- **yt-dlp now uses a persistent cache directory on the mounted `/app/data` volume**
  (`--cache-dir`). The solved player + nsig functions survive container rebuilds and
  restarts, so the expensive JS-challenge solve happens once rather than on every
  `docker compose up --build`. This is the primary fix for slow first-song loading.
- **Plain-text `/play` searches no longer trigger a SoundCloud `client_id` scrape.**
  Source detection only attempts SoundCloud validation for actual `soundcloud.com` URLs,
  so text queries go straight to YouTube. SoundCloud and Spotify link handling is
  unchanged (SoundCloud links still stream directly from SoundCloud).

## [1.4.8] - 2026-06-02

### Fixed

- **YouTube playback failing with `Signature solving failed` / `Requested format is not available`.**
  YouTube rolled out a new player and the SABR-only streaming experiment, which a stale
  yt-dlp (2026.02.21, bundling EJS 0.5.0) could no longer solve — every challenge returned
  `no solutions`, leaving no playable format. Resolved by always running a current yt-dlp
  with up-to-date [EJS](https://github.com/yt-dlp/yt-dlp/wiki/EJS) challenge-solver scripts
  (see below). No application code changed — `jsRuntimes: 'node'` was already correct.

### Added

- **Docker-only deployment.** Added `Dockerfile`, `docker-compose.yml`, and
  `docker-entrypoint.sh`. The image bundles everything the bot needs (Node 22, Python,
  FFmpeg via `ffmpeg-static`, and yt-dlp) so nothing has to be installed on the host.
- **Automatic yt-dlp updates on every container start.** The entrypoint runs
  `pip install -U "yt-dlp[default]"` before launching the bot, so future YouTube player
  changes are picked up with a plain `docker compose restart` — no rebuild required. If
  PyPI is unreachable at boot, the bot falls back to the version baked into the image
  rather than failing to start.

### Changed

- **Base image upgraded from `node:20-alpine` to `node:22-alpine`.** The EJS `node`
  JavaScript-challenge runtime requires Node ≥ 22; on Node 20 it silently returned
  `no solutions`.
- **yt-dlp is now installed via pip (`yt-dlp[default]`) inside an isolated venv**, pointed
  to by `youtube-dl-exec` through the `YOUTUBE_DL_DIR` / `YOUTUBE_DL_FILENAME` /
  `YOUTUBE_DL_SKIP_DOWNLOAD` environment variables. This avoids the glibc-only standalone
  binary (incompatible with Alpine's musl) and guarantees the EJS scripts are present.
- **Container restart policy changed from `no` to `unless-stopped`** so the bot survives
  crashes and host reboots.
- **README updated for the Docker-only workflow** — Quick Start, Prerequisites, the yt-dlp
  section, Development commands, Troubleshooting, and the project structure now reflect the
  containerized deployment and auto-update behavior.

## [1.4.7]

- Baseline release prior to the Docker migration. See the
  [commit history](https://github.com/kurzickkrozz/musicotter/commits/master) for details.

[Unreleased]: https://github.com/kurzickkrozz/musicotter/compare/v1.4.9...HEAD
[1.4.9]: https://github.com/kurzickkrozz/musicotter/compare/v1.4.8...v1.4.9
[1.4.8]: https://github.com/kurzickkrozz/musicotter/compare/v1.4.7...v1.4.8
[1.4.7]: https://github.com/kurzickkrozz/musicotter/releases/tag/v1.4.7
