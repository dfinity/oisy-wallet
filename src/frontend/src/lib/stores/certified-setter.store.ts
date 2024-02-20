import {
	initCertifiedStore,
	type CertifiedStore,
	type WritableUpdateStore
} from '$lib/stores/certified.store';
import type { TokenId } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';

export interface CertifiedSetterStoreStore<T> extends CertifiedStore<T> {
	set: (params: { tokenId: TokenId; data: T }) => void;
}

export const initCertifiedSetterStore = <T>(): CertifiedSetterStoreStore<T> &
	WritableUpdateStore<T> => {
	const { subscribe, update, reset } = initCertifiedStore<T>();

	return {
		set: ({ tokenId, data }: { tokenId: TokenId; data: T }) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: data
			})),
		update,
		reset,
		subscribe
	};
};
