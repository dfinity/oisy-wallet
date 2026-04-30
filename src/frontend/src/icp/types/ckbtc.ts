import type { ProgressStepsUpdateBalanceCkBtc } from '$lib/enums/progress-steps';
import type { NullishIdentity } from '$lib/types/identity';

export interface CkBtcUpdateBalanceParams {
	identity: NullishIdentity;
	progress: (step: ProgressStepsUpdateBalanceCkBtc) => void;
}

export type UtxoTxidText = string;
