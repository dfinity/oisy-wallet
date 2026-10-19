import type { ActiveUserTransaction, LifiData } from '$declarations/backend/backend.did';
import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { infuraProviders } from '$eth/providers/infura.providers';
import { reloadEthereumBalance } from '$eth/services/eth-balance.services';
import { LIFI_STATUS_UNRESOLVED_PERIOD_MILLIS } from '$lib/constants/swap.constants';
import en from '$lib/i18n/en.json';
import { fetchLifiStatus } from '$lib/rest/lifi.rest';
import * as activeUserTransactionsServices from '$lib/services/active-user-transactions.services';
import { resetEvmSourceTxObservations } from '$lib/services/evm-source-tx.services';
import {
	pollLifiActiveUserTransactions,
	reloadLifiEvmBalances,
	resetLifiActiveTxState
} from '$lib/services/lifi-active-tx.services';
import { LIFI_EXTERNAL_REF_KEYS, type LifiExternalRefKey } from '$lib/types/lifi';
import { consoleError } from '$lib/utils/console.utils';
import { toLifiExternalRefs, toLifiExternalRefsMap } from '$lib/utils/lifi-active-tx.utils';
import {
	mockLifiActiveUserTransaction,
	mockLifiData,
	mockLifiTxHash
} from '$tests/mocks/active-user-transactions.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockLifiBaseUsdcToken } from '$tests/mocks/lifi.mock';
import { ChainId, HTTPError, SDKError, type StatusResponse } from '@lifi/sdk';

vi.mock('$eth/providers/infura.providers', () => ({
	infuraProviders: vi.fn()
}));

vi.mock('$lib/rest/lifi.rest', () => ({
	fetchLifiStatus: vi.fn()
}));

vi.mock('$eth/services/eth-balance.services', () => ({
	reloadEthereumBalance: vi.fn()
}));

vi.mock('$lib/utils/console.utils', () => ({
	consoleError: vi.fn()
}));

