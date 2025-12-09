import type { ProgressStepsSend } from '$lib/enums/progress-steps';
import type { OptionIdentity } from '$lib/types/identity';
import type { NftId, NonFungibleToken } from '$lib/types/nft';

export interface TransferParams {
	from: string;
	to: string;
	amount: bigint;
	maxPriorityFeePerGas: bigint;
	maxFeePerGas: bigint;
	data?: string;
}

export interface SendNftCommonParams {
	token: NonFungibleToken;
	tokenId: NftId;
	identity: OptionIdentity;
	progress?: (step: ProgressStepsSend) => void;
}

export class InsufficientFundsError extends Error {}

export type Amount = string | number;
export type OptionAmount = Amount | undefined;

export type SendDestinationTab = 'recentlyUsed' | 'contacts';
