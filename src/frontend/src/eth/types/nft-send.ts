import type { EthereumNetwork } from '$eth/types/network';
import type { ProgressStepsSend } from '$lib/enums/progress-steps';
import type { EthAddress } from '$lib/types/address';
import type { Identity } from '@dfinity/agent';

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
	tokenId: number;
	to: EthAddress;
}

export interface TransferErc1155Params extends CommonNftTransferParams {
	contractAddress: string;
	id: number;
	amount: bigint;
	to: EthAddress;
	data?: `0x${string}` | string;
}

export interface PreparedContractCall {
	to: EthAddress;
	data: `0x${string}` | string;
}
