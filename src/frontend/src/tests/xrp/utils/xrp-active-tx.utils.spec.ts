import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import { BTC_REGTEST_TOKEN } from '$env/tokens/tokens.btc.env';
import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import {
	mockLiquidiumActiveUserTransaction,
	mockXrpActiveUserTransaction,
	mockXrpData,
	mockXrpDestinationAddress,
	mockXrpLastLedgerSequence,
	mockXrpSourceAddress,
	mockXrpTxHash
} from '$tests/mocks/active-user-transactions.mock';
import { XrpNetworks } from '$xrp/types/network';
import { XRP_EXTERNAL_REF_KEYS } from '$xrp/types/xrp-active-tx';
import {
	isXrpActiveUserTransaction,
	openXrpActiveUserTransaction,
	toXrpData,
	toXrpDisplayRefs,
	toXrpExternalRefs,
	toXrpExternalRefsMap,
	xrpActiveUserTransactionNetwork,
	xrpActiveUserTransactionPollKeys,
	xrpActiveUserTransactionSourceAddress
} from '$xrp/utils/xrp-active-tx.utils';

describe('xrp-active-tx.utils', () => {
	const withRefs = (refs: { key: string; value: string }[]): ActiveUserTransaction => ({
		...mockXrpActiveUserTransaction,
		external_refs: refs
	});

	describe('isXrpActiveUserTransaction', () => {
		it('recognises an XRP record', () => {
			expect(isXrpActiveUserTransaction(mockXrpActiveUserTransaction)).toBeTruthy();
		});

		it('does not recognise another flow', () => {
			expect(isXrpActiveUserTransaction(mockLiquidiumActiveUserTransaction)).toBeFalsy();
		});
	});

	describe('toXrpData', () => {
		const params = {
			token: XRP_TOKEN,
			source: mockXrpSourceAddress,
			destination: mockXrpDestinationAddress,
			amount: 25_000_000n,
			fee: 12n
		};

		it('builds the variant from the signed values', () => {
			expect(toXrpData({ ...params, destinationTag: 12345 })).toEqual({
				Xrp: {
					token: { XrpNativeMainnet: null },
					source_address: mockXrpSourceAddress,
					destination_address: mockXrpDestinationAddress,
					destination_tag: [12345],
					amount: 25_000_000n,
					fee: 12n
				}
			});
		});

		// `0` is a real XRPL tag and an omitted tag is its absence. Collapsing one
		// into the other changes the payment, so the empty-vector encoding has to
		// mean exactly "no tag".
		it('encodes an absent tag as an empty option, and tag 0 as a present one', () => {
			expect(toXrpData(params)).toMatchObject({ Xrp: { destination_tag: [] } });
			expect(toXrpData({ ...params, destinationTag: 0 })).toMatchObject({
				Xrp: { destination_tag: [0] }
			});
		});

		// Not an error and not a silent pass: a token with no backend identity
		// cannot be recorded, and the caller turns that into a refusal. Bitcoin
		// regtest is the real such token — a local-development network with no
		// backend `TokenId` variant.
		it('returns undefined for a token with no backend identity', () => {
			expect(toXrpData({ ...params, token: BTC_REGTEST_TOKEN })).toBeUndefined();
		});
	});

	describe('toXrpExternalRefs / toXrpExternalRefsMap', () => {
		it('round-trips a keyed map', () => {
			const refs = {
				[XRP_EXTERNAL_REF_KEYS.TX_HASH]: mockXrpTxHash,
				[XRP_EXTERNAL_REF_KEYS.LAST_LEDGER_SEQUENCE]: '1020'
			};

			expect(toXrpExternalRefsMap(toXrpExternalRefs(refs))).toEqual(refs);
		});

		it('drops empty values and sorts deterministically', () => {
			expect(
				toXrpExternalRefs({
					[XRP_EXTERNAL_REF_KEYS.TX_HASH]: mockXrpTxHash,
					[XRP_EXTERNAL_REF_KEYS.TOKEN_SYMBOL]: '',
					[XRP_EXTERNAL_REF_KEYS.AMOUNT]: '25'
				})
			).toEqual([
				{ key: XRP_EXTERNAL_REF_KEYS.AMOUNT, value: '25' },
				{ key: XRP_EXTERNAL_REF_KEYS.TX_HASH, value: mockXrpTxHash }
			]);
		});
	});

	describe('toXrpDisplayRefs', () => {
		it('snapshots the symbol and network the row renders with', () => {
			expect(toXrpDisplayRefs({ token: XRP_TOKEN, amount: '25' })).toEqual({
				[XRP_EXTERNAL_REF_KEYS.AMOUNT]: '25',
				[XRP_EXTERNAL_REF_KEYS.TOKEN_SYMBOL]: XRP_TOKEN.symbol,
				[XRP_EXTERNAL_REF_KEYS.NETWORK_SYMBOL]: XRP_TOKEN.network.name
			});
		});
	});

	describe('xrpActiveUserTransactionSourceAddress', () => {
		it('reads the address the guard gates on', () => {
			expect(xrpActiveUserTransactionSourceAddress(mockXrpActiveUserTransaction)).toBe(
				mockXrpSourceAddress
			);
		});

		it('returns undefined for another flow', () => {
			expect(
				xrpActiveUserTransactionSourceAddress(mockLiquidiumActiveUserTransaction)
			).toBeUndefined();
		});
	});

	describe('xrpActiveUserTransactionNetwork', () => {
		it('resolves mainnet from the recorded token', () => {
			expect(xrpActiveUserTransactionNetwork(mockXrpActiveUserTransaction)).toBe(
				XrpNetworks.mainnet
			);
		});

		// Leaves the row unpolled rather than polled against a network it never
		// named — the backend rejects such a row, so this is defence in depth.
		it('returns undefined for a record whose token is not XRP', () => {
			expect(
				xrpActiveUserTransactionNetwork({
					...mockXrpActiveUserTransaction,
					data: { Xrp: { ...mockXrpData, token: { IcpNative: null } } }
				} as ActiveUserTransaction)
			).toBeUndefined();
		});

		it('returns undefined for another flow', () => {
			expect(xrpActiveUserTransactionNetwork(mockLiquidiumActiveUserTransaction)).toBeUndefined();
		});
	});

	describe('xrpActiveUserTransactionPollKeys', () => {
		it('reads the hash and the ledger the row was signed against', () => {
			expect(xrpActiveUserTransactionPollKeys(mockXrpActiveUserTransaction)).toEqual({
				hash: mockXrpTxHash,
				lastLedgerSequence: mockXrpLastLedgerSequence
			});
		});

		// Every one of these has to mean "not pollable", not "poll with a default":
		// expiry is decided by comparing the validated ledger index against this
		// number, so a coerced value decides it on something the row never said.
		it.each([
			['no refs at all', []],
			['no hash', [{ key: XRP_EXTERNAL_REF_KEYS.LAST_LEDGER_SEQUENCE, value: '1020' }]],
			['an empty hash', [{ key: XRP_EXTERNAL_REF_KEYS.TX_HASH, value: '' }]],
			['no ledger sequence', [{ key: XRP_EXTERNAL_REF_KEYS.TX_HASH, value: mockXrpTxHash }]],
			[
				'a non-numeric ledger sequence',
				[
					{ key: XRP_EXTERNAL_REF_KEYS.TX_HASH, value: mockXrpTxHash },
					{ key: XRP_EXTERNAL_REF_KEYS.LAST_LEDGER_SEQUENCE, value: 'soon' }
				]
			],
			[
				'a hex ledger sequence Number() would accept',
				[
					{ key: XRP_EXTERNAL_REF_KEYS.TX_HASH, value: mockXrpTxHash },
					{ key: XRP_EXTERNAL_REF_KEYS.LAST_LEDGER_SEQUENCE, value: '0x3fc' }
				]
			],
			[
				'a padded ledger sequence Number() would accept',
				[
					{ key: XRP_EXTERNAL_REF_KEYS.TX_HASH, value: mockXrpTxHash },
					{ key: XRP_EXTERNAL_REF_KEYS.LAST_LEDGER_SEQUENCE, value: '1020 ' }
				]
			],
			[
				'a zero ledger sequence',
				[
					{ key: XRP_EXTERNAL_REF_KEYS.TX_HASH, value: mockXrpTxHash },
					{ key: XRP_EXTERNAL_REF_KEYS.LAST_LEDGER_SEQUENCE, value: '0' }
				]
			],
			[
				'a ledger sequence beyond safe-integer range',
				[
					{ key: XRP_EXTERNAL_REF_KEYS.TX_HASH, value: mockXrpTxHash },
					{
						key: XRP_EXTERNAL_REF_KEYS.LAST_LEDGER_SEQUENCE,
						value: '90071992547409910'
					}
				]
			]
		])('is not pollable with %s', (...[, refs]) => {
			expect(xrpActiveUserTransactionPollKeys(withRefs(refs))).toBeUndefined();
		});
	});

	describe('openXrpActiveUserTransaction', () => {
		const terminal: ActiveUserTransaction = {
			...mockXrpActiveUserTransaction,
			status: { Succeeded: null }
		};
		const otherAddress: ActiveUserTransaction = {
			...mockXrpActiveUserTransaction,
			data: {
				Xrp: { ...mockXrpData, source_address: mockXrpDestinationAddress }
			}
		} as ActiveUserTransaction;

		it('finds the open record for the address', () => {
			expect(
				openXrpActiveUserTransaction({
					transactions: [mockXrpActiveUserTransaction],
					source: mockXrpSourceAddress
				})
			).toBe(mockXrpActiveUserTransaction);
		});

		it('ignores a terminal record', () => {
			expect(
				openXrpActiveUserTransaction({
					transactions: [terminal],
					source: mockXrpSourceAddress
				})
			).toBeUndefined();
		});

		// The invariant is per address: a record for another address says nothing
		// about this one's sequence, and refusing on it would block an unrelated
		// send.
		it('ignores a record for a different address', () => {
			expect(
				openXrpActiveUserTransaction({
					transactions: [otherAddress],
					source: mockXrpSourceAddress
				})
			).toBeUndefined();
		});

		it('ignores records from other flows', () => {
			expect(
				openXrpActiveUserTransaction({
					transactions: [mockLiquidiumActiveUserTransaction],
					source: mockXrpSourceAddress
				})
			).toBeUndefined();
		});
	});
});
