import type { ToastMsg } from '$lib/types/toast';
import { errorDetailToString } from '$lib/utils/error.utils';
import { toastsStore } from '@dfinity/gix-components';
import { nonNullish } from '@dfinity/utils';

export const toastsShow = (msg: ToastMsg): symbol => toastsStore.show(msg);

interface ToastsErrorParams {
	msg: Omit<ToastMsg, 'level'>;
	err?: unknown;
}
export const toastsError = ({ msg: { text, ...rest }, err }: ToastsErrorParams): symbol => {
	if (nonNullish(err)) {
		console.error(err);
	}

	return toastsStore.show({
		text: `${text}${nonNullish(err) ? ` / ${errorDetailToString(err)}` : ''}`,
		...rest,
		level: 'error'
	});
};

export const toastsErrorNoTrace = ({ msg, err }: ToastsErrorParams) => {
	console.error(`${msg.text}:`, err);

	return toastsError({
		msg
	});
};

export const toastsClean = () => toastsStore.reset(['success', 'warn', 'info']);

export const toastsHide = (ids: symbol[]) => ids.forEach((id) => toastsStore.hide(id));
