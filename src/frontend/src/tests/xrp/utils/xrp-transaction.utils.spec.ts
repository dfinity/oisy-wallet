import {
	XRP_LAST_LEDGER_SEQUENCE_OFFSET,
	XRP_LEDGER_SEARCH_LOOKBACK
} from '$xrp/constants/xrp.constants';
import {
	buildXrpPayment,
	deriveXrpLedgerWindow,
	deriveXrpTransactionHash,
	isXrpSubmitFinalFailure,
	isXrpTransactionSuccessful
} from '$xrp/utils/xrp-transaction.utils';
import { encode } from 'ripple-binary-codec';

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
			expect(isXrpSubmitFinalFailure({ engineResult, accepted: false })).toBeFalsy();
		});

		// The complete code shape, not a `tem` prefix. `engine_result` is `z.string()` in the submit
		// schema, so these can arrive — and the decision is made AFTER the blob was broadcast, so
		// reading one as definitive reports a transaction that may still land as rejected, which is
		// what invites a second payment. Each has to be polled instead.
		it.each(['temporary', 'tem', 'temBAD_fee', 'tem BAD_FEE extra', 'temBAD_FEE ', ' temBAD_FEE'])(
			'does not reject the malformed %j',
			(engineResult) => {
				expect(isXrpSubmitFinalFailure({ engineResult, accepted: false })).toBeFalsy();
			}
		);

		// Every `tem` code the protocol defines still is final: checked against
		// `ripple-binary-codec`'s own list, which is where the pattern came from.
		it.each(['temBAD_SEND_XRP_LIMIT', 'temREDUNDANT', 'temINVALID_FLAG', 'temUNCERTAIN'])(
			'still rejects the real code %s',
			(engineResult) => {
				expect(isXrpSubmitFinalFailure({ engineResult, accepted: false })).toBeTruthy();
			}
		);

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
