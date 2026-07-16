import type { ActiveUserTransactionRef } from '$declarations/backend/backend.did';
import { ARBITRUM_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import type { Erc20Token } from '$eth/types/erc20';
import type { IcToken } from '$icp/types/ic-token';
import { ZERO } from '$lib/constants/app.constants';
import en from '$lib/i18n/en.json';
import { ONESEC_EXTERNAL_REF_KEYS } from '$lib/types/onesec-swap';
import { SwapProvider } from '$lib/types/swap';
import {
	buildOneSecSwapTrackingMetadata,
	computeReceiveAmount,
	findMatchingOneSecTransfer,
	ICP_LEDGER_TO_TOKEN,
	isOneSecActiveUserTransaction,
	oneSecCompatibleDestinations,
	oneSecEvmSupportedTokens,
	oneSecIcpSupportedTokens,
	oneSecStatusError,
	toActiveUserTransactionStatus,
	toOneSecDisplayRefs,
	toOneSecEvmToIcpData,
	toOneSecExternalRefs,
	toOneSecExternalRefsMap,
	toOneSecIcpToEvmData
} from '$lib/utils/onesec-swap.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import {
	mockActiveUserTransaction,
	mockOneSecIcpToEvmData
} from '$tests/mocks/active-user-transactions.mock';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockPrincipal } from '$tests/mocks/identity.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';
import { Principal } from '@icp-sdk/core/principal';

// Real values from onesec-bridge DEFAULT_CONFIG
const USDC_LEDGER = '53nhb-haaaa-aaaar-qbn5q-cai';
const USDT_LEDGER = 'ij33n-oiaaa-aaaar-qbooa-cai';
const ICP_LEDGER = 'ryjl3-tyaaa-aaaaa-aaaba-cai';
const USDC_ETHEREUM = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDC_ARBITRUM = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const USDT_ETHEREUM = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const ICP_ETHEREUM = '0x00f3C42833C3170159af4E92dbb451Fb3F708917';

let mockEnabled = true;

vi.mock('$env/rest/onesec.env', () => ({
	get ONESEC_SWAP_ENABLED() {
		return mockEnabled;
	}
}));

const makeIcToken = (ledgerCanisterId: string): IcToken => ({
	...mockValidIcToken,
	ledgerCanisterId
});

const makeErc20Token = ({
	address,
	network = ETHEREUM_NETWORK
}: {
	address: string;
	network?: Erc20Token['network'];
}): Erc20Token => ({
	...mockValidToken,
	id: parseTokenId(`Erc20-${address}`),
	standard: { code: 'erc20' },
	address,
	network
});

