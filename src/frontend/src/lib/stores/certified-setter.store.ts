import type { CertifiedStoreBaseData } from '$lib/stores/certified.store';
import { initSetterStore, type SetterStoreStore } from '$lib/stores/setter.store';

export type CertifiedSetterStoreStore<T extends CertifiedStoreBaseData> = SetterStoreStore<T>;

export const initCertifiedSetterStore = <
	T extends CertifiedStoreBaseData
>(): CertifiedSetterStoreStore<T> => initSetterStore<T>();
