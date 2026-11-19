import type { IcToken } from '$icp/types/ic-token';
import type { ProgressStepsSendIc } from '$lib/enums/progress-steps';
import type { NullishIdentity } from '$lib/types/identity';
import type { TransferParams } from '$lib/types/send';
import type { TokenId } from '$lib/types/token';
import type { PartialSpecific } from '$lib/types/utils';

export type IcTransferParams = Pick<TransferParams, 'amount' | 'to'> & {
	identity: NullishIdentity;
	progress?: (step: ProgressStepsSendIc) => void;
	ckErc20ToErc20MaxCkEthFees?: bigint;
	// The ledger's `created_at_time` for an ICRC or ICP transfer. Sending the same transfer again
	// with the same value is answered with the block the first one landed in, if it did, instead of
	// a second transfer.
	createdAt?: bigint;
};

/**
 * A transfer as a send flow submits it: one `createdAt` for as long as the user sends the same
 * token, amount and destination.
 */
export interface IcSendRequest {
	tokenId: TokenId;
	to: string;
	amount: bigint;
	createdAt: bigint;
}

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
	| { type: 'ckErc20ToErc20'; ckEthBlockIndex: bigint; ckErc20BlockIndex: bigint }
	| { type: 'ckSolToSol'; blockIndex: bigint };

export class IcAmountAssertionError extends Error {}

// A transfer that would have been sent past its deadline, and so was not sent at all.
export class IcTransferDeadlineError extends Error {}
