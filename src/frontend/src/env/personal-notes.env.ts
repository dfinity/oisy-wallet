import { STAGING } from '$lib/constants/app.constants';

// Temporary feature flag for the personal-notes surface (the Notes menu entry
// and its modal). Enabled in staging during development and kept off in
// production until the feature ships, so main stays deployable while the
// stacked notes PRs land. Removed once personal notes ship.
// TODO: remove once personal notes ship to production.
export const PERSONAL_NOTES_ENABLED = STAGING;
