import { loadBtcAddressMainnet } from '$btc/services/btc-address.services';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { loadEthAddress } from '$eth/services/eth-address.services';
import type { NetworkId } from '$lib/types/network';
import { loadSolAddressMainnet } from '$sol/services/sol-address.services';

export interface LoadAddressesResult {
	// Chains whose address could not be derived. The wallet stays usable without them, so a
	// non-empty list is not a reason to end the session.
	failedNetworkIds: NetworkId[];
	// The session itself is gone, rather than a chain having failed — the one case that still
	// warrants signing the user out.
	sessionInvalid: boolean;
}

export const loadAddresses = async (networkIds: NetworkId[]): Promise<LoadAddressesResult> => {
	const requested = [
		{ networkId: BTC_MAINNET_NETWORK_ID, load: loadBtcAddressMainnet },
		{ networkId: ETHEREUM_NETWORK_ID, load: loadEthAddress },
		{ networkId: SOLANA_MAINNET_NETWORK_ID, load: loadSolAddressMainnet }
	].filter(({ networkId }) => networkIds.includes(networkId));

	const results = await Promise.all(
		requested.map(async ({ networkId, load }) => ({ networkId, ...(await load()) }))
	);

	const failed = results.filter(({ success }) => !success);

	return {
		sessionInvalid: failed.some(({ err }) => err === 'session-invalid'),
		failedNetworkIds: failed
			.filter(({ err }) => err === 'derivation-failed')
			.map(({ networkId }) => networkId)
	};
};
