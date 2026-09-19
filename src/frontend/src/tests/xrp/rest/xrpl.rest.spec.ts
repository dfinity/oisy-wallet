import { ZERO } from '$lib/constants/app.constants';
import { XRP_RPC_TIMEOUT_MS } from '$xrp/constants/xrp.constants';
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
			{
				name: 'loadXrpAccountInfo',
				call: () => loadXrpAccountInfo({ address, network, ledgerIndex: 'current' })
			},
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

		// `fetch` has no deadline of its own. A connection that stalls instead of rejecting never
		// settles, and the confirmation loop bounds ATTEMPTS rather than time — so one hung request
		// suspends the whole send and `sendXrp` never rejects with the blob a retry needs.
		//
		// The signal is substituted rather than waited out: vitest's fake timers do not drive
		// `AbortSignal.timeout`, and the real one would make this an eight-second test. Aborting a
		// controller by hand exercises the same three links — the deadline reaches
		// `AbortSignal.timeout`, its signal reaches `fetch`, and an abort surfaces as a rejection.
		describe('the request deadline', () => {
			let controller: AbortController;

			beforeEach(() => {
				controller = new AbortController();
				vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);

				// Answers only when its signal aborts, so a missing signal hangs the test rather than
				// passing it.
				vi.stubGlobal(
					'fetch',
					vi.fn((...[, init]: Parameters<typeof fetch>) => {
						const signal = (init as RequestInit | undefined)?.signal;

						return new Promise((_resolve, reject) => {
							signal?.addEventListener('abort', () => reject(signal.reason));
						});
					})
				);
			});

			afterEach(() => {
				vi.restoreAllMocks();
			});

			it.each(callers)('$name aborts a stalled request', async ({ call }) => {
				const outcome = call().then(
					() => 'resolved',
					(err: unknown) => (err as Error).name
				);

				controller.abort(new DOMException('The operation timed out.', 'TimeoutError'));

				await expect(outcome).resolves.toBe('TimeoutError');
			});

			// Two ledger closes. Longer and a hung request outlives the poll it belongs to; shorter
			// and a healthy node under load loses attempts it should have been given.
			it('asks for the configured deadline and not some other figure', () => {
				void loadXrpLedgerIndex({ network }).catch(() => undefined);

				expect(AbortSignal.timeout).toHaveBeenCalledWith(XRP_RPC_TIMEOUT_MS);

				controller.abort(new DOMException('The operation timed out.', 'TimeoutError'));
			});
		});

		// `z.never().optional()` on `error` rather than a strict object: the configured provider is a
		// Clio endpoint and every response it sends carries these beside the result, with a warning
		// on literally every call. Rejecting unknown keys wholesale would reject them all.
		it('accepts the top-level keys a real provider sends', async () => {
			mockFetchResponse({
				body: {
					result: { ledger_current_index: 5 },
					status: 'success',
					type: 'response',
					forwarded: true,
					warnings: [{ id: 2001, message: 'This is a clio server.' }]
				}
			});

			await expect(loadXrpLedgerIndex({ network })).resolves.toBe(5);
		});

		// `result.status` is on every real response and was previously ignored, so a FAILED response
		// could still deliver a plausible result: the method schemas strip `status` as an unknown
		// key, and a bogus `ledger_current_index` beside `status: 'error'` came back as an index.
		describe('the result status', () => {
			it.each([
				{
					name: 'an error status with no code',
					result: { status: 'error', ledger_current_index: 999_999_999 },
					message: 'error status without an error code'
				},
				{
					name: 'an error status with a non-string code',
					result: { status: 'error', error: ['tooBusy'] },
					message: 'error status without an error code'
				},
				{
					name: 'a success status carrying an error',
					result: { status: 'success', error: 'tooBusy' },
					message: 'success status with error'
				},
				{
					name: 'a status that is neither',
					result: { status: 'pending', ledger_current_index: 5 },
					message: 'invalid status pending'
				}
			])('rejects $name', async ({ result, message }) => {
				mockFetchResponse({ body: { result } });

				await expect(loadXrpLedgerIndex({ network })).rejects.toThrow(message);
			});

			it('accepts a success status', async () => {
				mockFetchResponse({ body: { result: { status: 'success', ledger_current_index: 5 } } });

				await expect(loadXrpLedgerIndex({ network })).resolves.toBe(5);
			});

			// The regression this could most easily introduce. Both expected states arrive with
			// `status: 'error'` — verified against the configured endpoint — so the success-with-error
			// check must not touch them, or every absence lookup would throw and expiry detection
			// would go with it.
			it('still reads actNotFound as an expected state', async () => {
				mockFetchResponse({ body: { result: { status: 'error', error: 'actNotFound' } } });

				await expect(loadXrpBalance({ address, network })).resolves.toBe(ZERO);
			});

			it('still reads a fully searched txnNotFound as absence', async () => {
				mockFetchResponse({
					body: { result: { status: 'error', error: 'txnNotFound', searched_all: true } }
				});

				await expect(
					loadXrpTransactionOutcome({
						hash: 'H',
						network,
						firstLedgerSequence: 1000,
						lastLedgerSequence: 1020
					})
				).resolves.toEqual({ state: 'absent' });
			});
		});

		describe.each(callers)('$name', ({ call }) => {
			it.each([{}, { result: null }, { jsonrpc: '2.0' }])(
				'names the missing result object for the body %j',
				async (body) => {
					mockFetchResponse({ body });

					await expect(call()).rejects.toThrow('no result object');
				}
			);

			// A top-level `error` is the node reporting on the call rather than on the ledger, so it
			// is surfaced as the code it is. "No result object" would name the wrong problem — and for
			// the both-keys body below it would be plainly false.
			it.each([
				{ jsonrpc: '2.0', error: 'gateway' },
				{ error: 'gateway', result: { ledger_current_index: 999_999_999 } }
			])('reports the top-level error for the body %j', async (body) => {
				mockFetchResponse({ body });

				const failure = await call().catch((err: unknown) => err);

				expect(failure).toBeInstanceOf(XrplRpcError);
				expect((failure as XrplRpcError).error).toBe('gateway');
			});

			// The whole point of the both-keys case: zod strips unknown keys, so this parsed with the
			// error dropped and the helpers — which inspect `result.error`, a different field — got a
			// bogus ledger index from a FAILED response. Past `LastLedgerSequence` that is read as
			// established non-inclusion, which is the answer that invites a second payment.
			it('does not deliver a result that came with a top-level error', async () => {
				mockFetchResponse({
					body: { error: 'gateway', result: { ledger_current_index: 999_999_999 } }
				});

				await expect(call()).rejects.toThrow();
			});

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
		// Bound to the address asked for, like the full snapshot. This read cannot cause a bad send —
		// `sendXrp` reads its own figures through `loadXrpAccountInfo` — but it is the balance the
		// user sees and decides on, and it was the only unbound read left on this path.
		it('throws when the snapshot is for a different account', async () => {
			mockFetchResponse({
				body: {
					result: {
						account_data: { Account: 'rDsbeomae4FXwgQTJp9Rs64Qg9vDiTCdBv', Balance: '25000000' }
					}
				}
			});

			await expect(loadXrpBalance({ address, network })).rejects.toThrow(
				'answered for rDsbeomae4FXwgQTJp9Rs64Qg9vDiTCdBv'
			);
		});

		// A classic address is base58 over a checksummed payload, so case is significant and two
		// forms differing only in case are not the same account.
		it('throws for an address differing only in case', async () => {
			mockFetchResponse({
				body: { result: { account_data: { Account: address.toUpperCase(), Balance: '1' } } }
			});

			await expect(loadXrpBalance({ address, network })).rejects.toThrow('answered for');
		});

		// The unfunded answer carries no `account_data` to bind, and still maps to zero.
		it('still maps actNotFound to a zero balance', async () => {
			mockFetchResponse({ body: { result: { error: 'actNotFound' } } });

			await expect(loadXrpBalance({ address, network })).resolves.toBe(ZERO);
		});

		it('returns the balance in drops as a bigint', async () => {
			mockFetchResponse({
				body: { result: { account_data: { Account: address, Balance: '25000000' } } }
			});

			const balance = await loadXrpBalance({ address, network: XrpNetworks.mainnet });

			expect(balance).toBe(25_000_000n);
		});

		it('sends an account_info request for the validated ledger', async () => {
			const fetchMock = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: () =>
					Promise.resolve({ result: { account_data: { Account: address, Balance: '1' } } })
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
				body: { result: { account_data: { Account: address, Balance: '1' }, error: 'actNotFound' } }
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
				mockFetchResponse({ body: { result: { account_data: { Account: address, Balance } } } });

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

	// The two account reads deliberately ask different ledgers, and a later tidy-up unifying them
	// would break one or the other: the sequence has to come from the OPEN ledger or a transaction
	// already in it leaves this one signing a consumed sequence, while the displayed balance has to
	// come from the VALIDATED one or the figure shown can roll back.
	describe('which ledger each account read asks for', () => {
		const ledgerIndexOf = (): unknown =>
			JSON.parse(String((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body)).params[0]
				.ledger_index;

		it.each(['current', 'validated'] as const)(
			'asks for the %s ledger when told to',
			async (ledgerIndex) => {
				mockFetchResponse({
					body: {
						result: {
							account_data: { Account: address, Balance: '1', Sequence: 1, OwnerCount: 0, Flags: 0 }
						}
					}
				});

				await loadXrpAccountInfo({ address, network, ledgerIndex });

				expect(ledgerIndexOf()).toBe(ledgerIndex);
			}
		);

		it('asks the validated ledger for the display balance', async () => {
			mockFetchResponse({ body: { result: { account_data: { Account: address, Balance: '1' } } } });

			await loadXrpBalance({ address, network });

			expect(ledgerIndexOf()).toBe('validated');
		});
	});

	describe('loadXrpAccountInfo', () => {
		it('returns the balance and sequence for a funded account', async () => {
			mockFetchResponse({
				body: {
					result: {
						account_data: {
							Account: address,
							Balance: '30000000',
							Sequence: 42,
							OwnerCount: 3,
							Flags: 0
						}
					}
				}
			});

			const info = await loadXrpAccountInfo({
				address,
				network: XrpNetworks.mainnet,
				ledgerIndex: 'current'
			});

			expect(info).toEqual({
				balance: 30_000_000n,
				sequence: 42,
				ownerCount: 3,
				flags: 0
			});
		});

		// The answer has to be about the account that was asked for. Nothing else in the response
		// identifies it, so a stale or misrouted snapshot is otherwise read as this account's state
		// — and each field then misleads a different guard: a foreign `Sequence` signs a payment the
		// ledger answers `terPRE_SEQ`, and foreign reserve inputs end in `tecUNFUNDED_PAYMENT`,
		// which claims the fee.
		describe('the account the snapshot is about', () => {
			const accountData = {
				Account: address,
				Balance: '30000000',
				Sequence: 42,
				OwnerCount: 3,
				Flags: 131_072
			};

			it('throws when the node answers for a different account', async () => {
				mockFetchResponse({
					body: {
						result: {
							account_data: { ...accountData, Account: 'rDsbeomae4FXwgQTJp9Rs64Qg9vDiTCdBv' }
						}
					}
				});

				await expect(
					loadXrpAccountInfo({ address, network: XrpNetworks.mainnet, ledgerIndex: 'current' })
				).rejects.toThrow('answered for rDsbeomae4FXwgQTJp9Rs64Qg9vDiTCdBv');
			});

			// A classic address is base58 over a checksummed payload, so case is significant —
			// unlike the hex transaction hash, which is compared case-insensitively.
			it('throws for an account that differs from the requested one only in case', async () => {
				mockFetchResponse({
					body: { result: { account_data: { ...accountData, Account: address.toUpperCase() } } }
				});

				await expect(
					loadXrpAccountInfo({ address, network: XrpNetworks.mainnet, ledgerIndex: 'current' })
				).rejects.toThrow(`answered for ${address.toUpperCase()}`);
			});

			// Omitted rather than wrong: an AccountRoot always carries it, and accepting the omission
			// would leave the comparison above skippable by leaving the field out.
			it.each([undefined, null, 42, {}])('throws for an account of %j', async (Account) => {
				mockFetchResponse({
					body: { result: { account_data: { ...accountData, Account } } }
				});

				await expect(
					loadXrpAccountInfo({ address, network: XrpNetworks.mainnet, ledgerIndex: 'current' })
				).rejects.toThrow('Unexpected XRPL account_info response');
			});

			// The identity check must not cost the typed absence answer the destination read depends
			// on: `actNotFound` carries no `account_data` to compare.
			it('still reports an unfunded account as absent rather than as a mismatch', async () => {
				mockFetchResponse({ body: { result: { error: 'actNotFound' } } });

				await expect(
					loadXrpAccountInfo({ address, network: XrpNetworks.mainnet, ledgerIndex: 'current' })
				).rejects.toBeInstanceOf(XrpAccountNotFoundError);
			});
		});

		// The send path reads `lsfRequireDestTag` out of these bits, so dropping them at the
		// boundary would leave an untagged payment to be applied as `tecDST_TAG_NEEDED`.
		it('returns the account flags when the node reports them', async () => {
			mockFetchResponse({
				body: {
					result: {
						account_data: {
							Account: address,
							Balance: '30000000',
							Sequence: 42,
							OwnerCount: 3,
							Flags: 131_072
						}
					}
				}
			});

			const info = await loadXrpAccountInfo({
				address,
				network: XrpNetworks.mainnet,
				ledgerIndex: 'current'
			});

			expect(info.flags).toBe(131_072);
		});

		// `Flags` is a mandatory AccountRoot field, so its absence describes a malformed response
		// rather than an account with nothing to say. Accepting the omission made it the ONE
		// reading that spends a fee: the send path takes unknown flags as no requirement and lets
		// an untagged payment through to `tecDST_TAG_NEEDED`.
		it('throws when the node omits the flags', async () => {
			mockFetchResponse({
				body: {
					result: {
						account_data: { Account: address, Balance: '30000000', Sequence: 42, OwnerCount: 3 }
					}
				}
			});

			await expect(
				loadXrpAccountInfo({ address, network: XrpNetworks.mainnet, ledgerIndex: 'current' })
			).rejects.toThrow('Unexpected XRPL account_info response');
		});

		// Zero is a positive answer, not an absent one: it is what an account with no flags set
		// actually reports.
		it('returns zero flags as zero rather than as unknown', async () => {
			mockFetchResponse({
				body: {
					result: {
						account_data: {
							Account: address,
							Balance: '30000000',
							Sequence: 42,
							OwnerCount: 3,
							Flags: 0
						}
					}
				}
			});

			const info = await loadXrpAccountInfo({
				address,
				network: XrpNetworks.mainnet,
				ledgerIndex: 'current'
			});

			expect(info.flags).toBe(0);
		});

		it('returns a zero owner count when the account owns nothing', async () => {
			mockFetchResponse({
				body: {
					result: {
						account_data: {
							Account: address,
							Balance: '30000000',
							Sequence: 42,
							OwnerCount: 0,
							Flags: 0
						}
					}
				}
			});

			const info = await loadXrpAccountInfo({
				address,
				network: XrpNetworks.mainnet,
				ledgerIndex: 'current'
			});

			expect(info.ownerCount).toBe(0);
		});

		// A negative owner count would LOWER the reserve and inflate the sendable maximum; a
		// fractional one throws inside `BigInt()` with an opaque RangeError. Both are rejected at
		// the boundary, along with the non-numeric forms.
		it.each([undefined, '3', null, {}, -1, 1.5, Number.MAX_SAFE_INTEGER + 2])(
			'throws for an owner count of %j',
			async (OwnerCount) => {
				mockFetchResponse({
					body: {
						result: {
							account_data: {
								Account: address,
								Balance: '30000000',
								Sequence: 42,
								OwnerCount,
								Flags: 0
							}
						}
					}
				});

				await expect(
					loadXrpAccountInfo({ address, network: XrpNetworks.mainnet, ledgerIndex: 'current' })
				).rejects.toThrow('Unexpected XRPL account_info response');
			}
		);

		it.each([undefined, '42', null, -1, 1.5])('throws for a sequence of %j', async (Sequence) => {
			mockFetchResponse({
				body: {
					result: {
						account_data: {
							Account: address,
							Balance: '30000000',
							Sequence,
							OwnerCount: 0,
							Flags: 0
						}
					}
				}
			});

			await expect(
				loadXrpAccountInfo({ address, network: XrpNetworks.mainnet, ledgerIndex: 'current' })
			).rejects.toThrow('Unexpected XRPL account_info response');
		});

		// `BigInt` would accept all of these and hand back a plausible-looking balance.
		it.each(['-1', '0x10', '1.5', '1e3', ' 1', '', 30_000_000])(
			'throws for a balance of %j',
			async (Balance) => {
				mockFetchResponse({
					body: {
						result: {
							account_data: { Account: address, Balance, Sequence: 42, OwnerCount: 0, Flags: 0 }
						}
					}
				});

				await expect(
					loadXrpAccountInfo({ address, network: XrpNetworks.mainnet, ledgerIndex: 'current' })
				).rejects.toThrow('Unexpected XRPL account_info response');
			}
		);

		// Typed, so a caller can tell "this account owns nothing" from a node that could not answer.
		// A zero balance cannot carry that meaning: the transaction cost can drain an existing
		// account to nothing and it still exists on-ledger.
		it('throws a typed error for an unfunded account', async () => {
			mockFetchResponse({ body: { result: { error: 'actNotFound' } } });

			await expect(
				loadXrpAccountInfo({ address, network: XrpNetworks.mainnet, ledgerIndex: 'current' })
			).rejects.toBeInstanceOf(XrpAccountNotFoundError);
		});

		// Absence is decided AFTER the parse, so a response claiming both must not be read as
		// absence. It used to be: the pre-parse check threw the typed error and `Flags` were
		// discarded, which in `sendXrp` leaves the destination `absent` — ignored above the reserve,
		// so the required-destination-tag guard never fires and the payment takes
		// `tecDST_TAG_NEEDED`.
		it('rejects a response carrying both actNotFound and account_data as malformed', async () => {
			mockFetchResponse({
				body: {
					result: {
						error: 'actNotFound',
						account_data: {
							Account: address,
							Balance: '30000000',
							Sequence: 42,
							OwnerCount: 3,
							Flags: 131_072
						}
					}
				}
			});

			const failure = await loadXrpAccountInfo({
				address,
				network: XrpNetworks.mainnet,
				ledgerIndex: 'current'
			}).catch((err: unknown) => err);

			expect(failure).not.toBeInstanceOf(XrpAccountNotFoundError);
			expect(failure).toBeInstanceOf(Error);
			expect((failure as Error).message).toContain('Unexpected XRPL account_info response');
		});

		it.each(['tooBusy', 'noNetwork'])(
			'throws an untyped error for the operational failure %s',
			async (error) => {
				mockFetchResponse({ body: { result: { error } } });

				const err = await loadXrpAccountInfo({
					address,
					network: XrpNetworks.mainnet,
					ledgerIndex: 'current'
				}).catch((e: unknown) => e);

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

		// What the configured provider actually sends: both forms, in one response, the nested one
		// quoted. Mutually exclusive branches would therefore reject every real response.
		it('accepts both forms when they agree', async () => {
			mockFetchResponse({
				body: {
					result: {
						validated: true,
						ledger_index: 107_065_791,
						ledger: { ledger_index: '107065791' }
					}
				}
			});

			await expect(loadXrpValidatedLedgerIndex({ network: XrpNetworks.mainnet })).resolves.toBe(
				107_065_791
			);
		});

		// A union took the first branch that parsed and stripped the other as an unknown key, so two
		// contradictory indices were accepted and the top-level one read. A high index past
		// `LastLedgerSequence` is what makes confirmation declare expiry and call a resend safe.
		it.each([
			{ top: 999_999_999, nested: '5' },
			{ top: 5, nested: '999999999' }
		])('rejects a top-level $top disagreeing with a nested $nested', async ({ top, nested }) => {
			mockFetchResponse({
				body: { result: { validated: true, ledger_index: top, ledger: { ledger_index: nested } } }
			});

			await expect(loadXrpValidatedLedgerIndex({ network: XrpNetworks.mainnet })).rejects.toThrow(
				'missing validated ledger_index'
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

		// `validated` and `meta` were forbidden by name, but zod strips every OTHER unknown key —
		// so a payload claiming absence while carrying the transaction itself still parsed as
		// absence, which past `LastLedgerSequence` becomes `XrpSendExpiredError` and a resend the
		// caller is told is safe. These are the three ways a `tx` result reports the transaction.
		it.each([
			{ name: 'a hash', extra: { hash: 'H' } },
			{ name: 'a tx payload', extra: { tx: { TransactionType: 'Payment' } } },
			{ name: 'a tx_json payload', extra: { tx_json: { TransactionType: 'Payment' } } }
		])('refuses an absence that also carries $name', async ({ extra }) => {
			mockFetchResponse({
				body: { result: { error: 'txnNotFound', searched_all: true, ...extra } }
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

		// The keys a real `txnNotFound` from the configured endpoint actually carries. Forbidding
		// the contradicting fields above must not turn these into a rejection, or every genuine
		// absence would throw and expiry detection would go with it.
		it('still reads a real provider txnNotFound as absence', async () => {
			mockFetchResponse({
				body: {
					result: {
						error: 'txnNotFound',
						error_code: 29,
						error_message: 'Transaction not found.',
						searched_all: true,
						request: { method: 'tx', params: [{ transaction: 'H' }] },
						status: 'error',
						type: 'response'
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
			).resolves.toEqual({ state: 'absent' });
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
