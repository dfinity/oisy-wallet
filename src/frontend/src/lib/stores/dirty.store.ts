import { writable, type Readable } from 'svelte/store';

export interface Dirty {
	dirty: boolean;
}

export interface DirtyStore extends Readable<Dirty | undefined> {
	start: () => void;
	stop: () => void;
}

const initDirtyStore = (): DirtyStore => {
	const { subscribe, set } = writable<Dirty | undefined>(undefined);

	return {
		subscribe,

		start() {
			set({ dirty: true });
		},

		stop() {
			set({ dirty: false });
		}
	};
};

export const dirty = initDirtyStore();
