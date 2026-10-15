#!/usr/bin/env bash
# ONE script: Associates tag -> site update -> render 60 shorts -> daily YouTube upload.
# Run:  curl -fsSL https://henrynkoh.github.io/construction-hub/setup.sh | bash
# Optional env (goes on the bash side): curl -fsSL <url> | TAG=henryoh-20 PRIVACY=public PER_DAY=6 bash
set -euo pipefail

BASE="https://henrynkoh.github.io/construction-hub"
REPO="https://github.com/henrynkoh/construction-hub.git"
DIR="$HOME/construction-hub-run"
PRIVACY="${PRIVACY:-private}"     # review videos first, then re-run with PRIVACY=public
PER_DAY="${PER_DAY:-6}"           # YouTube default quota allows ~6 uploads/day
mkdir -p "$DIR" && cd "$DIR"
say_step() { printf "\n\033[1;33m== %s ==\033[0m\n" "$*"; }

# ---------- 1. Amazon Associates tracking ID ----------
say_step "1/7 Amazon Associates tracking ID"
if [ -z "${TAG:-}" ]; then
  echo "You need an Amazon Associates account (free). Sign up here if you don't have one:"
  echo "  https://affiliate-program.amazon.com/"
  echo "Your Tracking ID is shown at the top-left of Associates Central, e.g.  henryoh-20"
  open "https://affiliate-program.amazon.com/" 2>/dev/null || true
  read -r -p "Paste your Tracking ID: " TAG </dev/tty
fi
TAG="$(echo "$TAG" | tr -d '[:space:]' | tr 'A-Z' 'a-z')"
if ! [[ "$TAG" =~ ^[a-z0-9]+-[0-9]{2}$ ]]; then echo "That doesn't look like a tracking ID (expected like name-20)."; exit 1; fi
echo "Using tag: $TAG"

# ---------- 2. Tools ----------
say_step "2/7 Installing ffmpeg + Python libs"
if ! command -v brew >/dev/null; then echo "Homebrew is required: https://brew.sh"; exit 1; fi
command -v ffmpeg >/dev/null || brew install ffmpeg
[ -d .venv ] || python3 -m venv .venv
./.venv/bin/pip install -q --upgrade pip pillow requests google-api-python-client google-auth-oauthlib

# ---------- 3. Download pipeline ----------
say_step "3/7 Downloading pipeline files"
curl -fsSL "$BASE/run_pipeline.py" -o run_pipeline.py
curl -fsSL "$BASE/shorts.json" -o shorts.json
sed -i '' "s/buildsmartpic-20/$TAG/g" shorts.json

# ---------- 4. Update + republish the website ----------
say_step "4/7 Publishing your tag to the website"
rm -rf site && git clone -q "$REPO" site
sed -i '' "s/buildsmartpic-20/$TAG/g" site/data.js site/shorts-data.js
cd site
if git diff --quiet; then echo "Site already has this tag."; else
  git add -A && git commit -q -m "Set Amazon Associates tag" || true
  if git push -q origin main; then echo "Site updated: $BASE/"; else
    echo "!! Could not push (GitHub login needed). Run once:  cd $DIR/site && git push origin main"; fi
fi
cd "$DIR"

# ---------- 5. YouTube API credentials ----------
say_step "5/7 YouTube API credentials"
if [ ! -f client_secret.json ]; then
  F="$(ls -t "$HOME"/Downloads/client_secret*.json 2>/dev/null | head -1 || true)"
  if [ -n "$F" ]; then mv "$F" client_secret.json; else
    cat <<EOF
One-time setup (about 3 minutes):
  1. Open https://console.cloud.google.com/projectcreate and create a project.
  2. Enable "YouTube Data API v3":  https://console.cloud.google.com/apis/library/youtube.googleapis.com
  3. Credentials > Create credentials > OAuth client ID > Desktop app > Download JSON.
     (If asked, configure the consent screen as External and add your Gmail as a test user.)
The JSON lands in ~/Downloads; this script picks it up automatically.
EOF
    open "https://console.cloud.google.com/projectcreate" 2>/dev/null || true
    echo "Waiting for the downloaded client_secret*.json ..."
    until F="$(ls -t "$HOME"/Downloads/client_secret*.json 2>/dev/null | head -1)" && [ -n "$F" ]; do sleep 5; done
    mv "$F" client_secret.json
  fi
fi
echo "client_secret.json ready."

# ---------- 6. Render all 60 shorts ----------
say_step "6/7 Rendering 60 shorts (voiceover + video)"
./.venv/bin/python run_pipeline.py --tag "$TAG" --render

# ---------- 7. Upload now + schedule daily ----------
say_step "7/7 Uploading first batch ($PER_DAY, $PRIVACY) and scheduling daily uploads"
./.venv/bin/python run_pipeline.py --tag "$TAG" --upload --per-day "$PER_DAY" --privacy "$PRIVACY"
PL="$HOME/Library/LaunchAgents/com.henry.constructionhub.plist"
cat > "$PL" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>com.henry.constructionhub</string>
<key>WorkingDirectory</key><string>$DIR</string>
<key>ProgramArguments</key><array>
<string>$DIR/.venv/bin/python</string><string>$DIR/run_pipeline.py</string>
<string>--tag</string><string>$TAG</string><string>--upload</string>
<string>--per-day</string><string>$PER_DAY</string><string>--privacy</string><string>$PRIVACY</string></array>
<key>StartCalendarInterval</key><dict><key>Hour</key><integer>10</integer><key>Minute</key><integer>0</integer></dict>
<key>StandardOutPath</key><string>$DIR/upload.log</string><key>StandardErrorPath</key><string>$DIR/upload.log</string>
</dict></plist>
EOF
launchctl unload "$PL" 2>/dev/null || true
launchctl load "$PL"
printf "\n\033[1;32mDone.\033[0m Videos upload automatically every day at 10:00 (Mac must be on). Log: %s/upload.log\n" "$DIR"
echo "Videos are '$PRIVACY'. After reviewing in YouTube Studio, make them public there, and for future uploads re-run:"
echo "  curl -fsSL $BASE/setup.sh | TAG=$TAG PRIVACY=public bash"
