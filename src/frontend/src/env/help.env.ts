import { LOCAL, STAGING } from '$lib/constants/app.constants';

// TODO: set to true once the Help page ships everywhere.
export const HELP_ENABLED = LOCAL || STAGING;
