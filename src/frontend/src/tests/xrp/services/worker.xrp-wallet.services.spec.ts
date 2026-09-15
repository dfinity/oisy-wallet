import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { AppWorker } from '$lib/services/_worker.services';
import { xrpAddressMainnetStore } from '$lib/stores/address.store';
import { mockXrpAddress } from '$tests/mocks/xrp.mock';
import { XrpWalletWorker } from '$xrp/services/worker.xrp-wallet.services';
import { syncWallet, syncWalletError } from '$xrp/services/xrp-listener.services';
import { XrpNetworks } from '$xrp/types/network';

vi.mock('$xrp/services/xrp-listener.services', () => ({
	syncWallet: vi.fn(),
	syncWalletError: vi.fn()
}));

const postMessageSpy = vi.fn();

let workerInstances: MockWorker[] = [];

class MockWorker {
	postMessage = postMessageSpy;
	onmessage: ((event: MessageEvent) => void) | null = null;
	terminate: () => void = vi.fn();
	addEventListener = vi.fn();
	removeEventListener = vi.fn();
	emit = (data: unknown) => this.onmessage?.({ data } as MessageEvent);
}

vi.mock('$lib/workers/workers?worker', () => ({
	default: class {
		constructor() {
			const worker = new MockWorker();
			workerInstances.push(worker);
			return worker;
		}
	}
}));

const mockId = 'abcdefgh';

vi.stubGlobal('crypto', {
	randomUUID: vi.fn().mockReturnValue(mockId)
});

describe('worker.xrp-wallet.services', () => {
	describe('XrpWalletWorker', () => {
		const mockAddress = { data: mockXrpAddress, certified: true };
		const ref = `${XRP_TOKEN.symbol}-${XrpNetworks.mainnet}`;
		const mockWalletData = { wallet: { balance: { data: 1_000_000n, certified: false } } };
		const expectedData = { address: mockAddress, xrpNetwork: XrpNetworks.mainnet };

		const initWorker = () => XrpWalletWorker.init({ token: XRP_TOKEN });

		beforeEach(() => {
			vi.clearAllMocks();
			AppWorker.resetForTesting();
			workerInstances = [];

			xrpAddressMainnetStore.set(mockAddress);
		});

		it('should throw when no XRP address is available', async () => {
			xrpAddressMainnetStore.reset();

			await expect(initWorker()).rejects.toThrow();
		});

		it('should run on a dedicated worker', async () => {
			const spy = vi.spyOn(AppWorker, 'getInstance');

			await initWorker();

			expect(spy).toHaveBeenCalledOnce();
			expect(workerInstances).toHaveLength(1);
		});

		// The worker queue holds back further messages until the realm acks, which the mock never does,
		// so each outbound message gets its own worker.
		it('should post startXrpWalletTimer with the network data on start', async () => {
			const worker = await initWorker();

			worker.start();

			expect(postMessageSpy).toHaveBeenCalledExactlyOnceWith({
				msg: 'startXrpWalletTimer',
				workerId: mockId,
				data: expectedData
			});
		});

		it('should post triggerXrpWalletTimer with the network data on trigger', async () => {
			const worker = await initWorker();

			worker.trigger();

			expect(postMessageSpy).toHaveBeenCalledExactlyOnceWith({
				msg: 'triggerXrpWalletTimer',
				workerId: mockId,
				data: expectedData
			});
		});

		it('should post stopXrpWalletTimer on stop', async () => {
			const worker = await initWorker();

			worker.stop();

			expect(postMessageSpy).toHaveBeenCalledExactlyOnceWith({
				msg: 'stopXrpWalletTimer',
				workerId: mockId
			});
		});

		describe('onmessage', () => {
			beforeEach(async () => {
				await initWorker();
			});

			// The scheduler's status messages carry no ref, so they must never reach the wallet stores.
			it('should ignore a message without a ref', () => {
				workerInstances[0].emit({ msg: 'syncXrpWallet', data: mockWalletData });

				expect(syncWallet).not.toHaveBeenCalled();
			});

			it('should ignore a message intended for another worker', () => {
				workerInstances[0].emit({
					ref: 'OTHER-mainnet',
					msg: 'syncXrpWallet',
					data: mockWalletData
				});

				expect(syncWallet).not.toHaveBeenCalled();
			});

			it('should hand syncXrpWallet to syncWallet with the token id', () => {
				workerInstances[0].emit({ ref, msg: 'syncXrpWallet', data: mockWalletData });

				expect(syncWallet).toHaveBeenCalledExactlyOnceWith({
					tokenId: XRP_TOKEN.id,
					data: mockWalletData
				});
			});

			it('should hand syncXrpWalletError to syncWalletError for the token', () => {
				const error = new Error('test');

				workerInstances[0].emit({ ref, msg: 'syncXrpWalletError', data: { error } });

				expect(syncWalletError).toHaveBeenCalledExactlyOnceWith({
					tokenId: XRP_TOKEN.id,
					error,
					hideToast: true
				});
				expect(syncWallet).not.toHaveBeenCalled();
			});
		});
	});
});
