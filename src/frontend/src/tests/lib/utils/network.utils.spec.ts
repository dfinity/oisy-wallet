import * as networkEnv from '$env/networks.env';
import {
	BTC_MAINNET_NETWORK_ID,
	BTC_REGTEST_NETWORK_ID,
	BTC_TESTNET_NETWORK_ID,
	ETHEREUM_NETWORK,
	ETHEREUM_NETWORK_ID,
	ICP_NETWORK,
	ICP_NETWORK_ID,
	SEPOLIA_NETWORK_ID
} from '$env/networks.env';
import type { NetworkId } from '$lib/types/network';
import {
	isNetworkICP,
	isNetworkIdBTCMainnet,
	isNetworkIdBTCRegtest,
	isNetworkIdBTCTestnet,
	isNetworkIdBitcoin,
	isNetworkIdEthereum,
	isNetworkIdICP,
	mapNetworkIdToBitcoinNetwork
} from '$lib/utils/network.utils';

describe('network utils', () => {
	describe('isNetworkICP', () => {
		it('should return true for ICP network', () => {
			expect(isNetworkICP(ICP_NETWORK)).toBe(true);
		});

		it('should return false for non-ICP network', () => {
			expect(isNetworkICP(ETHEREUM_NETWORK)).toBe(false);
		});
	});

	describe('isNetworkIdICP', () => {
		it('should return true for ICP network ID', () => {
			expect(isNetworkIdICP(ICP_NETWORK_ID)).toBe(true);
		});

		it('should return false for non-ICP network ID', () => {
			expect(isNetworkIdICP(BTC_MAINNET_NETWORK_ID)).toBe(false);
		});
	});

	describe('isNetworkIdEthereum', () => {
		const allEthereumNetworkIds = [ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID];

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(networkEnv, 'SUPPORTED_ETHEREUM_NETWORKS_IDS', 'get').mockImplementation(
				() => allEthereumNetworkIds
			);
		});

		it.each(allEthereumNetworkIds)('should return true for Ethereum network ID %s', (id) => {
			expect(isNetworkIdEthereum(id as NetworkId)).toBe(true);
		});

		it('should return false for non-Ethereum network IDs', () => {
			expect(isNetworkIdEthereum(BTC_MAINNET_NETWORK_ID)).toBe(false);
		});

		it('should return false for Ethereum mainnet network ID when mainnet is disabled', () => {
			vi.spyOn(networkEnv, 'SUPPORTED_ETHEREUM_NETWORKS_IDS', 'get').mockImplementationOnce(
				() => allEthereumNetworkIds
			);
		});
	});

	describe('isNetworkIdBitcoin', () => {
		const allBitcoinNetworkIds = [
			BTC_MAINNET_NETWORK_ID,
			BTC_TESTNET_NETWORK_ID,
			BTC_REGTEST_NETWORK_ID
		];

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it.each(allBitcoinNetworkIds)('should return true for Bitcoin network ID %s', (id) => {
			expect(isNetworkIdBitcoin(id as NetworkId)).toBe(true);
		});

		it('should return false for non-Bitcoin network IDs', () => {
			expect(isNetworkIdBitcoin(ICP_NETWORK_ID)).toBe(false);
		});

		it('should return false for Bitcoin regtest network ID when it is not LOCAL env', () => {
			vi.spyOn(networkEnv, 'BITCOIN_NETWORKS_IDS', 'get').mockImplementationOnce(() => [
				BTC_MAINNET_NETWORK_ID,
				BTC_TESTNET_NETWORK_ID
			]);

			expect(isNetworkIdBitcoin(BTC_REGTEST_NETWORK_ID)).toBe(false);
		});
	});

	describe('isNetworkIdBTCMainnet', () => {
		it('should return true for BTC mainnet ID', () => {
			expect(isNetworkIdBTCMainnet(BTC_MAINNET_NETWORK_ID)).toBe(true);
		});

		it('should return false for non-BTC mainnet ID', () => {
			expect(isNetworkIdBTCMainnet(BTC_TESTNET_NETWORK_ID)).toBe(false);
		});
	});

	describe('isNetworkIdBTCTestnet', () => {
		it('should return true for BTC testnet ID', () => {
			expect(isNetworkIdBTCTestnet(BTC_TESTNET_NETWORK_ID)).toBe(true);
		});

		it('should return false for non-BTC testnet ID', () => {
			expect(isNetworkIdBTCTestnet(BTC_MAINNET_NETWORK_ID)).toBe(false);
		});
	});

	describe('isNetworkIdBTCRegtest', () => {
		it('should return true for BTC regtest ID', () => {
			expect(isNetworkIdBTCRegtest(BTC_REGTEST_NETWORK_ID)).toBe(true);
		});

		it('should return false for non-BTC regtest ID', () => {
			expect(isNetworkIdBTCRegtest(BTC_MAINNET_NETWORK_ID)).toBe(false);
		});
	});

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
});
