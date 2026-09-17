import {
	buildXrpPayment,
	isXrpSubmitFinalFailure,
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

	describe('isXrpSubmitFinalFailure', () => {
		// Malformed: the XRPL reference calls a `tem` result final, so this is the only class the
		// send may report as failed without consulting the ledger.
		it.each(['temBAD_FEE', 'temBAD_AMOUNT', 'temMALFORMED'])('rejects %s', (engineResult) => {
			expect(isXrpSubmitFinalFailure({ engineResult, accepted: false })).toBeTruthy();
		});

		// `tef` may be reapplied, `tel` may be cached and retried, `tefALREADY` reports an earlier
		// submission already applied, and `tec` WAS applied — none of them is a failure to report
		// here. The ledger decides by polling.
		it.each([
			'tesSUCCESS',
			'terQUEUED',
			'tecUNFUNDED_PAYMENT',
			'tefALREADY',
			'tefPAST_SEQ',
			'tefMAX_LEDGER',
			'telINSUF_FEE_P'
		])('does not reject %s', (engineResult) => {
			expect(isXrpSubmitFinalFailure({ engineResult, accepted: false })).toBeFalsy();
		});

		// A node's refusal to take the blob is not evidence that no ledger will include it, so it
		// must not turn a non-final result into a reported failure.
		it('ignores the accepted flag', () => {
			expect(isXrpSubmitFinalFailure({ engineResult: 'tesSUCCESS', accepted: false })).toBe(
				isXrpSubmitFinalFailure({ engineResult: 'tesSUCCESS', accepted: true })
			);
			expect(isXrpSubmitFinalFailure({ engineResult: 'temBAD_FEE', accepted: true })).toBe(
				isXrpSubmitFinalFailure({ engineResult: 'temBAD_FEE', accepted: false })
			);
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
});
