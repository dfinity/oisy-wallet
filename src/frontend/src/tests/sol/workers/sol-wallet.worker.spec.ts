import type { PostMessage, PostMessageDataRequestSol } from '$lib/types/post-message';
import { onSolWalletMessage } from '$sol/workers/sol-wallet.worker';
import { excludeValidMessageEvents } from '$tests/mocks/workers.mock';

const hoisted = vi.hoisted(() => {
	const schedulerInstances: {
		start: ReturnType<typeof vi.fn>;
		stop: ReturnType<typeof vi.fn>;
		trigger: ReturnType<typeof vi.fn>;
	}[] = [];

	return { schedulerInstances };
});

vi.mock('$sol/schedulers/sol-wallet.scheduler', () => ({
	SolWalletScheduler: class {
		start = vi.fn();
		stop = vi.fn();
		trigger = vi.fn();

		constructor() {
			hoisted.schedulerInstances.push(this);
		}
	}
}));

describe('sol-wallet.worker', () => {
	describe('onSolWalletMessage', () => {
		const invalidMessages = excludeValidMessageEvents([
			'stopSolWalletTimer',
			'startSolWalletTimer',
			'triggerSolWalletTimer'
		]);

		// Only `tokenAddress` + `solanaNetwork` drive the scheduler key. Distinct token addresses per
		// test keep the module-level scheduler map free of cross-test interference.
		const solData = (tokenAddress?: string): PostMessageDataRequestSol =>
			({ solanaNetwork: 'mainnet', tokenAddress }) as unknown as PostMessageDataRequestSol;

		const createEvent = ({
			msg,
			data
		}: {
			msg: string;
			data?: PostMessageDataRequestSol;
		}): MessageEvent<PostMessage<PostMessageDataRequestSol>> =>
			({ data: { msg, data } }) as unknown as MessageEvent<PostMessage<PostMessageDataRequestSol>>;

		beforeEach(() => {
			vi.clearAllMocks();
			hoisted.schedulerInstances.length = 0;
		});

		it('should start a scheduler for the token key', async () => {
			const data = solData('mint-start');

			await onSolWalletMessage(createEvent({ msg: 'startSolWalletTimer', data }));

			expect(hoisted.schedulerInstances).toHaveLength(1);
			expect(hoisted.schedulerInstances[0].start).toHaveBeenCalledExactlyOnceWith(data);
		});

		it('should trigger a scheduler for the token key', async () => {
			const data = solData('mint-trigger');

			await onSolWalletMessage(createEvent({ msg: 'triggerSolWalletTimer', data }));

			expect(hoisted.schedulerInstances).toHaveLength(1);
			expect(hoisted.schedulerInstances[0].trigger).toHaveBeenCalledExactlyOnceWith(data);
		});

		it('should stop the scheduler previously started for the key', async () => {
			const data = solData('mint-stop');

			await onSolWalletMessage(createEvent({ msg: 'startSolWalletTimer', data }));
			await onSolWalletMessage(createEvent({ msg: 'stopSolWalletTimer', data }));

			expect(hoisted.schedulerInstances).toHaveLength(1);
			expect(hoisted.schedulerInstances[0].stop).toHaveBeenCalledOnce();
		});

		it('should keep a separate scheduler per token key without clobbering', async () => {
			const dataA = solData('mint-a');
			const dataB = solData('mint-b');

			await onSolWalletMessage(createEvent({ msg: 'startSolWalletTimer', data: dataA }));
			await onSolWalletMessage(createEvent({ msg: 'startSolWalletTimer', data: dataB }));

			expect(hoisted.schedulerInstances).toHaveLength(2);
			expect(hoisted.schedulerInstances[0].start).toHaveBeenCalledExactlyOnceWith(dataA);
			expect(hoisted.schedulerInstances[1].start).toHaveBeenCalledExactlyOnceWith(dataB);
			// Starting token B must not stop token A's scheduler.
			expect(hoisted.schedulerInstances[0].stop).not.toHaveBeenCalled();
		});

		it('should restart the scheduler for a key, stopping the previous one', async () => {
			const data = solData('mint-restart');

			await onSolWalletMessage(createEvent({ msg: 'startSolWalletTimer', data }));
			await onSolWalletMessage(createEvent({ msg: 'startSolWalletTimer', data }));

			expect(hoisted.schedulerInstances).toHaveLength(2);
			expect(hoisted.schedulerInstances[0].stop).toHaveBeenCalledOnce();
			expect(hoisted.schedulerInstances[1].start).toHaveBeenCalledExactlyOnceWith(data);
		});

		it.each(invalidMessages)('should not touch any scheduler when message is %s', async (msg) => {
			await onSolWalletMessage(createEvent({ msg, data: solData('mint-invalid') }));

			expect(hoisted.schedulerInstances).toHaveLength(0);
		});
	});
});
