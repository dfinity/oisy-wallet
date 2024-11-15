import { BETA, PROD } from '$lib/constants/app.constants';
import Bottleneck from 'bottleneck';

export const ETHERSCAN_API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY;

const MAX_CALLS_PER_SECOND = BETA || PROD ? 10 : 5;

export const BOTTLENECK_PARAMS =
	BETA || PROD
		? // Limit of 10 calls per second, minus 2 of offset for insurance
			{ minTime: 1000 / (MAX_CALLS_PER_SECOND - 2), maxConcurrent: MAX_CALLS_PER_SECOND - 2 }
		: // Limit of 5 calls per second, minus 1 of offset for insurance
			{ minTime: 1000 / (MAX_CALLS_PER_SECOND - 1), maxConcurrent: MAX_CALLS_PER_SECOND - 1 };

// Etherscan API limits the number of requests per second depending on the plan (details: https://docs.etherscan.io/support/rate-limits)
// We need to limit the number of requests to avoid errors; however, the API is used by several objects, so we need to share the limiter.
export const etherscanSharedLimiter = new Bottleneck(BOTTLENECK_PARAMS);
