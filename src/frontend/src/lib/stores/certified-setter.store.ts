import { initSetterStore, type SetterStoreStore } from '$lib/stores/setter.store';
import type { CertifiedData } from '$lib/types/store';

export type CertifiedSetterStoreStore<T> = SetterStoreStore<CertifiedData<T>>;

export const initCertifiedSetterStore = <T>(): CertifiedSetterStoreStore<T> =>
	initSetterStore<CertifiedData<T>>();
