import { signTransaction } from '$lib/api/backend.api';
import { ETH_BASE_FEE, ETH_NETWORK_ID } from '$lib/constants/eth.constants';
import { ETHEREUM_TOKEN_ID } from '$lib/constants/tokens.constants';
import { SendStep } from '$lib/enums/send';
import { transfer } from '$lib/providers/etherscan-erc20.providers';
import { getTransactionCount, sendTransaction } from '$lib/providers/etherscan.providers';
import type { Erc20Token } from '$lib/types/erc20';
import type { Token } from '$lib/types/token';
import { Utils } from 'alchemy-sdk';

export interface TransferParams {
	from: string;
	to: string;
	amount: number;
	maxPriorityFeePerGas: bigint;
	maxFeePerGas: bigint;
}

const ethSend = async ({
	progress,
	from,
	to,
	amount,
	maxPriorityFeePerGas: max_priority_fee_per_gas,
	maxFeePerGas: max_fee_per_gas
}: TransferParams & { progress: (step: SendStep) => void }) => {
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

export const send = async ({
	progress,
	token,
	from,
	amount,
	...rest
}: TransferParams & { progress: (step: SendStep) => void; token: Token }) => {
	progress(SendStep.INITIALIZATION);

	const nonce = await getTransactionCount(from);

	if (token.id === ETHEREUM_TOKEN_ID) {
		return ethSend({
			progress,
			from,
			amount,
			...rest
		});
	}

	// TODO: no sign
	// progress(SendStep.SIGN);

	progress(SendStep.SEND);

	await transfer({
		contract: token as Erc20Token,
		address: from,
		amount: Utils.parseEther(`${amount}`)
	});

	progress(SendStep.DONE);
};
