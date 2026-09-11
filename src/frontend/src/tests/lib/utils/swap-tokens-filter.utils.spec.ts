import { ARBITRUM_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ARBITRUM_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens.eth.env';
import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { IC_CKETH_LEDGER_CANISTER_ID } from '$env/tokens/tokens-icrc/tokens.icrc.ck.eth.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import type {
	SwapProviderSupport,
	SwapSupportedTokensData
} from '$lib/stores/swap-supported-tokens.store';
import { SwapProvider } from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import type { TokenToggleable } from '$lib/types/token-toggleable';
import {
	chainFusionCompatibleDestinations,
	toChainFusionPairs
} from '$lib/utils/chain-fusion-swap.utils';
import { buildNearIntentsSupportedDestinations } from '$lib/utils/near-intents-swap.utils';
import {
	computeReceiveSupportedTokens,
	filterSwapTokens,
	nativeSwapTokenIdentifier,
	networksWithSupport
} from '$lib/utils/swap-tokens-filter.utils';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
import {
	mockValidIcCkToken,
	mockValidIcToken,
	mockValidIcrcToken
} from '$tests/mocks/ic-tokens.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';

const btcIdentifier = nativeSwapTokenIdentifier({
	networkId: BTC_MAINNET_TOKEN.network.id,
	symbol: BTC_MAINNET_TOKEN.symbol
});

