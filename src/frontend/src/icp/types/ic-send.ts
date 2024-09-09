import type { Erc20Token } from '$eth/types/erc20';
import { ProgressStepsSendIc } from '$lib/enums/progress-steps';
import type { OptionIdentity } from '$lib/types/identity';
import type { TransferParams } from '$lib/types/send';

export type IcTransferParams = Pick<TransferParams, 'amount' | 'to'> & {
	identity: OptionIdentity;
	progress: (step: ProgressStepsSendIc) => void;
	ckErc20ToErc20MaxCkEthFees?: bigint;
	twinTokenAsErc20?: Erc20Token;
};

export class IcAmountAssertionError extends Error {}
