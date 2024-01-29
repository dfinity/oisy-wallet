import { busy } from '$lib/stores/busy.store';
import { toastsShow } from '$lib/stores/toasts.store';
import { waitReady } from '$lib/utils/timeout.utils';

export const waitWalletReady = async (isDisabled: () => boolean): Promise<'ready' | 'timeout'> => {
	busy.start({ msg: 'Loading initial data...' });

	// 20 tries with a delay of 500ms each = max 10 seconds
	const result = await waitReady({ count: 20, isDisabled });

	busy.stop();

	if (result === 'timeout') {
		toastsShow({
			text: 'Your wallet requires some initial data which has not been loaded yet. Please try again.',
			level: 'info',
			duration: 3000
		});
	}

	return result;
};
