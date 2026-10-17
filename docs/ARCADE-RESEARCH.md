# Yaba Fight: arcade design and implementation research

Research and design decisions, 17 October 2026. The initial report preceded implementation; the pacing update below reflects subsequent player feedback. It separates source observations from the choices proposed for this game. It is a design argument and a verification plan, not evidence of player retention or a claim that enjoyment can be proved by unit tests.

## Pacing update after play feedback

The first release's short decision countdown, numeric move callouts and 700ms slip window made the rules hard to learn. These were removed. Opponents now hold an illustrated anticipation pose while the player thinks; choosing a move starts an 850ms exchange animation. Power and jab have separate anticipation/contact drawings. Slips depend on direction, move the hands and viewpoint together, hold through contact, and return after the punch. The guide illustrates both directions. The boss retains a 3.6-second animation after a response is chosen, with no deadline for choosing that response. Every difficulty uses this player-paced flow. Rounds last up to 30 exchanges before score/overtime resolution, with knockouts ending them earlier.

The round announcement and Fight now occupy separate presentation phases. Recorded clip duration, plus at least 1.25 seconds of silence, gates the next announcer clip for all three rounds. The player-facing victory test control was removed. Fights 2–7 are locked on fresh saves, including Practice; winning an arcade fight unlocks only the next fighter and persists that achievement locally. Earlier timing recommendations in this research are historical proposals, superseded by these player-tested requirements.

## The diagnosis

The existing game has a promising identity: a first-person Lagos sparring yard, low inward fists, warm ink artwork, stamina and short three-round fights. Its main problem is the gap between the decision and what the player sees. Opponent attacks move an entire static illustration rather than extending an arm. Blocks and parries share almost the same silhouette. Floating numbers disappear quickly, and the same sound language accompanies outcomes with very different stakes. The player can understand a tooltip without feeling the action.

Feint is especially weak in this presentation. In the old resolver it is effectively a move that deals damage against defensive selections, rather than an animated false attack that changes the opponent's response. Its fiction and its rule do not agree. Adding more explanatory text would leave that mismatch intact. For this release, remove it from the arcade controls and spend that input budget on directional evasion.

The other problem is symmetry. Two simultaneous jabs or power punches trade damage, which can feel like both players are losing for choosing the same thing. The requested arcade rules will instead make matching attacks clash without health damage. Stamina is still spent; a visual clash must explicitly explain why no HP moved. Matching defensive choices also cause no direct HP damage. Equal actions therefore feel like an understood outcome rather than missing feedback.

## Comparable games: useful patterns, with limits

### Super Punch-Out!!: small verb set, expressive opponents

Nintendo's [official manual](https://www.nintendo.com/es-es/games/oms/snes-classic/manuals/punch-out/manual.pdf) documents left/right punches, guard, duck and sways; a conditional knockout punch; circuit progression; records; and automatic saving after bouts. The important lesson for Yaba Fight is that a compact control set can support a campaign when opponents, response windows and rewards differ. A special attack should have an unmistakable readiness signal. A campaign should preserve progress between opponents.

Application: seven named fighters, readable hand-side tells, two dodge directions, a checkpoint after each win and a special final encounter. We are borrowing design principles, not Nintendo's characters, audio, animations, art, exact timing or rules.

### Sifu: defence changes the next opportunity

Sloclap's [developer explanation of Sifu combat](https://blog.playstation.com/2021/11/18/how-sifus-kung-fu-combat-works/) describes structure pressure, vulnerable states, multiple defensive responses and counter opportunities. Its useful principle is that defending can improve position or create an opening, instead of merely delaying a loss.

Application: sustained guard consumes increasing stamina; a shattered guard exposes the fighter. A well-timed correct dodge earns a counter bonus for the following exchange. The player gets a reason to plan two steps ahead: protect resources now, then spend the opening on a stronger follow-up. This is a much smaller boxing ruleset, not an implementation of Sifu's combat system.

### Game feel: information before spectacle

An impact needs anticipation, contact and recovery. A glove drawing back tells the player what may happen; its extension identifies the attacking limb; recoil and sound confirm contact; recovery identifies the next opening. Particles cannot substitute for those poses. A whole-character scale pulse does not communicate the same information as a shoulder and elbow extending.

For Yaba Fight, effects should support three questions: what is coming, what happened, and what can I do next? Amber fist light denotes power preparation; a side tell identifies an incoming lane; a short contact hold makes the impact legible. Damage numbers last about 1.5 seconds. A clash, a blocked hit, a failed parry, a good dodge and a knockout need distinct visual and audio outcomes. Reduced-motion settings remove shake and decorative motion while retaining essential action poses, smaller slips, readable text and resource changes.

