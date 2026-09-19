import {
	XrpDropsSchema,
	XrpLedgerCounterSchema,
	XrplAccountInfoFullResultSchema,
	XrplAccountInfoResultSchema,
	XrplEnvelopeSchema,
	XrplLedgerCurrentResultSchema,
	XrplLedgerResultSchema,
	XrplSubmitResultSchema,
	XrplTxResultSchema
} from '$xrp/schema/xrpl-rpc.schema';

describe('xrpl-rpc.schema', () => {
	describe('XrpDropsSchema', () => {
		it('should validate unsigned decimal drop strings', () => {
			['0', '1', '25000000'].forEach((drops) => {
				const result = XrpDropsSchema.safeParse(drops);

				expect(result.success).toBeTruthy();
				expect(result.data).toEqual(drops);
			});
		});

		// `BigInt` alone would accept every one of these and hand back a plausible balance.
		it('should fail validation for signed, hexadecimal, fractional and numeric forms', () => {
			[1, '-1', '0x10', '1.5', '1e3', '', ' 1'].forEach((drops) => {
				expect(XrpDropsSchema.safeParse(drops).success).toBeFalsy();
			});
		});
	});

	describe('XrplAccountInfoResultSchema', () => {
		it('should validate a funded account result', () => {
			const result = XrplAccountInfoResultSchema.safeParse({
				account_data: { Balance: '25000000' }
			});

			expect(result.success).toBeTruthy();
			expect(result.data).toEqual({ account_data: { Balance: '25000000' } });
		});

		it('should validate an error result', () => {
			const result = XrplAccountInfoResultSchema.safeParse({ error: 'actNotFound' });

			expect(result.success).toBeTruthy();
			expect(result.data).toEqual({ error: 'actNotFound' });
		});

		// The union branches must be mutually exclusive. Zod strips unknown keys and returns the
		// first branch that parses, so an ambiguous response would otherwise validate as a balance
		// with the error discarded.
		it('should fail validation for a result carrying both account_data and an error', () => {
			expect(
				XrplAccountInfoResultSchema.safeParse({
					account_data: { Balance: '1' },
					error: 'actNotFound'
				}).success
			).toBeFalsy();
		});

		it('should fail validation for a result with neither account_data nor an error', () => {
			expect(XrplAccountInfoResultSchema.safeParse({}).success).toBeFalsy();
		});
	});

	// The envelope `xrpJsonRpc` owns. A body without a `result` object used to reach the helpers as
	// `undefined`, where dereferencing `result.error` gave a TypeError instead of their own message.
	describe('XrplEnvelopeSchema', () => {
		it('should validate a body carrying a result object', () => {
			expect(XrplEnvelopeSchema.safeParse({ result: { anything: 1 } }).success).toBeTruthy();
		});

		it.each([{}, { result: null }, { result: 'nope' }, { jsonrpc: '2.0', error: 'gateway' }])(
			'should fail validation for the body %j',
			(body) => {
				expect(XrplEnvelopeSchema.safeParse(body).success).toBeFalsy();
			}
		);
	});

	// Zod strips unknown keys, so without forbidding `error` a failed response that also carried a
	// plausible result would parse and the error would be silently dropped. The consequence differs
	// per schema but is worst for the validated index: a bogus one past `LastLedgerSequence` makes
	// confirmation declare expiry and tell the user a resend is safe.
	describe('XrplAccountInfoFullResultSchema', () => {
		const accountData = {
			Account: 'rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD',
			Balance: '30000000',
			Sequence: 42,
			OwnerCount: 3,
			Flags: 131_072
		};

		it('parses account data alone', () => {
			expect(
				XrplAccountInfoFullResultSchema.safeParse({ account_data: accountData }).success
			).toBeTruthy();
		});

		// Required, so the caller's comparison against the address it asked for cannot be skipped by
		// a response that simply omits the field. An AccountRoot always carries it.
		it.each([undefined, null, 42, {}])('rejects account data with an Account of %j', (Account) => {
			expect(
				XrplAccountInfoFullResultSchema.safeParse({
					account_data: { ...accountData, Account }
				}).success
			).toBeFalsy();
		});

		// `Flags` is mandatory on an AccountRoot, so an omission is a malformed response rather than
		// an account with unknown flags. Read as unknown it became "no destination tag required",
		// which is the one reading of it that lets a payment through to `tecDST_TAG_NEEDED`.
		it('rejects account data without Flags', () => {
			const { Flags: _Flags, ...withoutFlags } = accountData;

			expect(
				XrplAccountInfoFullResultSchema.safeParse({ account_data: withoutFlags }).success
			).toBeFalsy();
		});

		// Zero is the value an account with nothing set actually reports, and it must stay a
		// positive answer rather than being conflated with the omission above.
		it('accepts zero flags', () => {
			expect(
				XrplAccountInfoFullResultSchema.safeParse({
					account_data: { ...accountData, Flags: 0 }
				}).success
			).toBeTruthy();
		});

		// The branch that lets the caller decide absence after parsing rather than before it.
		it('parses a lone actNotFound', () => {
			expect(
				XrplAccountInfoFullResultSchema.safeParse({ error: 'actNotFound' }).success
			).toBeTruthy();
		});

		// `xrpJsonRpc` throws every other error before this schema runs, so a branch for one would
		// describe a case that cannot arrive — and accepting it here would let it be mistaken for
		// the "owns nothing" answer.
		it.each(['tooBusy', 'noNetwork'])('rejects the operational failure %s', (error) => {
			expect(XrplAccountInfoFullResultSchema.safeParse({ error }).success).toBeFalsy();
		});

		it('rejects actNotFound alongside account data', () => {
			expect(
				XrplAccountInfoFullResultSchema.safeParse({
					error: 'actNotFound',
					account_data: accountData
				}).success
			).toBeFalsy();
		});
	});

	describe('XrpLedgerCounterSchema', () => {
		// `Sequence`, `OwnerCount`, `Flags` and a ledger index are all protocol `UInt32`, so nothing
		// above this can be a real value. Zod's `.int()` alone stops at `Number.MAX_SAFE_INTEGER`,
		// two million times further out — and the value that matters most is the validated ledger
		// index, where an out-of-range one past `LastLedgerSequence` makes confirmation declare
		// expiry and tell the user a resend is safe.
		it.each([0, 1, 107_065_791, 0xffff_ffff])('accepts the UInt32 value %j', (value) => {
			expect(XrpLedgerCounterSchema.safeParse(value).success).toBeTruthy();
		});

		it.each([0xffff_ffff + 1, 9_007_199_254_740_991, -1, 1.5])('rejects %j', (value) => {
			expect(XrpLedgerCounterSchema.safeParse(value).success).toBeFalsy();
		});
	});

	describe('XrplLedgerResultSchema', () => {
		it('normalises whichever form is present to one index', () => {
			expect(XrplLedgerResultSchema.safeParse({ validated: true, ledger_index: 5 }).data).toEqual({
				ledgerIndex: 5
			});
			expect(
				XrplLedgerResultSchema.safeParse({ validated: true, ledger: { ledger_index: '5' } }).data
			).toEqual({ ledgerIndex: 5 });
		});

		// Both forms in one response is the normal case for the configured provider, so this must
		// parse — rejecting it would reject every real `ledger` response.
		it('accepts both forms when they agree, across the type difference', () => {
			expect(
				XrplLedgerResultSchema.safeParse({
					validated: true,
					ledger_index: 5,
					ledger: { ledger_index: '5' }
				}).data
			).toEqual({ ledgerIndex: 5 });
		});

		it('rejects two indices that disagree', () => {
			expect(
				XrplLedgerResultSchema.safeParse({
					validated: true,
					ledger_index: 999_999_999,
					ledger: { ledger_index: '5' }
				}).success
			).toBeFalsy();
		});

		it('rejects a response carrying neither form', () => {
			expect(XrplLedgerResultSchema.safeParse({ validated: true }).success).toBeFalsy();
		});

		// A non-validated ledger's index can be ahead of the last validated one, which is the
		// confusion this call exists to avoid.
		it.each([false, undefined])('rejects validated: %j', (validated) => {
			expect(XrplLedgerResultSchema.safeParse({ validated, ledger_index: 5 }).success).toBeFalsy();
		});
	});

	describe('XrplTxResultSchema validated results', () => {
		const validated = (TransactionResult: unknown) => ({
			validated: true,
			hash: 'H',
			meta: { TransactionResult }
		});

		// Only `tes` and `tec` are ever applied to a ledger. `tesSUCCESS` is the entire `tes` class,
		// and the `tec` pattern was checked against `ripple-binary-codec`'s own list — all 82 match.
		it.each(['tesSUCCESS', 'tecUNFUNDED_PAYMENT', 'tecDST_TAG_NEEDED', 'tecNO_PERMISSION'])(
			'accepts the ledger-recorded result %s',
			(result) => {
				expect(XrplTxResultSchema.safeParse(validated(result)).success).toBeTruthy();
			}
		);

		// None of these can be in a validated ledger, so a record claiming one is malformed — and
		// the caller would otherwise turn it into a definitive `XrpTransactionFailedError`.
		it.each([
			'tefPAST_SEQ',
			'telINSUF_FEE_P',
			'temBAD_AMOUNT',
			'terQUEUED',
			'tesFAILURE',
			'tecnotupper',
			'tec',
			'',
			'anything'
		])('rejects the non-ledger result %j', (result) => {
			expect(XrplTxResultSchema.safeParse(validated(result)).success).toBeFalsy();
		});
	});

	describe('rejecting a mixed error/result response', () => {
		it.each([
			{
				name: 'XrplLedgerCurrentResultSchema',
				schema: XrplLedgerCurrentResultSchema,
				result: { ledger_current_index: 5 }
			},
			{
				name: 'XrplLedgerResultSchema (top-level index)',
				schema: XrplLedgerResultSchema,
				result: { validated: true, ledger_index: 5 }
			},
			{
				name: 'XrplLedgerResultSchema (nested index)',
				schema: XrplLedgerResultSchema,
				result: { validated: true, ledger: { ledger_index: 5 } }
			},
			{
				name: 'XrplSubmitResultSchema',
				schema: XrplSubmitResultSchema,
				result: { engine_result: 'tesSUCCESS' }
			},
			{
				name: 'XrplAccountInfoFullResultSchema',
				schema: XrplAccountInfoFullResultSchema,
				result: {
					account_data: {
						Account: 'rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD',
						Balance: '1',
						Sequence: 1,
						OwnerCount: 0,
						Flags: 0
					}
				}
			}
		])('$name parses the result alone but rejects it alongside an error', ({ schema, result }) => {
			expect(schema.safeParse(result).success).toBeTruthy();
			expect(schema.safeParse({ ...result, error: 'tooBusy' }).success).toBeFalsy();
		});
	});
});
