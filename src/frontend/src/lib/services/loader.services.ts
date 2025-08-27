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
import { loadAddresses, loadIdbAddresses } from '$lib/services/addresses.services';
import { errorSignOut, nullishSignOut, signOut } from '$lib/services/auth.services';
import { loadUserProfile } from '$lib/services/load-user-profile.services';
import { authStore } from '$lib/stores/auth.store';
import { i18n } from '$lib/stores/i18n.store';
import { loading } from '$lib/stores/loader.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { ResultSuccess } from '$lib/types/utils';
import { isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

/**
 * Retrieves and checks if the required number of cycles are available for the user.
 *
 * This asynchronous function verifies whether the user has sufficient cycles to proceed with further operations.
 * It retrieves the user's identity and calculates the number of allowed cycles. If the number of allowed cycles
 * meets or exceeds the defined threshold (`POW_MIN_CYCLES_THRESHOLD`), the function returns `true`. Otherwise,
 * it performs necessary error handling and signs the user out in the event of insufficient cycles or any other
 * encountered error.
 *
 * @returns {Promise<boolean>} A promise resolving to `true` if the required cycles are met or exceeded,
 * otherwise `false` if insufficient cycles are detected or an error occurs during processing.
 */
export const handleInsufficientCycles = async (): Promise<boolean> => {
	try {
		const { identity } = get(authStore);
		return await hasRequiredCycles({ identity });
	} catch (_err: unknown) {
		// In the event of any error, we sign the user out, since do not know whether the user has enough cycles to continue.
		await errorSignOut(get(i18n).init.error.waiting_for_allowed_cycles_aborted);
	}
	return false;
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
 * If the addresses are loaded from the IDB:
 * - The addresses will be validated.
 * - The additional data will be loaded.
 * - The progress modal will not be displayed.
 * If the addresses are loaded from the backend:
 * - The signer allowance will be initialized.
 * - The additional data will be loaded.
 * - The progress modal will be displayed.
 *
 * @param {Object} params The parameters to initialize the loader.
 * @param {OptionIdentity} params.identity The identity to use for the request.
 * @param {Function} params.validateAddresses The function to validate the addresses.
 * @param {Function} params.progressAndLoad The function to set the next step of the Progress modal and load the additional data.
 * @param {Function} params.setProgressModal The function to set the progress modal.
 * @returns {Promise<void>} Returns a promise that resolves when the loader is correctly initialized (user profile settings and addresses are loaded).
 */
export const initLoader = async ({
	identity,
	validateAddresses,
	progressAndLoad,
	setProgressModal
}: {
	identity: OptionIdentity;
	validateAddresses: () => void;
	progressAndLoad: () => Promise<void>;
	setProgressModal: (value: boolean) => void;
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

	// We can fetch these values imperatively because these stores were just updated at the beginning of this same function, when loading the user profile.
	const enabledNetworkIds: NetworkId[] = [
		...(get(networkBitcoinMainnetEnabled) ? [BTC_MAINNET_NETWORK_ID] : []),
		...(get(networkEthereumEnabled) || get(networkEvmMainnetEnabled) ? [ETHEREUM_NETWORK_ID] : []),
		...(get(networkSolanaMainnetEnabled) ? [SOLANA_MAINNET_NETWORK_ID] : [])
	];

	const { success: addressIdbSuccess, err } = await loadIdbAddresses(enabledNetworkIds);

	if (addressIdbSuccess) {
		loading.set(false);

		await progressAndLoad();

		validateAddresses();

		return;
	}

	// We are loading the addresses from the backend. Consequently, we aim to animate this operation and offer the user an explanation of what is happening. To achieve this, we will present this information within a modal.
	setProgressModal(true);
	if (!POW_FEATURE_ENABLED) {
		const { success: initSignerAllowanceSuccess } = await initSignerAllowance();

		if (!initSignerAllowanceSuccess) {
			// Sign-out is handled within the service.
			return;
		}
	}

	const errorNetworkIds: NetworkId[] = err?.map(({ networkId }) => networkId) ?? [];

	// We don't need to load the addresses of the disabled networks.
	const networkIds: NetworkId[] = errorNetworkIds.filter((networkId) =>
		enabledNetworkIds.includes(networkId)
	);

	const { success: addressSuccess } = await loadAddresses(networkIds);

	if (!addressSuccess) {
		await signOut({});
		return;
	}

	await progressAndLoad();
};
