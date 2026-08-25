// Feature flag for the tips surface (the Issue Tip menu entry and its modals).
//
// Gates *creating* a tip, not claiming one. Turning this off must never strand
// money that is already reserved, so the `/tip/<id>` claim route stays reachable
// regardless: outstanding links keep working while the create surface is closed.
export const TIPS_ENABLED = true;