## Good and bad design, using this project's concrete problems

| Area | Weak pattern | Better release decision | Observable check |
| --- | --- | --- | --- |
| Learning | An unexplained move with a surprising damage table | Remove feint; give every remaining move a short visible purpose and a demonstrated pose | A new player can explain the action from the controls and outcome |
| Fairness | An enemy appears to know the input just selected | Choose enemy intent before accepting the current input; learn only from past inputs | Swapping the current human choice cannot alter the already chosen intent |
| Chance | A coin flip is presented as a timing skill | Label parry as 50%; keep a deterministic directional dodge available | Boundary tests prove the parry roll; late correct dodges do not use RNG |
| Resource play | Defence is a free stall | Guard fatigue, pressure and recoverable stamina | Repeated guard becomes unaffordable; breathing restores a bounded amount |
| Symmetry | Matching punches damage both fighters without a clear contact story | Matching attacks visibly clash with zero direct damage | Exhaustive pair tests and clash screenshots |
| Timing | Every animation is a tiny wiggle or ends before it is understood | Distinct windup, contact and recovery states, with slower floating feedback | Capture the animation at several timestamps |
| Progression | Difficulty only multiplies enemy damage | Increase adaptation, mix-ups and speed within readable bounds | Compare move distributions and tell durations across levels 1–10 |
| Failure | Losing discards the whole session or gives a flat generic message | Retry the current opponent; retain the campaign checkpoint | Reload and loss/retry tests |
| Boss | A huge health number is the only difference | A 3.6-second signature windup that introduces a new response window | The charge is visible, avoidable and cleared between fights/runs |
| Monetisation | Ads cover controls or paid power alters combat | Environmental sponsor boards with owner-approved creative | The fight remains readable without third-party ad scripts |

These are comparisons between implementation patterns. They are not claims that a named commercial game is universally good or bad. Context, audience and execution matter. A hard game can be fair; an easy game can be engaging; a random outcome can be enjoyable if its role is honest and the player has other forms of control.

## Proposed arcade loop

The player enters a seven-fight local circuit. Each fighter has a recognisable face, body silhouette, outfit, tendency and arena. Three rounds determine each fight. A defeat offers a retry of that opponent. A win advances the checkpoint and reveals the next rival. Clearing the seventh fight is a distinct campaign victory, with a stronger fanfare and a local record.

The moment-to-moment loop is: read the opponent's shoulder/glove tell; decide whether to attack, defend, evade or recover; commit with enough preparation time; see the contact and resource result; use any earned opening on the next exchange. The renderer must show coherent anatomy throughout this loop. Complete illustrated player arm pairs use a common scale and semantic fist anchors; their cut ends remain beyond the camera edge. Opponents use complete poses rather than stretched separate limbs. The first assembled rig failed visual review despite passing logic tests; it was replaced before release.

Controls are Jab, Power, Guard, Parry, Breathe, Slip left and Slip right. Jabs are economical and interrupt power. Power is expensive and visibly charges. Guard reduces damage but repeated guarding and incoming pressure drain stamina. Parry has a clearly stated 50% success chance against ordinary punches, costs more against power, and leaves exposure when it fails. Breathe restores stamina and can be punished. Correctly directed late dodges avoid an ordinary attack reliably and can create a counter opening. Early or wrong-direction dodges have understandable failure feedback.

The parry request deliberately differs from purely timing-based defensive games. A successful parry should not be described as proof of superior reflexes: it includes a random roll. To preserve agency, dodging and resource management remain alternatives. Each attack's parry roll is sampled once for resolution, not repeatedly sampled by animation frames or button spam. The game shows the chance and explains a miss.

Easy, Normal and Hard are presets over a 1–10 difficulty setting. The AI begins learning after the first observed action. It tracks recent tendencies across a run, with stronger weighting and more varied replies at higher difficulty. It does not inspect the current action. Stronger AI should punish a repeated habit; it should not become omniscient. Tell windows retain a minimum so that a higher level stays physically readable on touch screens.

The final boss has a data-defined 3.6-second charge. It offers an early preparation opportunity, then a directional response near impact. This mechanic belongs to that encounter. It is not granted to the player as a permanent ability, and its charge state is reset on every new fight/run. Future boss mechanics should be additions to encounter data and engine transitions, rather than copies of an increasingly tangled component.

## Code research: reliable boundaries

