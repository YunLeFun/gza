# Game Design

## Product Direction

The first release is titled **GZA：暴力电驴**. **GZA** stands for **GuangZhou Action（广州行动）**; **暴力电驴** is the first release subtitle. Classic scooter racing and kicking remain alongside Guangzhou exploration, starting with a complete mission loop across Kecun, Canton Tower and Pazhou. The existing v2 scooter icon and stable `dayun-kicker` identifiers are retained. See [GZA direction and rollout](gza-direction.md).

The sections below describe the existing arcade racing design; city exploration additionally supports pedestrians, dismounting and walking.

## Fantasy

The player rides a compact electric scooter from a first-person camera and uses absurdly strong kicks to send trucks flying away. The tone is arcade slapstick physics, not realistic violence.

## Core Loop

1. Accelerate through traffic.
2. Steer into a close side position near a truck.
3. Kick left or right at the right moment, or ram a truck to launch it at the cost of some speed.
4. Score from impact, combo, speed, and survival.
5. Recover momentum or stability and continue.

## Route Split Loop

Each 500 m sector has a midpoint split with two readable choices:

- Overtake route: higher score, followed by a telegraphed tanker that shifts across the two left lanes. Kicking or cleanly passing it awards a route-clear bonus.
- Safe route: lower score, restores stability and energy, and does not spawn a blocker.

Ordinary traffic is removed from the decision gate and its short post-choice corridor. This keeps the route tradeoff attributable to the dedicated blocker rather than an unlucky random spawn.

## Traffic Readability

- The two right-side lanes carry the rider's direction and the two left-side lanes carry oncoming traffic. A double yellow centerline makes the split readable before individual vehicle headings are visible.
- Cruising vehicles reserve longitudinal space at spawn and match a slower vehicle ahead before their physics bodies touch.
- Signalized intersections appear at regular intervals. Main-road traffic brakes at red lights, an all-red clearance phase prevents conflicting greens, and compact cars cross horizontally only when their road has a safe green window.
- Running a red light remains an arcade risk/reward choice: cross traffic participates in collisions instead of acting as scenery.
- Road-height and upright constraints apply only while cruising. A kick or player impact temporarily releases all axes for the full arcade stunt, then safely restores the vehicle to traffic flow after it settles.
- Five lightweight silhouettes keep traffic readable without external model downloads: cargo box, tanker, flatbed, dump truck, and concrete mixer.

## Ram Loop

- A ram requires a player-front contact with at least 14 relative speed. Low-speed bumps and side contacts remain stability-damaging scrapes.
- A valid kick input owns the target before ram resolution, so one contact cannot score as both a kick and a ram.
- Ram rewards are standalone and capped below kick scoring. They do not extend kick combos or count toward Kick Rush.
- Ramming preserves stability, combo, and active boost, but costs speed, counts as a collision, and invalidates the clean-sector bonus.
- Compact cars cost about 10% speed, regular trucks 16%, and heavy blockers 20%, with per-class minimum and maximum losses.
- Giant mode adds 35% ram force and mini mode removes 15%; neither changes the trigger threshold or speed cost.
- Ram-launched vehicles remain physical until they leave the visible play area instead of snapping upright in front of the rider.

## Red-Light Risk Loop

- Crossing the stop line on red costs 100 points but never locks the throttle or forces braking.
- Entering at 24 speed or above, facing active cross traffic, and clearing the junction without contact awards 400 points plus a 0.8-second boost.
- Slowing to 10 or below during red and then entering on green awards a 150-point legal-pass bonus.
- Ramming a cross-traffic car remains physically satisfying, but cancels the normal ram reward and adds a 300-point crash penalty.
- Score deductions stop at zero. Each junction and each airborne vehicle settle only once.

## Main Verbs

- Ride
- Weave
- Kick
- Ram
- Dodge
- Choose route
- Recover

## Feedback Goals

- Kicks should be immediately readable from first person.
- A successful hit should pause for a fraction of a second, then launch the truck sideways.
- Ramming should launch regular traffic forward with a heavier impact, while visibly shaving off a small amount of player speed.
- The player should see screen shake, FOV punch, sparks, and a short impact message.
- Cross-traffic crashes should punish stability without overriding a successful kick or ram moment.

## Non-Goals

- No pedestrians.
- No gore.
- No realistic injury simulation.
- No traffic-law realism.

## Mode Direction

Keep three gameplay categories on the same driving-and-kicking foundation: Item Race, Time Trial, and Practice.

- Item Race is the default launch: the fixed City Circuit, two laps, checkpoints, drift boosts, and collectible items. The menu previews the full circuit; the live minimap shares its projection and marks the rider and checkpoint progress.
- Time Trial uses the same fixed or seeded circuit without items. Both racing categories keep separate local finish-time records per map.
- Free Mode: a 90-second practice flow, prioritizing speed, lane pressure, physics impact, and exaggerated kick feedback.
- Music Mode: a 90-second rhythm variant where kick timing adds perfect/good/off-beat bonuses and streak feedback.
- Sprint Run: reach 1,500 m within 75 seconds. Crossing time is interpolated at the target line, and earlier finishes receive a larger remaining-time bonus.
- Kick Rush: land eight hits within 45 seconds. Completion rewards remaining time and the best combo, with denser traffic to keep targets available.

Practice modes keep independent local score records, with the classic road also supporting cloud scoreboards. Ghost recording and replay have been retired; startup removes only their legacy local caches. Live online opponents use a separate rendering adapter. Challenge progress is visible during play and the end screen distinguishes completion, timeout, and crash interruption. The server derives challenge progress from canonical distance or hit statistics instead of trusting client-provided completion fields.

This keeps the default immediately playable, adds short replayable goals, and leaves room for deeper rhythm-game content without forcing it onto every run.
