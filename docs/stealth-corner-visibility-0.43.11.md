# Stealth and footprint-corner visibility — 0.43.21

## Detection progression

Detection is relative to each observer and defaults to **Observed**. Any positive cover bonus, concealment, or another valid visual protection permits a creature to **Hide**; the protection alone does not make it Hidden. Lesser cover permits Hide without a Stealth circumstance bonus. A successful Hide changes Observed to **Hidden** for that observer.

**Sneak cannot improve an Observed state.** It checks only observers for whom the creature was Hidden or Undetected when that Sneak began. Against an eligible observer, a successful Sneak makes the creature Undetected, a failure leaves it Hidden, and a critical failure makes it Observed. The endpoint must still provide valid protection unless a rule such as Legendary Sneak removes that requirement.

This progression is shared by manual player/NPC Hide and Sneak, AI stealth, captions, targeting checks, and observer memory. No global Hidden condition is required because different observers can have different states.

## Footprint-corner table policy

PF2e's published default cover procedure draws a line between creature centers. This campaign instead uses the following scriptable table policy for walls and other native collision geometry:

1. Medium and smaller tokens contribute their four footprint corners.
2. Larger tokens contribute every grid intersection across their footprint, including internal intersections.
3. Each observer intersection is tested against every target intersection. Results from separate observer intersections are not combined.
4. If one observer intersection can see every target intersection, the view is unobstructed.
5. If no target intersection is visible, line of sight or physical line of effect is blocked.
6. If the best observer intersection sees exactly one target intersection, the target has standard cover (+2 AC and +2 Stealth where applicable).
7. If it sees more than one but fewer than all target intersections, the target has lesser cover (+1 AC). Lesser cover permits Hide but grants no Stealth circumstance bonus.
8. Only a view of every target intersection removes wall-derived cover.

Each sampled intersection is moved **0.05 grid units inward toward its token center** before collision testing. This avoids treating a grid-snapped wall that merely touches a creature's footprint as covering that creature's adjacent corners. Internal samples remain internal, and a wall between two creatures still blocks the inset rays normally.

The sight calculation is used for wall visibility, wall-derived cover, Hide eligibility, continuous cover during Sneak, captions, reactions, and AI decisions. Physical attack paths use the same footprint sampling with movement collision so a transparent solid barrier can still stop an attack. Explicit cover/concealment Regions remain a separate sight-height line test and combine by using the highest applicable cover bonus.

Complete obstruction can prevent precise sight, but partial cover never changes Observed to Hidden automatically. The creature must successfully Hide before it can Sneak to Undetected.

For display, the module feeds all target footprint intersections into Foundry's native vision engine. Foundry normally casts those visibility rays from the observer's center, while this table policy permits a ray from any observer footprint sample. If the table's corner-to-corner wall test succeeds but the center-origin polygon does not, the module substitutes only the wall LOS result and retains Foundry's detection mode, range, facing, lighting, invisibility, and scene-level checks. A relative Hidden result represents a known square and remains rendered for the owning player even when a wall blocks every corner; it also adds a local copy of PF2e's Hidden overlay. Relative or explicit Undetected/Unnoticed suppresses the token for non-owners. GM-hidden tokens remain hidden from players. These display rules do not add Actor conditions or disclose observer-relative results to other clients.

Rules references: [Detecting Creatures](https://2e.aonprd.com/Rules.aspx?ID=2414), [Hide](https://2e.aonprd.com/Actions.aspx?ID=2404), [Sneak](https://2e.aonprd.com/Actions.aspx?ID=2405), [Cover](https://2e.aonprd.com/Rules.aspx?ID=2372).
