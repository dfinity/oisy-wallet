import { syncWallet, syncWalletFromCache } from '$icp/services/ic-listener.services';
import {
	onLoadTransactionsError,
	onTransactionsCleanUp
} from '$icp/services/ic-transactions.services';
import { IcrcWalletWorker } from '$icp/services/worker.icrc-wallet.services';
import type { WalletWorker } from '$lib/types/listener';
import { mockIndexCanisterId, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';

vi.mock('$icp/services/ic-listener.services', () => ({
	syncWallet: vi.fn(),
	syncWalletFromCache: vi.fn()
}));

vi.mock('$icp/services/ic-transactions.services', () => ({
	onLoadTransactionsError: vi.fn(),
	onTransactionsCleanUp: vi.fn()
}));

const postMessageSpy = vi.fn();

class MockWorker {
	postMessage = postMessageSpy;
	onmessage: ((event: MessageEvent) => void) | null = null;
	terminate: () => void = vi.fn();
}

vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);

let workerInstance: Worker;

vi.mock('$lib/workers/workers?worker', () => ({
	default: vi.fn().mockImplementation(() => {
		// @ts-expect-error testing this on purpose with a mock class
		workerInstance = new Worker();
		return workerInstance;
	})
}));

const mockId = 'abcdefgh';

vi.stubGlobal('crypto', {
	randomUUID: vi.fn().mockReturnValue(mockId)
});

