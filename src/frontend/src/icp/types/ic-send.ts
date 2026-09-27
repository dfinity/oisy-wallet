import type { IcToken } from '$icp/types/ic-token';
import type { ProgressStepsSendIc } from '$lib/enums/progress-steps';
import type { NullishIdentity } from '$lib/types/identity';
import type { TransferParams } from '$lib/types/send';
import type { PartialSpecific } from '$lib/types/utils';

export type IcTransferParams = Pick<TransferParams, 'amount' | 'to'> & {
	identity: NullishIdentity;
	memo?: string;
	progress?: (step: ProgressStepsSendIc) => void;
	ckErc20ToErc20MaxCkEthFees?: bigint;
};

export type IcSendParams = PartialSpecific<IcTransferParams, 'progress'> &
	Pick<IcToken, 'ledgerCanisterId'>;

/**
 * The minter block index a ck withdrawal is keyed on, surfaced so callers that need to
 * follow the withdrawal afterwards can do so. The minters return it already; until now
 * every layer dropped it on the floor.
 *
 * `undefined` for a plain transfer, which has no minter leg.
 */
export type IcCkWithdrawalResult =
	| { type: 'ckBtcToBtc'; blockIndex: bigint }
	| { type: 'ckEthToEth'; blockIndex: bigint }
	| { type: 'ckErc20ToErc20'; ckEthBlockIndex: bigint; ckErc20BlockIndex: bigint };

export class IcAmountAssertionError extends Error {}
