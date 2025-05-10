import { CkBTCUpdateBalanceScheduler } from '$icp/schedulers/ckbtc-update-balance.scheduler';
import { onCkBtcUpdateBalanceMessage } from '$icp/workers/ckbtc-update-balance.worker';
import type {
	PostMessage,
	PostMessageDataRequestIcCkBTCUpdateBalance
} from '$lib/types/post-message';
import { createMockEvent, excludeValidMessageEvents } from '$tests/mocks/workers.mock';

vi.mock(import('$icp/schedulers/ckbtc-update-balance.scheduler'), async (importOriginal) => {
	const actual = await importOriginal();
	const scheduler = actual.CkBTCUpdateBalanceScheduler;
	scheduler.prototype.start = vi.fn();
	scheduler.prototype.stop = vi.fn();
	return {
		...actual,
		CkBTCUpdateBalanceScheduler: scheduler
	};
});

describe('ckbtc-update-balance.worker', () => {
	describe('onCkBtcUpdateBalanceMessage', () => {
		const invalidMessages = excludeValidMessageEvents([
			'stopCkBTCUpdateBalanceTimer',
			'startCkBTCUpdateBalanceTimer'
		]);

		const mockStart = vi.fn();
		const mockStop = vi.fn();

		const createEvent = (msg: string) =>
			createMockEvent(msg) as unknown as MessageEvent<
				PostMessage<PostMessageDataRequestIcCkBTCUpdateBalance>
			>;

		beforeEach(() => {
			vi.clearAllMocks();

			CkBTCUpdateBalanceScheduler.prototype.start = mockStart;
			CkBTCUpdateBalanceScheduler.prototype.stop = mockStop;
		});

		it('should stop the scheduler when message is stopCkBTCUpdateBalanceTimer', async () => {
			const event = createEvent('stopCkBTCUpdateBalanceTimer');

			await onCkBtcUpdateBalanceMessage(event);

			expect(mockStop).toHaveBeenCalledOnce();

			expect(mockStart).not.toHaveBeenCalled();
		});

		it('should start the scheduler when message is startCkBTCUpdateBalanceTimer', async () => {
			const event = createEvent('startCkBTCUpdateBalanceTimer');

			await onCkBtcUpdateBalanceMessage(event);

			expect(mockStart).toHaveBeenCalledOnce();
			expect(mockStart).toHaveBeenNthCalledWith(1, event.data.data);

			expect(mockStop).not.toHaveBeenCalled();
		});

		it.each(invalidMessages)(
			'should not call any scheduler method when message is %s',
			async (msg) => {
				const event = createEvent(msg);

				await onCkBtcUpdateBalanceMessage(event);

				expect(mockStart).not.toHaveBeenCalled();
				expect(mockStop).not.toHaveBeenCalled();
			}
		);
	});
});
