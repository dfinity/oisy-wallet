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

const scheduleFlush =
	typeof requestAnimationFrame === 'function'
		? (fn: () => void) => requestAnimationFrame(() => fn())
		: (fn: () => void) => queueMicrotask(fn);

export const initCertifiedSetterStore = <
	T,
	Id extends symbol = TokenId
>(): CertifiedSetterStoreStore<T, Id> & WritableUpdateStore<T, Id> => {
	const { subscribe, update, reset, reinitialize } = initCertifiedStore<T, Id>();

	let pending: Array<{ id: Id; data: T }> = [];
	let scheduled = false;

	const flushBatch = () => {
		const batch = pending;
		pending = [];
		scheduled = false;

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
			pending = [];
			scheduled = false;
			reinitialize();
		},
		subscribe
	};
};
