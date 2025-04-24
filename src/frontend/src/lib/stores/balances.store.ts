import { initCertifiedSetterStore } from '$lib/stores/certified-setter.store';
import type { Balance } from '$lib/types/balance';
import type { CertifiedData } from '$lib/types/store';

export type BalancesData = CertifiedData<Balance>;

export const balancesStore = initCertifiedSetterStore<BalancesData>();
