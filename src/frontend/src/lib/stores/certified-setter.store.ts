import {
	initCertifiedStore,
	type CertifiedStore,
	type CertifiedStoreData,
	type WritableUpdateStore
} from '$lib/stores/certified.store';
import type { TokenId } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';

export interface CertifiedSetterStoreStore<T, Id extends symbol = TokenId> extends CertifiedStore<
	T,
	Id
> {
	set: (params: { id: Id; data: T }) => void;
	batchSet: (params: { id: Id; data: T }) => void;
}

// Picks the best deferred-execution strategy so that multiple synchronous
// `batchSet` calls coalesce into a single Svelte store update:
//
// - Browser: `requestAnimationFrame` aligns the flush with the next repaint
//   frame (~16 ms budget), so every `batchSet` issued between two frames
//   produces only one `update()` / subscriber notification.
//   Caveat: rAF callbacks are paused while the tab is in the background,
//   which delays the flush until the tab is re-focused.
//
// - Non-browser (SSR / test runners): falls back to `queueMicrotask`, which
//   drains at the end of the current microtask checkpoint — still enough to
//   batch all synchronous call-sites, though the window is tighter than rAF.
const scheduleFlush =
	typeof requestAnimationFrame === 'function'
		? (fn: () => void) => requestAnimationFrame(fn)
		: (fn: () => void) => queueMicrotask(fn);

export const initCertifiedSetterStore = <
	T,
	Id extends symbol = TokenId
>(): CertifiedSetterStoreStore<T, Id> & WritableUpdateStore<T, Id> => {
	const { subscribe, update, reset, reinitialize } = initCertifiedStore<T, Id>();

	let pending: Array<{ id: Id; data: T }> = [];

	let scheduled = false;

	const resetBatch = () => {
		pending = [];

		scheduled = false;
	};

	const flushBatch = () => {
		const batch = pending;

		resetBatch();

		if (batch.length === 0) {
			return;
		}

		update(
			(state) =>
				batch.reduce((acc, { id, data }) => ({ ...acc, [id]: data }), {
					...(nonNullish(state) && state)
				}) as CertifiedStoreData<T, Id>
		);
	};

	return {
		set: ({ id, data }: { id: Id; data: T }) =>
			update(
				(state) =>
					({
						...(nonNullish(state) && state),
						[id]: data
					}) as CertifiedStoreData<T, Id>
			),
		batchSet: ({ id, data }: { id: Id; data: T }) => {
			pending.push({ id, data });
			if (!scheduled) {
				scheduled = true;
				scheduleFlush(flushBatch);
			}
		},
		update,
		reset: (id: Id) => {
			pending = pending.filter((item) => item.id !== id);
			reset(id);
		},
		reinitialize: () => {
			resetBatch();
			reinitialize();
		},
		subscribe
	};
};