describe('lifi-active-tx.services', () => {
	const applySpy = vi.spyOn(activeUserTransactionsServices, 'applyActiveUserTransactionPollUpdate');

	const now = new Date('2026-10-19T12:00:00Z').getTime();

	const confirmedReceipt = { status: 1 };
	const solanaSignature = '5'.repeat(88);

	const buildTx = ({
		refs = toLifiExternalRefsMap(mockLifiActiveUserTransaction.external_refs),
		data = mockLifiData,
		id = mockLifiActiveUserTransaction.id,
		createdAt = now
	}: {
		refs?: Partial<Record<LifiExternalRefKey, string>>;
		data?: LifiData;
		id?: string;
		createdAt?: number;
	} = {}): ActiveUserTransaction => ({
		...mockLifiActiveUserTransaction,
		id,
		data: { Lifi: data },
		external_refs: toLifiExternalRefs(refs),
		created_at_ns: BigInt(createdAt) * 1_000_000n
	});

	const poll = (transactions: ActiveUserTransaction[]) =>
		pollLifiActiveUserTransactions({
			identity: mockIdentity,
			transactions,
			userAddress: mockEthAddress
		});

	const httpError = ({ status, code }: { status: number; code?: number }) => {
		const cause = new HTTPError(new Response('{}', { status }), 'https://li.quest/v1/status', {});

		if (code !== undefined) {
			cause.responseBody = { code, message: '' };
		}

		return new SDKError(cause);
	};

	const lastUpdate = () => applySpy.mock.lastCall?.[0].update;

	const unresolvedKey = (rowId: string) => `lifi-unresolved:${rowId}`;

	let getTransactionReceipt: ReturnType<typeof vi.fn>;
	let getTransactionCountLatest: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(now);

		localStorage.clear();
		resetLifiActiveTxState();
		resetEvmSourceTxObservations();

		applySpy.mockResolvedValue();

		getTransactionReceipt = vi.fn().mockResolvedValue(confirmedReceipt);
		getTransactionCountLatest = vi.fn().mockResolvedValue(7);
		vi.mocked(infuraProviders).mockReturnValue({
			getTransactionReceipt,
			getTransactionCountLatest
		} as unknown as ReturnType<typeof infuraProviders>);

		vi.mocked(fetchLifiStatus).mockResolvedValue({ status: 'PENDING' } as StatusResponse);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('rows it does not poll', () => {
		it('does nothing for an empty list', async () => {
			await poll([]);

			expect(infuraProviders).not.toHaveBeenCalled();
			expect(fetchLifiStatus).not.toHaveBeenCalled();
		});

		it('skips every row without an EVM address', async () => {
			await pollLifiActiveUserTransactions({
				identity: mockIdentity,
				transactions: [buildTx()],
				userAddress: undefined
			});

			expect(getTransactionReceipt).not.toHaveBeenCalled();
			expect(fetchLifiStatus).not.toHaveBeenCalled();
		});

		it('skips a Solana-source row, whose check comes with Solana-source swaps', async () => {
			await poll([
				buildTx({
					data: { ...mockLifiData, source_token: { SolNativeMainnet: null } }
				})
			]);

			expect(getTransactionReceipt).not.toHaveBeenCalled();
			expect(fetchLifiStatus).not.toHaveBeenCalled();
			expect(applySpy).not.toHaveBeenCalled();
		});

		it('reports and skips a row outside the v1 matrix', async () => {
			await poll([buildTx({ data: { ...mockLifiData, dest_token: { SplDevnet: 'mint' } } })]);

			expect(consoleError).toHaveBeenCalledOnce();
			expect(fetchLifiStatus).not.toHaveBeenCalled();
		});

		it('skips a row without its source transaction hash', async () => {
			await poll([buildTx({ refs: { [LIFI_EXTERNAL_REF_KEYS.TX_NONCE]: '7' } })]);

			expect(getTransactionReceipt).not.toHaveBeenCalled();
			expect(fetchLifiStatus).not.toHaveBeenCalled();
		});
	});

	describe('source chain', () => {
		it('marks a row executing while its source transaction is in flight, without asking LI.FI', async () => {
			getTransactionReceipt.mockResolvedValue(null);

			await poll([buildTx()]);

			expect(fetchLifiStatus).not.toHaveBeenCalled();
			expect(lastUpdate()).toEqual({ status: { Executing: null } });
		});

		it('fails a row whose source transaction reverted', async () => {
			getTransactionReceipt.mockResolvedValue({ status: 0 });

			await poll([buildTx()]);

			expect(fetchLifiStatus).not.toHaveBeenCalled();
			expect(lastUpdate()).toEqual({
				status: { Failed: null },
				error: en.swap.error.failed_unexpectedly
			});
		});

		it('fails a row whose source transaction was replaced, only on the second consecutive poll', async () => {
			getTransactionReceipt.mockResolvedValue(null);
			getTransactionCountLatest.mockResolvedValue(8);

			await poll([buildTx()]);

			expect(lastUpdate()).toEqual({ status: { Executing: null } });

			await vi.advanceTimersByTimeAsync(10_000);
			await poll([buildTx()]);

			expect(lastUpdate()).toEqual({
				status: { Failed: null },
				error: en.swap.error.swap_replaced_or_dropped
			});
		});

		it('reads the confirmed nonce from the map shared by the EVM pollers of the tick', async () => {
			getTransactionReceipt.mockResolvedValue(null);

			await pollLifiActiveUserTransactions({
				identity: mockIdentity,
				transactions: [buildTx()],
				userAddress: mockEthAddress,
				confirmedNonceByChainId: new Map([['8453', Promise.resolve(3)]])
			});

			expect(getTransactionCountLatest).not.toHaveBeenCalled();
		});

		it('asks LI.FI once the source transaction is confirmed, with the chains of the row', async () => {
			await poll([buildTx()]);

			expect(fetchLifiStatus).toHaveBeenCalledExactlyOnceWith({
				txHash: mockLifiTxHash,
				fromChain: 8453,
				toChain: ChainId.SOL,
				bridge: 'across'
			});
		});

		it('does not read the receipt again once the source is confirmed', async () => {
			await poll([buildTx()]);
			await vi.advanceTimersByTimeAsync(10_000);
			await poll([buildTx()]);

			expect(getTransactionReceipt).toHaveBeenCalledOnce();
			expect(fetchLifiStatus).toHaveBeenCalledTimes(2);
		});
	});

	describe('LI.FI status', () => {
		it('marks a PENDING transfer executing', async () => {
			await poll([buildTx()]);

			expect(lastUpdate()).toEqual({ status: { Executing: null } });
		});

		it('succeeds a DONE transfer and records its destination hash', async () => {
			vi.mocked(fetchLifiStatus).mockResolvedValue({
				status: 'DONE',
				substatus: 'COMPLETED',
				receiving: { txHash: solanaSignature, chainId: ChainId.SOL }
			} as StatusResponse);

			await poll([buildTx()]);

			const update = lastUpdate();

			expect(update?.status).toEqual({ Succeeded: null });
			expect(update?.error).toBeUndefined();
			expect(toLifiExternalRefsMap(update?.externalRefs ?? [])).toEqual({
				...toLifiExternalRefsMap(mockLifiActiveUserTransaction.external_refs),
				[LIFI_EXTERNAL_REF_KEYS.DEST_TX_HASH]: solanaSignature
			});
		});

		it('records the token actually received on DONE / PARTIAL', async () => {
			vi.mocked(fetchLifiStatus).mockResolvedValue({
				status: 'DONE',
				substatus: 'PARTIAL',
				receiving: {
					txHash: solanaSignature,
					chainId: ChainId.SOL,
					amount: '49875000',
					token: { symbol: 'USDC.e', decimals: 6 }
				}
			} as StatusResponse);

			await poll([buildTx()]);

			const refs = toLifiExternalRefsMap(lastUpdate()?.externalRefs ?? []);

			expect(lastUpdate()?.status).toEqual({ Succeeded: null });
			expect(refs[LIFI_EXTERNAL_REF_KEYS.RECEIVED_SYMBOL]).toBe('USDC.e');
			expect(refs[LIFI_EXTERNAL_REF_KEYS.RECEIVED_AMOUNT]).toBe('49.875');
		});

		it('fails a refunded transfer with the refunded copy', async () => {
			vi.mocked(fetchLifiStatus).mockResolvedValue({
				status: 'DONE',
				substatus: 'REFUNDED'
			} as StatusResponse);

			await poll([buildTx()]);

			expect(lastUpdate()).toEqual({
				status: { Failed: null },
				error: en.swap.error.swap_refunded
			});
		});

		it("fails a FAILED transfer with LI.FI's reason", async () => {
			vi.mocked(fetchLifiStatus).mockResolvedValue({
				status: 'FAILED',
				substatusMessage: 'Slippage too high'
			} as StatusResponse);

			await poll([buildTx()]);

			expect(lastUpdate()).toEqual({ status: { Failed: null }, error: 'Slippage too high' });
		});

		it('re-asks without the bridge when LI.FI answers INVALID, and maps that answer', async () => {
			vi.mocked(fetchLifiStatus)
				.mockResolvedValueOnce({ status: 'INVALID' } as StatusResponse)
				.mockResolvedValueOnce({ status: 'DONE', substatus: 'COMPLETED' } as StatusResponse);

			await poll([buildTx()]);

			expect(fetchLifiStatus).toHaveBeenCalledTimes(2);
			expect(fetchLifiStatus).toHaveBeenLastCalledWith({
				txHash: mockLifiTxHash,
				fromChain: 8453,
				toChain: ChainId.SOL
			});
			expect(lastUpdate()?.status).toEqual({ Succeeded: null });
		});

		it('asks without a bridge from the start when the row has no tool', async () => {
			const refs = toLifiExternalRefsMap(mockLifiActiveUserTransaction.external_refs);
			delete refs[LIFI_EXTERNAL_REF_KEYS.TOOL];

			vi.mocked(fetchLifiStatus).mockResolvedValue({ status: 'INVALID' } as StatusResponse);

			await poll([buildTx({ refs })]);

			expect(fetchLifiStatus).toHaveBeenCalledExactlyOnceWith({
				txHash: mockLifiTxHash,
				fromChain: 8453,
				toChain: ChainId.SOL
			});
		});

		it.each([
			{ case: 'an HTTP 404', error: httpError({ status: 404 }) },
			{ case: 'code 1003 in the body', error: httpError({ status: 400, code: 1003 }) }
		])('reads $case as NOT_FOUND, never as a swallowed error', async ({ error }) => {
			vi.mocked(fetchLifiStatus).mockRejectedValue(error);

			await poll([buildTx()]);

			expect(consoleError).not.toHaveBeenCalled();
			expect(localStorage.getItem(unresolvedKey(mockLifiActiveUserTransaction.id))).not.toBeNull();
		});

		it('leaves a row untouched on any other failure, and still polls the others', async () => {
			const other = buildTx({ id: 'other-row' });

			vi.mocked(fetchLifiStatus)
				.mockRejectedValueOnce(httpError({ status: 500 }))
				.mockResolvedValueOnce({ status: 'DONE', substatus: 'COMPLETED' } as StatusResponse);

			await poll([buildTx(), other]);

			expect(consoleError).toHaveBeenCalledOnce();
			expect(applySpy).toHaveBeenCalledOnce();
			expect(lastUpdate()?.status).toEqual({ Succeeded: null });
		});

		it('reports a status it does not know and leaves the row', async () => {
			vi.mocked(fetchLifiStatus).mockResolvedValue({
				status: 'SOMETHING_NEW'
			} as unknown as StatusResponse);

			await poll([buildTx()]);

			expect(consoleError).toHaveBeenCalledOnce();
			expect(lastUpdate()).toEqual({});
		});
	});

	describe('unresolved status', () => {
		const rowId = mockLifiActiveUserTransaction.id;

		const storeWindow = (window: unknown) =>
			localStorage.setItem(unresolvedKey(rowId), JSON.stringify(window));

		const storedWindow = () => JSON.parse(localStorage.getItem(unresolvedKey(rowId)) ?? 'null');

		beforeEach(() => {
			vi.mocked(fetchLifiStatus).mockResolvedValue({ status: 'NOT_FOUND' } as StatusResponse);
		});

		it('opens a window, without settling the row', async () => {
			await poll([buildTx()]);

			expect(storedWindow()).toEqual({ elapsedMs: 0, lastSeenAt: now });
			expect(lastUpdate()).toEqual({});
		});

		it('adds the time since the last poll', async () => {
			storeWindow({ elapsedMs: 60_000, lastSeenAt: now - 30_000 });

			await poll([buildTx()]);

			expect(storedWindow()).toEqual({ elapsedMs: 90_000, lastSeenAt: now });
		});

		it('fails the row as "outcome unknown" once the window reaches the period', async () => {
			storeWindow({
				elapsedMs: LIFI_STATUS_UNRESOLVED_PERIOD_MILLIS - 30_000,
				lastSeenAt: now - 60_000
			});

			await poll([buildTx()]);

			expect(lastUpdate()).toEqual({
				status: { Failed: null },
				error: en.swap.error.lifi_status_unknown
			});
		});

		it('cannot be hastened by a clock jump: one poll adds at most one capped step', async () => {
			storeWindow({
				elapsedMs: LIFI_STATUS_UNRESOLVED_PERIOD_MILLIS - 3 * 60 * 60 * 1_000,
				lastSeenAt: now - 10 * 60 * 60 * 1_000
			});

			await poll([buildTx()]);

			expect(lastUpdate()).toEqual({});
		});

		it('ignores a stored window that is not one', async () => {
			storeWindow({ elapsedMs: LIFI_STATUS_UNRESOLVED_PERIOD_MILLIS * 2, lastSeenAt: 'yesterday' });

			await poll([buildTx()]);

			expect(storedWindow()).toEqual({ elapsedMs: 0, lastSeenAt: now });
			expect(lastUpdate()).toEqual({});
		});

		it('closes the window on any other answer', async () => {
			storeWindow({ elapsedMs: 60_000, lastSeenAt: now - 30_000 });
			vi.mocked(fetchLifiStatus).mockResolvedValue({ status: 'PENDING' } as StatusResponse);

			await poll([buildTx()]);

			expect(localStorage.getItem(unresolvedKey(rowId))).toBeNull();
		});

		it('drops the window of a row that is no longer pending', async () => {
			storeWindow({ elapsedMs: 60_000, lastSeenAt: now - 30_000 });

			await poll([buildTx({ id: 'another-row' })]);

			expect(localStorage.getItem(unresolvedKey(rowId))).toBeNull();
		});
	});

	describe('cadence', () => {
		it('polls a row again only once its interval has passed', async () => {
			await poll([buildTx()]);
			await vi.advanceTimersByTimeAsync(5_000);
			await poll([buildTx()]);

			expect(fetchLifiStatus).toHaveBeenCalledOnce();

			await vi.advanceTimersByTimeAsync(5_000);
			await poll([buildTx()]);

			expect(fetchLifiStatus).toHaveBeenCalledTimes(2);
		});

		it('polls an older row less often', async () => {
			const tx = buildTx({ createdAt: now - 20 * 60 * 1_000 });

			await poll([tx]);
			await vi.advanceTimersByTimeAsync(30_000);
			await poll([tx]);

			expect(fetchLifiStatus).toHaveBeenCalledOnce();

			await vi.advanceTimersByTimeAsync(30_000);
			await poll([tx]);

			expect(fetchLifiStatus).toHaveBeenCalledTimes(2);
		});
	});

	describe('reloadLifiEvmBalances', () => {
		const sameChainData: LifiData = {
			source_token: { EvmNative: 8453n },
			dest_token: { Erc20: [mockLifiBaseUsdcToken.address, 8453n] },
			amount: 10n
		};

		beforeEach(() => {
			vi.mocked(reloadEthereumBalance).mockResolvedValue({ success: true });
		});

		it('reloads the source token, its gas token and an EVM destination, each once', () => {
			reloadLifiEvmBalances({
				tx: buildTx({ data: sameChainData }),
				tokens: [BASE_ETH_TOKEN, mockLifiBaseUsdcToken]
			});

			expect(reloadEthereumBalance).toHaveBeenCalledTimes(2);
			expect(reloadEthereumBalance).toHaveBeenCalledWith(BASE_ETH_TOKEN);
			expect(reloadEthereumBalance).toHaveBeenCalledWith(mockLifiBaseUsdcToken);
		});

		it('reloads the source and its gas token for a Solana destination', () => {
			reloadLifiEvmBalances({ tx: buildTx(), tokens: [mockLifiBaseUsdcToken] });

			expect(reloadEthereumBalance).toHaveBeenCalledTimes(2);
			expect(reloadEthereumBalance).toHaveBeenCalledWith(mockLifiBaseUsdcToken);
			expect(reloadEthereumBalance).toHaveBeenCalledWith(BASE_ETH_TOKEN);
		});

		it('skips tokens no longer enabled', () => {
			reloadLifiEvmBalances({ tx: buildTx({ data: sameChainData }), tokens: [] });

			expect(reloadEthereumBalance).not.toHaveBeenCalled();
		});
	});
});
