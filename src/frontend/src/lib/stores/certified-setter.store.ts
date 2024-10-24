import type { CertifiedStoreBaseData } from '$lib/stores/certified.store';
import {
	initSetterStore,
	type SetterStoreStore,
	type WritableUpdateStore
} from '$lib/stores/setter.store';

export type CertifiedSetterStoreStore<T extends CertifiedStoreBaseData> = SetterStoreStore<T>;

export const initCertifiedSetterStore = <
	T extends CertifiedStoreBaseData
>(): CertifiedSetterStoreStore<T> & WritableUpdateStore<T> => initSetterStore<T>();
