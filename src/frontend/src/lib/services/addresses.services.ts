import {
	loadBtcAddressMainnet,
	loadIdbBtcAddressMainnet
} from '$btc/services/btc-address.services';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { loadEthAddress, loadIdbEthAddress } from '$eth/services/eth-address.services';
import type { LoadIdbAddressError } from '$lib/types/errors';
import type { NetworkId } from '$lib/types/network';
import type { ResultSuccess, ResultSuccessReduced } from '$lib/types/utils';
import { reduceResults } from '$lib/utils/results.utils';
import {
	loadIdbSolAddressMainnet,
	loadSolAddressMainnet
} from '$sol/services/sol-address.services';

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

export const loadIdbAddresses = async (
	networkIds: NetworkId[]
): Promise<ResultSuccessReduced<LoadIdbAddressError>> => {
	const results = await Promise.all([
		...(networkIds.includes(BTC_MAINNET_NETWORK_ID)
			? [loadIdbBtcAddressMainnet()]
			: ([] as ResultSuccess<LoadIdbAddressError>[])),
		...(networkIds.includes(ETHEREUM_NETWORK_ID)
			? [loadIdbEthAddress()]
			: ([] as ResultSuccess<LoadIdbAddressError>[])),
		...(networkIds.includes(SOLANA_MAINNET_NETWORK_ID)
			? [loadIdbSolAddressMainnet()]
			: ([] as ResultSuccess<LoadIdbAddressError>[]))
	]);

	const { success, err } = reduceResults<LoadIdbAddressError>(results);

	return { success, err };
};
