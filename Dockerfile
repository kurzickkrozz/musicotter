FROM node:22-alpine

# --- Why these versions ---
# - node:22-alpine: yt-dlp's EJS JavaScript-challenge solver (used to solve
#   YouTube's `n` and signature challenges) requires Node >= 22 when running
#   with `--js-runtimes node` (which AudioSourceResolver passes via jsRuntimes:'node').
#   Node 20 silently returns "no solutions" and playback breaks.
# - python3 + venv: YouTube playback depends on a *current* yt-dlp. yt-dlp's
#   standalone binary is glibc-only and will not run on Alpine's musl, so we
#   install yt-dlp via pip. The `[default]` extra pulls in `yt-dlp-ejs`
#   (the EJS challenge-solver scripts) which is what actually fixes the
#   "Requested format is not available" / signature-solving failures.

WORKDIR /app

# Install Python + create an isolated venv holding the latest yt-dlp (with EJS).
# This is the binary the bot uses; youtube-dl-exec is pointed at it below.
RUN apk add --no-cache python3 \
	&& python3 -m venv /opt/venv \
	&& /opt/venv/bin/pip install --no-cache-dir --upgrade pip "yt-dlp[default]"

# Make the venv's yt-dlp the one youtube-dl-exec invokes, and skip its own
# (stale, glibc-only) binary download during `npm install`.
# PATH includes the venv so yt-dlp resolves, and `node` (the JS runtime EJS
# uses) is already on PATH from the base image.
ENV PATH="/opt/venv/bin:$PATH" \
	YOUTUBE_DL_DIR="/opt/venv/bin" \
	YOUTUBE_DL_FILENAME="yt-dlp" \
	YOUTUBE_DL_SKIP_DOWNLOAD="true"

# Install dependencies first (better layer caching).
#
# @discordjs/opus and sodium-native are native C++ addons. When no prebuilt
# binary exists for the current Node ABI + Alpine musl version, node-gyp compiles
# them from source, which needs a C/C++ toolchain (make, gcc, g++). We install
# build-base as a *virtual* package just for the build and remove it afterward to
# keep the runtime image lean — but keep libstdc++, the C++ runtime the compiled
# addons link against, so stripping the toolchain can't break them.
COPY package*.json ./
RUN apk add --no-cache libstdc++ \
	&& apk add --no-cache --virtual .build-deps build-base \
	&& npm install \
	&& apk del .build-deps

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Normalize line endings (repo is authored on Windows) and make the
# entrypoint executable, so `sh` doesn't choke on a CRLF shebang.
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

# Entrypoint self-updates yt-dlp on every start (auto-update), then launches
# the bot. Future YouTube changes are absorbed by `docker compose restart`.
ENTRYPOINT ["/app/docker-entrypoint.sh"]
