import * as networkEnv from '$env/networks/networks.env';
import {
	BTC_MAINNET_NETWORK,
	BTC_MAINNET_NETWORK_ID,
	BTC_REGTEST_NETWORK_ID,
	BTC_TESTNET_NETWORK_ID,
	ETHEREUM_NETWORK,
	ETHEREUM_NETWORK_ID,
	ICP_NETWORK,
	ICP_NETWORK_ID,
	SEPOLIA_NETWORK,
	SEPOLIA_NETWORK_ID
} from '$env/networks/networks.env';
import { CKBTC_LEDGER_CANISTER_TESTNET_IDS } from '$env/networks/networks.icrc.env';
import {
	SOLANA_DEVNET_NETWORK,
	SOLANA_DEVNET_NETWORK_ID,
	SOLANA_LOCAL_NETWORK_ID,
	SOLANA_MAINNET_NETWORK,
	SOLANA_MAINNET_NETWORK_ID,
	SOLANA_NETWORKS,
	SOLANA_NETWORKS_IDS,
	SOLANA_TESTNET_NETWORK_ID
} from '$env/networks/networks.sol.env';
import { SEPOLIA_PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { BTC_MAINNET_TOKEN, BTC_REGTEST_TOKEN } from '$env/tokens/tokens.btc.env';
import { SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { NetworkId } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import {
	filterTokensForSelectedNetwork,
	isNetworkICP,
	isNetworkIdBTCMainnet,
	isNetworkIdBTCRegtest,
	isNetworkIdBTCTestnet,
	isNetworkIdBitcoin,
	isNetworkIdEthereum,
	isNetworkIdICP,
	isNetworkIdSOLDevnet,
	isNetworkIdSOLLocal,
	isNetworkIdSOLMainnet,
	isNetworkIdSOLTestnet,
	isNetworkIdSepolia,
	isNetworkIdSolana,
	isNetworkSolana,
	mapNetworkIdToBitcoinNetwork
} from '$lib/utils/network.utils';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';

describe('network utils', () => {
	describe('isNetworkICP', () => {
		it('should return true for ICP network', () => {
			expect(isNetworkICP(ICP_NETWORK)).toBe(true);
		});

		it('should return false for non-ICP network', () => {
			expect(isNetworkICP(ETHEREUM_NETWORK)).toBe(false);
		});
	});

	describe('isNetworkSolana', () => {
		it.each(SOLANA_NETWORKS)('should return true for Solana network $name', (network) => {
			expect(isNetworkSolana(network)).toBe(true);
		});

		it('should return false for non-ICP network', () => {
			expect(isNetworkSolana(ETHEREUM_NETWORK)).toBe(false);
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

	describe('isNetworkIdSepolia', () => {
		it('should return true for Sepolia network ID', () => {
			expect(isNetworkIdSepolia(SEPOLIA_NETWORK_ID)).toBe(true);
		});

		it('should return false for non-Sepolia network ID', () => {
			expect(isNetworkIdSepolia(ETHEREUM_NETWORK_ID)).toBe(false);

			expect(isNetworkIdSepolia(ICP_NETWORK_ID)).toBe(false);
		});
	});

	describe('isNetworkIdSolana', () => {
		it.each(SOLANA_NETWORKS_IDS)('should return true for Solana network ID %s', (id) => {
			expect(isNetworkIdSolana(id)).toBe(true);
		});

		it('should return false for non-Solana network IDs', () => {
			expect(isNetworkIdSolana(ICP_NETWORK_ID)).toBe(false);
			expect(isNetworkIdSolana(ETHEREUM_NETWORK_ID)).toBe(false);
			expect(isNetworkIdSolana(BTC_MAINNET_NETWORK_ID)).toBe(false);
		});

		it('should return false for undefined network ID', () => {
			expect(isNetworkIdSolana(undefined)).toBe(false);
		});
	});

	describe('isNetworkIdSOLMainnet', () => {
		it('should return true for SOL mainnet ID', () => {
			expect(isNetworkIdSOLMainnet(SOLANA_MAINNET_NETWORK_ID)).toBe(true);
		});

		it('should return false for non-SOL mainnet ID', () => {
			expect(isNetworkIdSOLMainnet(SOLANA_TESTNET_NETWORK_ID)).toBe(false);
			expect(isNetworkIdSOLMainnet(SOLANA_DEVNET_NETWORK_ID)).toBe(false);
			expect(isNetworkIdSOLMainnet(SOLANA_LOCAL_NETWORK_ID)).toBe(false);
		});
	});

	describe('isNetworkIdSOLTestnet', () => {
		it('should return true for SOL testnet ID', () => {
			expect(isNetworkIdSOLTestnet(SOLANA_TESTNET_NETWORK_ID)).toBe(true);
		});

		it('should return false for non-SOL testnet ID', () => {
			expect(isNetworkIdSOLTestnet(SOLANA_MAINNET_NETWORK_ID)).toBe(false);
			expect(isNetworkIdSOLTestnet(SOLANA_DEVNET_NETWORK_ID)).toBe(false);
			expect(isNetworkIdSOLTestnet(SOLANA_LOCAL_NETWORK_ID)).toBe(false);
		});
	});

	describe('isNetworkIdSOLDevnet', () => {
		it('should return true for SOL devnet ID', () => {
			expect(isNetworkIdSOLDevnet(SOLANA_DEVNET_NETWORK_ID)).toBe(true);
		});

		it('should return false for non-SOL devnet ID', () => {
			expect(isNetworkIdSOLDevnet(SOLANA_MAINNET_NETWORK_ID)).toBe(false);
			expect(isNetworkIdSOLDevnet(SOLANA_TESTNET_NETWORK_ID)).toBe(false);
			expect(isNetworkIdSOLDevnet(SOLANA_LOCAL_NETWORK_ID)).toBe(false);
		});
	});

	describe('isNetworkIdSOLLocal', () => {
		it('should return true for SOL local ID', () => {
			expect(isNetworkIdSOLLocal(SOLANA_LOCAL_NETWORK_ID)).toBe(true);
		});

		it('should return false for non-SOL local ID', () => {
			expect(isNetworkIdSOLLocal(SOLANA_MAINNET_NETWORK_ID)).toBe(false);
			expect(isNetworkIdSOLLocal(SOLANA_TESTNET_NETWORK_ID)).toBe(false);
			expect(isNetworkIdSOLLocal(SOLANA_DEVNET_NETWORK_ID)).toBe(false);
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

	describe('filterTokensForSelectedNetwork', () => {
		const tokens: Token[] = [
			ICP_TOKEN,
			SEPOLIA_TOKEN,
			SEPOLIA_PEPE_TOKEN,
			BTC_REGTEST_TOKEN,
			BTC_MAINNET_TOKEN
		];

		const mockIcrcTestnetToken = {
			...mockIcrcCustomToken,
			ledgerCanisterId: CKBTC_LEDGER_CANISTER_TESTNET_IDS,
			env: 'testnet'
		};

		it('should return an empty array when no tokens are provided', () => {
			expect(filterTokensForSelectedNetwork([[], undefined, false])).toEqual([]);

			expect(filterTokensForSelectedNetwork([[], BTC_MAINNET_NETWORK, false])).toEqual([]);

			expect(filterTokensForSelectedNetwork([[], SEPOLIA_NETWORK, false])).toEqual([]);

			expect(filterTokensForSelectedNetwork([[], undefined, true])).toEqual([]);

			expect(filterTokensForSelectedNetwork([[], BTC_MAINNET_NETWORK, true])).toEqual([]);

			expect(filterTokensForSelectedNetwork([[], SEPOLIA_NETWORK, true])).toEqual([]);
		});

		it('should return an empty array when there are not tokens for the selected network', () => {
			expect(filterTokensForSelectedNetwork([tokens, ETHEREUM_NETWORK, false])).toEqual([]);

			expect(filterTokensForSelectedNetwork([tokens, SOLANA_DEVNET_NETWORK, false])).toEqual([]);
		});

		it('should filter tokens on a mainnet network when it is provided', () => {
			expect(filterTokensForSelectedNetwork([tokens, BTC_MAINNET_NETWORK, false])).toEqual([
				BTC_MAINNET_TOKEN
			]);
		});

		it('should filter tokens on a testnet network when it is provided', () => {
			expect(filterTokensForSelectedNetwork([tokens, SEPOLIA_NETWORK, false])).toEqual([
				SEPOLIA_TOKEN,
				SEPOLIA_PEPE_TOKEN
			]);
		});

		it('should filter tokens without testnets when no network is provided and Chain Fusion is true', () => {
			expect(filterTokensForSelectedNetwork([tokens, undefined, true])).toEqual([
				ICP_TOKEN,
				BTC_MAINNET_TOKEN
			]);
		});

		it('should ignore provided mainnet network when Chain Fusion is true', () => {
			expect(filterTokensForSelectedNetwork([tokens, BTC_MAINNET_NETWORK, true])).toEqual([
				ICP_TOKEN,
				BTC_MAINNET_TOKEN
			]);

			expect(filterTokensForSelectedNetwork([tokens, SOLANA_MAINNET_NETWORK, true])).toEqual([
				ICP_TOKEN,
				BTC_MAINNET_TOKEN
			]);
		});

		it('should not ignore provided testnet network when Chain Fusion is true', () => {
			expect(filterTokensForSelectedNetwork([tokens, SEPOLIA_NETWORK, true])).toEqual([
				ICP_TOKEN,
				SEPOLIA_TOKEN,
				SEPOLIA_PEPE_TOKEN,
				BTC_MAINNET_TOKEN
			]);

			expect(filterTokensForSelectedNetwork([tokens, SOLANA_DEVNET_NETWORK, true])).toEqual([
				ICP_TOKEN,
				BTC_MAINNET_TOKEN
			]);
		});

		it('should return ICRC pseudo-testnet tokens when filtering for ICP network', () => {
			expect(
				filterTokensForSelectedNetwork([[...tokens, mockIcrcTestnetToken], ICP_NETWORK, false])
			).toEqual([ICP_TOKEN, mockIcrcTestnetToken]);

			expect(
				filterTokensForSelectedNetwork([[...tokens, mockIcrcTestnetToken], ICP_NETWORK, true])
			).toEqual([ICP_TOKEN, BTC_MAINNET_TOKEN, mockIcrcTestnetToken]);
		});
	});
});
