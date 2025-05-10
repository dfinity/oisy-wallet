import { CkMinterInfoScheduler } from '$icp/schedulers/ck-minter-info.scheduler';
import { onCkBtcMinterInfoMessage } from '$icp/workers/ckbtc-minter-info.worker';
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

describe('ckbtc-minter-info.worker', () => {
	describe('onCkBtcMinterInfoMessage', () => {
		const invalidMessages = excludeValidMessageEvents([
			'stopCkBtcMinterInfoTimer',
			'startCkBtcMinterInfoTimer',
			'triggerCkBtcMinterInfoTimer'
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

		it('should stop the scheduler when message is stopCkBtcMinterInfoTimer', async () => {
			const event = createEvent('stopCkBtcMinterInfoTimer');

			await onCkBtcMinterInfoMessage(event);

			expect(mockStop).toHaveBeenCalledOnce();

			expect(mockStart).not.toHaveBeenCalled();
			expect(mockTrigger).not.toHaveBeenCalled();
		});

		it('should start the scheduler when message is startCkBtcMinterInfoTimer', async () => {
			const event = createEvent('startCkBtcMinterInfoTimer');

			await onCkBtcMinterInfoMessage(event);

			expect(mockStart).toHaveBeenCalledOnce();
			expect(mockStart).toHaveBeenNthCalledWith(1, event.data.data);

			expect(mockStop).not.toHaveBeenCalled();
			expect(mockTrigger).not.toHaveBeenCalled();
		});

		it('should trigger the scheduler when message is triggerCkBtcMinterInfoTimer', async () => {
			const event = createEvent('triggerCkBtcMinterInfoTimer');

			await onCkBtcMinterInfoMessage(event);

			expect(mockTrigger).toHaveBeenCalledOnce();
			expect(mockTrigger).toHaveBeenNthCalledWith(1, event.data.data);

			expect(mockStart).not.toHaveBeenCalled();
			expect(mockStop).not.toHaveBeenCalled();
		});

		it.each(invalidMessages)(
			'should not call any scheduler method when message is %s',
			async (msg) => {
				const event = createEvent(msg);

				await onCkBtcMinterInfoMessage(event);

				expect(mockStart).not.toHaveBeenCalled();
				expect(mockStop).not.toHaveBeenCalled();
				expect(mockTrigger).not.toHaveBeenCalled();
			}
		);
	});
});
