// Feature flag for the tips surface (the Issue Tip menu entry and its modals).
//
// Gates *creating* a tip, not claiming one. Turning this off must never strand
// money that is already reserved, so the `/tip/<id>` claim route stays reachable
// regardless: outstanding links keep working while the create surface is closed.
//
// Widened to `boolean` on purpose. Left to infer, this is a literal type, and
// `vi.mock` type-checks its factory against that literal — so `tips-disabled.spec.ts`,
// which must keep mocking `false` now that this line has flipped, would stop
// compiling. That spec is the one thing asserting the surface can still be shut,
// so it has to survive this PR rather than be deleted by it.
//
// A cast rather than a `: boolean` annotation because `no-inferrable-types`
// strips the annotation on `npm run format`.
export const TIPS_ENABLED = true as boolean;
