import { XRP_RIPPLE_EPOCH_OFFSET } from '$xrp/constants/xrp.constants';
import type { XrpAccountTransaction, XrpAccountTransactionEntry } from '$xrp/types/xrp-transaction';
import {
	buildXrpPayment,
	isXrpSubmitAccepted,
	isXrpTransactionSuccessful,
	mapXrpTransaction
} from '$xrp/utils/xrp-transaction.utils';

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

	describe('isXrpSubmitAccepted', () => {
		// `tec` is included because the node APPLIED it: treating it as a rejection here would
		// report an applied transaction as never sent and skip the confirmation that knows which
		// `tec` it was. Whether the payment SUCCEEDED is decided by isXrpTransactionSuccessful.
		it.each(['tesSUCCESS', 'terQUEUED', 'tecUNFUNDED_PAYMENT'])(
			'accepts %s when the node reports acceptance',
			(engineResult) => {
				expect(isXrpSubmitAccepted({ engineResult, accepted: true })).toBeTruthy();
			}
		);

		// These were never applied, so they are deterministic rejections.
		it.each(['temBAD_FEE', 'tefPAST_SEQ', 'telINSUF_FEE_P'])(
			'rejects %s even when the node reports acceptance',
			(engineResult) => {
				expect(isXrpSubmitAccepted({ engineResult, accepted: true })).toBeFalsy();
			}
		);

		it.each(['tesSUCCESS', 'terQUEUED', 'tecUNFUNDED_PAYMENT'])(
			'rejects %s when the node did not accept it',
			(engineResult) => {
				expect(isXrpSubmitAccepted({ engineResult, accepted: false })).toBeFalsy();
			}
		);
	});

	describe('isXrpTransactionSuccessful', () => {
		it('is true only for tesSUCCESS', () => {
			expect(isXrpTransactionSuccessful('tesSUCCESS')).toBeTruthy();
		});

		it.each(['tecUNFUNDED_PAYMENT', 'terQUEUED', undefined])('is false for %j', (result) => {
			expect(isXrpTransactionSuccessful(result)).toBeFalsy();
		});
	});
});
