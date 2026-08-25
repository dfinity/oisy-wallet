// Feature flag for the tips surface (the Issue Tip menu entry and its modals).
//
// Off until the flow is complete. Tips ship across several PRs — sender UI,
// recipient claim, History, reserved balance — and a half-built money flow is
// worse than no flow at all: a user who reserves a tip they cannot yet cancel
// has an encumbered balance and no way out. The flag lets each PR land on main
// on its own, and one line turns the feature on once the last one is in.
// TODO: enable once the recipient flow, History and reserved balance have landed.
export const TIPS_ENABLED = false;
