import { initSetterStore, type SetterStoreStore } from '$lib/stores/setter.store';
import type { CertifiedData } from '$lib/types/store';

export type CertifiedSetterStoreStore<T extends CertifiedData<unknown>> = SetterStoreStore<T>;

export const initCertifiedSetterStore = <
	T extends CertifiedData<unknown>
>(): CertifiedSetterStoreStore<T> => initSetterStore<T>();
