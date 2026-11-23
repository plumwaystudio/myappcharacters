#!/usr/bin/env bash
# ONE-OFF audio assembly for the approved COOL OFF Episode 01.
# These short-lived signed links are for this build only; refresh if re-rendering after expiration.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out/audio
curl -fLsS --retry 2 'https://elevenlabsusercontent.com/database/workspace/367d8ef9e6db49769fa095a31855c94b/content_generation/NBpn9K9CvCz5NY8aSeai/6vM2uWQZkzFckvmlq6Ab/content.mp3?Expires=1795406400&KeyName=assets-cdn-key-1&Signature=6g7JLNnygTN1O5Fqh1zmukEF4bo=' -o 'out/audio/bri1.mp3'
curl -fLsS --retry 2 'https://elevenlabsusercontent.com/database/workspace/367d8ef9e6db49769fa095a31855c94b/content_generation/SS8ywu60LiBfGDH24dU3/9VFXbscy0P7rvFeq3ei9/content.mp3?Expires=1795406400&KeyName=assets-cdn-key-1&Signature=GHn0U95YqgPV7G2xzeJRUTmhO6w=' -o 'out/audio/nia1.mp3'
curl -fLsS --retry 2 'https://elevenlabsusercontent.com/database/workspace/367d8ef9e6db49769fa095a31855c94b/content_generation/8hhyurA0xn8lnhtB0Hud/yF4xzfUWSgk7uQSfs2vt/content.mp3?Expires=1795406400&KeyName=assets-cdn-key-1&Signature=h5LhK4wAdk_N7oZoHkUDr7pa8Ek=' -o 'out/audio/bri2.mp3'
curl -fLsS --retry 2 'https://elevenlabsusercontent.com/database/workspace/367d8ef9e6db49769fa095a31855c94b/content_generation/fKxnDCjibZ5ueCKzes3a/VDEopqWKbDP085Lk0Xi4/content.mp3?Expires=1795406400&KeyName=assets-cdn-key-1&Signature=8xoRb9y4HBZKfPywXBkbt2jyS8E=' -o 'out/audio/nia2.mp3'
curl -fLsS --retry 2 'https://elevenlabsusercontent.com/database/workspace/367d8ef9e6db49769fa095a31855c94b/content_generation/KM9VHJMDIL4ixFtECVSK/rkHNQvZA5utLia6qGDG5/content.mp3?Expires=1795406400&KeyName=assets-cdn-key-1&Signature=ygu2MnedykqPWaeB2TmsTm-PQKY=' -o 'out/audio/kid.mp3'
curl -fLsS --retry 2 'https://elevenlabsusercontent.com/database/workspace/367d8ef9e6db49769fa095a31855c94b/content_generation/N9eGWqg1yDFHwcvMFsxA/NMAe1Zst3cuKP11lebZv/content.mp3?Expires=1795406400&KeyName=assets-cdn-key-1&Signature=MLmr_zdrda7FtiriZS2xdrvnHmE=' -o 'out/audio/lowkey.mp3'
ffmpeg -hide_banner -loglevel error -y -i out/video.mp4 \
  -i out/audio/bri1.mp3 \
  -i out/audio/nia1.mp3 \
  -i out/audio/bri2.mp3 \
  -i out/audio/nia2.mp3 \
  -i out/audio/kid.mp3 \
  -i out/audio/lowkey.mp3 \
  -filter_complex "[1:a]adelay=250|250[a1];[2:a]adelay=2350|2350[a2];[3:a]adelay=4800|4800[a3];[4:a]adelay=6900|6900[a4];[5:a]adelay=9400|9400[a5];[6:a]adelay=11300|11300[a6];[a1][a2][a3][a4][a5][a6]amix=inputs=6:duration=longest:normalize=0,volume=0.9,apad=pad_dur=20[a]" \
  -map 0:v:0 -map "[a]" -c:v copy -c:a aac -b:a 192k -t 19.95 -movflags +faststart out/cool-off-receipt-final.mp4
