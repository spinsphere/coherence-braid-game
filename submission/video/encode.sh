#!/usr/bin/env bash
# Convert the Playwright recording to an upload-ready MP4 (H.264, yuv420p, 30 fps, silent AAC track so
# YouTube's processing is happy) and a short GIF for the itch page.
#   submission/video/encode.sh <raw.webm> <out-dir>
set -euo pipefail
raw="$1"; out="$2"; mkdir -p "$out"
ffmpeg -y -hide_banner -loglevel error -i "$raw" -f lavfi -i anullsrc=r=48000:cl=stereo -shortest \
  -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -r 30 -movflags +faststart -c:a aac -b:a 64k \
  "$out/coherence-braid-trailer.mp4"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$out/coherence-braid-trailer.mp4" | awk '{printf "duration: %d:%02d\n", $1/60, $1%60}'
echo "wrote $out/coherence-braid-trailer.mp4"
