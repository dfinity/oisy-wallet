// Feature flag for the tips surface (the Issue Tip menu entry and its modals).
//
// Off until the flow is complete. Tips ship across several PRs — sender UI,
// recipient claim, History, reserved balance — and a half-built money flow is
// worse than no flow at all: a user who reserves a tip they cannot yet cancel
// has an encumbered balance and no way out. The flag lets each PR land on main
// on its own, and one line turns the feature on once the last one is in.
// TODO: enable once the recipient flow, History and reserved balance have landed.
//
// Widened to `boolean` on purpose. Left to infer, this is the literal type
// `false`, and `vi.mock` type-checks its factory against that literal — so a
// spec mocking the flag the other way stops compiling, which took a whole spec
// project down once. Widening also means the spec that asserts the surface
// stays dark survives the line flipping to `true`.
//
// A cast rather than a `: boolean` annotation because `no-inferrable-types`
// strips the annotation on `npm run format`.
export const TIPS_ENABLED = false as boolean;
