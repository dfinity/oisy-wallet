import { BETA, LOCAL, PROD, STAGING } from '$lib/constants/app.constants';

export const HELP_ENABLED = LOCAL || STAGING || BETA || PROD;
