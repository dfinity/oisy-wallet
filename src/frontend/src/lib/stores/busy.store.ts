import { writable, type Readable } from 'svelte/store';

export interface Busy {
	spinner: boolean;
	close: boolean;
	msg?: string;
}

export interface BusyStore extends Readable<Busy | undefined> {
	start: (params?: Pick<Busy, 'msg'>) => void;
	show: () => void;
	stop: () => void;
	showWhile: <T>(cb: () => Promise<T>) => Promise<T>;
}

const initBusyStore = (): BusyStore => {
	const { subscribe, set } = writable<Busy | undefined>(undefined);

	return {
		subscribe,

		start({ msg } = {}) {
			set({ spinner: true, close: false, msg });
		},

		show() {
			set({ spinner: true, close: true });
		},

		stop() {
			set(undefined);
		},

		async showWhile(cb) {
			try {
				set({ spinner: true, close: false });
				return await cb();
			} finally {
				set(undefined);
			}
		}
	};
};

export const busy = initBusyStore();
