import { BETA, PROD } from '$lib/constants/app.constants';

export const ETHERSCAN_API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY;

// our plan allows making 5 requests/second on staging and 10 requests/second on prod
// but since to fetch tx info for a token, we make 2 calls to Etherscan, the numbers should be divided by 2
export const ETHERSCAN_MAX_CALLS_PER_SECOND = BETA || PROD ? 5 : 2;
