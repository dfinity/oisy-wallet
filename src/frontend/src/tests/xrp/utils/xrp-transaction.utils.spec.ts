import {
	XRP_LAST_LEDGER_SEQUENCE_OFFSET,
	XRP_LEDGER_SEARCH_LOOKBACK,
	XRP_RIPPLE_EPOCH_OFFSET
} from '$xrp/constants/xrp.constants';
import type { XrpAccountTransaction, XrpAccountTransactionEntry } from '$xrp/types/xrp-transaction';
import {
	buildXrpPayment,
	deriveXrpLedgerWindow,
	deriveXrpTransactionHash,
	isXrpSubmitFinalFailure,
	isXrpTransactionSuccessful,
	mapXrpTransaction
} from '$xrp/utils/xrp-transaction.utils';
import { DEFAULT_DEFINITIONS, encode } from 'ripple-binary-codec';

describe('xrp-transaction.utils', () => {
	const base = {
		account: 'rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD',
		destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
		amount: 25_000_000n,
		fee: 12n,
		sequence: 1,
		signingPublicKey: 'ED01FA53FA5A7E77798F882ECE20B1ABC00BB358A9E55A202D0D0676BD0CE37A63'
	};

	describe('buildXrpPayment', () => {
		it('builds a native XRP Payment with drops serialized as strings', () => {
			expect(buildXrpPayment(base)).toEqual({
				TransactionType: 'Payment',
				Account: base.account,
				Destination: base.destination,
				Amount: '25000000',
				Fee: '12',
				Sequence: 1,
				SigningPubKey: base.signingPublicKey
			});
		});

		it('includes the destination tag when provided', () => {
			expect(buildXrpPayment({ ...base, destinationTag: 12345 }).DestinationTag).toBe(12345);
		});

		it('omits the destination tag when not provided', () => {
			expect('DestinationTag' in buildXrpPayment(base)).toBeFalsy();
		});

		it('keeps a zero destination tag (a distinct, valid tag)', () => {
			expect(buildXrpPayment({ ...base, destinationTag: 0 }).DestinationTag).toBe(0);
		});

		it('includes LastLedgerSequence when provided', () => {
			expect(buildXrpPayment({ ...base, lastLedgerSequence: 100 }).LastLedgerSequence).toBe(100);
		});
	});

	describe('mapXrpTransaction', () => {
		const wallet = 'rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD';
		const counterparty = 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe';

		const paymentEntry = ({
			tx,
			extra = {}
		}: {
			tx: Partial<XrpAccountTransaction>;
			extra?: Partial<XrpAccountTransactionEntry>;
		}): XrpAccountTransactionEntry => ({
			tx: { TransactionType: 'Payment', Account: counterparty, ...tx },
			meta: { TransactionResult: 'tesSUCCESS' },
			validated: true,
			...extra
		});

		it('maps an incoming payment as a receive without a fee', () => {
			const ui = mapXrpTransaction({
				transaction: paymentEntry({
					tx: {
						Account: counterparty,
						Destination: wallet,
						Amount: '5000000',
						Fee: '10',
						hash: 'H1',
						ledger_index: 42,
						date: 1
					}
				}),
				xrpAddress: wallet
			});

			expect(ui).toEqual({
				id: 'H1',
				type: 'receive',
				status: 'confirmed',
				value: 5_000_000n,
				from: counterparty,
				to: wallet,
				timestamp: BigInt(1 + XRP_RIPPLE_EPOCH_OFFSET),
				blockNumber: 42
			});
		});

		// The row itself, not just its fields. `[null]` satisfies the result schema — it requires an
		// array and says nothing about what is in it — and used to throw on the mapper's first
		// destructuring, taking the whole page with it.
		it.each([
			{ name: 'a null row', transaction: null },
			{ name: 'an undefined row', transaction: undefined },
			{ name: 'a string row', transaction: 'nonsense' },
			{ name: 'a number row', transaction: 42 },
			{ name: 'an array row', transaction: [] }
		])('skips $name rather than throwing', ({ transaction }) => {
			const mapped = () => mapXrpTransaction({ transaction, xrpAddress: wallet });

			expect(mapped).not.toThrow();
			expect(mapped()).toBeUndefined();
		});

		// `date`, `ledger_index` and `DestinationTag` are all XRPL UInt32s, and a bare `int()` admits
		// negatives as well as anything up to `Number.MAX_SAFE_INTEGER`.
		//
		// `date` is the loud one: it reaches the UI as a `Date` that is out of range, and
		// `toISOString` and `Intl.DateTimeFormat.format` both throw `RangeError: Invalid time value`
		// — in a render path, so one row takes the list and the CSV with it rather than just being
		// wrong itself. `DestinationTag` is quiet: nothing converts or formats it, it is rendered
		// as-is, so an impossible routing tag is shown as though the ledger reported it — and the
		// send path refuses that same value, `XRP_MAX_DESTINATION_TAG` being this same bound.
		it.each([
			{ name: 'an oversized date', tx: { date: Number.MAX_SAFE_INTEGER } },
			{ name: 'a negative date', tx: { date: -1 } },
			{ name: 'an oversized ledger_index', tx: { ledger_index: Number.MAX_SAFE_INTEGER } },
			{ name: 'an oversized DestinationTag', tx: { DestinationTag: Number.MAX_SAFE_INTEGER } },
			{
				name: 'a DestinationTag one past the UInt32 ceiling',
				tx: { DestinationTag: 0xffff_ffff + 1 }
			},
			{ name: 'a negative DestinationTag', tx: { DestinationTag: -1 } }
		])('skips a row with $name, outside the UInt32 range', ({ tx }) => {
			const mapped = mapXrpTransaction({
				transaction: {
					tx: {
						TransactionType: 'Payment',
						Account: counterparty,
						Destination: wallet,
						Amount: '5000000',
						hash: 'HU32',
						ledger_index: 42,
						date: 1,
						...tx
					},
					meta: { TransactionResult: 'tesSUCCESS' },
					validated: true
				},
				xrpAddress: wallet
			});

			expect(mapped).toBeUndefined();
		});

		// Both ends of the range are real tags, so the bound must not cost them: `0` is a tag rather
		// than an absent one, and so is the ceiling.
		it.each([0, 0xffff_ffff])('keeps the boundary DestinationTag %j', (DestinationTag) => {
			const mapped = mapXrpTransaction({
				transaction: {
					tx: {
						TransactionType: 'Payment',
						Account: counterparty,
						Destination: wallet,
						Amount: '5000000',
						hash: 'HTAG',
						ledger_index: 42,
						date: 1,
						DestinationTag
					},
					meta: { TransactionResult: 'tesSUCCESS' },
					validated: true
				},
				xrpAddress: wallet
			});

			expect(mapped?.destinationTag).toBe(DestinationTag);
		});

		// XRPL rejects a Payment without a destination, so a row claiming to be one and omitting it
		// is malformed. Left through with our own account as `Account`, it became a confirmed send
		// with no recipient.
		it('skips a Payment that names no destination', () => {
			const mapped = mapXrpTransaction({
				transaction: {
					tx: {
						TransactionType: 'Payment',
						Account: wallet,
						Amount: '5000000',
						Fee: '10',
						hash: 'HNODEST',
						ledger_index: 42,
						date: 1
					},
					meta: { TransactionResult: 'tesSUCCESS' },
					validated: true
				},
				xrpAddress: wallet
			});

			expect(mapped).toBeUndefined();
		});

		// Not just the fields that reach `BigInt`. These reach the store and the UI: an object `hash`
		// became the row id, and the scheduler keys its cache by it — `[object Object]`. Guarding
		// field by field kept missing whichever one had not been named yet, which is why the check
		// is now one parse.
		it.each([
			{ name: 'an object hash', tx: { hash: {} } },
			{ name: 'a numeric hash', tx: { hash: 42 } },
			{ name: 'an object Account', tx: { Account: {} } },
			{ name: 'an object Destination', tx: { Destination: {} } },
			{ name: 'a string DestinationTag', tx: { DestinationTag: '7' } },
			{ name: 'a fractional DestinationTag', tx: { DestinationTag: 1.5 } },
			{ name: 'a missing Account', tx: { Account: undefined } }
		])('skips a row with $name', ({ tx }) => {
			const mapped = () =>
				mapXrpTransaction({
					transaction: {
						tx: {
							TransactionType: 'Payment',
							Account: wallet,
							Destination: counterparty,
							Amount: '5000000',
							Fee: '10',
							hash: 'HOK',
							ledger_index: 42,
							date: 1,
							...tx
						},
						meta: { TransactionResult: 'tesSUCCESS' },
						validated: true
					},
					xrpAddress: wallet
				});

			expect(mapped).not.toThrow();
			expect(mapped()).toBeUndefined();
		});

		// Unbounded digit strings from an untrusted response reach `BigInt`, which is superlinear:
		// a million nines cost ~40ms to convert, per row, on a 10s poll. Bounded by `XrpDropsSchema`
		// the same row is skipped in under two. Nothing legitimate is lost — `XRP_MAX_DROPS` is
		// above the total supply, so no real payment carries more.
		it.each([
			{ name: 'Amount', tx: { Amount: '9'.repeat(1_000) } },
			{ name: 'Fee', tx: { Fee: '9'.repeat(1_000) } }
		])('skips a row whose $name exceeds the drops bound', ({ tx }) => {
			const mapped = mapXrpTransaction({
				transaction: {
					tx: {
						TransactionType: 'Payment',
						Account: counterparty,
						Destination: wallet,
						Amount: '5000000',
						Fee: '10',
						hash: 'HBIG',
						ledger_index: 42,
						date: 1,
						...tx
					},
					meta: { TransactionResult: 'tesSUCCESS' },
					validated: true
				},
				xrpAddress: wallet
			});

			expect(mapped).toBeUndefined();
		});

		// Zero padding is canonicalised before the bound is applied, so a padded-but-small amount
		// still maps and still converts to the value it names.
		it('maps a zero-padded amount to its canonical value', () => {
			const ui = mapXrpTransaction({
				transaction: {
					tx: {
						TransactionType: 'Payment',
						Account: counterparty,
						Destination: wallet,
						Amount: '0000005000000',
						hash: 'HPAD',
						ledger_index: 42,
						date: 1
					},
					meta: { TransactionResult: 'tesSUCCESS' },
					validated: true
				},
				xrpAddress: wallet
			});

			expect(ui?.value).toBe(5_000_000n);
		});

		// api_version 2 renames the container and moves the timestamp to the entry as an ISO string.
		// The rest of that shape was already modelled; the time was not, so a v2 row mapped with no
		// date at all and landed under "no date" with nothing saying why.
		it('takes the timestamp from close_time_iso on an api_version 2 row', () => {
			const ui = mapXrpTransaction({
				transaction: {
					tx_json: {
						TransactionType: 'Payment',
						Account: counterparty,
						Destination: wallet,
						Amount: '5000000'
					},
					meta: { TransactionResult: 'tesSUCCESS' },
					validated: true,
					hash: 'HV2',
					ledger_index: 90,
					close_time_iso: '2026-09-21T00:00:00Z'
				},
				xrpAddress: wallet
			});

			expect(ui?.id).toBe('HV2');
			expect(ui?.blockNumber).toBe(90);
			expect(ui?.timestamp).toBe(BigInt(Date.parse('2026-09-21T00:00:00Z') / 1000));
		});

		// Both shapes at once is not a thing a node sends, but if it did, the signed seconds win
		// over a rendered string.
		it('prefers tx.date over close_time_iso when both are present', () => {
			const ui = mapXrpTransaction({
				transaction: {
					tx: {
						TransactionType: 'Payment',
						Account: counterparty,
						Destination: wallet,
						Amount: '5000000',
						hash: 'HBOTH',
						date: 1
					},
					meta: { TransactionResult: 'tesSUCCESS' },
					validated: true,
					close_time_iso: '2026-09-21T00:00:00Z'
				},
				xrpAddress: wallet
			});

			expect(ui?.timestamp).toBe(BigInt(1 + XRP_RIPPLE_EPOCH_OFFSET));
		});

		// The time is the one presentational field here, so an unreadable one costs the date rather
		// than the payment.
		it('still maps a row whose close_time_iso cannot be parsed', () => {
			const ui = mapXrpTransaction({
				transaction: {
					tx_json: {
						TransactionType: 'Payment',
						Account: counterparty,
						Destination: wallet,
						Amount: '5000000'
					},
					meta: { TransactionResult: 'tesSUCCESS' },
					validated: true,
					hash: 'HBAD',
					close_time_iso: 'not a date'
				},
				xrpAddress: wallet
			});

			expect(ui?.id).toBe('HBAD');
			expect(ui?.timestamp).toBeUndefined();
		});

		// A node adding a field it does not document must not empty a history: unmodelled keys are
		// stripped, not rejected.
		it('still maps a row carrying fields the mapper does not model', () => {
			const ui = mapXrpTransaction({
				transaction: {
					tx: {
						TransactionType: 'Payment',
						Account: counterparty,
						Destination: wallet,
						Amount: '5000000',
						hash: 'HNEW',
						ledger_index: 42,
						date: 1,
						SomeFutureField: { nested: true }
					},
					meta: { TransactionResult: 'tesSUCCESS', AffectedNodes: [] },
					validated: true
				},
				xrpAddress: wallet
			});

			expect(ui?.id).toBe('HNEW');
			expect(ui?.type).toBe('receive');
		});

		// These reach `BigInt`, which throws rather than returning nothing, and the throw escapes the
		// `.map` that builds the page — so one unreadable row used to cost the whole history, on
		// every tick, since the same page is re-fetched and fails the same way.
		it.each([
			{ name: 'a non-numeric Fee', tx: { Fee: 'unavailable' } },
			{ name: 'a Fee that is not a string', tx: { Fee: 12 } },
			{ name: 'a non-numeric date', tx: { date: 'yesterday' } },
			{ name: 'a fractional date', tx: { date: 1.5 } },
			{ name: 'a non-numeric ledger_index', tx: { ledger_index: 'latest' } }
		])('skips a row with $name rather than throwing', ({ tx }) => {
			const mapped = () =>
				mapXrpTransaction({
					transaction: paymentEntry({
						tx: {
							Account: wallet,
							Destination: counterparty,
							Amount: '5000000',
							Fee: '10',
							hash: 'HBAD',
							ledger_index: 42,
							date: 1,
							...tx
						} as Partial<XrpAccountTransaction>
					}),
					xrpAddress: wallet
				});

			expect(mapped).not.toThrow();
			expect(mapped()).toBeUndefined();
		});

		// XRPL allows paying your own account — the standard cross-currency conversion. The wallet is
		// then `Account` and `Destination` at once, so `isReceive` is true while the wallet is still
		// the signer that paid the fee. Keyed on `!isReceive` the cost was dropped and export
		// understated what the account paid.
		it('keeps the fee on a payment to the wallet itself', () => {
			const ui = mapXrpTransaction({
				transaction: paymentEntry({
					tx: {
						Account: wallet,
						Destination: wallet,
						Amount: '5000000',
						Fee: '10',
						hash: 'HSELF',
						ledger_index: 77,
						date: 3
					}
				}),
				xrpAddress: wallet
			});

			expect(ui).toEqual({
				id: 'HSELF',
				// A round trip, not income: the amount comes straight back and only the fee leaves.
				// The export books it the same way, as a standalone round trip.
				type: 'send',
				status: 'confirmed',
				value: 5_000_000n,
				fee: 10n,
				from: wallet,
				to: wallet,
				timestamp: BigInt(3 + XRP_RIPPLE_EPOCH_OFFSET),
				blockNumber: 77
			});
		});

		// The XRP really did arrive, so the row stays — the issued-currency side simply is not XRP
		// and is not this history's business. The `SendMax` guard deliberately does not fire here:
		// it exists to stop a cross-currency amount being read as XRP *leaving* the wallet.
		it('keeps a self cross-currency conversion, with its fee', () => {
			const ui = mapXrpTransaction({
				transaction: paymentEntry({
					tx: {
						Account: wallet,
						Destination: wallet,
						Amount: '5000000',
						SendMax: { currency: 'USD', issuer: counterparty, value: '10' },
						Fee: '12',
						hash: 'HCONV',
						ledger_index: 78,
						date: 4
					}
				}),
				xrpAddress: wallet
			});

			expect(ui?.type).toBe('receive');
			expect(ui?.fee).toBe(12n);
			expect(ui?.value).toBe(5_000_000n);
		});

		it('maps an outgoing payment as a send carrying the fee', () => {
			const ui = mapXrpTransaction({
				transaction: paymentEntry({
					tx: {
						Account: wallet,
						Destination: counterparty,
						Amount: '5000000',
						Fee: '10',
						hash: 'H2'
					}
				}),
				xrpAddress: wallet
			});

			expect(ui?.type).toBe('send');
			expect(ui?.fee).toBe(10n);
		});

		it('uses the delivered amount for a partial payment', () => {
			const ui = mapXrpTransaction({
				transaction: paymentEntry({
					tx: { Account: counterparty, Destination: wallet, Amount: '5000000', hash: 'H3' },
					extra: { meta: { TransactionResult: 'tesSUCCESS', delivered_amount: '4000000' } }
				}),
				xrpAddress: wallet
			});

			expect(ui?.value).toBe(4_000_000n);
		});

		// `delivered_amount` is what the destination received. On a cross-currency payment the sender
		// funded it with something else, so it is not XRP that left this wallet.
		it('skips an outgoing payment funded by an issued currency', () => {
			const ui = mapXrpTransaction({
				transaction: paymentEntry({
					tx: {
						Account: wallet,
						Destination: counterparty,
						Amount: '5000000',
						SendMax: { currency: 'USD', issuer: counterparty, value: '10' },
						Fee: '10',
						hash: 'H-CROSS-CURRENCY'
					}
				}),
				xrpAddress: wallet
			});

			expect(ui).toBeUndefined();
		});

		// XRP-funded, so the payment really is ours to show.
		it('still maps an outgoing payment whose SendMax is drops', () => {
			const ui = mapXrpTransaction({
				transaction: paymentEntry({
					tx: {
						Account: wallet,
						Destination: counterparty,
						Amount: '5000000',
						SendMax: '5000010',
						Fee: '10',
						hash: 'H-XRP-SENDMAX'
					}
				}),
				xrpAddress: wallet
			});

			expect(ui?.type).toBe('send');
			expect(ui?.value).toBe(5_000_000n);
		});

		// The wallet is the destination: it genuinely received the XRP, whatever funded it.
		it('still maps an incoming cross-currency payment that delivered XRP', () => {
			const ui = mapXrpTransaction({
				transaction: paymentEntry({
					tx: {
						Account: counterparty,
						Destination: wallet,
						Amount: '5000000',
						SendMax: { currency: 'USD', issuer: counterparty, value: '10' },
						hash: 'H-CROSS-IN'
					}
				}),
				xrpAddress: wallet
			});

			expect(ui?.type).toBe('receive');
			expect(ui?.value).toBe(5_000_000n);
		});

		// `account_tx` returns everything that affected the account, so an entry between two other
		// parties can reach the mapper. Booking it as our send would show a stranger's amount.
		it('skips a payment the wallet neither sent nor received', () => {
			const ui = mapXrpTransaction({
				transaction: paymentEntry({
					tx: {
						Account: counterparty,
						Destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
						Amount: '5000000',
						Fee: '10',
						hash: 'H-THIRD-PARTY'
					}
				}),
				xrpAddress: wallet
			});

			expect(ui).toBeUndefined();
		});

		it('still maps a payment the wallet sent, with its fee', () => {
			const ui = mapXrpTransaction({
				transaction: paymentEntry({
					tx: {
						Account: wallet,
						Destination: counterparty,
						Amount: '5000000',
						Fee: '10',
						hash: 'H-OWN-SEND'
					}
				}),
				xrpAddress: wallet
			});

			expect(ui?.type).toBe('send');
			expect(ui?.fee).toBe(10n);
		});

		// Absence of a result is not evidence of success.
		it('skips a payment that carries no result metadata', () => {
			const ui = mapXrpTransaction({
				transaction: paymentEntry({
					tx: { Account: counterparty, Destination: wallet, Amount: '5000000', hash: 'H-NOMETA' },
					extra: { meta: undefined }
				}),
				xrpAddress: wallet
			});

			expect(ui).toBeUndefined();
		});

		// The scheduler caches by hash, and the hash does not change when the entry is validated —
		// so a row stored while pending would never be replaced by its settled form.
		it('skips a payment that is not validated yet', () => {
			const ui = mapXrpTransaction({
				transaction: paymentEntry({
					tx: { Account: counterparty, Destination: wallet, Amount: '5000000', hash: 'H-PENDING' },
					extra: { validated: false }
				}),
				xrpAddress: wallet
			});

			expect(ui).toBeUndefined();
		});

		// `validated` is optional on the entry, and `account_tx` searches validated ledgers anyway.
		// Requiring it to be exactly `true` would drop the whole history on a node that omits it.
		it('still maps a successful payment when the entry omits the validated flag', () => {
			const ui = mapXrpTransaction({
				transaction: paymentEntry({
					tx: { Account: counterparty, Destination: wallet, Amount: '5000000', hash: 'H-NOFLAG' },
					extra: { validated: undefined }
				}),
				xrpAddress: wallet
			});

			expect(ui?.status).toBe('confirmed');
			expect(ui?.value).toBe(5_000_000n);
		});

		// XRPL returns this sentinel when the delivered amount was never recorded. It is a string, so
		// it passed the old guard and reached `BigInt`, which throws — and the throw escapes the
		// scheduler's `.map`, failing the whole sync and resetting the wallet store.
		it('skips a payment whose delivered amount is unavailable', () => {
			const ui = mapXrpTransaction({
				transaction: paymentEntry({
					tx: {
						Account: counterparty,
						Destination: wallet,
						Amount: '5000000',
						hash: 'H-UNAVAILABLE'
					},
					extra: { meta: { TransactionResult: 'tesSUCCESS', delivered_amount: 'unavailable' } }
				}),
				xrpAddress: wallet
			});

			expect(ui).toBeUndefined();
		});

		it.each(['', '-1', '1.5', '0x10', '1e6'])(
			'skips a payment whose delivered amount is not unsigned drops: %s',
			(delivered_amount) => {
				const ui = mapXrpTransaction({
					transaction: paymentEntry({
						tx: { Account: counterparty, Destination: wallet, Amount: '5000000', hash: 'H-BAD' },
						extra: { meta: { TransactionResult: 'tesSUCCESS', delivered_amount } }
					}),
					xrpAddress: wallet
				});

				expect(ui).toBeUndefined();
			}
		);

		it('includes the destination tag when present', () => {
			const ui = mapXrpTransaction({
				transaction: paymentEntry({
					tx: {
						Account: wallet,
						Destination: counterparty,
						Amount: '1',
						hash: 'H4',
						DestinationTag: 12345
					}
				}),
				xrpAddress: wallet
			});

			expect(ui?.destinationTag).toBe(12345);
		});

		it('skips non-Payment transactions', () => {
			expect(
				mapXrpTransaction({
					transaction: {
						tx: { TransactionType: 'OfferCreate', Account: wallet, hash: 'H5' },
						validated: true
					},
					xrpAddress: wallet
				})
			).toBeUndefined();
		});

		it('skips issued-currency payments (non-native amount)', () => {
			expect(
				mapXrpTransaction({
					transaction: paymentEntry({
						tx: {
							Account: counterparty,
							Destination: wallet,
							Amount: { currency: 'USD', issuer: counterparty, value: '10' },
							hash: 'H6'
						}
					}),
					xrpAddress: wallet
				})
			).toBeUndefined();
		});

		it('skips failed transactions', () => {
			expect(
				mapXrpTransaction({
					transaction: paymentEntry({
						tx: { Account: wallet, Destination: counterparty, Amount: '1', hash: 'H7' },
						extra: { meta: { TransactionResult: 'tecUNFUNDED_PAYMENT' } }
					}),
					xrpAddress: wallet
				})
			).toBeUndefined();
		});

		it('reads tx_json and entry-level hash/ledger_index (api_version 2 shape)', () => {
			const ui = mapXrpTransaction({
				transaction: {
					tx_json: {
						TransactionType: 'Payment',
						Account: counterparty,
						Destination: wallet,
						Amount: '2'
					},
					meta: { TransactionResult: 'tesSUCCESS' },
					validated: true,
					hash: 'H8',
					ledger_index: 99
				},
				xrpAddress: wallet
			});

			expect(ui?.id).toBe('H8');
			expect(ui?.blockNumber).toBe(99);
		});
	});

	describe('isXrpSubmitFinalFailure', () => {
		// The id the blob derives to. Supplied on both sides by default so the existing cases keep
		// testing the engine result, and varied explicitly in the identity cases below.
		const ID = 'A'.repeat(64);

		// `txHash` is read with `in` rather than defaulted, so a case can state that the response
		// named NO transaction — which a default would silently turn back into a match.
		const finalFailure = (args: {
			engineResult: string;
			accepted?: boolean;
			txHash?: string;
			transactionId?: string;
		}) =>
			isXrpSubmitFinalFailure({
				submitResult: {
					engineResult: args.engineResult,
					accepted: args.accepted ?? false,
					txHash: 'txHash' in args ? args.txHash : ID
				},
				transactionId: args.transactionId ?? ID
			});

		// Malformed: the XRPL reference calls a `tem` result final, so this is the only class the
		// send may report as failed without consulting the ledger.
		it.each(['temBAD_FEE', 'temBAD_AMOUNT', 'temMALFORMED'])('rejects %s', (engineResult) => {
			expect(finalFailure({ engineResult, accepted: false })).toBeTruthy();
		});

		// `tef` may be reapplied, `tel` may be cached and retried, `tefALREADY` reports the blob is
		// already in the open ledger, `tefPAST_SEQ` reports its sequence consumed — which is what a
		// resubmitted send gets once the original landed — and `tec` WAS applied. None of them is a
		// failure to report here; the ledger decides by polling.
		it.each([
			'tesSUCCESS',
			'terQUEUED',
			'tecUNFUNDED_PAYMENT',
			'tefALREADY',
			'tefPAST_SEQ',
			'tefMAX_LEDGER',
			'telINSUF_FEE_P'
		])('does not reject %s', (engineResult) => {
			expect(finalFailure({ engineResult, accepted: false })).toBeFalsy();
		});

		// Membership, not a `tem`-shaped pattern. `engine_result` is `z.string()` in the submit
		// schema, so these can arrive — and the decision is made AFTER the blob was broadcast, so
		// reading one as definitive reports a transaction that may still land as rejected, which is
		// what invites a second payment. `temFAKE` is the one a pattern accepted: correctly shaped
		// and not a code the protocol defines.
		it.each([
			'temporary',
			'tem',
			'temBAD_fee',
			'tem BAD_FEE extra',
			'temBAD_FEE ',
			' temBAD_FEE',
			'temFAKE',
			'temNOT_A_REAL_CODE'
		])('does not reject the malformed %j', (engineResult) => {
			expect(finalFailure({ engineResult, accepted: false })).toBeFalsy();
		});

		// Every `tem` code the protocol defines still is final: checked against
		// `ripple-binary-codec`'s own list, which is where the pattern came from.
		it.each(['temBAD_SEND_XRP_LIMIT', 'temREDUNDANT', 'temINVALID_FLAG', 'temUNCERTAIN'])(
			'still rejects the real code %s',
			(engineResult) => {
				expect(finalFailure({ engineResult, accepted: false })).toBeTruthy();
			}
		);

		// A node's refusal to take the blob is not evidence that no ledger will include it, so
		// `accepted: false` must never turn a non-final result into a reported failure.
		it.each(['tesSUCCESS', 'tefPAST_SEQ', 'terQUEUED', 'tecUNFUNDED_PAYMENT'])(
			'does not reject %s whether or not it was accepted',
			(engineResult) => {
				expect(finalFailure({ engineResult, accepted: false })).toBeFalsy();
				expect(finalFailure({ engineResult, accepted: true })).toBeFalsy();
			}
		);

		// Not the mirror of the above. A `tem` transaction is one NO node can take, so a response
		// claiming both that it is malformed and that this node took it contradicts itself — and a
		// self-contradicting response is no basis for the only definitive failure declared after
		// the blob is broadcast. It falls through to the poll instead.
		it('does not reject a tem that the node claims to have accepted', () => {
			expect(finalFailure({ engineResult: 'temBAD_FEE', accepted: true })).toBeFalsy();
		});

		it('still rejects the same code when the node did not accept it', () => {
			expect(finalFailure({ engineResult: 'temBAD_FEE', accepted: false })).toBeTruthy();
		});

		// The response has to be about the blob we broadcast. Nothing else on the submit path ties
		// it to the transaction, and this is the only branch that reports a definitive failure after
		// the blob is on the wire — the report that tells a caller to rebuild, on a new sequence.
		it.each([
			{ name: 'names another transaction', txHash: 'B'.repeat(64) },
			{ name: 'names no transaction', txHash: undefined }
		])('does not reject a tem whose response $name', ({ txHash }) => {
			expect(finalFailure({ engineResult: 'temBAD_FEE', txHash })).toBeFalsy();
		});

		// Hex, so case is not significant — unlike the base58 addresses bound elsewhere.
		it('rejects a tem whose response names this transaction in the other case', () => {
			expect(finalFailure({ engineResult: 'temBAD_FEE', txHash: ID.toLowerCase() })).toBeTruthy();
		});

		// The set is generated from `ripple-binary-codec`'s `TRANSACTION_RESULTS` and written out by
		// hand, so this is what stops a typo or a drift from silently shrinking it.
		describe('the tem set matches the protocol', () => {
			// Filtered to the name direction: `DEFAULT_DEFINITIONS.transactionResult` is a
			// `BytesLookup` that stores names and ordinals in the same object so it can decode both
			// ways, and only the names are codes. That the name direction is an implementation
			// detail rather than a documented surface is why the source holds a written-out set and
			// this read lives in a test.
			const protocolResults = Object.keys(DEFAULT_DEFINITIONS.transactionResult).filter((code) =>
				/^[a-z]{3}[A-Z0-9_]*$/.test(code)
			);

			const protocolTem = protocolResults.filter((code) => code.startsWith('tem')).sort();

			it('treats every tem code the protocol defines as final', () => {
				const notFinal = protocolTem.filter(
					(engineResult) => !finalFailure({ engineResult, accepted: false })
				);

				expect(notFinal).toEqual([]);
			});

			// The other direction: nothing outside the `tem` class may be final, so a drift that pasted
			// a `tec` or `tef` code into the set fails here.
			it('treats no code from another class as final', () => {
				const wronglyFinal = protocolResults
					.filter((code) => !code.startsWith('tem'))
					.filter((engineResult) => finalFailure({ engineResult, accepted: false }));

				expect(wronglyFinal).toEqual([]);
			});

			it('is exactly as large as the protocol class', () => {
				expect(protocolTem).toHaveLength(51);
			});
		});
	});

	describe('isXrpTransactionSuccessful', () => {
		it('is true only for tesSUCCESS', () => {
			expect(isXrpTransactionSuccessful('tesSUCCESS')).toBeTruthy();
		});

		it.each(['tecUNFUNDED_PAYMENT', 'terQUEUED', undefined])('is false for %j', (result) => {
			expect(isXrpTransactionSuccessful(result)).toBeFalsy();
		});
	});

	describe('deriveXrpLedgerWindow', () => {
		const blobWith = (lastLedgerSequence?: number): string =>
			encode(buildXrpPayment({ ...base, lastLedgerSequence }));

		// The blob is what the ledger acts on, so the window has to come out of it rather than
		// travel beside it. A window that disagrees with the signed one makes the `tx` search miss
		// the ledger the payment is in, and confirmation reports a live transaction as expired.
		it('reads the window out of the signed blob', () => {
			expect(deriveXrpLedgerWindow(blobWith(1020))).toEqual({
				firstLedgerSequence: 1020 - XRP_LEDGER_SEARCH_LOOKBACK,
				lastLedgerSequence: 1020
			});
		});

		it('derives the lower bound from the signed expiry, not from any other source', () => {
			const { firstLedgerSequence, lastLedgerSequence } = deriveXrpLedgerWindow(blobWith(987_654));

			expect(lastLedgerSequence).toBe(987_654);
			expect(firstLedgerSequence).toBe(987_654 - XRP_LEDGER_SEARCH_LOOKBACK);
		});

		// The point of the separate constant. Only `LastLedgerSequence` is signed; the lower bound is
		// reconstructed, so deriving it from the SIGNING offset meant reducing that offset raised
		// `min_ledger` for blobs signed under the old one — a `searched_all` over a range that
		// excludes ledgers the payment can be in, which is a false absence and then a false expiry.
		it('searches from at or below the index a blob was signed against, whatever offset was used', () => {
			// A blob signed when the offset was larger than today's: its true signing index is
			// further below `LastLedgerSequence` than the current offset would suggest.
			const legacyOffset = XRP_LAST_LEDGER_SEQUENCE_OFFSET + 60;
			const signingIndex = 500_000;

			const { firstLedgerSequence } = deriveXrpLedgerWindow(blobWith(signingIndex + legacyOffset));

			expect(firstLedgerSequence).toBeLessThanOrEqual(signingIndex);
		});

		// Decoupled, not merely different: the search range must not move when the signing offset
		// does, which is the whole reason the two are separate constants.
		it('does not derive the lower bound from the signing offset', () => {
			const { firstLedgerSequence, lastLedgerSequence } = deriveXrpLedgerWindow(blobWith(1020));

			expect(lastLedgerSequence - firstLedgerSequence).not.toBe(XRP_LAST_LEDGER_SEQUENCE_OFFSET);
			expect(lastLedgerSequence - firstLedgerSequence).toBe(XRP_LEDGER_SEARCH_LOOKBACK);
		});

		// `tx` answers `excessiveLgrRange` above a 1000-ledger span, so a lookback that grows past
		// it would make every lookup fail — and an unanswerable lookup can never establish expiry.
		it('stays within the range the tx method accepts', () => {
			const { firstLedgerSequence, lastLedgerSequence } = deriveXrpLedgerWindow(blobWith(500_000));

			expect(lastLedgerSequence - firstLedgerSequence).toBeLessThanOrEqual(1000);
		});

		// The subtraction must not produce a negative `min_ledger`. Unreachable from a real ledger,
		// but the codec accepts any UInt32 as `LastLedgerSequence`.
		it('clamps the lower bound at zero for an index below the lookback', () => {
			expect(deriveXrpLedgerWindow(blobWith(5)).firstLedgerSequence).toBe(0);
		});

		// Refused rather than given an open-ended window: such a transaction can never expire, so
		// no retry for it could ever be called safe. `sendXrp` never signs one without it, so a blob
		// like this did not come from this code path.
		it('refuses a blob that carries no LastLedgerSequence', () => {
			expect(() => deriveXrpLedgerWindow(blobWith())).toThrow('carries no LastLedgerSequence');
		});
	});

	describe('deriveXrpTransactionHash', () => {
		// A known answer from the ledger itself, so this tests the formula rather than this
		// codebase's reading of it. Mainnet transaction
		// 01AB846C49D6A0C0AC6AF2D7A38D6751FAC8F173AB8CC61E4B4C9C0AD9AE800C, validated in ledger
		// 107047673, fetched with `{"method":"tx","params":[{"transaction":"01AB84…","binary":true}]}`
		// — the response's `tx` is the signed blob and `hash` is the id it is stored under.
		//
		// Without this, a wrong prefix, digest algorithm or digest half still produces deterministic
		// 64-char hex: confirmation would then poll an id no ledger contains and report a successful
		// payment as expired.
		const LEDGER_BLOB =
			'120007220001000024000000002A323FF526201B06616B0B20290533651164D408DB5ECB6CD00000000000000000000000000042544300000000000A20B3C85F482532A9578DBB3950B85CA06594D165D546C6C14FCBAD80524C555344000000000000000000000000000000E5E961C6A025C9404AA7B662DD1DF975BE75D13E68400000000000000A7321ED2639E0869A74D7F5FEC402C343FABB29BF58754926DFFDA2C1338F9CFF8C85F77440809E5DB6D61C548D6148CE420F0ACCB725679E3A1AAF03A152F0EE59CB1A2BDA8100A6F67B9F567D105636186E28E187FFBDD8F10D1085BB7C3CD617CFF6F2038114DBDCCEC12FA9F832CB83A099B28B39B00CBB0C11';
		const LEDGER_HASH = '01AB846C49D6A0C0AC6AF2D7A38D6751FAC8F173AB8CC61E4B4C9C0AD9AE800C';

		it('reproduces the id the ledger stored a real transaction under', async () => {
			await expect(deriveXrpTransactionHash(LEDGER_BLOB)).resolves.toBe(LEDGER_HASH);
		});

		// `Buffer.from(hex, 'hex')` truncates at the first non-hex character instead of rejecting, so
		// before this guard `1200ZZ`, `1200xyz` and `1200 00` all hashed the bytes of `1200` and
		// returned ONE identical id. A resubmission's blob comes from the caller, and a wrong id is
		// polled to a false expiry.
		it.each(['1200ZZ', '1200xyz', '1200 00', '1200-00', 'nonsense', '120', '', '0x1200'])(
			'refuses the malformed blob %j instead of truncating it',
			async (blob) => {
				await expect(deriveXrpTransactionHash(blob)).rejects.toThrow('not whole bytes of hex');
			}
		);

		// Lowercase hex is equally valid on the wire, and the id is canonically uppercase.
		it('accepts a lowercase blob and returns uppercase hex', async () => {
			await expect(deriveXrpTransactionHash(LEDGER_BLOB.toLowerCase())).resolves.toBe(LEDGER_HASH);
		});
	});
});
