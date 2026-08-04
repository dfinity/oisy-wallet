import type { ProgressStepsSend, ProgressStepsSendIc } from '$lib/enums/progress-steps';
import type { NullishIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { NftId, NonFungibleToken } from '$lib/types/nft';

export interface TransferParams {
	from: string;
	to: string;
	amount: bigint;
	maxPriorityFeePerGas: bigint;
	maxFeePerGas: bigint;
	data?: string;
}

export interface SendNftCommonParams<Steps extends ProgressStepsSend | ProgressStepsSendIc> {
	token: NonFungibleToken;
	tokenId: NftId;
	identity: NullishIdentity;
	progress?: (step: Steps) => void;
}

export class InsufficientFundsError extends Error {}

export type Amount = string | number;
export type OptionAmount = Amount | undefined;

export type SendDestinationTab = 'recentlyUsed' | 'contacts';

export interface SendModalData {
	destination: string;
	lockedNetworkIds: NetworkId[];
}
