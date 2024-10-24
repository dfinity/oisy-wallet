import { initSetterStore, type SetterStoreStore } from '$lib/stores/setter.store';

export type CertifiedSetterStoreStore<T> = SetterStoreStore<T>;

export const initCertifiedSetterStore = <T>(): CertifiedSetterStoreStore<T> => initSetterStore<T>();
