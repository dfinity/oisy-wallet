import type { ToastMsg, ToastMsgUIUI } from '$lib/types/toast';
import { errorDetailToString } from '$lib/utils/error.utils';
import { toastsStore } from '@dfinity/gix-components';
import { writable } from 'svelte/store';

const initToastsStore = () => {
	const { subscribe, update } = writable<ToastMsg[]>([]);

	return {
		subscribe,

		error({ text, detail }: { text: string; detail?: unknown }) {
			console.error(text, detail);
			update((messages: ToastMsg[]) => [
				...messages,
				{ text, level: 'error', detail: errorDetailToString(detail) }
			]);
		},

		show(msg: ToastMsg) {
			update((messages: ToastMsg[]) => [...messages, msg]);
		},

		success(text: string) {
			this.show({
				text,
				level: 'info',
				duration: 2000
			});
		},

		hide() {
			update((messages: ToastMsg[]) => messages.slice(1));
		}
	};
};

export const toasts = initToastsStore();

export const toastsShow = (msg: ToastMsgUIUI): symbol => toastsStore.show(msg);
