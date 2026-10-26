import type { ActiveUserTransaction, LifiData } from '$declarations/backend/backend.did';
import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
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
import { getSignatureStatus, isBlockhashValid } from '$sol/api/solana.api';
import { resetSolSourceTxObservations } from '$sol/services/sol-source-tx.services';
import { SolanaNetworks } from '$sol/types/network';
import type { SolanaSignatureStatus } from '$sol/types/sol-rpc';
import {
	mockLifiActiveUserTransaction,
	mockLifiData,
	mockLifiTxHash
} from '$tests/mocks/active-user-transactions.mock';
import { mockValidErc1155Token } from '$tests/mocks/erc1155-tokens.mock';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockLifiBaseUsdcToken } from '$tests/mocks/lifi.mock';
import { ChainId, HTTPError, SDKError, type StatusResponse } from '@lifi/sdk';
import type { MockInstance } from 'vitest';

vi.mock('$eth/providers/infura.providers', () => ({
	infuraProviders: vi.fn()
}));

vi.mock('$sol/api/solana.api', () => ({
	getSignatureStatus: vi.fn(),
	isBlockhashValid: vi.fn()
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

	// Base ETH → Base USDC.
	const sameChainData: LifiData = {
		source_token: { EvmNative: 8453n },
		dest_token: { Erc20: [mockLifiBaseUsdcToken.address, 8453n] },
		amount: 10n
	};

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
		resetSolSourceTxObservations();

		applySpy.mockResolvedValue(true);

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

		it('skips every EVM-source row without an EVM address', async () => {
			await pollLifiActiveUserTransactions({
				identity: mockIdentity,
				transactions: [buildTx()],
				userAddress: undefined
			});

			expect(getTransactionReceipt).not.toHaveBeenCalled();
			expect(fetchLifiStatus).not.toHaveBeenCalled();
		});

		it('polls an EVM-source row skipped without an address once the address is there', async () => {
			await pollLifiActiveUserTransactions({
				identity: mockIdentity,
				transactions: [buildTx()],
				userAddress: undefined
			});
			await poll([buildTx()]);

			expect(getTransactionReceipt).toHaveBeenCalledOnce();
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

		describe('a same-chain swap', () => {
			it('succeeds from its confirmed receipt, without asking LI.FI', async () => {
				await poll([buildTx({ data: sameChainData })]);

				expect(fetchLifiStatus).not.toHaveBeenCalled();
				expect(lastUpdate()).toEqual({ status: { Succeeded: null } });
			});

			it('fails from its reverted receipt, as any other', async () => {
				getTransactionReceipt.mockResolvedValue({ status: 0 });

				await poll([buildTx({ data: sameChainData })]);

				expect(fetchLifiStatus).not.toHaveBeenCalled();
				expect(lastUpdate()?.status).toEqual({ Failed: null });
			});
		});
	});

	describe('a Solana source', () => {
		const blockhash = 'HSR6rNUUeh6Grf2mVzP6u33wEfvXeLt7rNaTqkQoFLtN';

		// SOL → USDC on Solana.
		const solanaData: LifiData = {
			source_token: { SolNativeMainnet: null },
			dest_token: { SplMainnet: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
			amount: 10n
		};

		const solanaRefs: Partial<Record<LifiExternalRefKey, string>> = {
			[LIFI_EXTERNAL_REF_KEYS.TX_HASH]: solanaSignature,
			[LIFI_EXTERNAL_REF_KEYS.BLOCKHASH]: blockhash,
			[LIFI_EXTERNAL_REF_KEYS.TOOL]: 'jupiter'
		};

		const solanaTx = (refs = solanaRefs) => buildTx({ data: solanaData, refs });

		const status = (overrides: Partial<NonNullable<SolanaSignatureStatus>> = {}) =>
			({
				confirmationStatus: 'confirmed',
				confirmations: 3n,
				err: null,
				slot: 100n,
				status: { Ok: null },
				...overrides
			}) as SolanaSignatureStatus;

		beforeEach(() => {
			vi.mocked(getSignatureStatus).mockResolvedValue(status());
			vi.mocked(isBlockhashValid).mockResolvedValue(true);
		});

		it('reads the status of its signature on Solana mainnet, not an EVM receipt', async () => {
			await poll([solanaTx()]);

			expect(getSignatureStatus).toHaveBeenCalledExactlyOnceWith({
				signature: solanaSignature,
				network: SolanaNetworks.mainnet
			});
			expect(infuraProviders).not.toHaveBeenCalled();
		});

		it('is polled without an EVM address', async () => {
			await pollLifiActiveUserTransactions({
				identity: mockIdentity,
				transactions: [solanaTx()],
				userAddress: undefined
			});

			expect(getSignatureStatus).toHaveBeenCalledOnce();
			expect(lastUpdate()).toEqual({ status: { Succeeded: null } });
		});

		it('succeeds a Solana swap from its confirmed status, without asking LI.FI', async () => {
			await poll([solanaTx()]);

			expect(fetchLifiStatus).not.toHaveBeenCalled();
			expect(lastUpdate()).toEqual({ status: { Succeeded: null } });
		});

		it('does not read the status again once the source is confirmed', async () => {
			applySpy.mockResolvedValueOnce(false);

			await poll([solanaTx()]);
			await vi.advanceTimersByTimeAsync(10_000);
			await poll([solanaTx()]);

			expect(getSignatureStatus).toHaveBeenCalledOnce();
			expect(lastUpdate()).toEqual({ status: { Succeeded: null } });
		});

		it('marks a row executing while its transaction is only processed', async () => {
			vi.mocked(getSignatureStatus).mockResolvedValue(status({ confirmationStatus: 'processed' }));

			await poll([solanaTx()]);

			expect(isBlockhashValid).not.toHaveBeenCalled();
			expect(lastUpdate()).toEqual({ status: { Executing: null } });
		});

		it('marks a row executing while its transaction has no status and its blockhash is valid', async () => {
			vi.mocked(getSignatureStatus).mockResolvedValue(null);

			await poll([solanaTx()]);

			expect(isBlockhashValid).toHaveBeenCalledExactlyOnceWith({
				blockhash,
				network: SolanaNetworks.mainnet
			});
			expect(lastUpdate()).toEqual({ status: { Executing: null } });
		});

		it('fails a row whose transaction was confirmed with an error', async () => {
			vi.mocked(getSignatureStatus).mockResolvedValue(
				status({ err: { InstructionError: [3, { Custom: 6001 }] } })
			);

			await poll([solanaTx()]);

			expect(lastUpdate()).toEqual({
				status: { Failed: null },
				error: en.swap.error.failed_unexpectedly
			});
		});

		it('fails a row whose blockhash expired without it landing, only on the second consecutive poll', async () => {
			vi.mocked(getSignatureStatus).mockResolvedValue(null);
			vi.mocked(isBlockhashValid).mockResolvedValue(false);

			await poll([solanaTx()]);

			expect(lastUpdate()).toEqual({ status: { Executing: null } });

			await vi.advanceTimersByTimeAsync(10_000);
			await poll([solanaTx()]);

			expect(lastUpdate()).toEqual({
				status: { Failed: null },
				error: en.swap.error.swap_expired
			});
		});

		it('succeeds a row whose transaction landed just before its blockhash aged out', async () => {
			vi.mocked(getSignatureStatus).mockResolvedValueOnce(null);
			vi.mocked(isBlockhashValid).mockResolvedValue(false);

			await poll([solanaTx()]);
			await vi.advanceTimersByTimeAsync(10_000);
			await poll([solanaTx()]);

			expect(lastUpdate()).toEqual({ status: { Succeeded: null } });
		});

		it('reports and skips a row without its blockhash', async () => {
			await poll([solanaTx({ [LIFI_EXTERNAL_REF_KEYS.TX_HASH]: solanaSignature })]);

			expect(consoleError).toHaveBeenCalledOnce();
			expect(getSignatureStatus).not.toHaveBeenCalled();
			expect(applySpy).not.toHaveBeenCalled();
		});

		it('leaves a row untouched when the node fails, and polls it again later', async () => {
			vi.mocked(getSignatureStatus).mockRejectedValueOnce(new Error('rpc down'));

			await poll([solanaTx()]);

			expect(applySpy).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(10_000);
			await poll([solanaTx()]);

			expect(lastUpdate()).toEqual({ status: { Succeeded: null } });
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
				[LIFI_EXTERNAL_REF_KEYS.DEST_TX_HASH]: solanaSignature,
				[LIFI_EXTERNAL_REF_KEYS.SUBSTATUS]: 'COMPLETED'
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

		it('sends the status it read with refs that do not advance it, so that a stale write is refused', async () => {
			vi.mocked(fetchLifiStatus).mockResolvedValue({
				status: 'PENDING',
				receiving: { txHash: solanaSignature, chainId: ChainId.SOL }
			} as StatusResponse);

			await poll([{ ...buildTx(), status: { Executing: null } }]);

			const update = lastUpdate();

			// Should another tab have settled the row meanwhile, `Executing` is an illegal transition
			// and the backend refuses the whole write, rather than replacing the settled row's refs.
			expect(update?.status).toEqual({ Executing: null });
			expect(
				toLifiExternalRefsMap(update?.externalRefs ?? [])[LIFI_EXTERNAL_REF_KEYS.DEST_TX_HASH]
			).toBe(solanaSignature);
		});

		it('fails a refunded transfer with the refunded copy, recording how it ended', async () => {
			vi.mocked(fetchLifiStatus).mockResolvedValue({
				status: 'DONE',
				substatus: 'REFUNDED'
			} as StatusResponse);

			await poll([buildTx()]);

			const update = lastUpdate();

			expect(update?.status).toEqual({ Failed: null });
			expect(update?.error).toBe(en.swap.error.swap_refunded);
			expect(
				toLifiExternalRefsMap(update?.externalRefs ?? [])[LIFI_EXTERNAL_REF_KEYS.SUBSTATUS]
			).toBe('REFUNDED');
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

		it('asks without the refused tool from then on', async () => {
			vi.mocked(fetchLifiStatus)
				.mockResolvedValueOnce({ status: 'INVALID' } as StatusResponse)
				.mockResolvedValue({ status: 'NOT_FOUND' } as StatusResponse);

			await poll([buildTx()]);
			await vi.advanceTimersByTimeAsync(10_000);
			await poll([buildTx()]);

			expect(fetchLifiStatus).toHaveBeenCalledTimes(3);
			expect(fetchLifiStatus).toHaveBeenLastCalledWith({
				txHash: mockLifiTxHash,
				fromChain: 8453,
				toChain: ChainId.SOL
			});
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

			expect(storedWindow()).toEqual({ elapsedMs: 0 });
			expect(lastUpdate()).toEqual({});
		});

		it('adds the time between the polls of a session', async () => {
			await poll([buildTx()]);
			await vi.advanceTimersByTimeAsync(60_000);
			await poll([buildTx()]);

			expect(storedWindow()).toEqual({ elapsedMs: 60_000 });
		});

		it('resumes a stored window after a reload, without adding to it', async () => {
			storeWindow({ elapsedMs: 60_000 });

			await poll([buildTx()]);

			expect(storedWindow()).toEqual({ elapsedMs: 60_000 });
		});

		it('fails the row as "outcome unknown" once the window reaches the period', async () => {
			storeWindow({ elapsedMs: LIFI_STATUS_UNRESOLVED_PERIOD_MILLIS - 30_000 });

			await poll([buildTx()]);

			expect(lastUpdate()).toEqual({});

			await vi.advanceTimersByTimeAsync(60_000);
			await poll([buildTx()]);

			expect(lastUpdate()).toEqual({
				status: { Failed: null },
				error: en.swap.error.lifi_status_unknown
			});
			expect(localStorage.getItem(unresolvedKey(rowId))).toBeNull();
		});

		it('cannot be hastened by a forward correction of the system clock', async () => {
			storeWindow({ elapsedMs: LIFI_STATUS_UNRESOLVED_PERIOD_MILLIS - 90_000 });

			await poll([buildTx()]);
			await vi.advanceTimersByTimeAsync(60_000);

			// The system clock jumps an hour ahead; the monotonic clock does not.
			vi.setSystemTime(Date.now() + 60 * 60 * 1_000);

			await poll([buildTx()]);

			expect(storedWindow()).toEqual({ elapsedMs: LIFI_STATUS_UNRESOLVED_PERIOD_MILLIS - 30_000 });
			expect(lastUpdate()).toEqual({});
		});

		describe('with a full storage', () => {
			let setItem: MockInstance<Storage['setItem']>;

			beforeEach(() => {
				storeWindow({ elapsedMs: LIFI_STATUS_UNRESOLVED_PERIOD_MILLIS - 150_000 });

				setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
					throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
				});
			});

			afterEach(() => {
				setItem.mockRestore();
			});

			it('keeps counting in memory', async () => {
				const tx = buildTx({ createdAt: now - 20 * 60 * 1_000 });

				// Resumed from the stale stored window, every poll would add nothing.
				await poll([tx]);
				await vi.advanceTimersByTimeAsync(60_000);
				await poll([tx]);
				await vi.advanceTimersByTimeAsync(60_000);
				await poll([tx]);

				expect(lastUpdate()).toEqual({});

				await vi.advanceTimersByTimeAsync(60_000);
				await poll([tx]);

				expect(lastUpdate()).toEqual({
					status: { Failed: null },
					error: en.swap.error.lifi_status_unknown
				});
			});
		});

		it('ignores a stored window that is not one', async () => {
			storeWindow({ elapsedMs: `${LIFI_STATUS_UNRESOLVED_PERIOD_MILLIS * 2}` });

			await poll([buildTx()]);

			expect(storedWindow()).toEqual({ elapsedMs: 0 });
			expect(lastUpdate()).toEqual({});
		});

		it('closes the window on any other answer', async () => {
			storeWindow({ elapsedMs: 60_000 });
			vi.mocked(fetchLifiStatus).mockResolvedValue({ status: 'PENDING' } as StatusResponse);

			await poll([buildTx()]);

			expect(localStorage.getItem(unresolvedKey(rowId))).toBeNull();
		});

		it('drops the window of a row that is no longer pending', async () => {
			await poll([buildTx()]);

			expect(storedWindow()).toEqual({ elapsedMs: 0 });

			await poll([buildTx({ id: 'another-row' })]);

			expect(localStorage.getItem(unresolvedKey(rowId))).toBeNull();
		});

		// Rows another tab opened since this one loaded, or another principal's, are missing from
		// this tab's pending set without being settled.
		it('keeps the stored window of a row this tab does not keep', async () => {
			storeWindow({ elapsedMs: 60_000 });

			await poll([buildTx({ id: 'another-row' })]);

			expect(storedWindow()).toEqual({ elapsedMs: 60_000 });
		});

		it('repeats the verdict when its write failed, rather than opening a new window', async () => {
			storeWindow({ elapsedMs: LIFI_STATUS_UNRESOLVED_PERIOD_MILLIS - 30_000 });

			await poll([buildTx()]);
			await vi.advanceTimersByTimeAsync(60_000);

			applySpy.mockResolvedValueOnce(false);

			await poll([buildTx()]);

			expect(storedWindow()).toEqual({ elapsedMs: LIFI_STATUS_UNRESOLVED_PERIOD_MILLIS + 30_000 });

			await vi.advanceTimersByTimeAsync(60_000);
			await poll([buildTx()]);

			expect(applySpy).toHaveBeenCalledTimes(3);
			expect(lastUpdate()).toEqual({
				status: { Failed: null },
				error: en.swap.error.lifi_status_unknown
			});
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

		it('polls again at once when the clock was set back', async () => {
			await poll([buildTx()]);

			vi.setSystemTime(now - 24 * 60 * 60 * 1_000);

			await poll([buildTx()]);

			expect(fetchLifiStatus).toHaveBeenCalledTimes(2);
		});

		it('forgets a row it settles, since no later poll might prune it', async () => {
			vi.mocked(fetchLifiStatus).mockResolvedValue({
				status: 'DONE',
				substatus: 'COMPLETED'
			} as StatusResponse);

			await poll([buildTx()]);
			await poll([buildTx()]);

			expect(getTransactionReceipt).toHaveBeenCalledTimes(2);
			expect(fetchLifiStatus).toHaveBeenCalledTimes(2);
		});

		it('keeps the state of a row whose settling write failed', async () => {
			vi.mocked(fetchLifiStatus).mockResolvedValue({
				status: 'DONE',
				substatus: 'COMPLETED'
			} as StatusResponse);
			applySpy.mockResolvedValueOnce(false);

			await poll([buildTx()]);
			await poll([buildTx()]);

			// Polled at its cadence, and its confirmed source not read again.
			expect(fetchLifiStatus).toHaveBeenCalledOnce();

			await vi.advanceTimersByTimeAsync(10_000);
			await poll([buildTx()]);

			expect(getTransactionReceipt).toHaveBeenCalledOnce();
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
			reloadLifiEvmBalances({
				tx: buildTx(),
				tokens: [mockLifiBaseUsdcToken, BASE_ETH_TOKEN]
			});

			expect(reloadEthereumBalance).toHaveBeenCalledTimes(2);
			expect(reloadEthereumBalance).toHaveBeenCalledWith(mockLifiBaseUsdcToken);
			expect(reloadEthereumBalance).toHaveBeenCalledWith(BASE_ETH_TOKEN);
		});

		it('reloads the gas token of a source that was disabled since', () => {
			reloadLifiEvmBalances({ tx: buildTx(), tokens: [BASE_ETH_TOKEN] });

			expect(reloadEthereumBalance).toHaveBeenCalledExactlyOnceWith(BASE_ETH_TOKEN);
		});

		describe('a partial payout', () => {
			const baseToEthereumUsdc: LifiData = {
				source_token: { Erc20: [mockLifiBaseUsdcToken.address, 8453n] },
				dest_token: { Erc20: ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 1n] },
				amount: 10n
			};

			// An enabled NFT collection on the destination chain, which the ERC-20 loader would fail on.
			const tokens = [mockLifiBaseUsdcToken, BASE_ETH_TOKEN, ETHEREUM_TOKEN, mockValidErc1155Token];

			const withSubstatus = (substatus: string) =>
				buildTx({
					data: baseToEthereumUsdc,
					refs: {
						...toLifiExternalRefsMap(mockLifiActiveUserTransaction.external_refs),
						[LIFI_EXTERNAL_REF_KEYS.SUBSTATUS]: substatus
					}
				});

			// No received token on the row: its metadata failed the checks, and only the substatus
			// tells the payout was partial.
			it('reloads every enabled fungible token of the destination chain', () => {
				reloadLifiEvmBalances({ tx: withSubstatus('PARTIAL'), tokens });

				expect(reloadEthereumBalance).toHaveBeenCalledTimes(3);
				expect(reloadEthereumBalance).toHaveBeenCalledWith(ETHEREUM_TOKEN);
				expect(reloadEthereumBalance).not.toHaveBeenCalledWith(mockValidErc1155Token);
			});

			it('is not assumed for a transfer that completed', () => {
				reloadLifiEvmBalances({ tx: withSubstatus('COMPLETED'), tokens });

				expect(reloadEthereumBalance).toHaveBeenCalledTimes(2);
				expect(reloadEthereumBalance).not.toHaveBeenCalledWith(ETHEREUM_TOKEN);
			});
		});

		it('reloads an ERC-4626 vault source and its gas token', () => {
			reloadLifiEvmBalances({
				tx: buildTx({
					data: {
						...mockLifiData,
						source_token: { Erc4626: [mockValidErc4626Token.address, 1n] }
					}
				}),
				tokens: [mockValidErc4626Token, ETHEREUM_TOKEN]
			});

			expect(reloadEthereumBalance).toHaveBeenCalledTimes(2);
			expect(reloadEthereumBalance).toHaveBeenCalledWith(mockValidErc4626Token);
			expect(reloadEthereumBalance).toHaveBeenCalledWith(ETHEREUM_TOKEN);
		});

		it('skips tokens no longer enabled', () => {
			reloadLifiEvmBalances({ tx: buildTx({ data: sameChainData }), tokens: [] });

			expect(reloadEthereumBalance).not.toHaveBeenCalled();
		});
	});
});
