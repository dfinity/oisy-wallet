import type { CertifiedSetterStoreStore } from '$lib/stores/certified-setter.store';
import { initSetterStore, type SetterStoreData } from '$lib/stores/setter.store';

export type CertifiedStoreData<T> = SetterStoreData<T>;

export type CertifiedStore<T> = Omit<CertifiedSetterStoreStore<T>, 'set'>;

export const initCertifiedStore = <T>(): CertifiedStore<T> => {
	const { update, subscribe, reset } = initSetterStore<T>();

	return {
		update,
		subscribe,
		reset
	};
};
