import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { syncWalletFromCache } from '$icp/services/ic-listener.services';
import { IcpWalletWorker } from '$icp/services/worker.icp-wallet.services';
import { AppWorker } from '$lib/services/_worker.services';
import type { WalletWorker } from '$lib/types/listener';

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
	addEventListener = vi.fn((...args: [string, (event: MessageEvent) => void]) => {
		const [, listener] = args;
		this.onmessage = listener;
	});
	removeEventListener = vi.fn(() => {
		this.onmessage = null;
	});
}

vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);

let workerInstance: Worker;

vi.mock('$lib/workers/workers?worker', () => {
	class MockWorkers {
		constructor() {
			// @ts-expect-error testing this on purpose with a mock class
			workerInstance = new Worker();
			return workerInstance;
		}
	}

	return {
		default: MockWorkers
	};
});

const mockId = 'abcdefgh';

vi.stubGlobal('crypto', {
	randomUUID: vi.fn().mockReturnValue(mockId)
});

describe('worker.icp-wallet.services', () => {
	describe('IcpWalletWorker', () => {
		let worker: WalletWorker;

		const { ledgerCanisterId, indexCanisterId } = ICP_TOKEN;

		beforeEach(async () => {
			vi.clearAllMocks();
			AppWorker.resetForTesting();

			worker = await IcpWalletWorker.init(ICP_TOKEN);
		});

		it('should start the worker and send the correct start message', () => {
			worker.start();

			expect(postMessageSpy).toHaveBeenCalledExactlyOnceWith({
				msg: 'startIcpWalletTimer',
				workerId: mockId,
				data: {
					ledgerCanisterId,
					indexCanisterId
				}
			});
		});

		it('should stop the worker and send the correct stop message', () => {
			worker.stop();

			expect(postMessageSpy).toHaveBeenCalledExactlyOnceWith({
				msg: 'stopIcpWalletTimer',
				workerId: mockId,
				data: {
					ledgerCanisterId,
					indexCanisterId
				}
			});
		});

		it('should trigger the worker and send the correct trigger message', () => {
			worker.trigger();

			expect(postMessageSpy).toHaveBeenCalledExactlyOnceWith({
				msg: 'triggerIcpWalletTimer',
				workerId: mockId,
				data: {
					ledgerCanisterId,
					indexCanisterId
				}
			});
		});

		it('should destroy the worker', () => {
			worker.destroy();

			expect(postMessageSpy).toHaveBeenCalledExactlyOnceWith({
				msg: 'stopIcpWalletTimer',
				workerId: mockId,
				data: {
					ledgerCanisterId,
					indexCanisterId
				}
			});

			expect(workerInstance.terminate).toHaveBeenCalledOnce();
		});

		it('should sync one time from cache', () => {
			expect(syncWalletFromCache).toHaveBeenCalledExactlyOnceWith({
				tokenId: ICP_TOKEN.id,
				networkId: ICP_TOKEN.network.id
			});
		});
	});
});
