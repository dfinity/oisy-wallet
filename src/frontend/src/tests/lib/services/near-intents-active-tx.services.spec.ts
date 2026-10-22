import en from '$lib/i18n/en.json';
import * as nearIntentsRest from '$lib/rest/near-intents.rest';
import * as activeUserTransactionsServices from '$lib/services/active-user-transactions.services';
import { pollNearIntentsActiveUserTransactions } from '$lib/services/near-intents-active-tx.services';
import {
	NEAR_INTENTS_EXTERNAL_REF_KEYS,
	type NearIntentsQuoteResponse,
	type NearIntentsSwapDetails,
	type NearIntentsSwapStatus
} from '$lib/types/near-intents';
import { verifyNearIntentsQuoteSignature } from '$lib/utils/near-intents-quote.utils';
import {
	mockNearIntentsActiveUserTransaction,
	mockXrpLastLedgerSequence,
	mockXrpSwapActiveUserTransaction,
	mockXrpTxHash
} from '$tests/mocks/active-user-transactions.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockNearIntentsStatusPending } from '$tests/mocks/near-intents.mock';
import { XRP_EXTERNAL_REF_KEYS } from '$xrp/types/xrp-active-tx';

vi.mock('$lib/rest/near-intents.rest', () => ({
	fetchNearIntentsStatus: vi.fn()
}));

vi.mock('$lib/utils/near-intents-quote.utils', () => ({
	verifyNearIntentsQuoteSignature: vi.fn()
}));

vi.mock('$lib/utils/console.utils', () => ({
	consoleError: vi.fn()
}));

const depositAddress = '0xDepositAddress123';

const pendingTx = mockNearIntentsActiveUserTransaction;

const statusResponse = ({
	status,
	swapDetails = {},
	quoteResponse = {} as never
}: {
	status: NearIntentsSwapStatus;
	swapDetails?: NearIntentsSwapDetails;
	quoteResponse?: NearIntentsQuoteResponse;
}) => ({
	correlationId: 'id',
	status,
	updatedAt: '2026-03-16T00:00:00.000Z',
	quoteResponse,
	swapDetails
});

