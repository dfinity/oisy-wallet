import { ARBITRUM_MAINNET_NETWORK_SYMBOL } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { BASE_NETWORK_SYMBOL } from '$env/networks/networks-evm/networks.evm.base.env';
import { BSC_MAINNET_NETWORK_SYMBOL } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { POLYGON_MAINNET_NETWORK_SYMBOL } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { BTC_MAINNET_NETWORK_SYMBOL } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_SYMBOL } from '$env/networks/networks.eth.env';
import {
	ICP_NETWORK_SYMBOL,
	ICP_PSEUDO_TESTNET_NETWORK_SYMBOL
} from '$env/networks/networks.icp.env';
import { SOLANA_MAINNET_NETWORK_SYMBOL } from '$env/networks/networks.sol.env';
import { enabledNetworksSymbols } from '$lib/derived/networks.derived';
import { get } from 'svelte/store';

describe('networks.derived', () => {
	describe('enabledNetworksSymbols', () => {
		it('has correct data', () => {
			expect(get(enabledNetworksSymbols)).toEqual([
				BTC_MAINNET_NETWORK_SYMBOL,
				ETHEREUM_NETWORK_SYMBOL,
				ICP_NETWORK_SYMBOL,
				ICP_PSEUDO_TESTNET_NETWORK_SYMBOL,
				SOLANA_MAINNET_NETWORK_SYMBOL,
				BASE_NETWORK_SYMBOL,
				BSC_MAINNET_NETWORK_SYMBOL,
				POLYGON_MAINNET_NETWORK_SYMBOL,
				ARBITRUM_MAINNET_NETWORK_SYMBOL
			]);
		});
	});
});
