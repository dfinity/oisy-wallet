import { onBtcWalletMessage } from '$btc/workers/btc-wallet.worker';
import type { PostMessage, PostMessageDataRequestBtc } from '$lib/types/post-message';
import { excludeValidMessageEvents } from '$tests/mocks/workers.mock';

const hoisted = vi.hoisted(() => {
	const schedulerInstances: {
		start: ReturnType<typeof vi.fn>;
		stop: ReturnType<typeof vi.fn>;
		trigger: ReturnType<typeof vi.fn>;
	}[] = [];

	return { schedulerInstances };
});

vi.mock('$btc/schedulers/btc-wallet.scheduler', () => ({
	BtcWalletScheduler: class {
		start = vi.fn();
		stop = vi.fn();
		trigger = vi.fn();

		constructor() {
			hoisted.schedulerInstances.push(this);
		}
	}
}));

describe('btc-wallet.worker', () => {
	describe('onBtcWalletMessage', () => {
		const invalidMessages = excludeValidMessageEvents([
			'stopBtcWalletTimer',
			'startBtcWalletTimer',
			'triggerBtcWalletTimer'
		]);

		// The Bitcoin address drives the scheduler key. Distinct addresses per test keep the
		// module-level scheduler map free of cross-test interference.
		const btcData = (address: string): PostMessageDataRequestBtc =>
			({
				btcAddress: { data: address, certified: false },
				bitcoinNetwork: 'mainnet',
				shouldFetchTransactions: false
			}) as unknown as PostMessageDataRequestBtc;

		const createEvent = ({
			msg,
			data
		}: {
			msg: string;
			data?: PostMessageDataRequestBtc;
		}): MessageEvent<PostMessage<PostMessageDataRequestBtc>> =>
			({ data: { msg, data } }) as unknown as MessageEvent<PostMessage<PostMessageDataRequestBtc>>;

		beforeEach(() => {
			vi.clearAllMocks();
			hoisted.schedulerInstances.length = 0;
		});

		it('should start a scheduler for the address key', async () => {
			const data = btcData('bc1-start');

			await onBtcWalletMessage(createEvent({ msg: 'startBtcWalletTimer', data }));

			expect(hoisted.schedulerInstances).toHaveLength(1);
			expect(hoisted.schedulerInstances[0].start).toHaveBeenCalledExactlyOnceWith(data);
		});

		it('should trigger a scheduler for the address key', async () => {
			const data = btcData('bc1-trigger');

			await onBtcWalletMessage(createEvent({ msg: 'triggerBtcWalletTimer', data }));

			expect(hoisted.schedulerInstances).toHaveLength(1);
			expect(hoisted.schedulerInstances[0].trigger).toHaveBeenCalledExactlyOnceWith(data);
		});

		it('should stop the scheduler previously started for the key', async () => {
			const data = btcData('bc1-stop');

			await onBtcWalletMessage(createEvent({ msg: 'startBtcWalletTimer', data }));
			await onBtcWalletMessage(createEvent({ msg: 'stopBtcWalletTimer', data }));

			expect(hoisted.schedulerInstances).toHaveLength(1);
			expect(hoisted.schedulerInstances[0].stop).toHaveBeenCalledOnce();
		});

		it('should keep a separate scheduler per address without clobbering', async () => {
			const dataA = btcData('bc1-a');
			const dataB = btcData('bc1-b');

			await onBtcWalletMessage(createEvent({ msg: 'startBtcWalletTimer', data: dataA }));
			await onBtcWalletMessage(createEvent({ msg: 'startBtcWalletTimer', data: dataB }));

			expect(hoisted.schedulerInstances).toHaveLength(2);
			expect(hoisted.schedulerInstances[0].start).toHaveBeenCalledExactlyOnceWith(dataA);
			expect(hoisted.schedulerInstances[1].start).toHaveBeenCalledExactlyOnceWith(dataB);
			// Starting address B must not stop address A's scheduler.
			expect(hoisted.schedulerInstances[0].stop).not.toHaveBeenCalled();
		});

		it('should restart the scheduler for a key, stopping the previous one', async () => {
			const data = btcData('bc1-restart');

			await onBtcWalletMessage(createEvent({ msg: 'startBtcWalletTimer', data }));
			await onBtcWalletMessage(createEvent({ msg: 'startBtcWalletTimer', data }));

			expect(hoisted.schedulerInstances).toHaveLength(2);
			expect(hoisted.schedulerInstances[0].stop).toHaveBeenCalledOnce();
			expect(hoisted.schedulerInstances[1].start).toHaveBeenCalledExactlyOnceWith(data);
		});

		it.each(invalidMessages)('should not touch any scheduler when message is %s', async (msg) => {
			await onBtcWalletMessage(createEvent({ msg, data: btcData('bc1-invalid') }));

			expect(hoisted.schedulerInstances).toHaveLength(0);
		});
	});
});
