import { SendIcStep } from '$lib/enums/steps';
import type { OptionIdentity } from '$lib/types/identity';
import type { TransferParams } from '$lib/types/send';

export type IcTransferParams = Pick<TransferParams, 'amount' | 'to'> & {
	identity: OptionIdentity;
	progress: (step: SendIcStep) => void;
};

export class IcAmountAssertionError extends Error {}
