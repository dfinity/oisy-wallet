import type { PostMessage, PostMessageDataRequestXrp } from '$lib/types/post-message';
import { createMockEvent, excludeValidMessageEvents } from '$tests/mocks/workers.mock';
import { XrpWalletScheduler } from '$xrp/schedulers/xrp-wallet.scheduler';
import { onXrpWalletMessage } from '$xrp/workers/xrp-wallet.worker';

vi.mock(import('$xrp/schedulers/xrp-wallet.scheduler'), async (importOriginal) => {
	const actual = await importOriginal();
	const scheduler = actual.XrpWalletScheduler;
	scheduler.prototype.start = vi.fn();
	scheduler.prototype.stop = vi.fn();
	scheduler.prototype.trigger = vi.fn();
	return {
		...actual,
		XrpWalletScheduler: scheduler
	};
});

describe('xrp-wallet.worker', () => {
	describe('onXrpWalletMessage', () => {
		const invalidMessages = excludeValidMessageEvents([
			'stopXrpWalletTimer',
			'startXrpWalletTimer',
			'triggerXrpWalletTimer'
		]);

		const mockStart = vi.fn();
		const mockStop = vi.fn();
		const mockTrigger = vi.fn();

		const createEvent = (msg: string) =>
			createMockEvent(msg) as unknown as MessageEvent<PostMessage<PostMessageDataRequestXrp>>;

		beforeEach(() => {
			vi.clearAllMocks();

			XrpWalletScheduler.prototype.start = mockStart;
			XrpWalletScheduler.prototype.stop = mockStop;
			XrpWalletScheduler.prototype.trigger = mockTrigger;
		});

		it('should stop the scheduler when message is stopXrpWalletTimer', async () => {
			const event = createEvent('stopXrpWalletTimer');

			await onXrpWalletMessage(event);

			expect(mockStop).toHaveBeenCalledOnce();

			expect(mockStart).not.toHaveBeenCalled();
			expect(mockTrigger).not.toHaveBeenCalled();
		});

		it('should start the scheduler when message is startXrpWalletTimer', async () => {
			const event = createEvent('startXrpWalletTimer');

			await onXrpWalletMessage(event);

			expect(mockStart).toHaveBeenCalledOnce();
			expect(mockStart).toHaveBeenNthCalledWith(1, event.data.data);

			expect(mockStop).not.toHaveBeenCalled();
			expect(mockTrigger).not.toHaveBeenCalled();
		});

		it('should trigger the scheduler when message is triggerXrpWalletTimer', async () => {
			const event = createEvent('triggerXrpWalletTimer');

			await onXrpWalletMessage(event);

			expect(mockTrigger).toHaveBeenCalledOnce();
			expect(mockTrigger).toHaveBeenNthCalledWith(1, event.data.data);

			expect(mockStart).not.toHaveBeenCalled();
			expect(mockStop).not.toHaveBeenCalled();
		});

		it.each(invalidMessages)(
			'should not call any scheduler method when message is %s',
			async (msg) => {
				const event = createEvent(msg);

				await onXrpWalletMessage(event);

				expect(mockStart).not.toHaveBeenCalled();
				expect(mockStop).not.toHaveBeenCalled();
				expect(mockTrigger).not.toHaveBeenCalled();
			}
		);
	});
});
