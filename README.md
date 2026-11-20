# myappcharacters

The recurring cast for Edward's (@drn.vlo) app skit Reels: a friend group of four, built entirely in code, rendered in a gritty PS2-cutscene look. Each skit plugs one free app: **OWED**, **COOL OFF** or **GLOW TAX** (plumwaystudio.com/pick).

## The cast

| Character | Who they are | App | Look |
|---|---|---|---|
| **LOWKEY** | Deadpan one who quietly has the apps; his flat line ends every joke | all three | Grandpa-core: tight curly top, round gold glasses, cream cable cardigan, striped tee, brown cords, loafers, film camera |
| **Nia** ("3AM Cart") | Dreamy impulse shopper, whispers "add to cart" | COOL OFF | Y2K thrift queen: curly space buns, butterfly clips, shades on head, lilac baby tee, butter cargos, platforms, charm bag, septum ring |
| **Bri** ("Glow Girl") | Always freshly done, unbothered until she sees her yearly total | GLOW TAX | Pilates princess: pink cap over long hair, pink ribbed set, white socks + sneakers, giant tumbler, yoga mat |
| **Klarna Kid** | Loud flexer, "it's only $25" | OWED | Jersey fit: backward red cap, red/gold #4 jersey + shorts, tall socks, chunky sneakers, chain, keys |

Faces and outfits are AI-painted (ElevenLabs images) and projected onto the code-built 3D bodies (`cast/faces`, `cast/outfits`); all animation is code. The girls are adults in their early 20s. Every character is an original design.

Voices (ElevenLabs): LOWKEY `nXmkjgNf2VzCsDMFNrH4`, Bri / Glow Girl `o9B86nZP8mMLaT5FBEzP`, Nia / 3AM Cart `3YXAuwCx7wB8kSkKCqsu`, Klarna Kid `wSqOdjeNqDrHcoK0zorF`.

**Writing a skit? Read [STORYBOARD.md](STORYBOARD.md) first.**

## What's in here

```
cast/shapes/<name>.json   body + face shape recipe (MakeHuman CC0 targets)
cast/built/<name>-mh.json the built character: mesh, skeleton, skin weights, face shapes
cast/looks.json           skin, makeup, hair, outfit for each character
engine/mh.js              skins, paints and poses the characters (hair, clothes, makeup, grip, idle)
engine/cast.js            textures and props (iced cup, phone, ...)
tools/export.py           rebuilds cast/built from cast/shapes
base/                     MakeHuman base mesh + skeleton + weights (CC0)
skits/<slug>/             one folder per skit: scene.html, timeline.json, audio, render.py, preview
```

## Setup

```
./setup.sh                                   # npm libraries + MakeHuman shape targets
python3 tools/export.py cast/shapes/bri.json # rebuild a character after changing its shape
```

## Making a new skit

1. Write the script and storyboard (Gemini prompt or by hand): pov hook, setup, it gets worse, twist, LOWKEY's deadpan line, app reveal. 12–20 seconds.
2. Generate each character's lines with their saved voice (eleven_v4), download, split by pauses.
3. Build `timeline.json` from the voice lines. **Every cut, gesture, sound effect and subtitle is driven by the line times, never hand-typed.**
4. Copy `skits/glow-tax-trip/` as a template, change set, shots and acting.
5. Check key frames before rendering (see the checklist), then `python3 skits/<slug>/render.py` and add sound with `-c:v copy`.

## Quality checklist (before every full render)

- Props held properly: fingers curled with `grip()`, cups upright in the palm, nothing passing through hands or bodies.
- Cuts land just before the next speaker; subtitles disappear when the line ends.
- Faces sit under the hook text; subtitles stay above the bottom 380px and away from the right-side buttons.
- Mouths move with the voice; nobody's mouth opens wider than the line needs.
- Real app features only; numbers on screen are example data and say so.

## Render look

360×640 render, sharpened, warm grading, 9-step color quantize, film grain, nearest-neighbor upscale to 1080×1920, JPEG grit. Fabric uses world-scale knit texels; skin and clothes get baked creases.

## Credits

Base body, shape targets, skeleton and weights: MakeHuman (CC0). Rendering: three.js (MIT). Pixel font: Silkscreen (OFL).
