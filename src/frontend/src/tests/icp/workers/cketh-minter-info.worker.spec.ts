import { CkMinterInfoScheduler } from '$icp/schedulers/ck-minter-info.scheduler';
import { onCkEthMinterInfoMessage } from '$icp/workers/cketh-minter-info.worker';
import type { PostMessage, PostMessageDataRequestIcCk } from '$lib/types/post-message';
import { createMockEvent, excludeValidMessageEvents } from '$tests/mocks/workers.mock';

vi.mock(import('$icp/schedulers/ck-minter-info.scheduler'), async (importOriginal) => {
	const actual = await importOriginal();
	const scheduler = actual.CkMinterInfoScheduler;
	scheduler.prototype.start = vi.fn();
	scheduler.prototype.stop = vi.fn();
	scheduler.prototype.trigger = vi.fn();
	return {
		...actual,
		CkMinterInfoScheduler: scheduler
	};
});

describe('cketh-minter-info.worker', () => {
	describe('onCkEthMinterInfoMessage', () => {
		const invalidMessages = excludeValidMessageEvents([
			'stopCkEthMinterInfoTimer',
			'startCkEthMinterInfoTimer',
			'triggerCkEthMinterInfoTimer'
		]);

		const mockStart = vi.fn();
		const mockStop = vi.fn();
		const mockTrigger = vi.fn();

		const createEvent = (msg: string) =>
			createMockEvent(msg) as unknown as MessageEvent<PostMessage<PostMessageDataRequestIcCk>>;

		beforeEach(() => {
			vi.clearAllMocks();

			CkMinterInfoScheduler.prototype.start = mockStart;
			CkMinterInfoScheduler.prototype.stop = mockStop;
			CkMinterInfoScheduler.prototype.trigger = mockTrigger;
		});

		it('should stop the scheduler when message is stopCkEthMinterInfoTimer', async () => {
			const event = createEvent('stopCkEthMinterInfoTimer');

			await onCkEthMinterInfoMessage(event);

			expect(mockStop).toHaveBeenCalledOnce();

			expect(mockStart).not.toHaveBeenCalled();
			expect(mockTrigger).not.toHaveBeenCalled();
		});

		it('should start the scheduler when message is startCkEthMinterInfoTimer', async () => {
			const event = createEvent('startCkEthMinterInfoTimer');

			await onCkEthMinterInfoMessage(event);

			expect(mockStart).toHaveBeenCalledOnce();
			expect(mockStart).toHaveBeenNthCalledWith(1, event.data.data);

			expect(mockStop).not.toHaveBeenCalled();
			expect(mockTrigger).not.toHaveBeenCalled();
		});

		it('should trigger the scheduler when message is triggerCkEthMinterInfoTimer', async () => {
			const event = createEvent('triggerCkEthMinterInfoTimer');

			await onCkEthMinterInfoMessage(event);

			expect(mockTrigger).toHaveBeenCalledOnce();
			expect(mockTrigger).toHaveBeenNthCalledWith(1, event.data.data);

			expect(mockStart).not.toHaveBeenCalled();
			expect(mockStop).not.toHaveBeenCalled();
		});

		it.each(invalidMessages)(
			'should not call any scheduler method when message is %s',
			async (msg) => {
				const event = createEvent(msg);

				await onCkEthMinterInfoMessage(event);

				expect(mockStart).not.toHaveBeenCalled();
				expect(mockStop).not.toHaveBeenCalled();
				expect(mockTrigger).not.toHaveBeenCalled();
			}
		);
	});
});
