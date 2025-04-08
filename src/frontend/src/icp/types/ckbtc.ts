import type { ProgressStepsUpdateBalanceCkBtc } from '$lib/enums/progress-steps';
import type { OptionIdentity } from '$lib/types/identity';

export interface CkBtcUpdateBalanceParams {
	identity: OptionIdentity;
	progress: (step: ProgressStepsUpdateBalanceCkBtc) => void;
}

export type UtxoTxidText = string;
