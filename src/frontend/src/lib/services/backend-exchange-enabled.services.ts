import { BACKEND_EXCHANGE_ENABLED } from '$env/exchange.env';
import { exchangeRateEnabled } from '$lib/api/backend.api';
import { consoleError } from '$lib/utils/console.utils';
import { AnonymousIdentity } from '@icp-sdk/core/agent';

/**
 * Resolves the effective backend `exchange_rate_enabled` flag at runtime.
 *
 * Calls the unauthenticated `exchange_rate_enabled` query on the backend canister and
 * returns its result. On any failure, falls back to the build-time
 * {@link BACKEND_EXCHANGE_ENABLED} env constant so behavior degrades gracefully when
 * the backend is unreachable or the query is rejected.
 *
 * Used to gate the exchange worker's data source (backend cache vs. public providers)
 * and its refresh cadence — see `ExchangeWorker.svelte` and `exchange.worker.ts`.
 */
export const loadBackendExchangeEnabled = async (): Promise<boolean> => {
	try {
		return await exchangeRateEnabled({
			identity: new AnonymousIdentity(),
			certified: false
		});
	} catch (err: unknown) {
		consoleError('Failed to fetch backend exchange_rate_enabled, falling back to env:', err);
		return BACKEND_EXCHANGE_ENABLED;
	}
};
