# COOL OFF — corrected production progress / 2026-11-22

**Flow:** https://elevenlabs.io/app/flows/NmmrvBJFPTfScqqys8aF

## Exact constraints
- No captions or dialogue text anywhere in generated footage; the only text allowed is the real COOL OFF application UI.
- COOL OFF is a 72-hour wait-and-decide app; save a find, wait, then choose "Let it go" or "Still want it". Never depict a fake checkout calculator or receipt audit.
- Original cast master sheets are IDENTITY REFERENCES ONLY. They are never connected as `start_frame` to any video. Each original sheet feeds a separate in-scene portrait generator; each finished in-scene image feeds the video start frame.
- 9:16 true model parameter, not only in prompt. All scene anchors and video outputs are portrait.
- Original v4 voice tracks are separate from video. Avoid overdirected TTS and avoid substituting video model voices. Listen and approve cast before posting.

## New scene anchor nodes
- Bri sheet: `T8mnmPthHlY6n2IDEj5l` → Bri scene portrait `kyRsIm7nzp6ohEaiwonf` (720×1280, successful)
- Nia sheet: `EzpQSUp50e8Kc3RVkKRl` → Nia scene portrait `q5cCdoOCThT9AxeF12mx` (768×1376, successful)
- Kid sheet: `1THgInQiCVT1hQbkAueu` → Kid scene portrait `OV4ZMoylEJrDNdq0zDWF` (768×1376, successful)
- LOWKEY sheet: `WF82bylqXxJYFrwhhhht` → LOWKEY scene portrait `vEVSTWXKq6JxPvuwKv5o` (768×1376, successful)

## Speaking clips / model nodes / state
| Shot | Script line | Video node | TTS node | Lip sync node | Actual status |
|---|---|---|---|---|---|
| 01 Bri | Nia. Explain this cart. | `N1RtTJqkBXKd178hHPKy` | `jDH8FtPb2w3cUv3hqVQD` | `mmfTvG4X3VU7tXUZ1wZT` | Video and v4 audio complete; lip-sync complete (2.25s) |
| 02 Nia | Shipping was seven dollars. | `LF5sQycNcD2265JR6Ffo` | `pS0CozZI0WpYocQOVlqT` | `8crYKCtUIwHNQ0RURWa7` | Video and v4 audio complete; lip-sync complete (1.96s) |
| 03 Bri | So you added sixty-eight? | `4yqqHpTdcpgOtwKxfdcZ` | `vcdZx169BznGnGKVrKxv` | `ipTckadoZmbRFt0gxnZ3` | Video and v4 audio complete; lip-sync processing at last check |
| 04 Nia | I'm not paying for shipping. | `0uJpddSGxYUihhdo8dbj` | `EloCmGTK1TjL8GKCRYHC` | — | Video and v4 audio complete; lip-sync not yet run |
| 05 Kid | Exactly. Never let shipping win. | `FVgzIuvHIMO27LKiTXhZ` | `am7yScBlwFW72JaWXmxR` | — | TTS complete; video generation blocked by credit quota |
| 06 LOWKEY | You're about to spend sixty-one extra to avoid seven. | `LgP2lJKBH5EchC434V1i` | `GX8cju8Wn4JbIkerxUbP` | — | TTS complete; video pending; visual plate set to 6s since the v4 line runs 4.08s |
| 07 Nia | I didn't check out yet. | `B7tWmv9BYNPd31LfMv9m` | `sPlG1jy19kZYwX3HicSx` | — | TTS complete; video pending |
| 08 LOWKEY | Good. Put it in Cool Off. | `MLG9CBtgFrTryEnzsfis` | `XGg8kkkJ38pBrmFMNcLa` | — | TTS complete; video pending |

## Current confirmed blocker
ElevenLabs returned `quota_exceeded` when shot 05 was submitted: **827 credits remain; the requested four-second video requires 2,424 credits**. No paid generation was retried after this error.

## App insert
The actual screenshot provided in conversation (`IMG_5016.jpeg`) was converted locally to a 3.5s 9:16 MP4 without generating a fake UI or adding any captions: `/mnt/data/cooloff_v2/REAL_COOL_OFF_APP_INSERT.mp4`. It should be appended only after the last line in the final cut.

## Continuation sequence when budget is available
1. Confirm whether shot 03 lip-sync completed; inspect its identity before accepting.
2. Lip-sync shot 04 with its exact v4 dialogue.
3. Generate scenes 05–08 individually using the existing in-scene portrait nodes. **Never connect master sheets to video frame inputs.**
4. Lip-sync each shot; preserve original TTS audio at final mix.
5. Edit eight dialogue clips and genuine app insert with no captions and no fabricated features.
6. Visually inspect first/middle/last frames of every shot, listen to each performance, and only then call the full MP4 approved.

**Important:** No final corrected full Reel has been exported yet. Earlier full MP4 was rejected and should not be reused.
