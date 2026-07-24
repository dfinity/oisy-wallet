import { buildXrpPayment } from '$xrp/utils/xrp-transaction.utils';

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
});