describe('near-intents-active-tx.services', () => {
	describe('pollNearIntentsActiveUserTransactions', () => {
		let applySpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			vi.clearAllMocks();

			applySpy = vi
				.spyOn(activeUserTransactionsServices, 'applyActiveUserTransactionPollUpdate')
				.mockResolvedValue(true);
		});

		it('no-ops on an empty list and does not call the status endpoint', async () => {
			await pollNearIntentsActiveUserTransactions({ identity: mockIdentity, transactions: [] });

			expect(nearIntentsRest.fetchNearIntentsStatus).not.toHaveBeenCalled();
			expect(applySpy).not.toHaveBeenCalled();
		});

		it('skips a row without a deposit-address ref', async () => {
			await pollNearIntentsActiveUserTransactions({
				identity: mockIdentity,
				transactions: [{ ...pendingTx, external_refs: [] }]
			});

			expect(nearIntentsRest.fetchNearIntentsStatus).not.toHaveBeenCalled();
			expect(applySpy).not.toHaveBeenCalled();
		});

		it('queries /status by deposit address (and memo when present)', async () => {
			vi.mocked(nearIntentsRest.fetchNearIntentsStatus).mockResolvedValue(
				statusResponse({ status: 'PROCESSING' })
			);

			await pollNearIntentsActiveUserTransactions({
				identity: mockIdentity,
				transactions: [
					{
						...pendingTx,
						external_refs: [
							...pendingTx.external_refs,
							{ key: NEAR_INTENTS_EXTERNAL_REF_KEYS.DEPOSIT_MEMO, value: 'memo-1' }
						]
					}
				]
			});

			expect(nearIntentsRest.fetchNearIntentsStatus).toHaveBeenCalledExactlyOnceWith({
				depositAddress,
				depositMemo: 'memo-1'
			});
		});

		it('advances Pending → Executing for an in-flight status', async () => {
			vi.mocked(nearIntentsRest.fetchNearIntentsStatus).mockResolvedValue(
				statusResponse({ status: 'PROCESSING' })
			);

			await pollNearIntentsActiveUserTransactions({
				identity: mockIdentity,
				transactions: [pendingTx]
			});

			expect(applySpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					update: expect.objectContaining({ status: { Executing: null } })
				})
			);
		});

		it('keeps INCOMPLETE_DEPOSIT non-terminal (Executing, never Failed)', async () => {
			vi.mocked(nearIntentsRest.fetchNearIntentsStatus).mockResolvedValue(
				statusResponse({ status: 'INCOMPLETE_DEPOSIT' })
			);

			await pollNearIntentsActiveUserTransactions({
				identity: mockIdentity,
				transactions: [pendingTx]
			});

			expect(applySpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					update: expect.objectContaining({ status: { Executing: null } })
				})
			);
		});

		it('advances to Succeeded on SUCCESS and persists learned tx hashes', async () => {
			vi.mocked(nearIntentsRest.fetchNearIntentsStatus).mockResolvedValue(
				statusResponse({
					status: 'SUCCESS',
					swapDetails: {
						originChainTxHashes: [{ hash: '0xorigin', explorerUrl: 'https://e/0xorigin' }],
						destinationChainTxHashes: [{ hash: '0xdest', explorerUrl: 'https://e/0xdest' }]
					}
				})
			);

			await pollNearIntentsActiveUserTransactions({
				identity: mockIdentity,
				transactions: [pendingTx]
			});

			expect(applySpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					update: expect.objectContaining({
						status: { Succeeded: null },
						externalRefs: expect.arrayContaining([
							{ key: NEAR_INTENTS_EXTERNAL_REF_KEYS.ORIGIN_TX_HASH, value: '0xorigin' },
							{ key: NEAR_INTENTS_EXTERNAL_REF_KEYS.DESTINATION_TX_HASH, value: '0xdest' }
						])
					})
				})
			);
		});

		it('maps REFUNDED to Failed with the refunded error text', async () => {
			vi.mocked(nearIntentsRest.fetchNearIntentsStatus).mockResolvedValue(
				statusResponse({ status: 'REFUNDED' })
			);

			await pollNearIntentsActiveUserTransactions({
				identity: mockIdentity,
				transactions: [pendingTx]
			});

			expect(applySpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					update: expect.objectContaining({
						status: { Failed: null },
						error: en.swap.error.swap_refunded
					})
				})
			);
		});

		it('maps FAILED to Failed with the generic failure error text', async () => {
			vi.mocked(nearIntentsRest.fetchNearIntentsStatus).mockResolvedValue(
				statusResponse({ status: 'FAILED' })
			);

			await pollNearIntentsActiveUserTransactions({
				identity: mockIdentity,
				transactions: [pendingTx]
			});

			expect(applySpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					update: expect.objectContaining({
						status: { Failed: null },
						error: en.swap.error.failed_unexpectedly
					})
				})
			);
		});

		describe('a deposit that never arrived', () => {
			const { quoteResponse } = mockNearIntentsStatusPending;

			beforeEach(() => {
				vi.useFakeTimers().setSystemTime(new Date(Date.parse(quoteResponse.quote.deadline) + 1));

				vi.mocked(nearIntentsRest.fetchNearIntentsStatus).mockResolvedValue(
					statusResponse({ status: 'PENDING_DEPOSIT', quoteResponse })
				);
			});

			afterEach(() => {
				vi.useRealTimers();
			});

			it.each<NearIntentsSwapStatus>(['PENDING_DEPOSIT', 'KNOWN_DEPOSIT_TX'])(
				'fails the swap at %s once the signed quote deadline has passed',
				async (status) => {
					vi.mocked(nearIntentsRest.fetchNearIntentsStatus).mockResolvedValue(
						statusResponse({ status, quoteResponse })
					);
					vi.mocked(verifyNearIntentsQuoteSignature).mockResolvedValue(true);

					await pollNearIntentsActiveUserTransactions({
						identity: mockIdentity,
						transactions: [{ ...pendingTx, status: { Executing: null } }]
					});

					expect(applySpy).toHaveBeenCalledExactlyOnceWith(
						expect.objectContaining({
							update: {
								status: { Failed: null },
								error: en.swap.error.near_intents_deposit_expired
							}
						})
					);
				}
			);

			it('keeps the swap in progress when the quote signature does not verify', async () => {
				vi.mocked(verifyNearIntentsQuoteSignature).mockResolvedValue(false);

				await pollNearIntentsActiveUserTransactions({
					identity: mockIdentity,
					transactions: [{ ...pendingTx, status: { Executing: null } }]
				});

				expect(applySpy).not.toHaveBeenCalled();
			});
		});

		it('does not write when the status would not advance and no new refs were learned', async () => {
			vi.mocked(nearIntentsRest.fetchNearIntentsStatus).mockResolvedValue(
				statusResponse({ status: 'PROCESSING' })
			);

			await pollNearIntentsActiveUserTransactions({
				identity: mockIdentity,
				transactions: [{ ...pendingTx, status: { Executing: null } }]
			});

			expect(applySpy).not.toHaveBeenCalled();
		});

		it('persists newly-learned tx hashes even when the status does not advance', async () => {
			vi.mocked(nearIntentsRest.fetchNearIntentsStatus).mockResolvedValue(
				statusResponse({
					status: 'PROCESSING',
					swapDetails: {
						originChainTxHashes: [{ hash: '0xorigin', explorerUrl: 'https://e/0xorigin' }]
					}
				})
			);

			await pollNearIntentsActiveUserTransactions({
				identity: mockIdentity,
				transactions: [{ ...pendingTx, status: { Executing: null } }]
			});

			expect(applySpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					update: expect.objectContaining({
						externalRefs: expect.arrayContaining([
							{ key: NEAR_INTENTS_EXTERNAL_REF_KEYS.ORIGIN_TX_HASH, value: '0xorigin' }
						])
					})
				})
			);
		});

		// The backend refuses an update to a swap from XRP whose refs lack the deposit's poll keys, so
		// rewriting the refs must carry them over — or the swap could never reach its outcome.
		it('keeps the deposit poll keys of a swap from XRP when it persists learned refs', async () => {
			vi.mocked(nearIntentsRest.fetchNearIntentsStatus).mockResolvedValue(
				statusResponse({
					status: 'SUCCESS',
					swapDetails: {
						originChainTxHashes: [{ hash: mockXrpTxHash, explorerUrl: 'https://e/origin' }],
						destinationChainTxHashes: [{ hash: '0xdest', explorerUrl: 'https://e/0xdest' }]
					}
				})
			);

			await pollNearIntentsActiveUserTransactions({
				identity: mockIdentity,
				transactions: [{ ...mockXrpSwapActiveUserTransaction, status: { Executing: null } }]
			});

			expect(applySpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					update: expect.objectContaining({
						status: { Succeeded: null },
						externalRefs: expect.arrayContaining([
							{ key: XRP_EXTERNAL_REF_KEYS.TX_HASH, value: mockXrpTxHash },
							{
								key: XRP_EXTERNAL_REF_KEYS.LAST_LEDGER_SEQUENCE,
								value: `${mockXrpLastLedgerSequence}`
							},
							{ key: NEAR_INTENTS_EXTERNAL_REF_KEYS.DESTINATION_TX_HASH, value: '0xdest' }
						])
					})
				})
			);
		});

		it('swallows status-endpoint errors so the next tick can retry', async () => {
			vi.mocked(nearIntentsRest.fetchNearIntentsStatus).mockRejectedValue(new Error('network'));

			await expect(
				pollNearIntentsActiveUserTransactions({
					identity: mockIdentity,
					transactions: [pendingTx]
				})
			).resolves.toBeUndefined();

			expect(applySpy).not.toHaveBeenCalled();
		});

		it('polls each row in the batch', async () => {
			vi.mocked(nearIntentsRest.fetchNearIntentsStatus).mockResolvedValue(
				statusResponse({ status: 'PROCESSING' })
			);

			await pollNearIntentsActiveUserTransactions({
				identity: mockIdentity,
				transactions: [pendingTx, { ...pendingTx, id: 'second-row' }]
			});

			expect(nearIntentsRest.fetchNearIntentsStatus).toHaveBeenCalledTimes(2);
		});
	});
});
