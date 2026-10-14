#!/usr/bin/env python3
"""
Automated shorts pipeline: shorts.json -> voiceover -> vertical MP4 -> YouTube upload (scheduled).
Setup (one time):
  brew install ffmpeg
  pip install pillow requests google-api-python-client google-auth-oauthlib
  Put YouTube OAuth client at pipeline/client_secret.json (Google Cloud > YouTube Data API v3 > OAuth Desktop app)
Run:
  python3 run_pipeline.py --tag yourtag-20 --render               # build all 60 MP4s
  python3 run_pipeline.py --tag yourtag-20 --upload --per-day 6   # upload next batch (run daily via cron/launchd)
NOTE: YouTube default API quota = 10,000 units/day, an upload costs ~1,600 -> about 6 uploads/day (60 shorts = ~10 days).
Videos upload as private first; pass --privacy public once you have reviewed them.
"""
import json, os, subprocess, argparse, io, pathlib, requests, datetime
from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).parent
OUT = HERE / "out"
OUT.mkdir(exist_ok=True)
STATE = HERE / "state.json"
W, H = 1080, 1920


def font(sz):
    for f in ["/System/Library/Fonts/Helvetica.ttc", "/Library/Fonts/Arial.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]:
        if os.path.exists(f):
            return ImageFont.truetype(f, sz)
    return ImageFont.load_default()


def wrap(d, text, f, mw):
    lines, cur = [], ""
    for w in text.split():
        if d.textlength(cur + " " + w, font=f) > mw and cur:
            lines.append(cur)
            cur = w
        else:
            cur = (cur + " " + w).strip()
    return lines + [cur]


def card(sh, sc):
    im = Image.new("RGB", (W, H), (15, 20, 25))
    d = ImageDraw.Draw(im)
    d.text((W / 2, 150), f"STEP {sh['step']} | {sh['stepName'].upper()}", font=font(44), fill=(245, 165, 36), anchor="mm")

    def para(t, y, sz, col, lh):
        f = font(sz)
        for l in wrap(d, t, f, 920)[:4]:
            d.text((W / 2, y), l, font=f, fill=col, anchor="mm")
            y += lh

    if sc["type"] == "title":
        para(sc["text"], 760, 96, (255, 255, 255), 120)
        para(sc["sub"], 1250, 52, (143, 161, 179), 70)
    elif sc["type"] == "product":
        d.text((W / 2, 470), f"#{sc['rank']}", font=font(220), fill=(245, 165, 36), anchor="mm")
        d.rectangle((190, 540, 890, 1240), fill=(255, 255, 255))
        try:
            p = requests.get(sc["img"].replace("_AC_UL320_", "_AC_SL800_"), timeout=20).content
            pi = Image.open(io.BytesIO(p)).convert("RGB")
            pi.thumbnail((660, 660))
            im.paste(pi, (540 - pi.width // 2, 890 - pi.height // 2))
        except Exception as e:
            print("img fail", e)
        para(sc["text"], 1340, 52, (255, 255, 255), 66)
        a, *b = sc["sub"].split("|")
        d.text((W / 2, 1590), a.strip(), font=font(60), fill=(65, 201, 138), anchor="mm")
        d.text((W / 2, 1660), "|".join(b).strip(), font=font(42), fill=(143, 161, 179), anchor="mm")
    else:
        para(sc["text"], 820, 96, (255, 255, 255), 120)
        d.text((W / 2, 1150), "Follow for the next step", font=font(56), fill=(245, 165, 36), anchor="mm")
        para(sc["sub"], 1700, 38, (143, 161, 179), 50)
    return im


def render(sh):
    mp4 = OUT / f"{sh['id']}.mp4"
    if mp4.exists():
        return mp4
    parts = []
    for i, sc in enumerate(sh["scenes"]):
        png, aiff, seg = OUT / f"{sh['id']}_{i}.png", OUT / f"{sh['id']}_{i}.aiff", OUT / f"{sh['id']}_{i}.mp4"
        card(sh, sc).save(png)
        # macOS voice; on Linux/Windows swap in edge-tts or piper
        subprocess.run(["say", "-v", "Samantha", "-o", str(aiff), sc["vo"]], check=True)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-i", str(png), "-i", str(aiff),
                        "-c:v", "libx264", "-tune", "stillimage", "-pix_fmt", "yuv420p", "-c:a", "aac",
                        "-af", "apad=pad_dur=0.6", "-shortest", str(seg)], check=True)
        parts.append(seg)
    lst = OUT / f"{sh['id']}.txt"
    lst.write_text("".join(f"file '{p.name}'\n" for p in parts))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(mp4)], check=True)
    for p in OUT.glob(f"{sh['id']}_*"):
        p.unlink()
    return mp4


def yt():
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build
    from google.oauth2.credentials import Credentials
    tok = HERE / "token.json"
    scopes = ["https://www.googleapis.com/auth/youtube.upload"]
    if tok.exists():
        cred = Credentials.from_authorized_user_file(tok, scopes)
    else:
        cred = InstalledAppFlow.from_client_secrets_file(str(HERE / "client_secret.json"), scopes).run_local_server(port=0)
    tok.write_text(cred.to_json())
    return build("youtube", "v3", credentials=cred)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tag", required=True)
    ap.add_argument("--render", action="store_true")
    ap.add_argument("--upload", action="store_true")
    ap.add_argument("--per-day", type=int, default=6)
    ap.add_argument("--privacy", default="private")
    ap.add_argument("--only")
    a = ap.parse_args()
    shorts = json.loads((HERE / "shorts.json").read_text())
    for s in shorts:
        s["description"] = s["description"].replace("YOURTAG-20", a.tag)
    if a.only:
        shorts = [s for s in shorts if s["id"] == a.only]
    state = json.loads(STATE.read_text()) if STATE.exists() else {}
    if a.render:
        for s in shorts:
            print("render", s["id"])
            render(s)
    if a.upload:
        from googleapiclient.http import MediaFileUpload
        svc = yt()
        n = 0
        for s in shorts:
            if s["id"] in state or n >= a.per_day:
                continue
            body = {"snippet": {"title": s["title"], "description": s["description"], "tags": s["tags"], "categoryId": "26"},
                    "status": {"privacyStatus": a.privacy, "selfDeclaredMadeForKids": False}}
            r = svc.videos().insert(part="snippet,status", body=body,
                                    media_body=MediaFileUpload(str(render(s)), mimetype="video/mp4", resumable=True)).execute()
            state[s["id"]] = {"video_id": r["id"], "at": datetime.datetime.now().isoformat()}
            STATE.write_text(json.dumps(state, indent=1))
            n += 1
            print("uploaded", s["id"], r["id"])


main()