Robert Nystrom's [Game Loop chapter](https://raw.githubusercontent.com/munificent/game-programming-patterns/master/book/game-loop.markdown) explains the separation of input, update and rendering, including time-based update concerns. [MDN's game anatomy guide](https://developer.mozilla.org/en-US/docs/Games/Anatomy) discusses matching browser work to the appropriate event source and making loops stoppable. [requestAnimationFrame documentation](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) provides the browser callback and cancellation contract.

Application: retain Next.js for the shell, accessible controls, dialogs and settings. Use a dedicated local simulation and a Canvas 2D renderer for fixed-anchor action sprites, perspective and impact effects. This preserves the existing project while moving frame-by-frame drawing out of React's component tree. Simulation state owns HP, stamina, intent, cooldowns, round progression and random state. The renderer reads that state and never decides damage.

Use a bounded simulation update driven by the browser frame loop. Pause simulation and audio when hidden or when a blocking modal opens. Stop the frame callback on unmount. Never turn an inactive tab's elapsed wall time into a burst of attacks when it returns. Draw at a bounded pixel ratio, preload the selected arena/heads, reuse image objects and keep particles bounded.

Bad coupling looks like this:

```js
// A visual side effect accidentally changes the rules every render.
function drawParry() {
  if (Math.random() < 0.5) opponent.hp -= 20;
}
```

The replacement boundary is:

```js
// One decision, then any number of presentations of that decision.
const result = resolveExchange(snapshot, playerAction, enemyIntent, roll);
simulation.apply(result);
renderer.present(result);
```

The prior alarm incident is another bad lifecycle pattern: an ended activity retained a deadline, and a fallback repeatedly rescheduled it in the past. This arcade release does not create a fight room, matchmaking request, WebSocket or cloud combat alarm. The cloud online endpoints are explicitly paused; legacy alarms terminate. Account and sponsor administration remain separate services, used only when requested. Normal arcade boot and play should make zero API calls and zero Durable Object invocations.

## Asset and icon research

[Kenney Impact Sounds](https://kenney.nl/assets/impact-sounds), [Music Jingles](https://kenney.nl/assets/music-jingles) and [Voiceover Pack (Fighter)](https://kenney.nl/assets/voiceover-pack-fighter) are official asset pages listing CC0 licensing. The implementation will retain the supplied license text, source URL and a file/hash receipt for admitted sounds. Only selected clips should ship, rather than entire unused archives. Browser audio starts after a gesture and remains optional to gameplay.

[Lucide's official license](https://lucide.dev/license) is ISC, with MIT notices for Feather-derived icons. [Tabler](https://github.com/tabler/tabler-icons/blob/main/LICENSE) and [Phosphor](https://github.com/phosphor-icons/homepage/blob/master/LICENSE) are viable MIT alternatives. Lucide is already installed and visually consistent with this game; keeping it avoids another icon dependency and preserves a coherent stroke style. Icons support plain labels and do not replace them.

For character and environment imagery, original generated comic assets avoid borrowing recognisable commercial fighter sprites. The launch ladder uses seven male characters with varied ages, faces and silhouettes. New painted arenas change light, setting and colour without sacrificing attack readability. Artwork variation should come from intentional screenprint, ink and gouache treatments within one game universe, rather than unrelated asset packs fighting each other.

## Advertising design

Background wall panels are the initial inventory. They must stay outside the main attack and HUD zones. The owner can configure contextual brand art, a sponsor label, destination and active dates. Enquiries remain explicit requests, with manual pricing and approval. There is no made-up impression count, automatic checkout, promised reservation or live advertiser until configured.

No domain is selected on the owner's behalf. The existing host can serve the arcade release while the owner chooses a subdomain. Core play does not depend on a sponsor request, a sign-in or cloud connectivity after assets load. No third-party advertising or analytics tracker is needed for a direct placement.

## Verification and release evidence

Before deployment: test mirrored outcomes, parry boundaries, guard pressure, dodge direction/timing, resource bounds, AI input independence, saved campaign validation, seven-fight progression and boss-state reset. Verify online endpoints reject requests without reaching a Durable Object. Run all combat simulation tests locally.

In the browser: inspect multiple animation frames for both fighters, extended-arm coverage, charged power effects, guard/parry silhouettes, floating number duration, boss charge, round/fight/campaign victory, pause/resume, short phone layouts and landscape. Play through all seven encounters with a deterministic local test driver, then separately exercise real controls and timing. Assert that gameplay makes no API/WebSocket traffic. Check independent audio controls and hidden-tab suspension.

Automated tests establish reproducibility and rule consistency. Screenshot review establishes that the intended poses actually render. Neither substitutes for observing new human players. After release, the useful questions are whether a new player can dodge the first tell, explain a missed parry, identify a counter opening and choose to retry after a loss. No retention or monetisation result is asserted before that evidence exists.
