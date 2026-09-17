import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { AppWorker } from '$lib/services/_worker.services';
import { xrpAddressMainnetStore } from '$lib/stores/address.store';
import { mockXrpAddress } from '$tests/mocks/xrp.mock';
import { XrpWalletWorker } from '$xrp/services/worker.xrp-wallet.services';
import { resetWallet, syncWallet, syncWalletError } from '$xrp/services/xrp-listener.services';
import { XrpNetworks } from '$xrp/types/network';

vi.mock('$xrp/services/xrp-listener.services', () => ({
	resetWallet: vi.fn(),
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
		const ref = `${XRP_TOKEN.symbol}-${XrpNetworks.mainnet}-${mockXrpAddress}`;
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

		// The address store is the single source of truth: the worker must never keep polling an
		// address the store has moved on from.
		describe('on an address change', () => {
			const otherAddress = { data: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe', certified: true };

			// `WorkerQueue` serialises posts and releases its slot on a 100 ms timer, so a second
			// message only reaches the worker after that delay.
			const drainQueue = async () => await vi.advanceTimersByTimeAsync(200);

			beforeEach(() => {
				vi.useFakeTimers();
			});

			afterEach(() => {
				vi.useRealTimers();
			});

			it('should post the current address on start rather than the one captured at init', async () => {
				const worker = await initWorker();

				xrpAddressMainnetStore.set(otherAddress);
				postMessageSpy.mockClear();

				worker.start();

				expect(postMessageSpy).toHaveBeenCalledWith({
					msg: 'startXrpWalletTimer',
					workerId: mockId,
					data: { address: otherAddress, xrpNetwork: XrpNetworks.mainnet }
				});
			});

			it('should post the current address on trigger rather than the one captured at init', async () => {
				const worker = await initWorker();

				xrpAddressMainnetStore.set(otherAddress);
				postMessageSpy.mockClear();

				worker.trigger();

				expect(postMessageSpy).toHaveBeenCalledExactlyOnceWith({
					msg: 'triggerXrpWalletTimer',
					workerId: mockId,
					data: { address: otherAddress, xrpNetwork: XrpNetworks.mainnet }
				});
			});

			// `SchedulerTimer.start` is a no-op while its timer exists, so a bare start would leave the
			// timer polling the previous address under the new ref. The stop must come first.
			it('should stop the timer before restarting it with the new address', async () => {
				const worker = await initWorker();

				worker.start();
				postMessageSpy.mockClear();

				xrpAddressMainnetStore.set(otherAddress);
				await drainQueue();

				expect(postMessageSpy.mock.calls.map(([{ msg }]) => msg)).toEqual([
					'stopXrpWalletTimer',
					'startXrpWalletTimer'
				]);
				expect(postMessageSpy).toHaveBeenLastCalledWith({
					msg: 'startXrpWalletTimer',
					workerId: mockId,
					data: { address: otherAddress, xrpNetwork: XrpNetworks.mainnet }
				});
			});

			// The scheduler drops its own cache on the new ref, so its next sync reports the new
			// address's first page as new rows — and `syncWallet` prepends. Without a reset those rows
			// merge with the previous address's, which Activity and the data export then present as
			// this account's history.
			//
			// Earlier tests here leave their workers subscribed to the address store, so several
			// instances react to one change; what matters is that the reset happens, for this token.
			it('should reset the token stores on an address change', async () => {
				const worker = await initWorker();

				worker.start();
				vi.mocked(resetWallet).mockClear();

				xrpAddressMainnetStore.set(otherAddress);
				await drainQueue();

				expect(resetWallet).toHaveBeenCalledWith({ tokenId: XRP_TOKEN.id });

				worker.destroy();
			});

			it('should stop the timer when the address is reset', async () => {
				const worker = await initWorker();

				worker.start();
				postMessageSpy.mockClear();

				xrpAddressMainnetStore.reset();
				await drainQueue();

				expect(postMessageSpy).toHaveBeenCalledWith({
					msg: 'stopXrpWalletTimer',
					workerId: mockId
				});
			});

			// `destroy` itself posts `stopXrpWalletTimer`, so this asserts the absence of a restart
			// rather than the absence of any message.
			it('should not restart on an address change after destroy', async () => {
				const worker = await initWorker();

				worker.start();
				worker.destroy();
				postMessageSpy.mockClear();

				xrpAddressMainnetStore.set(otherAddress);
				await drainQueue();

				expect(postMessageSpy).not.toHaveBeenCalledWith(
					expect.objectContaining({ msg: 'startXrpWalletTimer' })
				);
			});

			it('should not re-post for an unchanged address', async () => {
				const worker = await initWorker();

				worker.start();
				postMessageSpy.mockClear();

				xrpAddressMainnetStore.set({ ...mockAddress });
				await drainQueue();

				expect(postMessageSpy).not.toHaveBeenCalled();
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
