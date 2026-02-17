import { FRONTEND_DERIVATION_ENABLED } from '$env/address.env';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { POW_FEATURE_ENABLED } from '$env/pow.env';
import { hasRequiredCycles } from '$icp/services/pow-protector.services';
import { allowSigning } from '$lib/api/backend.api';
import { POW_MIN_CYCLES_THRESHOLD, POW_ZERO_CYCLES_THRESHOLD } from '$lib/constants/pow.constants';
import {
	networkBitcoinMainnetEnabled,
	networkEthereumEnabled,
	networkEvmMainnetEnabled,
	networkSolanaMainnetEnabled
} from '$lib/derived/networks.derived';
import { loadAddresses } from '$lib/services/addresses.services';
import { errorSignOut, nullishSignOut, signOut } from '$lib/services/auth.services';
import { loadUserProfile } from '$lib/services/load-user-profile.services';
import { authStore } from '$lib/stores/auth.store';
import { i18n } from '$lib/stores/i18n.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { ResultSuccess } from '$lib/types/utils';
import { assertNonNullish, isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const isCyclesAllowanceLow = async (): Promise<boolean> => {
	try {
		const { identity } = get(authStore);
		assertNonNullish(identity, 'Cannot continue without an identity.');
		return !(await hasRequiredCycles({ identity, requiredCycles: POW_MIN_CYCLES_THRESHOLD }));
	} catch (_err: unknown) {
		return false;
	}
};

export const isCyclesAllowanceSpent = async (): Promise<boolean> => {
	try {
		const { identity } = get(authStore);
		assertNonNullish(identity, 'Cannot continue without an identity.');
		return !(await hasRequiredCycles({ identity, requiredCycles: POW_ZERO_CYCLES_THRESHOLD }));
	} catch (_err: unknown) {
		return false;
	}
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

		await allowSigning({ identity });
	} catch (_err: unknown) {
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
 * @param {OptionIdentity} params.identity The identity to use for the request.
 * @param {Function} params.progressAndLoad The function to set the next step of the Progress modal and load the additional data.
 * @returns {Promise<void>} Returns a promise that resolves when the loader is correctly initialized (user profile settings and addresses are loaded).
 */
export const initLoader = async ({
	identity,
	progressAndLoad
}: {
	identity: OptionIdentity;
	progressAndLoad: () => void;
}): Promise<void> => {
	if (isNullish(identity)) {
		await nullishSignOut();
		return;
	}

	// The user profile settings will define the enabled/disabled networks.
	// So we need to load it first to enable/disable the rest of the services.
	const { success: userProfileSuccess } = await loadUserProfile({ identity });

	if (!userProfileSuccess) {
		await signOut({});
		return;
	}

	if (!POW_FEATURE_ENABLED) {
		if (FRONTEND_DERIVATION_ENABLED) {
			// We do not need to await this call, as it is required for signing transactions only and not for the generic initialization.
			initSignerAllowance();
		} else {
			const { success: initSignerAllowanceSuccess } = await initSignerAllowance();

			if (!initSignerAllowanceSuccess) {
				// Sign-out is handled within the service.
				return;
			}
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
		await signOut({});
		return;
	}

	await progressAndLoad();
};
