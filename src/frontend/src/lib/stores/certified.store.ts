import type { CertifiedSetterStoreStore } from '$lib/stores/certified-setter.store';
import {
	initSetterStore,
	type SetterStoreData,
	type WritableUpdateStore
} from '$lib/stores/setter.store';
import type { CertifiedData } from '$lib/types/store';

export type CertifiedStoreBaseData = CertifiedData<unknown> | CertifiedData<unknown>[];

export type CertifiedStoreData<T extends CertifiedStoreBaseData> = SetterStoreData<T>;

export type CertifiedStore<T extends CertifiedStoreBaseData> = Omit<
	CertifiedSetterStoreStore<T>,
	'set'
>;

export const initCertifiedStore = <T extends CertifiedStoreBaseData>(): CertifiedStore<T> &
	WritableUpdateStore<T> => {
	const { update, subscribe, reset } = initSetterStore<T>();

	return {
		update,
		subscribe,
		reset
	};
};
