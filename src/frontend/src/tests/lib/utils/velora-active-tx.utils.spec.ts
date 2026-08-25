import type { ActiveUserTransactionRef } from '$declarations/backend/backend.did';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { BTC_REGTEST_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import type { Erc20Token } from '$eth/types/erc20';
import type { Erc4626Token } from '$eth/types/erc4626';
import en from '$lib/i18n/en.json';
import { SwapProvider, VeloraSwapTypes } from '$lib/types/swap';
import { VELORA_EXTERNAL_REF_KEYS } from '$lib/types/velora-swap';
import {
	buildVeloraSwapTrackingMetadata,
	isVeloraActiveUserTransaction,
	toVeloraData,
	toVeloraDeltaLearnedRefs,
	toVeloraDeltaStatus,
	toVeloraDisplayRefs,
	toVeloraExternalRefs,
	toVeloraExternalRefsMap,
	toVeloraMarketOutcome,
	veloraDeltaStatusError,
	veloraMarketOutcomeError,
	veloraMarketOutcomeToStatus,
	veloraSwapModeKey
} from '$lib/utils/velora-active-tx.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import {
	mockActiveUserTransaction,
	mockVeloraActiveUserTransaction
} from '$tests/mocks/active-user-transactions.mock';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';
import type { DeltaAuction, DeltaOrderStatus } from '@velora-dex/sdk';

const USDC_ETHEREUM = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ETHEREUM = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const makeErc20Token = (address: string): Erc20Token => ({
	...mockValidToken,
	id: parseTokenId(`Erc20-${address}`),
	standard: { code: 'erc20' },
	address,
	network: ETHEREUM_NETWORK
});

const makeErc4626Token = (address: string): Erc4626Token => ({
	...mockValidErc4626Token,
	id: parseTokenId(`Erc4626-${address}`),
	address,
	network: ETHEREUM_NETWORK
});

const auctionWithStatus = (status: DeltaOrderStatus): Pick<DeltaAuction, 'status'> => ({ status });