describe('worker.icrc-wallet.services', () => {
	describe('IcrcWalletWorker', () => {
		let worker: WalletWorker;

		describe('with index canister id', () => {
			const mockToken = { ...mockValidIcToken, indexCanisterId: mockIndexCanisterId };

			const {
				ledgerCanisterId,
				indexCanisterId,
				network: { env }
			} = mockToken;

			beforeEach(async () => {
				vi.clearAllMocks();

				worker = await IcrcWalletWorker.init(mockToken);
			});

			it('should start the worker and send the correct start message', () => {
				worker.start();

				expect(postMessageSpy).toHaveBeenCalledExactlyOnceWith({
					msg: 'startIcrcWalletTimer',
					workerId: mockId,
					data: {
						indexCanisterId,
						ledgerCanisterId,
						env
					}
				});
			});

			it('should stop the worker and send the correct stop message', () => {
				worker.stop();

				expect(postMessageSpy).toHaveBeenCalledExactlyOnceWith({
					msg: 'stopIcrcWalletTimer',
					workerId: mockId
				});
			});

			it('should trigger the worker and send the correct trigger message', () => {
				worker.trigger();

				expect(postMessageSpy).toHaveBeenCalledExactlyOnceWith({
					msg: 'triggerIcrcWalletTimer',
					workerId: mockId,
					data: {
						indexCanisterId,
						ledgerCanisterId,
						env
					}
				});
			});

			it('should destroy the worker', () => {
				worker.destroy();

				expect(postMessageSpy).toHaveBeenCalledExactlyOnceWith({
					msg: 'stopIcrcWalletTimer',
					workerId: mockId
				});

				expect(workerInstance.terminate).toHaveBeenCalledOnce();
			});

			it('should sync one time from cache', () => {
				expect(syncWalletFromCache).toHaveBeenCalledExactlyOnceWith({
					tokenId: mockToken.id,
					networkId: mockToken.network.id
				});
			});

			describe('onmessage', () => {
				it('should return early if there is no reference', () => {
					const payload = {
						msg: 'syncIcrcWallet',
						data: { balance: 1000 }
					};
					workerInstance.onmessage?.({ data: payload } as MessageEvent);

					expect(syncWallet).not.toHaveBeenCalled();
				});

				it('should return early if the reference does not match', () => {
					const payload = {
						msg: 'syncIcrcWallet',
						ref: 'some-other-ref',
						data: { balance: 1000 }
					};
					workerInstance.onmessage?.({ data: payload } as MessageEvent);

					expect(syncWallet).not.toHaveBeenCalled();
				});

				it('should handle syncIcrcWallet message', () => {
					const payload = {
						msg: 'syncIcrcWallet',
						ref: ledgerCanisterId,
						data: { balance: 1000 }
					};
					workerInstance.onmessage?.({ data: payload } as MessageEvent);

					expect(syncWallet).toHaveBeenCalledExactlyOnceWith({
						tokenId: mockToken.id,
						data: payload.data
					});
				});

				it('should handle syncIcrcWalletError message', () => {
					const payload = {
						msg: 'syncIcrcWalletError',
						ref: ledgerCanisterId,
						data: { error: 'error' }
					};
					workerInstance.onmessage?.({ data: payload } as MessageEvent);

					expect(onLoadTransactionsError).toHaveBeenCalledOnce();
					expect(onLoadTransactionsError).toHaveBeenNthCalledWith(1, {
						tokenId: mockToken.id,
						error: payload.data.error
					});
				});

				it('should handle syncIcrcWalletCleanUp message', () => {
					const payload = {
						msg: 'syncIcrcWalletCleanUp',
						ref: ledgerCanisterId,
						data: { transactionIds: ['id1', 'id2'] }
					};
					workerInstance.onmessage?.({ data: payload } as MessageEvent);

					expect(onTransactionsCleanUp).toHaveBeenCalledOnce();
					expect(onTransactionsCleanUp).toHaveBeenNthCalledWith(1, {
						tokenId: mockToken.id,
						transactionIds: payload.data.transactionIds
					});
				});

				it('should restart the worker with ledger only on error', () => {
					const payload = {
						msg: 'syncIcrcWalletError',
						ref: ledgerCanisterId,
						data: { error: 'error' }
					};
					workerInstance.onmessage?.({ data: payload } as MessageEvent);

					expect(postMessageSpy).toHaveBeenCalledExactlyOnceWith({
						msg: 'startIcrcWalletTimer',
						workerId: mockId,
						data: {
							ledgerCanisterId,
							env
						}
					});
				});

				it('should restart the worker with ledger only on error but only once', () => {
					const payload = {
						msg: 'syncIcrcWalletError',
						ref: ledgerCanisterId,
						data: { error: 'error' }
					};

					Array.from({ length: 10 }).forEach(() => {
						workerInstance.onmessage?.({ data: payload } as MessageEvent);
					});

					expect(postMessageSpy).toHaveBeenCalledExactlyOnceWith({
						msg: 'startIcrcWalletTimer',
						workerId: mockId,
						data: {
							ledgerCanisterId,
							env
						}
					});
				});
			});
		});

		describe('without index canister id', () => {
			const { indexCanisterId: _, ...mockToken } = mockValidIcToken;

			const {
				ledgerCanisterId,
				network: { env }
			} = mockToken;

			beforeEach(async () => {
				vi.clearAllMocks();

				worker = await IcrcWalletWorker.init(mockToken);
			});

			it('should start the worker and send the correct start message', () => {
				worker.start();

				expect(postMessageSpy).toHaveBeenCalledExactlyOnceWith({
					msg: 'startIcrcWalletTimer',
					workerId: mockId,
					data: {
						ledgerCanisterId,
						env
					}
				});
			});

			it('should stop the worker and send the correct stop message', () => {
				worker.stop();

				expect(postMessageSpy).toHaveBeenCalledExactlyOnceWith({
					msg: 'stopIcrcWalletTimer',
					workerId: mockId
				});
			});

			it('should trigger the worker and send the correct trigger message', () => {
				worker.trigger();

				expect(postMessageSpy).toHaveBeenCalledExactlyOnceWith({
					msg: 'triggerIcrcWalletTimer',
					workerId: mockId,
					data: {
						ledgerCanisterId,
						env
					}
				});
			});

			describe('onmessage', () => {
				it('should return early if there is no reference', () => {
					const payload = {
						msg: 'syncIcrcWallet',
						data: { balance: 1000 }
					};
					workerInstance.onmessage?.({ data: payload } as MessageEvent);

					expect(syncWallet).not.toHaveBeenCalled();
				});

				it('should return early if the reference does not match', () => {
					const payload = {
						msg: 'syncIcrcWallet',
						ref: 'some-other-ref',
						data: { balance: 1000 }
					};
					workerInstance.onmessage?.({ data: payload } as MessageEvent);

					expect(syncWallet).not.toHaveBeenCalled();
				});

				it('should handle syncIcrcWallet message', () => {
					const payload = {
						msg: 'syncIcrcWallet',
						ref: ledgerCanisterId,
						data: { balance: 1000 }
					};
					workerInstance.onmessage?.({ data: payload } as MessageEvent);

					expect(syncWallet).toHaveBeenCalledExactlyOnceWith({
						tokenId: mockToken.id,
						data: payload.data
					});
				});

				it('should handle syncIcrcWalletError message', () => {
					const payload = {
						msg: 'syncIcrcWalletError',
						ref: ledgerCanisterId,
						data: { error: 'error' }
					};
					workerInstance.onmessage?.({ data: payload } as MessageEvent);

					expect(onLoadTransactionsError).toHaveBeenCalledOnce();
					expect(onLoadTransactionsError).toHaveBeenNthCalledWith(1, {
						tokenId: mockToken.id,
						error: payload.data.error
					});
				});

				it('should handle syncIcrcWalletCleanUp message', () => {
					const payload = {
						msg: 'syncIcrcWalletCleanUp',
						ref: ledgerCanisterId,
						data: { transactionIds: ['id1', 'id2'] }
					};
					workerInstance.onmessage?.({ data: payload } as MessageEvent);

					expect(onTransactionsCleanUp).toHaveBeenCalledOnce();
					expect(onTransactionsCleanUp).toHaveBeenNthCalledWith(1, {
						tokenId: mockToken.id,
						transactionIds: payload.data.transactionIds
					});
				});

				it('should not restart the worker with ledger only on error', () => {
					const payload = {
						msg: 'syncIcrcWalletError',
						data: { error: 'error' }
					};
					workerInstance.onmessage?.({ data: payload } as MessageEvent);

					expect(postMessageSpy).not.toHaveBeenCalled();
				});
			});
		});
	});
});
