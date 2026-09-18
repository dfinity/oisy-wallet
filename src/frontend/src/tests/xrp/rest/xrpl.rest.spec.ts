import { ZERO } from '$lib/constants/app.constants';
import {
	XrpAccountNotFoundError,
	XrplRpcError,
	loadXrpAccountInfo,
	loadXrpBalance,
	loadXrpLedgerIndex,
	loadXrpOpenLedgerFee,
	loadXrpTransactionOutcome,
	loadXrpTransactions,
	loadXrpValidatedLedgerIndex,
	submitXrpTransaction
} from '$xrp/rest/xrpl.rest';
import { XrpNetworks } from '$xrp/types/network';

// The env resolves the endpoint to `undefined` under vitest, so a spec that forgets to mock an RPC
// call fails instead of reaching the public cluster. These tests DO exercise the RPC helpers, so
// they supply an endpoint of their own — the responses are stubbed on `fetch` below.
vi.mock('$xrp/providers/xrp-rpc.providers', () => ({
	xrpHttpRpcUrl: () => 'https://rpc.test'
}));

describe('xrpl.rest', () => {
	const address = 'rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD';
	const network = XrpNetworks.mainnet;

	const mockFetchResponse = ({
		body,
		ok = true,
		status = 200
	}: {
		body: unknown;
		ok?: boolean;
		status?: number;
	}): void => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok,
				status,
				json: () => Promise.resolve(body)
			})
		);
	};

	beforeEach(() => {
		vi.unstubAllGlobals();
	});

	// The envelope is validated once, by `xrpJsonRpc`. Before that, every helper dereferenced
	// `result.error` itself, so a body without a `result` object produced
	// "TypeError: Cannot read properties of undefined" instead of the helper's own message —
	// exactly the shape leak the per-helper guards existed to prevent.
	describe('the JSON-RPC envelope', () => {
		const callers: { name: string; call: () => Promise<unknown> }[] = [
			{ name: 'loadXrpBalance', call: () => loadXrpBalance({ address, network }) },
			{ name: 'loadXrpAccountInfo', call: () => loadXrpAccountInfo({ address, network }) },
			{
				name: 'loadXrpOpenLedgerFee',
				call: () => loadXrpOpenLedgerFee({ network, fallbackFee: 10n })
			},
			{ name: 'loadXrpLedgerIndex', call: () => loadXrpLedgerIndex({ network }) },
			{ name: 'loadXrpValidatedLedgerIndex', call: () => loadXrpValidatedLedgerIndex({ network }) },
			{
				name: 'loadXrpTransactionOutcome',
				call: () =>
					loadXrpTransactionOutcome({
						hash: 'H',
						network,
						firstLedgerSequence: 1000,
						lastLedgerSequence: 1020
					})
			},
			{ name: 'submitXrpTransaction', call: () => submitXrpTransaction({ txBlob: '12', network }) },
			{
				name: 'loadXrpTransactions',
				call: () => loadXrpTransactions({ address, network, limit: 10 })
			}
		];

		describe.each(callers)('$name', ({ call }) => {
			it.each([{}, { result: null }, { jsonrpc: '2.0', error: 'gateway' }])(
				'names the missing result object for the body %j',
				async (body) => {
					mockFetchResponse({ body });

					await expect(call()).rejects.toThrow('no result object');
				}
			);

			// A present `error` has to be a string. Coercion let `['tooBusy']` become `'tooBusy'`, so a
			// malformed value could match a code the helper declared as an expected state; a present
			// `null` was read as no error at all, which made `loadXrpOpenLedgerFee` answer a failed
			// response with its fallback base fee.
			it.each([null, ['tooBusy'], 7, { code: 'tooBusy' }, true])(
				'throws for the non-string error %j',
				async (error) => {
					mockFetchResponse({ body: { result: { error } } });

					await expect(call()).rejects.toBeInstanceOf(XrplRpcError);
				}
			);

			// A malformed value must not reach an expected code by coercing to it.
			it('does not let a coerced value match an expected code', async () => {
				mockFetchResponse({ body: { result: { error: ['actNotFound'] } } });

				await expect(call()).rejects.toBeInstanceOf(XrplRpcError);
			});

			// One typed error, thrown in one place, carrying the code.
			it('throws XrplRpcError carrying the code for an unexpected XRPL error', async () => {
				mockFetchResponse({ body: { result: { error: 'tooBusy' } } });

				const err = await call().then(
					() => undefined,
					(e: unknown) => e
				);

				expect(err).toBeInstanceOf(XrplRpcError);
				expect((err as XrplRpcError).error).toBe('tooBusy');
			});
		});
	});

	describe('loadXrpBalance', () => {
		it('returns the balance in drops as a bigint', async () => {
			mockFetchResponse({ body: { result: { account_data: { Balance: '25000000' } } } });

			const balance = await loadXrpBalance({ address, network: XrpNetworks.mainnet });

			expect(balance).toBe(25_000_000n);
		});

		it('sends an account_info request for the validated ledger', async () => {
			const fetchMock = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: () => Promise.resolve({ result: { account_data: { Balance: '1' } } })
			});
			vi.stubGlobal('fetch', fetchMock);

			await loadXrpBalance({ address, network: XrpNetworks.mainnet });

			const [[, options]] = fetchMock.mock.calls;

			expect(JSON.parse(options.body as string)).toEqual({
				method: 'account_info',
				params: [{ account: address, ledger_index: 'validated' }]
			});
		});

		it('maps an unfunded account (actNotFound) to a zero balance', async () => {
			mockFetchResponse({ body: { result: { error: 'actNotFound' } } });

			const balance = await loadXrpBalance({ address, network: XrpNetworks.mainnet });

			expect(balance).toBe(ZERO);
		});

		it('throws on a non-ok HTTP response', async () => {
			mockFetchResponse({ body: {}, ok: false, status: 503 });

			await expect(loadXrpBalance({ address, network: XrpNetworks.mainnet })).rejects.toThrow(
				'XRPL account_info request failed with status 503'
			);
		});

		it('throws on an unexpected response without account_data', async () => {
			mockFetchResponse({ body: { result: { error: 'invalidParams' } } });

			await expect(loadXrpBalance({ address, network: XrpNetworks.mainnet })).rejects.toThrow(
				'invalidParams'
			);
		});

		it('throws on a response with neither account_data nor an error', async () => {
			mockFetchResponse({ body: { result: {} } });

			await expect(loadXrpBalance({ address, network: XrpNetworks.mainnet })).rejects.toThrow(
				'Unexpected XRPL account_info response'
			);
		});

		// An ambiguous response must not be read as a balance: the union branches strip unknown
		// keys, so without mutual exclusion the error would be discarded and `1` returned.
		it('throws on a response carrying both account_data and an error', async () => {
			mockFetchResponse({
				body: { result: { account_data: { Balance: '1' }, error: 'actNotFound' } }
			});

			await expect(loadXrpBalance({ address, network: XrpNetworks.mainnet })).rejects.toThrow(
				'Unexpected XRPL account_info response'
			);
		});

		// XRPL reports drops as an unsigned decimal string; `BigInt` alone would accept all of these
		// and hand back a plausible-looking balance.
		it.each([1, '-1', '0x10', '1.5', '1e3', '', ' 1'])(
			'throws instead of converting the invalid balance %j',
			async (Balance) => {
				mockFetchResponse({ body: { result: { account_data: { Balance } } } });

				await expect(loadXrpBalance({ address, network: XrpNetworks.mainnet })).rejects.toThrow(
					'Unexpected XRPL account_info response'
				);
			}
		);
	});

	describe('submitXrpTransaction', () => {
		const txBlob = '1200002280000000';

		it('returns an accepted result for a tesSUCCESS engine result', async () => {
			mockFetchResponse({
				body: {
					result: {
						engine_result: 'tesSUCCESS',
						engine_result_message: 'The transaction was applied.',
						tx_json: { hash: 'ABCDEF' },
						accepted: true
					}
				}
			});

			const result = await submitXrpTransaction({ txBlob, network: XrpNetworks.mainnet });

			expect(result).toEqual({
				engineResult: 'tesSUCCESS',
				engineResultMessage: 'The transaction was applied.',
				txHash: 'ABCDEF',
				accepted: true
			});
		});

		// `ter` is a retry class: a queued one was taken by the node, a non-queued one was not.
		it('marks a queued ter response (terQUEUED) as accepted', async () => {
			mockFetchResponse({
				body: { result: { engine_result: 'terQUEUED', accepted: true, queued: true } }
			});

			const result = await submitXrpTransaction({ txBlob, network: XrpNetworks.mainnet });

			expect(result.accepted).toBeTruthy();
			expect(result.engineResult).toBe('terQUEUED');
		});

		it('marks a non-queued ter response (terPRE_SEQ) as not accepted', async () => {
			mockFetchResponse({
				body: { result: { engine_result: 'terPRE_SEQ', accepted: false } }
			});

			const result = await submitXrpTransaction({ txBlob, network: XrpNetworks.mainnet });

			expect(result.accepted).toBeFalsy();
			expect(result.engineResult).toBe('terPRE_SEQ');
		});

		// `accepted` comes from an untrusted node, so it is validated rather than cast: a
		// non-boolean would otherwise pass through and read as truthy.
		it.each(['false', 'true', 1, 0, {}])(
			'marks a non-boolean accepted value %j as not accepted',
			async (accepted) => {
				mockFetchResponse({
					body: { result: { engine_result: 'terPRE_SEQ', accepted } }
				});

				const result = await submitXrpTransaction({ txBlob, network: XrpNetworks.mainnet });

				expect(result.accepted).toBeFalsy();
			}
		);

		it('marks a response without an accepted flag as not accepted', async () => {
			mockFetchResponse({ body: { result: { engine_result: 'tecUNFUNDED_PAYMENT' } } });

			const result = await submitXrpTransaction({ txBlob, network: XrpNetworks.mainnet });

			expect(result.accepted).toBeFalsy();
			expect(result.engineResult).toBe('tecUNFUNDED_PAYMENT');
		});

		it('throws on a non-ok HTTP response', async () => {
			mockFetchResponse({ body: {}, ok: false, status: 500 });

			await expect(submitXrpTransaction({ txBlob, network: XrpNetworks.mainnet })).rejects.toThrow(
				'XRPL submit request failed with status 500'
			);
		});

		// A failed request that also carried a plausible `engine_result` used to parse, dropping the
		// error. The send would then act on a result the node never really produced.
		it('throws for an error response that also carries an engine_result', async () => {
			mockFetchResponse({
				body: { result: { error: 'tooBusy', engine_result: 'tesSUCCESS', accepted: true } }
			});

			await expect(submitXrpTransaction({ txBlob, network: XrpNetworks.mainnet })).rejects.toThrow(
				'Unexpected XRPL submit response: tooBusy'
			);
		});

		// `engine_result` is read with `startsWith` outside the try that wraps this call, so a
		// non-string would throw there — after the blob was broadcast — and turn an ambiguous submit
		// into a reported failure. It must fail here instead, where the caller treats it as
		// "go and confirm".
		it.each([7, true, {}, ['tesSUCCESS'], null])(
			'throws for the non-string engine_result %j',
			async (engine_result) => {
				mockFetchResponse({ body: { result: { engine_result, accepted: true } } });

				await expect(
					submitXrpTransaction({ txBlob, network: XrpNetworks.mainnet })
				).rejects.toThrow('Unexpected XRPL submit response: no string engine_result');
			}
		);

		// Cosmetic fields must not cost the send a minute of polling: the message only reaches an
		// error string and the hash is derived locally.
		it('tolerates malformed engine_result_message and tx_json', async () => {
			mockFetchResponse({
				body: {
					result: { engine_result: 'tesSUCCESS', engine_result_message: 7, tx_json: 'nope' }
				}
			});

			await expect(submitXrpTransaction({ txBlob, network: XrpNetworks.mainnet })).resolves.toEqual(
				{
					engineResult: 'tesSUCCESS',
					engineResultMessage: undefined,
					txHash: undefined,
					accepted: false
				}
			);
		});

		it('throws when the response has no engine_result', async () => {
			mockFetchResponse({ body: { result: { error: 'invalidTransaction' } } });

			await expect(submitXrpTransaction({ txBlob, network: XrpNetworks.mainnet })).rejects.toThrow(
				'invalidTransaction'
			);
		});
	});

	describe('loadXrpAccountInfo', () => {
		it('returns the balance and sequence for a funded account', async () => {
			mockFetchResponse({
				body: {
					result: { account_data: { Balance: '30000000', Sequence: 42, OwnerCount: 3 } }
				}
			});

			const info = await loadXrpAccountInfo({ address, network: XrpNetworks.mainnet });

			expect(info).toEqual({
				balance: 30_000_000n,
				sequence: 42,
				ownerCount: 3,
				flags: undefined
			});
		});

		// The send path reads `lsfRequireDestTag` out of these bits, so dropping them at the
		// boundary would leave an untagged payment to be applied as `tecDST_TAG_NEEDED`.
		it('returns the account flags when the node reports them', async () => {
			mockFetchResponse({
				body: {
					result: {
						account_data: { Balance: '30000000', Sequence: 42, OwnerCount: 3, Flags: 131_072 }
					}
				}
			});

			const info = await loadXrpAccountInfo({ address, network: XrpNetworks.mainnet });

			expect(info.flags).toBe(131_072);
		});

		// Absent flags are not the same claim as no flags being set, so they stay `undefined`
		// rather than becoming zero — and a node that omits the field must not fail the read,
		// which the send path needs for the sequence and the reserve.
		it('leaves the flags undefined when the node omits them', async () => {
			mockFetchResponse({
				body: { result: { account_data: { Balance: '30000000', Sequence: 42, OwnerCount: 3 } } }
			});

			const info = await loadXrpAccountInfo({ address, network: XrpNetworks.mainnet });

			expect(info.flags).toBeUndefined();
		});

		it('returns a zero owner count when the account owns nothing', async () => {
			mockFetchResponse({
				body: { result: { account_data: { Balance: '30000000', Sequence: 42, OwnerCount: 0 } } }
			});

			const info = await loadXrpAccountInfo({ address, network: XrpNetworks.mainnet });

			expect(info.ownerCount).toBe(0);
		});

		// A negative owner count would LOWER the reserve and inflate the sendable maximum; a
		// fractional one throws inside `BigInt()` with an opaque RangeError. Both are rejected at
		// the boundary, along with the non-numeric forms.
		it.each([undefined, '3', null, {}, -1, 1.5, Number.MAX_SAFE_INTEGER + 2])(
			'throws for an owner count of %j',
			async (OwnerCount) => {
				mockFetchResponse({
					body: { result: { account_data: { Balance: '30000000', Sequence: 42, OwnerCount } } }
				});

				await expect(loadXrpAccountInfo({ address, network: XrpNetworks.mainnet })).rejects.toThrow(
					'Unexpected XRPL account_info response'
				);
			}
		);

		it.each([undefined, '42', null, -1, 1.5])('throws for a sequence of %j', async (Sequence) => {
			mockFetchResponse({
				body: { result: { account_data: { Balance: '30000000', Sequence, OwnerCount: 0 } } }
			});

			await expect(loadXrpAccountInfo({ address, network: XrpNetworks.mainnet })).rejects.toThrow(
				'Unexpected XRPL account_info response'
			);
		});

		// `BigInt` would accept all of these and hand back a plausible-looking balance.
		it.each(['-1', '0x10', '1.5', '1e3', ' 1', '', 30_000_000])(
			'throws for a balance of %j',
			async (Balance) => {
				mockFetchResponse({
					body: { result: { account_data: { Balance, Sequence: 42, OwnerCount: 0 } } }
				});

				await expect(loadXrpAccountInfo({ address, network: XrpNetworks.mainnet })).rejects.toThrow(
					'Unexpected XRPL account_info response'
				);
			}
		);

		// Typed, so a caller can tell "this account owns nothing" from a node that could not answer.
		// A zero balance cannot carry that meaning: the transaction cost can drain an existing
		// account to nothing and it still exists on-ledger.
		it('throws a typed error for an unfunded account', async () => {
			mockFetchResponse({ body: { result: { error: 'actNotFound' } } });

			await expect(
				loadXrpAccountInfo({ address, network: XrpNetworks.mainnet })
			).rejects.toBeInstanceOf(XrpAccountNotFoundError);
		});

		it.each(['tooBusy', 'noNetwork'])(
			'throws an untyped error for the operational failure %s',
			async (error) => {
				mockFetchResponse({ body: { result: { error } } });

				const err = await loadXrpAccountInfo({ address, network: XrpNetworks.mainnet }).catch(
					(e: unknown) => e
				);

				expect(err).toBeInstanceOf(Error);
				expect(err).not.toBeInstanceOf(XrpAccountNotFoundError);
			}
		);
	});

	describe('loadXrpOpenLedgerFee', () => {
		it('returns the open-ledger fee in drops', async () => {
			mockFetchResponse({ body: { result: { drops: { open_ledger_fee: '15', base_fee: '10' } } } });

			const fee = await loadXrpOpenLedgerFee({ network: XrpNetworks.mainnet, fallbackFee: 10n });

			expect(fee).toBe(15n);
		});

		// The fee is converted with `BigInt`, which would accept signed and hexadecimal forms.
		it.each(['-1', '0x10', '1.5', ' 1', 15])('throws for an open-ledger fee of %j', async (fee) => {
			mockFetchResponse({ body: { result: { drops: { open_ledger_fee: fee } } } });

			await expect(
				loadXrpOpenLedgerFee({ network: XrpNetworks.mainnet, fallbackFee: 10n })
			).rejects.toThrow('Unexpected XRPL fee response');
		});

		// Every field here is optional, so an error response parses with no `drops` and would be
		// answered with the fallback — the base fee, which is what underprices a send on the very
		// node that reported congestion.
		it.each(['tooBusy', 'noNetwork', 'amendmentBlocked'])(
			'throws for the XRPL error %s rather than falling back to the base fee',
			async (error) => {
				mockFetchResponse({ body: { result: { error } } });

				await expect(
					loadXrpOpenLedgerFee({ network: XrpNetworks.mainnet, fallbackFee: 10n })
				).rejects.toThrow(`Unexpected XRPL fee response: ${error}`);
			}
		);

		it('falls back to the provided fee when the node omits it', async () => {
			mockFetchResponse({ body: { result: { drops: {} } } });

			const fee = await loadXrpOpenLedgerFee({ network: XrpNetworks.mainnet, fallbackFee: 10n });

			expect(fee).toBe(10n);
		});
	});

	describe('loadXrpLedgerIndex', () => {
		it('returns the current ledger index', async () => {
			mockFetchResponse({ body: { result: { ledger_current_index: 987654 } } });

			await expect(loadXrpLedgerIndex({ network: XrpNetworks.mainnet })).resolves.toBe(987654);
		});
	});

	describe('loadXrpLedgerIndex validation', () => {
		// A failed request that also carried an index used to parse, dropping the error — and this
		// index sets `LastLedgerSequence`.
		it.each(['tooBusy', 'noNetwork'])(
			'throws for the XRPL error %s even alongside an index',
			async (error) => {
				mockFetchResponse({ body: { result: { error, ledger_current_index: 987_654 } } });

				await expect(loadXrpLedgerIndex({ network: XrpNetworks.mainnet })).rejects.toThrow(
					`Unexpected XRPL ledger_current response: ${error}`
				);
			}
		);

		it.each([undefined, '987654', null, -1, 1.5])(
			'throws for a current ledger index of %j',
			async (ledger_current_index) => {
				mockFetchResponse({ body: { result: { ledger_current_index } } });

				await expect(loadXrpLedgerIndex({ network: XrpNetworks.mainnet })).rejects.toThrow(
					'missing ledger_current_index'
				);
			}
		);
	});

	describe('loadXrpValidatedLedgerIndex', () => {
		it('returns the validated ledger index', async () => {
			mockFetchResponse({ body: { result: { validated: true, ledger_index: 987_000 } } });

			await expect(loadXrpValidatedLedgerIndex({ network: XrpNetworks.mainnet })).resolves.toBe(
				987_000
			);
		});

		it('reads the index nested under ledger', async () => {
			mockFetchResponse({
				body: { result: { validated: true, ledger: { ledger_index: 987_001 } } }
			});

			await expect(loadXrpValidatedLedgerIndex({ network: XrpNetworks.mainnet })).resolves.toBe(
				987_001
			);
		});

		// The ledger header quotes its index, unlike the numeric top-level field.
		it('reads a quoted index nested under ledger', async () => {
			mockFetchResponse({
				body: { result: { validated: true, ledger: { ledger_index: '987002' } } }
			});

			await expect(loadXrpValidatedLedgerIndex({ network: XrpNetworks.mainnet })).resolves.toBe(
				987_002
			);
		});

		// The worst version of a dropped error: a bogus index past `LastLedgerSequence` sends
		// confirmation into the expiry branch, which tells the user a resend is safe.
		it.each(['tooBusy', 'noNetwork'])(
			'throws for the XRPL error %s even alongside a validated index',
			async (error) => {
				mockFetchResponse({
					body: { result: { error, validated: true, ledger_index: 999_999_999 } }
				});

				await expect(loadXrpValidatedLedgerIndex({ network: XrpNetworks.mainnet })).rejects.toThrow(
					`Unexpected XRPL ledger response: ${error}`
				);
			}
		);

		it.each(['-1', '1.5', '0x10', ' 1', '', '9007199254740993', null])(
			'throws for a nested index of %j',
			async (ledger_index) => {
				mockFetchResponse({ body: { result: { validated: true, ledger: { ledger_index } } } });

				await expect(loadXrpValidatedLedgerIndex({ network: XrpNetworks.mainnet })).rejects.toThrow(
					'missing validated ledger_index'
				);
			}
		);

		it('throws when the validated index is missing', async () => {
			mockFetchResponse({ body: { result: {} } });

			await expect(loadXrpValidatedLedgerIndex({ network: XrpNetworks.mainnet })).rejects.toThrow(
				'missing validated ledger_index'
			);
		});

		// A non-validated ledger's index can be ahead of the last validated one, which is the
		// confusion this call exists to avoid.
		it.each([false, undefined, 'true'])('throws when validated is %j', async (validated) => {
			mockFetchResponse({ body: { result: { validated, ledger_index: 987_000 } } });

			await expect(loadXrpValidatedLedgerIndex({ network: XrpNetworks.mainnet })).rejects.toThrow(
				'missing validated ledger_index'
			);
		});

		// A malformed HIGH index would declare a still-live payment expired.
		it.each(['987000', -1, 1.5, Number.MAX_SAFE_INTEGER + 2, null])(
			'throws for a validated ledger index of %j',
			async (ledger_index) => {
				mockFetchResponse({ body: { result: { validated: true, ledger_index } } });

				await expect(loadXrpValidatedLedgerIndex({ network: XrpNetworks.mainnet })).rejects.toThrow(
					'missing validated ledger_index'
				);
			}
		);
	});

	describe('loadXrpTransactionOutcome', () => {
		// Only `txnNotFound` means the node looked and did not find it. Any other error means the
		// node did not answer, and the caller concludes expiry from a non-validated lookup.
		it.each(['tooBusy', 'noNetwork', 'amendmentBlocked'])(
			'throws for the XRPL error %s rather than reporting the transaction absent',
			async (error) => {
				mockFetchResponse({ body: { result: { error } } });

				await expect(
					loadXrpTransactionOutcome({
						hash: 'HASH',
						network: XrpNetworks.mainnet,
						firstLedgerSequence: 1000,
						lastLedgerSequence: 1020
					})
				).rejects.toThrow(`Unexpected XRPL tx response: ${error}`);
			}
		);

		// Absence is established only when the node confirms it searched the whole range.
		it('reports the transaction as not validated for a fully searched txnNotFound', async () => {
			mockFetchResponse({ body: { result: { error: 'txnNotFound', searched_all: true } } });

			const outcome = await loadXrpTransactionOutcome({
				hash: 'HASH',
				network: XrpNetworks.mainnet,
				firstLedgerSequence: 1000,
				lastLedgerSequence: 1020
			});

			expect(outcome).toEqual({ state: 'absent' });
		});

		// `txnNotFound` also covers "the node does not have that ledger". Reading it as absence
		// declares a settled payment expired and invites the duplicate send.
		it.each([{ searched_all: false }, {}, { searched_all: 'true' }])(
			'throws for a txnNotFound that did not search the whole range (%j)',
			async (extra) => {
				mockFetchResponse({ body: { result: { error: 'txnNotFound', ...extra } } });

				await expect(
					loadXrpTransactionOutcome({
						hash: 'HASH',
						network: XrpNetworks.mainnet,
						firstLedgerSequence: 1000,
						lastLedgerSequence: 1020
					})
				).rejects.toThrow('Unexpected XRPL tx response: txnNotFound');
			}
		);

		// Before the three variants were mutually exclusive, every field of the pending branch was
		// optional — so an empty or junk `result` parsed as "pending", and at the expiry recheck
		// pending is what produces `XrpSendExpiredError` and tells the caller a resend is safe.
		it.each([{}, { anything: 1 }, { validated: false }, { hash: 'H' }])(
			'refuses to read the shapeless result %j as pending',
			async (result) => {
				mockFetchResponse({ body: { result } });

				await expect(
					loadXrpTransactionOutcome({
						hash: 'H',
						network,
						firstLedgerSequence: 1000,
						lastLedgerSequence: 1020
					})
				).rejects.toThrow('neither a validated result, a pending transaction');
			}
		);

		// Absence is decided from the parsed variant, so a payload that also carries validated
		// transaction data is no longer read as absence.
		it('refuses a payload that claims both absence and a validated result', async () => {
			mockFetchResponse({
				body: {
					result: {
						error: 'txnNotFound',
						searched_all: true,
						validated: true,
						hash: 'H',
						meta: { TransactionResult: 'tesSUCCESS' }
					}
				}
			});

			await expect(
				loadXrpTransactionOutcome({
					hash: 'H',
					network,
					firstLedgerSequence: 1000,
					lastLedgerSequence: 1020
				})
			).rejects.toThrow('txnNotFound');
		});

		// The range is what makes the node report `searched_all` at all.
		it('asks for the ledger range the transaction can be included in', async () => {
			mockFetchResponse({ body: { result: { error: 'txnNotFound', searched_all: true } } });

			await loadXrpTransactionOutcome({
				hash: 'HASH',
				network: XrpNetworks.mainnet,
				firstLedgerSequence: 1000,
				lastLedgerSequence: 1020
			});

			expect(fetch).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					body: JSON.stringify({
						method: 'tx',
						params: [{ transaction: 'HASH', min_ledger: 1000, max_ledger: 1020 }]
					})
				})
			);
		});

		it('reports the validated flag and the final transaction result', async () => {
			mockFetchResponse({
				body: { result: { validated: true, hash: 'H', meta: { TransactionResult: 'tesSUCCESS' } } }
			});

			await expect(
				loadXrpTransactionOutcome({
					hash: 'H',
					network: XrpNetworks.mainnet,
					firstLedgerSequence: 1000,
					lastLedgerSequence: 1020
				})
			).resolves.toEqual({ state: 'validated', transactionResult: 'tesSUCCESS' });
		});

		// XRPL renders ids uppercase; a caller-supplied one need not be.
		it('matches the echoed hash case-insensitively', async () => {
			mockFetchResponse({
				body: {
					result: { validated: true, hash: 'ABCDEF', meta: { TransactionResult: 'tesSUCCESS' } }
				}
			});

			await expect(
				loadXrpTransactionOutcome({
					hash: 'abcdef',
					network: XrpNetworks.mainnet,
					firstLedgerSequence: 1000,
					lastLedgerSequence: 1020
				})
			).resolves.toEqual({ state: 'validated', transactionResult: 'tesSUCCESS' });
		});

		// The one failure mode on this path that would report SUCCESS: a validated record for some
		// other transaction, read as this payment's outcome. It must be indeterminate, not an answer.
		it('throws when the node answers about a different transaction', async () => {
			mockFetchResponse({
				body: {
					result: {
						validated: true,
						hash: 'B'.repeat(64),
						meta: { TransactionResult: 'tesSUCCESS' }
					}
				}
			});

			await expect(
				loadXrpTransactionOutcome({
					hash: 'A'.repeat(64),
					network: XrpNetworks.mainnet,
					firstLedgerSequence: 1000,
					lastLedgerSequence: 1020
				})
			).rejects.toThrow('answered for');
		});

		// Same for a pending answer: reading another transaction's "not yet" as ours would keep the
		// poll running on a hash the node never spoke about.
		it('throws when a pending answer identifies a different transaction', async () => {
			mockFetchResponse({ body: { result: { validated: false, hash: 'B'.repeat(64) } } });

			await expect(
				loadXrpTransactionOutcome({
					hash: 'A'.repeat(64),
					network: XrpNetworks.mainnet,
					firstLedgerSequence: 1000,
					lastLedgerSequence: 1020
				})
			).rejects.toThrow('answered for');
		});

		// A validated response that does not say which transaction it describes cannot be bound to
		// ours, so it is malformed rather than an outcome.
		it('throws for a validated response without a hash', async () => {
			mockFetchResponse({
				body: { result: { validated: true, meta: { TransactionResult: 'tesSUCCESS' } } }
			});

			await expect(
				loadXrpTransactionOutcome({
					hash: 'H',
					network: XrpNetworks.mainnet,
					firstLedgerSequence: 1000,
					lastLedgerSequence: 1020
				})
			).rejects.toThrow('neither a validated result, a pending transaction');
		});

		// `pending` and `absent` must stay distinguishable: only absence may end confirmation as
		// non-inclusion, and a transaction the node hands back is the opposite of absent.
		it('reports a found-but-unvalidated transaction as pending, not absent', async () => {
			mockFetchResponse({ body: { result: { validated: false, hash: 'H' } } });

			await expect(
				loadXrpTransactionOutcome({
					hash: 'H',
					network: XrpNetworks.mainnet,
					firstLedgerSequence: 1000,
					lastLedgerSequence: 1020
				})
			).resolves.toEqual({ state: 'pending' });
		});

		// A fee-claiming `tec*` transaction is validated too — the result is what decides.
		it('reports a validated failure with its tec result', async () => {
			mockFetchResponse({
				body: {
					result: { validated: true, hash: 'H', meta: { TransactionResult: 'tecUNFUNDED_PAYMENT' } }
				}
			});

			await expect(
				loadXrpTransactionOutcome({
					hash: 'H',
					network: XrpNetworks.mainnet,
					firstLedgerSequence: 1000,
					lastLedgerSequence: 1020
				})
			).resolves.toEqual({ state: 'validated', transactionResult: 'tecUNFUNDED_PAYMENT' });
		});

		// `validated` is final, not successful, so a validated response owes a result. Reporting the
		// result as absent would end the poll and call a possibly-applied payment failed.
		it.each([
			{ validated: true },
			{ validated: true, meta: {} },
			{ validated: true, meta: { TransactionResult: 7 } },
			{ validated: true, meta: 'unavailable' }
		])('throws for the validated response without a usable result %j', async (result) => {
			mockFetchResponse({ body: { result } });

			await expect(
				loadXrpTransactionOutcome({
					hash: 'H',
					network: XrpNetworks.mainnet,
					firstLedgerSequence: 1000,
					lastLedgerSequence: 1020
				})
			).rejects.toThrow('neither a validated result, a pending transaction');
		});

		// Inverted deliberately. This used to assert that an omitted `validated` flag means pending,
		// on my assumption that the node may leave it out — but pending is the answer that ends the
		// send at the expiry recheck, so it has to be stated rather than inferred from an absence.
		// If some node does omit it, the cost is an indeterminate outcome and a retry, not a wrong
		// one: we never observe pending, so expiry is never concluded either.
		it('refuses to infer pending from an omitted validated flag', async () => {
			mockFetchResponse({ body: { result: { meta: { TransactionResult: 'tesSUCCESS' } } } });

			await expect(
				loadXrpTransactionOutcome({
					hash: 'H',
					network: XrpNetworks.mainnet,
					firstLedgerSequence: 1000,
					lastLedgerSequence: 1020
				})
			).rejects.toThrow('neither a validated result, a pending transaction');
		});
	});

	describe('loadXrpTransactions', () => {
		const entry = {
			tx: {
				TransactionType: 'Payment',
				Account: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
				Destination: address,
				Amount: '5000000',
				Fee: '10',
				hash: 'HASH1',
				ledger_index: 42,
				date: 1
			},
			meta: { TransactionResult: 'tesSUCCESS', delivered_amount: '5000000' },
			validated: true
		};

		it('returns the transactions and the pagination marker', async () => {
			mockFetchResponse({
				body: { result: { transactions: [entry], marker: { ledger: 42, seq: 1 } } }
			});

			const page = await loadXrpTransactions({ address, network: XrpNetworks.mainnet, limit: 10 });

			expect(page.transactions).toEqual([entry]);
			expect(page.marker).toEqual({ ledger: 42, seq: 1 });
		});

		// The node answers a JSON-RPC failure with HTTP 200 and the error inside `result`, so
		// without an explicit check these would read as a genuine empty history and never retry.
		it.each(['slowDown', 'noNetwork', 'internal', 'invalidParams'])(
			'throws for the XRPL error %s instead of reporting an empty history',
			async (error) => {
				mockFetchResponse({ body: { result: { error } } });

				await expect(
					loadXrpTransactions({ address, network: XrpNetworks.mainnet, limit: 10 })
				).rejects.toThrow(`Unexpected XRPL account_tx response: ${error}`);
			}
		);

		// An account that was never funded does not exist on-ledger; it has no history rather than
		// a failed lookup, matching how `loadXrpBalance` treats the same error.
		it('returns an empty list for an account that does not exist', async () => {
			mockFetchResponse({ body: { result: { error: 'actNotFound' } } });

			const page = await loadXrpTransactions({ address, network: XrpNetworks.mainnet, limit: 10 });

			expect(page.transactions).toEqual([]);
			expect(page.marker).toBeUndefined();
		});

		it('returns an empty list when the account has no transactions', async () => {
			mockFetchResponse({ body: { result: {} } });

			const page = await loadXrpTransactions({ address, network: XrpNetworks.mainnet, limit: 10 });

			expect(page.transactions).toEqual([]);
			expect(page.marker).toBeUndefined();
		});

		it('sends an account_tx request over the full ledger range, newest first', async () => {
			const fetchMock = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: () => Promise.resolve({ result: { transactions: [] } })
			});
			vi.stubGlobal('fetch', fetchMock);

			await loadXrpTransactions({ address, network: XrpNetworks.mainnet, limit: 10 });

			const [[, options]] = fetchMock.mock.calls;

			expect(JSON.parse(options.body as string)).toEqual({
				method: 'account_tx',
				params: [
					{
						account: address,
						ledger_index_min: -1,
						ledger_index_max: -1,
						limit: 10,
						forward: false
					}
				]
			});
		});

		it('forwards the pagination marker when provided', async () => {
			const fetchMock = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: () => Promise.resolve({ result: { transactions: [] } })
			});
			vi.stubGlobal('fetch', fetchMock);

			await loadXrpTransactions({
				address,
				network: XrpNetworks.mainnet,
				limit: 10,
				marker: { ledger: 42, seq: 1 }
			});

			const [[, options]] = fetchMock.mock.calls;
			const { params } = JSON.parse(options.body as string);

			expect(params[0].marker).toEqual({ ledger: 42, seq: 1 });
		});
	});
});
