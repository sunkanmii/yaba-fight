# Arcade asset provenance

The seven fighter portraits, complete action-pose sheets, first-person arm-pair sheet and three new arenas were generated for this project on 17 October 2026 with OpenAI image generation. Direction: original Nigerian comic ink/cel shading, distinct adult male faces, Lagos flyover/market/rooftop spaces, no borrowed game sprites or YouTube footage. The original Yaba backyard is retained. Each opponent has eight coherent whole-body illustrations: idle, jab contact, power anticipation, power contact, guard, parry, recovery and lean. The player has six complete arm-pair poses. Shoulders, elbows, wrists and hands are drawn together, displayed at their original aspect ratio, and never stretched as individual limb segments. The earlier segmented rig was rejected for bad anatomy and removed. Canvas adds impact marks, restrained charge effects and voltage rings. No runtime generation service is called.

`public/arcade/manifest.json` contains shipping image hashes and sizes. Run `python scripts/prepare-arcade-assets.py --source-dir PATH_TO_GENERATED_PNGS` for portraits/maps, then `python scripts/prepare-pose-sprites.py --source-dir PATH_TO_GENERATED_PNGS --mapping scripts/arcade-pose-sources.json` for poses. Pose normalization checks real alpha and sheet dimensions, extracts the connected opponent from each fixed cell to exclude neighbouring-cell bleed, and encodes WebP without changing individual pose scale or anchors. Both separate player arms are retained. The generated source images remain in the Codex generated-images directory; the shipping files are committed in this repository. Shipping art totals 4,333,026 bytes; ten audio clips total about 149 KB.

Ten audio files were curated from official Kenney downloads:

- [Impact Sounds](https://kenney.nl/assets/impact-sounds): punches, guard, bell.
- [Music Jingles](https://kenney.nl/assets/music-jingles): victory punctuation.
- [Voiceover Pack (Fighter)](https://kenney.nl/assets/voiceover-pack-fighter): fight, rounds and victory announcements.

All three packs are CC0. Their original license texts are included beside the files in `public/audio/arcade/`. The manifest there records the exact archive filename, source page, SHA-256, byte size and license for every selected file. Only those ten clips ship; the rest of the packs remain outside the public directory. The looping percussion soundtrack is original Web Audio synthesis. Effects/music have independent volume controls and a master mute; playback is unlocked by a user gesture and suspended when hidden/paused.

Icons use the existing [Lucide](https://lucide.dev/license) package under its ISC/Feather MIT terms. No additional icon library was necessary. Existing self-hosted Barlow Condensed and DM Sans fonts retain their SIL notices in `public/fonts/`.
