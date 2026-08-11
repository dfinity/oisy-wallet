import type { ActiveUserTransactionRef } from '$declarations/backend/backend.did';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import type { Erc20Token } from '$eth/types/erc20';
import en from '$lib/i18n/en.json';
import {
	NEAR_INTENTS_EXTERNAL_REF_KEYS,
	type NearIntentsSwapDetails,
	type NearIntentsSwapStatus
} from '$lib/types/near-intents';
import { SwapProvider } from '$lib/types/swap';
import {
	buildNearIntentsSwapTrackingMetadata,
	isNearIntentsActiveUserTransaction,
	nearIntentsStatusError,
	toNearIntentsActiveUserTransactionStatus,
	toNearIntentsData,
	toNearIntentsDisplayRefs,
	toNearIntentsExternalRefs,
	toNearIntentsExternalRefsMap,
	toNearIntentsLearnedRefs
} from '$lib/utils/near-intents-active-tx.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import type { SplToken } from '$sol/types/spl';
import {
	mockActiveUserTransaction,
	mockNearIntentsActiveUserTransaction
} from '$tests/mocks/active-user-transactions.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';
import { Principal } from '@icp-sdk/core/principal';

const USDC_ETHEREUM = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDC_SOLANA = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

const makeErc20Token = (address: string): Erc20Token => ({
	...mockValidToken,
	id: parseTokenId(`Erc20-${address}`),
	standard: { code: 'erc20' },
	address,
	network: ETHEREUM_NETWORK
});

const makeSplToken = (address: string): SplToken => ({
	...mockValidSplToken,
	id: parseTokenId(`Spl-${address}`),
	address
});