describe('filterSwapTokens', () => {
	const asToggleable = <T extends Token>({
		token,
		enabled
	}: {
		token: T;
		enabled: boolean;
	}): TokenToggleable<T> => ({
		...token,
		enabled
	});

	const CANISTER_ID_INACTIVE = 'uf2wh-taaaa-aaaaq-aabna-cai';
	const CANISTER_ID_UNSUPPORTED = 'utozz-siaaa-aaaam-qaaxq-cai';
	const CANISTER_ID_NOT_IN_SET = 'u45jl-liaaa-aaaam-abppa-cai';

	const icpTokenActive = asToggleable({ token: mockValidIcToken, enabled: true });
	const icpTokenInactive = asToggleable({
		token: { ...mockValidIcrcToken, ledgerCanisterId: CANISTER_ID_INACTIVE },
		enabled: false
	});
	const icpTokenInactiveUnsupported = asToggleable({
		token: { ...mockValidIcrcToken, ledgerCanisterId: CANISTER_ID_UNSUPPORTED },
		enabled: false
	});

	const erc20Active = asToggleable({ token: mockValidErc20Token, enabled: true });
	const erc20Inactive = asToggleable({
		token: { ...mockValidErc20Token, address: '0xInactiveAddr' },
		enabled: false
	});
	const erc20InactiveUnsupported = asToggleable({
		token: { ...mockValidErc20Token, address: '0xUnsupportedAddr' },
		enabled: false
	});

	const splActive = asToggleable({ token: mockValidSplToken, enabled: true });
	const splInactive = asToggleable({
		token: { ...mockValidSplToken, address: 'InactiveSplAddress' },
		enabled: false
	});

	describe('when supportedData is undefined', () => {
		it('returns all tokens unchanged', () => {
			const tokens = [icpTokenActive, icpTokenInactive, erc20Active, splActive];
			const result = filterSwapTokens({ tokens, supportedData: undefined });

			expect(result).toEqual(tokens);
		});
	});

	describe('coverage = all', () => {
		it('shows only supported tokens (active or inactive)', () => {
			const supportedData: SwapSupportedTokensData = {
				icp: {
					coverage: 'all',
					supportedTokenIds: new Set([
						icpTokenActive.ledgerCanisterId,
						icpTokenInactive.ledgerCanisterId
					])
				},
				evm: { coverage: 'none', supportedTokenIds: new Set() },
				sol: { coverage: 'none', supportedTokenIds: new Set() },
				btc: { coverage: 'none', supportedTokenIds: new Set() }
			};

			const tokens = [icpTokenActive, icpTokenInactive, icpTokenInactiveUnsupported];
			const result = filterSwapTokens({ tokens, supportedData });

			expect(result).toContain(icpTokenActive);
			expect(result).toContain(icpTokenInactive);
			expect(result).not.toContain(icpTokenInactiveUnsupported);
		});

		it('filters out active tokens not in the supported set', () => {
			const unsupportedActive = asToggleable({
				token: { ...mockValidIcrcToken, ledgerCanisterId: CANISTER_ID_NOT_IN_SET },
				enabled: true
			});

			const supportedData: SwapSupportedTokensData = {
				icp: {
					coverage: 'all',
					supportedTokenIds: new Set([icpTokenActive.ledgerCanisterId])
				},
				evm: { coverage: 'none', supportedTokenIds: new Set() },
				sol: { coverage: 'none', supportedTokenIds: new Set() },
				btc: { coverage: 'none', supportedTokenIds: new Set() }
			};

			const result = filterSwapTokens({
				tokens: [icpTokenActive, unsupportedActive],
				supportedData
			});

			expect(result).toContain(icpTokenActive);
			expect(result).not.toContain(unsupportedActive);
		});
	});

	describe('coverage = some', () => {
		it('shows all active tokens plus inactive supported ones', () => {
			const supportedData: SwapSupportedTokensData = {
				icp: { coverage: 'none', supportedTokenIds: new Set() },
				evm: {
					coverage: 'some',
					supportedTokenIds: new Set([erc20Inactive.address.toLowerCase()])
				},
				sol: { coverage: 'none', supportedTokenIds: new Set() },
				btc: { coverage: 'none', supportedTokenIds: new Set() }
			};

			const tokens = [erc20Active, erc20Inactive, erc20InactiveUnsupported];
			const result = filterSwapTokens({ tokens, supportedData });

			expect(result).toContain(erc20Active);
			expect(result).toContain(erc20Inactive);
			expect(result).not.toContain(erc20InactiveUnsupported);
		});

		it('keeps active tokens even when not in supported set', () => {
			const supportedData: SwapSupportedTokensData = {
				icp: { coverage: 'none', supportedTokenIds: new Set() },
				evm: {
					coverage: 'some',
					supportedTokenIds: new Set()
				},
				sol: { coverage: 'none', supportedTokenIds: new Set() },
				btc: { coverage: 'none', supportedTokenIds: new Set() }
			};

			const result = filterSwapTokens({
				tokens: [erc20Active],
				supportedData
			});

			expect(result).toContain(erc20Active);
		});
	});

	describe('coverage = none', () => {
		it('shows only active tokens', () => {
			const supportedData: SwapSupportedTokensData = {
				icp: { coverage: 'none', supportedTokenIds: new Set() },
				evm: { coverage: 'none', supportedTokenIds: new Set() },
				sol: { coverage: 'none', supportedTokenIds: new Set() },
				btc: { coverage: 'none', supportedTokenIds: new Set() }
			};

			const tokens = [erc20Active, erc20Inactive, splActive, splInactive];
			const result = filterSwapTokens({ tokens, supportedData });

			expect(result).toContain(erc20Active);
			expect(result).not.toContain(erc20Inactive);
			expect(result).toContain(splActive);
			expect(result).not.toContain(splInactive);
		});
	});

	describe('mixed network categories', () => {
		it('applies the correct rule per network category', () => {
			const supportedData: SwapSupportedTokensData = {
				icp: {
					coverage: 'all',
					supportedTokenIds: new Set([icpTokenActive.ledgerCanisterId])
				},
				evm: {
					coverage: 'some',
					supportedTokenIds: new Set([erc20Inactive.address.toLowerCase()])
				},
				sol: {
					coverage: 'all',
					supportedTokenIds: new Set([splActive.address])
				},
				btc: { coverage: 'none', supportedTokenIds: new Set() }
			};

			const tokens = [
				icpTokenActive,
				icpTokenInactive,
				erc20Active,
				erc20Inactive,
				erc20InactiveUnsupported,
				splActive,
				splInactive
			];

			const result = filterSwapTokens({ tokens, supportedData });

			// ICP: all → only supported
			expect(result).toContain(icpTokenActive);
			expect(result).not.toContain(icpTokenInactive);

			// EVM: some → active + supported inactive
			expect(result).toContain(erc20Active);
			expect(result).toContain(erc20Inactive);
			expect(result).not.toContain(erc20InactiveUnsupported);

			// SOL: all → only supported
			expect(result).toContain(splActive);
			expect(result).not.toContain(splInactive);
		});
	});

	describe('EVM token identifier matching', () => {
		it('matches ERC-20 address case-insensitively', () => {
			const token = asToggleable({
				token: { ...mockValidErc20Token, address: '0xAbCdEf1234567890' },
				enabled: false
			});

			const supportedData: SwapSupportedTokensData = {
				icp: { coverage: 'none', supportedTokenIds: new Set() },
				evm: {
					coverage: 'all',
					supportedTokenIds: new Set(['0xabcdef1234567890'])
				},
				sol: { coverage: 'none', supportedTokenIds: new Set() },
				btc: { coverage: 'none', supportedTokenIds: new Set() }
			};

			const result = filterSwapTokens({ tokens: [token], supportedData });

			expect(result).toContain(token);
		});

		it('matches ERC-4626 address case-insensitively', () => {
			const token = asToggleable({
				token: { ...mockValidErc4626Token, address: '0xAbCdEf1234567890' },
				enabled: false
			});

			const supportedData: SwapSupportedTokensData = {
				icp: { coverage: 'none', supportedTokenIds: new Set() },
				evm: {
					coverage: 'all',
					supportedTokenIds: new Set(['0xabcdef1234567890'])
				},
				sol: { coverage: 'none', supportedTokenIds: new Set() },
				btc: { coverage: 'none', supportedTokenIds: new Set() }
			};

			const result = filterSwapTokens({ tokens: [token], supportedData });

			expect(result).toContain(token);
		});

		it('filters out unsupported ERC-4626 tokens when coverage is all', () => {
			const token = asToggleable({
				token: { ...mockValidErc4626Token, address: '0xNotSupported' },
				enabled: false
			});

			const supportedData: SwapSupportedTokensData = {
				icp: { coverage: 'none', supportedTokenIds: new Set() },
				evm: {
					coverage: 'all',
					supportedTokenIds: new Set(['0xsomeotheraddress'])
				},
				sol: { coverage: 'none', supportedTokenIds: new Set() },
				btc: { coverage: 'none', supportedTokenIds: new Set() }
			};

			const result = filterSwapTokens({ tokens: [token], supportedData });

			expect(result).not.toContain(token);
		});
	});

	describe('Bitcoin token identifier matching', () => {
		const btcActive = asToggleable({ token: BTC_MAINNET_TOKEN, enabled: true });
		const btcInactive = asToggleable({ token: BTC_MAINNET_TOKEN, enabled: false });

		const withBtcSupport = (supportedTokenIds: Set<string>): SwapSupportedTokensData => ({
			icp: { coverage: 'none', supportedTokenIds: new Set() },
			evm: { coverage: 'none', supportedTokenIds: new Set() },
			sol: { coverage: 'none', supportedTokenIds: new Set() },
			btc: { coverage: 'all', supportedTokenIds }
		});

		it('matches Bitcoin on its network-qualified native identifier', () => {
			const supportedData = withBtcSupport(new Set([btcIdentifier]));

			const result = filterSwapTokens({ tokens: [btcActive, btcInactive], supportedData });

			expect(result).toContain(btcActive);
			expect(result).toContain(btcInactive);
		});

		it('filters out an unsupported Bitcoin token when coverage is all', () => {
			const supportedData = withBtcSupport(new Set(['not-btc']));

			const result = filterSwapTokens({ tokens: [btcActive], supportedData });

			expect(result).not.toContain(btcActive);
		});
	});

	describe('unknown network tokens (nullish lookup)', () => {
		// Bitcoin is a swap category now, so the "no known category" case needs a standard
		// none of the lookup branches claim.
		const unknownToken = { ...BTC_MAINNET_TOKEN, standard: { code: 'erc721' as const } };

		const unknownActive = asToggleable({ token: unknownToken, enabled: true });
		const unknownInactive = asToggleable({ token: unknownToken, enabled: false });

		const supportedData: SwapSupportedTokensData = {
			icp: { coverage: 'all', supportedTokenIds: new Set() },
			evm: { coverage: 'all', supportedTokenIds: new Set() },
			sol: { coverage: 'all', supportedTokenIds: new Set() },
			btc: { coverage: 'all', supportedTokenIds: new Set() }
		};

		it('keeps active tokens that do not belong to a known swap network', () => {
			const result = filterSwapTokens({ tokens: [unknownActive], supportedData });

			expect(result).toContain(unknownActive);
		});

		it('filters out inactive tokens that do not belong to a known swap network', () => {
			const result = filterSwapTokens({ tokens: [unknownInactive], supportedData });

			expect(result).not.toContain(unknownInactive);
		});
	});
});

