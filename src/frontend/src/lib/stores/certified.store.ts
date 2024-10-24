import type { CertifiedSetterStoreStore } from '$lib/stores/certified-setter.store';
import { initSetterStore, type SetterStoreData } from '$lib/stores/setter.store';
import type { CertifiedData } from '$lib/types/store';

export type CertifiedStoreData<T> = SetterStoreData<CertifiedData<T>>;

export type CertifiedStore<T> = Omit<CertifiedSetterStoreStore<T>, 'set'>;

export const initCertifiedStore = <T>(): CertifiedStore<T> => {
	const { update, subscribe, reset } = initSetterStore<CertifiedData<T>>();

	return {
		update,
		subscribe,
		reset
	};
};
