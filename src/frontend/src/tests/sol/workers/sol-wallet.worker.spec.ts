import type { PostMessage, PostMessageDataRequestSol } from '$lib/types/post-message';
import { SolWalletScheduler } from '$sol/schedulers/sol-wallet.scheduler';
import { onSolWalletMessage } from '$sol/workers/sol-wallet.worker';
import { createMockEvent, excludeValidMessageEvents } from '$tests/mocks/workers.mock';

vi.mock(import('$sol/schedulers/sol-wallet.scheduler'), async (importOriginal) => {
	const actual = await importOriginal();
	const scheduler = actual.SolWalletScheduler;
	scheduler.prototype.start = vi.fn();
	scheduler.prototype.stop = vi.fn();
	scheduler.prototype.trigger = vi.fn();
	return {
		...actual,
		SolWalletScheduler: scheduler
	};
});

describe('sol-wallet.worker', () => {
	describe('onSolWalletMessage', () => {
		const invalidMessages = excludeValidMessageEvents([
			'stopSolWalletTimer',
			'startSolWalletTimer',
			'triggerSolWalletTimer'
		]);

		const mockStart = vi.fn();
		const mockStop = vi.fn();
		const mockTrigger = vi.fn();

		const createEvent = (msg: string) =>
			createMockEvent(msg) as unknown as MessageEvent<PostMessage<PostMessageDataRequestSol>>;

		beforeEach(() => {
			vi.clearAllMocks();

			SolWalletScheduler.prototype.start = mockStart;
			SolWalletScheduler.prototype.stop = mockStop;
			SolWalletScheduler.prototype.trigger = mockTrigger;
		});

		it('should stop the scheduler when message is stopSolWalletTimer', async () => {
			const event = createEvent('stopSolWalletTimer');

			await onSolWalletMessage(event);

			expect(mockStop).toHaveBeenCalledOnce();

			expect(mockStart).not.toHaveBeenCalled();
			expect(mockTrigger).not.toHaveBeenCalled();
		});

		it('should start the scheduler when message is startSolWalletTimer', async () => {
			const event = createEvent('startSolWalletTimer');

			await onSolWalletMessage(event);

			expect(mockStart).toHaveBeenCalledOnce();
			expect(mockStart).toHaveBeenNthCalledWith(1, event.data.data);

			expect(mockStop).not.toHaveBeenCalled();
			expect(mockTrigger).not.toHaveBeenCalled();
		});

		it('should trigger the scheduler when message is triggerSolWalletTimer', async () => {
			const event = createEvent('triggerSolWalletTimer');

			await onSolWalletMessage(event);

			expect(mockTrigger).toHaveBeenCalledOnce();
			expect(mockTrigger).toHaveBeenNthCalledWith(1, event.data.data);

			expect(mockStart).not.toHaveBeenCalled();
			expect(mockStop).not.toHaveBeenCalled();
		});

		it.each(invalidMessages)(
			'should not call any scheduler method when message is %s',
			async (msg) => {
				const event = createEvent(msg);

				await onSolWalletMessage(event);

				expect(mockStart).not.toHaveBeenCalled();
				expect(mockStop).not.toHaveBeenCalled();
				expect(mockTrigger).not.toHaveBeenCalled();
			}
		);
	});
});
