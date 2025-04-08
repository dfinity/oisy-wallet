import { BETA, PROD } from '$lib/constants/app.constants';

export const ETHERSCAN_API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY;

export const BASESCAN_API_URL = import.meta.env.VITE_BASESCAN_API_KEY;

export const ETHERSCAN_MAX_CALLS_PER_SECOND = BETA || PROD ? 10 : 5;
