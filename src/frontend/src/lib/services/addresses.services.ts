import { loadBtcAddressMainnet } from '$btc/services/btc-address.services';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { loadEthAddress } from '$eth/services/eth-address.services';
import type { NetworkId } from '$lib/types/network';
import type { ResultSuccess } from '$lib/types/utils';
import { loadSolAddressMainnet } from '$sol/services/sol-address.services';

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