describe('computeReceiveSupportedTokens', () => {
	const icpSourceToken = mockValidIcToken;
	const icpSourceId = icpSourceToken.ledgerCanisterId;
	const icpOtherTokenId = 'uf2wh-taaaa-aaaaq-aabna-cai';

	const evmSourceToken = mockValidErc20Token;
	const evmSourceId = evmSourceToken.address.toLowerCase();
	const evmOtherTokenId = '0xotherevm';

	it('returns BLOCKED categories when no provider supports the source', () => {
		const providers: SwapProviderSupport[] = [
			{
				key: SwapProvider.KONG_SWAP,
				sourceCategory: 'icp',
				supportedSourceTokens: new Set(),
				getSupportedDestinations: () => undefined
			}
		];

		const data = computeReceiveSupportedTokens({ sourceToken: icpSourceToken, providers });

		expect(data.icp).toEqual({ coverage: 'all', supportedTokenIds: new Set() });
		expect(data.evm).toEqual({ coverage: 'all', supportedTokenIds: new Set() });
		expect(data.sol).toEqual({ coverage: 'all', supportedTokenIds: new Set() });
		expect(data.btc).toEqual({ coverage: 'all', supportedTokenIds: new Set() });
	});

	it('Chain Fusion ICP→BTC narrows Bitcoin destinations to the native identifier', () => {
		const providers: SwapProviderSupport[] = [
			{
				key: SwapProvider.CHAIN_FUSION,
				sourceCategory: 'icp',
				supportedSourceTokens: new Set([icpSourceId]),
				getSupportedDestinations: () => ({ btc: new Set([btcIdentifier]) })
			}
		];

		const data = computeReceiveSupportedTokens({ sourceToken: icpSourceToken, providers });

		expect(data.btc.coverage).toBe('all');
		expect(data.btc.supportedTokenIds).toEqual(new Set([btcIdentifier]));

		const enabledBtc = { ...BTC_MAINNET_TOKEN, enabled: true };

		expect(filterSwapTokens({ tokens: [enabledBtc], supportedData: data })).toHaveLength(1);
	});

	it('Chain Fusion BTC→ICP narrows ICP destinations to the ck ledger', () => {
		const providers: SwapProviderSupport[] = [
			{
				key: SwapProvider.CHAIN_FUSION,
				sourceCategory: 'btc',
				supportedSourceTokens: new Set([btcIdentifier]),
				getSupportedDestinations: () => ({ icp: new Set([icpSourceId]) })
			}
		];

		const data = computeReceiveSupportedTokens({ sourceToken: BTC_MAINNET_TOKEN, providers });

		expect(data.icp.coverage).toBe('all');
		expect(data.icp.supportedTokenIds).toEqual(new Set([icpSourceId]));
		// No provider offers a Bitcoin destination from a Bitcoin source.
		expect(data.btc).toEqual({ coverage: 'all', supportedTokenIds: new Set() });
	});

	it('symmetric ICP provider returns its supported set as ICP destinations', () => {
		const providers: SwapProviderSupport[] = [
			{
				key: SwapProvider.KONG_SWAP,
				sourceCategory: 'icp',
				supportedSourceTokens: new Set([icpSourceId, icpOtherTokenId]),
				getSupportedDestinations: ({ sourceToken, supportedSourceTokens }) =>
					supportedSourceTokens?.has((sourceToken as typeof icpSourceToken).ledgerCanisterId)
						? { icp: supportedSourceTokens }
						: undefined
			}
		];

		const data = computeReceiveSupportedTokens({ sourceToken: icpSourceToken, providers });

		expect(data.icp.coverage).toBe('all');
		expect(data.icp.supportedTokenIds).toEqual(new Set([icpSourceId, icpOtherTokenId]));
		expect(data.evm.coverage).toBe('all');
		expect(data.evm.supportedTokenIds.size).toBe(0);
	});

	it('OneSec ICP→EVM returns explicit EVM destinations from a directed pair', () => {
		const oneSecEvmAddresses = new Set([evmSourceId]);
		const providers: SwapProviderSupport[] = [
			{
				key: SwapProvider.ONE_SEC,
				sourceCategory: 'icp',
				supportedSourceTokens: new Set([icpSourceId]),
				getSupportedDestinations: () => ({ evm: oneSecEvmAddresses })
			}
		];

		const data = computeReceiveSupportedTokens({ sourceToken: icpSourceToken, providers });

		expect(data.evm.coverage).toBe('all');
		expect(data.evm.supportedTokenIds).toEqual(oneSecEvmAddresses);
		// no ICP supporter → blocked
		expect(data.icp).toEqual({ coverage: 'all', supportedTokenIds: new Set() });
	});

	it('mixes symmetric ICP supporters with OneSec EVM destinations', () => {
		const kongSet = new Set([icpSourceId, icpOtherTokenId]);
		const oneSecEvm = new Set(['0xceth', '0xcusdc']);

		const providers: SwapProviderSupport[] = [
			{
				key: SwapProvider.KONG_SWAP,
				sourceCategory: 'icp',
				supportedSourceTokens: kongSet,
				getSupportedDestinations: ({ sourceToken, supportedSourceTokens }) =>
					supportedSourceTokens?.has((sourceToken as typeof icpSourceToken).ledgerCanisterId)
						? { icp: supportedSourceTokens }
						: undefined
			},
			{
				key: SwapProvider.ICP_SWAP,
				sourceCategory: 'icp',
				supportedSourceTokens: new Set([icpSourceId]),
				getSupportedDestinations: ({ sourceToken, supportedSourceTokens }) =>
					supportedSourceTokens?.has((sourceToken as typeof icpSourceToken).ledgerCanisterId)
						? { icp: supportedSourceTokens }
						: undefined
			},
			{
				key: SwapProvider.ONE_SEC,
				sourceCategory: 'icp',
				supportedSourceTokens: new Set([icpSourceId]),
				getSupportedDestinations: () => ({ evm: oneSecEvm })
			}
		];

		const data = computeReceiveSupportedTokens({ sourceToken: icpSourceToken, providers });

		expect(data.icp.coverage).toBe('all');
		expect(data.icp.supportedTokenIds).toEqual(new Set([icpSourceId, icpOtherTokenId]));
		expect(data.evm.coverage).toBe('all');
		expect(data.evm.supportedTokenIds).toEqual(oneSecEvm);
	});

	it('Velora-style wildcard EVM provider yields coverage=none on EVM (enabled tokens pass)', () => {
		const providers: SwapProviderSupport[] = [
			{
				key: SwapProvider.VELORA,
				sourceCategory: 'evm',
				supportedSourceTokens: undefined,
				getSupportedDestinations: () => ({})
			}
		];

		const data = computeReceiveSupportedTokens({ sourceToken: evmSourceToken, providers });

		expect(data.evm.coverage).toBe('none');
		expect(data.evm.supportedTokenIds.size).toBe(0);

		// filterSwapTokens with coverage=none lets enabled tokens through
		const enabledToken = { ...evmSourceToken, enabled: true };
		const result = filterSwapTokens({ tokens: [enabledToken], supportedData: data });

		expect(result).toHaveLength(1);
	});

	it('OneSec EVM→ICP narrows ICP destinations to a single canister', () => {
		const providers: SwapProviderSupport[] = [
			{
				key: SwapProvider.VELORA,
				sourceCategory: 'evm',
				supportedSourceTokens: undefined,
				getSupportedDestinations: () => ({})
			},
			{
				key: SwapProvider.ONE_SEC,
				sourceCategory: 'evm',
				supportedSourceTokens: new Set([evmSourceId]),
				getSupportedDestinations: () => ({ icp: new Set([icpSourceId]) })
			}
		];

		const data = computeReceiveSupportedTokens({ sourceToken: evmSourceToken, providers });

		expect(data.icp.coverage).toBe('all');
		expect(data.icp.supportedTokenIds).toEqual(new Set([icpSourceId]));

		// EVM: Velora wildcard → coverage=none
		expect(data.evm.coverage).toBe('none');

		// Confirm: a different ICP token is filtered out as a destination
		const otherIcpToken = {
			...mockValidIcrcToken,
			ledgerCanisterId: icpOtherTokenId,
			enabled: true
		};
		const result = filterSwapTokens({
			tokens: [otherIcpToken],
			supportedData: data
		});

		expect(result).toHaveLength(0);
	});

	it('falls back to coverage=some when at least one provider lists destinations and another is wildcard', () => {
		const providers: SwapProviderSupport[] = [
			{
				key: SwapProvider.VELORA,
				sourceCategory: 'evm',
				supportedSourceTokens: undefined,
				getSupportedDestinations: () => ({})
			},
			{
				key: SwapProvider.NEAR_INTENTS,
				sourceCategory: 'evm',
				supportedSourceTokens: new Set([evmSourceId, evmOtherTokenId]),
				getSupportedDestinations: ({ sourceToken, supportedSourceTokens }) =>
					supportedSourceTokens?.has((sourceToken as typeof evmSourceToken).address.toLowerCase())
						? { evm: supportedSourceTokens }
						: undefined
			}
		];

		const data = computeReceiveSupportedTokens({ sourceToken: evmSourceToken, providers });

		expect(data.evm.coverage).toBe('some');
		expect(data.evm.supportedTokenIds).toEqual(new Set([evmSourceId, evmOtherTokenId]));
	});

	it('NEAR Intents EVM source exposes both EVM and SOL destinations', () => {
		const evmTokens = new Set([evmSourceId]);
		const solTokens = new Set([mockValidSplToken.address]);

		const providers: SwapProviderSupport[] = [
			{
				key: SwapProvider.NEAR_INTENTS,
				sourceCategory: 'evm',
				supportedSourceTokens: evmTokens,
				getSupportedDestinations: buildNearIntentsSupportedDestinations('evm')
			},
			{
				key: SwapProvider.NEAR_INTENTS,
				sourceCategory: 'sol',
				supportedSourceTokens: solTokens,
				getSupportedDestinations: buildNearIntentsSupportedDestinations('sol')
			}
		];

		const data = computeReceiveSupportedTokens({ sourceToken: evmSourceToken, providers });

		expect(data.evm.coverage).toBe('all');
		expect(data.evm.supportedTokenIds).toEqual(evmTokens);
		expect(data.sol.coverage).toBe('all');
		expect(data.sol.supportedTokenIds).toEqual(solTokens);
	});

	it('NEAR Intents SOL source exposes both EVM and SOL destinations', () => {
		const evmTokens = new Set([evmSourceId]);
		const solTokens = new Set([mockValidSplToken.address]);

		const providers: SwapProviderSupport[] = [
			{
				key: SwapProvider.NEAR_INTENTS,
				sourceCategory: 'evm',
				supportedSourceTokens: evmTokens,
				getSupportedDestinations: buildNearIntentsSupportedDestinations('evm')
			},
			{
				key: SwapProvider.NEAR_INTENTS,
				sourceCategory: 'sol',
				supportedSourceTokens: solTokens,
				getSupportedDestinations: buildNearIntentsSupportedDestinations('sol')
			}
		];

		const data = computeReceiveSupportedTokens({ sourceToken: mockValidSplToken, providers });

		expect(data.evm.coverage).toBe('all');
		expect(data.evm.supportedTokenIds).toEqual(evmTokens);
		expect(data.sol.coverage).toBe('all');
		expect(data.sol.supportedTokenIds).toEqual(solTokens);
	});

	it('NEAR Intents skips entries when source category does not match the entry', () => {
		// Only the EVM entry contributes; the SOL entry's getSupportedDestinations should return undefined
		// when the source is EVM (and vice versa), avoiding double-counting.
		const evmTokens = new Set([evmSourceId]);
		const solTokens = new Set([mockValidSplToken.address]);

		const providers: SwapProviderSupport[] = [
			{
				key: SwapProvider.NEAR_INTENTS,
				sourceCategory: 'evm',
				supportedSourceTokens: evmTokens,
				getSupportedDestinations: buildNearIntentsSupportedDestinations('evm')
			},
			{
				key: SwapProvider.NEAR_INTENTS,
				sourceCategory: 'sol',
				supportedSourceTokens: solTokens,
				getSupportedDestinations: buildNearIntentsSupportedDestinations('sol')
			}
		];

		// Both entries, EVM source: only the EVM entry contributes → withList=1 per category, coverage='all'
		const data = computeReceiveSupportedTokens({ sourceToken: evmSourceToken, providers });

		expect(data.evm.coverage).toBe('all');
		expect(data.sol.coverage).toBe('all');
	});
});

