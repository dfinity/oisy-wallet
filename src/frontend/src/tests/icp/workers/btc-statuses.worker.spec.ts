import { BtcStatusesScheduler } from '$icp/schedulers/btc-statuses.scheduler';
import { onBtcStatusesMessage } from '$icp/workers/btc-statuses.worker';
import type { PostMessage, PostMessageDataRequestIcCk } from '$lib/types/post-message';
import { createMockEvent, excludeValidMessageEvents } from '$tests/mocks/workers.mock';

vi.mock(import('$icp/schedulers/btc-statuses.scheduler'), async (importOriginal) => {
	const actual = await importOriginal();
	const scheduler = actual.BtcStatusesScheduler;
	scheduler.prototype.start = vi.fn();
	scheduler.prototype.stop = vi.fn();
	scheduler.prototype.trigger = vi.fn();
	return {
		...actual,
		BtcStatusesScheduler: scheduler
	};
});

describe('btc-statuses.worker', () => {
	describe('onBtcStatusesMessage', () => {
		const invalidMessages = excludeValidMessageEvents([
			'stopBtcStatusesTimer',
			'startBtcStatusesTimer',
			'triggerBtcStatusesTimer'
		]);

		const mockStart = vi.fn();
		const mockStop = vi.fn();
		const mockTrigger = vi.fn();

		const createEvent = (msg: string) =>
			createMockEvent(msg) as unknown as MessageEvent<PostMessage<PostMessageDataRequestIcCk>>;

		beforeEach(() => {
			vi.clearAllMocks();

			BtcStatusesScheduler.prototype.start = mockStart;
			BtcStatusesScheduler.prototype.stop = mockStop;
			BtcStatusesScheduler.prototype.trigger = mockTrigger;
		});

		it('should stop the scheduler when message is stopBtcStatusesTimer', async () => {
			const event = createEvent('stopBtcStatusesTimer');

			await onBtcStatusesMessage(event);

			expect(mockStop).toHaveBeenCalledOnce();

			expect(mockStart).not.toHaveBeenCalled();
			expect(mockTrigger).not.toHaveBeenCalled();
		});

		it('should start the scheduler when message is startBtcStatusesTimer', async () => {
			const event = createEvent('startBtcStatusesTimer');

			await onBtcStatusesMessage(event);

			expect(mockStart).toHaveBeenCalledOnce();
			expect(mockStart).toHaveBeenNthCalledWith(1, event.data.data);

			expect(mockStop).not.toHaveBeenCalled();
			expect(mockTrigger).not.toHaveBeenCalled();
		});

		it('should trigger the scheduler when message is triggerBtcStatusesTimer', async () => {
			const event = createEvent('triggerBtcStatusesTimer');

			await onBtcStatusesMessage(event);

			expect(mockTrigger).toHaveBeenCalledOnce();
			expect(mockTrigger).toHaveBeenNthCalledWith(1, event.data.data);

			expect(mockStart).not.toHaveBeenCalled();
			expect(mockStop).not.toHaveBeenCalled();
		});

		it.each(invalidMessages)(
			'should not call any scheduler method when message is %s',
			async (msg) => {
				const event = createEvent(msg);

				await onBtcStatusesMessage(event);

				expect(mockStart).not.toHaveBeenCalled();
				expect(mockStop).not.toHaveBeenCalled();
				expect(mockTrigger).not.toHaveBeenCalled();
			}
		);
	});
});
