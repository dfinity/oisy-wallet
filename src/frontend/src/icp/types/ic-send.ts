import type { IcToken } from '$icp/types/ic-token';
import type { ProgressStepsSendIc } from '$lib/enums/progress-steps';
import type { OptionIdentity } from '$lib/types/identity';
import type { TransferParams } from '$lib/types/send';
import type { PartialSpecific } from '$lib/types/utils';

export type IcTransferParams = Pick<TransferParams, 'amount' | 'to'> & {
	identity: OptionIdentity;
	progress?: (step: ProgressStepsSendIc) => void;
	ckErc20ToErc20MaxCkEthFees?: bigint;
};

export type IcSendParams = PartialSpecific<IcTransferParams, 'progress'> &
	Pick<IcToken, 'ledgerCanisterId'>;

export class IcAmountAssertionError extends Error {}
