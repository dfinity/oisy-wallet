import { ZERO } from '$lib/constants/app.constants';
import {
	loadXrpAccountInfo,
	loadXrpBalance,
	loadXrpLedgerIndex,
	loadXrpOpenLedgerFee,
	loadXrpTransactionOutcome,
	loadXrpTransactions,
	submitXrpTransaction
} from '$xrp/rest/xrpl.rest';
import { XrpNetworks } from '$xrp/types/network';

describe('xrpl.rest', () => {
	const address = 'rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD';

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

			expect(info).toEqual({ balance: 30_000_000n, sequence: 42, ownerCount: 3 });
		});

		it('defaults the owner count to zero when the account owns nothing', async () => {
			mockFetchResponse({
				body: { result: { account_data: { Balance: '30000000', Sequence: 42 } } }
			});

			const info = await loadXrpAccountInfo({ address, network: XrpNetworks.mainnet });

			expect(info.ownerCount).toBe(0);
		});

		it('throws for an unfunded account', async () => {
			mockFetchResponse({ body: { result: { error: 'actNotFound' } } });

			await expect(loadXrpAccountInfo({ address, network: XrpNetworks.mainnet })).rejects.toThrow(
				'actNotFound'
			);
		});
	});

	describe('loadXrpOpenLedgerFee', () => {
		it('returns the open-ledger fee in drops', async () => {
			mockFetchResponse({ body: { result: { drops: { open_ledger_fee: '15', base_fee: '10' } } } });

			const fee = await loadXrpOpenLedgerFee({ network: XrpNetworks.mainnet, fallbackFee: 10n });

			expect(fee).toBe(15n);
		});

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

	describe('loadXrpTransactionOutcome', () => {
		it('reports the validated flag and the final transaction result', async () => {
			mockFetchResponse({
				body: { result: { validated: true, meta: { TransactionResult: 'tesSUCCESS' } } }
			});

			await expect(
				loadXrpTransactionOutcome({ hash: 'H', network: XrpNetworks.mainnet })
			).resolves.toEqual({ validated: true, transactionResult: 'tesSUCCESS' });
		});

		it('is not validated while the transaction is still pending', async () => {
			mockFetchResponse({ body: { result: { validated: false } } });

			await expect(
				loadXrpTransactionOutcome({ hash: 'H', network: XrpNetworks.mainnet })
			).resolves.toEqual({ validated: false, transactionResult: undefined });
		});

		// A fee-claiming `tec*` transaction is validated too — the result is what decides.
		it('reports a validated failure with its tec result', async () => {
			mockFetchResponse({
				body: { result: { validated: true, meta: { TransactionResult: 'tecUNFUNDED_PAYMENT' } } }
			});

			await expect(
				loadXrpTransactionOutcome({ hash: 'H', network: XrpNetworks.mainnet })
			).resolves.toEqual({ validated: true, transactionResult: 'tecUNFUNDED_PAYMENT' });
		});

		it('tolerates a response without meta', async () => {
			mockFetchResponse({ body: { result: { validated: true } } });

			await expect(
				loadXrpTransactionOutcome({ hash: 'H', network: XrpNetworks.mainnet })
			).resolves.toEqual({ validated: true, transactionResult: undefined });
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
