import type { PostMessage, PostMessageDataRequestSol } from '$lib/types/post-message';
import { TOKEN_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import { SolanaNetworks } from '$sol/types/network';
import { onSolWalletMessage } from '$sol/workers/sol-wallet.worker';
import { mockSolAddress, mockSolAddress2, mockSplAddress } from '$tests/mocks/sol.mock';
import { excludeValidMessageEvents } from '$tests/mocks/workers.mock';

const hoisted = vi.hoisted(() => {
	const schedulerInstances: {
		start: ReturnType<typeof vi.fn>;
		stop: ReturnType<typeof vi.fn>;
		trigger: ReturnType<typeof vi.fn>;
	}[] = [];

	// What the next scheduler's start returns, to hold it pending.
	const startResult: { promise: Promise<void> | undefined } = { promise: undefined };

	return { schedulerInstances, startResult };
});

vi.mock('$sol/schedulers/sol-wallet.scheduler', () => ({
	SolWalletScheduler: class {
		start = vi.fn(() => hoisted.startResult.promise);
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

		const data: PostMessageDataRequestSol = {
			address: { data: mockSolAddress, certified: true },
			solanaNetwork: SolanaNetworks.mainnet,
			tokens: [{ address: mockSplAddress, owner: TOKEN_PROGRAM_ADDRESS }]
		};

		const dataWithAnotherToken: PostMessageDataRequestSol = {
			...data,
			tokens: [...data.tokens, { address: mockSolAddress2, owner: TOKEN_PROGRAM_ADDRESS }]
		};

		const createEvent = ({
			msg,
			data
		}: {
			msg: string;
			data?: PostMessageDataRequestSol;
		}): MessageEvent<PostMessage<PostMessageDataRequestSol>> =>
			({ data: { msg, data } }) as unknown as MessageEvent<PostMessage<PostMessageDataRequestSol>>;

		beforeEach(async () => {
			// The realm keeps its scheduler between messages, so every case starts from a stopped one.
			await onSolWalletMessage(createEvent({ msg: 'stopSolWalletTimer' }));

			vi.clearAllMocks();
			hoisted.schedulerInstances.length = 0;
		});

		it('should start a scheduler with the network data', async () => {
			await onSolWalletMessage(createEvent({ msg: 'startSolWalletTimer', data }));

			expect(hoisted.schedulerInstances).toHaveLength(1);
			expect(hoisted.schedulerInstances[0].start).toHaveBeenCalledExactlyOnceWith(data);
		});

		// A running scheduler ignores a second start, so a new token list must get a new scheduler.
		it('should replace the running scheduler when started again', async () => {
			await onSolWalletMessage(createEvent({ msg: 'startSolWalletTimer', data }));
			await onSolWalletMessage(
				createEvent({ msg: 'startSolWalletTimer', data: dataWithAnotherToken })
			);

			expect(hoisted.schedulerInstances).toHaveLength(2);
			expect(hoisted.schedulerInstances[0].stop).toHaveBeenCalledOnce();
			expect(hoisted.schedulerInstances[1].start).toHaveBeenCalledExactlyOnceWith(
				dataWithAnotherToken
			);
		});

		// Messages are not handled one after the other: a start can still await the identity when the
		// next message arrives. Stopping its scheduler is what keeps it from starting a timer that no
		// later stop could reach (`SchedulerTimer.start`).
		it.each(['startSolWalletTimer', 'stopSolWalletTimer'])(
			'should stop a scheduler whose start is pending when %s arrives',
			async (msg) => {
				let resolveStart: () => void = () => {};

				hoisted.startResult.promise = new Promise((resolve) => (resolveStart = resolve));

				const pendingStart = onSolWalletMessage(createEvent({ msg: 'startSolWalletTimer', data }));

				hoisted.startResult.promise = undefined;

				const [pending] = hoisted.schedulerInstances;

				expect(pending.start).toHaveBeenCalledOnce();
				expect(pending.stop).not.toHaveBeenCalled();

				await onSolWalletMessage(createEvent({ msg, data: dataWithAnotherToken }));

				expect(pending.stop).toHaveBeenCalledOnce();

				resolveStart();

				await pendingStart;
			}
		);

		it('should trigger the running scheduler', async () => {
			await onSolWalletMessage(createEvent({ msg: 'startSolWalletTimer', data }));
			await onSolWalletMessage(createEvent({ msg: 'triggerSolWalletTimer', data }));

			expect(hoisted.schedulerInstances).toHaveLength(1);
			expect(hoisted.schedulerInstances[0].trigger).toHaveBeenCalledExactlyOnceWith(data);
		});

		it('should create a scheduler to trigger when none runs', async () => {
			await onSolWalletMessage(createEvent({ msg: 'triggerSolWalletTimer', data }));

			expect(hoisted.schedulerInstances).toHaveLength(1);
			expect(hoisted.schedulerInstances[0].trigger).toHaveBeenCalledExactlyOnceWith(data);
		});

		it('should stop the scheduler and not reuse it', async () => {
			await onSolWalletMessage(createEvent({ msg: 'startSolWalletTimer', data }));
			await onSolWalletMessage(createEvent({ msg: 'stopSolWalletTimer', data }));

			expect(hoisted.schedulerInstances[0].stop).toHaveBeenCalledOnce();

			await onSolWalletMessage(createEvent({ msg: 'triggerSolWalletTimer', data }));

			expect(hoisted.schedulerInstances).toHaveLength(2);
			expect(hoisted.schedulerInstances[0].trigger).not.toHaveBeenCalled();
		});

		it.each(invalidMessages)('should not touch any scheduler when message is %s', async (msg) => {
			await onSolWalletMessage(createEvent({ msg, data }));

			expect(hoisted.schedulerInstances).toHaveLength(0);
		});
	});
});
