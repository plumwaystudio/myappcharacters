# COOL OFF — EP.01: THE RECEIPT
## Character-locked ElevenLabs production plan (v1)

**Status:** Script/storyboard approved as direction. First Bri shot queued as a visual consistency test; other video clips not yet generated. Do not use the previous code-rendered MP4. This is a new reference-locked AI video method.

**Source of truth:** The user's four-up master character sheet `IMG_5015.jpeg`, plus the original individual character sheets in `cast/sheets/` and ElevenLabs flow `3CHoTnLocpth6efXPuOd`. Master sheet generation IDs: Bri `ZyZydZdmjo8326UM0d3a`, Nia `hrzZT45rylpqJ7LQ11U1`, LOWKEY `N6M41oRUxKgAqLUj37QE`, Klarna Kid `1O2xu9H1Pb7VpCxfaErs`.

**ElevenLabs shot production flow:** https://elevenlabs.io/app/flows/ETCgRF42aaHLIelZCPdc

## Exact character design locks
- BRI: adult young woman, pale-pink baseball cap, long straight brown hair, pink ribbed two-piece, large pink tumbler, yoga mat. Face must exactly match upper-left sheet.
- NIA: adult young woman, curly double puff buns with butterfly clips, purple sunglasses resting above forehead, lavender butterfly baby tee, butter-yellow cargo pants, colorful beads, yellow charm shoulder bag, septum ring, lavender phone. Face must exactly match upper-right sheet.
- LOWKEY: adult young man, short tight curls, fine round gold glasses, cream cable-knit cardigan, green striped tee, brown cord pants, film camera at chest. Face must exactly match lower-left sheet.
- KLARNA KID: adult young man, backward red cap, red-and-gold #4 basketball jersey, matching shorts, gold chain, white sneakers, keys. Face must exactly match lower-right sheet.

Every shot: same facial proportions, complexion, hair, outfit, signature prop, and character performance. No new or composite faces. Never animate the entire four-up sheet as one input frame.

## Script: 20.8 sec target
1. BRI: "Nia. Explain this receipt."
2. NIA: "Shipping was seven dollars."
3. BRI: "So why'd you add sixty-eight?"
4. NIA: "Because I don't pay shipping."
5. KLARNA KID: "Never let shipping win."
6. LOWKEY (deadpan): "You spent sixty-eight to save seven."
7. SILENT INSERT: Original shipping: $7.00 / Additional purchases: +$68.00 / Shipping waived: -$7.00 / More money spent: $61.00. **Example numbers.** This is an editorial receipt, NOT a claimed COOL OFF feature.
8. NIA: silent stunned reaction.
9. END CARD: COOL OFF / "Think before checkout" [editorial tagline], "LINK IN MY STORY". Actual app footage only if verified.

## Storyboard
| Beat | Time (editorial target) | Method | Speaker | Acting, camera, sound |
|---|---|---|---|---|
| C01 | 0:00–0:02.35 | Generated 4s Bri solo, trim | Bri | Chest-up at right, eyes down at offscreen receipt, looks up skeptical. Dialogue immediately; tense room tone. |
| C02 | 0:02.35–0:04.55 | Generated 4s Nia solo, trim | Nia | Phone up at left, cheerful proud shrug. |
| C03 | 0:04.55–0:06.85 | Generated 4s Bri solo, trim | Bri | Tight skeptical closeup; brow arch and stare. |
| C04 | 0:06.85–0:09.20 | Generated 4s Nia solo, trim | Nia | Dead-serious nod: she believes she won. |
| C05 | 0:09.20–0:11.35 | Generated 4s Kid solo, trim | Kid | Grinning, small nod, keys remain held. |
| C06 | 0:11.35–0:13.80 | Generated 4s LOWKEY solo, trim | LOWKEY | Barely moves, dry unamused gaze. Allow a 0.2s silent beat before line. |
| C07 | 0:13.80–0:16.05 | Code/compositor, NOT generated video | — | Crisp readable receipt numbers; hard typewriter reveal; bass thud after $61. |
| C08 | 0:16.05–0:18.50 | Generated 4s Nia solo, trim | — | Smile drops to shocked freeze; no dialogue, room tone drops away. |
| C09 | 0:18.50–0:20.80 | Code/compositor, NOT generated video | — | Typographic COOL OFF end card; link in story. Clear, no fabricated UI. |

## Camera, set and grade
One lived-in Y2K apartment living room at night: muted aubergine wall, amber floor lamp screen-right, worn brown sofa, warm wood coffee table, desaturated plum ambient fill. Warm highlights, tactile figurine-like 3D, no pixel-art conversion and no glossy ad montage. Portrait 9:16. Eyelines: Bri on screen-right looks left toward Nia; Nia on screen-left looks right; Kid on right speaks toward group left; LOWKEY on left looks right. Keep lens around 65–85 mm for close-ups; locked camera or gentle 2% push only. All backgrounds and lighting must match reference frames.

## Generation pipeline: never batch the episode
1. **Reference preparation:** Four original character sheets already attached as source nodes in the new ElevenLabs flow. Before paying for other clips, review first generated C01. Optional: create a reusable environment master still and one vertical starting pose for each character; don't regenerate their identity.
2. **Video:** For each dialogue shot, generate a solo 4-second 9:16 silent plate through Veo 3.1 Fast (or supported Seedance US through the canvas) with the exact source sheet connected. The seven queued/prepared shot nodes are C01, C02, C03, C04, C05, C06, C08. Only run **one new shot at a time**, inspect freeze frames 0.0/mid/end and acting.
3. **Voice:** Reuse the speaking style of the user's reference `glowtax-boyfriend.mp4`. Do NOT blindly reuse README voice IDs: they resolve to ElevenLabs generic voices and the previous user rejected them. Audition/approve correct cast voices before final mixing. Generate each line separately with clean, measured pronunciation. Numbers spoken as words.
4. **Lip sync:** Once the audio actor is approved, lip-sync each generated shot to its own line (separate ElevenLabs tool if necessary); keep original facial design stable. Avoid unapproved native AI voices.
5. **Graphics:** Composite the receipt in post at full pixel resolution with exact $7 / $68 / $61 arithmetic, marked EXAMPLE NUMBERS. Branding in end-card, not a fictional UI screenshot. No typography baked into generated motion.
6. **Edit:** Trim silent plates to natural voice timings, preserve 1–3 frames breathing room around cuts, insert the receipt impact / stunned pause / endcard, add restrained SFX and room tone, master final MP4 at 1080x1920 30fps.
7. **QA / release gate:** Character face/costume comparison to each sheet, accurate props, same room, no wandering expressions, correct *approved* voice, dialogue lip-sync, no invented COOL OFF features, receipt arithmetic, subtitle safe zones. Failures are corrected only in the affected clip, not by regenerating the full video.

## ElevenLabs flow video-node IDs
- C01 Bri: `6wAn7Qweh4a1SexSYvzJ`
- C02 Nia: `NCQSMMXX5c9kjk1UZLe7`
- C03 Bri: `r0foJbloPVS3MYsroNUl`
- C04 Nia: `8qGM3HP1cPd3Te85rrEA`
- C05 Klarna Kid: `L1Thbrb8YHYmP6LFQ3VN`
- C06 LOWKEY: `R1hpcAOfAx7xnBalv06F`
- C08 Nia: `AR9KeSaSlvv0rhTdzu2u`

C07 and C09 are editable code/post overlays. One non-audio 4-second 720p C01 test was estimated at 2423.7576 ElevenLabs credits / US$0.4407, pricing may vary. Larger renders, voice and lip-sync are additional.

**Do not call the first clip approved until it has been inspected.**