import { writable, type Readable } from 'svelte/store';

export interface Busy {
	spinner: boolean;
	close: boolean;
	msg?: string;
}

export interface BusyStore extends Readable<Busy | undefined> {
	start: (params?: Busy) => void;
	show: () => void;
	stop: () => void;
}

const initBusyStore = (): BusyStore => {
	const { subscribe, set } = writable<Busy | undefined>(undefined);

	return {
		subscribe,

		start: ({ spinner = true, close = false, msg }: Busy = {}) => {
			set({ spinner, close, msg });
		},

		show: () => {
			set({ spinner: true, close: true });
		},

		stop: () => {
			set(undefined);
		}
	};
};

export const busy = initBusyStore();