describe('onesec-swap.utils', () => {
	beforeEach(() => {
		mockEnabled = true;
	});

	describe('ICP_LEDGER_TO_TOKEN', () => {
		it('contains entries for all tokens that have a ledger canister', () => {
			expect(ICP_LEDGER_TO_TOKEN[USDC_LEDGER]).toBeDefined();
			expect(ICP_LEDGER_TO_TOKEN[USDT_LEDGER]).toBeDefined();
			expect(ICP_LEDGER_TO_TOKEN[ICP_LEDGER]).toBeDefined();
		});

		it('maps ledger canister IDs to the correct token name', () => {
			expect(ICP_LEDGER_TO_TOKEN[USDC_LEDGER].token).toBe('USDC');
			expect(ICP_LEDGER_TO_TOKEN[USDT_LEDGER].token).toBe('USDT');
			expect(ICP_LEDGER_TO_TOKEN[ICP_LEDGER].token).toBe('ICP');
		});
	});

	describe('computeReceiveAmount', () => {
		it('subtracts transfer and protocol fees from amount', () => {
			// 1 USDC (6 decimals): 0.1% protocol fee + 1000 units transfer fee
			const result = computeReceiveAmount({
				amount: 1_000_000n,
				transferFeeInUnits: 1_000n,
				protocolFeeInPercent: 0.1,
				decimals: 6
			});

			// protocol fee = ceil(1.0 * 0.001 * 1e6) = 1000
			// total fee = 1000 + 1000 = 2000
			expect(result).toBe(998_000n);
		});

		it('returns ZERO when total fee exceeds amount', () => {
			const result = computeReceiveAmount({
				amount: 100n,
				transferFeeInUnits: 200n,
				protocolFeeInPercent: 0,
				decimals: 6
			});

			expect(result).toBe(ZERO);
		});

		it('returns full amount when all fees are zero', () => {
			const result = computeReceiveAmount({
				amount: 5_000_000n,
				transferFeeInUnits: ZERO,
				protocolFeeInPercent: 0,
				decimals: 6
			});

			expect(result).toBe(5_000_000n);
		});

		it('applies only transfer fee when protocol fee is zero', () => {
			const result = computeReceiveAmount({
				amount: 1_000_000n,
				transferFeeInUnits: 500n,
				protocolFeeInPercent: 0,
				decimals: 6
			});

			expect(result).toBe(999_500n);
		});

		it('applies only protocol fee when transfer fee is zero', () => {
			// 0.5% of 1_000_000 = 5000
			const result = computeReceiveAmount({
				amount: 1_000_000n,
				transferFeeInUnits: ZERO,
				protocolFeeInPercent: 0.5,
				decimals: 6
			});

			expect(result).toBe(995_000n);
		});

		it('returns ZERO rather than a negative when fee equals amount exactly', () => {
			const result = computeReceiveAmount({
				amount: 1_000n,
				transferFeeInUnits: 1_000n,
				protocolFeeInPercent: 0,
				decimals: 6
			});

			expect(result).toBe(ZERO);
		});
	});

	describe('oneSecIcpSupportedTokens', () => {
		it('returns a Set containing all known ICP ledger canister IDs', async () => {
			const result = await oneSecIcpSupportedTokens();

			expect(result).toContain(USDC_LEDGER);
			expect(result).toContain(USDT_LEDGER);
			expect(result).toContain(ICP_LEDGER);
		});

		it('contains no empty strings', async () => {
			const result = await oneSecIcpSupportedTokens();

			expect(result.has('')).toBeFalsy();
		});
	});

	describe('oneSecEvmSupportedTokens', () => {
		it('returns lowercased ERC20 addresses for Ethereum', async () => {
			const result = await oneSecEvmSupportedTokens({ networkIds: [ETHEREUM_NETWORK.id] });

			expect(result).toContain(USDC_ETHEREUM.toLowerCase());
			expect(result).toContain(USDT_ETHEREUM.toLowerCase());
		});

		it('returns Arbitrum-specific address for USDC on Arbitrum', async () => {
			const result = await oneSecEvmSupportedTokens({ networkIds: [ARBITRUM_MAINNET_NETWORK.id] });

			expect(result).toContain(USDC_ARBITRUM.toLowerCase());
			expect(result).not.toContain(USDC_ETHEREUM.toLowerCase());
		});

		it('returns Base-specific address for USDC on Base', async () => {
			const result = await oneSecEvmSupportedTokens({ networkIds: [BASE_NETWORK.id] });

			expect(result).toContain(USDC_BASE.toLowerCase());
			expect(result).not.toContain(USDC_ETHEREUM.toLowerCase());
		});

		it('unions addresses across multiple networks', async () => {
			const result = await oneSecEvmSupportedTokens({
				networkIds: [ETHEREUM_NETWORK.id, ARBITRUM_MAINNET_NETWORK.id, BASE_NETWORK.id]
			});

			expect(result).toContain(USDC_ETHEREUM.toLowerCase());
			expect(result).toContain(USDC_ARBITRUM.toLowerCase());
			expect(result).toContain(USDC_BASE.toLowerCase());
		});

		it('returns empty set for empty network list', async () => {
			const result = await oneSecEvmSupportedTokens({ networkIds: [] });

			expect(result.size).toBe(0);
		});

		it('stores addresses in lowercase', async () => {
			const result = await oneSecEvmSupportedTokens({ networkIds: [ETHEREUM_NETWORK.id] });
			for (const address of result) {
				expect(address).toBe(address.toLowerCase());
			}
		});
	});

	describe('oneSecCompatibleDestinations', () => {
		it('returns undefined when ONESEC_SWAP_ENABLED is false', () => {
			mockEnabled = false;
			const result = oneSecCompatibleDestinations({
				sourceToken: makeIcToken(USDC_LEDGER),
				networkIds: [ETHEREUM_NETWORK.id]
			});

			expect(result).toBeUndefined();
		});

		describe('ICP source token', () => {
			it('returns EVM addresses when source is a supported ICP token', () => {
				const result = oneSecCompatibleDestinations({
					sourceToken: makeIcToken(USDC_LEDGER),
					networkIds: [ETHEREUM_NETWORK.id]
				});

				expect(result?.evm).toBeDefined();
				expect(result?.evm).toContain(USDC_ETHEREUM.toLowerCase());
			});

			it('includes addresses for all requested networks', () => {
				const result = oneSecCompatibleDestinations({
					sourceToken: makeIcToken(USDC_LEDGER),
					networkIds: [ETHEREUM_NETWORK.id, ARBITRUM_MAINNET_NETWORK.id, BASE_NETWORK.id]
				});

				expect(result?.evm).toContain(USDC_ETHEREUM.toLowerCase());
				expect(result?.evm).toContain(USDC_ARBITRUM.toLowerCase());
				expect(result?.evm).toContain(USDC_BASE.toLowerCase());
			});

			it('returns undefined for a supported ICP token with no EVM address on the requested network', () => {
				// USDT only has erc20MainnetEthereum — no Arbitrum address, so Arbitrum lookup returns undefined
				const result = oneSecCompatibleDestinations({
					sourceToken: makeIcToken(USDT_LEDGER),
					networkIds: [ARBITRUM_MAINNET_NETWORK.id]
				});

				expect(result).toBeUndefined();
			});

			it('returns the ICP EVM address when source is ICP token on Ethereum', () => {
				const result = oneSecCompatibleDestinations({
					sourceToken: makeIcToken(ICP_LEDGER),
					networkIds: [ETHEREUM_NETWORK.id]
				});

				expect(result?.evm).toBeDefined();
				expect(result?.evm).toContain(ICP_ETHEREUM.toLowerCase());
			});

			it('returns undefined for an unknown ICP ledger canister', () => {
				const result = oneSecCompatibleDestinations({
					sourceToken: makeIcToken('unknown-canister-id'),
					networkIds: [ETHEREUM_NETWORK.id]
				});

				expect(result).toBeUndefined();
			});

			it('returns undefined when networkIds is empty', () => {
				const result = oneSecCompatibleDestinations({
					sourceToken: makeIcToken(USDC_LEDGER),
					networkIds: []
				});

				expect(result).toBeUndefined();
			});

			it('does not set evm key for icp or sol', () => {
				const result = oneSecCompatibleDestinations({
					sourceToken: makeIcToken(USDC_LEDGER),
					networkIds: [ETHEREUM_NETWORK.id]
				});

				expect(result?.icp).toBeUndefined();
				expect(result?.sol).toBeUndefined();
			});
		});

		describe('EVM source token', () => {
			it('returns the matching ICP ledger for a known EVM address', () => {
				const result = oneSecCompatibleDestinations({
					sourceToken: makeErc20Token({ address: USDC_ETHEREUM }),
					networkIds: [ETHEREUM_NETWORK.id]
				});

				expect(result?.icp).toBeDefined();
				expect(result?.icp).toContain(USDC_LEDGER);
				expect(result?.icp?.size).toBe(1);
			});

			it('is case-insensitive when matching the source EVM address', () => {
				const result = oneSecCompatibleDestinations({
					sourceToken: makeErc20Token({ address: USDC_ETHEREUM.toLowerCase() }),
					networkIds: [ETHEREUM_NETWORK.id]
				});

				expect(result?.icp).toContain(USDC_LEDGER);
			});

			it('returns empty icp set for an unknown EVM address', () => {
				const result = oneSecCompatibleDestinations({
					sourceToken: makeErc20Token({ address: '0x0000000000000000000000000000000000000001' }),
					networkIds: [ETHEREUM_NETWORK.id]
				});

				expect(result?.icp).toBeDefined();
				expect(result?.icp?.size).toBe(0);
			});

			it('returns empty icp set for USDT on Arbitrum (no Arbitrum address in OneSec config)', () => {
				const result = oneSecCompatibleDestinations({
					sourceToken: makeErc20Token({
						address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
						network: ARBITRUM_MAINNET_NETWORK
					}),
					networkIds: [ARBITRUM_MAINNET_NETWORK.id]
				});

				expect(result?.icp).toBeDefined();
				expect(result?.icp?.size).toBe(0);
			});

			it('does not set evm or sol keys for EVM source', () => {
				const result = oneSecCompatibleDestinations({
					sourceToken: makeErc20Token({ address: USDC_ETHEREUM }),
					networkIds: [ETHEREUM_NETWORK.id]
				});

				expect(result?.evm).toBeUndefined();
				expect(result?.sol).toBeUndefined();
			});
		});
	});

	describe('isOneSecActiveUserTransaction', () => {
		it('returns true for OneSec variants', () => {
			expect(
				isOneSecActiveUserTransaction({
					...mockActiveUserTransaction,
					status: { Pending: null }
				})
			).toBeTruthy();
		});
	});

	describe('toActiveUserTransactionStatus', () => {
		it('maps Succeeded → Succeeded', () => {
			expect(toActiveUserTransactionStatus({ Succeeded: null })).toEqual({ Succeeded: null });
		});

		it('maps Failed → Failed', () => {
			expect(toActiveUserTransactionStatus({ Failed: { error: 'x' } })).toEqual({ Failed: null });
		});

		it('maps Refunded → Failed (terminal: the source tokens were returned)', () => {
			expect(toActiveUserTransactionStatus({ Refunded: {} })).toEqual({ Failed: null });
		});

		it('maps PendingSourceTx / PendingDestinationTx / PendingRefundTx → Executing', () => {
			expect(toActiveUserTransactionStatus({ PendingSourceTx: null })).toEqual({
				Executing: null
			});
			expect(toActiveUserTransactionStatus({ PendingDestinationTx: null })).toEqual({
				Executing: null
			});
			expect(toActiveUserTransactionStatus({ PendingRefundTx: null })).toEqual({
				Executing: null
			});
		});
	});

	describe('oneSecStatusError', () => {
		it('returns the message for Failed', () => {
			expect(oneSecStatusError({ Failed: { error: 'reverted' } })).toBe('reverted');
		});

		it('returns the i18n swap_refunded message for Refunded', () => {
			expect(oneSecStatusError({ Refunded: {} })).toBe(en.swap.error.swap_refunded);
		});

		it('returns undefined for non-terminal statuses', () => {
			expect(oneSecStatusError({ Succeeded: null })).toBeUndefined();
			expect(oneSecStatusError({ PendingSourceTx: null })).toBeUndefined();
		});
	});

	describe('findMatchingOneSecTransfer', () => {
		const sourceAmount = mockOneSecIcpToEvmData.amount;

		it('matches an ICP→EVM row to a transfer with source.chain === ICP and equal amount', () => {
			const match = findMatchingOneSecTransfer({
				transfers: [
					{
						source: { chain: 'ICP', amount: sourceAmount },
						destination: { chain: 'Ethereum', amount: sourceAmount },
						status: { Succeeded: null }
					}
				],
				data: { OneSecIcpToEvm: mockOneSecIcpToEvmData }
			});

			expect(match).toBeDefined();
		});

		it('does not match if amounts differ', () => {
			const match = findMatchingOneSecTransfer({
				transfers: [
					{
						source: { chain: 'ICP', amount: sourceAmount + 1n },
						destination: { chain: 'Ethereum', amount: sourceAmount },
						status: { Succeeded: null }
					}
				],
				data: { OneSecIcpToEvm: mockOneSecIcpToEvmData }
			});

			expect(match).toBeUndefined();
		});

		it('does not match if the direction differs', () => {
			const match = findMatchingOneSecTransfer({
				transfers: [
					{
						source: { chain: 'Ethereum', amount: sourceAmount },
						destination: { chain: 'ICP', amount: sourceAmount },
						status: { Succeeded: null }
					}
				],
				data: { OneSecIcpToEvm: mockOneSecIcpToEvmData }
			});

			expect(match).toBeUndefined();
		});
	});

	describe('toOneSecIcpToEvmData', () => {
		it('maps ledger canister id to the Icrc variant and chain id to Erc20', () => {
			const data = toOneSecIcpToEvmData({
				sourceToken: makeIcToken(USDC_LEDGER),
				destinationToken: makeErc20Token({ address: USDC_ETHEREUM }),
				amount: 10n,
				recipientEvmAddress: mockEthAddress
			});

			expect(data).toEqual({
				OneSecIcpToEvm: {
					source_token: { Icrc: Principal.fromText(USDC_LEDGER) },
					dest_token: {
						Erc20: [USDC_ETHEREUM, BigInt(ETHEREUM_NETWORK.chainId)]
					},
					amount: 10n,
					recipient_evm_address: mockEthAddress
				}
			});
		});
	});

	describe('toOneSecEvmToIcpData', () => {
		it('maps recipient principal and chain id correctly', () => {
			const data = toOneSecEvmToIcpData({
				sourceToken: makeErc20Token({ address: USDC_ETHEREUM }),
				destinationToken: makeIcToken(USDC_LEDGER),
				amount: 5n,
				recipientPrincipal: mockPrincipal
			});

			expect(data).toEqual({
				OneSecEvmToIcp: {
					source_token: {
						Erc20: [USDC_ETHEREUM, BigInt(ETHEREUM_NETWORK.chainId)]
					},
					dest_token: { Icrc: Principal.fromText(USDC_LEDGER) },
					amount: 5n,
					recipient_principal: mockPrincipal
				}
			});
		});
	});

	describe('toOneSecExternalRefs', () => {
		it('returns a sorted list of populated key/value pairs', () => {
			const refs = toOneSecExternalRefs({
				[ONESEC_EXTERNAL_REF_KEYS.TRANSFER_ID]: '42',
				[ONESEC_EXTERNAL_REF_KEYS.FORWARDING_ADDRESS]: '0xfwd'
			});

			expect(refs).toEqual([
				{ key: ONESEC_EXTERNAL_REF_KEYS.FORWARDING_ADDRESS, value: '0xfwd' },
				{ key: ONESEC_EXTERNAL_REF_KEYS.TRANSFER_ID, value: '42' }
			]);
		});

		it('skips undefined or empty values', () => {
			const refs = toOneSecExternalRefs({
				[ONESEC_EXTERNAL_REF_KEYS.TRANSFER_ID]: '42',
				[ONESEC_EXTERNAL_REF_KEYS.FORWARDING_ADDRESS]: '',
				[ONESEC_EXTERNAL_REF_KEYS.BASELINE_TRANSFER_ID]: undefined
			});

			expect(refs).toEqual([{ key: ONESEC_EXTERNAL_REF_KEYS.TRANSFER_ID, value: '42' }]);
		});

		it('returns an empty array when nothing is set', () => {
			expect(toOneSecExternalRefs({})).toEqual([]);
		});
	});

	describe('toOneSecDisplayRefs', () => {
		it('snapshots source/destination symbols, network names and the raw amount', () => {
			const sourceToken = { ...mockValidIcToken, symbol: 'ckBTC' };
			const destinationToken = { ...mockValidErc20Token, symbol: 'USDC' };

			expect(toOneSecDisplayRefs({ sourceToken, destinationToken, amount: '0.5' })).toEqual({
				[ONESEC_EXTERNAL_REF_KEYS.AMOUNT]: '0.5',
				[ONESEC_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL]: 'ckBTC',
				[ONESEC_EXTERNAL_REF_KEYS.SOURCE_NETWORK_SYMBOL]: sourceToken.network.name,
				[ONESEC_EXTERNAL_REF_KEYS.DESTINATION_TOKEN_SYMBOL]: 'USDC',
				[ONESEC_EXTERNAL_REF_KEYS.DESTINATION_NETWORK_SYMBOL]: destinationToken.network.name
			});
		});
	});

	describe('toOneSecExternalRefsMap', () => {
		it('turns the wire array into a key/value lookup map', () => {
			const refs: ActiveUserTransactionRef[] = [
				{ key: ONESEC_EXTERNAL_REF_KEYS.AMOUNT, value: '0.5' },
				{ key: ONESEC_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL, value: 'ckBTC' }
			];

			const map = toOneSecExternalRefsMap(refs);

			expect(map[ONESEC_EXTERNAL_REF_KEYS.AMOUNT]).toBe('0.5');
			expect(map[ONESEC_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL]).toBe('ckBTC');
			expect(map[ONESEC_EXTERNAL_REF_KEYS.DESTINATION_TOKEN_SYMBOL]).toBeUndefined();
		});

		it('returns an empty map for an empty array', () => {
			expect(toOneSecExternalRefsMap([])).toEqual({});
		});

		it('preserves unknown keys (refs written by a different provider or older FE)', () => {
			const map = toOneSecExternalRefsMap([
				{ key: 'unknown_key', value: 'whatever' }
			] as ActiveUserTransactionRef[]);

			expect((map as Record<string, string>).unknown_key).toBe('whatever');
		});
	});

	describe('buildOneSecSwapTrackingMetadata', () => {
		const txWithRefs = ({
			refs,
			overrides = {}
		}: {
			refs: ActiveUserTransactionRef[];
			overrides?: Partial<typeof mockActiveUserTransaction>;
		}): typeof mockActiveUserTransaction => ({
			...mockActiveUserTransaction,
			status: { Succeeded: null },
			external_refs: refs,
			...overrides
		});

		it('reads symbols, network names and amount off the row external_refs snapshot', () => {
			const tx = txWithRefs({
				refs: [
					{ key: ONESEC_EXTERNAL_REF_KEYS.AMOUNT, value: '0.5' },
					{ key: ONESEC_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL, value: 'ckBTC' },
					{ key: ONESEC_EXTERNAL_REF_KEYS.SOURCE_NETWORK_SYMBOL, value: 'Internet Computer' },
					{ key: ONESEC_EXTERNAL_REF_KEYS.DESTINATION_TOKEN_SYMBOL, value: 'USDC' },
					{ key: ONESEC_EXTERNAL_REF_KEYS.DESTINATION_NETWORK_SYMBOL, value: 'Ethereum' }
				]
			});

			expect(buildOneSecSwapTrackingMetadata({ tx })).toEqual({
				sourceToken: 'ckBTC',
				destinationToken: 'USDC',
				dApp: SwapProvider.ONE_SEC,
				tokenAmount: '0.5',
				sourceNetwork: 'Internet Computer',
				destinationNetwork: 'Ethereum'
			});
		});

		it('falls back to empty strings when the snapshot refs are missing (legacy rows)', () => {
			expect(buildOneSecSwapTrackingMetadata({ tx: txWithRefs({ refs: [] }) })).toEqual({
				sourceToken: '',
				destinationToken: '',
				dApp: SwapProvider.ONE_SEC,
				tokenAmount: '',
				sourceNetwork: '',
				destinationNetwork: ''
			});
		});

		it('includes the error message verbatim when the row carries one', () => {
			const tx = txWithRefs({ refs: [], overrides: { status: { Failed: null }, error: ['boom'] } });

			expect(buildOneSecSwapTrackingMetadata({ tx }).error).toBe('boom');
		});

		it('omits the error field when the row has no error', () => {
			expect(buildOneSecSwapTrackingMetadata({ tx: txWithRefs({ refs: [] }) })).not.toHaveProperty(
				'error'
			);
		});
	});
});
