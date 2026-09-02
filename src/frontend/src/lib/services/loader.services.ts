import { FRONTEND_DERIVATION_ENABLED } from '$env/address.env';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { allowSigning } from '$lib/api/backend.api';
import {
	networkBitcoinMainnetEnabled,
	networkEthereumEnabled,
	networkEvmMainnetEnabled,
	networkSolanaMainnetEnabled
} from '$lib/derived/networks.derived';
import { loadAddresses } from '$lib/services/addresses.services';
import { trackRateLimited } from '$lib/services/analytics.services';
import { errorSignOut, infoSignOut, nullishSignOut, signOut } from '$lib/services/auth.services';
import { loadUserProfile } from '$lib/services/load-user-profile.services';
import { authStore } from '$lib/stores/auth.store';
import { i18n } from '$lib/stores/i18n.store';
import type { NullishIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { ResultSuccess } from '$lib/types/utils';
import { consoleError } from '$lib/utils/console.utils';
import { extractIIDelegationChain } from '$lib/utils/delegation.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

// DEBUG BUILD (fe2 only): dumps everything we know about a failure that would otherwise be
// swallowed before the sign-out. Remove together with the suppressed reload in `auth.services`.
const debugDump = (stage: string, err: unknown) => {
	const raw: Record<string, unknown> = { stage, type: Object.prototype.toString.call(err) };

	if (err instanceof Error) {
		raw.name = err.name;
		raw.message = err.message;
		raw.stack = err.stack;
		raw.cause = (err as Error & { cause?: unknown }).cause;
	}

	if (nonNullish(err) && typeof err === 'object') {
		for (const key of Object.getOwnPropertyNames(err)) {
			raw[`own.${key}`] = (err as Record<string, unknown>)[key];
		}
	}

	try {
		raw.json = JSON.stringify(err, (_k, v: unknown) => (typeof v === 'bigint' ? `${v}n` : v));
	} catch (_e: unknown) {
		raw.json = '<not serializable>';
	}

	consoleError(`[debug] ${stage} failed`, err, raw);
};

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
export const initSignerAllowance = async (): Promise<ResultSuccess> => {
	try {
		const { identity } = get(authStore);

		const { rateLimitInfo } = await allowSigning({
			identity,
			iiDelegationChain: nonNullish(identity) ? extractIIDelegationChain(identity) : []
		});

		if (nonNullish(rateLimitInfo)) {
			trackRateLimited(rateLimitInfo);
		}
	} catch (err: unknown) {
		debugDump('allow_signing', err);

		// In the event of any error, we sign the user out, as we assume that the Oisy Wallet cannot function without ETH or Bitcoin addresses.
		await errorSignOut(get(i18n).init.error.allow_signing);

		return { success: false };
	}
	return { success: true };
};

/**
 * Initializes the loader by loading the user profile settings and addresses.
 *
 * If the user profile settings cannot be loaded, the user will be signed out.
 * If the addresses are loaded from the backend correctly:
 * - The signer allowance will be initialized.
 * - The additional data will be loaded.
 *
 * @param {Object} params The parameters to initialize the loader.
 * @param {NullishIdentity} params.identity The identity to use for the request.
 * @param {Function} params.progressAndLoad The function to set the next step of the Progress modal and load the additional data.
 * @returns {Promise<void>} Returns a promise that resolves when the loader is correctly initialized (user profile settings and addresses are loaded).
 */
export const initLoader = async ({
	identity,
	progressAndLoad
}: {
	identity: NullishIdentity;
	progressAndLoad: () => void;
}): Promise<void> => {
	if (isNullish(identity)) {
		debugDump('initLoader:nullish-identity', { identity });
		await nullishSignOut();
		return;
	}

	// The user profile settings will define the enabled/disabled networks.
	// So we need to load it first to enable/disable the rest of the services.
	const {
		success: userProfileSuccess,
		err: userProfileError,
		profileCreated
	} = await loadUserProfile({
		identity
	});

	if (!userProfileSuccess) {
		if (userProfileError === 'signups-closed') {
			debugDump('initLoader:signups-closed', { userProfileError });
			await infoSignOut({
				text: get(i18n).auth.info.signups_closed,
				source: 'signups-closed'
			});

			return;
		}

		debugDump('initLoader:load-user-profile', {
			userProfileSuccess,
			userProfileError,
			profileCreated
		});
		await signOut({});
		return;
	}

	// A just-created profile has no signing allowance yet, so it must be awaited even when addresses
	// are derived in the frontend: the wallet workers started by `progressAndLoad` issue paid signer
	// calls (e.g. the certified BTC balance) that would otherwise race the approve.
	if (FRONTEND_DERIVATION_ENABLED && !profileCreated) {
		// We do not need to await this call, as it is required for signing transactions only and not for the generic initialization.
		initSignerAllowance();
	} else {
		const { success: initSignerAllowanceSuccess } = await initSignerAllowance();

		if (!initSignerAllowanceSuccess) {
			// Sign-out is handled within the service.
			return;
		}
	}

	// We can fetch these values imperatively because these stores were just updated at the beginning of this same function, when loading the user profile.
	const enabledNetworkIds: NetworkId[] = [
		...(get(networkBitcoinMainnetEnabled) ? [BTC_MAINNET_NETWORK_ID] : []),
		...(get(networkEthereumEnabled) || get(networkEvmMainnetEnabled) ? [ETHEREUM_NETWORK_ID] : []),
		...(get(networkSolanaMainnetEnabled) ? [SOLANA_MAINNET_NETWORK_ID] : [])
	];

	const { success: addressSuccess } = await loadAddresses(enabledNetworkIds);

	if (!addressSuccess) {
		debugDump('initLoader:load-addresses', { addressSuccess, enabledNetworkIds });
		await signOut({});
		return;
	}

	await progressAndLoad();
};
