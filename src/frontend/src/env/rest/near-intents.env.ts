import { LOCAL, STAGING } from '$lib/constants/app.constants';

export const NEAR_INTENTS_SWAP_ENABLED = LOCAL || STAGING;

export const NEAR_INTENTS_API_KEY = import.meta.env.VITE_NEAR_INTENTS_API_KEY;
