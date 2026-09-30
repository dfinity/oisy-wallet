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
	buildXrpSendTrackingMetadata,
	isXrpActiveUserTransaction,
	isXrpAlreadyInFlightError,
	openXrpActiveUserTransaction,
	toXrpData,
	toXrpDisplayRefs,
	toXrpExternalRefs,
	toXrpExternalRefsMap,
	xrpActiveUserTransactionDisplay,
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

	describe('isXrpAlreadyInFlightError', () => {
		it('recognises the backend refusal', () => {
			expect(isXrpAlreadyInFlightError({ AlreadyInFlight: null })).toBeTruthy();
		});

		// Everything else the create can fail with has to keep reading as "could not be
		// recorded" — telling the user to wait for a payment that does not exist would
		// be worse than the generic message.
		it.each([
			[{ TooManyActiveTransactions: null }],
			[{ AlreadyExists: null }],
			[{ InvalidData: 'token must be a native XRP token' }],
			[new Error('network down')],
			[undefined],
			[null],
			['AlreadyInFlight']
		])('does not recognise %o', (err) => {
			expect(isXrpAlreadyInFlightError(err)).toBeFalsy();
		});
	});

	// A row written by another client may carry only the two poll refs the backend requires. Each
	// reader of the snapshot has to fall back to what the backend does guarantee, field by field.
	const rowKeepingRefs = ({
		keep,
		extra = []
	}: {
		keep: string[];
		extra?: { key: string; value: string }[];
	}) => ({
		...mockXrpActiveUserTransaction,
		data: { Xrp: { ...mockXrpData, amount: 1_234_567n } },
		external_refs: [
			...mockXrpActiveUserTransaction.external_refs.filter(({ key }) => keep.includes(key)),
			...extra
		]
	});

	const POLL_KEYS = [XRP_EXTERNAL_REF_KEYS.TX_HASH, XRP_EXTERNAL_REF_KEYS.LAST_LEDGER_SEQUENCE];

	describe('xrpActiveUserTransactionDisplay', () => {
		// The snapshot wins where it exists: here it says 25 while the row's drops say 1.234567.
		it('reads the display snapshot when the row carries one', () => {
			expect(
				xrpActiveUserTransactionDisplay({
					...mockXrpActiveUserTransaction,
					data: { Xrp: { ...mockXrpData, amount: 1_234_567n } }
				})
			).toEqual({ amount: '25', symbol: 'XRP', network: 'XRP Ledger' });
		});

		it("falls back to the row's own data when the snapshot is missing", () => {
			expect(xrpActiveUserTransactionDisplay(rowKeepingRefs({ keep: POLL_KEYS }))).toEqual({
				amount: '1.234567',
				symbol: XRP_TOKEN.symbol,
				network: XRP_TOKEN.network.name
			});
		});

		// Field by field, not all or nothing: a snapshot value is kept even when its neighbours are
		// missing, and each missing one is filled on its own.
		it('fills only the fields the snapshot lacks', () => {
			expect(
				xrpActiveUserTransactionDisplay(
					rowKeepingRefs({
						keep: POLL_KEYS,
						extra: [{ key: XRP_EXTERNAL_REF_KEYS.NETWORK_SYMBOL, value: 'Snapshot Ledger' }]
					})
				)
			).toEqual({ amount: '1.234567', symbol: XRP_TOKEN.symbol, network: 'Snapshot Ledger' });
		});

		// The backend bounds a ref value's length, not its content, so another client can store a
		// blank one. `??` alone would take it as present and render "Send" over a blank network line.
		it.each(['', '   ', '\t\n'])('treats a blank snapshot value (%j) as absent', (blank) => {
			expect(
				xrpActiveUserTransactionDisplay(
					rowKeepingRefs({
						keep: POLL_KEYS,
						extra: [
							{ key: XRP_EXTERNAL_REF_KEYS.AMOUNT, value: blank },
							{ key: XRP_EXTERNAL_REF_KEYS.TOKEN_SYMBOL, value: blank },
							{ key: XRP_EXTERNAL_REF_KEYS.NETWORK_SYMBOL, value: blank }
						]
					})
				)
			).toEqual({ amount: '1.234567', symbol: XRP_TOKEN.symbol, network: XRP_TOKEN.network.name });
		});

		it('trims a snapshot value it keeps', () => {
			expect(
				xrpActiveUserTransactionDisplay(
					rowKeepingRefs({
						keep: POLL_KEYS,
						extra: [{ key: XRP_EXTERNAL_REF_KEYS.NETWORK_SYMBOL, value: '  Snapshot Ledger ' }]
					})
				)?.network
			).toBe('Snapshot Ledger');
		});

		it('is undefined for a row that is not an XRP payment', () => {
			expect(xrpActiveUserTransactionDisplay(mockLiquidiumActiveUserTransaction)).toBeUndefined();
		});
	});

	describe('buildXrpSendTrackingMetadata', () => {
		// The wizard fires the same error event with the network's id, so the id it is here too —
		// the display name would split every grouping by `network` in two.
		it('reports the network as the send wizard does, by id', () => {
			expect(buildXrpSendTrackingMetadata({ tx: mockXrpActiveUserTransaction }).network).toBe(
				'XRP'
			);
		});

		it('reports the snapshot, the fee and no error for an open row', () => {
			expect(buildXrpSendTrackingMetadata({ tx: mockXrpActiveUserTransaction })).toEqual({
				token: 'XRP',
				network: `${XRP_TOKEN.network.id.description}`,
				tokenAmount: '25',
				fee: '12'
			});
		});

		it("reports the row's own data when the snapshot is missing", () => {
			expect(buildXrpSendTrackingMetadata({ tx: rowKeepingRefs({ keep: POLL_KEYS }) })).toEqual({
				token: XRP_TOKEN.symbol,
				network: `${XRP_TOKEN.network.id.description}`,
				tokenAmount: '1.234567',
				fee: '12'
			});
		});

		it('carries the recorded failure text', () => {
			expect(
				buildXrpSendTrackingMetadata({
					tx: { ...mockXrpActiveUserTransaction, status: { Failed: null }, error: ['boom'] }
				})
			).toEqual(expect.objectContaining({ error: 'boom' }));
		});
	});
});