describe('nativeSwapTokenIdentifier', () => {
	it('distinguishes the same native symbol on different networks', () => {
		const identifiers = [ETHEREUM_TOKEN, BASE_ETH_TOKEN, ARBITRUM_ETH_TOKEN].map(
			({ network, symbol }) => nativeSwapTokenIdentifier({ networkId: network.id, symbol })
		);

		expect(new Set(identifiers).size).toBe(identifiers.length);
	});

	it('is case-insensitive on the symbol', () => {
		expect(
			nativeSwapTokenIdentifier({ networkId: ETHEREUM_NETWORK.id, symbol: 'ETH' })
		).toStrictEqual(nativeSwapTokenIdentifier({ networkId: ETHEREUM_NETWORK.id, symbol: 'eth' }));
	});
});

// Regression: selecting ckETH as the source used to widen the receive list to Base and
// Arbitrum ETH. All three natives carry the symbol 'ETH' and the `evm` identifier set has no
// network dimension, so Chain Fusion's Ethereum-mainnet-only offer matched the L2 tokens too —
// and the network filter, derived from the surviving tokens, grew from 1 EVM chip to 3.
// ckUSDT and every other ckERC20 were unaffected: a contract address already pins the network.
describe('a ck source does not reach its twin symbol on another EVM network', () => {
	const CKETH_PAIRS = toChainFusionPairs([
		{
			ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID,
			minterCanisterId: IC_CKETH_LEDGER_CANISTER_ID,
			twinToken: ETHEREUM_TOKEN
		}
	]);

	const ckEthToken = {
		...mockValidIcCkToken,
		ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID,
		twinToken: ETHEREUM_TOKEN
	};

	const providers: SwapProviderSupport[] = [
		{
			key: SwapProvider.CHAIN_FUSION,
			sourceCategory: 'icp',
			supportedSourceTokens: new Set([IC_CKETH_LEDGER_CANISTER_ID]),
			getSupportedDestinations: ({ sourceToken }) =>
				chainFusionCompatibleDestinations({ sourceToken, pairs: CKETH_PAIRS })
		}
	];

	const supportedData = computeReceiveSupportedTokens({ sourceToken: ckEthToken, providers });

	const enabledEthTokens = [ETHEREUM_TOKEN, BASE_ETH_TOKEN, ARBITRUM_ETH_TOKEN].map((token) => ({
		...token,
		enabled: true
	}));

	it('keeps only the Ethereum mainnet native token in the receive list', () => {
		const result = filterSwapTokens({ tokens: enabledEthTokens, supportedData });

		expect(result.map(({ id }) => id)).toStrictEqual([ETHEREUM_TOKEN.id]);
	});

	it('offers only the Ethereum network in the destination network filter', () => {
		const reachable = networksWithSupport({
			networks: [ETHEREUM_NETWORK, BASE_NETWORK, ARBITRUM_MAINNET_NETWORK],
			tokens: enabledEthTokens,
			supportedData
		});

		expect(reachable).toStrictEqual([ETHEREUM_NETWORK.id]);
	});
});
