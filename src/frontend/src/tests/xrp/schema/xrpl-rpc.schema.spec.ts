import {
	XrpDropsSchema,
	XrpLedgerCounterSchema,
	XrplAccountInfoFullResultSchema,
	XrplAccountInfoResultSchema,
	XrplEnvelopeSchema,
	XrplLedgerCurrentResultSchema,
	XrplLedgerResultSchema,
	XrplRequestEchoSchema,
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

		// The protocol ceiling, not a chosen one: 10^17 drops is the entire XRP supply, and
		// `ripple-binary-codec` refuses an `Amount` above it with "is an illegal amount". An
		// unbounded `Balance` inflates the reserve-aware maximum, so a send above the real balance
		// passes the guard written to stop it and XRPL charges the fee for a `tecUNFUNDED_PAYMENT`.
		it('accepts the largest number of drops that can exist', () => {
			expect(XrpDropsSchema.safeParse('100000000000000000').success).toBeTruthy();
		});

		it.each(['100000000000000001', '999999999999999999999999999999'])(
			'rejects the out-of-range value %s',
			(drops) => {
				expect(XrpDropsSchema.safeParse(drops).success).toBeFalsy();
			}
		);

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
				account_data: { Account: 'rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD', Balance: '25000000' },
				validated: true
			});

			expect(result.success).toBeTruthy();
			expect(result.data).toEqual({
				account_data: { Account: 'rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD', Balance: '25000000' },
				validated: true
			});
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
					account_data: { Account: 'rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD', Balance: '1' },
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
				XrplAccountInfoFullResultSchema.safeParse({ account_data: accountData, validated: true })
					.success
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
					account_data: { ...accountData, Flags: 0 },
					validated: true
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

	// The echo says two things — what was asked, and what it was asked OF — and the Clio branch
	// used to discard the second. Both real shapes normalise to the same pair.
	describe('XrplRequestEchoSchema', () => {
		it('normalises the Clio shape', () => {
			expect(
				XrplRequestEchoSchema.safeParse({
					method: 'account_info',
					params: [{ account: 'rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD', ledger_index: 'validated' }]
				}).data
			).toEqual({
				operation: 'account_info',
				params: { account: 'rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD', ledger_index: 'validated' }
			});
		});

		it('normalises the forwarded rippled shape', () => {
			expect(
				XrplRequestEchoSchema.safeParse({
					command: 'account_info',
					account: 'rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD',
					ledger_index: 'current'
				}).data
			).toEqual({
				operation: 'account_info',
				params: { account: 'rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD', ledger_index: 'current' }
			});
		});

		// The branches are mutually exclusive, like `account_data` XOR `error` and the three `tx`
		// variants. Zod strips unknown keys, so without forbidding the opposite discriminator a
		// payload carrying BOTH was accepted under whichever branch came first — contradiction
		// dropped — on the two answers that end a send.
		it.each([
			{
				name: 'the JSON-RPC shape also carrying a command',
				echo: { method: 'tx', params: [{ transaction: 'H' }], command: 'account_info' }
			},
			{
				name: 'the forwarded shape also carrying a method',
				echo: { command: 'account_info', account: 'r1', method: 'tx' }
			},
			{
				name: 'the forwarded shape also carrying params',
				echo: { command: 'account_info', account: 'r1', params: [{ transaction: 'H' }] }
			}
		])('rejects $name', ({ echo }) => {
			expect(XrplRequestEchoSchema.safeParse(echo).success).toBeFalsy();
		});

		// One level below the discriminators: the identity belongs inside `params[0]` on the Clio
		// shape, so a copy beside it is a second claim that can disagree — and `z.object` strips
		// what it does not name, keeping the half that matched. These five are the fields the two
		// bindings compare.
		it.each([
			{ name: 'a sibling account', extra: { account: 'rOther' } },
			{ name: 'a sibling ledger_index', extra: { ledger_index: 'validated' } },
			{ name: 'a sibling transaction', extra: { transaction: 'OTHERHASH' } },
			{ name: 'a sibling min_ledger', extra: { min_ledger: 1 } },
			{ name: 'a sibling max_ledger', extra: { max_ledger: 9 } }
		])('rejects a Clio echo carrying $name beside its params', ({ extra }) => {
			expect(
				XrplRequestEchoSchema.safeParse({
					method: 'tx',
					params: [{ transaction: 'HASH', min_ledger: 1000, max_ledger: 1020 }],
					...extra
				}).success
			).toBeFalsy();
		});

		// Targeted, not strict: a JSON-RPC echo may legitimately carry these, and rejecting every
		// unexpected sibling would stop absence parsing the first time one appeared.
		it('ignores a harmless sibling that claims no identity', () => {
			expect(
				XrplRequestEchoSchema.safeParse({
					method: 'tx',
					params: [{ transaction: 'HASH' }],
					id: 7,
					jsonrpc: '2.0'
				}).data
			).toEqual({ operation: 'tx', params: { transaction: 'HASH' } });
		});

		it.each([{}, { method: 'tx' }, { params: [{}] }, { command: 42 }])(
			'rejects the echo %j, which states no operation',
			(echo) => {
				expect(XrplRequestEchoSchema.safeParse(echo).success).toBeFalsy();
			}
		);
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

	// The only variant that may be read as non-inclusion, and so the only one whose contradictions
	// end a live send. Zod strips unknown keys, so anything disputing absence is dropped unless the
	// schema accounts for it — which is why this branch is strict and the others are not: the set a
	// real absence contains is small and knowable, while the set it must not contain is every field
	// a `tx` result can carry, now and in future.
	describe('XrplTxResultSchema absence', () => {
		const absent = {
			error: 'txnNotFound',
			searched_all: true,
			// The only identity this branch can carry, so it is required rather than optional.
			request: { method: 'tx', params: [{ transaction: 'H' }] }
		};

		it('accepts a fully searched absence', () => {
			expect(XrplTxResultSchema.safeParse(absent).success).toBeTruthy();
		});

		// A `tx` result carries the transaction at the TOP LEVEL of `result`, so these are not
		// exotic — they are what a validated payment answers with, beside the ones an earlier
		// version of this branch forbade by name. Naming them was the wrong shape; the branch is
		// strict now, so the question is what absence MAY contain rather than what it may not.
		it.each([
			{ name: 'TransactionType', extra: { TransactionType: 'Payment' } },
			{ name: 'Account', extra: { Account: 'rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD' } },
			{ name: 'Sequence', extra: { Sequence: 42 } },
			{ name: 'ledger_index', extra: { ledger_index: 107_065_791 } },
			{ name: 'inLedger', extra: { inLedger: 107_065_791 } },
			{ name: 'ctid', extra: { ctid: 'C660E4BF00000000' } },
			{ name: 'LastLedgerSequence', extra: { LastLedgerSequence: 107_065_811 } },
			{ name: 'hash', extra: { hash: 'H' } },
			{ name: 'tx', extra: { tx: { TransactionType: 'Payment' } } },
			{ name: 'tx_json', extra: { tx_json: { TransactionType: 'Payment' } } },
			{ name: 'validated', extra: { validated: true } },
			{ name: 'meta', extra: { meta: { TransactionResult: 'tesSUCCESS' } } }
		])('rejects an absence contradicted by $name', ({ extra }) => {
			expect(XrplTxResultSchema.safeParse({ ...absent, ...extra }).success).toBeFalsy();
		});

		// `status` is pinned rather than merely allowed: `xrpJsonRpc` established that
		// `txnNotFound` arrives as `status: 'error'`, so a payload claiming success is not the
		// error response this branch describes.
		it('rejects an absence claiming a success status', () => {
			expect(XrplTxResultSchema.safeParse({ ...absent, status: 'success' }).success).toBeFalsy();
		});

		// The complete key set the configured endpoint returns, verified across the ranged request
		// this code sends, a far-past range, no range at all, and `binary: true`. The regression a
		// strict branch could most easily introduce is rejecting every genuine absence, which would
		// take expiry detection with it.
		it('accepts the keys a real provider sends alongside absence', () => {
			expect(
				XrplTxResultSchema.safeParse({
					...absent,
					error_code: 29,
					error_message: 'Transaction not found.',
					status: 'error',
					type: 'response'
				}).success
			).toBeTruthy();
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
				result: { engine_result: 'tesSUCCESS', accepted: true }
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
					},
					validated: true
				}
			}
		])('$name parses the result alone but rejects it alongside an error', ({ schema, result }) => {
			expect(schema.safeParse(result).success).toBeTruthy();
			expect(schema.safeParse({ ...result, error: 'tooBusy' }).success).toBeFalsy();
		});
	});
});
