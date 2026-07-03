import type { ToastLevel, ToastMsg, ToastMsgUI } from '$lib/types/toast';
import { consoleError } from '$lib/utils/console.utils';
import { errorDetailToString } from '$lib/utils/error.utils';
import { nonNullish } from '@dfinity/utils';
import { writable, type Readable } from 'svelte/store';

export interface ToastsStore extends Readable<ToastMsgUI[]> {
	show: (msg: Partial<Pick<ToastMsgUI, 'id'>> & Omit<ToastMsgUI, 'id'>) => symbol;
	hide: (idToHide: symbol) => void;
	update: (params: { id: symbol; content: Partial<Omit<ToastMsgUI, 'id'>> }) => void;
	reset: (levels?: ToastLevel[]) => void;
}

/**
 * Toast messages (vendored from @dfinity/gix-components).
 *
 * - show: append a new toast (assigning an id when none is provided) and return its id.
 * - hide: remove the toast with the given id.
 * - update: update the content of an existing toast (matched by id), preserving order.
 * - reset: empty all toasts, or optionally only those matching the given levels.
 */
const initToastsStore = (): ToastsStore => {
	const { subscribe, update, set } = writable<ToastMsgUI[]>([]);

	return {
		subscribe,

		show: ({ id, ...rest }: Partial<Pick<ToastMsgUI, 'id'>> & Omit<ToastMsgUI, 'id'>): symbol => {
			const toastId = id ?? Symbol('toast');

			update((messages: ToastMsgUI[]) => [...messages, { ...rest, id: toastId }]);

			return toastId;
		},

		hide: (idToHide: symbol) => {
			update((messages: ToastMsgUI[]) => messages.filter(({ id }) => id !== idToHide));
		},

		update: ({ id, content }: { id: symbol; content: Partial<Omit<ToastMsgUI, 'id'>> }) => {
			update((messages: ToastMsgUI[]) =>
				// use map to preserve order
				messages.map((message) => {
					if (message.id !== id) {
						return message;
					}
					return {
						...message,
						...content
					};
				})
			);
		},

		reset: (levels?: ToastLevel[]) => {
			if (nonNullish(levels) && levels.length > 0) {
				update((messages: ToastMsgUI[]) => messages.filter(({ level }) => !levels.includes(level)));
				return;
			}

			set([]);
		}
	};
};

export const toastsStore = initToastsStore();

export const toastsShow = (msg: ToastMsg): symbol => toastsStore.show(msg);

interface ToastsErrorParams {
	msg: Omit<ToastMsg, 'level'>;
	err?: unknown;
}
export const toastsError = ({ msg: { text, ...rest }, err }: ToastsErrorParams): symbol => {
	if (nonNullish(err)) {
		consoleError(err);
	}

	return toastsStore.show({
		text: `${text}${nonNullish(err) ? ` / ${errorDetailToString(err)}` : ''}`,
		...rest,
		level: 'error'
	});
};

export const toastsErrorNoTrace = ({ msg, err }: ToastsErrorParams) => {
	consoleError(`${msg.text}:`, err);

	return toastsError({
		msg
	});
};

export const toastsClean = () => toastsStore.reset(['success', 'warn', 'info']);

export const toastsHide = (ids: symbol[]) => ids.forEach((id) => toastsStore.hide(id));
