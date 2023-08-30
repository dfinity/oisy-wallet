import { signTransaction } from '$lib/api/backend.api';
import { ETH_BASE_FEE, ETH_NETWORK_ID } from '$lib/constants/eth.constants';
import { SendStep } from '$lib/enums/send';
import { getTransactionCount, sendTransaction } from '$lib/providers/etherscan.providers';
import type { TokenId } from '$lib/types/token';
import { Utils } from 'alchemy-sdk';

export interface TransferParams {
	from: string;
	to: string;
	amount: number;
	maxPriorityFeePerGas: bigint;
	maxFeePerGas: bigint;
}

export const send = async ({
	progress,
	tokenId,
	from,
	to,
	amount,
	maxPriorityFeePerGas: max_priority_fee_per_gas,
	maxFeePerGas: max_fee_per_gas
}: TransferParams & { progress: (step: SendStep) => void; tokenId: TokenId }) => {
	progress(SendStep.INITIALIZATION);

	const nonce = await getTransactionCount(from);

	const transaction = {
		to,
		value: Utils.parseEther(`${amount}`).toBigInt(),
		chain_id: ETH_NETWORK_ID,
		nonce: BigInt(nonce),
		gas: ETH_BASE_FEE,
		max_fee_per_gas,
		max_priority_fee_per_gas
	} as const;

	progress(SendStep.SIGN);

	const rawTransaction = await signTransaction(transaction);

	progress(SendStep.SEND);

	await sendTransaction(rawTransaction);

	progress(SendStep.DONE);
};
