import { UpdateBalanceCkBtcStep } from '$lib/enums/steps';
import type { OptionIdentity } from '$lib/types/identity';

export interface CkBtcUpdateBalanceParams {
	identity: OptionIdentity;
	progress: (step: UpdateBalanceCkBtcStep) => void;
}

export type UtxoTxidText = string;