describe('velora-active-tx.utils', () => {
	describe('isVeloraActiveUserTransaction', () => {
		it('is true for a Velora row', () => {
			expect(isVeloraActiveUserTransaction(mockVeloraActiveUserTransaction)).toBeTruthy();
		});

		it('is false for another provider', () => {
			expect(isVeloraActiveUserTransaction(mockActiveUserTransaction)).toBeFalsy();
		});
	});

	describe('veloraSwapModeKey', () => {
		it('maps the stored mode onto the analytics swap type', () => {
			expect(veloraSwapModeKey({ Delta: null })).toBe(VeloraSwapTypes.DELTA);
			expect(veloraSwapModeKey({ Market: null })).toBe(VeloraSwapTypes.MARKET);
		});
	});

	describe('toVeloraData', () => {
		it('builds the variant for an ERC-20 pair', () => {
			expect(
				toVeloraData({
					mode: { Delta: null },
					sourceToken: makeErc20Token(USDC_ETHEREUM),
					destinationToken: makeErc20Token(USDT_ETHEREUM),
					amount: 5n
				})
			).toEqual({
				Velora: {
					mode: { Delta: null },
					source_token: { Erc20: [USDC_ETHEREUM, ETHEREUM_NETWORK.chainId] },
					dest_token: { Erc20: [USDT_ETHEREUM, ETHEREUM_NETWORK.chainId] },
					amount: 5n
				}
			});
		});

		it('builds the variant for an ERC-4626 vault token', () => {
			expect(
				toVeloraData({
					mode: { Market: null },
					sourceToken: makeErc4626Token(USDC_ETHEREUM),
					destinationToken: makeErc20Token(USDT_ETHEREUM),
					amount: 5n
				})
			).toEqual({
				Velora: {
					mode: { Market: null },
					source_token: { Erc4626: [USDC_ETHEREUM, ETHEREUM_NETWORK.chainId] },
					dest_token: { Erc20: [USDT_ETHEREUM, ETHEREUM_NETWORK.chainId] },
					amount: 5n
				}
			});
		});

		it('builds the variant for a native EVM source', () => {
			expect(
				toVeloraData({
					mode: { Market: null },
					sourceToken: ETHEREUM_TOKEN,
					destinationToken: makeErc20Token(USDT_ETHEREUM),
					amount: 5n
				})
			).toEqual({
				Velora: {
					mode: { Market: null },
					source_token: { EvmNative: ETHEREUM_NETWORK.chainId },
					dest_token: { Erc20: [USDT_ETHEREUM, ETHEREUM_NETWORK.chainId] },
					amount: 5n
				}
			});
		});

		it('returns undefined when a token cannot be mapped to a backend TokenId', () => {
			expect(
				toVeloraData({
					mode: { Delta: null },
					sourceToken: makeErc20Token(USDC_ETHEREUM),
					destinationToken: BTC_REGTEST_TOKEN,
					amount: 5n
				})
			).toBeUndefined();
		});
	});

	describe('external refs', () => {
		it('builds a deterministic sorted array and drops empties', () => {
			expect(
				toVeloraExternalRefs({
					[VELORA_EXTERNAL_REF_KEYS.TX_HASH]: '0xhash',
					[VELORA_EXTERNAL_REF_KEYS.CHAIN_ID]: '1',
					[VELORA_EXTERNAL_REF_KEYS.ORDER_HASH]: '',
					[VELORA_EXTERNAL_REF_KEYS.AUCTION_ID]: undefined
				})
			).toEqual([
				{ key: VELORA_EXTERNAL_REF_KEYS.CHAIN_ID, value: '1' },
				{ key: VELORA_EXTERNAL_REF_KEYS.TX_HASH, value: '0xhash' }
			]);
		});

		it('round-trips through the keyed map', () => {
			const refs: ActiveUserTransactionRef[] = [
				{ key: VELORA_EXTERNAL_REF_KEYS.AUCTION_ID, value: 'auction-1' },
				{ key: VELORA_EXTERNAL_REF_KEYS.TX_NONCE, value: '7' }
			];

			const map = toVeloraExternalRefsMap(refs);

			expect(map[VELORA_EXTERNAL_REF_KEYS.AUCTION_ID]).toBe('auction-1');
			expect(map[VELORA_EXTERNAL_REF_KEYS.TX_NONCE]).toBe('7');
			expect(map[VELORA_EXTERNAL_REF_KEYS.TX_HASH]).toBeUndefined();
		});

		it('snapshots the display fields', () => {
			expect(
				toVeloraDisplayRefs({
					sourceToken: makeErc20Token(USDC_ETHEREUM),
					destinationToken: makeErc20Token(USDT_ETHEREUM),
					amount: '1.5',
					usdSourceValue: '1.5015'
				})
			).toEqual({
				[VELORA_EXTERNAL_REF_KEYS.AMOUNT]: '1.5',
				[VELORA_EXTERNAL_REF_KEYS.USD_SOURCE_VALUE]: '1.5015',
				[VELORA_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL]: mockValidToken.symbol,
				[VELORA_EXTERNAL_REF_KEYS.SOURCE_NETWORK_SYMBOL]: ETHEREUM_NETWORK.name,
				[VELORA_EXTERNAL_REF_KEYS.DESTINATION_TOKEN_SYMBOL]: mockValidToken.symbol,
				[VELORA_EXTERNAL_REF_KEYS.DESTINATION_NETWORK_SYMBOL]: ETHEREUM_NETWORK.name
			});
		});

		it('omits the USD value when no exchange rate was available', () => {
			expect(
				toVeloraDisplayRefs({
					sourceToken: makeErc20Token(USDC_ETHEREUM),
					destinationToken: makeErc20Token(USDT_ETHEREUM),
					amount: '1.5'
				})
			).not.toHaveProperty(VELORA_EXTERNAL_REF_KEYS.USD_SOURCE_VALUE);
		});
	});

	describe('toVeloraDeltaLearnedRefs', () => {
		it('extracts the settlement and refund hashes', () => {
			expect(
				toVeloraDeltaLearnedRefs({
					transactions: [
						{
							originTx: '0xorigin',
							destinationTx: '0xdestination',
							filledPercent: 100,
							spentAmount: null,
							receivedAmount: null
						}
					],
					refunds: [{ tx: '0xrefund', chainId: 1, token: '0xtoken', amount: '1' }]
				})
			).toEqual({
				[VELORA_EXTERNAL_REF_KEYS.ORIGIN_TX_HASH]: '0xorigin',
				[VELORA_EXTERNAL_REF_KEYS.DEST_TX_HASH]: '0xdestination',
				[VELORA_EXTERNAL_REF_KEYS.REFUND_TX_HASH]: '0xrefund'
			});
		});

		it('omits a destination hash that has not landed yet', () => {
			expect(
				toVeloraDeltaLearnedRefs({
					transactions: [
						{
							originTx: '0xorigin',
							destinationTx: null,
							filledPercent: 50,
							spentAmount: null,
							receivedAmount: null
						}
					],
					refunds: []
				})
			).toEqual({ [VELORA_EXTERNAL_REF_KEYS.ORIGIN_TX_HASH]: '0xorigin' });
		});

		it('returns nothing when the order has revealed no hashes', () => {
			expect(toVeloraDeltaLearnedRefs({ transactions: [], refunds: [] })).toEqual({});
		});
	});

	describe('toVeloraDeltaStatus', () => {
		it.each<DeltaOrderStatus>(['PENDING', 'AWAITING_SIGNATURE', 'ACTIVE', 'BRIDGING'])(
			'maps the in-flight status %s to Executing',
			(status) => {
				expect(toVeloraDeltaStatus(auctionWithStatus(status))).toEqual({ Executing: null });
			}
		);

		// Neither SDK partition covers these, and both are recoverable — an early
		// Failed write could never be walked back.
		it.each<DeltaOrderStatus>(['SUSPENDED', 'CANCELLING'])(
			'does NOT treat %s as terminal',
			(status) => {
				expect(toVeloraDeltaStatus(auctionWithStatus(status))).toEqual({ Executing: null });
			}
		);

		// In the SDK's failed partition, but the refund has not landed yet:
		// terminalizing here would claim the swap "was refunded" early and stop the
		// poller before it can persist the refund hash.
		it('does NOT treat REFUNDING as terminal, despite the SDK failed partition', () => {
			expect(toVeloraDeltaStatus(auctionWithStatus('REFUNDING'))).toEqual({ Executing: null });
		});

		it('maps COMPLETED to Succeeded', () => {
			expect(toVeloraDeltaStatus(auctionWithStatus('COMPLETED'))).toEqual({ Succeeded: null });
		});

		it.each<DeltaOrderStatus>(['FAILED', 'EXPIRED', 'CANCELLED', 'REFUNDED'])(
			'maps the failed status %s to Failed',
			(status) => {
				expect(toVeloraDeltaStatus(auctionWithStatus(status))).toEqual({ Failed: null });
			}
		);

		it('returns undefined for an unrecognised status so the row is left untouched', () => {
			expect(
				toVeloraDeltaStatus(auctionWithStatus('SOMETHING_NEW' as DeltaOrderStatus))
			).toBeUndefined();
		});
	});

	describe('veloraDeltaStatusError', () => {
		it('reports REFUNDED as a refund', () => {
			expect(veloraDeltaStatusError('REFUNDED')).toBe(en.swap.error.swap_refunded);
		});

		// It never reaches a Failed write, so it never carries an error.
		it('has no error text for REFUNDING', () => {
			expect(veloraDeltaStatusError('REFUNDING')).toBeUndefined();
		});

		it.each<DeltaOrderStatus>(['FAILED', 'EXPIRED', 'CANCELLED'])(
			'reports %s as a generic failure',
			(status) => {
				expect(veloraDeltaStatusError(status)).toBe(en.swap.error.failed_unexpectedly);
			}
		);

		it('has no error text for a non-terminal status', () => {
			expect(veloraDeltaStatusError('ACTIVE')).toBeUndefined();
		});
	});

	describe('toVeloraMarketOutcome', () => {
		it('reads a mined, executed transaction as succeeded', () => {
			expect(toVeloraMarketOutcome({ receipt: { status: 1 }, txNonce: 5 })).toBe('succeeded');
		});

		it('reads a mined, reverted transaction as reverted', () => {
			expect(toVeloraMarketOutcome({ receipt: { status: 0 }, txNonce: 5 })).toBe('reverted');
		});

		it('reads an unexpected receipt shape as unknown', () => {
			expect(toVeloraMarketOutcome({ receipt: { status: null }, txNonce: 5 })).toBe('unknown');
		});

		it('reads a missing receipt with an unconsumed nonce as pending', () => {
			expect(toVeloraMarketOutcome({ receipt: null, confirmedNonce: 5, txNonce: 5 })).toBe(
				'pending'
			);
		});

		it('reads a missing receipt with a consumed nonce as replaced', () => {
			expect(toVeloraMarketOutcome({ receipt: null, confirmedNonce: 6, txNonce: 5 })).toBe(
				'replaced'
			);
		});

		it('stays pending when the confirmed nonce is unknown', () => {
			expect(toVeloraMarketOutcome({ receipt: null, txNonce: 5 })).toBe('pending');
		});
	});

	describe('veloraMarketOutcomeToStatus', () => {
		it('maps every outcome onto its AUT status', () => {
			expect(veloraMarketOutcomeToStatus('succeeded')).toEqual({ Succeeded: null });
			expect(veloraMarketOutcomeToStatus('reverted')).toEqual({ Failed: null });
			expect(veloraMarketOutcomeToStatus('replaced')).toEqual({ Failed: null });
			expect(veloraMarketOutcomeToStatus('pending')).toEqual({ Executing: null });
			expect(veloraMarketOutcomeToStatus('unknown')).toBeUndefined();
		});
	});

	describe('veloraMarketOutcomeError', () => {
		it('reports a reverted transaction as a generic failure', () => {
			expect(veloraMarketOutcomeError('reverted')).toBe(en.swap.error.failed_unexpectedly);
		});

		it('reports a replaced transaction with its own copy', () => {
			expect(veloraMarketOutcomeError('replaced')).toBe(en.swap.error.swap_replaced_or_dropped);
		});

		it('has no error text for a non-terminal outcome', () => {
			expect(veloraMarketOutcomeError('pending')).toBeUndefined();
		});
	});

	describe('buildVeloraSwapTrackingMetadata', () => {
		it('reads the snapshot off the row', () => {
			expect(
				buildVeloraSwapTrackingMetadata({ tx: mockVeloraActiveUserTransaction })
			).toStrictEqual({
				sourceToken: 'USDC',
				destinationToken: 'USDT',
				dApp: SwapProvider.VELORA,
				tokenAmount: '1',
				usdSourceValue: '1.0002',
				sourceNetwork: 'Ethereum',
				destinationNetwork: 'Ethereum',
				swapType: VeloraSwapTypes.DELTA
			});
		});

		it('passes the row error through', () => {
			expect(
				buildVeloraSwapTrackingMetadata({
					tx: { ...mockVeloraActiveUserTransaction, error: ['boom'] }
				})
			).toEqual(expect.objectContaining({ error: 'boom' }));
		});

		it('falls back to empty strings when the row carries no display refs', () => {
			expect(
				buildVeloraSwapTrackingMetadata({
					tx: { ...mockVeloraActiveUserTransaction, external_refs: [] }
				})
			).toStrictEqual({
				sourceToken: '',
				destinationToken: '',
				dApp: SwapProvider.VELORA,
				tokenAmount: '',
				usdSourceValue: '',
				sourceNetwork: '',
				destinationNetwork: '',
				swapType: VeloraSwapTypes.DELTA
			});
		});
	});
});
