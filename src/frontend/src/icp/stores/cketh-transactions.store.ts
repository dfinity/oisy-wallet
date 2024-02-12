import type { IcTransactionUi } from '$icp/types/ic';
import { initCertifiedSetterStore } from '$lib/stores/certified-setter.store';
import type { CertifiedData } from '$lib/types/store';

export type ConvertEthToCkEthPendingData = CertifiedData<IcTransactionUi[]>;
export const convertEthToCkEthPendingStore =
	initCertifiedSetterStore<ConvertEthToCkEthPendingData>();
