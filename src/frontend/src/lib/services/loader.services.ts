import { FRONTEND_DERIVATION_ENABLED } from '$env/address.env';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { XRP_MAINNET_NETWORK_ID } from '$env/networks/networks.xrp.env';
import {
	networkBitcoinMainnetEnabled,
	networkEthereumEnabled,
	networkEvmMainnetEnabled,
	networkSolanaMainnetEnabled,
	networkXrpMainnetEnabled
} from '$lib/derived/networks.derived';
import { loadAddresses } from '$lib/services/addresses.services';
import { requestAllowanceAtLoad } from '$lib/services/allowance-request.services';
import { infoSignOut, nullishSignOut, signOut } from '$lib/services/auth.services';
import { loadUserProfile } from '$lib/services/load-user-profile.services';
import { authStore } from '$lib/stores/auth.store';
import { i18n } from '$lib/stores/i18n.store';
import type { NullishIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import { isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

/**
 * Initializes the signer allowance by calling `allow_signing`.
 *
 * This function should be called once during boot time before retrieving ETH or BTC addresses.
 * It allocates a cycles budget sufficient for a reasonable number of signer calls.
 * A "reasonable" number is currently defined as 30 calls, allowing the user to retrieve their ETH and BTC addresses
 * and perform up to 28 additional transactions.
 *
 * It never fails: if the `allow_signing` call fails, the user stays signed in and the app carries on.
 *
 * @async
 * @function initSignerAllowance
 * @returns {Promise<void>} Resolves once the call has been answered or has failed.
 */
export const initSignerAllowance = async (): Promise<void> => {
	const { identity } = get(authStore);

	// A refused request is no reason to stop: the backend tops the allowance up only once it runs low,
	// so the user may still have enough left to sign.
	await requestAllowanceAtLoad(identity);
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
			await infoSignOut({
				text: get(i18n).auth.info.signups_closed,
				source: 'signups-closed'
			});

			return;
		}

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
		await initSignerAllowance();
	}

	// We can fetch these values imperatively because these stores were just updated at the beginning of this same function, when loading the user profile.
	const enabledNetworkIds: NetworkId[] = [
		...(get(networkBitcoinMainnetEnabled) ? [BTC_MAINNET_NETWORK_ID] : []),
		...(get(networkEthereumEnabled) || get(networkEvmMainnetEnabled) ? [ETHEREUM_NETWORK_ID] : []),
		...(get(networkSolanaMainnetEnabled) ? [SOLANA_MAINNET_NETWORK_ID] : []),
		...(get(networkXrpMainnetEnabled) ? [XRP_MAINNET_NETWORK_ID] : [])
	];

	const { success: addressSuccess } = await loadAddresses(enabledNetworkIds);

	if (!addressSuccess) {
		await signOut({});
		return;
	}

	await progressAndLoad();
};
