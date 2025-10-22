import type { EthAddress } from '$eth/types/address';
import type { EthereumNetwork } from '$eth/types/network';
import type { ProgressStepsSend } from '$lib/enums/progress-steps';
import type { Identity } from '@icp-sdk/core/agent';

interface CommonNftTransferParams {
	sourceNetwork: EthereumNetwork;
	identity: Identity;
	from: EthAddress;
	gas: bigint;
	maxFeePerGas: bigint;
	maxPriorityFeePerGas: bigint;
	progress?: (step: ProgressStepsSend) => void;
}

export interface TransferErc721Params extends CommonNftTransferParams {
	contractAddress: string;
	tokenId: string;
	to: EthAddress;
}

export interface TransferErc1155Params extends CommonNftTransferParams {
	contractAddress: string;
	id: string;
	amount: bigint;
	to: EthAddress;
	data?: `0x${string}` | string;
}

export interface PreparedContractCall {
	to: EthAddress;
	data: `0x${string}` | string;
}
