import type { SignRequest } from '$declarations/backend/backend.did';
import { signTransaction } from '$lib/api/backend.api';
import { ETH_BASE_FEE, ETH_NETWORK_ID } from '$lib/constants/eth.constants';
import { ETHEREUM_TOKEN_ID } from '$lib/constants/tokens.constants';
import { SendStep } from '$lib/enums/send';
import { populateTransaction } from '$lib/providers/etherscan-erc20.providers';
import { getTransactionCount, sendTransaction } from '$lib/providers/etherscan.providers';
import type { Erc20Token } from '$lib/types/erc20';
import type { Token } from '$lib/types/token';
import { isNullish } from '@dfinity/utils';
import { Utils } from 'alchemy-sdk';

export interface TransferParams {
	from: string;
	to: string;
	amount: number;
	maxPriorityFeePerGas: bigint;
	maxFeePerGas: bigint;
}

const ethPrepareTransaction = async ({
	to,
	amount,
	maxPriorityFeePerGas: max_priority_fee_per_gas,
	maxFeePerGas: max_fee_per_gas,
	nonce
}: TransferParams & { nonce: number }): Promise<SignRequest> => ({
	to,
	value: Utils.parseEther(`${amount}`).toBigInt(),
	chain_id: ETH_NETWORK_ID,
	nonce: BigInt(nonce),
	gas: ETH_BASE_FEE,
	max_fee_per_gas,
	max_priority_fee_per_gas,
	data: []
});

const erc20PrepareTransaction = async ({
	to,
	amount,
	maxPriorityFeePerGas: max_priority_fee_per_gas,
	maxFeePerGas: max_fee_per_gas,
	nonce,
	token
}: TransferParams & { nonce: number; token: Token }): Promise<SignRequest> => {
	const { data } = await populateTransaction({
		contract: token as Erc20Token,
		address: to,
		amount: Utils.parseEther(`${amount}`)
	});

	if (isNullish(data)) {
		throw new Error('Erc20 transaction Data cannot be undefined or null.');
	}

	return {
		to,
		chain_id: ETH_NETWORK_ID,
		nonce: BigInt(nonce),
		gas: ETH_BASE_FEE,
		max_fee_per_gas,
		max_priority_fee_per_gas,
		value: 0n,
		data: [data]
	};
};

export const send = async ({
	progress,
	token,
	from,
	...rest
}: TransferParams & { progress: (step: SendStep) => void; token: Token }) => {
	progress(SendStep.INITIALIZATION);

	const nonce = await getTransactionCount(from);

	// TODO: gas price 21_000 for eth or gas for USDC

	const transaction = await (token.id === ETHEREUM_TOKEN_ID
		? ethPrepareTransaction({
				...rest,
				from,
				nonce
		  })
		: erc20PrepareTransaction({
				...rest,
				from,
				token,
				nonce
		  }));

	progress(SendStep.SIGN);

	const rawTransaction = await signTransaction(transaction);

	progress(SendStep.SEND);

	await sendTransaction(rawTransaction);

	progress(SendStep.DONE);
};
