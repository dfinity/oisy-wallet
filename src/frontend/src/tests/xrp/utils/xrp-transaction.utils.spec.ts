import {
	buildXrpPayment,
	isXrpSubmitAccepted,
	isXrpTransactionSuccessful
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
		it.each(['temBAD_FEE', 'tefPAST_SEQ', 'tefMAX_LEDGER', 'telINSUF_FEE_P'])(
			'rejects %s even when the node reports acceptance',
			(engineResult) => {
				expect(isXrpSubmitAccepted({ engineResult, accepted: true })).toBeFalsy();
			}
		);

		// An earlier submission of the exact blob applied, so this must be confirmed rather than
		// rejected — and the `accepted: false` that comes with a `tef` response must not veto it.
		it('accepts tefALREADY even though the node did not accept this submission', () => {
			expect(isXrpSubmitAccepted({ engineResult: 'tefALREADY', accepted: false })).toBeTruthy();
		});

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
