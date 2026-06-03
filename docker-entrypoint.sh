#!/bin/sh
set -e

# Auto-update yt-dlp (and its EJS challenge-solver scripts) on every boot.
# YouTube changes its player frequently; a stale yt-dlp causes signature/n
# challenge solving to fail ("no solutions" -> "Requested format is not
# available"). Refreshing on start keeps playback working with just a restart.
#
# If the update can't reach PyPI (offline, rate-limited, etc.) we keep running
# on the version baked into the image at build time rather than crashing.
echo "[entrypoint] Updating yt-dlp..."
if pip install --no-cache-dir --upgrade "yt-dlp[default]"; then
	echo "[entrypoint] yt-dlp is up to date: $(yt-dlp --version)"
else
	echo "[entrypoint] WARNING: yt-dlp update failed; using build-time version: $(yt-dlp --version 2>/dev/null || echo unknown)"
fi

exec node dist/index.js
