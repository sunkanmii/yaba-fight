# Combat, indicators, and audio research

Research and implementation: 17 October 2026. This document records the sources actually reviewed, the decisions drawn from them, and their limits. The shipped beta remains a simultaneous-choice game, not a frame-perfect reaction fighter.

## Feedback and readable outcomes

[Xbox Accessibility Guideline 103](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/103) recommends communicating important cues through more than one sensory channel and avoiding reliance on colour alone. Applied here: HP numbers plus bars, explicit outcome text, move names at reveal, damage numerals, and different sounds for hit/guard/counter. A muted game still explains the outcome. Critical health changes the bar and keeps the numeric HP; it does not rely on a flashing red screen.

[Jiesang Song's combat-impact analysis](https://www.gamedeveloper.com/audio/improving-the-combat-impact-of-action-games), drawing on shipped combat-game development, connects anticipation, damage reaction, contact effects, short impact pauses, and sound. Applied here: immediate selection acknowledgement, a short wind-up, a synchronized contact cue, opponent recoil, and recovery before accepting the next move. Power and jab have different motions and sound weight. A small local impact burst replaces full-screen flashing. The HUD stays steady; optional shake affects scenery only. This turn-based beta does not need simulation rollback or a real-time hit-stop system.

[The 12 principles of animation in video games](https://www.gamedeveloper.com/production/the-12-principles-of-animation-in-video-games) describes the responsiveness tradeoff in anticipation. Applied here: a choice locks immediately and the practice reveal follows after 300 ms; the contact cue occurs 100 ms into a 680 ms reveal/recovery. Multiplayer resolves when both choices arrive, with the same local presentation. No fixed network wait is added to manufacture a result.

Distinct messages cover parry counters, jab interruption, blocked jabs, softened power, feints, trades, and neutral exchanges. Each explanation describes what actually happened and offers a relevant counter. Damage history briefly trails the current health fill so the amount lost is visible.

## Tactical balance

[The Fundamental Pillars of a Combat System](https://www.gamedeveloper.com/design/the-fundamental-pillars-of-a-combat-system) emphasizes distinct tactical functions and being able to plan the next action. The original resolver let power beat or out-trade almost every attacking move. That is a concrete implementation flaw, not a claim proven by the article.

The change: jab now interrupts power completely for 14 damage. Power still punishes parry and feint, block still stops jab and limits power, and feint punishes defensive choices. Every move now has a strictly losing matchup, verified in tests. Practice adaptation counters repeated power with jab. No current hidden move is exposed to the bot. Human-only matchmaking and authoritative damage resolution are preserved.

## Sound identity and musical mix

[GDC's Fighting Legos audio-choreography talk](https://gdcvault.com/play/1024396/Audio-Bootcamp-XVI-Fighting-Legos) describes fight-sound sets and variety to avoid repetition fatigue. Applied here: separate jab, power, hurt, block, parry, feint, bell, victory, and loss cues, with restrained pitch/noise variation. A bass transient and short filtered-noise layer replace the previous single electronic beep. Parry uses a brighter rising metallic cue; guard uses a lower, duller impact. Selection plays a small acknowledgement, not a fake landed hit.

[Game Accessibility Guidelines on separate volume controls](https://gameaccessibilityguidelines.com/provide-separate-volume-controls-or-mutes-for-effects-speech-and-background-music/) support independent effects/music controls. The settings menu has independent mute/level controls, a sound-test button, and saved preferences. Reduced-motion preferences override scenery shake. Session chat remains collapsible to keep the arena clear.

The original 104 BPM loop uses synthesized percussion, a syncopated bass line, and sparse plucked notes. There are no downloaded tracks, borrowed melodies, copyrighted sound samples, or audio-provider requests. The music gain is kept below effects and briefly ducks under impacts. This is a lightweight procedural score, not a recorded music production.

## Browser and mobile constraints

[MDN's sequencing example](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques) explains scheduling against the audio clock with a short lookahead. This engine checks every 25 ms and schedules 120 ms ahead; it does not time individual notes by setInterval alone. Node lifetimes are bounded and completed nodes disconnect.

[MDN's Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) recommend creating/resuming audio from a user gesture. The engine starts on play or an explicit audio interaction. [MDN's web-game audio guidance](https://developer.mozilla.org/en-US/docs/Games/Techniques/Audio_for_Web_Games) supports dynamic game audio; this implementation pauses on a hidden tab, resumes only an already-created context, and stops its scheduler on teardown. No sound is requested before interaction, and audio failure cannot prevent a move.

## Visual direction

Claude frontend-design skill applied to the main screen. Palette: cabinet green `#26382b`, deep green `#1b2c23`, chalk `#f4e8c8`, brass `#e6b95c`, rust `#dc713d`, plus the existing courtyard. Barlow Condensed is the expressive display/control face; DM Sans handles small readable status text. Both remain self-hosted.

```
 Title menu                         Active fight
 [name] [music] [settings]           [name] [music] [settings]
                                    [your HP] [round] [rival HP]
 YABA       illustrated rival             outcome / explanation
 FIGHT      in courtyard                  rival, low inward fists
 [practice] [friend]                 [Jab] [Power] [Block] [Parry] [Feint]
```

The title screen is left aligned and the fight is centered. The arena fills the viewport; controls form a compact cabinet-like lower edge. Headline copy, website navigation, cards, and legal footer no longer surround the game. Privacy and support links remain in settings. The user's reference continues to guide stance and framing, while original illustrated assets, wraps, colour, and environment supply the game's identity.

## Verification limits

Automated audio checks measure real browser output, independence of mutes, gesture-only start, and saved settings. Those checks cannot judge musical taste or replace listening tests across speakers/headphones. Chrome viewport tests cover desktop, portrait, intermediate widths, and landscape; they do not substitute for testing physical iOS/Android devices or congested mobile networks. No claim of zero latency or complete accessibility conformance is made.
