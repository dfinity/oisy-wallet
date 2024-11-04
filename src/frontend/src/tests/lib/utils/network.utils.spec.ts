import {
	BTC_MAINNET_NETWORK,
	BTC_MAINNET_NETWORK_ID,
	BTC_REGTEST_NETWORK_ID,
	BTC_TESTNET_NETWORK_ID,
	ETHEREUM_NETWORK_ID,
	ICP_NETWORK_ID,
	SEPOLIA_NETWORK,
	SEPOLIA_NETWORK_ID
} from '$env/networks.env';
import { SEPOLIA_PEPE_TOKEN } from '$env/tokens-erc20/tokens.pepe.env';
import { BTC_MAINNET_TOKEN, BTC_REGTEST_TOKEN } from '$env/tokens.btc.env';
import { ICP_TOKEN, SEPOLIA_TOKEN } from '$env/tokens.env';
import type { Token } from '$lib/types/token';
import {
	filterTokensForSelectedNetwork,
	mapNetworkIdToBitcoinNetwork
} from '$lib/utils/network.utils';

describe('mapNetworkIdToBitcoinNetwork', () => {
	it('should map network id to bitcoin network', () => {
		expect(mapNetworkIdToBitcoinNetwork(BTC_MAINNET_NETWORK_ID)).toBe('mainnet');
		expect(mapNetworkIdToBitcoinNetwork(BTC_TESTNET_NETWORK_ID)).toBe('testnet');
		expect(mapNetworkIdToBitcoinNetwork(BTC_REGTEST_NETWORK_ID)).toBe('regtest');
	});

	it('should return `undefined` with non bitcoin network', () => {
		expect(mapNetworkIdToBitcoinNetwork(ETHEREUM_NETWORK_ID)).toBeUndefined();
		expect(mapNetworkIdToBitcoinNetwork(SEPOLIA_NETWORK_ID)).toBeUndefined();
		expect(mapNetworkIdToBitcoinNetwork(ICP_NETWORK_ID)).toBeUndefined();
	});
});

describe('filterTokensForSelectedNetwork', () => {
	const tokens: Token[] = [
		ICP_TOKEN,
		SEPOLIA_TOKEN,
		SEPOLIA_PEPE_TOKEN,
		BTC_REGTEST_TOKEN,
		BTC_MAINNET_TOKEN
	];

	it('should return an empty array when no tokens are provided', () => {
		expect(filterTokensForSelectedNetwork([[], undefined])).toEqual([]);

		expect(filterTokensForSelectedNetwork([[], BTC_MAINNET_NETWORK])).toEqual([]);

		expect(filterTokensForSelectedNetwork([[], SEPOLIA_NETWORK])).toEqual([]);
	});

	it('should filter tokens on the selected network when it is provided', () => {
		expect(filterTokensForSelectedNetwork([tokens, BTC_MAINNET_NETWORK])).toEqual([
			BTC_MAINNET_TOKEN
		]);

		expect(filterTokensForSelectedNetwork([tokens, SEPOLIA_NETWORK])).toEqual([
			SEPOLIA_TOKEN,
			SEPOLIA_PEPE_TOKEN
		]);
	});

	it('should filter tokens without testnets when no network is provided and Chain Fusion is true', () => {
		expect(filterTokensForSelectedNetwork([tokens, undefined])).toEqual([
			ICP_TOKEN,
			BTC_MAINNET_TOKEN
		]);
	});
});
