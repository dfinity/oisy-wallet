import { syncWallet, syncWalletFromCache } from '$icp/services/ic-listener.services';
import {
	onLoadTransactionsError,
	onTransactionsCleanUp
} from '$icp/services/ic-transactions.services';
import { initIcrcWalletWorker } from '$icp/services/worker.icrc-wallet.services';
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

describe('worker.icrc-wallet.services', () => {
	describe('initIcrcWalletWorker', () => {
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

				worker = await initIcrcWalletWorker(mockToken);
			});

			it('should start the worker and send the correct start message', () => {
				worker.start();

				expect(postMessageSpy).toHaveBeenCalledOnce();
				expect(postMessageSpy).toHaveBeenNthCalledWith(1, {
					msg: 'startIcrcWalletTimer',
					data: {
						indexCanisterId,
						ledgerCanisterId,
						env
					}
				});
			});

			it('should stop the worker and send the correct stop message', () => {
				worker.stop();

				expect(postMessageSpy).toHaveBeenCalledOnce();
				expect(postMessageSpy).toHaveBeenNthCalledWith(1, {
					msg: 'stopIcrcWalletTimer'
				});
			});

			it('should trigger the worker and send the correct trigger message', () => {
				worker.trigger();

				expect(postMessageSpy).toHaveBeenCalledOnce();
				expect(postMessageSpy).toHaveBeenNthCalledWith(1, {
					msg: 'triggerIcrcWalletTimer',
					data: {
						indexCanisterId,
						ledgerCanisterId,
						env
					}
				});
			});

			it('should destroy the worker', () => {
				worker.destroy();

				expect(postMessageSpy).toHaveBeenCalledOnce();
				expect(postMessageSpy).toHaveBeenNthCalledWith(1, {
					msg: 'stopIcrcWalletTimer'
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
				it('should handle syncIcrcWallet message', () => {
					const payload = {
						msg: 'syncIcrcWallet',
						data: { balance: 1000 }
					};
					workerInstance.onmessage?.({ data: payload } as MessageEvent);

					expect(syncWallet).toHaveBeenCalledOnce();
					expect(syncWallet).toHaveBeenCalledWith({
						tokenId: mockToken.id,
						data: payload.data
					});
				});

				it('should handle syncIcrcWalletError message', () => {
					const payload = {
						msg: 'syncIcrcWalletError',
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
						data: { error: 'error' }
					};
					workerInstance.onmessage?.({ data: payload } as MessageEvent);

					expect(postMessageSpy).toHaveBeenCalledOnce();
					expect(postMessageSpy).toHaveBeenNthCalledWith(1, {
						msg: 'startIcrcWalletTimer',
						data: {
							ledgerCanisterId,
							env
						}
					});
				});

				it('should restart the worker with ledger only on error but only once', () => {
					const payload = {
						msg: 'syncIcrcWalletError',
						data: { error: 'error' }
					};

					Array.from({ length: 10 }).forEach(() => {
						workerInstance.onmessage?.({ data: payload } as MessageEvent);
					});

					expect(postMessageSpy).toHaveBeenCalledOnce();
					expect(postMessageSpy).toHaveBeenNthCalledWith(1, {
						msg: 'startIcrcWalletTimer',
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

				worker = await initIcrcWalletWorker(mockToken);
			});

			it('should start the worker and send the correct start message', () => {
				worker.start();

				expect(postMessageSpy).toHaveBeenCalledOnce();
				expect(postMessageSpy).toHaveBeenNthCalledWith(1, {
					msg: 'startIcrcWalletTimer',
					data: {
						ledgerCanisterId,
						env
					}
				});
			});

			it('should stop the worker and send the correct stop message', () => {
				worker.stop();

				expect(postMessageSpy).toHaveBeenCalledOnce();
				expect(postMessageSpy).toHaveBeenNthCalledWith(1, {
					msg: 'stopIcrcWalletTimer'
				});
			});

			it('should trigger the worker and send the correct trigger message', () => {
				worker.trigger();

				expect(postMessageSpy).toHaveBeenCalledOnce();
				expect(postMessageSpy).toHaveBeenNthCalledWith(1, {
					msg: 'triggerIcrcWalletTimer',
					data: {
						ledgerCanisterId,
						env
					}
				});
			});

			describe('onmessage', () => {
				it('should handle syncIcrcWallet message', () => {
					const payload = {
						msg: 'syncIcrcWallet',
						data: { balance: 1000 }
					};
					workerInstance.onmessage?.({ data: payload } as MessageEvent);

					expect(syncWallet).toHaveBeenCalledOnce();
					expect(syncWallet).toHaveBeenCalledWith({
						tokenId: mockToken.id,
						data: payload.data
					});
				});

				it('should handle syncIcrcWalletError message', () => {
					const payload = {
						msg: 'syncIcrcWalletError',
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