describe('near-intents-active-tx.utils', () => {
	describe('isNearIntentsActiveUserTransaction', () => {
		it('returns true for the NearIntents variant', () => {
			expect(isNearIntentsActiveUserTransaction(mockNearIntentsActiveUserTransaction)).toBeTruthy();
		});

		it('returns false for a non-NearIntents variant', () => {
			expect(isNearIntentsActiveUserTransaction(mockActiveUserTransaction)).toBeFalsy();
		});
	});

	describe('toNearIntentsData', () => {
		it('maps an ERC-20 source and an SPL destination', () => {
			expect(
				toNearIntentsData({
					sourceToken: makeErc20Token(USDC_ETHEREUM),
					destinationToken: makeSplToken(USDC_SOLANA),
					amount: 1_000_000n
				})
			).toEqual({
				NearIntents: {
					source_token: { Erc20: [USDC_ETHEREUM, BigInt(ETHEREUM_NETWORK.chainId)] },
					dest_token: { SplMainnet: USDC_SOLANA },
					amount: 1_000_000n
				}
			});
		});

		it('maps a native EVM source to EvmNative and a native SOL destination to SolNativeMainnet', () => {
			expect(
				toNearIntentsData({
					sourceToken: ETHEREUM_TOKEN,
					destinationToken: SOLANA_TOKEN,
					amount: 5n
				})
			).toEqual({
				NearIntents: {
					source_token: { EvmNative: BigInt(ETHEREUM_NETWORK.chainId) },
					dest_token: { SolNativeMainnet: null },
					amount: 5n
				}
			});
		});

		it('maps an ICP-side destination to its ICRC ledger', () => {
			expect(
				toNearIntentsData({
					sourceToken: makeErc20Token(USDC_ETHEREUM),
					destinationToken: mockValidIcToken,
					amount: 1n
				})
			).toEqual({
				NearIntents: {
					source_token: { Erc20: [USDC_ETHEREUM, ETHEREUM_NETWORK.chainId] },
					dest_token: { Icrc: Principal.fromText(mockValidIcToken.ledgerCanisterId) },
					amount: 1n
				}
			});
		});

		it('returns undefined when a token cannot be mapped to a backend TokenId', () => {
			expect(
				toNearIntentsData({
					sourceToken: makeErc20Token(USDC_ETHEREUM),
					destinationToken: BTC_MAINNET_TOKEN,
					amount: 1n
				})
			).toBeUndefined();
		});
	});

	describe('toNearIntentsExternalRefs', () => {
		it('returns a sorted list of populated key/value pairs', () => {
			const refs = toNearIntentsExternalRefs({
				[NEAR_INTENTS_EXTERNAL_REF_KEYS.DEPOSIT_MEMO]: 'memo',
				[NEAR_INTENTS_EXTERNAL_REF_KEYS.DEPOSIT_ADDRESS]: '0xdep'
			});

			expect(refs).toEqual([
				{ key: NEAR_INTENTS_EXTERNAL_REF_KEYS.DEPOSIT_ADDRESS, value: '0xdep' },
				{ key: NEAR_INTENTS_EXTERNAL_REF_KEYS.DEPOSIT_MEMO, value: 'memo' }
			]);
		});

		it('skips undefined or empty values', () => {
			const refs = toNearIntentsExternalRefs({
				[NEAR_INTENTS_EXTERNAL_REF_KEYS.DEPOSIT_ADDRESS]: '0xdep',
				[NEAR_INTENTS_EXTERNAL_REF_KEYS.DEPOSIT_MEMO]: '',
				[NEAR_INTENTS_EXTERNAL_REF_KEYS.ORIGIN_TX_HASH]: undefined
			});

			expect(refs).toEqual([
				{ key: NEAR_INTENTS_EXTERNAL_REF_KEYS.DEPOSIT_ADDRESS, value: '0xdep' }
			]);
		});
	});

	describe('toNearIntentsExternalRefsMap', () => {
		it('turns the wire array into a key/value lookup map', () => {
			const refs: ActiveUserTransactionRef[] = [
				{ key: NEAR_INTENTS_EXTERNAL_REF_KEYS.DEPOSIT_ADDRESS, value: '0xdep' },
				{ key: NEAR_INTENTS_EXTERNAL_REF_KEYS.AMOUNT, value: '0.5' }
			];

			const map = toNearIntentsExternalRefsMap(refs);

			expect(map[NEAR_INTENTS_EXTERNAL_REF_KEYS.DEPOSIT_ADDRESS]).toBe('0xdep');
			expect(map[NEAR_INTENTS_EXTERNAL_REF_KEYS.AMOUNT]).toBe('0.5');
			expect(map[NEAR_INTENTS_EXTERNAL_REF_KEYS.DEPOSIT_MEMO]).toBeUndefined();
		});
	});

	describe('toNearIntentsDisplayRefs', () => {
		it('snapshots source/destination symbols, network names and the raw amount', () => {
			const sourceToken = { ...mockValidToken, symbol: 'USDC' };
			const destinationToken = { ...SOLANA_TOKEN, symbol: 'SOL' };

			expect(toNearIntentsDisplayRefs({ sourceToken, destinationToken, amount: '1.5' })).toEqual({
				[NEAR_INTENTS_EXTERNAL_REF_KEYS.AMOUNT]: '1.5',
				[NEAR_INTENTS_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL]: 'USDC',
				[NEAR_INTENTS_EXTERNAL_REF_KEYS.SOURCE_NETWORK_SYMBOL]: sourceToken.network.name,
				[NEAR_INTENTS_EXTERNAL_REF_KEYS.DESTINATION_TOKEN_SYMBOL]: 'SOL',
				[NEAR_INTENTS_EXTERNAL_REF_KEYS.DESTINATION_NETWORK_SYMBOL]: destinationToken.network.name
			});
		});
	});

	describe('toNearIntentsLearnedRefs', () => {
		it('extracts origin and destination tx hashes when present', () => {
			const swapDetails: NearIntentsSwapDetails = {
				originChainTxHashes: [{ hash: '0xorigin', explorerUrl: 'https://e/0xorigin' }],
				destinationChainTxHashes: [{ hash: '0xdest', explorerUrl: 'https://e/0xdest' }]
			};

			expect(toNearIntentsLearnedRefs(swapDetails)).toEqual({
				[NEAR_INTENTS_EXTERNAL_REF_KEYS.ORIGIN_TX_HASH]: '0xorigin',
				[NEAR_INTENTS_EXTERNAL_REF_KEYS.DESTINATION_TX_HASH]: '0xdest'
			});
		});

		it('returns an empty object when no tx hashes are available', () => {
			expect(toNearIntentsLearnedRefs({})).toEqual({});
		});
	});

	describe('toNearIntentsActiveUserTransactionStatus', () => {
		it('maps SUCCESS → Succeeded', () => {
			expect(toNearIntentsActiveUserTransactionStatus('SUCCESS')).toEqual({ Succeeded: null });
		});

		it('maps REFUNDED and FAILED → Failed', () => {
			expect(toNearIntentsActiveUserTransactionStatus('REFUNDED')).toEqual({ Failed: null });
			expect(toNearIntentsActiveUserTransactionStatus('FAILED')).toEqual({ Failed: null });
		});

		it('maps every in-flight status → Executing (INCOMPLETE_DEPOSIT is NOT terminal)', () => {
			const inFlight: NearIntentsSwapStatus[] = [
				'PENDING_DEPOSIT',
				'KNOWN_DEPOSIT_TX',
				'INCOMPLETE_DEPOSIT',
				'PROCESSING'
			];

			for (const status of inFlight) {
				expect(toNearIntentsActiveUserTransactionStatus(status)).toEqual({ Executing: null });
			}
		});
	});

	describe('nearIntentsStatusError', () => {
		it('returns the refunded message for REFUNDED', () => {
			expect(nearIntentsStatusError('REFUNDED')).toBe(en.swap.error.swap_refunded);
		});

		it('returns the failed message for FAILED', () => {
			expect(nearIntentsStatusError('FAILED')).toBe(en.swap.error.failed_unexpectedly);
		});

		it('returns undefined for non-terminal statuses', () => {
			expect(nearIntentsStatusError('SUCCESS')).toBeUndefined();
			expect(nearIntentsStatusError('PROCESSING')).toBeUndefined();
		});
	});

	describe('buildNearIntentsSwapTrackingMetadata', () => {
		it('reads symbols, network names and amount off the row external_refs snapshot', () => {
			expect(
				buildNearIntentsSwapTrackingMetadata({
					tx: { ...mockNearIntentsActiveUserTransaction, status: { Succeeded: null } }
				})
			).toEqual({
				sourceToken: 'USDC',
				destinationToken: 'USDC',
				dApp: SwapProvider.NEAR_INTENTS,
				tokenAmount: '1',
				sourceNetwork: 'Ethereum',
				destinationNetwork: 'Solana'
			});
		});

		it('falls back to empty strings when the snapshot refs are missing', () => {
			expect(
				buildNearIntentsSwapTrackingMetadata({
					tx: { ...mockNearIntentsActiveUserTransaction, external_refs: [] }
				})
			).toEqual({
				sourceToken: '',
				destinationToken: '',
				dApp: SwapProvider.NEAR_INTENTS,
				tokenAmount: '',
				sourceNetwork: '',
				destinationNetwork: ''
			});
		});

		it('includes the error message verbatim when the row carries one', () => {
			expect(
				buildNearIntentsSwapTrackingMetadata({
					tx: {
						...mockNearIntentsActiveUserTransaction,
						status: { Failed: null },
						error: ['boom']
					}
				}).error
			).toBe('boom');
		});
	});
});
