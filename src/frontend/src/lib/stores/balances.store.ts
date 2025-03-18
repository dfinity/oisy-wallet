import { initCertifiedSetterStore } from '$lib/stores/certified-setter.store';
import type { CertifiedData } from '$lib/types/store';

export type BalancesData = CertifiedData<bigint>;

export const balancesStore = initCertifiedSetterStore<BalancesData>();
