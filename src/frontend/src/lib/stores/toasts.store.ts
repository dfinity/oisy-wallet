import type { ToastMsg } from '$lib/types/toast';
import { errorDetailToString } from '$lib/utils/error.utils';
import { toastsStore } from '@dfinity/gix-components';

export const toastsShow = (msg: ToastMsg): symbol => toastsStore.show(msg);

export const toastsError = ({
	msg: { text, ...rest },
	err
}: {
	msg: Omit<ToastMsg, 'level'>;
	err: unknown;
}): symbol => {
	console.error(err);

	return toastsStore.show({
		text: `${text} / ${errorDetailToString(err)}`,
		...rest,
		level: 'error'
	});
};
