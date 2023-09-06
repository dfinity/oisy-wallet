import type { ToastMsg } from '$lib/types/toast';
import { errorDetailToString } from '$lib/utils/error.utils';
import { toastsStore } from '@dfinity/gix-components';
import { nonNullish } from '@dfinity/utils';

export const toastsShow = (msg: ToastMsg): symbol => toastsStore.show(msg);

export const toastsError = ({
	msg: { text, ...rest },
	err
}: {
	msg: Omit<ToastMsg, 'level'>;
	err?: unknown;
}): symbol => {
	if (nonNullish(err)) {
		console.error(err);
	}

	return toastsStore.show({
		text: `${text}${nonNullish(err) ? ` / ${errorDetailToString(err)}` : ''}`,
		...rest,
		level: 'error'
	});
};

export const toastsClean = () => toastsStore.reset(['success', 'warn', 'info']);
