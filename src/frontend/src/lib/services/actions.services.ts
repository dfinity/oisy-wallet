import { busy } from '$lib/stores/busy.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsShow } from '$lib/stores/toasts.store';
import { waitReady } from '$lib/utils/timeout.utils';
import { get } from 'svelte/store';

export const waitWalletReady = async (isDisabled: () => boolean): Promise<'ready' | 'timeout'> => {
	const {
		init: {
			info: { hold_loading_wallet },
			error: { loading_wallet_timeout }
		}
	} = get(i18n);

	busy.start({ msg: hold_loading_wallet });

	// 20 tries with a delay of 500ms each = max 10 seconds
	const result = await waitReady({ count: 20, isDisabled });

	busy.stop();

	if (result === 'timeout') {
		toastsShow({
			text: loading_wallet_timeout,
			level: 'info',
			duration: 3000
		});
	}

	return result;
};
