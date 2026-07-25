import { XRP_RIPPLE_EPOCH_OFFSET } from '$xrp/constants/xrp.constants';
import type { XrpAccountTransaction, XrpAccountTransactionEntry } from '$xrp/types/xrp-transaction';
import { buildXrpPayment, mapXrpTransaction } from '$xrp/utils/xrp-transaction.utils';

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
});
