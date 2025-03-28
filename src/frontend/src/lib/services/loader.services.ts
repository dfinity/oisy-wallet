import type { AllowSigningRequest } from '$declarations/backend/backend.did';
import { allowSigning } from '$lib/api/backend.api';
import { authStore } from '$lib/stores/auth.store';
import type { ResultSuccess } from '$lib/types/utils';
import { get } from 'svelte/store';

/**
 * Initializes the signer allowance by calling `allow_signing`.
 *
 * This function should be called once during boot time before retrieving ETH or BTC addresses.
 * It allocates a cycles budget sufficient for a reasonable number of signer calls.
 * A "reasonable" number is currently defined as 30 calls, allowing the user to retrieve their ETH and BTC addresses
 * and perform up to 28 additional transactions.
 *
 * If an error occurs during the `allow_signing` call, the user will be signed out,
 * as the Oisy Wallet cannot function without ETH or Bitcoin addresses.
 *
 * @async
 * @function initSignerAllowance
 * @returns {Promise<ResultSuccess>} Returns an object indicating success or failure of the operation.
 * @throws Will trigger a sign-out if `allow_signing` fails.
 */
export const initSignerAllowance = async (nonce: bigint): Promise<ResultSuccess> => {
	try {
		const request: AllowSigningRequest = {
			nonce: nonce
		};
		const { identity } = get(authStore);
		await allowSigning({ request, identity });
	} catch (_err: unknown) {
		// In the event of any error, we sign the user out, as we assume that the Oisy Wallet cannot function without ETH or Bitcoin addresses.
		console.log('error', _err);
		return { success: false };
	}
	return { success: true };
};
