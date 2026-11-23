# COOL OFF — EP. 01 / THE CART
## Production master • no captions • identity-only character sheets

**App source of truth:** User-provided COOL OFF screenshot (2026-11-22). The application says "Wait 72 hours. Then decide", has a "Save a find" action, item cooling state, and after the wait "Let it go" / "Still want it". **It does not calculate receipt savings or scan shopping carts.** The old $61 audit UI is retired. The $61 math can be expressed *only in character dialogue*.

**Master character source:** User-provided four-character reference image and original individual character sheets in `cast/sheets`. Preserve exact faces/skin/hair/outfits/props.

### Approved revised script
BRI: "Nia. Explain this cart."
NIA: "Shipping was seven dollars."
BRI: "So you added sixty-eight?"
NIA: "I'm not paying for shipping."
KLARNA KID: "Exactly. Never let shipping win."
LOWKEY: "You're about to spend sixty-one extra to avoid seven."
NIA: "I didn't check out yet."
LOWKEY: "Good. Put it in Cool Off."

**Ending:** actual app screenshot/video: "Wait 72 hours. Then decide", then "Save a find", then an item cooling off. If a demonstration item isn't saved in the real app, DO NOT fake the state or invent UI.

### Non-negotiable rules
- **NO captions, subtitles, hook overlays, speaker names, floating logos or generated graphics**. The only readable text allowed is text from the actual COOL OFF app UI in the app insert.
- **NO reference-sheet pop-ins.** Never connect an original character sheet to a video `start_frame` or `end_frame`. Character sheets connect only to an image generation node as identity source. Generate an actual **in-scene still** first. Connect that still to the video's `start_frame`. If model supports a dedicated identity-reference port alongside a start frame, verify the combination works; Veo 3.1 Fast explicitly rejects both being wired simultaneously.
- Every video clip begins inside the same lived-in apartment living room, from the first frame.
- 9:16 portrait size must be selected as a **model parameter**, not simply described in the prompt. For scene stills 720×1280 or appropriate 9:16. For clips 9:16. No accidental landscape framing or cropping.
- Scene: muted aubergine walls, warm amber floor lamp screen-right, brown sofa, wooden coffee table, evening interior, filmic stylized 3D. Camera eye-level, 65–85mm chest-up closeups, restrained pushes, no inexplicable outfit/lighting changes.
- Character specifics: Bri pink cap + long brown hair + pink ribbed set + large pink tumbler + yoga mat; Nia two dark curly puff buns, purple glasses resting on head, lilac tee, yellow cargo pants, yellow charm bag, septum ring and phone; Klarna Kid backward red cap, red-and-gold #4 jersey, gold chain and keys; LOWKEY cream cardigan, green striped tee, brown cords, gold round glasses, film camera. All adult.
- Voice: **ElevenLabs Creative eleven_v4**, each line generated as its own dialogue take. Avoid excessively instructed voices or synthetic hype. Listen to voice alone first, compare performers, then use separate lip-sync. Keep audible original v4 voice, don't substitute video model native voices.
- Each line should have a fully isolated close-up; no two character faces in one generated shot to avoid identity drift. Emotions underplayed, comedy from confidence vs deadpan reaction.

### Shooting list and lensing

| Shot | Approx duration | Character | In-scene single action |
|---|---:|---|---|
| 01 | 2.2s | Bri | Eyes shift from unseen cart toward Nia; skeptical controlled stare. Dialogue: Explain this cart. |
| 02 | 1.8s | Nia | Proudly lifts phone slightly, casual little shrug. Shipping was seven dollars. |
| 03 | 2.2s | Bri | Raised eyebrow, disbelief grows. So you added sixty-eight? |
| 04 | 2.0s | Nia | Chin lifts; unbothered refusal. I'm not paying for shipping. |
| 05 | 2.0s | Klarna Kid | Nods once, wrongly encouraging. Never let shipping win. |
| 06 | 3.0s | LOWKEY | One dry glance, hold eye contact. You're about to spend sixty-one extra to avoid seven. |
| 07 | 1.8s | Nia | Smile fades; quiet realization. I didn't check out yet. |
| 08 | 1.8s | LOWKEY | Casual tiny nod. Good. Put it in Cool Off. |
| 09 | 4s | Real app screen | First show actual "Save a find" interface, then actual 72h cooling state if available, never fake app screens. |

**Timing note:** Hold duration determined from final natural voice audio; trim/extend clips around pauses. Aim ~21–24 seconds rather than unnaturally accelerating speech.

### Production checkpoints
1. Verify reference source is a single character sheet for the correct performer.
2. Generate in-scene starting still (9:16). Inspect face/outfit/background, *reject* if it contains a contact sheet, duplicated subject, mixed identity or text.
3. Wire only **generated in-scene still** into video start frame. Check node ports and dimensions in actual model configuration. Confirm source sheet absent from any video frame port.
4. Render one 4s video plate with dialogue-independent restrained acting. Inspect first/mid/last frames, mouth position, props.
5. Record the v4 voice line with a natural-sounding voice, inspect audio before sync.
6. Sync voice and mouth on the corresponding clip; avoid model-native voice. QA lip alignment and audio timbre.
7. Repeat clip-by-clip. Reuse the approved in-scene character stills for repeated actors; don't regenerate identities.
8. Assemble on clean hard cuts; no on-screen captions. Use subtle room tone and quiet record scratch only if it serves the joke.
9. Insert the **actual user-provided COOL OFF UI**. No "receipt analyzer" screen or fake net savings overlay.
10. Final QA on 0s opening, every hard cut, 72h message, audio continuity, character fidelity, UI readability, no text outside UI, output MP4 1080×1920.

### ElevenLabs new corrected flow
https://elevenlabs.io/app/flows/NmmrvBJFPTfScqqys8aF

**Current status**: First Bri identity-referenced still generated and corrected to 9:16; first silent Bri clip submitted. Other character stills and clips not yet released as passed.

This document overrides the original erroneous `skits/cool-off-receipt/ELEVENLABS_PRODUCTION_PLAN.md` and previous exported MP4.
