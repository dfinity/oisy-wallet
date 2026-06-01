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

		it('calls open immediately when not disabled', async () => {
			const open = vi.fn();

			await openOnWalletReady({ isDisabled: () => false, open });

			expect(open).toHaveBeenCalledOnce();
		});

		it('waits for the wallet to be ready, then calls open', async () => {
			vi.useFakeTimers();

			const open = vi.fn();

			// Disabled on the first check (triggering the wait), then ready.
			const isDisabled = vi.fn().mockReturnValueOnce(true).mockReturnValue(false);

			const promise = openOnWalletReady({ isDisabled, open });

			await vi.runAllTimersAsync();
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
