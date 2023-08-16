import { nonNullish } from '@dfinity/utils';
import { derived, writable, type Readable } from 'svelte/store';

export interface Busy {
	spinner: boolean;
	close: boolean;
}

export interface BusyStore extends Readable<Busy | undefined> {
	start: () => void;
	show: () => void;
	stop: () => void;
}

const initBusyStore = (): BusyStore => {
	const { subscribe, set } = writable<Busy | undefined>(undefined);

	return {
		subscribe,

		start() {
			set({ spinner: true, close: false });
		},

		show() {
			set({ spinner: true, close: true });
		},

		stop() {
			set(undefined);
		}
	};
};

export const busy = initBusyStore();

export interface BusyWizardStore extends Readable<boolean> {
	start: () => void;
	stop: () => void;
}

export const isBusy: Readable<boolean> = derived([busy], ([$busy]) => nonNullish($busy));
