import { ZERO } from '$lib/constants/app.constants';
import { loadXrpBalance, submitXrpTransaction } from '$xrp/api/xrpl.api';
import { XrpNetworks } from '$xrp/types/network';

describe('xrpl.api', () => {
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
	});

	describe('submitXrpTransaction', () => {
		const txBlob = '1200002280000000';

		it('returns an accepted result for a tesSUCCESS engine result', async () => {
			mockFetchResponse({
				body: {
					result: {
						engine_result: 'tesSUCCESS',
						engine_result_message: 'The transaction was applied.',
						tx_json: { hash: 'ABCDEF' }
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

		it('marks a non-tes/ter engine result as not accepted', async () => {
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
});
