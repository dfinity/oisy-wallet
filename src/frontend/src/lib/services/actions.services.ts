import { busy } from '$lib/stores/busy.store';
import { toastsShow } from '$lib/stores/toasts.store';

const waitReady = async ({
	count,
	isDisabled
}: {
	count: number;
	isDisabled: () => boolean;
}): Promise<'ready' | 'timeout'> => {
	const disabled = isDisabled();

	if (!disabled) {
		return 'ready';
	}

	const nextCount = count - 1;

	if (nextCount === 0) {
		return 'timeout';
	}

	await new Promise((resolve) => setTimeout(resolve, 500));

	return waitReady({ count: nextCount, isDisabled });
};

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
