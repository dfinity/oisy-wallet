import { ProgressStepsSendIc } from '$lib/enums/progress-steps';
import type { OptionIdentity } from '$lib/types/identity';
import type { TransferParams } from '$lib/types/send';

export type IcTransferParams = Pick<TransferParams, 'amount' | 'to'> & {
	identity: OptionIdentity;
	progress: (step: ProgressStepsSendIc) => void;
};

export class IcAmountAssertionError extends Error {}
