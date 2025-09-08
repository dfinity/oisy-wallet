import { SUPPORTED_ARBITRUM_NETWORK_IDS } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import {
	BASE_NETWORK_ID,
	SUPPORTED_BASE_NETWORK_IDS
} from '$env/networks/networks-evm/networks.evm.base.env';
import {
	BSC_MAINNET_NETWORK_ID,
	SUPPORTED_BSC_NETWORK_IDS
} from '$env/networks/networks-evm/networks.evm.bsc.env';
import { SUPPORTED_EVM_NETWORK_IDS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_POLYGON_NETWORK_IDS } from '$env/networks/networks-evm/networks.evm.polygon.env';
import * as btcNetworkEnv from '$env/networks/networks.btc.env';
import {
	BTC_MAINNET_NETWORK,
	BTC_MAINNET_NETWORK_ID,
	BTC_REGTEST_NETWORK_ID,
	BTC_TESTNET_NETWORK_ID
} from '$env/networks/networks.btc.env';
import {
	ETHEREUM_NETWORK,
	ETHEREUM_NETWORK_ID,
	SEPOLIA_NETWORK,
	SEPOLIA_NETWORK_ID,
	SUPPORTED_ETHEREUM_NETWORK_IDS
} from '$env/networks/networks.eth.env';
import {
	ICP_NETWORK,
	ICP_NETWORK_ID,
	ICP_PSEUDO_TESTNET_NETWORK_ID
} from '$env/networks/networks.icp.env';
import { CKBTC_LEDGER_CANISTER_TESTNET_IDS } from '$env/networks/networks.icrc.env';
import {
	SOLANA_DEVNET_NETWORK,
	SOLANA_DEVNET_NETWORK_ID,
	SOLANA_LOCAL_NETWORK_ID,
	SOLANA_MAINNET_NETWORK,
	SOLANA_MAINNET_NETWORK_ID,
	SUPPORTED_SOLANA_NETWORKS,
	SUPPORTED_SOLANA_NETWORK_IDS
} from '$env/networks/networks.sol.env';
import { SEPOLIA_PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { BTC_MAINNET_TOKEN, BTC_REGTEST_TOKEN } from '$env/tokens/tokens.btc.env';
import { SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { NetworkId } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import {
	filterTokensForSelectedNetwork,
	filterTokensForSelectedNetworks,
	isNetworkICP,
	isNetworkIdArbitrum,
	isNetworkIdBTCMainnet,
	isNetworkIdBTCRegtest,
	isNetworkIdBTCTestnet,
	isNetworkIdBase,
	isNetworkIdBitcoin,
	isNetworkIdBsc,
	isNetworkIdEthereum,
	isNetworkIdEvm,
	isNetworkIdICP,
	isNetworkIdPolygon,
	isNetworkIdSOLDevnet,
	isNetworkIdSOLLocal,
	isNetworkIdSOLMainnet,
	isNetworkIdSepolia,
	isNetworkIdSolana,
	isNetworkSolana,
	isPseudoNetworkIdIcpTestnet,
	mapNetworkIdToBitcoinNetwork
} from '$lib/utils/network.utils';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';

describe('network utils', () => {
	describe('isNetworkICP', () => {
		it('should return true for ICP network', () => {
			expect(isNetworkICP(ICP_NETWORK)).toBeTruthy();
		});

		it('should return false for non-ICP network', () => {
			expect(isNetworkICP(ETHEREUM_NETWORK)).toBeFalsy();
		});
	});

	describe('isNetworkSolana', () => {
		it.each(SUPPORTED_SOLANA_NETWORKS)('should return true for Solana network $name', (network) => {
			expect(isNetworkSolana(network)).toBeTruthy();
		});

		it('should return false for non-ICP network', () => {
			expect(isNetworkSolana(ETHEREUM_NETWORK)).toBeFalsy();
		});
	});

	describe('isPseudoNetworkIdIcpTestnet', () => {
		it('should return false for ICP network ID', () => {
			expect(isPseudoNetworkIdIcpTestnet(ICP_NETWORK_ID)).toBeFalsy();
		});

		it('should return true for ICP pseud-network ID', () => {
			expect(isPseudoNetworkIdIcpTestnet(ICP_PSEUDO_TESTNET_NETWORK_ID)).toBeTruthy();
		});

		it('should return false for non-ICP network ID', () => {
			expect(isPseudoNetworkIdIcpTestnet(BTC_MAINNET_NETWORK_ID)).toBeFalsy();
		});
	});

	describe('isNetworkIdICP', () => {
		it('should return true for ICP network ID', () => {
			expect(isNetworkIdICP(ICP_NETWORK_ID)).toBeTruthy();
		});

		it('should return true for ICP pseud-network ID', () => {
			expect(isNetworkIdICP(ICP_PSEUDO_TESTNET_NETWORK_ID)).toBeTruthy();
		});

		it('should return false for non-ICP network ID', () => {
			expect(isNetworkIdICP(BTC_MAINNET_NETWORK_ID)).toBeFalsy();
		});
	});

	describe('isNetworkIdEthereum', () => {
		it.each(SUPPORTED_ETHEREUM_NETWORK_IDS)(
			'should return true for Ethereum network ID %s',
			(id) => {
				expect(isNetworkIdEthereum(id as NetworkId)).toBeTruthy();
			}
		);

		it('should return false for non-Ethereum network IDs', () => {
			expect(isNetworkIdEthereum(BTC_MAINNET_NETWORK_ID)).toBeFalsy();
		});
	});

	describe('isNetworkIdEvm', () => {
		it.each(SUPPORTED_EVM_NETWORK_IDS)('should return true for EVM network ID %s', (id) => {
			expect(isNetworkIdEvm(id as NetworkId)).toBeTruthy();
		});

		it('should return false for non-EVM network IDs', () => {
			expect(isNetworkIdEvm(BTC_MAINNET_NETWORK_ID)).toBeFalsy();

			expect(isNetworkIdEvm(ETHEREUM_NETWORK_ID)).toBeFalsy();
		});
	});

	describe('isNetworkIdBase', () => {
		it.each(SUPPORTED_BASE_NETWORK_IDS)('should return true for Base network ID %s', (id) => {
			expect(isNetworkIdBase(id as NetworkId)).toBeTruthy();
		});

		it('should return false for non-Base network IDs', () => {
			expect(isNetworkIdBase(BTC_MAINNET_NETWORK_ID)).toBeFalsy();

			expect(isNetworkIdBase(ETHEREUM_NETWORK_ID)).toBeFalsy();

			expect(isNetworkIdBase(BSC_MAINNET_NETWORK_ID)).toBeFalsy();
		});
	});

	describe('isNetworkIdBsc', () => {
		it.each(SUPPORTED_BSC_NETWORK_IDS)('should return true for BSC network ID %s', (id) => {
			expect(isNetworkIdBsc(id as NetworkId)).toBeTruthy();
		});

		it('should return false for non-BSC network IDs', () => {
			expect(isNetworkIdBsc(BTC_MAINNET_NETWORK_ID)).toBeFalsy();

			expect(isNetworkIdBsc(ETHEREUM_NETWORK_ID)).toBeFalsy();

			expect(isNetworkIdBsc(BASE_NETWORK_ID)).toBeFalsy();
		});
	});

	describe('isNetworkIdPolygon', () => {
		it.each(SUPPORTED_POLYGON_NETWORK_IDS)('should return true for Polygon network ID %s', (id) => {
			expect(isNetworkIdPolygon(id as NetworkId)).toBeTruthy();
		});

		it('should return false for non-Polygon network IDs', () => {
			expect(isNetworkIdPolygon(BTC_MAINNET_NETWORK_ID)).toBeFalsy();

			expect(isNetworkIdPolygon(ETHEREUM_NETWORK_ID)).toBeFalsy();

			expect(isNetworkIdPolygon(BASE_NETWORK_ID)).toBeFalsy();
		});
	});

	describe('isNetworkIdArbitrum', () => {
		it.each(SUPPORTED_ARBITRUM_NETWORK_IDS)(
			'should return true for Arbitrum network ID %s',
			(id) => {
				expect(isNetworkIdArbitrum(id as NetworkId)).toBeTruthy();
			}
		);

		it('should return false for non-Arbitrum network IDs', () => {
			expect(isNetworkIdArbitrum(BTC_MAINNET_NETWORK_ID)).toBeFalsy();

			expect(isNetworkIdArbitrum(ETHEREUM_NETWORK_ID)).toBeFalsy();

			expect(isNetworkIdArbitrum(BASE_NETWORK_ID)).toBeFalsy();
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
			expect(isNetworkIdBitcoin(id as NetworkId)).toBeTruthy();
		});

		it('should return false for non-Bitcoin network IDs', () => {
			expect(isNetworkIdBitcoin(ICP_NETWORK_ID)).toBeFalsy();
		});

		it('should return false for Bitcoin regtest network ID when it is not LOCAL env', () => {
			vi.spyOn(btcNetworkEnv, 'SUPPORTED_BITCOIN_NETWORK_IDS', 'get').mockImplementationOnce(() => [
				BTC_MAINNET_NETWORK_ID,
				BTC_TESTNET_NETWORK_ID
			]);

			expect(isNetworkIdBitcoin(BTC_REGTEST_NETWORK_ID)).toBeFalsy();
		});
	});

	describe('isNetworkIdBTCMainnet', () => {
		it('should return true for BTC mainnet ID', () => {
			expect(isNetworkIdBTCMainnet(BTC_MAINNET_NETWORK_ID)).toBeTruthy();
		});

		it('should return false for non-BTC mainnet ID', () => {
			expect(isNetworkIdBTCMainnet(BTC_TESTNET_NETWORK_ID)).toBeFalsy();
		});
	});

	describe('isNetworkIdBTCTestnet', () => {
		it('should return true for BTC testnet ID', () => {
			expect(isNetworkIdBTCTestnet(BTC_TESTNET_NETWORK_ID)).toBeTruthy();
		});

		it('should return false for non-BTC testnet ID', () => {
			expect(isNetworkIdBTCTestnet(BTC_MAINNET_NETWORK_ID)).toBeFalsy();
		});
	});

	describe('isNetworkIdBTCRegtest', () => {
		it('should return true for BTC regtest ID', () => {
			expect(isNetworkIdBTCRegtest(BTC_REGTEST_NETWORK_ID)).toBeTruthy();
		});

		it('should return false for non-BTC regtest ID', () => {
			expect(isNetworkIdBTCRegtest(BTC_MAINNET_NETWORK_ID)).toBeFalsy();
		});
	});

	describe('isNetworkIdSepolia', () => {
		it('should return true for Sepolia network ID', () => {
			expect(isNetworkIdSepolia(SEPOLIA_NETWORK_ID)).toBeTruthy();
		});

		it('should return false for non-Sepolia network ID', () => {
			expect(isNetworkIdSepolia(ETHEREUM_NETWORK_ID)).toBeFalsy();

			expect(isNetworkIdSepolia(ICP_NETWORK_ID)).toBeFalsy();
		});
	});

	describe('isNetworkIdSolana', () => {
		it.each(SUPPORTED_SOLANA_NETWORK_IDS)('should return true for Solana network ID %s', (id) => {
			expect(isNetworkIdSolana(id)).toBeTruthy();
		});

		it('should return false for non-Solana network IDs', () => {
			expect(isNetworkIdSolana(ICP_NETWORK_ID)).toBeFalsy();
			expect(isNetworkIdSolana(ETHEREUM_NETWORK_ID)).toBeFalsy();
			expect(isNetworkIdSolana(BTC_MAINNET_NETWORK_ID)).toBeFalsy();
		});

		it('should return false for undefined network ID', () => {
			expect(isNetworkIdSolana(undefined)).toBeFalsy();
		});
	});

	describe('isNetworkIdSOLMainnet', () => {
		it('should return true for SOL mainnet ID', () => {
			expect(isNetworkIdSOLMainnet(SOLANA_MAINNET_NETWORK_ID)).toBeTruthy();
		});

		it('should return false for non-SOL mainnet ID', () => {
			expect(isNetworkIdSOLMainnet(SOLANA_DEVNET_NETWORK_ID)).toBeFalsy();
			expect(isNetworkIdSOLMainnet(SOLANA_LOCAL_NETWORK_ID)).toBeFalsy();
		});
	});

	describe('isNetworkIdSOLDevnet', () => {
		it('should return true for SOL devnet ID', () => {
			expect(isNetworkIdSOLDevnet(SOLANA_DEVNET_NETWORK_ID)).toBeTruthy();
		});

		it('should return false for non-SOL devnet ID', () => {
			expect(isNetworkIdSOLDevnet(SOLANA_MAINNET_NETWORK_ID)).toBeFalsy();
			expect(isNetworkIdSOLDevnet(SOLANA_LOCAL_NETWORK_ID)).toBeFalsy();
		});
	});

	describe('isNetworkIdSOLLocal', () => {
		it('should return true for SOL local ID', () => {
			expect(isNetworkIdSOLLocal(SOLANA_LOCAL_NETWORK_ID)).toBeTruthy();
		});

		it('should return false for non-SOL local ID', () => {
			expect(isNetworkIdSOLLocal(SOLANA_MAINNET_NETWORK_ID)).toBeFalsy();
			expect(isNetworkIdSOLLocal(SOLANA_DEVNET_NETWORK_ID)).toBeFalsy();
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

		const extendedTokens: Token[] = [...tokens, mockIcrcTestnetToken];

		it('should return an empty array when no tokens are provided', () => {
			expect(filterTokensForSelectedNetwork([[], undefined, false])).toEqual([]);

			expect(filterTokensForSelectedNetwork([[], BTC_MAINNET_NETWORK, false])).toEqual([]);

			expect(filterTokensForSelectedNetwork([[], SEPOLIA_NETWORK, false])).toEqual([]);

			expect(filterTokensForSelectedNetwork([[], undefined, true])).toEqual([]);

			expect(filterTokensForSelectedNetwork([[], BTC_MAINNET_NETWORK, true])).toEqual([]);

			expect(filterTokensForSelectedNetwork([[], SEPOLIA_NETWORK, true])).toEqual([]);
		});

		it('should return an empty array when there are no tokens for the selected network', () => {
			expect(filterTokensForSelectedNetwork([tokens, ETHEREUM_NETWORK, false])).toEqual([]);

			expect(filterTokensForSelectedNetwork([tokens, SOLANA_DEVNET_NETWORK, false])).toEqual([]);
		});

		it('should filter tokens on a mainnet network', () => {
			expect(filterTokensForSelectedNetwork([tokens, BTC_MAINNET_NETWORK, false])).toEqual([
				BTC_MAINNET_TOKEN
			]);
		});

		it('should filter tokens on a testnet network', () => {
			expect(filterTokensForSelectedNetwork([tokens, SEPOLIA_NETWORK, false])).toEqual([
				SEPOLIA_TOKEN,
				SEPOLIA_PEPE_TOKEN
			]);
		});

		it('should filter mainnet tokens when no network is provided and Chain Fusion is true', () => {
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

		it('should return ICRC pseudo-testnet tokens when filtering for ICP network or if Chain Fusion is true', () => {
			expect(filterTokensForSelectedNetwork([extendedTokens, ICP_NETWORK, false])).toEqual([
				ICP_TOKEN,
				mockIcrcTestnetToken
			]);

			expect(filterTokensForSelectedNetwork([extendedTokens, ICP_NETWORK, true])).toEqual([
				ICP_TOKEN,
				BTC_MAINNET_TOKEN,
				mockIcrcTestnetToken
			]);

			expect(filterTokensForSelectedNetwork([extendedTokens, BTC_MAINNET_NETWORK, true])).toEqual([
				ICP_TOKEN,
				BTC_MAINNET_TOKEN,
				mockIcrcTestnetToken
			]);

			expect(filterTokensForSelectedNetwork([extendedTokens, SEPOLIA_NETWORK, true])).toEqual([
				ICP_TOKEN,
				SEPOLIA_TOKEN,
				SEPOLIA_PEPE_TOKEN,
				BTC_MAINNET_TOKEN,
				mockIcrcTestnetToken
			]);

			expect(
				filterTokensForSelectedNetwork([extendedTokens, SOLANA_MAINNET_NETWORK, true])
			).toEqual([ICP_TOKEN, BTC_MAINNET_TOKEN, mockIcrcTestnetToken]);

			expect(filterTokensForSelectedNetwork([extendedTokens, undefined, true])).toEqual([
				ICP_TOKEN,
				BTC_MAINNET_TOKEN,
				mockIcrcTestnetToken
			]);
		});

		it('should not return ICRC pseudo-testnet tokens when filtering for non-ICP network', () => {
			expect(filterTokensForSelectedNetwork([extendedTokens, BTC_MAINNET_NETWORK, false])).toEqual([
				BTC_MAINNET_TOKEN
			]);

			expect(filterTokensForSelectedNetwork([extendedTokens, SEPOLIA_NETWORK, false])).toEqual([
				SEPOLIA_TOKEN,
				SEPOLIA_PEPE_TOKEN
			]);

			expect(
				filterTokensForSelectedNetwork([extendedTokens, SOLANA_MAINNET_NETWORK, false])
			).toEqual([]);
		});
	});

	describe('filterTokensForSelectedNetworks', () => {
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

		const extendedTokens: Token[] = [...tokens, mockIcrcTestnetToken];

		it('should return an empty array when no tokens are provided', () => {
			expect(filterTokensForSelectedNetworks([[], undefined, false])).toEqual([]);

			expect(filterTokensForSelectedNetworks([[], [BTC_MAINNET_NETWORK_ID], false])).toEqual([]);

			expect(filterTokensForSelectedNetworks([[], [SEPOLIA_NETWORK_ID], false])).toEqual([]);

			expect(filterTokensForSelectedNetworks([[], undefined, true])).toEqual([]);

			expect(filterTokensForSelectedNetworks([[], [BTC_MAINNET_NETWORK_ID], true])).toEqual([]);

			expect(filterTokensForSelectedNetworks([[], [SEPOLIA_NETWORK_ID], true])).toEqual([]);
		});

		it('should return an empty array when there are no tokens for the selected networks', () => {
			expect(filterTokensForSelectedNetworks([tokens, [ETHEREUM_NETWORK_ID], false])).toEqual([]);

			expect(filterTokensForSelectedNetworks([tokens, [SOLANA_DEVNET_NETWORK_ID], false])).toEqual(
				[]
			);
		});

		it('should filter tokens for a single mainnet network', () => {
			expect(filterTokensForSelectedNetworks([tokens, [BTC_MAINNET_NETWORK_ID], false])).toEqual([
				BTC_MAINNET_TOKEN
			]);
		});

		it('should filter tokens for a single testnet network', () => {
			expect(filterTokensForSelectedNetworks([tokens, [SEPOLIA_NETWORK_ID], false])).toEqual([
				SEPOLIA_TOKEN,
				SEPOLIA_PEPE_TOKEN
			]);
		});

		it('should filter tokens for multiple networks', () => {
			expect(
				filterTokensForSelectedNetworks([
					tokens,
					[BTC_MAINNET_NETWORK_ID, SEPOLIA_NETWORK_ID],
					false
				])
			).toEqual([SEPOLIA_TOKEN, SEPOLIA_PEPE_TOKEN, BTC_MAINNET_TOKEN]);
		});

		it('should filter mainnet tokens when no networks are provided and Chain Fusion is true', () => {
			expect(filterTokensForSelectedNetworks([tokens, undefined, true])).toEqual([
				ICP_TOKEN,
				BTC_MAINNET_TOKEN
			]);
		});

		it('should ignore provided mainnet networks when Chain Fusion is true', () => {
			expect(filterTokensForSelectedNetworks([tokens, [BTC_MAINNET_NETWORK_ID], true])).toEqual([
				ICP_TOKEN,
				BTC_MAINNET_TOKEN
			]);

			expect(filterTokensForSelectedNetworks([tokens, [SOLANA_MAINNET_NETWORK_ID], true])).toEqual([
				ICP_TOKEN,
				BTC_MAINNET_TOKEN
			]);
		});

		it('should not ignore provided testnet networks when Chain Fusion is true', () => {
			expect(filterTokensForSelectedNetworks([tokens, [SEPOLIA_NETWORK_ID], true])).toEqual([
				ICP_TOKEN,
				SEPOLIA_TOKEN,
				SEPOLIA_PEPE_TOKEN,
				BTC_MAINNET_TOKEN
			]);

			expect(filterTokensForSelectedNetworks([tokens, [SOLANA_DEVNET_NETWORK_ID], true])).toEqual([
				ICP_TOKEN,
				BTC_MAINNET_TOKEN
			]);
		});

		it('should return ICRC pseudo-testnet tokens when filtering for ICP network or if Chain Fusion is true', () => {
			expect(filterTokensForSelectedNetworks([extendedTokens, [ICP_NETWORK_ID], false])).toEqual([
				ICP_TOKEN,
				mockIcrcTestnetToken
			]);

			expect(filterTokensForSelectedNetworks([extendedTokens, [ICP_NETWORK_ID], true])).toEqual([
				ICP_TOKEN,
				BTC_MAINNET_TOKEN,
				mockIcrcTestnetToken
			]);

			expect(
				filterTokensForSelectedNetworks([extendedTokens, [BTC_MAINNET_NETWORK_ID], true])
			).toEqual([ICP_TOKEN, BTC_MAINNET_TOKEN, mockIcrcTestnetToken]);

			expect(filterTokensForSelectedNetworks([extendedTokens, [SEPOLIA_NETWORK_ID], true])).toEqual(
				[ICP_TOKEN, SEPOLIA_TOKEN, SEPOLIA_PEPE_TOKEN, BTC_MAINNET_TOKEN, mockIcrcTestnetToken]
			);

			expect(
				filterTokensForSelectedNetworks([extendedTokens, [SOLANA_MAINNET_NETWORK_ID], true])
			).toEqual([ICP_TOKEN, BTC_MAINNET_TOKEN, mockIcrcTestnetToken]);

			expect(filterTokensForSelectedNetworks([extendedTokens, undefined, true])).toEqual([
				ICP_TOKEN,
				BTC_MAINNET_TOKEN,
				mockIcrcTestnetToken
			]);
		});

		it('should not return ICRC pseudo-testnet tokens when filtering for non-ICP networks', () => {
			expect(
				filterTokensForSelectedNetworks([extendedTokens, [BTC_MAINNET_NETWORK_ID], false])
			).toEqual([BTC_MAINNET_TOKEN]);

			expect(
				filterTokensForSelectedNetworks([extendedTokens, [SEPOLIA_NETWORK_ID], false])
			).toEqual([SEPOLIA_TOKEN, SEPOLIA_PEPE_TOKEN]);

			expect(
				filterTokensForSelectedNetworks([extendedTokens, [SOLANA_MAINNET_NETWORK_ID], false])
			).toEqual([]);
		});

		it('should handle mixed mainnet and testnet networks', () => {
			expect(
				filterTokensForSelectedNetworks([
					extendedTokens,
					[BTC_MAINNET_NETWORK_ID, SEPOLIA_NETWORK_ID],
					false
				])
			).toEqual([SEPOLIA_TOKEN, SEPOLIA_PEPE_TOKEN, BTC_MAINNET_TOKEN]);
		});

		it('should return empty array when selected networks is empty array', () => {
			expect(filterTokensForSelectedNetworks([tokens, [], false])).toEqual([]);
			expect(filterTokensForSelectedNetworks([tokens, [], true])).toEqual([
				ICP_TOKEN,
				BTC_MAINNET_TOKEN
			]);
		});
	});
});
