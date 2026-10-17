# Original game art

Generated using the built-in image-generation tool on 17 October 2026. The supplied screenshot guides camera and stance, without copying its assets. Selected images are saved in `public/art/`.

## Fighter sheet

`sprite-sheet.png` is the original sheet. `opponent.png`, `left-hand.png`, and `right-hand.png` are alpha-preserving extracts. Initial hand extracts are retained as references; the game uses the dedicated guard below.

Generation prompt: “Create a production game sprite asset sheet on true transparent background. Original hand-drawn 2D Nigerian street boxing game. Thick expressive black ink outlines, cel-shaded warm brown skin, slightly gritty vintage comic/indie fighting game style. Exactly three isolated assets: first-person left bare fist and forearm; waist-up front-facing young adult Nigerian sparring opponent with orange sleeveless shirt, short afro and green wrist wraps; first-person right fist. No letters, UI, background, or watermark.”

Targeted edit prompt: “Remove all background glow, shadows, haze, gradients, and colour. True alpha transparency. Retain the left fist, central opponent, and right fist, preserving art identity and ink style. Reposition into three separate vertical thirds without overlap, with transparent margins.”

`scripts/extract-sprites.py` preserves original alpha edges and removes disconnected silhouette fragments. No user screenshot pixels are included in the exported sprites.

## Low guard

`guard-sheet.png` is the selected dedicated first-person guard, 1672 × 941. `guard-left.png` and `guard-right.png` are exact left/right halves including the transparent framing. This shared canvas keeps the correct spacing while allowing independent animation.

Final generation prompt: “Use first input as precise pose and camera reference only. Second input is brown skin green wrap ink comic style reference only. Generate a true transparent PNG overlay showing only the player's two bare fists and forearms in first person matching the reference's lowered boxing guard. Top 70 percent empty transparent. Left forearm enters bottom and angles up and inward right about 35 degrees from horizontal, ending near 36 percent width. Right forearm mirrors it, ending near 64 percent width. Topmost knuckles around 73.5 percent down frame. Wide open space between fists. Knuckles face forward, thumbs inward, view back of hands. Brown Nigerian skin, green wrist wraps, hand-drawn cel-shaded ink. Elbows invisible. Not upright, not at screen edges, not at eye level. No opponent, background, text, UI, haze, or glow.”

CSS places this original guard low in the arena and moves each half for attacks and defence. The game serves alpha-preserving WebP copies of the guard halves and opponent (about 157 KB combined); the PNG originals remain available. The courtyard is original SVG, and sounds are local Web Audio synthesis. Barlow Condensed and DM Sans are self-hosted under their included SIL Open Font Licenses, so no runtime requests go to Google Fonts.
