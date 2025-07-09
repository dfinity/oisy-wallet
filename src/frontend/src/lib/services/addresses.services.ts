import {
	loadBtcAddressMainnet,
	loadIdbBtcAddressMainnet
} from '$btc/services/btc-address.services';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { loadEthAddress, loadIdbEthAddress } from '$eth/services/eth-address.services';
import {
	networkBitcoinMainnetEnabled,
	networkEthereumEnabled,
	networkSolanaMainnetEnabled
} from '$lib/derived/networks.derived';
import type { LoadIdbAddressError } from '$lib/types/errors';
import type { NetworkId } from '$lib/types/network';
import type { ResultSuccess, ResultSuccessReduced } from '$lib/types/utils';
import { reduceResults } from '$lib/utils/results.utils';
import {
	loadIdbSolAddressMainnet,
	loadSolAddressMainnet
} from '$sol/services/sol-address.services';
import { get } from 'svelte/store';

export const loadAddresses = async (networkIds: NetworkId[]): Promise<ResultSuccess> => {
	const results = await Promise.all([
		networkIds.includes(BTC_MAINNET_NETWORK_ID)
			? loadBtcAddressMainnet()
			: Promise.resolve({ success: true }),
		networkIds.includes(ETHEREUM_NETWORK_ID)
			? loadEthAddress()
			: Promise.resolve({ success: true }),
		networkIds.includes(SOLANA_MAINNET_NETWORK_ID)
			? loadSolAddressMainnet()
			: Promise.resolve({ success: true })
	]);

	return { success: results.every(({ success }) => success) };
};

export const loadIdbAddresses = async (): Promise<ResultSuccessReduced<LoadIdbAddressError>> => {
	const promisesList: Promise<ResultSuccess<LoadIdbAddressError>>[] = [
		...(get(networkBitcoinMainnetEnabled) ? [loadIdbBtcAddressMainnet()] : []),
		...(get(networkEthereumEnabled) ? [loadIdbEthAddress()] : []),
		...(get(networkSolanaMainnetEnabled) ? [loadIdbSolAddressMainnet()] : [])
	];

	let results = await Promise.all(promisesList);

	if (results.length === 0) {
		return { success: true };
	}

	const { success, err } = reduceResults<LoadIdbAddressError>(
		results as [ResultSuccess<LoadIdbAddressError>, ...ResultSuccess<LoadIdbAddressError>[]]
	);

	return { success, err };
};
