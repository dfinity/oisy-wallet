import { BACKEND_ONRAMPER_ENABLED } from '$env/rest/onramper.env';
import { onramperEnabled } from '$lib/api/backend.api';
import { consoleError } from '$lib/utils/console.utils';
import { AnonymousIdentity } from '@icp-sdk/core/agent';

/**
 * Resolves the effective backend `onramper_enabled` flag at runtime.
 *
 * Calls the unauthenticated `onramper_enabled` query on the backend canister, which reports
 * whether the OnRamper signing secret has been provisioned via `set_api_keys`. On any failure,
 * falls back to the build-time {@link BACKEND_ONRAMPER_ENABLED} env constant so behavior degrades
 * gracefully when the backend is unreachable or the query is rejected.
 *
 * Used to gate the buy flow up front (see `BuyModalContent.svelte`) so a missing secret shows the
 * unavailable notice instead of a widget that would fail on open.
 */
export const loadBackendOnramperEnabled = async (): Promise<boolean> => {
	try {
		return await onramperEnabled({
			identity: new AnonymousIdentity(),
			certified: false
		});
	} catch (err: unknown) {
		consoleError('Failed to fetch backend onramper_enabled, falling back to env:', err);
		return BACKEND_ONRAMPER_ENABLED;
	}
};
