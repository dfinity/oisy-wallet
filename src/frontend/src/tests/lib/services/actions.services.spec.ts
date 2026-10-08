import { openOnWalletReady } from '$lib/services/actions.services';
import { busy } from '$lib/stores/busy.store';
import * as toastsStore from '$lib/stores/toasts.store';

describe('actions.services', () => {
	describe('openOnWalletReady', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			vi.useRealTimers();
			busy.stop();
		});

		afterEach(() => {
			vi.useRealTimers();
			vi.restoreAllMocks();
		});

		it('calls open immediately when not disabled', async () => {
			const open = vi.fn();

			await openOnWalletReady({ isDisabled: () => false, open });

			expect(open).toHaveBeenCalledOnce();
		});

		it('waits at least one retry interval before calling open once the wallet is ready', async () => {
			vi.useFakeTimers();

			const open = vi.fn();

			// Disabled on the outer guard check and the first `waitReady` check (so a
			// retry interval must elapse), then ready on the subsequent check.
			const isDisabled = vi
				.fn()
				.mockReturnValueOnce(true)
				.mockReturnValueOnce(true)
				.mockReturnValue(false);

			const promise = openOnWalletReady({ isDisabled, open });

			// Let microtasks settle without advancing the retry timer: `open` must not
			// have been called yet because the wallet is still disabled.
			await vi.advanceTimersByTimeAsync(0);

			expect(open).not.toHaveBeenCalled();

			// Advance past one 500ms retry interval so the next readiness check runs.
			await vi.advanceTimersByTimeAsync(500);
			await promise;

			expect(open).toHaveBeenCalledOnce();
		});

		it('does not call open when the wallet stays disabled until timeout', async () => {
			vi.useFakeTimers();

			const open = vi.fn();
			const toastsSpy = vi.spyOn(toastsStore, 'toastsShow');

			const promise = openOnWalletReady({ isDisabled: () => true, open });

			await vi.runAllTimersAsync();
			await promise;

			expect(open).not.toHaveBeenCalled();
			expect(toastsSpy).toHaveBeenCalledOnce();
		});
	});
});
