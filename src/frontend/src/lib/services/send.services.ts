import type { SignRequest } from '$declarations/backend/backend.did';
import { signTransaction } from '$lib/api/backend.api';
import { ETH_BASE_FEE, ETH_NETWORK_ID } from '$lib/constants/eth.constants';
import { ETHEREUM_TOKEN_ID } from '$lib/constants/tokens.constants';
import { SendStep } from '$lib/enums/send';
import { populateTransaction } from '$lib/providers/etherscan-erc20.providers';
import { getTransactionCount, sendTransaction } from '$lib/providers/etherscan.providers';
import { processTransactionSent } from '$lib/services/transaction.services';
import type { Erc20Token } from '$lib/types/erc20';
import type { Token } from '$lib/types/token';
import type { TransactionFeeData } from '$lib/types/transaction';
import { isNullish, toNullable } from '@dfinity/utils';
import type { BigNumber } from '@ethersproject/bignumber';

export interface TransferParams {
	from: string;
	to: string;
	amount: BigNumber;
	maxPriorityFeePerGas: bigint;
	maxFeePerGas: bigint;
	data?: string;
}

const ethPrepareTransaction = async ({
	to,
	amount,
	maxPriorityFeePerGas: max_priority_fee_per_gas,
	maxFeePerGas: max_fee_per_gas,
	nonce,
	gas,
	data
}: TransferParams & { nonce: number } & { gas: bigint | undefined }): Promise<SignRequest> => ({
	to,
	value: amount.toBigInt(),
	chain_id: ETH_NETWORK_ID,
	nonce: BigInt(nonce),
	gas: gas ?? ETH_BASE_FEE,
	max_fee_per_gas,
	max_priority_fee_per_gas,
	data: toNullable(data)
});

const erc20PrepareTransaction = async ({
	to,
	amount,
	maxPriorityFeePerGas: max_priority_fee_per_gas,
	maxFeePerGas: max_fee_per_gas,
	nonce,
	token,
	gas
}: TransferParams & { nonce: number; token: Token; gas: bigint }): Promise<SignRequest> => {
	const { data } = await populateTransaction({
		contract: token as Erc20Token,
		address: to,
		amount
	});

	if (isNullish(data)) {
		throw new Error('Erc20 transaction Data cannot be undefined or null.');
	}

	const { address: contractAddress } = token as Erc20Token;

	return {
		to: contractAddress,
		chain_id: ETH_NETWORK_ID,
		nonce: BigInt(nonce),
		gas,
		max_fee_per_gas,
		max_priority_fee_per_gas,
		value: 0n,
		data: [data]
	};
};

export const send = async ({
	progress,
	lastProgressStep = SendStep.DONE,
	token,
	from,
	maxFeePerGas,
	maxPriorityFeePerGas,
	gas,
	...rest
}: Omit<TransferParams, 'maxPriorityFeePerGas' | 'maxFeePerGas'> & {
	progress: (step: SendStep) => void;
	lastProgressStep?: SendStep;
	token: Token;
} & Pick<TransactionFeeData, 'gas'> & {
		maxFeePerGas: BigNumber;
		maxPriorityFeePerGas: BigNumber;
	}): Promise<{ hash: string }> => {
	progress(SendStep.INITIALIZATION);

	const nonce = await getTransactionCount(from);

	const transaction = await (token.id === ETHEREUM_TOKEN_ID
		? ethPrepareTransaction({
				...rest,
				from,
				nonce,
				gas: gas?.toBigInt(),
				maxFeePerGas: maxFeePerGas.toBigInt(),
				maxPriorityFeePerGas: maxPriorityFeePerGas.toBigInt()
		  })
		: erc20PrepareTransaction({
				...rest,
				from,
				token,
				nonce,
				gas: gas.toBigInt(),
				maxFeePerGas: maxFeePerGas.toBigInt(),
				maxPriorityFeePerGas: maxPriorityFeePerGas.toBigInt()
		  }));

	progress(SendStep.SIGN);

	const rawTransaction = await signTransaction(transaction);

	progress(SendStep.SEND);

	const transactionSent = await sendTransaction(rawTransaction);

	// Explicitly do not await to proceed in the background and allow the UI to continue
	processTransactionSent({ token, transaction: transactionSent });

	progress(lastProgressStep);

	return { hash: transactionSent.hash };
};
