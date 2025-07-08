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
	const promisesList: Promise<ResultSuccess<LoadIdbAddressError>>[] = [];

	if (get(networkBitcoinMainnetEnabled)) {
		promisesList.push(loadIdbBtcAddressMainnet());
	}

	if (get(networkEthereumEnabled)) {
		promisesList.push(loadIdbEthAddress());
	}

	if (get(networkSolanaMainnetEnabled)) {
		promisesList.push(loadIdbSolAddressMainnet());
	}

	let results = await Promise.all(promisesList);

	// since reduceResults always expects at least one entry, we return a success result to satisfy the type when no promises need to be resolved
	if (results.length === 0) {
		results = [{ success: true, err: undefined }];
	}

	const { success, err } = reduceResults<LoadIdbAddressError>(
		results as [ResultSuccess<LoadIdbAddressError>, ...ResultSuccess<LoadIdbAddressError>[]]
	);

	return { success, err };
};
