import type { Erc20UserToken } from '$eth/types/erc20-user-token';
import { ProgressStepsSendIc } from '$lib/enums/progress-steps';
import type { OptionIdentity } from '$lib/types/identity';
import type { TransferParams } from '$lib/types/send';

export type IcTransferParams = Pick<TransferParams, 'amount' | 'to'> & {
	identity: OptionIdentity;
	progress: (step: ProgressStepsSendIc) => void;
	ckErc20ToErc20MaxCkEthFees?: bigint;
	ckErc20ToErc20TwinToken?: Erc20UserToken;
};

export class IcAmountAssertionError extends Error {}
